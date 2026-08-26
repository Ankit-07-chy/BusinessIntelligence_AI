import { describe, expect, it } from "vitest";
import { computeBaseline } from "../../src/analytics/baseline.js";
import type { TimeseriesPoint } from "../../src/analytics/types.js";

function daysBack(target: string, days: number): string {
  const d = new Date(`${target}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

describe("computeBaseline", () => {
  it("averages the same weekday over the previous 4 weeks", () => {
    const target = "2026-02-05"; // Thursday
    const history: TimeseriesPoint[] = [1, 2, 3, 4].map((weeksAgo, i) => ({
      date: daysBack(target, weeksAgo * 7),
      value: 100,
    }));
    const result = computeBaseline(history, target);
    expect(result.method).toBe("same_weekday_trend");
    expect(result.samplePoints).toBe(4);
    expect(result.expectedValue).toBeCloseTo(100, 5);
  });

  it("falls back to category history when the target series is too sparse", () => {
    const target = "2026-02-05";
    const sparseHistory: TimeseriesPoint[] = [{ date: daysBack(target, 7), value: 10 }];
    const categoryHistory: TimeseriesPoint[] = [1, 2, 3, 4].map((weeksAgo) => ({
      date: daysBack(target, weeksAgo * 7),
      value: 500,
    }));
    const result = computeBaseline(sparseHistory, target, { categoryHistory });
    expect(result.method).toBe("category_fallback");
    expect(result.expectedValue).toBeCloseTo(500, 5);
  });

  it("falls back to a plain mean when there is no category history either", () => {
    const target = "2026-02-05";
    const history: TimeseriesPoint[] = [
      { date: daysBack(target, 1), value: 10 },
      { date: daysBack(target, 2), value: 20 },
    ];
    const result = computeBaseline(history, target);
    expect(result.method).toBe("insufficient_history_mean");
    expect(result.expectedValue).toBeCloseTo(15, 5);
  });

  it("Empty history returns expected defaults", () => {
    const target = "2026-02-05";
    const result = computeBaseline([], target);
    expect(result.expectedValue).toBe(0);
    expect(result.isReliable).toBe(false);
    expect(result.reliabilityScore).toBe(0);
    expect(result.warning).toBe("No historical data available");
  });

  it("Sparse history with category fallback does not cause infinite recursion", () => {
    const target = "2026-02-05";
    const sparseHistory: TimeseriesPoint[] = [{ date: daysBack(target, 7), value: 10 }];
    const categoryHistory: TimeseriesPoint[] = [{ date: daysBack(target, 7), value: 500 }];
    const result = computeBaseline(sparseHistory, target, { categoryHistory });
    expect(result.method).toBe("category_fallback");
    expect(result.fallbackMethod).toBe("insufficient_history_mean");
  });

  it("Same-weekday baseline with 2 points returns lower reliability than 4 points", () => {
    const target = "2026-02-05";
    const history2: TimeseriesPoint[] = [1, 2].map((weeksAgo) => ({
      date: daysBack(target, weeksAgo * 7),
      value: 100,
    }));
    const history4: TimeseriesPoint[] = [1, 2, 3, 4].map((weeksAgo) => ({
      date: daysBack(target, weeksAgo * 7),
      value: 100,
    }));

    const result2 = computeBaseline(history2, target);
    const result4 = computeBaseline(history4, target);

    expect(result2.reliabilityScore).toBeLessThan(result4.reliabilityScore ?? 0);
  });

  it("Non-finite history values are filtered out", () => {
    const target = "2026-02-05";
    const history: TimeseriesPoint[] = [
      { date: daysBack(target, 7), value: NaN },
      { date: daysBack(target, 14), value: 100 },
      { date: daysBack(target, 21), value: Infinity },
      { date: daysBack(target, 28), value: 100 },
    ];
    const result = computeBaseline(history, target);
    // Since only 14 and 28 days back are finite numbers, samplePoints is 2
    expect(result.samplePoints).toBe(2);
    // predictedNext is 100. windowAverage(7) = 0. windowAverage(28) = 100. 
    // Seasonality = (0 - 100)*0.3 = -30, clamped to 25% of 100 = -25.
    // expectedValue = 100 - 25 = 75.
    expect(result.expectedValue).toBeCloseTo(75, 5);
  });

  it("Expected value respects lowerBound and upperBound", () => {
    const target = "2026-02-05";
    const history: TimeseriesPoint[] = [1, 2, 3, 4].map((weeksAgo) => ({
      date: daysBack(target, weeksAgo * 7),
      value: 100,
    }));

    const resLower = computeBaseline(history, target, { lowerBound: 150 });
    expect(resLower.expectedValue).toBe(150);

    const resUpper = computeBaseline(history, target, { upperBound: 50 });
    expect(resUpper.expectedValue).toBe(50);
  });

  it("Seasonality adjustment is clamped to 25 percent of magnitude", () => {
    const target = "2026-02-05";
    const history: TimeseriesPoint[] = [
      ...[1, 2, 3, 4].map((w) => ({ date: daysBack(target, w * 7), value: 100 })),
      ...Array.from({ length: 6 }).map((_, i) => ({ date: daysBack(target, i + 1), value: 1000 })), // giant seasonality lift on days 1..6
    ];
    const result = computeBaseline(history, target, { seasonalityWeight: 0.9 });
    const maxSeasonality = 100 * 0.25;
    expect(Math.abs(result.seasonalityAdjustment)).toBeLessThanOrEqual(maxSeasonality + 1e-4);
  });
});
