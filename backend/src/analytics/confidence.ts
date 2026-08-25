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
  return clamp01(
    0.3 * inputs.evidenceStrength +
      0.25 * inputs.dataQualityScore +
      0.2 * inputs.modelFitScore +
      0.15 * inputs.causalOrBusinessConfirmation +
      0.1 * inputs.freshnessScore,
  );
}

export function classifyConfidence(score: number): ConfidenceLabel {
  if (score >= 0.75) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}
