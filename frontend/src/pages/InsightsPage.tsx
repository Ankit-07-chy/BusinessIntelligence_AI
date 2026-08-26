import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";
import { ConfidenceBadge } from "../components/insights/ConfidenceBadge";
import type { AnomalySummary, ActionRecommendation } from "../lib/types";

type SortBy = "materiality" | "confidence";

function getDaysAgo(dateStr: string, days: number): string {
  if (!dateStr) return "";
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function formatPeriodText(period: string, cadence: "daily" | "weekly" | "monthly"): string {
  if (!period) return "";
  if (cadence === "daily") {
    return period;
  }
  
  const d = new Date(`${period}T00:00:00.000Z`);
  if (isNaN(d.getTime())) return period;

  if (cadence === "weekly") {
    const curEnd = d;
    const curStart = new Date(curEnd.getTime() - 6 * 24 * 60 * 60 * 1000);
    const prevEnd = new Date(curStart.getTime() - 1 * 24 * 60 * 60 * 1000);
    const prevStart = new Date(prevEnd.getTime() - 6 * 24 * 60 * 60 * 1000);
    
    const formatDate = (date: Date) => date.toISOString().slice(5, 10);
    return `${formatDate(curStart)} to ${formatDate(curEnd)} vs ${formatDate(prevStart)} to ${formatDate(prevEnd)}`;
  }
  
  if (cadence === "monthly") {
    const curMonthName = d.toLocaleString("en-US", { month: "long" });
    const curYear = d.getUTCFullYear();
    const prevDate = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const prevMonthName = prevDate.toLocaleString("en-US", { month: "long" });
    const prevYear = prevDate.getUTCFullYear();
    
    return `${curMonthName} ${curYear} vs ${prevMonthName} ${prevYear}`;
  }
  
  return period;
}

function InlineActionsList({ anomalyId }: { anomalyId: string }) {
  const actionsQuery = useQuery({
    queryKey: ["anomaly-actions", anomalyId],
    queryFn: async () => (await api.get<ActionRecommendation[]>(`/actions`, { params: { anomalyId } })).data,
  });

  if (actionsQuery.isLoading) return <p className="text-xs text-slate-400 mt-2">Loading suggestions...</p>;
  if (!actionsQuery.data || actionsQuery.data.length === 0) return null;

  return (
    <div className="mt-4 border-t border-slate-100 dark:border-slate-800/60 pt-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Suggestions Given</h4>
      <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400">
        {actionsQuery.data.map((act) => (
          <li key={act.actionId}>{act.actionName}</li>
        ))}
      </ul>
    </div>
  );
}

export function InsightsPage() {
  const [sortBy, setSortBy] = useState<SortBy>("materiality");
  const [selectedCadence, setSelectedCadence] = useState<"daily" | "weekly" | "monthly">("daily");
  const [filterDate, setFilterDate] = useState<string>("");

  const anomaliesQuery = useQuery({
    queryKey: ["anomalies", sortBy],
    queryFn: async () => (await api.get<AnomalySummary[]>("/anomalies", { params: { sortBy } })).data,
  });

  // Determine today/latestDate from dataset
  const periods = anomaliesQuery.data?.map(a => a.period) || [];
  const latestDate = periods.length > 0 ? periods.reduce((max, p) => p > max ? p : max, periods[0]) : "";

  const filteredData = anomaliesQuery.data?.filter((anomaly) => {
    return anomaly.period === (filterDate || latestDate);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Telemetry Insights</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Review statistical anomalies and driver attributions.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Query Past Date Selector */}
          <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">Query Past Date:</span>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="text-xs font-semibold focus:outline-none dark:bg-slate-900 dark:text-white"
            >
              <option value="">-- Select Date --</option>
              {Array.from(new Set(anomaliesQuery.data?.map((a) => a.period) || []))
                .sort()
                .reverse()
                .map((date) => (
                  <option key={date} value={date}>
                    {date}
                  </option>
                ))}
            </select>
            {filterDate && (
              <button
                onClick={() => setFilterDate("")}
                className="text-xs text-rose-500 font-bold hover:text-rose-700 px-1"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant={sortBy === "materiality" ? "primary" : "secondary"}
              onClick={() => setSortBy("materiality")}
            >
              Sort by business impact
            </Button>
            <Button variant={sortBy === "confidence" ? "primary" : "secondary"} onClick={() => setSortBy("confidence")}>
              Sort by confidence
            </Button>
          </div>
        </div>
      </div>

      {/* Cadence Tabs (only visible when not filtering by specific date) */}
      {!filterDate && (
        <div className="flex border-b border-slate-100 dark:border-slate-800 gap-1">
          <button
            onClick={() => setSelectedCadence("daily")}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${
              selectedCadence === "daily"
                ? "border-slate-900 text-slate-900 dark:border-white dark:text-white"
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
          >
            Daily Changes (Today)
          </button>
          <button
            onClick={() => setSelectedCadence("weekly")}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${
              selectedCadence === "weekly"
                ? "border-slate-900 text-slate-900 dark:border-white dark:text-white"
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
          >
            Weekly Changes (Current Week)
          </button>
          <button
            onClick={() => setSelectedCadence("monthly")}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${
              selectedCadence === "monthly"
                ? "border-slate-900 text-slate-900 dark:border-white dark:text-white"
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
          >
            Monthly Changes (Current Month)
          </button>
        </div>
      )}

      {filterDate && (
        <div className="bg-slate-50 dark:bg-slate-900/10 p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500">
          Showing historical anomalies and recommendations specifically for <span className="text-slate-950 dark:text-white font-bold">{filterDate}</span>
        </div>
      )}

      {anomaliesQuery.isLoading && <p className="text-sm text-slate-500 animate-pulse">Loading anomalies…</p>}
      {anomaliesQuery.isError && <p className="text-sm text-rose-600 font-semibold">Failed to load anomalies. Check connection.</p>}
      
      {anomaliesQuery.data && filteredData?.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/10">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">
            {filterDate ? `No anomalies detected on ${filterDate}.` : `No ${selectedCadence} insights detected for the current period.`}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filteredData?.map((anomaly) => {
          const changeVal = filterDate
            ? anomaly.periodOverPeriodChange
            : selectedCadence === "daily"
              ? anomaly.periodOverPeriodChange
              : selectedCadence === "weekly"
                ? anomaly.weeklyChangePercent
                : anomaly.monthlyChangePercent;
          const pct = Math.round(changeVal * 100);
          const direction = pct < 0 ? "decreased" : "increased";
          const absPct = Math.abs(pct);
          const cadenceLabel = anomaly.refreshCadence === "hourly" || anomaly.refreshCadence === "daily"
            ? "Daily"
            : anomaly.refreshCadence === "weekly"
              ? "Weekly"
              : "Monthly";
          const isNegative = pct < 0;

          return (
            <Link
              key={anomaly.anomalyId}
              to={`/insights/${anomaly.anomalyId}`}
              className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${isNegative ? "bg-rose-500" : "bg-emerald-500"}`} />
                  <div>
                    <p className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {anomaly.kpiName} {direction} by {absPct}%
                      <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                        {cadenceLabel}
                      </span>
                    </p>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1">
                      Period: {formatPeriodText(anomaly.period, filterDate ? "daily" : selectedCadence)} &bull; Business Impact: {Math.round(anomaly.materialityScore * 100)}%
                    </p>
                  </div>
                </div>
                <ConfidenceBadge label={anomaly.confidenceLabel} score={anomaly.confidenceScore} />
              </div>

              {/* Show suggestions inline if looking at specific date search */}
              {filterDate && <InlineActionsList anomalyId={anomaly.anomalyId} />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
