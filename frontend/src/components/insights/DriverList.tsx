import { formatDriverLabel } from "../../lib/driverLabels";
import type { DriverContribution } from "../../lib/types";
import { ConfidenceBadge } from "./ConfidenceBadge";

function formatCurrency(value: number): string {
  return value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function DriverList({ drivers }: { drivers: DriverContribution[] }) {
  if (drivers.length === 0) {
    return <p className="text-sm text-slate-500">No drivers were identified for this anomaly yet.</p>;
  }

  return (
    <ol className="space-y-3">
      {drivers.map((driver) => (
        <li key={driver.driverId} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">#{driver.rank}</span>
              <p className="text-sm font-semibold text-slate-900">{formatDriverLabel(driver.driverId)}</p>
            </div>
            <ConfidenceBadge label={driver.confidenceLabel} score={driver.confidenceScore} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <span>
              Impact: <span className="font-medium text-slate-900">{formatCurrency(driver.estimatedImpact)}</span>
            </span>
            <span>
              Contribution: <span className="font-medium text-slate-900">{Math.round(driver.contribution * 100)}%</span>
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
