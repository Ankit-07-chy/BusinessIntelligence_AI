export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  persona: string;
  allowedRegions: string[];
}

export interface KpiDefinition {
  kpiId: string;
  name: string;
  owner: string;
  businessDefinition: string;
  formula: string;
  grain: string;
  refreshCadence: string;
  version: string;
}

export interface KpiTimeseriesPoint {
  date: string;
  value: number;
}

export type ConfidenceLabel = "high" | "medium" | "low";

export interface AnomalySummary {
  anomalyId: string;
  kpiId: string;
  kpiName: string;
  period: string;
  actualValue: number;
  forecastValue: number;
  delta: number;
  zScore: number;
  materialityScore: number;
  dataQualityScore: number;
  confidenceScore: number;
  confidenceLabel: ConfidenceLabel;
  driverCount: number;
  createdAt: string;
}

export interface DriverContribution {
  driverId: string;
  estimatedImpact: number;
  confidenceScore: number;
  confidenceLabel: ConfidenceLabel;
  contribution: number;
  rank: number;
  driverScore: number;
}

export interface AnomalyDetail extends AnomalySummary {
  abstain: boolean;
  abstentionReasons: string[];
  driverContributions: DriverContribution[];
}

export type PersonaId = "cfo" | "supply_chain_manager" | "marketing_manager" | "analyst";

export const PERSONA_IDS: PersonaId[] = ["cfo", "supply_chain_manager", "marketing_manager", "analyst"];

export interface EvidenceSource {
  source: string;
  freshness: string;
  quality: number;
}

export interface EvidenceDriverItem {
  driver: string;
  estimated_impact: number;
  method: string;
  confidence: number;
}

export interface EvidenceRecommendedActionItem {
  action: string;
  owner: string;
  lever: string;
  expected_impact: number;
  confidence: number;
  monitoring_plan: string;
}

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
  drivers: EvidenceDriverItem[];
  unexplained_residual: number;
  recommended_actions: EvidenceRecommendedActionItem[];
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

export interface StructuredExplanation {
  status: "success" | "abstain";
  confidence: ConfidenceLabel;
  summary: string;
  primary_drivers: ExplanationPrimaryDriver[];
  evidence_citations: string[];
  uncertainties: string[];
  recommended_actions: ExplanationRecommendedAction[];
  clarification_question: string | null;
}

export interface Explanation {
  explanationId: string;
  anomalyId: string;
  personaId: string;
  narrativeText: string;
  evidenceCitations: string[];
  structuredResponse: StructuredExplanation;
  source: "llm" | "fallback" | "cached";
  createdAt: string;
}

export interface ActionRecommendation {
  actionId: string;
  anomalyId: string;
  kpiId: string;
  kpiName: string;
  period: string;
  driverId: string | null;
  lever: string | null;
  actionName: string;
  ownerPersona: string;
  expectedImpact: number;
  confidence: number | null;
  monitoringPlan: string;
  status: string;
  createdAt: string;
}

export interface FeedbackRequest {
  insightId: string;
  helpful: boolean;
  rootCauseCorrect: "yes" | "no" | "partial";
  acceptedAction: boolean;
  correctedDriver?: string;
  comments?: string;
}

export interface FeedbackSummary {
  total: number;
  helpfulRate: number;
  acceptedActionRate: number;
  rootCauseCorrectBreakdown: Record<string, number>;
  topCorrectedDrivers: Array<{ driverId: string; count: number }>;
}

export interface ChatResponse {
  anomalyId: string;
  message: string;
  response: StructuredExplanation;
  source: "llm" | "fallback";
  abstained: boolean;
  abstentionReasons: string[];
}
