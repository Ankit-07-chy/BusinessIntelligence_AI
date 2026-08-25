const DRIVER_LABELS: Record<string, string> = {
  stockout_top_skus: "Stockout — top SKUs",
  paid_search_reduction: "Paid search spend reduction",
};

export function formatDriverLabel(driverId: string): string {
  return DRIVER_LABELS[driverId] ?? driverId.replace(/_/g, " ");
}
