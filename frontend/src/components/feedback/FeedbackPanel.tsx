import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Button } from "../ui/Button";
import type { FeedbackRequest } from "../../lib/types";
import { FeedbackButtons } from "./FeedbackButtons";
import { DriverCorrectionForm } from "./DriverCorrectionForm";

export function FeedbackPanel({ anomalyId, driverOptions }: { anomalyId: string; driverOptions: string[] }) {
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [rootCauseCorrect, setRootCauseCorrect] = useState<"yes" | "no" | "partial" | null>(null);
  const [acceptedAction, setAcceptedAction] = useState(false);
  const [correctedDriver, setCorrectedDriver] = useState("");
  const [comments, setComments] = useState("");

  const submit = useMutation({
    mutationFn: async (body: FeedbackRequest) => (await api.post("/feedback", body)).data,
  });

  const canSubmit = helpful !== null && rootCauseCorrect !== null && !submit.isPending;

  function handleSubmit() {
    if (helpful === null || rootCauseCorrect === null) return;
    submit.mutate({
      insightId: anomalyId,
      helpful,
      rootCauseCorrect,
      acceptedAction,
      correctedDriver: correctedDriver || undefined,
      comments: comments || undefined,
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
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Feedback</h3>
      <div className="mt-3 space-y-4">
        <FeedbackButtons
          helpful={helpful}
          onHelpfulChange={setHelpful}
          rootCauseCorrect={rootCauseCorrect}
          onRootCauseCorrectChange={setRootCauseCorrect}
          acceptedAction={acceptedAction}
          onAcceptedActionChange={setAcceptedAction}
        />
        <DriverCorrectionForm
          driverOptions={driverOptions}
          correctedDriver={correctedDriver}
          onCorrectedDriverChange={setCorrectedDriver}
          comments={comments}
          onCommentsChange={setComments}
        />
        {submit.isError && <p className="text-sm text-red-600">Failed to submit feedback.</p>}
        <Button variant="primary" disabled={!canSubmit} onClick={handleSubmit}>
          {submit.isPending ? "Submitting…" : "Submit feedback"}
        </Button>
      </div>
    </div>
  );
}
