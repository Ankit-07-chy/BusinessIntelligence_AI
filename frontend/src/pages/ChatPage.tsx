import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";
import type { AnomalySummary, ChatResponse } from "../lib/types";

export function ChatPage() {
  const [anomalyId, setAnomalyId] = useState("");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<Array<{ question: string; response: ChatResponse }>>([]);

  const anomaliesQuery = useQuery({
    queryKey: ["anomalies", "materiality"],
    queryFn: async () => (await api.get<AnomalySummary[]>("/anomalies", { params: { sortBy: "materiality" } })).data,
  });

  const ask = useMutation({
    mutationFn: async () => (await api.post<ChatResponse>("/chat", { anomalyId, message })).data,
    onSuccess: (response) => {
      setHistory((prev) => [...prev, { question: message, response }]);
      setMessage("");
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-900">Chat</h2>
      <p className="text-sm text-slate-500">
        Ask a question about a specific anomaly — answers are grounded in that anomaly's evidence pack only.
      </p>

      <label className="block text-sm text-slate-700">
        Anomaly
        <select
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={anomalyId}
          onChange={(event) => setAnomalyId(event.target.value)}
        >
          <option value="">Select an anomaly…</option>
          {anomaliesQuery.data?.map((anomaly) => (
            <option key={anomaly.anomalyId} value={anomaly.anomalyId}>
              {anomaly.kpiName} · {anomaly.period}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-3">
        {history.map((turn, index) => {
          const isRestricted = turn.response.abstentionReasons.some((reason) => reason.startsWith("blocked_domain:"));
          return (
            <div key={index} className="space-y-1">
              <p className="text-sm font-medium text-slate-900">You: {turn.question}</p>
              <p
                className={`rounded-md p-3 text-sm ${
                  isRestricted ? "bg-amber-50 text-amber-800" : "bg-slate-50 text-slate-700"
                }`}
              >
                {isRestricted && <span className="font-semibold">Restricted by your role's data policy. </span>}
                {turn.response.response.summary}
              </p>
            </div>
          );
        })}
        {ask.isError && <p className="text-sm text-red-600">Failed to get a response.</p>}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Ask about this anomaly…"
          onKeyDown={(event) => {
            if (event.key === "Enter" && anomalyId && message && !ask.isPending) ask.mutate();
          }}
        />
        <Button variant="primary" disabled={!anomalyId || !message || ask.isPending} onClick={() => ask.mutate()}>
          {ask.isPending ? "Asking…" : "Ask"}
        </Button>
      </div>
    </div>
  );
}
