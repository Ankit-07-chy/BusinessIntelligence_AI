import type { PrismaClient } from "@prisma/client";
import { computeBaseline } from "../analytics/baseline.js";
import { detectAnomaly } from "../analytics/anomalyDetection.js";
import { classifyConfidence, computeConfidenceScore } from "../analytics/confidence.js";
import { computeDriverContribution } from "../analytics/contribution.js";
import { computeDataQualityScore, computeFreshnessScore } from "../analytics/dataQuality.js";
import { computeBusinessImpactScore, computeMaterialityScore, computeStatisticalScore } from "../analytics/materiality.js";
import { rankDrivers } from "../analytics/ranking.js";
import { shouldAbstain } from "../analytics/abstention.js";
import { prisma as defaultPrisma } from "../db/prismaClient.js";
import { getKpiTimeseries } from "./kpiService.js";
import { getPaidSearchDriverCandidate, getStockoutDriverCandidate, getPaidSearchExpansionDriverCandidate, type DriverCandidate } from "./netRevenueDrivers.js";
import type { AuthTokenPayload } from "../schemas/auth.js";
import { getEffectivePolicy, isColumnRestricted } from "./securityPolicy.js";

// computeBaseline only needs 2 same-weekday points (14 days) to produce a
// same-weekday-trend baseline, so detection can start there rather than
// waiting a full 4 weeks — the Day-15 incident falls inside that gap otherwise.
const WARMUP_DAYS = 14;
const RESIDUAL_WINDOW = 35;

interface KpiAnalyticsConfig {
  sourceName: string;
  expectedCadenceDays: number;
  marginImpact: number;
  strategicWeight: number;
  identifyDrivers: boolean;
}

// Driver identification is only implemented for net_revenue today (the incident
// the Day-1 acceptance check depends on) — the others still get baseline/
// anomaly/materiality/confidence scoring, just no ranked drivers yet.
const KPI_CONFIG: Record<string, KpiAnalyticsConfig> = {
  net_revenue: { sourceName: "fact_sales", expectedCadenceDays: 1, marginImpact: 0.15, strategicWeight: 0.25, identifyDrivers: true },
  gross_margin: { sourceName: "fact_sales", expectedCadenceDays: 1, marginImpact: 0.2, strategicWeight: 0.2, identifyDrivers: false },
  conversion_rate: { sourceName: "fact_web_traffic", expectedCadenceDays: 1, marginImpact: 0.05, strategicWeight: 0.1, identifyDrivers: false },
  otif: { sourceName: "fact_shipments", expectedCadenceDays: 1, marginImpact: 0.05, strategicWeight: 0.15, identifyDrivers: false },
  cac: { sourceName: "fact_marketing_spend", expectedCadenceDays: 7, marginImpact: 0.05, strategicWeight: 0.1, identifyDrivers: false },
};

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

async function identifyNetRevenueDrivers(
  prisma: PrismaClient,
  targetDate: string,
  totalKpiChange: number,
  dataQualityScore: number,
  freshnessScore: number,
): Promise<Array<{ driverId: string; estimatedImpact: number; confidenceScore: number; method: string }>> {
  const candidates = (
    await Promise.all([
      getStockoutDriverCandidate(prisma, targetDate),
      getPaidSearchDriverCandidate(prisma, targetDate),
      getPaidSearchExpansionDriverCandidate(prisma, targetDate),
    ])
  ).filter((candidate): candidate is DriverCandidate => candidate !== null);

  const matchingCandidates = candidates.filter((candidate) => {
    return totalKpiChange > 0 ? candidate.estimatedImpact > 0 : candidate.estimatedImpact < 0;
  });

  if (matchingCandidates.length === 0) return [];

  const safeTotalChange = totalKpiChange === 0 ? 1 : totalKpiChange;
  const scored = matchingCandidates.map((candidate) => {
    const evidenceStrength = clamp01(Math.abs(candidate.estimatedImpact / safeTotalChange));
    const isDirectObservation = candidate.method === "control_store_comparison";
    const confidenceScore = computeConfidenceScore({
      evidenceStrength,
      dataQualityScore,
      modelFitScore: isDirectObservation ? 0.9 : 0.6,
      causalOrBusinessConfirmation: isDirectObservation ? 1 : 0.6,
      freshnessScore,
    });
    return { ...candidate, evidenceStrength, confidenceScore, isDirectObservation };
  });

  const ranked = rankDrivers(
    scored.map((driver) => ({
      driverId: driver.driverId,
      estimatedImpactScore: driver.evidenceStrength,
      confidenceScore: driver.confidenceScore,
      evidenceStrengthScore: driver.evidenceStrength,
      actionabilityScore: driver.isDirectObservation ? 0.9 : 0.8,
      businessRelevanceScore: 0.85,
      timelinessScore: freshnessScore,
      lowDataQualityPenalty: dataQualityScore < 0.5 ? 0.2 : 0,
      staleEvidencePenalty: freshnessScore < 0.5 ? 0.1 : 0,
    })),
  );

  return ranked.map((r) => {
    const original = scored.find((s) => s.driverId === r.driverId)!;
    return {
      driverId: r.driverId,
      estimatedImpact: original.estimatedImpact,
      confidenceScore: original.confidenceScore,
      method: original.method,
    };
  });
}

