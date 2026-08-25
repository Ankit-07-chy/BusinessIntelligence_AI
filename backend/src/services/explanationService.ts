import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../db/prismaClient.js";
import { buildEvidencePack, type EvidenceDriverInput, type EvidenceSourceInput } from "../llm/evidencePack.js";
import { explainWithGuardrails } from "../llm/guardrails.js";
import type { EvidencePack } from "../llm/types.js";
import type { AuthTokenPayload } from "../schemas/auth.js";
import { mapDriverToAction } from "./actionMapping.js";
import { getAnomalyDetail } from "./anomalyService.js";
import { getEffectivePolicy, isColumnRestricted, maskEvidencePack } from "./securityPolicy.js";

const CONFIDENCE_LABEL_TO_SCORE: Record<string, number> = { high: 0.9, medium: 0.7, low: 0.5 };

export interface EvidencePackContext {
  evidencePack: EvidencePack;
  keySourceMissing: boolean;
  securityFilterRemovedCriticalData: boolean;
}

/**
 * Builds the (already RLS/CLS-masked) evidence pack for an anomaly, as seen
 * through the CALLING user's own security policy — not the target narrative
 * persona, so switching narrative tabs can't leak data the logged-in user
 * isn't entitled to.
 */
export async function buildEvidencePackForAnomaly(
  anomalyId: string,
  narrativePersonaId: string,
  user: AuthTokenPayload,
  prisma: PrismaClient = defaultPrisma,
): Promise<EvidencePackContext | null> {
  const anomaly = await getAnomalyDetail(anomalyId, user, prisma);
  if (!anomaly) return null;

  const policy = getEffectivePolicy(user);
  const securityFilterRemovedCriticalData = isColumnRestricted(policy, anomaly.kpiId);

  const sourceStatusRows = await prisma.sourceStatus.findMany();
  const sources: EvidenceSourceInput[] = sourceStatusRows.map((row) => ({
    sourceName: row.sourceName,
    freshnessLabel: row.lastSuccessfulRefresh.toISOString(),
    qualityScore: Number(row.completenessScore),
  }));

  const drivers: EvidenceDriverInput[] = anomaly.driverContributions.map((driver) => ({
    driverId: driver.driverId,
    estimatedImpact: driver.estimatedImpact,
    confidenceScore: driver.confidenceScore,
    method: driver.method ?? null,
  }));

  const recommendedActions = drivers
    .map((driver) => {
      const template = mapDriverToAction(driver.driverId);
      if (!template) return null;
      return {
        action: template.action,
        owner: template.ownerPersona,
        lever: template.lever,
        expected_impact: Math.round(Math.abs(driver.estimatedImpact)),
        confidence: CONFIDENCE_LABEL_TO_SCORE[template.confidence] ?? 0.5,
        monitoring_plan: template.monitoringPlan,
      };
    })
    .filter((action): action is NonNullable<typeof action> => action !== null);

  const evidencePack = buildEvidencePack({
    anomaly: {
      kpiId: anomaly.kpiId,
      period: anomaly.period,
      actualValue: anomaly.actualValue,
      forecastValue: anomaly.forecastValue,
      delta: anomaly.delta,
      confidenceScore: anomaly.confidenceScore,
      dataQualityScore: anomaly.dataQualityScore,
    },
    drivers,
    sources,
    persona: narrativePersonaId,
    recommendedActions,
  });

  const maskedPack = maskEvidencePack(evidencePack, policy);
  const keySourceMissing = anomaly.driverContributions.length === 0;

  return { evidencePack: maskedPack, keySourceMissing, securityFilterRemovedCriticalData };
}

export async function getOrCreateExplanation(
  anomalyId: string,
  personaId: string,
  user: AuthTokenPayload,
  prisma: PrismaClient = defaultPrisma,
) {
  const existing = await prisma.explanation.findUnique({
    where: { anomalyId_personaId: { anomalyId, personaId } },
  });
  if (existing) {
    return {
      explanationId: existing.explanationId,
      anomalyId: existing.anomalyId,
      personaId: existing.personaId,
      narrativeText: existing.narrativeText,
      evidenceCitations: existing.evidenceCitations,
      structuredResponse: existing.structuredResponse,
      source: "cached" as const,
      createdAt: existing.createdAt,
    };
  }

  const context = await buildEvidencePackForAnomaly(anomalyId, personaId, user, prisma);
  if (!context) return null;

  const result = await explainWithGuardrails({
    evidencePack: context.evidencePack,
    personaId,
    keySourceMissing: context.keySourceMissing,
    securityFilterRemovedCriticalData: context.securityFilterRemovedCriticalData,
  });

  const created = await prisma.explanation.create({
    data: {
      anomalyId,
      personaId,
      narrativeText: result.response.summary,
      evidenceCitations: result.response.evidence_citations,
      structuredResponse: result.response as unknown as object,
    },
  });

  return {
    explanationId: created.explanationId,
    anomalyId: created.anomalyId,
    personaId: created.personaId,
    narrativeText: created.narrativeText,
    evidenceCitations: created.evidenceCitations,
    structuredResponse: created.structuredResponse,
    source: result.source,
    createdAt: created.createdAt,
  };
}
