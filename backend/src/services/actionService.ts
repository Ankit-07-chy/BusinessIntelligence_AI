import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../db/prismaClient.js";
import type { AuthTokenPayload } from "../schemas/auth.js";
import { mapDriverToAction } from "./actionMapping.js";
import { getAnomalyDetail } from "./anomalyService.js";
import { getEffectivePolicy, isColumnRestricted } from "./securityPolicy.js";

const CONFIDENCE_LABEL_TO_SCORE: Record<string, number> = { high: 0.9, medium: 0.7, low: 0.5 };

/**
 * Generates any missing ActionRecommendation rows for an anomaly's drivers,
 * idempotently. Respects the same CLS gate as anomalyService.getAnomalyDetail
 * — if the anomaly's KPI is restricted for this user, nothing is generated
 * or returned.
 */
export async function ensureActionsForAnomaly(
  anomalyId: string,
  user?: AuthTokenPayload,
  prisma: PrismaClient = defaultPrisma,
) {
  const anomaly = await getAnomalyDetail(anomalyId, user, prisma);
  if (!anomaly) return [];

  const existing = await prisma.actionRecommendation.findMany({ where: { anomalyId } });
  const existingDriverIds = new Set(existing.map((row) => row.driverId).filter(Boolean));

  const toCreate = anomaly.driverContributions
    .filter((driver) => !existingDriverIds.has(driver.driverId))
    .map((driver) => {
      const template = mapDriverToAction(driver.driverId);
      if (!template) return null;
      return {
        anomalyId,
        driverId: driver.driverId,
        lever: template.lever,
        actionName: template.action,
        ownerPersona: template.ownerPersona,
        expectedImpact: Math.round(Math.abs(driver.estimatedImpact)),
        confidence: CONFIDENCE_LABEL_TO_SCORE[template.confidence] ?? 0.5,
        monitoringPlan: template.monitoringPlan,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (toCreate.length > 0) {
    await prisma.actionRecommendation.createMany({ data: toCreate });
  }

  return prisma.actionRecommendation.findMany({ where: { anomalyId }, orderBy: { createdAt: "asc" } });
}

function toActionSummary(row: {
  actionId: string;
  anomalyId: string;
  anomaly: { kpiId: string; period: string; kpi: { name: string } };
  driverId: string | null;
  lever: string | null;
  actionName: string;
  ownerPersona: string;
  expectedImpact: unknown;
  confidence: unknown;
  monitoringPlan: string;
  status: string;
  createdAt: Date;
}) {
  return {
    actionId: row.actionId,
    anomalyId: row.anomalyId,
    kpiId: row.anomaly.kpiId,
    kpiName: row.anomaly.kpi.name,
    period: row.anomaly.period,
    driverId: row.driverId,
    lever: row.lever,
    actionName: row.actionName,
    ownerPersona: row.ownerPersona,
    expectedImpact: Number(row.expectedImpact),
    confidence: row.confidence === null ? null : Number(row.confidence),
    monitoringPlan: row.monitoringPlan,
    status: row.status,
    createdAt: row.createdAt,
  };
}

export async function listActions(
  options: { anomalyId?: string; user?: AuthTokenPayload } = {},
  prisma: PrismaClient = defaultPrisma,
) {
  const policy = options.user ? getEffectivePolicy(options.user) : null;

  if (options.anomalyId) {
    // ensureActionsForAnomaly already returns [] when the anomaly's KPI is
    // restricted for this user (via getAnomalyDetail's CLS gate) — but if
    // rows already exist from before that gate existed, still refuse to read
    // them back for a restricted caller.
    const generated = await ensureActionsForAnomaly(options.anomalyId, options.user, prisma);
    if (generated.length === 0) {
      const anomaly = await prisma.anomaly.findUnique({ where: { anomalyId: options.anomalyId } });
      if (!anomaly || (policy && isColumnRestricted(policy, anomaly.kpiId))) return [];
    }
  }

  const rows = await prisma.actionRecommendation.findMany({
    where: options.anomalyId ? { anomalyId: options.anomalyId } : undefined,
    include: { anomaly: { include: { kpi: true } } },
    orderBy: { createdAt: "desc" },
  });

  const visible = policy ? rows.filter((row) => !isColumnRestricted(policy, row.anomaly.kpiId)) : rows;
  return visible.map(toActionSummary);
}

export type ActionStatus = "accepted" | "rejected";

export async function updateActionStatus(
  actionId: string,
  status: ActionStatus,
  user?: AuthTokenPayload,
  prisma: PrismaClient = defaultPrisma,
) {
  const existing = await prisma.actionRecommendation.findUnique({
    where: { actionId },
    include: { anomaly: true },
  });
  if (!existing) return null;

  if (user) {
    const policy = getEffectivePolicy(user);
    if (isColumnRestricted(policy, existing.anomaly.kpiId)) return null;
  }

  try {
    return await prisma.actionRecommendation.update({ where: { actionId }, data: { status } });
  } catch {
    return null;
  }
}