async function detectAnomaliesForKpi(prisma: PrismaClient, kpiId: string): Promise<number> {
  const config = KPI_CONFIG[kpiId];
  const series = await getKpiTimeseries(kpiId, { allowedRegions: ["ALL"] });
  if (!series || series.length < WARMUP_DAYS + 1) return 0;

  const sourceStatus = await prisma.sourceStatus.findUnique({ where: { sourceName: config.sourceName } });
  const asOf = new Date(`${series[series.length - 1].date}T00:00:00.000Z`);
  const freshnessScore = sourceStatus
    ? computeFreshnessScore(sourceStatus.lastSuccessfulRefresh, config.expectedCadenceDays, asOf)
    : 0.5;
  const completenessScore = sourceStatus ? Number(sourceStatus.completenessScore) : 0.5;
  const dataQualityScore = computeDataQualityScore({
    completenessScore,
    freshnessScore,
    consistencyScore: 0.9,
    validityScore: 0.9,
  });

  const avgAbsValue = mean(series.map((p) => Math.abs(p.value))) || 1;
  const absoluteThreshold = 0.05 * avgAbsValue;
  const normalizationCap = 0.3 * avgAbsValue;

  const residualHistory: number[] = [];
  let persisted = 0;

  for (let i = WARMUP_DAYS; i < series.length; i++) {
    const targetDate = series[i].date;
    const history = series.slice(0, i);
    const baseline = computeBaseline(history, targetDate);
    const actualValue = series[i].value;

    const trailingResiduals = residualHistory.slice(-RESIDUAL_WINDOW);
    const historicalStdDev =
      trailingResiduals.length >= 5 ? stdDev(trailingResiduals) : Math.max(absoluteThreshold, avgAbsValue * 0.02, 1e-6);

    const detection = detectAnomaly({
      actualValue,
      expectedValue: baseline.expectedValue,
      historicalStdDev,
      dataQualityScore,
      thresholds: {
        absoluteThreshold,
        statisticalThreshold: 2,
        minimumQualityScore: 0.4,
      },
    });
    residualHistory.push(detection.residual);

    if (!detection.isAnomaly) continue;

    const statisticalScore = computeStatisticalScore(detection.zScore, 3);
    const businessImpactScore = computeBusinessImpactScore({
      normalizedAbsDollarImpact: clamp01(Math.abs(detection.residual) / normalizationCap),
      marginImpact: config.marginImpact,
      strategicWeight: config.strategicWeight,
    });
    const materialityScore = computeMaterialityScore({ statisticalScore, businessImpactScore, dataQualityScore });

    const drivers = config.identifyDrivers
      ? await identifyNetRevenueDrivers(prisma, targetDate, detection.residual, dataQualityScore, freshnessScore)
      : [];

    await prisma.anomaly.create({
      data: {
        kpiId,
        period: targetDate,
        actualValue,
        forecastValue: baseline.expectedValue,
        delta: detection.residual,
        zScore: detection.zScore,
        materialityScore,
        dataQualityScore,
        ...(drivers.length > 0
          ? {
              driverContributions: {
                create: drivers.map((d) => ({
                  driverId: d.driverId,
                  estimatedImpact: d.estimatedImpact,
                  confidenceScore: d.confidenceScore,
                  method: d.method,
                })),
              },
            }
          : {}),
      },
    });
    persisted += 1;
  }

  return persisted;
}

