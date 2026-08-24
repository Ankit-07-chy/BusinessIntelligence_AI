import { useQuery } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../lib/api";
import { KpiCard } from "../components/kpi/KpiCard";
import type { KpiDefinition, KpiTimeseriesPoint } from "../lib/types";

export function DashboardPage() {
  const kpisQuery = useQuery({
    queryKey: ["kpis"],
    queryFn: async () => (await api.get<KpiDefinition[]>("/kpis")).data,
  });

  const revenueQuery = useQuery({
    queryKey: ["kpi-timeseries", "net_revenue"],
    queryFn: async () => (await api.get<KpiTimeseriesPoint[]>("/kpis/net_revenue/timeseries")).data,
  });

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-base font-semibold text-slate-900">KPIs</h2>
        {kpisQuery.isLoading && <p className="mt-2 text-sm text-slate-500">Loading KPI definitions…</p>}
        {kpisQuery.isError && <p className="mt-2 text-sm text-red-600">Failed to load KPIs.</p>}
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kpisQuery.data?.map((kpi) => (
            <KpiCard key={kpi.kpiId} kpi={kpi} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">Net Revenue vs. Time</h2>
        <div className="mt-3 h-72 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          {revenueQuery.data && revenueQuery.data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueQuery.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#0f172a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500">
              No sales data loaded yet — run the synthetic data generator to populate `fact_sales`.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
