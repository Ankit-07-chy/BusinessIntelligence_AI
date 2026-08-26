import type { DriverContributionInput } from "./types.js";

/**
 * Driver contribution per docs/architecture.md §2.5:
 * estimated_impact_of_driver / total_kpi_change.
 */
export function computeDriverContribution(input: DriverContributionInput): number {
  const EPSILON = 1e-6;
  if (!Number.isFinite(input.estimatedImpact)) {
    return 0;
  }
  if (Math.abs(input.totalKpiChange) < EPSILON) {
    return 0;
  }
  return input.estimatedImpact / input.totalKpiChange;
}

export function computeDriverContributions(
  drivers: Array<{ driverId: string; estimatedImpact: number }>,
  totalKpiChange: number,
): Array<{ driverId: string; estimatedImpact: number; contribution: number }> {
  const EPSILON = 1e-6;

  // Clean drivers list to ensure only finite numeric impact parameters exist
  let validDrivers = drivers.filter(
    (d) => Number.isFinite(d.estimatedImpact) && d.driverId !== "unexplained_residual"
  );

  const explainedImpact = validDrivers.reduce((sum, d) => sum + d.estimatedImpact, 0);
  const residual = totalKpiChange - explainedImpact;

  if (Math.abs(residual) > EPSILON) {
    validDrivers = [
      ...validDrivers,
      {
        driverId: "unexplained_residual",
        estimatedImpact: residual,
      },
    ];
  }

  // If total change is near zero but drivers offset each other (e.g. -200 and +200)
  if (Math.abs(totalKpiChange) < EPSILON) {
    const totalAbsoluteImpact = validDrivers.reduce(
      (sum, d) => sum + Math.abs(d.estimatedImpact),
      0
    );

    return validDrivers.map((driver) => {
      const contribution =
        totalAbsoluteImpact < EPSILON
          ? 0
          : driver.estimatedImpact / totalAbsoluteImpact;
      return {
        ...driver,
        contribution,
      };
    });
  }

  return validDrivers.map((driver) => ({
    ...driver,
    contribution: driver.estimatedImpact / totalKpiChange,
  }));
}

export interface ContributionSummary {
  totalKpiChange: number;
  explainedImpact: number;
  residualImpact: number;
  isOffsetting: boolean;
  drivers: Array<{
    driverId: string;
    estimatedImpact: number;
    contribution: number;
  }>;
}

export function computeContributionSummary(
  drivers: Array<{ driverId: string; estimatedImpact: number }>,
  totalKpiChange: number,
): ContributionSummary {
  const EPSILON = 1e-6;

  const result = computeDriverContributions(drivers, totalKpiChange);

  const validDrivers = drivers.filter(
    (driver) =>
      Number.isFinite(driver.estimatedImpact) &&
      driver.driverId !== "unexplained_residual"
  );

  const explainedImpact = validDrivers.reduce(
    (sum, driver) => sum + driver.estimatedImpact,
    0
  );

  const residualImpact = totalKpiChange - explainedImpact;

  return {
    totalKpiChange,
    explainedImpact,
    residualImpact,
    isOffsetting:
      Math.abs(totalKpiChange) < EPSILON &&
      validDrivers.reduce((acc, d) => acc + Math.abs(d.estimatedImpact), 0) > EPSILON,
    drivers: result,
  };
}
