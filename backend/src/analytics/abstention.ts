import type { AbstentionInputs, AbstentionResult } from "./types.js";

const DEFAULT_CONTRADICTION_THRESHOLD = 0.6;

/**
 * Abstention logic per docs/architecture.md §2.8. The engine abstains from
 * generating a causal narrative if any single condition holds — each is
 * reported so the caller (LLM guardrails / clarification question) knows why.
 */
export function shouldAbstain(inputs: AbstentionInputs): AbstentionResult {
  const contradictionThreshold = inputs.contradictionThreshold ?? DEFAULT_CONTRADICTION_THRESHOLD;
  const reasons: string[] = [];

  if (inputs.confidenceScore < 0.5) reasons.push("confidence_below_threshold");
  if (inputs.keySourceMissing) reasons.push("key_source_missing");
  if (inputs.dataQualityScore < 0.5) reasons.push("data_quality_below_threshold");
  if (inputs.contradictionScore > contradictionThreshold) reasons.push("contradictory_evidence");
  if (inputs.securityFilterRemovedCriticalData) reasons.push("security_filter_removed_critical_data");

  return { shouldAbstain: reasons.length > 0, reasons };
}
