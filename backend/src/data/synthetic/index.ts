import { generateDimCalendar, generateDimCampaigns, generateDimProducts, generateDimStores } from "./dimensions.js";
import {
  generateFactInventory,
  generateFactMarketingSpend,
  generateFactSales,
  generateFactShipments,
  generateFactWebTraffic,
} from "./facts.js";
import { buildIncidentPlan } from "./incidentPlan.js";
import { createRng, generateMarketFactor } from "./rng.js";
import { getDateRange, getDatasetStartDate, REGIONS, SEED, TOTAL_DAYS, toIsoDate } from "./scenario.js";
import { generateSourceStatus } from "./sourceStatus.js";
import type { ScenarioMeta, SyntheticDataset } from "./types.js";

const CHANNELS = ["paid_search", "paid_social", "affiliate", "email"] as const;

export function generateSyntheticDataset(referenceDate: Date = new Date(), seed: number = SEED): SyntheticDataset {
  const rng = createRng(seed);
  const startDate = getDatasetStartDate(referenceDate);
  const dates = getDateRange(startDate, TOTAL_DAYS);
  const datasetEndDate = dates[dates.length - 1];

  const dimProducts = generateDimProducts(rng);
  const dimStores = generateDimStores();
  const dimCampaigns = generateDimCampaigns();
  const dimCalendar = generateDimCalendar(dates);

  const plan = buildIncidentPlan(startDate, dimProducts, dimStores, dimCampaigns);

  // Shared across all products/regions/channels so their independent noise
  // doesn't cancel out on aggregation — see generateMarketFactor's docstring.
  const marketFactor = generateMarketFactor(rng, dates.length);

  const factInventory = generateFactInventory(rng, dates, dimProducts, dimStores, plan);
  const factMarketingSpend = generateFactMarketingSpend(rng, dates, dimCampaigns, plan, marketFactor);
  const factSales = generateFactSales(rng, dates, dimProducts, dimStores, factInventory, plan, marketFactor);
  const factWebTraffic = generateFactWebTraffic(rng, dates, REGIONS, CHANNELS, plan, marketFactor);
  const factShipments = generateFactShipments(rng, dates, REGIONS);
  const sourceStatus = generateSourceStatus(rng, datasetEndDate, plan);

  const scenario: ScenarioMeta = {
    startDate: toIsoDate(startDate),
    endDate: toIsoDate(datasetEndDate),
    incident: {
      region: plan.incidentRegion,
      startDate: toIsoDate(plan.incidentStart),
      endDate: toIsoDate(plan.incidentEnd),
      stockoutProductId: plan.stockoutProduct.productId,
      stockoutSku: plan.stockoutProduct.sku,
      affectedStoreIds: plan.affectedStoreIds,
      paidSearchCampaignId: plan.paidSearchCampaign.campaignId,
      competitorPromotionNote:
        "A competitor promotion ran in the same region/window (not modeled as its own fact table in this prototype) — treat as unattributed confound context.",
    },
    sparseHistoryProduct: {
      productId: plan.sparseProduct.productId,
      sku: plan.sparseProduct.sku,
      historyStartDate: toIsoDate(plan.sparseHistoryStart),
    },
    lowConfidence: {
      delayedCampaignId: plan.delayedCampaign.campaignId,
      delayedSince: toIsoDate(plan.delayedSince),
    },
  };

  return {
    dimProducts,
    dimStores,
    dimCampaigns,
    dimCalendar,
    factSales,
    factInventory,
    factMarketingSpend,
    factWebTraffic,
    factShipments,
    sourceStatus,
    scenario,
  };
}

export * from "./types.js";