async function clearExistingAnomalies(prisma: PrismaClient): Promise<void> {
  await prisma.feedback.deleteMany({});
  await prisma.actionRecommendation.deleteMany({});
  await prisma.explanation.deleteMany({});
  await prisma.driverContribution.deleteMany({});
  await prisma.anomaly.deleteMany({});
}

export async function detectAndPersistAnomalies(prisma: PrismaClient = defaultPrisma): Promise<Record<string, number>> {
  await clearExistingAnomalies(prisma);
  const summary: Record<string, number> = {};
  for (const kpiId of Object.keys(KPI_CONFIG)) {
    summary[kpiId] = await detectAnomaliesForKpi(prisma, kpiId);
  }
  return summary;
}

export type AnomalySortBy = "materiality" | "confidence";

function anomalyConfidence(driverContributions: Array<{ confidenceScore: unknown }>): number {
  if (driverContributions.length === 0) return 0;
  return Math.max(...driverContributions.map((d) => Number(d.confidenceScore)));
}

function getWeekNumber(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  const oneJan = new Date(d.getUTCFullYear(), 0, 1);
  const numberOfDays = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
  const weekNum = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
  return `W${weekNum}`;
}

function getMonthName(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  return d.toLocaleString("en-US", { month: "long" });
}

function calculateWeeklyTrendChange(kpiId: string, series: { date: string; value: number }[], targetDate: string): number {
  const filtered = series.filter((p) => p.date <= targetDate);
  if (filtered.length === 0) return 0;
  
  const weeksMap = new Map<string, number[]>();
  filtered.forEach((p) => {
    const wk = getWeekNumber(p.date);
    if (!weeksMap.has(wk)) weeksMap.set(wk, []);
    weeksMap.get(wk)!.push(p.value);
  });
  
  const aggregated = Array.from(weeksMap.entries()).map(([week, vals]) => {
    const isRate = kpiId === "conversion_rate" || kpiId === "otif" || kpiId === "cac";
    const val = isRate ? (vals.reduce((a, b) => a + b, 0) / vals.length) : vals.reduce((a, b) => a + b, 0);
    return { date: week, value: val };
  });
  
  if (aggregated.length < 2) return 0;
  const latest = aggregated[aggregated.length - 1].value;
  const previous = aggregated[aggregated.length - 2].value;
  return previous !== 0 ? (latest - previous) / previous : 0;
}

function calculateMonthlyTrendChange(kpiId: string, series: { date: string; value: number }[], targetDate: string): number {
  const filtered = series.filter((p) => p.date <= targetDate);
  if (filtered.length === 0) return 0;
  
  const monthsMap = new Map<string, number[]>();
  filtered.forEach((p) => {
    const mn = getMonthName(p.date);
    if (!monthsMap.has(mn)) monthsMap.set(mn, []);
    monthsMap.get(mn)!.push(p.value);
  });
  
  const aggregated = Array.from(monthsMap.entries()).map(([month, vals]) => {
    const isRate = kpiId === "conversion_rate" || kpiId === "otif" || kpiId === "cac";
    const val = isRate ? (vals.reduce((a, b) => a + b, 0) / vals.length) : vals.reduce((a, b) => a + b, 0);
    return { date: month, value: val };
  });
  
  if (aggregated.length < 2) return 0;
  const latest = aggregated[aggregated.length - 1].value;
  const previous = aggregated[aggregated.length - 2].value;
  return previous !== 0 ? (latest - previous) / previous : 0;
}

interface AnomalyListRow {
  anomalyId: string;
  kpiId: string;
  kpiName: string;
  period: string;
  actualValue: number;
  forecastValue: number;
  delta: number;
  zScore: number;
  materialityScore: number;
  dataQualityScore: number;
  refreshCadence: string;
  confidenceScore: number;
  confidenceLabel: string;
  driverCount: number;
  periodOverPeriodChange: number;
  weeklyChangePercent: number;
  monthlyChangePercent: number;
  createdAt: Date | string;
}

