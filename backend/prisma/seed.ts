import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_USERS = [
  { username: "cfo", displayName: "Dana Reyes (CFO)", persona: "cfo", allowedRegions: ["ALL"] },
  {
    username: "supply_chain_manager",
    displayName: "Marcus Lee (Supply Chain Manager)",
    persona: "supply_chain_manager",
    allowedRegions: ["EU", "US"],
  },
  {
    username: "marketing_manager",
    displayName: "Priya Nair (Marketing Manager)",
    persona: "marketing_manager",
    allowedRegions: ["ALL"],
  },
  { username: "analyst", displayName: "Sam Ortiz (Analyst)", persona: "analyst", allowedRegions: ["ALL"] },
] as const;

const KPI_DEFINITIONS = [
  {
    kpiId: "net_revenue",
    name: "Net Revenue",
    owner: "Finance",
    businessDefinition: "Total sales after discounts and returns",
    formula: "SUM(gross_revenue - discount_amount - returns_amount)",
    grain: "product-store-day",
    refreshCadence: "daily",
    version: "1.0.0",
  },
  {
    kpiId: "gross_margin",
    name: "Gross Margin",
    owner: "Finance",
    businessDefinition: "Revenue minus cost of goods sold",
    formula: "SUM(gross_revenue - discount_amount - returns_amount) - SUM(cost_of_goods_sold)",
    grain: "product-store-day",
    refreshCadence: "daily",
    version: "1.0.0",
  },
  {
    kpiId: "conversion_rate",
    name: "Online Conversion Rate",
    owner: "Digital Product",
    businessDefinition: "Orders divided by traffic sessions",
    formula: "SUM(orders) / SUM(sessions)",
    grain: "channel-device-day",
    refreshCadence: "hourly",
    version: "1.0.0",
  },
  {
    kpiId: "otif",
    name: "On-Time In-Full",
    owner: "Logistics",
    businessDefinition: "On-Time In-Full fulfillment rate of order lines",
    formula: "SUM(delivered_on_time_in_full) / SUM(total_shipments)",
    grain: "order-line-day",
    refreshCadence: "daily",
    version: "1.0.0",
  },
  {
    kpiId: "cac",
    name: "Customer Acquisition Cost",
    owner: "Growth Marketing",
    businessDefinition: "Marketing spend divided by newly acquired customers",
    formula: "SUM(marketing_spend) / SUM(new_customers)",
    grain: "campaign-day",
    refreshCadence: "weekly",
    version: "1.0.0",
  },
] as const;

async function main() {
  for (const user of DEMO_USERS) {
    const passwordHash = await bcrypt.hash("demo1234", 10);
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: { ...user, allowedRegions: [...user.allowedRegions], passwordHash },
    });
  }

  for (const kpi of KPI_DEFINITIONS) {
    await prisma.kpiDefinition.upsert({
      where: { kpiId: kpi.kpiId },
      update: {},
      create: kpi,
    });
  }

  console.log(`Seeded ${DEMO_USERS.length} demo users and ${KPI_DEFINITIONS.length} KPI definitions.`);
  console.log("Demo login password for all users: demo1234");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
