import request from "supertest";
import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { env } from "../src/config/env.js";
import { prisma } from "../src/db/prismaClient.js";

const app = createApp();

function tokenFor(persona: string, allowedRegions: string[]) {
  return jwt.sign({ sub: `user-${persona}-id`, username: persona, persona, allowedRegions }, env.JWT_SECRET);
}

/**
 * Golden Incident 4 (evals/golden_incidents/incident_004_security_scope.yaml):
 * an EU-scoped user attempting a global/margin query must get region-filtered
 * results, margin-restricted KPIs/columns stripped everywhere (not just the
 * anomaly list), and the attempt logged to telemetry_requests.
 */
describe("Golden Incident 4 — security scope breach attempt", () => {
  const euSupplyChainToken = tokenFor("supply_chain_manager", ["EU"]);

  it("query_restricted_to_regions: net_revenue timeseries for an EU-only user excludes US data", async () => {
    const globalRes = await request(app)
      .get("/api/v1/kpis/net_revenue/timeseries")
      .set("Authorization", `Bearer ${tokenFor("cfo", ["ALL"])}`);
    const euRes = await request(app)
      .get("/api/v1/kpis/net_revenue/timeseries")
      .set("Authorization", `Bearer ${euSupplyChainToken}`);

    expect(globalRes.status).toBe(200);
    expect(euRes.status).toBe(200);

    const globalTotal = globalRes.body.reduce((sum: number, r: { value: number }) => sum + r.value, 0);
    const euTotal = euRes.body.reduce((sum: number, r: { value: number }) => sum + r.value, 0);
    expect(euTotal).toBeLessThan(globalTotal);
  });

  it("margin_columns_stripped: gross_margin anomalies are invisible everywhere for a restricted role", async () => {
    const marginAnomaly = await prisma.anomaly.findFirst({ where: { kpiId: "gross_margin" } });
    expect(marginAnomaly).not.toBeNull();

    const listRes = await request(app).get("/api/v1/anomalies").set("Authorization", `Bearer ${euSupplyChainToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.some((a: { kpiId: string }) => a.kpiId === "gross_margin")).toBe(false);

    const detailRes = await request(app)
      .get(`/api/v1/anomalies/${marginAnomaly!.anomalyId}`)
      .set("Authorization", `Bearer ${euSupplyChainToken}`);
    expect(detailRes.status).toBe(404);

    const explanationRes = await request(app)
      .get(`/api/v1/explanations/${marginAnomaly!.anomalyId}`)
      .set("Authorization", `Bearer ${euSupplyChainToken}`);
    expect(explanationRes.status).toBe(404);

    const actionsRes = await request(app)
      .get(`/api/v1/actions?anomalyId=${marginAnomaly!.anomalyId}`)
      .set("Authorization", `Bearer ${euSupplyChainToken}`);
    expect(actionsRes.status).toBe(200);
    expect(actionsRes.body).toEqual([]);

    // A CFO (unrestricted) can still see it — confirms this is a role gate, not a global outage.
    const cfoDetailRes = await request(app)
      .get(`/api/v1/anomalies/${marginAnomaly!.anomalyId}`)
      .set("Authorization", `Bearer ${tokenFor("cfo", ["ALL"])}`);
    expect(cfoDetailRes.status).toBe(200);
  });

  it("narrative_cache_not_leaked: a cached persona narrative for a margin anomaly still stays hidden from a restricted role", async () => {
    const marginAnomaly = await prisma.anomaly.findFirst({ where: { kpiId: "gross_margin" } });
    expect(marginAnomaly).not.toBeNull();

    // CFO (unrestricted) warms the /personas/cfo/narrative cache for this anomaly.
    const cfoWarm = await request(app)
      .get(`/api/v1/personas/cfo/narrative`)
      .query({ anomalyId: marginAnomaly!.anomalyId })
      .set("Authorization", `Bearer ${tokenFor("cfo", ["ALL"])}`);
    expect(cfoWarm.status).toBe(200);

    // A margin-restricted role requesting the SAME anomaly+persona pair must not
    // get the cached-for-cfo narrative back — the cache key doesn't carry the
    // caller's own role, so this only stays safe if the cache hit is re-checked.
    const restrictedRead = await request(app)
      .get(`/api/v1/personas/cfo/narrative`)
      .query({ anomalyId: marginAnomaly!.anomalyId })
      .set("Authorization", `Bearer ${euSupplyChainToken}`);
    expect(restrictedRead.status).toBe(404);
  });

  it("access_attempt_logged: the restricted request is recorded in telemetry_requests", async () => {
    const marginAnomaly = await prisma.anomaly.findFirst({ where: { kpiId: "gross_margin" } });
    await request(app)
      .get(`/api/v1/anomalies/${marginAnomaly!.anomalyId}`)
      .set("Authorization", `Bearer ${euSupplyChainToken}`);

    await new Promise((resolve) => setTimeout(resolve, 300));

    const logged = await prisma.telemetryRequest.findFirst({
      where: { path: `/anomalies/${marginAnomaly!.anomalyId}`, persona: "supply_chain_manager" },
      orderBy: { createdAt: "desc" },
    });
    expect(logged).not.toBeNull();
    expect(logged?.statusCode).toBe(404);
  });
});
