import { generateStructuredContent, LlmNotConfiguredError } from "./client.js";
import { EXPLANATION_RESPONSE_JSON_SCHEMA, explanationResponseSchema } from "./schemas.js";
import { generateFallbackExplanation } from "./templateFallback.js";
import type { EvidencePack, ExplanationResponse } from "./types.js";

export interface ExplanationResult {
  response: ExplanationResponse;
  source: "llm" | "fallback";
  fallbackReason?: string;
}

function buildUserPrompt(pack: EvidencePack): string {
  return [
    "Evidence pack (the ONLY source of truth — do not use any number or driver not present here):",
    JSON.stringify(pack, null, 2),
    "",
    "Produce the explanation as JSON matching the required schema exactly.",
  ].join("\n");
}

/**
 * Generates a persona-narrated explanation for an evidence pack. Tries the
 * configured Gemini model first; if no API key is set, the call fails, or
 * the response doesn't validate against the structured contract, falls back
 * to a deterministic template so the caller always gets a valid response.
 */
export async function generateExplanation(pack: EvidencePack, systemPrompt: string): Promise<ExplanationResult> {
  try {
    const raw = await generateStructuredContent({
      systemPrompt,
      userPrompt: buildUserPrompt(pack),
      jsonSchema: EXPLANATION_RESPONSE_JSON_SCHEMA,
    });
    const parsed = explanationResponseSchema.parse(raw);
    return { response: parsed, source: "llm" };
  } catch (error) {
    const reason = error instanceof LlmNotConfiguredError ? "not_configured" : "call_or_validation_failed";
    return { response: generateFallbackExplanation(pack), source: "fallback", fallbackReason: reason };
  }
}
