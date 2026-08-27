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

const PERSONA_FULL_NAMES: Record<PersonaId, string> = {
  cfo: "Chief Financial Officer",
  supply_chain_manager: "Supply Chain Manager",
  marketing_manager: "Marketing Manager",
  analyst: "Data Analyst",
  digital_product_manager: "Digital Product Manager",
};

function isPersonaId(value: string): value is PersonaId {
  return (PERSONA_IDS as string[]).includes(value);
}

export function PersonaNarrativeTabs({ anomalyId, defaultPersona }: { anomalyId: string; defaultPersona?: string }) {
  const activePersona = defaultPersona && isPersonaId(defaultPersona) ? defaultPersona : "cfo";

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
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-5 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Smart BI Narrative ({PERSONA_FULL_NAMES[activePersona]})
        </h4>
      </div>

      <div>
        {narrativeQuery.isLoading && <p className="text-sm text-slate-500">Generating narrative…</p>}
        {restrictionMessage && (
          <p className="rounded-md bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-300">
            <span className="font-semibold">Restricted by your role's data policy.</span> {restrictionMessage}
          </p>
        )}
        {narrativeQuery.isError && !restrictionMessage && (
          <p className="text-sm text-red-600 dark:text-red-400">Failed to load narrative.</p>
        )}

        {explanation && structured && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ConfidenceBadge label={structured.confidence} />
              {explanation.source !== "llm" && (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {explanation.source === "cached" ? "cached" : "template fallback (no LLM key configured)"}
                </span>
              )}
            </div>

            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">{structured.summary}</p>

            {structured.status === "abstain" && structured.clarification_question && (
              <p className="rounded-md bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-300">
                {structured.clarification_question}
              </p>
            )}

            {structured.uncertainties.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Uncertainties</p>
                <ul className="mt-1.5 list-inside list-disc text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  {structured.uncertainties.map((note, index) => (
                    <li key={index} className="leading-relaxed">{note}</li>
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
