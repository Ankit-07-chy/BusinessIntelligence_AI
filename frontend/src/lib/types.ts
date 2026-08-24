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
