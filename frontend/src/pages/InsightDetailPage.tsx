import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api, getRestrictionMessage } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { ConfidenceBadge } from "../components/insights/ConfidenceBadge";
import { ContributionWaterfall } from "../components/insights/ContributionWaterfall";
import { DriverList } from "../components/insights/DriverList";
import { EvidenceCard } from "../components/insights/EvidenceCard";
import { PersonaNarrativeTabs } from "../components/insights/PersonaNarrativeTabs";
import { LineagePanel } from "../components/insights/LineagePanel";
import { ActionPlan } from "../components/insights/ActionPlan";
import { FeedbackPanel } from "../components/feedback/FeedbackPanel";
import type { AnomalyDetail } from "../lib/types";

export function InsightDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const anomalyQuery = useQuery({
    queryKey: ["anomaly", id],
    queryFn: async () => (await api.get<AnomalyDetail>(`/anomalies/${id}`)).data,
    enabled: Boolean(id),
  });

  if (anomalyQuery.isLoading) {
    return <p className="text-sm text-slate-500">Loading insight…</p>;
  }

  const restrictionMessage = getRestrictionMessage(anomalyQuery.error);
  if (restrictionMessage) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
        <p className="font-semibold">Restricted by your role's data policy</p>
        <p className="mt-1">{restrictionMessage}</p>
      </div>
    );
  }
  if (anomalyQuery.isError || !anomalyQuery.data || !id) {
    return <p className="text-sm text-red-600">Anomaly not found.</p>;
  }

  const anomaly = anomalyQuery.data;
  const driverOptions = anomaly.driverContributions.map((driver) => driver.driverId);

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

      <section>
        <h3 className="text-sm font-semibold text-slate-900">Explanation</h3>
        <div className="mt-3">
          <PersonaNarrativeTabs anomalyId={id} defaultPersona={user?.persona} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-900">Evidence lineage</h3>
        <div className="mt-3">
          <LineagePanel anomalyId={id} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-900">Recommended actions</h3>
        <div className="mt-3">
          <ActionPlan anomalyId={id} />
        </div>
      </section>

      <section>
        <FeedbackPanel anomalyId={id} driverOptions={driverOptions} />
      </section>
    </div>
  );
}
