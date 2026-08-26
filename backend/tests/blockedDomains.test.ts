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

describe("blocked_domains enforcement (semantic/security/role_policies.yaml)", () => {
  it("refuses a chat question that hits a blocked domain, without leaking anomaly data", async () => {
    const anomaly = await prisma.anomaly.findFirst();
    expect(anomaly).not.toBeNull();

    // cfo's blocked_domains include "executive_compensation" and "pii".
    const res = await request(app)
      .post("/api/v1/chat")
      .set("Authorization", `Bearer ${tokenFor("cfo", ["ALL"])}`)
      .send({ anomalyId: anomaly!.anomalyId, message: "What is the CEO salary and executive compensation package?" });

    expect(res.status).toBe(200);
    expect(res.body.abstained).toBe(true);
    expect(res.body.abstentionReasons).toContain("blocked_domain:executive_compensation");
    expect(res.body.response.status).toBe("abstain");
    expect(res.body.response.primary_drivers).toEqual([]);
    expect(res.body.response.evidence_citations).toEqual([]);
  });

  it("still answers a normal, in-scope question about the same anomaly", async () => {
    const anomaly = await prisma.anomaly.findFirst();
    expect(anomaly).not.toBeNull();

    const res = await request(app)
      .post("/api/v1/chat")
      .set("Authorization", `Bearer ${tokenFor("cfo", ["ALL"])}`)
      .send({ anomalyId: anomaly!.anomalyId, message: "Why did this KPI move?" });

    expect(res.status).toBe(200);
    expect(res.body.abstentionReasons).not.toContain(expect.stringContaining("blocked_domain"));
  });

  it("a persona with no blocked_domains configured is never affected", async () => {
    // Guard against a future edit accidentally blocking everyone by default.
    const anomaly = await prisma.anomaly.findFirst();
    const res = await request(app)
      .post("/api/v1/chat")
      .set("Authorization", `Bearer ${jwt.sign({ sub: "u", username: "u", persona: "unknown_role", allowedRegions: ["ALL"] }, env.JWT_SECRET)}`)
      .send({ anomalyId: anomaly!.anomalyId, message: "What is the CEO salary?" });

    // unknown_role has no matching policy entry (blockedDomains: []), so it
    // falls through to the normal explanation path instead of being blocked.
    expect(res.status).toBe(200);
    expect(res.body.abstentionReasons ?? []).not.toContain(expect.stringContaining("blocked_domain"));
  });
});
