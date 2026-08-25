import { addDays, describeScenarioWindow, INCIDENT_REGION, toIsoDate } from "./scenario.js";
import type { GeneratedDimCampaign, GeneratedDimProduct, GeneratedDimStore } from "./types.js";

export interface IncidentPlan {
  startDate: Date;
  incidentStart: Date;
  incidentEnd: Date;
  incidentDates: Set<string>;
  incidentRegion: string;
  stockoutProduct: GeneratedDimProduct;
  affectedStoreIds: string[];
  paidSearchCampaign: GeneratedDimCampaign;
  sparseProduct: GeneratedDimProduct;
  sparseProductStoreId: string;
  sparseHistoryStart: Date;
  delayedCampaign: GeneratedDimCampaign;
  delayedSince: Date;
}

/**
 * Ties the three mandatory scenarios (multi-factor incident, sparse-history
 * product, low-confidence marketing feed) to concrete rows so every fact
 * generator can inject them consistently.
 */
export function buildIncidentPlan(
  startDate: Date,
  products: GeneratedDimProduct[],
  stores: GeneratedDimStore[],
  campaigns: GeneratedDimCampaign[],
): IncidentPlan {
  const window = describeScenarioWindow(startDate);

  const stockoutProduct = products.find((p) => p.category === "electronics") ?? products[0];
  const affectedStoreIds = stores.filter((s) => s.region === INCIDENT_REGION).map((s) => s.storeId);
  const paidSearchCampaign =
    campaigns.find((c) => c.channel === "paid_search" && c.region === INCIDENT_REGION) ?? campaigns[0];

  const sparseProduct = products[products.length - 1];
  const sparseProductStoreId = stores.find((s) => s.region === "US" && s.channelType === "online")?.storeId ?? stores[0].storeId;

  const delayedCampaign =
    campaigns.find((c) => c.channel === "email" && c.region !== INCIDENT_REGION) ?? campaigns[campaigns.length - 1];

  const incidentDates = new Set<string>();
  for (let d = new Date(window.incidentStart); d <= window.incidentEnd; d = addDays(d, 1)) {
    incidentDates.add(toIsoDate(d));
  }

  return {
    startDate,
    incidentStart: window.incidentStart,
    incidentEnd: window.incidentEnd,
    incidentDates,
    incidentRegion: INCIDENT_REGION,
    stockoutProduct,
    affectedStoreIds,
    paidSearchCampaign,
    sparseProduct,
    sparseProductStoreId,
    sparseHistoryStart: window.sparseHistoryStart,
    delayedCampaign,
    delayedSince: window.delayedSince,
  };
}
