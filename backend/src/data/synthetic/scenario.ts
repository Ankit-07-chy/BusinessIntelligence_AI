export const SEED = 42;
export const TOTAL_DAYS = 180;
export const REGIONS = ["EU", "US"] as const;

/** Day index (0-based) the multi-factor incident begins on — "Day 105" for a 6-month scale. */
export const INCIDENT_DAY_INDEX = 104;
export const INCIDENT_DURATION_DAYS = 5;
export const INCIDENT_REGION: (typeof REGIONS)[number] = "EU";

export const SPARSE_HISTORY_DAYS = 18;
export const DELAYED_MARKETING_DAYS = 12;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

/** Dataset always ends "yesterday" relative to generation time, so demos look current. */
export function getDatasetStartDate(referenceDate: Date = new Date()): Date {
  const end = new Date(referenceDate);
  end.setUTCHours(0, 0, 0, 0);
  return addDays(end, -TOTAL_DAYS + 1);
}

export function getDateRange(startDate: Date, totalDays: number): Date[] {
  return Array.from({ length: totalDays }, (_, i) => addDays(startDate, i));
}

export function describeScenarioWindow(startDate: Date) {
  const incidentStart = addDays(startDate, INCIDENT_DAY_INDEX);
  const incidentEnd = addDays(incidentStart, INCIDENT_DURATION_DAYS - 1);
  const sparseHistoryStart = addDays(startDate, TOTAL_DAYS - SPARSE_HISTORY_DAYS);
  const delayedSince = addDays(startDate, TOTAL_DAYS - DELAYED_MARKETING_DAYS);
  return {
    incidentStart,
    incidentEnd,
    sparseHistoryStart,
    delayedSince,
    toIso: toIsoDate,
  };
}

export { toIsoDate, addDays };
