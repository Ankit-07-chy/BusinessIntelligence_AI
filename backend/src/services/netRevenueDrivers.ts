import type { PrismaClient } from "@prisma/client";
import { computeBaseline } from "../analytics/baseline.js";
import type { TimeseriesPoint } from "../analytics/types.js";

export interface DriverCandidate {
  driverId: string;
  estimatedImpact: number;
  method: string;
}

const LOOKBACK_DAYS = 28;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function netRevenueOf(row: { grossRevenue: unknown; discountAmount: unknown; returnsAmount: unknown }): number {
  return Number(row.grossRevenue) - Number(row.discountAmount) - Number(row.returnsAmount);
}

function toDailySeries(
  rows: Array<{ saleDate: Date; grossRevenue: unknown; discountAmount: unknown; returnsAmount: unknown }>,
): TimeseriesPoint[] {
  const byDate = new Map<string, number>();
  for (const row of rows) {
    const key = toIsoDate(row.saleDate);
    byDate.set(key, (byDate.get(key) ?? 0) + netRevenueOf(row));
  }
  return Array.from(byDate.entries()).map(([date, value]) => ({ date, value }));
}

/**
 * Estimated impact of any top-SKU stockouts on the given date, via a
 * control-store comparison: each stocked-out (product, store)'s weekday-
 * matched baseline revenue vs. its actual (zeroed-out) revenue that day.
 */
export async function getStockoutDriverCandidate(
  prisma: PrismaClient,
  targetDate: string,
): Promise<DriverCandidate | null> {
  const target = new Date(`${targetDate}T00:00:00.000Z`);
  const stockouts = await prisma.factInventory.findMany({
    where: { inventoryDate: target, isStockout: true },
  });
  if (stockouts.length === 0) return null;

  let totalImpact = 0;
  for (const row of stockouts) {
    const historyRows = await prisma.factSales.findMany({
      where: {
        productId: row.productId,
        storeId: row.storeId,
        saleDate: { gte: addDays(target, -LOOKBACK_DAYS), lt: target },
      },
    });
    const history = toDailySeries(historyRows);
    if (history.length === 0) continue;

    const baseline = computeBaseline(history, targetDate);
    totalImpact += 0 - baseline.expectedValue; // actual revenue that day is 0 while stocked out
  }

  if (totalImpact === 0) return null;
  return { driverId: "stockout_top_skus", estimatedImpact: totalImpact, method: "control_store_comparison" };
}

/**
 * Estimated revenue impact of a paid-search spend cut on the given date.
 * First confirms the spend cut actually happened (vs. the campaign's own
 * weekday-matched baseline), then estimates the revenue effect via a control
 * comparison on the affected region's online-channel stores — the segment
 * paid-search traffic actually drives — excluding any product that's
 * independently stocked out that day so the two drivers don't double-count
 * the same dollars.
 */
export async function getPaidSearchDriverCandidate(
  prisma: PrismaClient,
  targetDate: string,
): Promise<DriverCandidate | null> {
  const target = new Date(`${targetDate}T00:00:00.000Z`);
  const paidSearchCampaigns = await prisma.dimCampaign.findMany({ where: { channel: "paid_search" } });
  if (paidSearchCampaigns.length === 0) return null;

  const affectedRegions = new Set<string>();
  for (const campaign of paidSearchCampaigns) {
    const spendRows = await prisma.factMarketingSpend.findMany({
      where: { campaignId: campaign.campaignId, spendDate: { gte: addDays(target, -4 * 7), lte: target } },
      orderBy: { spendDate: "asc" },
    });
    const actualRow = spendRows.find((r) => toIsoDate(r.spendDate) === targetDate);
    if (!actualRow) continue;

    const history: TimeseriesPoint[] = spendRows
      .filter((r) => toIsoDate(r.spendDate) !== targetDate)
      .map((r) => ({ date: toIsoDate(r.spendDate), value: Number(r.spendAmount) }));
    const baseline = computeBaseline(history, targetDate);
    const spendDelta = Number(actualRow.spendAmount) - baseline.expectedValue;
    if (spendDelta < -baseline.expectedValue * 0.05) {
      affectedRegions.add(campaign.region);
    }
  }
  if (affectedRegions.size === 0) return null;

  const stockedOutProductIds = new Set(
    (await prisma.factInventory.findMany({ where: { inventoryDate: target, isStockout: true } })).map(
      (row) => row.productId,
    ),
  );
  const onlineStores = await prisma.dimStore.findMany({
    where: { channelType: "online", region: { in: Array.from(affectedRegions) } },
  });
  if (onlineStores.length === 0) return null;

  let totalImpact = 0;
  for (const store of onlineStores) {
    const actualRows = await prisma.factSales.findMany({ where: { storeId: store.storeId, saleDate: target } });
    const actualRevenue = actualRows
      .filter((row) => !stockedOutProductIds.has(row.productId))
      .reduce((sum, row) => sum + netRevenueOf(row), 0);

    const historyRows = await prisma.factSales.findMany({
      where: { storeId: store.storeId, saleDate: { gte: addDays(target, -LOOKBACK_DAYS), lt: target } },
    });
    const history = toDailySeries(historyRows.filter((row) => !stockedOutProductIds.has(row.productId)));
    if (history.length === 0) continue;

    const baseline = computeBaseline(history, targetDate);
    totalImpact += actualRevenue - baseline.expectedValue;
  }

  if (totalImpact === 0) return null;
  return {
    driverId: "paid_search_reduction",
    estimatedImpact: totalImpact,
    method: "region_channel_control_comparison",
  };
}

