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

/**
 * Net revenue is the only KPI wired to a real timeseries query in this scaffold;
 * the others read from `fact_web_traffic` / `fact_marketing_spend` / `fact_shipments`
 * once those repositories and the analytics engine are implemented.
 */
export async function getKpiTimeseries(kpiId: string, options: TimeseriesOptions) {
  if (kpiId !== "net_revenue") {
    return null;
  }

  const regionFilter = options.allowedRegions.includes("ALL")
    ? {}
    : { store: { region: { in: options.allowedRegions } } };

  const rows = await prisma.factSales.findMany({
    where: {
      ...regionFilter,
      saleDate: {
        gte: options.from,
        lte: options.to,
      },
    },
    orderBy: { saleDate: "asc" },
  });

  const byDate = new Map<string, number>();
  for (const row of rows) {
    const key = row.saleDate.toISOString().slice(0, 10);
    const netRevenue =
      Number(row.grossRevenue) - Number(row.discountAmount) - Number(row.returnsAmount);
    byDate.set(key, (byDate.get(key) ?? 0) + netRevenue);
  }

  return Array.from(byDate.entries()).map(([date, value]) => ({ date, value }));
}
