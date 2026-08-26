import { describe, expect, it } from "vitest";
import { detectAnomaly } from "../../src/analytics/anomalyDetection.js";

describe("detectAnomaly", () => {
  it("flags an anomaly when residual, z-score, and data quality all clear their bars", () => {
    const result = detectAnomaly({
      actualValue: 700_000,
      expectedValue: 1_000_000,
      historicalStdDev: 50_000,
      dataQualityScore: 0.8,
      thresholds: {
        absoluteThreshold: 10_000,
        statisticalThreshold: 2,
        minimumQualityScore: 0.4,
      },
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
      thresholds: {
        minimumQualityScore: 0.4,
      },
    });
    expect(result.isAnomaly).toBe(false);
  });

  it("treats a zero standard deviation as a zero z-score instead of dividing by zero when values match", () => {
    const result = detectAnomaly({
      actualValue: 100,
      expectedValue: 100,
      historicalStdDev: 0,
      dataQualityScore: 1,
    });
    expect(result.zScore).toBe(0);
    expect(result.isAnomaly).toBe(false);
  });

  it("Zero standard deviation with large residual produces capped z-score and anomaly if thresholds pass", () => {
    const result = detectAnomaly({
      actualValue: 200,
      expectedValue: 100,
      historicalStdDev: 0,
      dataQualityScore: 1,
      thresholds: {
        absoluteThreshold: 10,
      },
    });
    expect(result.zScore).toBe(10);
    expect(result.isAnomaly).toBe(true);
  });

  it("Percent threshold can trigger anomaly", () => {
    const result = detectAnomaly({
      actualValue: 120,
      expectedValue: 100,
      historicalStdDev: 5,
      dataQualityScore: 1,
      thresholds: {
        absoluteThreshold: 50, // absolute threshold misses
        percentThreshold: 0.15, // percent threshold passes (20%)
      },
    });
    expect(result.isAnomaly).toBe(true);
  });

  it("Low baseline reliability prevents anomaly", () => {
    const result = detectAnomaly({
      actualValue: 200,
      expectedValue: 100,
      historicalStdDev: 5,
      dataQualityScore: 1,
      baselineReliability: 0.2,
      thresholds: {
        minimumBaselineReliability: 0.4,
      },
    });
    expect(result.isAnomaly).toBe(false);
  });

  it("Non-finite inputs return isAnomaly false and isUsable false", () => {
    const result = detectAnomaly({
      actualValue: NaN,
      expectedValue: 100,
      historicalStdDev: 5,
      dataQualityScore: 1,
    });
    expect(result.isAnomaly).toBe(false);
    expect(result.isUsable).toBe(false);
  });

  it("direction increase_is_good marks negative residual as adverse", () => {
    const result = detectAnomaly({
      actualValue: 80,
      expectedValue: 100,
      historicalStdDev: 5,
      dataQualityScore: 1,
      direction: "increase_is_good",
      thresholds: {
        absoluteThreshold: 5,
      },
    });
    expect(result.isAnomaly).toBe(true);
    expect(result.isAdverse).toBe(true);
  });

  it("direction decrease_is_good marks positive residual as adverse", () => {
    const result = detectAnomaly({
      actualValue: 120,
      expectedValue: 100,
      historicalStdDev: 5,
      dataQualityScore: 1,
      direction: "decrease_is_good",
      thresholds: {
        absoluteThreshold: 5,
      },
    });
    expect(result.isAnomaly).toBe(true);
    expect(result.isAdverse).toBe(true);
  });
});
