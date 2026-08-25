import { z } from "zod";

export const explanationPrimaryDriverSchema = z.object({
  driver: z.string(),
  impact: z.number(),
  confidence: z.number().min(0).max(1),
});

export const explanationRecommendedActionSchema = z.object({
  action: z.string(),
  owner: z.string(),
  expected_impact: z.number(),
});

/**
 * Validates the structured LLM response contract (docs/llm_guardrails.md).
 * Used to reject anything a model call returns that doesn't match the
 * contract exactly — the LLM never reaches the client unvalidated.
 */
export const explanationResponseSchema = z.object({
  status: z.enum(["success", "abstain"]),
  confidence: z.enum(["high", "medium", "low"]),
  summary: z.string(),
  primary_drivers: z.array(explanationPrimaryDriverSchema),
  evidence_citations: z.array(z.string()),
  uncertainties: z.array(z.string()),
  recommended_actions: z.array(explanationRecommendedActionSchema),
  clarification_question: z.string().nullable(),
});

export type ExplanationResponseSchema = z.infer<typeof explanationResponseSchema>;

/** Plain JSON Schema mirror of the above, in the shape Gemini's responseSchema expects. */
export const EXPLANATION_RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["success", "abstain"] },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    summary: { type: "string" },
    primary_drivers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          driver: { type: "string" },
          impact: { type: "number" },
          confidence: { type: "number" },
        },
        required: ["driver", "impact", "confidence"],
      },
    },
    evidence_citations: { type: "array", items: { type: "string" } },
    uncertainties: { type: "array", items: { type: "string" } },
    recommended_actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          action: { type: "string" },
          owner: { type: "string" },
          expected_impact: { type: "number" },
        },
        required: ["action", "owner", "expected_impact"],
      },
    },
    clarification_question: { anyOf: [{ type: "string" }, { type: "null" }] },
  },
  required: [
    "status",
    "confidence",
    "summary",
    "primary_drivers",
    "evidence_citations",
    "uncertainties",
    "recommended_actions",
    "clarification_question",
  ],
} as const;
