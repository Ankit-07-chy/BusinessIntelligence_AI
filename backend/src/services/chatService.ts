import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../db/prismaClient.js";
import { explainWithGuardrails } from "../llm/guardrails.js";
import type { AuthTokenPayload } from "../schemas/auth.js";
import { buildEvidencePackForAnomaly } from "./explanationService.js";
import { getEffectivePolicy, matchBlockedDomain } from "./securityPolicy.js";

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
  const policy = getEffectivePolicy(user);
  const blockedDomain = matchBlockedDomain(policy, message);
  if (blockedDomain) {
    // Refuse before ever touching anomaly data or calling the LLM.
    return {
      anomalyId,
      message,
      response: {
        status: "abstain" as const,
        confidence: "low" as const,
        summary: "This question is outside what I'm allowed to discuss for your role.",
        primary_drivers: [],
        evidence_citations: [],
        uncertainties: [`blocked_domain:${blockedDomain}`],
        recommended_actions: [],
        clarification_question: "Please rephrase your question to focus on KPI performance, drivers, or recommended actions.",
      },
      source: "fallback" as const,
      abstained: true,
      abstentionReasons: [`blocked_domain:${blockedDomain}`],
    };
  }

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