/**
 * Estimated revenue impact of a paid-search spend expansion on the given date.
 * First confirms the spend increase actually happened (vs. the campaign's own
 * weekday-matched baseline), then estimates the revenue effect via a control
 * comparison on the affected region's online-channel stores.
 */
export async function getPaidSearchExpansionDriverCandidate(
  prisma: PrismaClient,
  targetDate: string,
): Promise<DriverCandidate | null> {
  const target = new Date(`${targetDate}T00:00:00.000Z`);
  const paidSearchCampaigns = await prisma.dimCampaign.findMany({ where: { channel: "paid_search" } });
  if (paidSearchCampaigns.length === 0) return null;

  const affectedRegions = new Set<string>();
  for (const campaign of paidSearchCampaigns) {
    const spendRows = await prisma.factMarketingSpend.findMany({
      where: { campaignId: campaign.campaignId, spendDate: { gte: addDays(target, -4 * 7), lte: target } },
      orderBy: { spendDate: "asc" },
    });
    const actualRow = spendRows.find((r) => toIsoDate(r.spendDate) === targetDate);
    if (!actualRow) continue;

    const history: TimeseriesPoint[] = spendRows
      .filter((r) => toIsoDate(r.spendDate) !== targetDate)
      .map((r) => ({ date: toIsoDate(r.spendDate), value: Number(r.spendAmount) }));
    const baseline = computeBaseline(history, targetDate);
    const spendDelta = Number(actualRow.spendAmount) - baseline.expectedValue;
    if (spendDelta > baseline.expectedValue * 0.05) {
      affectedRegions.add(campaign.region);
    }
  }
  if (affectedRegions.size === 0) return null;

  const stockedOutProductIds = new Set(
    (await prisma.factInventory.findMany({ where: { inventoryDate: target, isStockout: true } })).map(
      (row) => row.productId,
    ),
  );
  const onlineStores = await prisma.dimStore.findMany({
    where: { channelType: "online", region: { in: Array.from(affectedRegions) } },
  });
  if (onlineStores.length === 0) return null;

  let totalImpact = 0;
  for (const store of onlineStores) {
    const actualRows = await prisma.factSales.findMany({ where: { storeId: store.storeId, saleDate: target } });
    const actualRevenue = actualRows
      .filter((row) => !stockedOutProductIds.has(row.productId))
      .reduce((sum, row) => sum + netRevenueOf(row), 0);

    const historyRows = await prisma.factSales.findMany({
      where: { storeId: store.storeId, saleDate: { gte: addDays(target, -LOOKBACK_DAYS), lt: target } },
    });
    const history = toDailySeries(historyRows.filter((row) => !stockedOutProductIds.has(row.productId)));
    if (history.length === 0) continue;

    const baseline = computeBaseline(history, targetDate);
    totalImpact += actualRevenue - baseline.expectedValue;
  }

  if (totalImpact === 0) return null;
  return {
    driverId: "paid_search_expansion",
    estimatedImpact: totalImpact,
    method: "region_channel_control_comparison",
  };
}

