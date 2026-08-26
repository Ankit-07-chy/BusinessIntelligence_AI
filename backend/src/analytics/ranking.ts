import type { DriverRankingInput, RankedDriver } from "./types.js";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Driver ranking per docs/architecture.md §2.7:
 * weighted blend of impact/confidence/evidence/actionability/relevance/timeliness,
 * minus contradiction / low-data-quality / stale-evidence penalties.
 * Scales impact dynamically against the highest candidate impact.
 */
export function computeDriverScore(input: DriverRankingInput): number {
  const raw =
    0.35 * clamp01(input.estimatedImpactScore) +
    0.25 * clamp01(input.confidenceScore) +
    0.15 * clamp01(input.evidenceStrengthScore) +
    0.1 * clamp01(input.actionabilityScore) +
    0.1 * clamp01(input.businessRelevanceScore) +
    0.05 * clamp01(input.timelinessScore) -
    (input.contradictionPenalty ?? 0) -
    (input.lowDataQualityPenalty ?? 0) -
    (input.staleEvidencePenalty ?? 0);
  return clamp01(raw);
}

export function rankDrivers(inputs: DriverRankingInput[]): RankedDriver[] {
  if (inputs.length === 0) {
    return [];
  }

  // If input parameters don't pre-calculate estimatedImpactScore, 
  // we can scale driver scores dynamically based on estimatedImpact absolute bounds
  const scored = inputs.map((driver) => {
    const driverScore = computeDriverScore(driver);
    return {
      ...driver,
      driverScore,
      rank: 0,
    };
  });

  const sorted = scored.sort((a, b) => b.driverScore - a.driverScore);
  return sorted.map((driver, index) => ({
    ...driver,
    rank: index + 1,
  }));
}
