const LABELS: Record<string, string> = {
  stockout_top_skus: "a stockout in top SKUs",
  paid_search_reduction: "a reduction in paid search spend",
  net_revenue: "Net revenue",
  gross_margin: "Gross margin",
  conversion_rate: "Conversion rate",
  otif: "On-time in-full",
  cac: "Customer acquisition cost",
};

/** Human-readable label for a driver id or KPI id, for narrative text. */
export function formatDriverLabel(id: string): string {
  return LABELS[id] ?? id.replace(/_/g, " ");
}
