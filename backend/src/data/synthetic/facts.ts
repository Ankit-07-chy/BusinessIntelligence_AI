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

// Sat/Sun only — used to confine sales fluctuation to weekends, per request.
function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

const WEEKEND_SALES_MULTIPLIER = 1.15;

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

        const isRandomStockout = isWeekend(date) && rng() < 0.015;
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
  marketFactor: number[],
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
      for (let dateIndex = 0; dateIndex < dates.length; dateIndex++) {
        const date = dates[dateIndex];
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

        // Flat on weekdays ("straight line" Mon-Fri); all organic fluctuation
        // (market-wide swings + per-cell noise + a weekend demand bump) is
        // confined to Sat/Sun. The scripted incident below still perturbs a
        // weekday if it lands on one — that's a real business event, not noise.
        let units = isWeekend(date)
          ? baseUnits * WEEKEND_SALES_MULTIPLIER * marketFactor[dateIndex] * randRange(rng, 0.85, 1.15)
          : baseUnits;

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
        // Fixed rates on weekdays so discount/returns noise can't leak
        // fluctuation into an otherwise flat weekday net-revenue line.
        const discountRate = isWeekend(date) ? randRange(rng, 0.02, 0.08) : 0.05;
        const returnsRate = isWeekend(date) ? randRange(rng, 0.01, 0.03) : 0.02;
        const discountAmount = Math.round(grossRevenue * discountRate * 100) / 100;
        const returnsAmount = Math.round(grossRevenue * returnsRate * 100) / 100;
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
  marketFactor: number[],
): GeneratedFactMarketingSpend[] {
  const rows: GeneratedFactMarketingSpend[] = [];

  // Clear any previous events
  randomCampaignEvents.clear();

  for (const campaign of campaigns) {
    const [min, max] = SPEND_RANGE_BY_CHANNEL[campaign.channel] ?? [500, 2000];
    // Drawn once per campaign — a campaign has a stable typical daily budget
    // in reality, not a freshly rerolled one every day.
    const baseSpend = randRange(rng, min, max);
    for (let dateIndex = 0; dateIndex < dates.length; dateIndex++) {
      const date = dates[dateIndex];
      if (campaign.campaignId === plan.delayedCampaign.campaignId && date >= plan.delayedSince) {
        continue; // simulates a stalled/delayed feed for the low-confidence scenario
      }

      // Dampened vs. sales/traffic — ad budgets track demand loosely, not in lockstep.
      const spendMarketFactor = 1 + (marketFactor[dateIndex] - 1) * 0.4;
      let spendAmount = baseSpend * weekdayMultiplier(date) * spendMarketFactor * randRange(rng, 0.94, 1.06);
      const isIncidentDay = campaign.campaignId === plan.paidSearchCampaign.campaignId && plan.incidentDates.has(toIsoDate(date));
      
      if (isIncidentDay) {
        spendAmount *= 0.8; // the mandated 20% paid-search spend drop
      } else if (campaign.channel === "paid_search" && isWeekend(date)) {
        // Inject random marketing spend adjustments — weekend-only so this
        // can't leak fluctuation into an otherwise flat weekday net revenue
        // via the online-channel sales multiplier below.
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
  marketFactor: number[],
): GeneratedFactWebTraffic[] {
  const rows: GeneratedFactWebTraffic[] = [];
  for (const region of regions) {
    for (const channel of channels) {
      for (const device of DEVICES) {
        // Drawn once per cell — a channel/device/region has a stable typical
        // traffic level in reality, not a freshly rerolled one every day.
        const baseSessions = randInt(rng, 400, 3000);
        for (let dateIndex = 0; dateIndex < dates.length; dateIndex++) {
          const date = dates[dateIndex];
          let sessions = baseSessions * weekdayMultiplier(date) * marketFactor[dateIndex] * randRange(rng, 0.94, 1.06);
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
