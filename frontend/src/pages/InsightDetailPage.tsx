import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { ConfidenceBadge } from "../components/insights/ConfidenceBadge";
import { ContributionWaterfall } from "../components/insights/ContributionWaterfall";
import { DriverList } from "../components/insights/DriverList";
import { EvidenceCard } from "../components/insights/EvidenceCard";
import type { AnomalyDetail } from "../lib/types";

export function InsightDetailPage() {
  const { id } = useParams();

  const anomalyQuery = useQuery({
    queryKey: ["anomaly", id],
    queryFn: async () => (await api.get<AnomalyDetail>(`/anomalies/${id}`)).data,
    enabled: Boolean(id),
  });

  if (anomalyQuery.isLoading) {
    return <p className="text-sm text-slate-500">Loading insight…</p>;
  }
  if (anomalyQuery.isError || !anomalyQuery.data) {
    return <p className="text-sm text-red-600">Anomaly not found.</p>;
  }

  const anomaly = anomalyQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{anomaly.kpiName}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{anomaly.period}</p>
        </div>
        <ConfidenceBadge label={anomaly.confidenceLabel} score={anomaly.confidenceScore} />
      </div>

      <EvidenceCard anomaly={anomaly} />

      <section>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Contribution waterfall</h3>
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
          <ContributionWaterfall anomaly={anomaly} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Drivers</h3>
        <div className="mt-3">
          <DriverList drivers={anomaly.driverContributions} />
        </div>
      </section>
    </div>
  );
}
