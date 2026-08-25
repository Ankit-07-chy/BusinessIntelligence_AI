import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { formatDriverLabel } from "../../lib/driverLabels";
import type { FeedbackSummary as FeedbackSummaryData } from "../../lib/types";

export function FeedbackSummary({ anomalyId }: { anomalyId?: string }) {
  const summaryQuery = useQuery({
    queryKey: ["feedback-summary", anomalyId ?? "all"],
    queryFn: async () =>
      (await api.get<FeedbackSummaryData>("/feedback/summary", { params: anomalyId ? { anomalyId } : undefined })).data,
  });

  if (summaryQuery.isLoading) return <p className="text-sm text-slate-500">Loading feedback summary…</p>;
  if (summaryQuery.isError || !summaryQuery.data) return <p className="text-sm text-red-600">Failed to load feedback summary.</p>;

  const summary = summaryQuery.data;

  if (summary.total === 0) {
    return <p className="text-sm text-slate-500">No feedback submitted yet.</p>;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Feedback summary</h3>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Responses</dt>
          <dd className="mt-0.5 font-medium text-slate-900">{summary.total}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Helpful rate</dt>
          <dd className="mt-0.5 font-medium text-slate-900">{Math.round(summary.helpfulRate * 100)}%</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Action accepted rate</dt>
          <dd className="mt-0.5 font-medium text-slate-900">{Math.round(summary.acceptedActionRate * 100)}%</dd>
        </div>
      </dl>

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Root cause correctness</p>
        <p className="mt-1 text-sm text-slate-700">
          {summary.rootCauseCorrectBreakdown.yes ?? 0} correct · {summary.rootCauseCorrectBreakdown.partial ?? 0} partial ·{" "}
          {summary.rootCauseCorrectBreakdown.no ?? 0} incorrect
        </p>
      </div>

      {summary.topCorrectedDrivers.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Most common corrections</p>
          <ul className="mt-1 text-sm text-slate-700">
            {summary.topCorrectedDrivers.map((entry) => (
              <li key={entry.driverId}>
                {formatDriverLabel(entry.driverId)} ({entry.count})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
