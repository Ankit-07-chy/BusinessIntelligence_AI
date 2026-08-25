import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { formatDriverLabel } from "../../lib/driverLabels";
import type { EvidencePack } from "../../lib/types";

function qualityColor(quality: number): string {
  if (quality >= 0.85) return "text-emerald-600";
  if (quality >= 0.7) return "text-amber-600";
  return "text-rose-600";
}

export function LineagePanel({ anomalyId }: { anomalyId: string }) {
  const evidenceQuery = useQuery({
    queryKey: ["evidence", anomalyId],
    queryFn: async () => (await api.get<EvidencePack>(`/explanations/${anomalyId}/evidence`)).data,
  });

  if (evidenceQuery.isLoading) return <p className="text-sm text-slate-500">Loading evidence lineage…</p>;
  if (evidenceQuery.isError || !evidenceQuery.data) return <p className="text-sm text-red-600">Evidence unavailable.</p>;

  const pack = evidenceQuery.data;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Evidence lineage</h3>

      <div className="mt-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Sources</p>
        <ul className="mt-1 space-y-1 text-sm text-slate-700">
          {pack.sources.map((source) => (
            <li key={source.source} className="flex items-center justify-between">
              <span>{source.source}</span>
              <span className="text-xs text-slate-400">
                refreshed {source.freshness.slice(0, 10)} ·{" "}
                <span className={qualityColor(source.quality)}>{Math.round(source.quality * 100)}% quality</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {pack.drivers.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Attribution method</p>
          <ul className="mt-1 space-y-1 text-sm text-slate-700">
            {pack.drivers.map((driver) => (
              <li key={driver.driver}>
                {formatDriverLabel(driver.driver)} — <span className="text-slate-500">{driver.method}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {Math.abs(pack.unexplained_residual) > 0.01 && (
        <p className="mt-3 text-xs text-slate-400">
          Unexplained residual: {Math.round(pack.unexplained_residual).toLocaleString()}
        </p>
      )}
    </div>
  );
}
