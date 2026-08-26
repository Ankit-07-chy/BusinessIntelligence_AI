import type { AnomalyDetectionInput, AnomalyDetectionResult, AnomalyThresholds } from "./types.js";

export const DEFAULT_ANOMALY_THRESHOLDS: Required<
  Pick<
    AnomalyThresholds,
    "absoluteThreshold" | "statisticalThreshold" | "minimumQualityScore"
  >
> = {
  absoluteThreshold: 0,
  statisticalThreshold: 2,
  minimumQualityScore: 0.4,
};

export function detectAnomaly(input: AnomalyDetectionInput): AnomalyDetectionResult {
  if (
    !Number.isFinite(input.actualValue) ||
    !Number.isFinite(input.expectedValue) ||
    !Number.isFinite(input.historicalStdDev) ||
    !Number.isFinite(input.dataQualityScore)
  ) {
    return {
      residual: 0,
      zScore: 0,
      deviationPercentage: 0,
      isAnomaly: false,
      isAdverse: false,
      isUsable: false,
      passesBusinessThreshold: false,
      passesStatisticalThreshold: false,
      passesDataQualityThreshold: false,
      passesBaselineReliabilityThreshold: false,
      warning: "Non-finite anomaly detection inputs",
    };
  }

  const thresholds: Required<
    Pick<
      AnomalyThresholds,
      "absoluteThreshold" | "statisticalThreshold" | "minimumQualityScore"
    >
  > & AnomalyThresholds = {
    absoluteThreshold: DEFAULT_ANOMALY_THRESHOLDS.absoluteThreshold,
    statisticalThreshold: DEFAULT_ANOMALY_THRESHOLDS.statisticalThreshold,
    minimumQualityScore: DEFAULT_ANOMALY_THRESHOLDS.minimumQualityScore,
    minimumBaselineReliability: 0.4,
    ...input.thresholds,
  };

  const residual = input.actualValue - input.expectedValue;
  
  const EPSILON = 1e-9;
  const MAX_Z = 10;

  let zScore = 0;
  if (Math.abs(input.historicalStdDev) < EPSILON) {
    if (Math.abs(residual) < EPSILON) {
      zScore = 0;
    } else {
      zScore = residual > 0 ? MAX_Z : -MAX_Z;
    }
  } else {
    zScore = residual / input.historicalStdDev;
    zScore = Math.max(-MAX_Z, Math.min(MAX_Z, zScore));
  }

  const deviationPercentage = Math.abs(input.expectedValue) < EPSILON ? 0 : residual / Math.abs(input.expectedValue);

  const passesAbsolute = Math.abs(residual) > (thresholds.absoluteThreshold ?? 0);
  const passesPercent = thresholds.percentThreshold === undefined
    ? passesAbsolute
    : Math.abs(deviationPercentage) > thresholds.percentThreshold;

  const passesBusinessThreshold = passesAbsolute || passesPercent;
  const passesStatisticalThreshold = Math.abs(zScore) > (thresholds.statisticalThreshold ?? 2);
  const passesDataQualityThreshold = input.dataQualityScore > (thresholds.minimumQualityScore ?? 0.4);

  const hasEnoughHistory = 
    input.historyPoints === undefined ||
    thresholds.minimumHistoryPoints === undefined ||
    input.historyPoints >= thresholds.minimumHistoryPoints;

  const passesBaselineReliabilityThreshold =
    input.baselineReliability === undefined ||
    thresholds.minimumBaselineReliability === undefined ||
    input.baselineReliability >= thresholds.minimumBaselineReliability;

  const isAnomaly =
    passesBusinessThreshold &&
    passesStatisticalThreshold &&
    passesDataQualityThreshold &&
    hasEnoughHistory &&
    passesBaselineReliabilityThreshold;

  let isAdverse = false;
  if (isAnomaly) {
    if (input.direction === "increase_is_good") {
      isAdverse = residual < 0;
    } else if (input.direction === "decrease_is_good") {
      isAdverse = residual > 0;
    } else {
      isAdverse = residual < 0; // default to drop is bad
    }
  }

  return {
    residual,
    zScore,
    deviationPercentage,
    isAnomaly,
    isAdverse,
    isUsable: true,
    passesBusinessThreshold,
    passesStatisticalThreshold,
    passesDataQualityThreshold,
    passesBaselineReliabilityThreshold,
  };
}
