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

  it("Score is clamped between 0 and 1", () => {
    const score = computeConfidenceScore({
      evidenceStrength: 1.5,
      dataQualityScore: 2.0,
      modelFitScore: 1,
      causalOrBusinessConfirmation: 1,
      freshnessScore: 1,
    });
    expect(score).toBe(1);

    const scoreMin = computeConfidenceScore({
      evidenceStrength: -0.5,
      dataQualityScore: -0.2,
      modelFitScore: 0,
      causalOrBusinessConfirmation: 0,
      freshnessScore: 0,
    });
    expect(scoreMin).toBe(0);
  });

  it("keySourceMissing caps score at 0.3", () => {
    const score = computeConfidenceScore({
      evidenceStrength: 1,
      dataQualityScore: 1,
      modelFitScore: 1,
      causalOrBusinessConfirmation: 1,
      freshnessScore: 1,
      keySourceMissing: true,
    });
    expect(score).toBeLessThanOrEqual(0.3);
  });

  it("sparseHistory caps score at 0.55", () => {
    const score = computeConfidenceScore({
      evidenceStrength: 1,
      dataQualityScore: 1,
      modelFitScore: 1,
      causalOrBusinessConfirmation: 1,
      freshnessScore: 1,
      sparseHistory: true,
    });
    expect(score).toBeLessThanOrEqual(0.55);
  });

  it("contradictionScore above 0.6 caps score at 0.4", () => {
    const score = computeConfidenceScore({
      evidenceStrength: 1,
      dataQualityScore: 1,
      modelFitScore: 1,
      causalOrBusinessConfirmation: 1,
      freshnessScore: 1,
      contradictionScore: 0.7,
    });
    expect(score).toBeLessThanOrEqual(0.4);
  });

  it("baselineReliability below 0.4 caps score at 0.5", () => {
    const score = computeConfidenceScore({
      evidenceStrength: 1,
      dataQualityScore: 1,
      modelFitScore: 1,
      causalOrBusinessConfirmation: 1,
      freshnessScore: 1,
      baselineReliability: 0.2,
    });
    expect(score).toBeLessThanOrEqual(0.5);
  });

  it("dataQualityScore below 0.3 caps score at 0.35", () => {
    const score = computeConfidenceScore({
      evidenceStrength: 1,
      dataQualityScore: 0.1,
      modelFitScore: 1,
      causalOrBusinessConfirmation: 1,
      freshnessScore: 1,
    });
    expect(score).toBeLessThanOrEqual(0.35);
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
