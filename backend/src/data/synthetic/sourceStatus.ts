import type { IncidentPlan } from "./incidentPlan.js";
import { randRange } from "./rng.js";
import type { GeneratedSourceStatus } from "./types.js";

export function generateSourceStatus(
  rng: () => number,
  datasetEndDate: Date,
  plan: IncidentPlan,
): GeneratedSourceStatus[] {
  const freshSources = ["fact_sales", "fact_inventory", "fact_web_traffic", "fact_shipments"];
  const rows: GeneratedSourceStatus[] = freshSources.map((sourceName) => ({
    sourceName,
    lastSuccessfulRefresh: datasetEndDate,
    completenessScore: Math.round(randRange(rng, 0.95, 1) * 100) / 100,
    isActive: true,
  }));

  rows.push({
    sourceName: "fact_marketing_spend",
    // Stale on purpose — this is the low-confidence scenario's tell.
    lastSuccessfulRefresh: plan.delayedSince,
    completenessScore: Math.round(randRange(rng, 0.55, 0.65) * 100) / 100,
    isActive: true,
  });

  return rows;
}
