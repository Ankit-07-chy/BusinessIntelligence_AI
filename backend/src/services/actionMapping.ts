import { loadSemanticYaml } from "../semantic/loader.js";

export interface ActionTemplate {
  driverId: string;
  lever: string;
  action: string;
  ownerPersona: string;
  expectedImpactRange: [number, number];
  confidence: "high" | "medium" | "low";
  monitoringPlan: string;
}

interface RawActionTemplate {
  driver_id: string;
  lever: string;
  action: string;
  owner_persona: string;
  expected_impact_range: [number, number];
  confidence: "high" | "medium" | "low";
  monitoring_plan: string;
}

const ACTION_TEMPLATE_FILES = ["actions/replenishment.yaml", "actions/marketing_budget.yaml", "actions/pricing.yaml", "actions/fulfillment.yaml"];

let cache: Map<string, ActionTemplate> | null = null;

function loadActionTemplates(): Map<string, ActionTemplate> {
  if (cache) return cache;

  const templates = new Map<string, ActionTemplate>();
  for (const file of ACTION_TEMPLATE_FILES) {
    const raw = loadSemanticYaml<RawActionTemplate>(file);
    templates.set(raw.driver_id, {
      driverId: raw.driver_id,
      lever: raw.lever,
      action: raw.action,
      ownerPersona: raw.owner_persona,
      expectedImpactRange: raw.expected_impact_range,
      confidence: raw.confidence,
      monitoringPlan: raw.monitoring_plan,
    });
  }
  cache = templates;
  return templates;
}

/** driver -> lever -> action -> owner_persona -> expected_impact -> monitoring_plan, per semantic/actions/*.yaml. */
export function mapDriverToAction(driverId: string): ActionTemplate | null {
  return loadActionTemplates().get(driverId) ?? null;
}
