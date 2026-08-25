import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../lib/api";
import { KpiCard } from "../components/kpi/KpiCard";
import { useTheme } from "../hooks/useTheme";
import type { KpiDefinition, KpiTimeseriesPoint } from "../lib/types";

const CHART_THEMES: Record<string, { stroke: string; stopStart: string; stopEnd: string }> = {
  net_revenue: { stroke: "#10b981", stopStart: "#10b981", stopEnd: "#14b8a6" },
  gross_margin: { stroke: "#06b6d4", stopStart: "#06b6d4", stopEnd: "#3b82f6" },
  conversion_rate: { stroke: "#6366f1", stopStart: "#6366f1", stopEnd: "#a855f7" },
  otif: { stroke: "#d946ef", stopStart: "#d946ef", stopEnd: "#ec4899" },
  cac: { stroke: "#f59e0b", stopStart: "#f59e0b", stopEnd: "#f97316" },
};

function formatValueForChart(kpiId: string, val: number): string {
  if (kpiId === "net_revenue" || kpiId === "gross_margin") {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}k`;
    return `$${val.toLocaleString()}`;
  }
  if (kpiId === "cac") {
    return `$${val.toFixed(2)}`;
  }
  if (kpiId === "conversion_rate" || kpiId === "otif") {
    return `${(val * 100).toFixed(1)}%`;
  }
  return val.toLocaleString();
}

function getKpiStats(series: KpiTimeseriesPoint[] | undefined) {
  if (!series || series.length < 2) {
    return { latestValue: null, changePercent: null };
  }
  const latest = series[series.length - 1].value;
  const previous = series[series.length - 2].value;
  const change = previous !== 0 ? (latest - previous) / previous : 0;
  return { latestValue: latest, changePercent: change };
}

export function DashboardPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [selectedKpiId, setSelectedKpiId] = useState<string>("net_revenue");

  // Fetch KPI Definitions
  const kpisQuery = useQuery({
    queryKey: ["kpis"],
    queryFn: async () => (await api.get<KpiDefinition[]>("/kpis")).data,
  });

  // Fetch Timeseries for all KPIs to display current values and trend percents on cards
  const netRevenueTimeseries = useQuery({
    queryKey: ["kpi-timeseries", "net_revenue"],
    queryFn: async () => (await api.get<KpiTimeseriesPoint[]>("/kpis/net_revenue/timeseries")).data,
  });
  const grossMarginTimeseries = useQuery({
    queryKey: ["kpi-timeseries", "gross_margin"],
    queryFn: async () => (await api.get<KpiTimeseriesPoint[]>("/kpis/gross_margin/timeseries")).data,
  });
  const conversionRateTimeseries = useQuery({
    queryKey: ["kpi-timeseries", "conversion_rate"],
    queryFn: async () => (await api.get<KpiTimeseriesPoint[]>("/kpis/conversion_rate/timeseries")).data,
  });
  const otifTimeseries = useQuery({
    queryKey: ["kpi-timeseries", "otif"],
    queryFn: async () => (await api.get<KpiTimeseriesPoint[]>("/kpis/otif/timeseries")).data,
  });
  const cacTimeseries = useQuery({
    queryKey: ["kpi-timeseries", "cac"],
    queryFn: async () => (await api.get<KpiTimeseriesPoint[]>("/kpis/cac/timeseries")).data,
  });

  const timeseriesMap: Record<string, { data: KpiTimeseriesPoint[] | undefined; isLoading: boolean }> = {
    net_revenue: { data: netRevenueTimeseries.data, isLoading: netRevenueTimeseries.isLoading },
    gross_margin: { data: grossMarginTimeseries.data, isLoading: grossMarginTimeseries.isLoading },
    conversion_rate: { data: conversionRateTimeseries.data, isLoading: conversionRateTimeseries.isLoading },
    otif: { data: otifTimeseries.data, isLoading: otifTimeseries.isLoading },
    cac: { data: cacTimeseries.data, isLoading: cacTimeseries.isLoading },
  };

  const activeQuery = timeseriesMap[selectedKpiId] || timeseriesMap.net_revenue;
  const activeTheme = CHART_THEMES[selectedKpiId] || CHART_THEMES.net_revenue;
  const selectedKpiName = kpisQuery.data?.find((k) => k.kpiId === selectedKpiId)?.name || "KPI";

  return (
    <div className="space-y-8">
      {/* KPI Cards Section */}
      <section>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Metrics Overview</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Select a card to view detailed historical trends.</p>
          </div>
        </div>
        
        {kpisQuery.isLoading && (
          <div className="mt-6 flex items-center justify-center h-32 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-500 animate-pulse">Loading KPI definitions…</p>
          </div>
        )}
        
        {kpisQuery.isError && (
          <div className="mt-6 p-4 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/50">
            <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">Failed to load KPIs. Please check backend connection.</p>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {kpisQuery.data?.map((kpi) => {
            const ts = timeseriesMap[kpi.kpiId];
            const { latestValue, changePercent } = getKpiStats(ts?.data);
            return (
              <KpiCard
                key={kpi.kpiId}
                kpi={kpi}
                latestValue={latestValue}
                changePercent={changePercent}
                isActive={selectedKpiId === kpi.kpiId}
                onClick={() => setSelectedKpiId(kpi.kpiId)}
              />
            );
          })}
        </div>
      </section>

      {/* Selected KPI Chart Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Trend Analysis</span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{selectedKpiName} History</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: activeTheme.stroke }} />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Actuals</span>
          </div>
        </div>

        <div className="h-80 w-full">
          {activeQuery.isLoading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-slate-500 animate-pulse">Loading timeseries data…</p>
            </div>
          ) : activeQuery.data && activeQuery.data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeQuery.data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={activeTheme.stopStart} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={activeTheme.stopEnd} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#1e293b" : "#f1f5f9"} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#64748b" }}
                  dy={10}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => formatValueForChart(selectedKpiId, val)}
                  tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#64748b" }}
                  dx={-10}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? "#0f172a" : "#ffffff",
                    border: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}`,
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                  }}
                  labelStyle={{ fontSize: "11px", fontWeight: "bold", color: isDark ? "#94a3b8" : "#64748b" }}
                  itemStyle={{ fontSize: "13px", fontWeight: "bold", color: isDark ? "#f1f5f9" : "#0f172a" }}
                  formatter={(val: number) => [formatValueForChart(selectedKpiId, val), "Value"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={activeTheme.stroke}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#chartGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/20 p-4">
              <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">No timeseries data found for this metric.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Please ensure the synthetic generator has successfully loaded rows.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
