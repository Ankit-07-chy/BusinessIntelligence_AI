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
});
