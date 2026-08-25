import { describe, expect, it } from "vitest";
import { computeDriverContribution, computeDriverContributions } from "../../src/analytics/contribution.js";

describe("computeDriverContribution", () => {
  it("divides estimated impact by total KPI change", () => {
    expect(computeDriverContribution({ estimatedImpact: -250_000, totalKpiChange: -500_000 })).toBeCloseTo(0.5, 5);
  });

  it("returns 0 rather than dividing by zero", () => {
    expect(computeDriverContribution({ estimatedImpact: -250_000, totalKpiChange: 0 })).toBe(0);
  });
});

describe("computeDriverContributions", () => {
  it("maps contribution across a list of drivers, ranking-agnostic", () => {
    const result = computeDriverContributions(
      [
        { driverId: "stockout_top_skus", estimatedImpact: -250_000 },
        { driverId: "paid_search_reduction", estimatedImpact: -120_000 },
      ],
      -370_000,
    );
    expect(result[0].contribution).toBeCloseTo(0.6757, 3);
    expect(result[1].contribution).toBeCloseTo(0.3243, 3);
  });
});
