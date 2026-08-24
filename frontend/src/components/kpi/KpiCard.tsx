import type { KpiDefinition } from "../../lib/types";

export function KpiCard({ kpi }: { kpi: KpiDefinition }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{kpi.owner}</p>
      <h3 className="mt-1 text-lg font-semibold text-slate-900">{kpi.name}</h3>
      <p className="mt-2 text-sm text-slate-600">{kpi.businessDefinition}</p>
      <p className="mt-3 text-xs text-slate-400">
        Grain: {kpi.grain} · Refresh: {kpi.refreshCadence}
      </p>
    </div>
  );
}
