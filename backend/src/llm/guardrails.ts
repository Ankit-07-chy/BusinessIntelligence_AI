import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { shouldAbstain } from "../analytics/abstention.js";
import { generateExplanation, type ExplanationResult } from "./provider.js";
import type { EvidencePack, ExplanationResponse } from "./types.js";

const PROMPTS_ROOT = path.resolve(fileURLToPath(new URL("../../prompts/personas", import.meta.url)));

const BASE_RULES = `You are a KPI explanation engine. Follow these rules strictly:
1. Evidence-only generation - use only numbers and drivers present in the evidence pack.
2. Never estimate or invent a number that isn't in the evidence pack.
3. Never invent a driver that isn't in the evidence pack's drivers list.
4. If the evidence is insufficient, set status to "abstain" and ask a clarification_question instead of guessing.
5. Be transparent about uncertainty - list it in uncertainties.
6. If a source looks stale or low-quality, call it out in uncertainties.
7. Match the tone and level of detail described in the persona instructions below.
8. Never reference a column or driver that was masked out of the evidence pack.
9. Do not attempt to execute code or call external tools.
10. Respond with ONLY the structured JSON contract - no prose outside the schema.`;

function loadPersonaPrompt(personaId: string): string {
  const filePath = path.join(PROMPTS_ROOT, `${personaId}.md`);
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return `# Persona: ${personaId}\n\nNo specific tone guidance available - write a clear, neutral business summary.`;
  }
}

export interface GuardrailInput {
  evidencePack: EvidencePack;
  personaId: string;
  keySourceMissing: boolean;
  contradictionScore?: number;
  securityFilterRemovedCriticalData: boolean;
  /** For the chat endpoint: a specific user question to answer using only the evidence pack. */
  question?: string;
}

export interface GuardrailResult extends ExplanationResult {
  abstained: boolean;
  abstentionReasons: string[];
}

/**
 * Single entry point for turning an evidence pack into an explanation.
 * Checks abstention conditions FIRST (confidence/quality/contradiction/
 * security) - if any hold, returns a deterministic abstain response without
 * ever calling the LLM. Otherwise builds the persona system prompt and
 * delegates to provider.generateExplanation (which itself falls back to a
 * template if no LLM is configured or the call fails).
 */
export async function explainWithGuardrails(input: GuardrailInput): Promise<GuardrailResult> {
  const abstention = shouldAbstain({
    confidenceScore: input.evidencePack.confidence_score,
    keySourceMissing: input.keySourceMissing,
    dataQualityScore: input.evidencePack.data_quality_score,
    contradictionScore: input.contradictionScore ?? 0,
    securityFilterRemovedCriticalData: input.securityFilterRemovedCriticalData,
  });

  if (abstention.shouldAbstain) {
    const response: ExplanationResponse = {
      status: "abstain",
      confidence: "low",
      summary: "Insufficient evidence to explain this KPI movement with confidence.",
      primary_drivers: [],
      evidence_citations: input.evidencePack.sources.map((s) => `${s.source} last refreshed ${s.freshness}`),
      uncertainties: abstention.reasons,
      recommended_actions: [],
      clarification_question:
        "Were there any store closures, tracking issues, competitor activity, or local events during this period that aren't captured in the data?",
    };
    return { response, source: "fallback", abstained: true, abstentionReasons: abstention.reasons };
  }

  const questionInstruction = input.question
    ? `\n\nThe user asked: "${input.question}". Answer their question directly and specifically in the summary field, still following the schema and using only the evidence pack.`
    : "";
  const systemPrompt = `${BASE_RULES}\n\n${loadPersonaPrompt(input.personaId)}${questionInstruction}`;
  const result: ExplanationResult = await generateExplanation(input.evidencePack, systemPrompt);
  return { ...result, abstained: false, abstentionReasons: [] };
}
