import type { DriverRankingInput, RankedDriver } from "./types.js";

/**
 * Driver ranking per docs/architecture.md §2.7:
 * weighted blend of impact/confidence/evidence/actionability/relevance/timeliness,
 * minus contradiction / low-data-quality / stale-evidence penalties.
 */
export function computeDriverScore(input: DriverRankingInput): number {
  const raw =
    0.35 * input.estimatedImpactScore +
    0.25 * input.confidenceScore +
    0.15 * input.evidenceStrengthScore +
    0.1 * input.actionabilityScore +
    0.1 * input.businessRelevanceScore +
    0.05 * input.timelinessScore -
    (input.contradictionPenalty ?? 0) -
    (input.lowDataQualityPenalty ?? 0) -
    (input.staleEvidencePenalty ?? 0);
  return Math.max(0, raw);
}

export function rankDrivers(inputs: DriverRankingInput[]): RankedDriver[] {
  return inputs
    .map((input) => ({ ...input, driverScore: computeDriverScore(input) }))
    .sort((a, b) => b.driverScore - a.driverScore)
    .map((driver, index) => ({ ...driver, rank: index + 1 }));
}
