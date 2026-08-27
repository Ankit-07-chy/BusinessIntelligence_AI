const DRIVER_LABELS: Record<string, string> = {
  stockout_top_skus: "Out of Stock on Top-Selling Items",
  paid_search_reduction: "Spent Less on Google Search Ads",
  paid_search_expansion: "Ran Ads on More Google Keywords",
  website_outage: "Website Outage",
  website_conversion_issue: "Checkout Conversion Rate Drop",
  warehouse_capacity_constraint: "Warehouse Capacity Limits",
  traffic_quality_decline: "Lower Quality Web Traffic",
  seasonality: "Seasonal Shopping Trends",
  promotion_cannibalization: "Promo Eating Regular Item Sales",
  margin_compression_pricing: "Margin Loss from Heavy Discounts",
  competitor_promotion: "Aggressive Competitor Promotions",
  price_increase_demand_drop: "Demand Drop after Price Increase",
  payment_failure: "Payment Gateway Failures",
  new_product_sparse_history: "New Product Lack of Sales History",
  new_customer_volume: "New Customer Volume Changes",
  margin_compression_returns: "Increased Customer Return Rates",
  margin_compression_mix_shift: "Product Sales Mix Shift",
  margin_compression_cost_change: "Product Manufacturing Cost Increases",
  insufficient_evidence: "Lack of Detailed Driver Evidence",
  fulfillment_demand_spike: "Sudden Surge in Order Volumes",
  fulfillment_delay: "Fulfillment Warehouse Delays",
  carrier_delay: "Shipping Carrier Delays",
  data_pipeline_delay: "Data Synchronization Delays",
  creative_fatigue: "Ad Creative Fatigue",
  checkout_funnel_drop: "Checkout Funnel Drop-off",
  campaign_efficiency: "Ad Campaign Efficiency Shifts",
  attribution_lag: "Ad Conversion Attribution Lag",
};

export function formatDriverLabel(driverId: string): string {
  return DRIVER_LABELS[driverId] ?? driverId.replace(/_/g, " ");
}
