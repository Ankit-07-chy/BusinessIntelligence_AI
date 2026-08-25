import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../db/prismaClient.js";
import { explainWithGuardrails } from "../llm/guardrails.js";
import type { AuthTokenPayload } from "../schemas/auth.js";
import { buildEvidencePackForAnomaly } from "./explanationService.js";

/**
 * Single-turn chat: answers a free-text question about one anomaly, reusing
 * the same evidence pack + guardrails pipeline as the persona narratives.
 * Stretch-goal scope for Day 2 — no multi-turn memory, no anomaly resolution
 * from free text (the caller must already know which anomaly they mean).
 */
export async function answerChatQuestion(
  anomalyId: string,
  message: string,
  user: AuthTokenPayload,
  prisma: PrismaClient = defaultPrisma,
) {
  const context = await buildEvidencePackForAnomaly(anomalyId, user.persona, user, prisma);
  if (!context) return null;

  const result = await explainWithGuardrails({
    evidencePack: context.evidencePack,
    personaId: user.persona,
    keySourceMissing: context.keySourceMissing,
    securityFilterRemovedCriticalData: context.securityFilterRemovedCriticalData,
    question: message,
  });

  return { anomalyId, message, ...result };
}
