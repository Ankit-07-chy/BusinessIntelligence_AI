import { describe, expect, it } from "vitest";
import { detectAnomaly } from "../../src/analytics/anomalyDetection.js";

describe("detectAnomaly", () => {
  it("flags an anomaly when residual, z-score, and data quality all clear their bars", () => {
    const result = detectAnomaly({
      actualValue: 700_000,
      expectedValue: 1_000_000,
      historicalStdDev: 50_000,
      dataQualityScore: 0.8,
      absoluteThreshold: 10_000,
      statisticalThreshold: 2,
      minimumQualityScore: 0.4,
    });
    expect(result.residual).toBe(-300_000);
    expect(result.zScore).toBe(-6);
    expect(result.isAnomaly).toBe(true);
  });

  it("does not flag an anomaly when data quality is too low", () => {
    const result = detectAnomaly({
      actualValue: 700_000,
      expectedValue: 1_000_000,
      historicalStdDev: 50_000,
      dataQualityScore: 0.1,
      minimumQualityScore: 0.4,
    });
    expect(result.isAnomaly).toBe(false);
  });

  it("treats a zero standard deviation as a zero z-score instead of dividing by zero", () => {
    const result = detectAnomaly({
      actualValue: 100,
      expectedValue: 100,
      historicalStdDev: 0,
      dataQualityScore: 1,
    });
    expect(result.zScore).toBe(0);
    expect(result.isAnomaly).toBe(false);
  });
});
