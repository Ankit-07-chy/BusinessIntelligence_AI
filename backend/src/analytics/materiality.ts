import type { BusinessImpactInputs, MaterialityInputs } from "./types.js";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export interface MaterialityInput {
  residual: number;
  expectedValue: number;
  zScore: number;
  dataQualityScore: number;
  estimatedDollarImpact?: number;
  thresholdAbsoluteUsd?: number;
  thresholdPercent?: number;
  strategicWeight?: number;
  isAdverse?: boolean;
}

export interface MaterialityResult {
  materialityScore: number;
  statisticalScore: number;
  businessImpactScore: number;
  materialityLevel: "high" | "medium" | "low";
}

export function computeMateriality(input: MaterialityInput): MaterialityResult {
  const EPSILON = 1e-9;

  const statisticalScore = clamp01(Math.abs(input.zScore) / 4);

  const deviationPercent =
    Math.abs(input.expectedValue) < EPSILON
      ? 0
      : Math.abs(input.residual / input.expectedValue);

  const absoluteImpact =
    input.estimatedDollarImpact !== undefined
      ? Math.abs(input.estimatedDollarImpact)
      : Math.abs(input.residual);

  const absoluteScore =
    input.thresholdAbsoluteUsd && input.thresholdAbsoluteUsd > 0
      ? clamp01(absoluteImpact / input.thresholdAbsoluteUsd)
      : 0;

  const percentScore =
    input.thresholdPercent && input.thresholdPercent > 0
      ? clamp01(deviationPercent / input.thresholdPercent)
      : 0;

  const fallbackPercentScore = clamp01(deviationPercent / 0.2);

  const businessImpactScore = clamp01(
    Math.max(absoluteScore, percentScore, fallbackPercentScore)
  );

  const strategicWeight = input.strategicWeight ?? 0.5;
  const strategicFactor = 0.8 + 0.4 * clamp01(strategicWeight);
  const dataQualityScore = clamp01(input.dataQualityScore);

  const materialityScore = clamp01(
    statisticalScore *
      businessImpactScore *
      dataQualityScore *
      strategicFactor
  );

  let materialityLevel: "high" | "medium" | "low";
  if (materialityScore >= 0.6) {
    materialityLevel = "high";
  } else if (materialityScore >= 0.3) {
    materialityLevel = "medium";
  } else {
    materialityLevel = "low";
  }

  return {
    materialityScore,
    statisticalScore,
    businessImpactScore,
    materialityLevel,
  };
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
