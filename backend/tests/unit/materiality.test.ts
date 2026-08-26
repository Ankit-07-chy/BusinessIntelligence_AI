import { describe, expect, it } from "vitest";
import {
  computeBusinessImpactScore,
  computeMaterialityScore,
  computeStatisticalScore,
  computeMateriality,
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

describe("computeMateriality", () => {
  it("calculates multi-criteria materiality scores and levels", () => {
    const resHigh = computeMateriality({
      residual: -200000,
      expectedValue: 1000000,
      zScore: 5.0,
      dataQualityScore: 0.9,
      thresholdAbsoluteUsd: 100000,
      thresholdPercent: 0.05,
      strategicWeight: 0.8,
    });
    expect(resHigh.materialityLevel).toBe("high");
    expect(resHigh.materialityScore).toBeGreaterThanOrEqual(0.6);

    const resLow = computeMateriality({
      residual: -100,
      expectedValue: 1000,
      zScore: 0.2,
      dataQualityScore: 0.5,
      thresholdAbsoluteUsd: 50000,
      thresholdPercent: 0.1,
    });
    expect(resLow.materialityLevel).toBe("low");
  });
});
