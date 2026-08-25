import { describe, expect, it } from "vitest";
import { classifyConfidence, computeConfidenceScore } from "../../src/analytics/confidence.js";

describe("computeConfidenceScore", () => {
  it("weights the five inputs per §2.6", () => {
    const score = computeConfidenceScore({
      evidenceStrength: 1,
      dataQualityScore: 1,
      modelFitScore: 1,
      causalOrBusinessConfirmation: 1,
      freshnessScore: 1,
    });
    expect(score).toBe(1);
  });
});

describe("classifyConfidence", () => {
  it("labels high/medium/low at the documented boundaries", () => {
    expect(classifyConfidence(0.75)).toBe("high");
    expect(classifyConfidence(0.74)).toBe("medium");
    expect(classifyConfidence(0.5)).toBe("medium");
    expect(classifyConfidence(0.49)).toBe("low");
  });
});
