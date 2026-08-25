import request from "supertest";
import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { env } from "../src/config/env.js";
import { prisma } from "../src/db/prismaClient.js";

const app = createApp();

describe("Security Enforcement (RLS & CLS) & Telemetry Auditing", () => {
  const generateToken = (persona: string, allowedRegions: string[]) => {
    return jwt.sign(
      {
        sub: `user-${persona}-id`,
        username: persona,
        persona,
        allowedRegions,
      },
      env.JWT_SECRET
    );
  };

  it("enforces Row-Level Security (RLS) on timeseries queries based on user regions", async () => {
    // 1. Marketing Manager has access to ALL regions
    const tokenAll = generateToken("marketing_manager", ["ALL"]);
    const resAll = await request(app)
      .get("/api/v1/kpis/net_revenue/timeseries")
      .set("Authorization", `Bearer ${tokenAll}`);
    expect(resAll.status).toBe(200);
    const lengthAll = resAll.body.length;

    // 2. We mock a user scoped to only EU
    const tokenEU = generateToken("marketing_manager", ["EU"]);
    const resEU = await request(app)
      .get("/api/v1/kpis/net_revenue/timeseries")
      .set("Authorization", `Bearer ${tokenEU}`);
    expect(resEU.status).toBe(200);

    // Sum of values in EU should be less than or equal to global
    const valAll = resAll.body.reduce((sum: number, r: any) => sum + r.value, 0);
    const valEU = resEU.body.reduce((sum: number, r: any) => sum + r.value, 0);
    expect(valEU).toBeLessThan(valAll);
  });

  it("enforces Column-Level Security (CLS) blocking restricted metrics for specific roles", async () => {
    // Supply Chain Manager is restricted from viewing gross_margin (restricted_columns: ["gross_margin", "cogs", "discount_amount"])
    const tokenSCM = generateToken("supply_chain_manager", ["EU", "US"]);
    
    // Attempting to list anomalies should exclude net_revenue if it contains restricted columns,
    // or gross_margin anomalies entirely.
    const resAnomalies = await request(app)
      .get("/api/v1/anomalies")
      .set("Authorization", `Bearer ${tokenSCM}`);
    
    expect(resAnomalies.status).toBe(200);
    // There shouldn't be any gross_margin anomalies visible
    const hasGrossMargin = resAnomalies.body.some((a: any) => a.kpiId === "gross_margin");
    expect(hasGrossMargin).toBe(false);

    // CFO has ALL clearance
    const tokenCFO = generateToken("cfo", ["ALL"]);
    const resCFO = await request(app)
      .get("/api/v1/anomalies")
      .set("Authorization", `Bearer ${tokenCFO}`);
    expect(resCFO.status).toBe(200);
  });

  it("audits request attempts in the Telemetry logs", async () => {
    const token = generateToken("analyst", ["ALL"]);
    const path = "/api/v1/kpis";
    
    const res = await request(app)
      .get(path)
      .set("Authorization", `Bearer ${token}`);
    
    expect(res.status).toBe(200);

    // Wait a brief moment to allow the async DB call in requestContext to complete
    await new Promise((resolve) => setTimeout(resolve, 300));

    const logged = await prisma.telemetryRequest.findFirst({
      where: {
        path: "/kpis",
        persona: "analyst",
      },
      orderBy: { createdAt: "desc" },
    });

    expect(logged).not.toBeNull();
    expect(logged?.statusCode).toBe(200);
  });
});
