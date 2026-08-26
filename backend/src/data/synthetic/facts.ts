import type { IncidentPlan } from "./incidentPlan.js";
import { randInt, randRange } from "./rng.js";
import { toIsoDate } from "./scenario.js";
import type {
  GeneratedDimCampaign,
  GeneratedDimProduct,
  GeneratedDimStore,
  GeneratedFactInventory,
  GeneratedFactMarketingSpend,
  GeneratedFactSales,
  GeneratedFactShipment,
  GeneratedFactWebTraffic,
} from "./types.js";

const WEEKDAY_MULTIPLIER = [1.0, 1.0, 1.02, 1.05, 1.15, 1.35, 1.25]; // Sun..Sat

function weekdayMultiplier(date: Date): number {
  return WEEKDAY_MULTIPLIER[date.getUTCDay()];
}

function isSparseRow(product: GeneratedDimProduct, storeId: string, date: Date, plan: IncidentPlan): boolean {
  if (product.productId !== plan.sparseProduct.productId) return false;
  return storeId !== plan.sparseProductStoreId || date < plan.sparseHistoryStart;
}

export function generateFactInventory(
  rng: () => number,
  dates: Date[],
  products: GeneratedDimProduct[],
  stores: GeneratedDimStore[],
  plan: IncidentPlan,
): GeneratedFactInventory[] {
  const rows: GeneratedFactInventory[] = [];
  for (const product of products) {
    for (const store of stores) {
      for (const date of dates) {
        if (isSparseRow(product, store.storeId, date, plan)) continue;

        const isIncidentStockout =
          product.productId === plan.stockoutProduct.productId &&
          plan.affectedStoreIds.includes(store.storeId) &&
          plan.incidentDates.has(toIsoDate(date));

        const isRandomStockout = rng() < 0.015;
        const unitsOnHand = (isIncidentStockout || isRandomStockout) ? 0 : randInt(rng, 15, 220);
        rows.push({
          productId: product.productId,
          storeId: store.storeId,
          inventoryDate: date,
          unitsOnHand,
          isStockout: unitsOnHand === 0,
        });
      }
    }
  }
  return rows;
}

export function generateFactSales(
  rng: () => number,
  dates: Date[],
  products: GeneratedDimProduct[],
  stores: GeneratedDimStore[],
  inventory: GeneratedFactInventory[],
  plan: IncidentPlan,
): GeneratedFactSales[] {
  const stockoutKey = (productId: string, storeId: string, date: Date) =>
    `${productId}|${storeId}|${toIsoDate(date)}`;
  const stockoutLookup = new Set(
    inventory.filter((row) => row.isStockout).map((row) => stockoutKey(row.productId, row.storeId, row.inventoryDate)),
  );

  const rows: GeneratedFactSales[] = [];
  for (const product of products) {
    const isHeroSku = product.productId === plan.stockoutProduct.productId;
    const baseUnits = isHeroSku
      ? randInt(rng, 60, 90) // a genuine top seller, so stockout dominates the incident's revenue drop
      : product.category === "electronics"
        ? randInt(rng, 8, 25)
        : randInt(rng, 15, 60);
    for (const store of stores) {
      for (const date of dates) {
        if (isSparseRow(product, store.storeId, date, plan)) continue;
        if (stockoutLookup.has(stockoutKey(product.productId, store.storeId, date))) {
          rows.push({
            productId: product.productId,
            storeId: store.storeId,
            saleDate: date,
            grossRevenue: 0,
            discountAmount: 0,
            returnsAmount: 0,
            costOfGoodsSold: 0,
            unitsSold: 0,
          });
          continue;
        }

        let units = baseUnits * weekdayMultiplier(date) * randRange(rng, 0.85, 1.15);

        const isIncidentSoftness =
          store.channelType === "online" &&
          store.region === plan.incidentRegion &&
          plan.incidentDates.has(toIsoDate(date)) &&
          product.productId !== plan.stockoutProduct.productId;
        if (isIncidentSoftness) {
          units *= 0.9; // reduced paid-search-driven traffic softens online conversions only
        }

        // Align random campaign events (budget cuts/expansions)
        if (store.channelType === "online") {
          const dateStr = toIsoDate(date);
          const regionEvents = randomCampaignEvents.get(dateStr);
          if (regionEvents && regionEvents.has(store.region)) {
            const eventType = regionEvents.get(store.region);
            if (eventType === "cut") {
              units *= 0.8;
            } else if (eventType === "expansion") {
              units *= 1.2;
            }
          }
        }

        units = Math.max(0, Math.round(units));
        const grossRevenue = Math.round(units * product.price * 100) / 100;
        const discountAmount = Math.round(grossRevenue * randRange(rng, 0.02, 0.08) * 100) / 100;
        const returnsAmount = Math.round(grossRevenue * randRange(rng, 0.01, 0.03) * 100) / 100;
        const costOfGoodsSold = Math.round(units * product.cost * 100) / 100;

        rows.push({
          productId: product.productId,
          storeId: store.storeId,
          saleDate: date,
          grossRevenue,
          discountAmount,
          returnsAmount,
          costOfGoodsSold,
          unitsSold: units,
        });
      }
    }
  }
  return rows;
}

