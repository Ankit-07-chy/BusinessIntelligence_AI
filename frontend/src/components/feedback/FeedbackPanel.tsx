import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Button } from "../ui/Button";
import type { FeedbackRequest } from "../../lib/types";

export function FeedbackPanel({ anomalyId }: { anomalyId: string; driverOptions: string[] }) {
  const [rootCauseCorrect, setRootCauseCorrect] = useState<"yes" | "no" | null>(null);
  const [comments, setComments] = useState("");

  const submit = useMutation({
    mutationFn: async (body: FeedbackRequest) => (await api.post("/feedback", body)).data,
  });

  function handleSubmit() {
    if (rootCauseCorrect === null) return;
    submit.mutate({
      insightId: anomalyId,
      helpful: rootCauseCorrect === "yes",
      rootCauseCorrect,
      acceptedAction: rootCauseCorrect === "yes",
      comments: rootCauseCorrect === "no" ? comments : undefined,
    });
  }

  if (submit.isSuccess) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        Thanks — your feedback has been recorded.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Feedback</h3>
      <div className="mt-3 space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Is this insight and root cause explanation correct?</p>
          <div className="mt-2 flex gap-3">
            <Button
              variant={rootCauseCorrect === "yes" ? "primary" : "secondary"}
              onClick={() => {
                setRootCauseCorrect("yes");
                setComments("");
              }}
              className="flex-1 max-w-[120px] font-bold"
            >
              Correct
            </Button>
            <Button
              variant={rootCauseCorrect === "no" ? "primary" : "secondary"}
              onClick={() => setRootCauseCorrect("no")}
              className="flex-1 max-w-[120px] font-bold"
            >
              Wrong
            </Button>
          </div>
        </div>

        {rootCauseCorrect === "no" && (
          <div className="space-y-1.5 transition-all">
            <label htmlFor="wrong-reason" className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              What went wrong? Tell us what is incorrect:
            </label>
            <textarea
              id="wrong-reason"
              className="w-full min-h-[80px] rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              placeholder="Describe what is incorrect..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>
        )}

        {submit.isError && <p className="text-sm text-red-600">Failed to submit feedback.</p>}
        
        <Button
          variant="primary"
          disabled={rootCauseCorrect === null || (rootCauseCorrect === "no" && !comments.trim()) || submit.isPending}
          onClick={handleSubmit}
        >
          {submit.isPending ? "Submitting…" : "Submit feedback"}
        </Button>
      </div>
    </div>
  );
}
