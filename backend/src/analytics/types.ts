export interface TimeseriesPoint {
  date: string; // ISO yyyy-mm-dd
  value: number;
}

export type BaselineMethod = "same_weekday_trend" | "category_fallback" | "insufficient_history_mean";

export interface BaselineResult {
  expectedValue: number;
  method: BaselineMethod;
  sameWeekdayAverage: number;
  trendAdjustment: number;
  seasonalityAdjustment: number;
  samplePoints: number;
}

export interface AnomalyThresholds {
  absoluteThreshold: number;
  statisticalThreshold: number;
  minimumQualityScore: number;
}

export interface AnomalyDetectionInput extends Partial<AnomalyThresholds> {
  actualValue: number;
  expectedValue: number;
  historicalStdDev: number;
  dataQualityScore: number;
}

export interface AnomalyDetectionResult {
  residual: number;
  zScore: number;
  isAnomaly: boolean;
}

export interface DataQualityInputs {
  completenessScore: number;
  freshnessScore: number;
  consistencyScore: number;
  validityScore: number;
}

export interface BusinessImpactInputs {
  normalizedAbsDollarImpact: number;
  marginImpact: number;
  strategicWeight: number;
}

export interface MaterialityInputs {
  statisticalScore: number;
  businessImpactScore: number;
  dataQualityScore: number;
}

export interface DriverContributionInput {
  estimatedImpact: number;
  totalKpiChange: number;
}

export interface ConfidenceInputs {
  evidenceStrength: number;
  dataQualityScore: number;
  modelFitScore: number;
  causalOrBusinessConfirmation: number;
  freshnessScore: number;
}

export type ConfidenceLabel = "high" | "medium" | "low";

export interface DriverRankingInput {
  driverId: string;
  estimatedImpactScore: number;
  confidenceScore: number;
  evidenceStrengthScore: number;
  actionabilityScore: number;
  businessRelevanceScore: number;
  timelinessScore: number;
  contradictionPenalty?: number;
  lowDataQualityPenalty?: number;
  staleEvidencePenalty?: number;
}

export interface RankedDriver extends DriverRankingInput {
  driverScore: number;
  rank: number;
}

export interface AbstentionInputs {
  confidenceScore: number;
  keySourceMissing: boolean;
  dataQualityScore: number;
  contradictionScore: number;
  contradictionThreshold?: number;
  securityFilterRemovedCriticalData: boolean;
}

export interface AbstentionResult {
  shouldAbstain: boolean;
  reasons: string[];
}
