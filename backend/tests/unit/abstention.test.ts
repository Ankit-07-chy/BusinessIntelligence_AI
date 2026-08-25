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
});
