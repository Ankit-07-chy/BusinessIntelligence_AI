import type { BaselineResult, TimeseriesPoint } from "./types.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MIN_SAME_WEEKDAY_POINTS = 2;

function toMap(history: TimeseriesPoint[]): Map<string, number> {
  return new Map(history.map((point) => [point.date, point.value]));
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** OLS slope over evenly-spaced points, oldest first. */
function linearSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xs = values.map((_, i) => i);
  const xMean = mean(xs);
  const yMean = mean(values);
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (xs[i] - xMean) * (values[i] - yMean);
    denominator += (xs[i] - xMean) ** 2;
  }
  return denominator === 0 ? 0 : numerator / denominator;
}

function windowAverage(history: TimeseriesPoint[], targetDate: string, days: number): number {
  const byDate = toMap(history);
  const values: number[] = [];
  for (let i = 1; i <= days; i++) {
    const value = byDate.get(addDays(targetDate, -i));
    if (value !== undefined) values.push(value);
  }
  return mean(values);
}

/**
 * Baseline forecast per docs/architecture.md §2.1:
 * expected_value = same-weekday-4-week-average + trend_adjustment + seasonality_adjustment.
 * Falls back to a category-level series (or a plain mean) when the target series
 * has too few same-weekday observations — this is what lets a sparse-history
 * product (Incident 3) still produce a usable baseline.
 */
export function computeBaseline(
  history: TimeseriesPoint[],
  targetDate: string,
  options: { categoryHistory?: TimeseriesPoint[] } = {},
): BaselineResult {
  const sameWeekdayPoints: number[] = [];
  for (let weeksAgo = 1; weeksAgo <= 4; weeksAgo++) {
    const value = toMap(history).get(addDays(targetDate, -7 * weeksAgo));
    if (value !== undefined) sameWeekdayPoints.push(value);
  }
  // oldest first, for slope direction
  sameWeekdayPoints.reverse();

  if (sameWeekdayPoints.length >= MIN_SAME_WEEKDAY_POINTS) {
    const sameWeekdayAverage = mean(sameWeekdayPoints);
    const trendAdjustment = linearSlope(sameWeekdayPoints);
    const recent7 = windowAverage(history, targetDate, 7);
    const recent28 = windowAverage(history, targetDate, 28);
    const seasonalityAdjustment = recent28 === 0 ? 0 : (recent7 - recent28) * 0.5;
    return {
      expectedValue: sameWeekdayAverage + trendAdjustment + seasonalityAdjustment,
      method: "same_weekday_trend",
      sameWeekdayAverage,
      trendAdjustment,
      seasonalityAdjustment,
      samplePoints: sameWeekdayPoints.length,
    };
  }

  if (options.categoryHistory && options.categoryHistory.length > 0) {
    const fallback = computeBaseline(options.categoryHistory, targetDate);
    return { ...fallback, method: "category_fallback" };
  }

  const allValues = history.map((p) => p.value);
  return {
    expectedValue: mean(allValues),
    method: "insufficient_history_mean",
    sameWeekdayAverage: mean(allValues),
    trendAdjustment: 0,
    seasonalityAdjustment: 0,
    samplePoints: allValues.length,
  };
}
