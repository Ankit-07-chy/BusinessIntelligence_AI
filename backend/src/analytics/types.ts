export type KpiDirection = "increase_is_good" | "decrease_is_good" | "neutral";

export interface TimeseriesPoint {
  date: string;
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
  isReliable: boolean;
  reliabilityScore: number;
  warning?: string;
  fallbackMethod?: string;
}

export interface AnomalyThresholds {
  absoluteThreshold?: number;
  percentThreshold?: number;
  statisticalThreshold?: number;
  minimumQualityScore?: number;
  minimumHistoryPoints?: number;
  minimumBaselineReliability?: number;
}

export interface AnomalyDetectionInput {
  actualValue: number;
  expectedValue: number;
  historicalStdDev: number;
  dataQualityScore: number;
  direction?: KpiDirection;
  historyPoints?: number;
  baselineReliability?: number;
  thresholds?: AnomalyThresholds;
}

export interface AnomalyDetectionResult {
  residual: number;
  zScore: number;
  deviationPercentage: number;
  isAnomaly: boolean;
  isAdverse: boolean;
  isUsable: boolean;
  passesBusinessThreshold: boolean;
  passesStatisticalThreshold: boolean;
  passesDataQualityThreshold: boolean;
  passesBaselineReliabilityThreshold: boolean;
  warning?: string;
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
  keySourceMissing?: boolean;
  sparseHistory?: boolean;
  contradictionScore?: number;
  baselineReliability?: number;
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
  keySourceMissing?: boolean;
  dataQualityScore: number;
  contradictionScore?: number;
  contradictionThreshold?: number;
  securityFilterRemovedCriticalData?: boolean;
  sparseHistory?: boolean;
  baselineReliability?: number;
  hasNonFiniteInputs?: boolean;
}

export interface AbstentionResult {
  shouldAbstain: boolean;
  reasons: string[];
}
