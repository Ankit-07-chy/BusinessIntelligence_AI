import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";
import type { ActionRecommendation } from "../lib/types";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600",
  accepted: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-700",
};

export function ActionsPage() {
  const queryClient = useQueryClient();

  const actionsQuery = useQuery({
    queryKey: ["actions", "all"],
    queryFn: async () => (await api.get<ActionRecommendation[]>("/actions")).data,
  });

  const respond = useMutation({
    mutationFn: async ({ actionId, decision }: { actionId: string; decision: "accept" | "reject" }) =>
      (await api.post(`/actions/${actionId}/${decision}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["actions"] }),
  });

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-900">Actions</h2>

      {actionsQuery.isLoading && <p className="text-sm text-slate-500">Loading actions…</p>}
      {actionsQuery.isError && <p className="text-sm text-red-600">Failed to load actions.</p>}
      {actionsQuery.data?.length === 0 && (
        <p className="text-sm text-slate-500">
          No recommended actions yet — open an anomaly in Insights to generate its action plan.
        </p>
      )}

      <ul className="space-y-3">
        {actionsQuery.data?.map((action) => (
          <li key={action.actionId} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link to={`/insights/${action.anomalyId}`} className="text-sm font-semibold text-slate-900 hover:underline">
                  {action.kpiName} · {action.period}
                </Link>
                <p className="mt-1 text-sm text-slate-800">{action.actionName}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Owner: {action.ownerPersona} · Lever: {action.lever ?? "n/a"}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[action.status] ?? STATUS_STYLES.pending}`}
              >
                {action.status}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-600">
              Expected impact:{" "}
              <span className="font-medium text-slate-900">${Math.round(action.expectedImpact).toLocaleString()}</span>
            </p>

            {action.status === "pending" && (
              <div className="mt-3 flex gap-2">
                <Button
                  variant="primary"
                  onClick={() => respond.mutate({ actionId: action.actionId, decision: "accept" })}
                  disabled={respond.isPending}
                >
                  Accept
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => respond.mutate({ actionId: action.actionId, decision: "reject" })}
                  disabled={respond.isPending}
                >
                  Reject
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
