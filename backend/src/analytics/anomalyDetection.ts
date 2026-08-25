import type { AnomalyDetectionInput, AnomalyDetectionResult, AnomalyThresholds } from "./types.js";

export const DEFAULT_ANOMALY_THRESHOLDS: AnomalyThresholds = {
  absoluteThreshold: 0,
  statisticalThreshold: 2,
  minimumQualityScore: 0.4,
};

/**
 * Anomaly detection per docs/architecture.md §2.2.
 * An anomaly requires the residual to clear both an absolute-dollar bar and a
 * statistical-significance bar, and the underlying data to be trustworthy enough
 * to act on (dataQualityScore above the minimum).
 */
export function detectAnomaly(input: AnomalyDetectionInput): AnomalyDetectionResult {
  const thresholds = { ...DEFAULT_ANOMALY_THRESHOLDS, ...input };
  const residual = input.actualValue - input.expectedValue;
  const zScore = input.historicalStdDev === 0 ? 0 : residual / input.historicalStdDev;

  const isAnomaly =
    Math.abs(residual) > thresholds.absoluteThreshold &&
    Math.abs(zScore) > thresholds.statisticalThreshold &&
    input.dataQualityScore > thresholds.minimumQualityScore;

  return { residual, zScore, isAnomaly };
}
