import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../db/prismaClient.js";

export const telemetryRouter = Router();

telemetryRouter.use(requireAuth);

telemetryRouter.get("/telemetry/requests", async (_req, res) => {
  const requests = await prisma.telemetryRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json(requests);
});

telemetryRouter.get("/telemetry/llm-calls", async (_req, res) => {
  const calls = await prisma.telemetryLlmCall.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json(calls);
});
