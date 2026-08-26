import type { BaselineResult, TimeseriesPoint } from "./types.js";

const MIN_SAME_WEEKDAY_POINTS = 2;

function toMap(history: TimeseriesPoint[]): Map<string, number> {
  return new Map(
    history
      .filter((point) => point && Number.isFinite(point.value))
      .map((point) => [point.date, point.value])
  );
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;
}

function linearPredictNext(values: number[]): {
  predictedNext: number;
  slope: number;
  intercept: number;
} {
  const n = values.length;
  if (n === 0) return { predictedNext: 0, slope: 0, intercept: 0 };
  if (n === 1) return { predictedNext: values[0], slope: 0, intercept: values[0] };
  const xs = values.map((_, i) => i);
  const xMean = mean(xs);
  const yMean = mean(values);
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (xs[i] - xMean) * (values[i] - yMean);
    denominator += (xs[i] - xMean) ** 2;
  }
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;
  const predictedNext = intercept + slope * n;
  return { predictedNext, slope, intercept };
}

function windowAverage(historyMap: Map<string, number>, targetDate: string, days: number): number {
  const values: number[] = [];
  for (let i = 1; i <= days; i++) {
    const value = historyMap.get(addDays(targetDate, -i));
    if (value !== undefined) values.push(value);
  }
  return mean(values);
}

/**
 * Baseline forecast per docs/architecture.md §2.1:
 * expected_value = predictedNext + seasonalityAdjustment.
 * Clamps output within optional bounds and sets a quality reliability metric.
 */
export function computeBaseline(
  history: TimeseriesPoint[],
  targetDate: string,
  options: { 
    categoryHistory?: TimeseriesPoint[];
    lowerBound?: number;
    upperBound?: number;
    seasonalityWeight?: number;
  } = {},
): BaselineResult {
  const cleanHistory = history.filter((point) => Number.isFinite(point.value));
  if (cleanHistory.length === 0) {
    return {
      expectedValue: 0,
      method: "insufficient_history_mean",
      sameWeekdayAverage: 0,
      trendAdjustment: 0,
      seasonalityAdjustment: 0,
      samplePoints: 0,
      isReliable: false,
      reliabilityScore: 0,
      warning: "No historical data available",
    };
  }

  const historyMap = toMap(cleanHistory);
  const sameWeekdayPoints: number[] = [];
  for (let weeksAgo = 1; weeksAgo <= 4; weeksAgo++) {
    const value = historyMap.get(addDays(targetDate, -7 * weeksAgo));
    if (value !== undefined) sameWeekdayPoints.push(value);
  }
  sameWeekdayPoints.reverse();

  const seasonalityWeight = options.seasonalityWeight ?? 0.3;

  if (sameWeekdayPoints.length >= MIN_SAME_WEEKDAY_POINTS) {
    const sameWeekdayAverage = mean(sameWeekdayPoints);
    const { predictedNext } = linearPredictNext(sameWeekdayPoints);
    const trendAdjustment = predictedNext - sameWeekdayAverage;
    const recent7 = windowAverage(historyMap, targetDate, 7);
    const recent28 = windowAverage(historyMap, targetDate, 28);
    
    const rawSeasonality = recent28 === 0 ? 0 : (recent7 - recent28) * seasonalityWeight;
    const maxSeasonalityAdjustment = Math.max(Math.abs(sameWeekdayAverage) * 0.25, 1e-6);
    const seasonalityAdjustment = Math.max(-maxSeasonalityAdjustment, Math.min(maxSeasonalityAdjustment, rawSeasonality));
    
    let expectedValue = predictedNext + seasonalityAdjustment;
    if (options.lowerBound !== undefined) expectedValue = Math.max(options.lowerBound, expectedValue);
    if (options.upperBound !== undefined) expectedValue = Math.min(options.upperBound, expectedValue);

    const reliabilityScore = Math.min(0.95, 0.35 + 0.15 * sameWeekdayPoints.length);

    return {
      expectedValue,
      method: "same_weekday_trend",
      sameWeekdayAverage,
      trendAdjustment,
      seasonalityAdjustment,
      samplePoints: sameWeekdayPoints.length,
      isReliable: reliabilityScore >= 0.6,
      reliabilityScore,
    };
  }

  if (options.categoryHistory && options.categoryHistory.length > 0) {
    const { categoryHistory, ...fallbackOptions } = options;
    const fallback = computeBaseline(categoryHistory, targetDate, fallbackOptions);
    return {
      ...fallback,
      method: "category_fallback",
      isReliable: fallback.reliabilityScore >= 0.5,
      reliabilityScore: Math.min(0.6, (fallback.samplePoints ?? 0) / 4),
      fallbackMethod: fallback.method,
      warning: "Sparse series history. Used category-level baseline.",
    };
  }

  const allValues = cleanHistory.map((p) => p.value);
  const fallbackAverage = mean(allValues);
  let expectedValue = fallbackAverage;
  if (options.lowerBound !== undefined) expectedValue = Math.max(options.lowerBound, expectedValue);
  if (options.upperBound !== undefined) expectedValue = Math.min(options.upperBound, expectedValue);

  return {
    expectedValue,
    method: "insufficient_history_mean",
    sameWeekdayAverage: fallbackAverage,
    trendAdjustment: 0,
    seasonalityAdjustment: 0,
    samplePoints: allValues.length,
    isReliable: false,
    reliabilityScore: 0.2,
    warning: "Insufficient series history",
  };
}
