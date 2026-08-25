import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";
import { ConfidenceBadge } from "../components/insights/ConfidenceBadge";
import type { AnomalySummary } from "../lib/types";

type SortBy = "materiality" | "confidence";

export function InsightsPage() {
  const [sortBy, setSortBy] = useState<SortBy>("materiality");

  const anomaliesQuery = useQuery({
    queryKey: ["anomalies", sortBy],
    queryFn: async () => (await api.get<AnomalySummary[]>("/anomalies", { params: { sortBy } })).data,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Telemetry Insights</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Review statistical anomalies and driver attributions.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={sortBy === "materiality" ? "primary" : "secondary"}
            onClick={() => setSortBy("materiality")}
          >
            Sort by materiality
          </Button>
          <Button variant={sortBy === "confidence" ? "primary" : "secondary"} onClick={() => setSortBy("confidence")}>
            Sort by confidence
          </Button>
        </div>
      </div>

      {anomaliesQuery.isLoading && <p className="text-sm text-slate-500 animate-pulse">Loading anomalies…</p>}
      {anomaliesQuery.isError && <p className="text-sm text-rose-600 font-semibold">Failed to load anomalies. Check connection.</p>}
      {anomaliesQuery.data?.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/10">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">No anomalies detected yet.</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Please ensure the synthetic dataset is generated.</p>
        </div>
      )}

      <div className="space-y-3">
        {anomaliesQuery.data?.map((anomaly) => (
          <Link
            key={anomaly.anomalyId}
            to={`/insights/${anomaly.anomalyId}`}
            className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{anomaly.kpiName}</p>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5">{anomaly.period}</p>
              </div>
              <ConfidenceBadge label={anomaly.confidenceLabel} score={anomaly.confidenceScore} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-slate-600 dark:text-slate-400 border-t border-slate-50 dark:border-slate-800/50 pt-3">
              <span>
                Delta:{" "}
                <span className="font-bold text-slate-900 dark:text-white">
                  {anomaly.delta.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </span>
              <span>
                Materiality:{" "}
                <span className="font-bold text-slate-900 dark:text-white">{Math.round(anomaly.materialityScore * 100)}%</span>
              </span>
              <span>
                Drivers:{" "}
                <span className="font-bold text-slate-900 dark:text-white">{anomaly.driverCount}</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
