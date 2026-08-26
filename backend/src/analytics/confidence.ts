import type { ConfidenceInputs, ConfidenceLabel } from "./types.js";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Confidence score per docs/architecture.md §2.6:
 * 0.30*evidence_strength + 0.25*data_quality_score + 0.20*model_fit_score
 * + 0.15*causal_or_business_confirmation + 0.10*freshness_score.
 */
export function computeConfidenceScore(inputs: ConfidenceInputs): number {
  const evidenceStrength = clamp01(inputs.evidenceStrength);
  const dataQualityScore = clamp01(inputs.dataQualityScore);
  const modelFitScore = clamp01(inputs.modelFitScore);
  const causalOrBusinessConfirmation = clamp01(inputs.causalOrBusinessConfirmation);
  const freshnessScore = clamp01(inputs.freshnessScore);

  let score =
    0.3 * evidenceStrength +
    0.25 * dataQualityScore +
    0.2 * modelFitScore +
    0.15 * causalOrBusinessConfirmation +
    0.1 * freshnessScore;

  // Apply robust telemetry safety hard-caps to prevent false-positives
  if (inputs.keySourceMissing) {
    score = Math.min(score, 0.3);
  }
  if (inputs.sparseHistory) {
    score = Math.min(score, 0.55);
  }
  if (inputs.contradictionScore !== undefined && inputs.contradictionScore > 0.6) {
    score = Math.min(score, 0.4);
  }
  if (inputs.baselineReliability !== undefined && inputs.baselineReliability < 0.4) {
    score = Math.min(score, 0.5);
  }
  if (dataQualityScore < 0.3) {
    score = Math.min(score, 0.35);
  }

  return clamp01(score);
}

export function classifyConfidence(score: number): ConfidenceLabel {
  if (score >= 0.75) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}
