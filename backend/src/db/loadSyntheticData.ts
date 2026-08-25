import type { Prisma, PrismaClient } from "@prisma/client";
import type { SyntheticDataset } from "../data/synthetic/index.js";

const CHUNK_SIZE = 1000;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

async function createManyChunked<T>(
  label: string,
  items: T[],
  createMany: (data: T[]) => Promise<Prisma.BatchPayload>,
): Promise<number> {
  let total = 0;
  for (const batch of chunk(items, CHUNK_SIZE)) {
    const result = await createMany(batch);
    total += result.count;
  }
  return total;
}

export interface LoadSummary {
  dimProducts: number;
  dimStores: number;
  dimCampaigns: number;
  dimCalendar: number;
  factSales: number;
  factInventory: number;
  factMarketingSpend: number;
  factWebTraffic: number;
  factShipments: number;
  sourceStatus: number;
}

/**
 * Loads a generated dataset into Postgres via Prisma. Dimensions load first
 * (facts reference them by id), and everything uses skipDuplicates so the
 * loader is safe to re-run against a partially-seeded database.
 */
export async function loadSyntheticData(prisma: PrismaClient, dataset: SyntheticDataset): Promise<LoadSummary> {
  const dimProducts = await createManyChunked("dimProducts", dataset.dimProducts, (data) =>
    prisma.dimProduct.createMany({ data, skipDuplicates: true }),
  );
  const dimStores = await createManyChunked("dimStores", dataset.dimStores, (data) =>
    prisma.dimStore.createMany({ data, skipDuplicates: true }),
  );
  const dimCampaigns = await createManyChunked("dimCampaigns", dataset.dimCampaigns, (data) =>
    prisma.dimCampaign.createMany({ data, skipDuplicates: true }),
  );
  const dimCalendar = await createManyChunked("dimCalendar", dataset.dimCalendar, (data) =>
    prisma.dimCalendar.createMany({ data, skipDuplicates: true }),
  );

  const factSales = await createManyChunked("factSales", dataset.factSales, (data) =>
    prisma.factSales.createMany({ data, skipDuplicates: true }),
  );
  const factInventory = await createManyChunked("factInventory", dataset.factInventory, (data) =>
    prisma.factInventory.createMany({ data, skipDuplicates: true }),
  );
  const factMarketingSpend = await createManyChunked("factMarketingSpend", dataset.factMarketingSpend, (data) =>
    prisma.factMarketingSpend.createMany({ data, skipDuplicates: true }),
  );
  const factWebTraffic = await createManyChunked("factWebTraffic", dataset.factWebTraffic, (data) =>
    prisma.factWebTraffic.createMany({ data, skipDuplicates: true }),
  );
  const factShipments = await createManyChunked("factShipments", dataset.factShipments, (data) =>
    prisma.factShipment.createMany({ data, skipDuplicates: true }),
  );

  let sourceStatus = 0;
  for (const row of dataset.sourceStatus) {
    await prisma.sourceStatus.upsert({
      where: { sourceName: row.sourceName },
      update: row,
      create: row,
    });
    sourceStatus += 1;
  }

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
  };
}
