import { prisma } from "../db/prismaClient.js";

export async function listKpis() {
  return prisma.kpiDefinition.findMany({ orderBy: { kpiId: "asc" } });
}

export async function getKpi(kpiId: string) {
  return prisma.kpiDefinition.findUnique({ where: { kpiId } });
}

interface TimeseriesOptions {
  allowedRegions: string[];
  from?: Date;
  to?: Date;
}

function bucketByDate(rows: { date: Date }[], valueOf: (row: any) => number) {
  const byDate = new Map<string, number>();
  for (const row of rows) {
    const key = row.date.toISOString().slice(0, 10);
    byDate.set(key, (byDate.get(key) ?? 0) + valueOf(row));
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, value]) => ({ date, value }));
}

function bucketRatioByDate(rows: { date: Date }[], numeratorOf: (row: any) => number, denominatorOf: (row: any) => number) {
  const numerators = new Map<string, number>();
  const denominators = new Map<string, number>();
  for (const row of rows) {
    const key = row.date.toISOString().slice(0, 10);
    numerators.set(key, (numerators.get(key) ?? 0) + numeratorOf(row));
    denominators.set(key, (denominators.get(key) ?? 0) + denominatorOf(row));
  }
  return Array.from(numerators.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, numerator]) => {
      const denominator = denominators.get(date) ?? 0;
      return { date, value: denominator === 0 ? 0 : numerator / denominator };
    });
}

async function netRevenueTimeseries(options: TimeseriesOptions) {
  const regionFilter = options.allowedRegions.includes("ALL")
    ? {}
    : { store: { region: { in: options.allowedRegions } } };

  const rows = await prisma.factSales.findMany({
    where: { ...regionFilter, saleDate: { gte: options.from, lte: options.to } },
    orderBy: { saleDate: "asc" },
  });

  return bucketByDate(
    rows.map((r) => ({ date: r.saleDate, ...r })),
    (r) => Number(r.grossRevenue) - Number(r.discountAmount) - Number(r.returnsAmount),
  );
}

async function grossMarginTimeseries(options: TimeseriesOptions) {
  const regionFilter = options.allowedRegions.includes("ALL")
    ? {}
    : { store: { region: { in: options.allowedRegions } } };

  const rows = await prisma.factSales.findMany({
    where: { ...regionFilter, saleDate: { gte: options.from, lte: options.to } },
    orderBy: { saleDate: "asc" },
  });

  return bucketByDate(
    rows.map((r) => ({ date: r.saleDate, ...r })),
    (r) => Number(r.grossRevenue) - Number(r.discountAmount) - Number(r.returnsAmount) - Number(r.costOfGoodsSold),
  );
}

async function conversionRateTimeseries(options: TimeseriesOptions) {
  const regionFilter = options.allowedRegions.includes("ALL") ? {} : { region: { in: options.allowedRegions } };

  const rows = await prisma.factWebTraffic.findMany({
    where: { ...regionFilter, trafficDate: { gte: options.from, lte: options.to } },
    orderBy: { trafficDate: "asc" },
  });

  return bucketRatioByDate(
    rows.map((r) => ({ date: r.trafficDate, ...r })),
    (r) => r.orders,
    (r) => r.sessions,
  );
}

async function otifTimeseries(options: TimeseriesOptions) {
  const regionFilter = options.allowedRegions.includes("ALL") ? {} : { region: { in: options.allowedRegions } };

  const rows = await prisma.factShipment.findMany({
    where: { ...regionFilter, shipmentDate: { gte: options.from, lte: options.to } },
    orderBy: { shipmentDate: "asc" },
  });

  return bucketRatioByDate(
    rows.map((r) => ({ date: r.shipmentDate, ...r })),
    (r) => (r.deliveredOnTimeInFull ? 1 : 0),
    () => 1,
  );
}

async function cacTimeseries(options: TimeseriesOptions) {
  // fact_marketing_spend/dim_campaign carry no region column in this schema, so
  // CAC cannot be region-scoped yet — it is always computed across all campaigns.
  const rows = await prisma.factMarketingSpend.findMany({
    where: { spendDate: { gte: options.from, lte: options.to } },
    orderBy: { spendDate: "asc" },
  });

  return bucketRatioByDate(
    rows.map((r) => ({ date: r.spendDate, ...r })),
    (r) => Number(r.spendAmount),
    (r) => r.newCustomers,
  );
}

const TIMESERIES_BY_KPI: Record<string, (options: TimeseriesOptions) => Promise<{ date: string; value: number }[]>> = {
  net_revenue: netRevenueTimeseries,
  gross_margin: grossMarginTimeseries,
  conversion_rate: conversionRateTimeseries,
  otif: otifTimeseries,
  cac: cacTimeseries,
};

export async function getKpiTimeseries(kpiId: string, options: TimeseriesOptions) {
  const resolver = TIMESERIES_BY_KPI[kpiId];
  if (!resolver) return null;
  return resolver(options);
}
