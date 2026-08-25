import { describe, expect, it } from "vitest";
import { computeDriverScore, rankDrivers } from "../../src/analytics/ranking.js";

const baseDriver = {
  estimatedImpactScore: 0.8,
  confidenceScore: 0.8,
  evidenceStrengthScore: 0.8,
  actionabilityScore: 0.8,
  businessRelevanceScore: 0.8,
  timelinessScore: 0.8,
};

describe("computeDriverScore", () => {
  it("applies penalties without going negative", () => {
    const score = computeDriverScore({
      driverId: "stale_driver",
      ...baseDriver,
      contradictionPenalty: 5,
    });
    expect(score).toBe(0);
  });
});

describe("rankDrivers", () => {
  it("ranks the higher-impact driver first, matching golden incident 1's expected order", () => {
    const ranked = rankDrivers([
      { driverId: "paid_search_reduction", ...baseDriver, estimatedImpactScore: 0.4, confidenceScore: 0.68 },
      { driverId: "stockout_top_skus", ...baseDriver, estimatedImpactScore: 0.9, confidenceScore: 0.84 },
    ]);
    expect(ranked[0].driverId).toBe("stockout_top_skus");
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].driverId).toBe("paid_search_reduction");
    expect(ranked[1].rank).toBe(2);
  });
});
