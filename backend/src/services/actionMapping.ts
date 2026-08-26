import { loadSemanticYaml } from "../semantic/loader.js";

export interface ActionTemplate {
  driverId: string;
  lever: string;
  action: string;
  ownerPersona: string;
  expectedImpactRange: [number | string, number | string];
  confidence: "high" | "medium" | "low";
  monitoringPlan: string;
}

interface RawActionTemplate {
  driver_id: string;
  lever: string;
  action: string;
  owner_persona: string;
  expected_impact_range: [number | string, number | string];
  confidence: "high" | "medium" | "low";
  monitoring_plan: string;
}

const ACTION_TEMPLATE_FILES = [
  "actions/replenishment.yaml",
  "actions/marketing_budget.yaml",
  "actions/pricing.yaml",
  "actions/fulfillment.yaml",
  "actions/competitor_promotion.yaml",
  "actions/seasonality.yaml",
  "actions/margin_compression_mix_shift.yaml",
  "actions/margin_compression_cost_change.yaml",
  "actions/margin_compression_returns.yaml",
  "actions/website_conversion_issue.yaml",
  "actions/payment_failure.yaml",
  "actions/fulfillment_demand_spike.yaml",
  "actions/campaign_efficiency.yaml",
  "actions/attribution_lag.yaml",
  "actions/new_customer_volume.yaml",
  "actions/insufficient_evidence.yaml",
  "actions/paid_search_expansion.yaml",
  "actions/carrier_delay.yaml",
  "actions/checkout_funnel_drop.yaml",
  "actions/creative_fatigue.yaml",
  "actions/data_pipeline_delay.yaml",
  "actions/new_product_sparse_history.yaml",
  "actions/price_increase_demand_drop.yaml",
  "actions/promotion_cannibalization.yaml",
  "actions/traffic_quality_decline.yaml",
  "actions/warehouse_capacity_constraint.yaml",
  "actions/website_outage.yaml",
];

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
