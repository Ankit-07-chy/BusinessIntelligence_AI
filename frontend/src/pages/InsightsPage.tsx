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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Insights</h2>
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

      {anomaliesQuery.isLoading && <p className="text-sm text-slate-500">Loading anomalies…</p>}
      {anomaliesQuery.isError && <p className="text-sm text-red-600">Failed to load anomalies.</p>}
      {anomaliesQuery.data?.length === 0 && (
        <p className="text-sm text-slate-500">
          No anomalies detected yet — run the synthetic data generator (`npm run generate:data` in `backend/`) to
          populate them.
        </p>
      )}

      <div className="space-y-2">
        {anomaliesQuery.data?.map((anomaly) => (
          <Link
            key={anomaly.anomalyId}
            to={`/insights/${anomaly.anomalyId}`}
            className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{anomaly.kpiName}</p>
                <p className="text-xs text-slate-500">{anomaly.period}</p>
              </div>
              <ConfidenceBadge label={anomaly.confidenceLabel} score={anomaly.confidenceScore} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <span>
                Delta:{" "}
                <span className="font-medium text-slate-900">
                  {anomaly.delta.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </span>
              <span>
                Materiality:{" "}
                <span className="font-medium text-slate-900">{Math.round(anomaly.materialityScore * 100)}%</span>
              </span>
              <span>
                {anomaly.driverCount} driver{anomaly.driverCount === 1 ? "" : "s"}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