const SPEND_RANGE_BY_CHANNEL: Record<string, [number, number]> = {
  paid_search: [2000, 6000],
  paid_social: [1000, 3500],
  affiliate: [500, 1800],
  email: [200, 800],
};

// Shared map of generated campaign events (dateString -> region -> "cut" | "expansion")
export const randomCampaignEvents = new Map<string, Map<string, "cut" | "expansion">>();

export function generateFactMarketingSpend(
  rng: () => number,
  dates: Date[],
  campaigns: GeneratedDimCampaign[],
  plan: IncidentPlan,
): GeneratedFactMarketingSpend[] {
  const rows: GeneratedFactMarketingSpend[] = [];
  
  // Clear any previous events
  randomCampaignEvents.clear();

  for (const campaign of campaigns) {
    const [min, max] = SPEND_RANGE_BY_CHANNEL[campaign.channel] ?? [500, 2000];
    for (const date of dates) {
      if (campaign.campaignId === plan.delayedCampaign.campaignId && date >= plan.delayedSince) {
        continue; // simulates a stalled/delayed feed for the low-confidence scenario
      }

      let spendAmount = randRange(rng, min, max) * weekdayMultiplier(date);
      const isIncidentDay = campaign.campaignId === plan.paidSearchCampaign.campaignId && plan.incidentDates.has(toIsoDate(date));
      
      if (isIncidentDay) {
        spendAmount *= 0.8; // the mandated 20% paid-search spend drop
      } else if (campaign.channel === "paid_search") {
        // Inject random marketing spend adjustments
        const r = rng();
        const dateStr = toIsoDate(date);
        if (r < 0.02) { // 2% chance of spend cut
          spendAmount *= 0.7;
          if (!randomCampaignEvents.has(dateStr)) {
            randomCampaignEvents.set(dateStr, new Map());
          }
          randomCampaignEvents.get(dateStr)!.set(campaign.region, "cut");
        } else if (r > 0.98) { // 2% chance of spend expansion
          spendAmount *= 1.3;
          if (!randomCampaignEvents.has(dateStr)) {
            randomCampaignEvents.set(dateStr, new Map());
          }
          randomCampaignEvents.get(dateStr)!.set(campaign.region, "expansion");
        }
      }
      
      spendAmount = Math.round(spendAmount * 100) / 100;

      const clicks = Math.round(spendAmount / randRange(rng, 0.8, 2.5));
      const impressions = clicks * randInt(rng, 15, 40);
      const newCustomers = Math.round(clicks * randRange(rng, 0.02, 0.06));

      rows.push({ campaignId: campaign.campaignId, spendDate: date, spendAmount, clicks, impressions, newCustomers });
    }
  }
  return rows;
}

const DEVICES = ["desktop", "mobile"] as const;

export function generateFactWebTraffic(
  rng: () => number,
  dates: Date[],
  regions: readonly string[],
  channels: readonly string[],
  plan: IncidentPlan,
): GeneratedFactWebTraffic[] {
  const rows: GeneratedFactWebTraffic[] = [];
  for (const region of regions) {
    for (const channel of channels) {
      for (const device of DEVICES) {
        for (const date of dates) {
          let sessions = randInt(rng, 400, 3000) * weekdayMultiplier(date);
          if (channel === "paid_search" && region === plan.incidentRegion && plan.incidentDates.has(toIsoDate(date))) {
            sessions *= 0.82; // fewer paid-search sessions from the spend cut
          }
          sessions = Math.round(sessions);
          const conversionRate = randRange(rng, 0.015, 0.045);
          const orders = Math.round(sessions * conversionRate);
          rows.push({ channel, device, region, trafficDate: date, sessions, orders });
        }
      }
    }
  }
  return rows;
}

const CARRIERS = ["ShipFast", "GlobalPost", "RegionalXpress"] as const;
const FULFILLMENT_CENTERS_BY_REGION: Record<string, string[]> = {
  EU: ["FC-EU-1", "FC-EU-2"],
  US: ["FC-US-1", "FC-US-2"],
};

export function generateFactShipments(
  rng: () => number,
  dates: Date[],
  regions: readonly string[],
): GeneratedFactShipment[] {
  const rows: GeneratedFactShipment[] = [];
  let orderLineCounter = 0;
  for (const region of regions) {
    const centers = FULFILLMENT_CENTERS_BY_REGION[region] ?? [`FC-${region}-1`];
    for (const date of dates) {
      const shipmentCount = randInt(rng, 40, 120);
      for (let i = 0; i < shipmentCount; i++) {
        orderLineCounter += 1;
        rows.push({
          orderLineId: `ol-${orderLineCounter}`,
          carrier: CARRIERS[randInt(rng, 0, CARRIERS.length - 1)],
          region,
          fulfillmentCenter: centers[randInt(rng, 0, centers.length - 1)],
          shipmentDate: date,
          deliveredOnTimeInFull: rng() < 0.92,
        });
      }
    }
  }
  return rows;
}
