import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const app = createApp();

describe("GET /api/v1/health", () => {
  it("responds with a status field", async () => {
    const response = await request(app).get("/api/v1/health");
    expect([200, 503]).toContain(response.status);
    expect(response.body.status).toBeDefined();
  });
});

describe("GET /api/v1/kpis", () => {
  it("rejects requests without a bearer token", async () => {
    const response = await request(app).get("/api/v1/kpis");
    expect(response.status).toBe(401);
  });
});