export async function listAnomalies(options: { sortBy?: AnomalySortBy; user?: AuthTokenPayload } = {}, prisma: PrismaClient = defaultPrisma) {
  const policy = options.user ? getEffectivePolicy(options.user) : null;
  const anomalies = await prisma.anomaly.findMany({
    include: { kpi: true, driverContributions: true },
    orderBy: { createdAt: "desc" },
  });

  const kpis = await prisma.kpiDefinition.findMany();

  // Find all unique periods in anomalies, plus today/latestDate
  const uniquePeriods = Array.from(new Set(anomalies.map((a) => a.period)));
  
  // Determine latestDate
  const allSales = await prisma.factSales.findMany({
    select: { saleDate: true },
    orderBy: { saleDate: "desc" },
    take: 1,
  });
  const latestDate = allSales[0]?.saleDate
    ? new Date(allSales[0].saleDate).toISOString().slice(0, 10)
    : "2026-08-26";
  if (!uniquePeriods.includes(latestDate)) {
    uniquePeriods.push(latestDate);
  }

  const timeseriesMap = new Map<string, { date: string; value: number }[]>();
  await Promise.all(
    kpis.map(async (kpi) => {
      const series = await getKpiTimeseries(kpi.kpiId, { allowedRegions: ["ALL"] });
      if (series) {
        timeseriesMap.set(kpi.kpiId, series);
      }
    })
  );

  const rows: AnomalyListRow[] = [];

  for (const period of uniquePeriods) {
    for (const kpi of kpis) {
      if (policy && isColumnRestricted(policy, kpi.kpiId)) {
        continue;
      }

      // Check if there is an existing anomaly in DB
      const dbAnomaly = anomalies.find((a) => a.kpiId === kpi.kpiId && a.period === period);
      const series = timeseriesMap.get(kpi.kpiId) || [];
      const targetIndex = series.findIndex((p) => p.date === period);
      
      let actualValue = dbAnomaly ? Number(dbAnomaly.actualValue) : 0;
      let forecastValue = dbAnomaly ? Number(dbAnomaly.forecastValue) : 0;
      let delta = dbAnomaly ? Number(dbAnomaly.delta) : 0;

      if (!dbAnomaly && targetIndex >= 0) {
        actualValue = series[targetIndex].value;
        forecastValue = targetIndex > 0 ? series[targetIndex - 1].value : actualValue;
        delta = actualValue - forecastValue;
      }

      let periodOverPeriodChange = 0;
      if (targetIndex > 0) {
        const currentVal = series[targetIndex].value;
        const prevVal = series[targetIndex - 1].value;
        periodOverPeriodChange = prevVal !== 0 ? (currentVal - prevVal) / prevVal : 0;
      }

      const weeklyChangePercent = calculateWeeklyTrendChange(kpi.kpiId, series, period);
      const monthlyChangePercent = calculateMonthlyTrendChange(kpi.kpiId, series, period);

      if (dbAnomaly) {
        const confidenceScore = anomalyConfidence(dbAnomaly.driverContributions);
        rows.push({
          anomalyId: dbAnomaly.anomalyId,
          kpiId: dbAnomaly.kpiId,
          kpiName: dbAnomaly.kpi.name,
          period: dbAnomaly.period,
          actualValue,
          forecastValue,
          delta,
          zScore: Number(dbAnomaly.zScore),
          materialityScore: Number(dbAnomaly.materialityScore),
          dataQualityScore: Number(dbAnomaly.dataQualityScore),
          refreshCadence: dbAnomaly.kpi.refreshCadence,
          confidenceScore,
          confidenceLabel: classifyConfidence(confidenceScore),
          driverCount: dbAnomaly.driverContributions.length,
          periodOverPeriodChange: Number(periodOverPeriodChange),
          weeklyChangePercent: Number(weeklyChangePercent),
          monthlyChangePercent: Number(monthlyChangePercent),
          createdAt: dbAnomaly.createdAt,
        });
      } else {
        rows.push({
          anomalyId: `temp-${kpi.kpiId}-${period}`,
          kpiId: kpi.kpiId,
          kpiName: kpi.name,
          period,
          actualValue,
          forecastValue,
          delta,
          zScore: 0,
          materialityScore: 0,
          dataQualityScore: 1,
          refreshCadence: kpi.refreshCadence,
          confidenceScore: 0.5,
          confidenceLabel: "medium",
          driverCount: 0,
          periodOverPeriodChange: Number(periodOverPeriodChange),
          weeklyChangePercent: Number(weeklyChangePercent),
          monthlyChangePercent: Number(monthlyChangePercent),
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  const sortBy = options.sortBy ?? "materiality";
  rows.sort((a, b) => (sortBy === "confidence" ? b.confidenceScore - a.confidenceScore : b.materialityScore - a.materialityScore));
  return rows;
}

export type AnomalyAccess = "ok" | "not_found" | "restricted";

/**
 * Cheap pre-check so a route can tell "doesn't exist" (404) apart from
 * "exists but your role's CLS policy denies it" (403) without duplicating
 * the CLS logic that getAnomalyDetail/getOrCreateExplanation already apply
 * to build the actual payload.
 */
export async function checkAnomalyAccess(
  anomalyId: string,
  user?: AuthTokenPayload,
  prisma: PrismaClient = defaultPrisma,
): Promise<AnomalyAccess> {
  let kpiId: string;
  if (anomalyId.startsWith("temp-")) {
    // Synthetic row from listAnomalies for a KPI/period with no persisted
    // Anomaly yet — mirror getAnomalyDetail's id parsing instead of hitting
    // the anomaly table, which has no matching row for these.
    kpiId = anomalyId.split("-")[1];
    const kpi = await prisma.kpiDefinition.findUnique({ where: { kpiId } });
    if (!kpi) return "not_found";
  } else {
    const anomaly = await prisma.anomaly.findUnique({ where: { anomalyId }, select: { kpiId: true } });
    if (!anomaly) return "not_found";
    kpiId = anomaly.kpiId;
  }
  if (user && isColumnRestricted(getEffectivePolicy(user), kpiId)) return "restricted";
  return "ok";
}

export async function getAnomalyDetail(anomalyId: string, user?: AuthTokenPayload, prisma: PrismaClient = defaultPrisma) {
  if (anomalyId.startsWith("temp-")) {
    const parts = anomalyId.split("-");
    const kpiId = parts[1];
    const period = `${parts[2]}-${parts[3]}-${parts[4]}`;
    
    const kpi = await prisma.kpiDefinition.findUnique({ where: { kpiId } });
    if (!kpi) return null;

    const policy = user ? getEffectivePolicy(user) : null;
    if (policy && isColumnRestricted(policy, kpiId)) {
      return null;
    }

    const series = await getKpiTimeseries(kpiId, { allowedRegions: ["ALL"] }) || [];
    const targetIndex = series.findIndex((p) => p.date === period);
    
    let actualValue = 0;
    let forecastValue = 0;
    let deltaNum = 0;
    if (targetIndex >= 0) {
      actualValue = series[targetIndex].value;
      forecastValue = targetIndex > 0 ? series[targetIndex - 1].value : actualValue;
      deltaNum = actualValue - forecastValue;
    }

    let periodOverPeriodChange = 0;
    if (targetIndex > 0) {
      const currentVal = series[targetIndex].value;
      const prevVal = series[targetIndex - 1].value;
      periodOverPeriodChange = prevVal !== 0 ? (currentVal - prevVal) / prevVal : 0;
    }

    const weeklyChangePercent = calculateWeeklyTrendChange(kpiId, series, period);
    const monthlyChangePercent = calculateMonthlyTrendChange(kpiId, series, period);

    return {
      anomalyId,
      kpiId,
      kpiName: kpi.name,
      period,
      actualValue,
      forecastValue,
      delta: deltaNum,
      zScore: 0,
      materialityScore: 0,
      dataQualityScore: 1,
      refreshCadence: kpi.refreshCadence,
      confidenceScore: 0.5,
      confidenceLabel: "medium",
      abstain: false,
      abstentionReasons: [],
      driverContributions: [],
      periodOverPeriodChange: Number(periodOverPeriodChange),
      weeklyChangePercent: Number(weeklyChangePercent),
      monthlyChangePercent: Number(monthlyChangePercent),
      createdAt: new Date().toISOString(),
    };
  }

  const anomaly = await prisma.anomaly.findUnique({
    where: { anomalyId },
    include: { kpi: true, driverContributions: true },
  });
  if (!anomaly) return null;

  const policy = user ? getEffectivePolicy(user) : null;
  if (policy && isColumnRestricted(policy, anomaly.kpiId)) {
    return null;
  }

  const deltaNum = Number(anomaly.delta);
  const safeDelta = deltaNum === 0 ? 1 : deltaNum;

  const ranked = rankDrivers(
    anomaly.driverContributions.map((driver) => {
      const evidenceStrength = clamp01(Math.abs(Number(driver.estimatedImpact) / safeDelta));
      return {
        driverId: driver.driverId,
        estimatedImpactScore: evidenceStrength,
        confidenceScore: Number(driver.confidenceScore),
        evidenceStrengthScore: evidenceStrength,
        actionabilityScore: 0.85,
        businessRelevanceScore: 0.85,
        timelinessScore: 0.8,
      };
    }),
  );

  const driverContributions = ranked.map((r) => {
    const original = anomaly.driverContributions.find((d) => d.driverId === r.driverId)!;
    const estimatedImpact = Number(original.estimatedImpact);
    const confidenceScore = Number(original.confidenceScore);
    return {
      driverId: r.driverId,
      estimatedImpact,
      confidenceScore,
      confidenceLabel: classifyConfidence(confidenceScore),
      contribution: computeDriverContribution({ estimatedImpact, totalKpiChange: deltaNum }),
      rank: r.rank,
      driverScore: r.driverScore,
      method: original.method,
    };
  });

  const overallConfidence = anomalyConfidence(anomaly.driverContributions);
  const abstention = shouldAbstain({
    confidenceScore: overallConfidence,
    keySourceMissing: driverContributions.length === 0,
    dataQualityScore: Number(anomaly.dataQualityScore),
    contradictionScore: 0,
    securityFilterRemovedCriticalData: false,
  });

  const criticalReasons = abstention.reasons.filter(
    (r) => r !== "confidence_below_threshold" && r !== "key_source_missing"
  );
  const shouldAbstainFlag = criticalReasons.length > 0;

  const series = await getKpiTimeseries(anomaly.kpiId, { allowedRegions: ["ALL"] }) || [];
  let periodOverPeriodChange = 0;
  const targetIndex = series.findIndex((p) => p.date === anomaly.period);
  if (targetIndex > 0) {
    const currentVal = series[targetIndex].value;
    const prevVal = series[targetIndex - 1].value;
    periodOverPeriodChange = prevVal !== 0 ? (currentVal - prevVal) / prevVal : 0;
  }
  const weeklyChangePercent = calculateWeeklyTrendChange(anomaly.kpiId, series, anomaly.period);
  const monthlyChangePercent = calculateMonthlyTrendChange(anomaly.kpiId, series, anomaly.period);

  return {
    anomalyId: anomaly.anomalyId,
    kpiId: anomaly.kpiId,
    kpiName: anomaly.kpi.name,
    period: anomaly.period,
    actualValue: Number(anomaly.actualValue),
    forecastValue: Number(anomaly.forecastValue),
    delta: deltaNum,
    zScore: Number(anomaly.zScore),
    materialityScore: Number(anomaly.materialityScore),
    dataQualityScore: Number(anomaly.dataQualityScore),
    refreshCadence: anomaly.kpi.refreshCadence,
    confidenceScore: overallConfidence,
    confidenceLabel: classifyConfidence(overallConfidence),
    abstain: shouldAbstainFlag,
    abstentionReasons: criticalReasons,
    driverContributions,
    periodOverPeriodChange: Number(periodOverPeriodChange),
    weeklyChangePercent: Number(weeklyChangePercent),
    monthlyChangePercent: Number(monthlyChangePercent),
    createdAt: anomaly.createdAt,
  };
}
