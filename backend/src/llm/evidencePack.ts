import type { EvidenceDriver, EvidencePack, EvidenceRecommendedAction, EvidenceSource } from "./types.js";

export interface EvidenceAnomalyInput {
  kpiId: string;
  period: string;
  actualValue: number;
  forecastValue: number;
  delta: number;
  confidenceScore: number;
  dataQualityScore: number;
  priorPeriodValue: number;
  periodOverPeriodChange: number;
}

export interface EvidenceDriverInput {
  driverId: string;
  estimatedImpact: number;
  confidenceScore: number;
  method: string | null;
}

export interface EvidenceSourceInput {
  sourceName: string;
  freshnessLabel: string;
  qualityScore: number;
}

export interface BuildEvidencePackInput {
  anomaly: EvidenceAnomalyInput;
  drivers: EvidenceDriverInput[];
  sources: EvidenceSourceInput[];
  persona: string;
  recommendedActions: EvidenceRecommendedAction[];
}

/**
 * Pure function: assembles the Evidence Pack the LLM is allowed to reason
 * from, per docs/llm_guardrails.md. Takes only already-computed numbers —
 * no DB access, no security logic. RLS/CLS filtering of `drivers`/`sources`
 * is the caller's responsibility (see services/securityPolicy.ts), applied
 * BEFORE this function runs.
 */
export function buildEvidencePack(input: BuildEvidencePackInput): EvidencePack {
  const { anomaly, drivers, sources, persona, recommendedActions } = input;

  const evidenceDrivers: EvidenceDriver[] = drivers.map((driver) => ({
    driver: driver.driverId,
    estimated_impact: driver.estimatedImpact,
    method: driver.method ?? "unknown",
    confidence: driver.confidenceScore,
  }));

  const evidenceSources: EvidenceSource[] = sources.map((source) => ({
    source: source.sourceName,
    freshness: source.freshnessLabel,
    quality: source.qualityScore,
  }));

  const explainedImpact = drivers.reduce((sum, driver) => sum + driver.estimatedImpact, 0);
  const unexplainedResidual = anomaly.delta - explainedImpact;
  const deltaPercent = anomaly.forecastValue === 0 ? 0 : anomaly.delta / anomaly.forecastValue;

  return {
    kpi_id: anomaly.kpiId,
    period: anomaly.period,
    persona,
    actual_value: anomaly.actualValue,
    forecast_value: anomaly.forecastValue,
    delta: anomaly.delta,
    delta_percent: deltaPercent,
    confidence_score: anomaly.confidenceScore,
    data_quality_score: anomaly.dataQualityScore,
    sources: evidenceSources,
    drivers: evidenceDrivers,
    unexplained_residual: unexplainedResidual,
    recommended_actions: recommendedActions,
    prior_period_value: anomaly.priorPeriodValue,
    period_over_period_change: anomaly.periodOverPeriodChange,
  };
}
