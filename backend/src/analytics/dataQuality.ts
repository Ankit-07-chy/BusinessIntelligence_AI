import type { DataQualityInputs } from "./types.js";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Data quality score per docs/architecture.md §2.4:
 * 0.4*completeness + 0.3*freshness + 0.2*consistency + 0.1*validity.
 */
export function computeDataQualityScore(inputs: DataQualityInputs): number {
  return clamp01(
    0.4 * inputs.completenessScore +
      0.3 * inputs.freshnessScore +
      0.2 * inputs.consistencyScore +
      0.1 * inputs.validityScore,
  );
}

/**
 * Freshness decays linearly from 1 (refreshed on schedule) to 0 once a source is
 * more than 2x its expected refresh cadence overdue. Used to turn
 * `source_status.last_successful_refresh` into the freshness_score input above.
 */
export function computeFreshnessScore(
  lastSuccessfulRefresh: Date,
  expectedCadenceDays: number,
  asOf: Date,
): number {
  const daysStale = Math.max(
    0,
    (asOf.getTime() - lastSuccessfulRefresh.getTime()) / (24 * 60 * 60 * 1000) - expectedCadenceDays,
  );
  if (expectedCadenceDays <= 0) return daysStale === 0 ? 1 : 0;
  return clamp01(1 - daysStale / (expectedCadenceDays * 2));
}
