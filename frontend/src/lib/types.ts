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
