import { describe, expect, it } from "vitest";
import { shouldAbstain } from "../../src/analytics/abstention.js";

describe("shouldAbstain", () => {
  it("does not abstain when everything is healthy", () => {
    const result = shouldAbstain({
      confidenceScore: 0.8,
      keySourceMissing: false,
      dataQualityScore: 0.9,
      contradictionScore: 0.1,
      securityFilterRemovedCriticalData: false,
    });
    expect(result.shouldAbstain).toBe(false);
    expect(result.reasons).toHaveLength(0);
  });

  it("abstains and reports every failing condition, matching golden incident 2 (low confidence)", () => {
    const result = shouldAbstain({
      confidenceScore: 0.3,
      keySourceMissing: true,
      dataQualityScore: 0.9,
      contradictionScore: 0.1,
      securityFilterRemovedCriticalData: false,
    });
    expect(result.shouldAbstain).toBe(true);
    expect(result.reasons).toEqual(["confidence_below_threshold", "key_source_missing"]);
  });

  it("Abstain when confidenceScore below 0.5", () => {
    const result = shouldAbstain({
      confidenceScore: 0.45,
      keySourceMissing: false,
      dataQualityScore: 0.8,
      contradictionScore: 0.1,
      securityFilterRemovedCriticalData: false,
    });
    expect(result.shouldAbstain).toBe(true);
    expect(result.reasons).toContain("confidence_below_threshold");
  });

  it("Abstain when keySourceMissing is true", () => {
    const result = shouldAbstain({
      confidenceScore: 0.8,
      keySourceMissing: true,
      dataQualityScore: 0.8,
      contradictionScore: 0.1,
      securityFilterRemovedCriticalData: false,
    });
    expect(result.shouldAbstain).toBe(true);
    expect(result.reasons).toContain("key_source_missing");
  });

  it("Abstain when dataQualityScore below 0.5", () => {
    const result = shouldAbstain({
      confidenceScore: 0.8,
      keySourceMissing: false,
      dataQualityScore: 0.4,
      contradictionScore: 0.1,
      securityFilterRemovedCriticalData: false,
    });
    expect(result.shouldAbstain).toBe(true);
    expect(result.reasons).toContain("data_quality_below_threshold");
  });

  it("Abstain when contradictionScore above threshold", () => {
    const result = shouldAbstain({
      confidenceScore: 0.8,
      keySourceMissing: false,
      dataQualityScore: 0.8,
      contradictionScore: 0.7,
      contradictionThreshold: 0.6,
      securityFilterRemovedCriticalData: false,
    });
    expect(result.shouldAbstain).toBe(true);
    expect(result.reasons).toContain("contradictory_evidence");
  });

  it("Abstain when securityFilterRemovedCriticalData is true", () => {
    const result = shouldAbstain({
      confidenceScore: 0.8,
      keySourceMissing: false,
      dataQualityScore: 0.8,
      contradictionScore: 0.1,
      securityFilterRemovedCriticalData: true,
    });
    expect(result.shouldAbstain).toBe(true);
    expect(result.reasons).toContain("security_filter_removed_critical_data");
  });

  it("Abstain when sparseHistory is true and confidenceScore below 0.6", () => {
    const result = shouldAbstain({
      confidenceScore: 0.55,
      keySourceMissing: false,
      dataQualityScore: 0.8,
      contradictionScore: 0.1,
      securityFilterRemovedCriticalData: false,
      sparseHistory: true,
    });
    expect(result.shouldAbstain).toBe(true);
    expect(result.reasons).toContain("sparse_history_low_confidence");
  });

  it("Abstain when baselineReliability below 0.4", () => {
    const result = shouldAbstain({
      confidenceScore: 0.8,
      keySourceMissing: false,
      dataQualityScore: 0.8,
      contradictionScore: 0.1,
      securityFilterRemovedCriticalData: false,
      baselineReliability: 0.2,
    });
    expect(result.shouldAbstain).toBe(true);
    expect(result.reasons).toContain("baseline_unreliable");
  });

  it("Abstain when hasNonFiniteInputs is true", () => {
    const result = shouldAbstain({
      confidenceScore: 0.8,
      keySourceMissing: false,
      dataQualityScore: 0.8,
      contradictionScore: 0.1,
      securityFilterRemovedCriticalData: false,
      hasNonFiniteInputs: true,
    });
    expect(result.shouldAbstain).toBe(true);
    expect(result.reasons).toContain("non_finite_inputs");
  });
});
