export interface EvidenceSource {
  source: string;
  freshness: string;
  quality: number;
}

export interface EvidenceDriver {
  driver: string;
  estimated_impact: number;
  method: string;
  confidence: number;
}

export interface EvidenceRecommendedAction {
  action: string;
  owner: string;
  lever: string;
  expected_impact: number;
  confidence: number;
  monitoring_plan: string;
}

/**
 * Evidence Pack — the only thing the LLM is allowed to reason from.
 * Shape matches docs/llm_guardrails.md's Evidence Pack schema.
 */
export interface EvidencePack {
  kpi_id: string;
  period: string;
  persona: string;
  actual_value: number;
  forecast_value: number;
  delta: number;
  delta_percent: number;
  confidence_score: number;
  data_quality_score: number;
  sources: EvidenceSource[];
  drivers: EvidenceDriver[];
  unexplained_residual: number;
  recommended_actions: EvidenceRecommendedAction[];
}

export interface ExplanationPrimaryDriver {
  driver: string;
  impact: number;
  confidence: number;
}

export interface ExplanationRecommendedAction {
  action: string;
  owner: string;
  expected_impact: number;
}

export type ExplanationStatus = "success" | "abstain";
export type ExplanationConfidenceLabel = "high" | "medium" | "low";

/**
 * The structured response contract every LLM call (or fallback) must produce,
 * per docs/llm_guardrails.md's Structured Output Contract.
 */
export interface ExplanationResponse {
  status: ExplanationStatus;
  confidence: ExplanationConfidenceLabel;
  summary: string;
  primary_drivers: ExplanationPrimaryDriver[];
  evidence_citations: string[];
  uncertainties: string[];
  recommended_actions: ExplanationRecommendedAction[];
  clarification_question: string | null;
}
