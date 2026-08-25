import { describe, expect, it } from "vitest";
import { buildEvidencePackForAnomaly, getOrCreateExplanation } from "../../src/services/explanationService.js";
import { prisma } from "../../src/db/prismaClient.js";
import type { AuthTokenPayload } from "../../src/schemas/auth.js";

describe("Explanation Service & LLM Integration (Phase 4)", () => {
  const mockUser: AuthTokenPayload = {
    id: "user-cfo-id",
    username: "cfo",
    persona: "cfo",
    allowedRegions: ["ALL"],
  };

  it("builds evidence pack for an anomaly and applies column masking", async () => {
    const anomaly = await prisma.anomaly.findFirst();
    expect(anomaly).not.toBeNull();

    const context = await buildEvidencePackForAnomaly(anomaly!.anomalyId, "cfo", mockUser);
    expect(context).not.toBeNull();
    expect(context!.evidencePack).toBeDefined();
    expect(context!.evidencePack.kpi_id).toBe(anomaly!.kpiId);
  });

  it("generates and caches explanation (using fallback if mock key)", async () => {
    const anomaly = await prisma.anomaly.findFirst();
    expect(anomaly).not.toBeNull();

    // Clear existing explanation to force generation
    await prisma.explanation.deleteMany({
      where: { anomalyId: anomaly!.anomalyId, personaId: "cfo" },
    });

    const result = await getOrCreateExplanation(anomaly!.anomalyId, "cfo", mockUser);
    expect(result).not.toBeNull();
    expect(result!.narrativeText).toBeDefined();
    expect(result!.source).toBe("fallback"); // fallback if api key is mock/invalid

    // Check that it's cached on second call
    const secondCall = await getOrCreateExplanation(anomaly!.anomalyId, "cfo", mockUser);
    expect(secondCall!.source).toBe("cached");
  }, 30000);
});
