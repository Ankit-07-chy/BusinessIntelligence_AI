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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{anomaly.kpiName}</h2>
          <p className="text-sm text-slate-500">{anomaly.period}</p>
        </div>
        <ConfidenceBadge label={anomaly.confidenceLabel} score={anomaly.confidenceScore} />
      </div>

      <EvidenceCard anomaly={anomaly} />

      <section>
        <h3 className="text-sm font-semibold text-slate-900">Contribution waterfall</h3>
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <ContributionWaterfall anomaly={anomaly} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-900">Drivers</h3>
        <div className="mt-3">
          <DriverList drivers={anomaly.driverContributions} />
        </div>
      </section>
    </div>
  );
}
