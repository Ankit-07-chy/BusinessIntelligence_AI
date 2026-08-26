import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, getRestrictionMessage } from "../../lib/api";
import { PERSONA_IDS, type Explanation, type PersonaId } from "../../lib/types";
import { ConfidenceBadge } from "./ConfidenceBadge";

const PERSONA_LABELS: Record<PersonaId, string> = {
  cfo: "CFO",
  supply_chain_manager: "Supply Chain",
  marketing_manager: "Marketing",
  analyst: "Analyst",
  digital_product_manager: "Digital Product",
};

function isPersonaId(value: string): value is PersonaId {
  return (PERSONA_IDS as string[]).includes(value);
}

export function PersonaNarrativeTabs({ anomalyId, defaultPersona }: { anomalyId: string; defaultPersona?: string }) {
  const [activePersona, setActivePersona] = useState<PersonaId>(
    defaultPersona && isPersonaId(defaultPersona) ? defaultPersona : "cfo",
  );

  const narrativeQuery = useQuery({
    queryKey: ["narrative", anomalyId, activePersona],
    queryFn: async () =>
      (
        await api.get<Explanation>(`/personas/${activePersona}/narrative`, {
          params: { anomalyId },
        })
      ).data,
  });

  const explanation = narrativeQuery.data;
  const structured = explanation?.structuredResponse;
  const restrictionMessage = getRestrictionMessage(narrativeQuery.error);

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex border-b border-slate-200">
        {PERSONA_IDS.map((persona) => (
          <button
            key={persona}
            onClick={() => setActivePersona(persona)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activePersona === persona
                ? "border-b-2 border-slate-900 text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {PERSONA_LABELS[persona]}
          </button>
        ))}
      </div>

      <div className="p-4">
        {narrativeQuery.isLoading && <p className="text-sm text-slate-500">Generating narrative…</p>}
        {restrictionMessage && (
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            <span className="font-semibold">Restricted by your role's data policy.</span> {restrictionMessage}
          </p>
        )}
        {narrativeQuery.isError && !restrictionMessage && (
          <p className="text-sm text-red-600">Failed to load narrative.</p>
        )}

        {explanation && structured && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ConfidenceBadge label={structured.confidence} />
              {explanation.source !== "llm" && (
                <span className="text-xs text-slate-400">
                  {explanation.source === "cached" ? "cached" : "template fallback (no LLM key configured)"}
                </span>
              )}
            </div>

            <p className="text-sm text-slate-800">{structured.summary}</p>

            {structured.status === "abstain" && structured.clarification_question && (
              <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                {structured.clarification_question}
              </p>
            )}

            {structured.uncertainties.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Uncertainties</p>
                <ul className="mt-1 list-inside list-disc text-sm text-slate-600">
                  {structured.uncertainties.map((note, index) => (
                    <li key={index}>{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
