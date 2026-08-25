import { PrismaClient } from "@prisma/client";
import { generateSyntheticDataset } from "../src/data/synthetic/index.js";
import { loadSyntheticData } from "../src/db/loadSyntheticData.js";
import { detectAndPersistAnomalies } from "../src/services/anomalyService.js";

const prisma = new PrismaClient();

async function main() {
  const dataset = generateSyntheticDataset();
  console.log(`Generated synthetic dataset: ${dataset.scenario.startDate} .. ${dataset.scenario.endDate}`);
  console.log(
    `  Incident: ${dataset.scenario.incident.stockoutSku} stockout + 20% paid-search spend cut in ` +
      `${dataset.scenario.incident.region}, ${dataset.scenario.incident.startDate}..${dataset.scenario.incident.endDate}`,
  );
  console.log(`  Sparse-history product: ${dataset.scenario.sparseHistoryProduct.sku}`);
  console.log(`  Delayed marketing feed: campaign ${dataset.scenario.lowConfidence.delayedCampaignId}`);

  const summary = await loadSyntheticData(prisma, dataset);
  console.log("Loaded rows:", summary);

  const anomalySummary = await detectAndPersistAnomalies(prisma);
  console.log("Detected anomalies:", anomalySummary);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
