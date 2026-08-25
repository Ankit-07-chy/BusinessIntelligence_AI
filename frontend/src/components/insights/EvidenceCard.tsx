import type { AnomalyDetail } from "../../lib/types";

function formatNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-bold text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}

export function EvidenceCard({ anomaly }: { anomaly: AnomalyDetail }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Evidence</h3>
      <dl className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4 border-t border-slate-50 dark:border-slate-800/50 pt-3">
        <Stat label="Period" value={anomaly.period} />
        <Stat label="Actual" value={formatNumber(anomaly.actualValue)} />
        <Stat label="Forecast" value={formatNumber(anomaly.forecastValue)} />
        <Stat label="Delta" value={formatNumber(anomaly.delta)} />
        <Stat label="Z-score" value={anomaly.zScore.toFixed(2)} />
        <Stat label="Materiality" value={`${Math.round(anomaly.materialityScore * 100)}%`} />
        <Stat label="Data quality" value={`${Math.round(anomaly.dataQualityScore * 100)}%`} />
      </dl>
      {anomaly.abstain && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
          The engine abstains from a causal narrative here:{" "}
          {anomaly.abstentionReasons.join(", ").replace(/_/g, " ")}.
        </p>
      )}
    </div>
  );
}
