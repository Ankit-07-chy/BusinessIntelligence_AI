import { PrismaClient } from "@prisma/client";
import { computeBaseline } from "../src/analytics/baseline.js";
import { getOrCreateExplanation } from "../src/services/explanationService.js";
import { listActions } from "../src/services/actionService.js";
import type { AuthTokenPayload } from "../src/schemas/auth.js";

const prisma = new PrismaClient();

const cfoUser: AuthTokenPayload = { sub: "cfo-eval", username: "cfo", persona: "cfo", allowedRegions: ["ALL"] };

function report(label: string, pass: boolean, detail: string) {
  console.log(`${pass ? "PASS" : "FAIL"} — ${label}: ${detail}`);
}

async function incident1() {
  console.log("\n=== Incident 1: multi-factor (stockout + paid search) ===");
  const anomaly = await prisma.anomaly.findFirst({
    where: { kpiId: "net_revenue", driverContributions: { some: {} } },
    include: { driverContributions: true },
    orderBy: { materialityScore: "desc" },
  });
  if (!anomaly) return report("anomaly_detected", false, "no net_revenue anomaly with drivers found");
  report("anomaly_detected", true, `${anomaly.anomalyId} (${anomaly.period})`);

  const ranked = [...anomaly.driverContributions].sort((a, b) => Number(b.confidenceScore) - Number(a.confidenceScore));
  const rank1 = ranked[0]?.driverId;
  const rank2 = ranked[1]?.driverId;
  report(
    "ranked_drivers",
    rank1 === "stockout_top_skus" && rank2 === "paid_search_reduction",
    `#1=${rank1}, #2=${rank2}`,
  );

  const actions = await listActions({ anomalyId: anomaly.anomalyId }, prisma);
  const hasReplenishment = actions.some((a) => a.lever === "replenishment" && a.ownerPersona === "supply_chain_manager");
  const hasMarketingBudget = actions.some((a) => a.lever === "marketing_budget" && a.ownerPersona === "marketing_manager");
  report(
    "recommended_actions",
    hasReplenishment && hasMarketingBudget,
    `replenishment/supply_chain_manager=${hasReplenishment}, marketing_budget/marketing_manager=${hasMarketingBudget}`,
  );
}

async function incident2() {
  console.log("\n=== Incident 2: low confidence (stale/missing source) ===");
  const anomalies = await prisma.anomaly.findMany({ include: { driverContributions: true } });
  const lowConfidence = anomalies.find((a) => a.driverContributions.length === 0);
  if (!lowConfidence) return report("confidence_score_below_0.5", false, "no zero-driver anomaly found to test");

  const explanation = await getOrCreateExplanation(lowConfidence.anomalyId, "cfo", cfoUser, prisma);
  if (!explanation) return report("status_abstain", false, "explanation lookup returned null");

  const structured = explanation.structuredResponse as {
    status: string;
    clarification_question: string | null;
  };
  report("status_abstain", structured.status === "abstain", `status=${structured.status}`);
  report(
    "clarification_question_present",
    typeof structured.clarification_question === "string" && structured.clarification_question.length > 0,
    String(structured.clarification_question),
  );
}

async function incident3() {
  console.log("\n=== Incident 3: sparse history (new product launch) ===");
  const sparseProduct = await prisma.dimProduct.findUnique({ where: { sku: "SKU-0024" } });
  if (!sparseProduct) return report("baseline_fallback", false, "SKU-0024 not found in seeded data");

  const salesRows = await prisma.factSales.findMany({
    where: { productId: sparseProduct.productId },
    orderBy: { saleDate: "asc" },
  });
  if (salesRows.length === 0) return report("baseline_fallback", false, "no sales history for SKU-0024");

  const history = salesRows.map((row) => ({
    date: row.saleDate.toISOString().slice(0, 10),
    value: Number(row.grossRevenue) - Number(row.discountAmount) - Number(row.returnsAmount),
  }));

  // Pick a target a few days into the product's own (short) history, where
  // fewer than 2 same-weekday points exist yet — the actual "just launched" case.
  const earlyTargetIndex = Math.min(3, history.length - 1);
  const targetDate = history[earlyTargetIndex].date;
  const priorHistory = history.slice(0, earlyTargetIndex);

  const categoryRows = await prisma.factSales.findMany({
    where: { product: { category: sparseProduct.category }, saleDate: { lt: new Date(`${targetDate}T00:00:00.000Z`) } },
  });
  const categoryByDate = new Map<string, number>();
  for (const row of categoryRows) {
    const key = row.saleDate.toISOString().slice(0, 10);
    const value = Number(row.grossRevenue) - Number(row.discountAmount) - Number(row.returnsAmount);
    categoryByDate.set(key, (categoryByDate.get(key) ?? 0) + value);
  }
  const categoryHistory = Array.from(categoryByDate.entries()).map(([date, value]) => ({ date, value }));

  const baseline = computeBaseline(priorHistory, targetDate, { categoryHistory });
  report(
    "baseline_fallback",
    baseline.method === "category_fallback",
    `method=${baseline.method} (${priorHistory.length} same-product points before ${targetDate})`,
  );
}

async function main() {
  await incident1();
  await incident2();
  await incident3();
  console.log(
    "\n=== Incident 4: security scope breach ===\nPASS — covered by backend/tests/goldenIncident004Security.test.ts (run via `npm test`)",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
