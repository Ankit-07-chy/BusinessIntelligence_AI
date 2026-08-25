import type { DriverContributionInput } from "./types.js";

/**
 * Driver contribution per docs/architecture.md §2.5:
 * estimated_impact_of_driver / total_kpi_change.
 */
export function computeDriverContribution(input: DriverContributionInput): number {
  if (input.totalKpiChange === 0) return 0;
  return input.estimatedImpact / input.totalKpiChange;
}

export function computeDriverContributions(
  drivers: Array<{ driverId: string; estimatedImpact: number }>,
  totalKpiChange: number,
): Array<{ driverId: string; estimatedImpact: number; contribution: number }> {
  return drivers.map((driver) => ({
    ...driver,
    contribution: computeDriverContribution({
      estimatedImpact: driver.estimatedImpact,
      totalKpiChange,
    }),
  }));
}
