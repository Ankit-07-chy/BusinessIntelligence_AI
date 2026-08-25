import { describe, expect, it } from "vitest";
import { computeDataQualityScore, computeFreshnessScore } from "../../src/analytics/dataQuality.js";

describe("computeDataQualityScore", () => {
  it("weights completeness/freshness/consistency/validity per §2.4", () => {
    const score = computeDataQualityScore({
      completenessScore: 1,
      freshnessScore: 1,
      consistencyScore: 1,
      validityScore: 1,
    });
    expect(score).toBeCloseTo(1, 10);
  });

  it("drops proportionally when a component degrades", () => {
    const score = computeDataQualityScore({
      completenessScore: 0,
      freshnessScore: 1,
      consistencyScore: 1,
      validityScore: 1,
    });
    expect(score).toBeCloseTo(0.6, 5);
  });
});

describe("computeFreshnessScore", () => {
  it("is 1 when refreshed within cadence", () => {
    const asOf = new Date("2026-02-10T00:00:00Z");
    const lastRefresh = new Date("2026-02-09T00:00:00Z");
    expect(computeFreshnessScore(lastRefresh, 1, asOf)).toBe(1);
  });

  it("decays toward 0 the further overdue a source is", () => {
    const asOf = new Date("2026-02-22T00:00:00Z");
    const lastRefresh = new Date("2026-02-10T00:00:00Z"); // 12 days stale on a 1-day cadence
    const score = computeFreshnessScore(lastRefresh, 1, asOf);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(0.5);
  });
});
