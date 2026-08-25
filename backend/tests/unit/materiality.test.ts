import { describe, expect, it } from "vitest";
import {
  computeBusinessImpactScore,
  computeMaterialityScore,
  computeStatisticalScore,
} from "../../src/analytics/materiality.js";

describe("computeStatisticalScore", () => {
  it("normalizes the z-score against a reference magnitude", () => {
    expect(computeStatisticalScore(6, 3)).toBe(1); // clamped
    expect(computeStatisticalScore(1.5, 3)).toBeCloseTo(0.5, 5);
  });
});

describe("computeBusinessImpactScore", () => {
  it("sums and clamps the three normalized components", () => {
    expect(
      computeBusinessImpactScore({ normalizedAbsDollarImpact: 0.6, marginImpact: 0.6, strategicWeight: 0.6 }),
    ).toBe(1);
  });
});

describe("computeMaterialityScore", () => {
  it("multiplies statistical, business-impact, and data-quality scores", () => {
    const score = computeMaterialityScore({
      statisticalScore: 0.8,
      businessImpactScore: 0.5,
      dataQualityScore: 0.9,
    });
    expect(score).toBeCloseTo(0.36, 5);
  });
});
