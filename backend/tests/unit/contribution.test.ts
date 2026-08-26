import { describe, expect, it } from "vitest";
import { 
  computeDriverContribution, 
  computeDriverContributions, 
  computeContributionSummary 
} from "../../src/analytics/contribution.js";

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

  it("Driver contributions include residual driver when drivers do not explain total change", () => {
    const result = computeDriverContributions(
      [
        { driverId: "stockout_top_skus", estimatedImpact: -250_000 },
      ],
      -400_000,
    );
    expect(result).toHaveLength(2);
    expect(result[1].driverId).toBe("unexplained_residual");
    expect(result[1].estimatedImpact).toBe(-150_000);
  });

  it("Contributions sum approximately to 1 when totalKpiChange is non-zero", () => {
    const result = computeDriverContributions(
      [
        { driverId: "stockout_top_skus", estimatedImpact: -250_000 },
        { driverId: "paid_search_reduction", estimatedImpact: -100_000 },
      ],
      -400_000,
    );
    const sum = result.reduce((acc, d) => acc + d.contribution, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("When totalKpiChange is zero but drivers offset, use absolute impact denominator", () => {
    const result = computeDriverContributions(
      [
        { driverId: "stockout_top_skus", estimatedImpact: -200_000 },
        { driverId: "marketing_lift", estimatedImpact: 200_000 },
      ],
      0,
    );
    expect(result[0].contribution).toBe(-0.5);
    expect(result[1].contribution).toBe(0.5);
  });

  it("Non-finite driver impacts are removed", () => {
    const result = computeDriverContributions(
      [
        { driverId: "stockout_top_skus", estimatedImpact: NaN },
        { driverId: "paid_search_reduction", estimatedImpact: -100_000 },
      ],
      -400_000,
    );
    // Nan driver is filtered out, residual is -300K
    expect(result.some((d) => d.driverId === "stockout_top_skus")).toBe(false);
    expect(result.some((d) => d.driverId === "unexplained_residual")).toBe(true);
  });

  it("unexplained_residual driver is not duplicated if already present", () => {
    const result = computeDriverContributions(
      [
        { driverId: "unexplained_residual", estimatedImpact: -100_000 },
        { driverId: "paid_search_reduction", estimatedImpact: -300_000 },
      ],
      -400_000,
    );
    const unexplained = result.filter((d) => d.driverId === "unexplained_residual");
    expect(unexplained).toHaveLength(1);
  });
});

describe("computeContributionSummary", () => {
  it("computes complete metadata summary of contributions", () => {
    const summary = computeContributionSummary(
      [
        { driverId: "stockout_top_skus", estimatedImpact: -200 },
        { driverId: "marketing_lift", estimatedImpact: 200 },
      ],
      0
    );
    expect(summary.isOffsetting).toBe(true);
    expect(summary.totalKpiChange).toBe(0);
    expect(summary.residualImpact).toBe(0);
  });
});
