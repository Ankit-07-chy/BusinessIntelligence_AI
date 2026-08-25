import type { BusinessImpactInputs, MaterialityInputs } from "./types.js";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Business impact score per docs/architecture.md §2.3 (sum of three normalized components). */
export function computeBusinessImpactScore(inputs: BusinessImpactInputs): number {
  return clamp01(inputs.normalizedAbsDollarImpact + inputs.marginImpact + inputs.strategicWeight);
}

/** Statistical score: how far the z-score sits past the significance threshold, normalized to [0,1]. */
export function computeStatisticalScore(zScore: number, referenceZScore = 3): number {
  return clamp01(Math.abs(zScore) / referenceZScore);
}

/**
 * Materiality score per docs/architecture.md §2.3:
 * statistical_score * business_impact_score * data_quality_score.
 */
export function computeMaterialityScore(inputs: MaterialityInputs): number {
  return clamp01(inputs.statisticalScore * inputs.businessImpactScore * inputs.dataQualityScore);
}
