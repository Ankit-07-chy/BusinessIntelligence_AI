import { randRange } from "./rng.js";
import { REGIONS } from "./scenario.js";
import type { GeneratedDimCalendar, GeneratedDimCampaign, GeneratedDimProduct, GeneratedDimStore } from "./types.js";

const CATEGORIES = ["electronics", "apparel", "home", "beauty"] as const;
const PRODUCTS_PER_CATEGORY = 6;

const PRICE_RANGE_BY_CATEGORY: Record<string, [number, number]> = {
  electronics: [80, 600],
  apparel: [20, 120],
  home: [15, 200],
  beauty: [8, 60],
};

/** Pure — same shape/signature Ankit's real generator will fill in later. */
export function generateDimProducts(rng: () => number): GeneratedDimProduct[] {
  const products: GeneratedDimProduct[] = [];
  let index = 0;
  for (const category of CATEGORIES) {
    const [priceMin, priceMax] = PRICE_RANGE_BY_CATEGORY[category];
    for (let i = 0; i < PRODUCTS_PER_CATEGORY; i++) {
      index += 1;
      const sku = `SKU-${String(index).padStart(4, "0")}`;
      const price = Math.round(randRange(rng, priceMin, priceMax) * 100) / 100;
      const cost = Math.round(price * randRange(rng, 0.4, 0.65) * 100) / 100;
      products.push({
        productId: `prod-${index}`,
        sku,
        name: `${category[0].toUpperCase()}${category.slice(1)} Item ${i + 1}`,
        category,
        price,
        cost,
      });
    }
  }
  return products;
}

export function generateDimStores(): GeneratedDimStore[] {
  const stores: GeneratedDimStore[] = [];
  for (const region of REGIONS) {
    stores.push(
      { storeId: `store-${region}-1`, name: `${region} Flagship Retail`, region, channelType: "retail" },
      { storeId: `store-${region}-2`, name: `${region} Secondary Retail`, region, channelType: "retail" },
      { storeId: `store-${region}-3`, name: `${region} Online Storefront`, region, channelType: "online" },
    );
  }
  return stores;
}

const CHANNELS = ["paid_search", "paid_social", "affiliate", "email"] as const;

export function generateDimCampaigns(): GeneratedDimCampaign[] {
  const campaigns: GeneratedDimCampaign[] = [];
  let index = 0;
  for (const region of REGIONS) {
    for (const channel of CHANNELS) {
      index += 1;
      campaigns.push({
        campaignId: `camp-${index}`,
        name: `${region} ${channel.replace("_", " ")} campaign`,
        channel,
        region,
      });
    }
  }
  return campaigns;
}

function getIsoWeek(date: Date): number {
  const target = new Date(date);
  target.setUTCHours(0, 0, 0, 0);
  target.setUTCDate(target.getUTCDate() + 3 - ((target.getUTCDay() + 6) % 7));
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86400000 - 3) / 7);
}

export function generateDimCalendar(dates: Date[]): GeneratedDimCalendar[] {
  return dates.map((date) => ({
    calendarDate: date,
    weekOfYear: getIsoWeek(date),
    month: date.getUTCMonth() + 1,
    quarter: Math.floor(date.getUTCMonth() / 3) + 1,
    isHoliday: false,
  }));
}
