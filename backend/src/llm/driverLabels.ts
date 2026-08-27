const LABELS: Record<string, string> = {
  net_revenue: "Net revenue",
  gross_margin: "Gross margin",
  conversion_rate: "Conversion rate",
  otif: "On-time in-full",
  cac: "Customer acquisition cost",
  
  // Simplified natural labels
  stockout_top_skus: "running out of stock on top-selling items",
  paid_search_reduction: "spending less on Google search ads",
  paid_search_expansion: "running ads on more Google search keywords",
  website_outage: "a website outage",
  website_conversion_issue: "a drop in website checkout rates",
  warehouse_capacity_constraint: "warehouse capacity limits",
  traffic_quality_decline: "lower quality website visitors",
  seasonality: "seasonal shopping trends",
  promotion_cannibalization: "promotions taking sales from regular items",
  margin_compression_pricing: "margin loss due to heavy discounts",
  competitor_promotion: "competitors running aggressive promotions",
  price_increase_demand_drop: "a drop in demand after raising prices",
  payment_failure: "payment gateway errors causing transaction failures",
  new_product_sparse_history: "lack of sales history for new products",
  new_customer_volume: "changes in new customer sign-ups",
  margin_compression_returns: "increased customer refund and return rates",
  margin_compression_mix_shift: "customers buying cheaper items instead of high-margin items",
  margin_compression_cost_change: "increases in product manufacturing costs",
  insufficient_evidence: "lack of detailed driver evidence",
  fulfillment_demand_spike: "sudden surge in shipping volume and orders",
  fulfillment_delay: "delays at the fulfillment warehouse",
  carrier_delay: "delays by the shipping carriers",
  data_pipeline_delay: "delays in data synchronization and pipelines",
  creative_fatigue: "ad performance decline due to ad creative fatigue",
  checkout_funnel_drop: "shoppers dropping off during checkout",
  campaign_efficiency: "ad campaign budget efficiency changes",
  attribution_lag: "ad conversion reporting delays",
};

/** Human-readable label for a driver id or KPI id, for narrative text. */
export function formatDriverLabel(id: string): string {
  return LABELS[id] ?? id.replace(/_/g, " ");
}
