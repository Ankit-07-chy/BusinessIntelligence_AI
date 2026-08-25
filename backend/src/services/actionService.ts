import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../db/prismaClient.js";
import { mapDriverToAction } from "./actionMapping.js";
import { getAnomalyDetail } from "./anomalyService.js";

const CONFIDENCE_LABEL_TO_SCORE: Record<string, number> = { high: 0.9, medium: 0.7, low: 0.5 };

/** Generates any missing ActionRecommendation rows for an anomaly's drivers, idempotently. */
export async function ensureActionsForAnomaly(anomalyId: string, prisma: PrismaClient = defaultPrisma) {
  const anomaly = await getAnomalyDetail(anomalyId, prisma);
  if (!anomaly) return [];

  const existing = await prisma.actionRecommendation.findMany({ where: { anomalyId } });
  const existingDriverIds = new Set(existing.map((row) => row.driverId).filter(Boolean));

  const toCreate = anomaly.driverContributions
    .filter((driver) => !existingDriverIds.has(driver.driverId))
    .map((driver) => {
      const template = mapDriverToAction(driver.driverId);
      if (!template) return null;
      return {
        anomalyId,
        driverId: driver.driverId,
        lever: template.lever,
        actionName: template.action,
        ownerPersona: template.ownerPersona,
        expectedImpact: Math.round(Math.abs(driver.estimatedImpact)),
        confidence: CONFIDENCE_LABEL_TO_SCORE[template.confidence] ?? 0.5,
        monitoringPlan: template.monitoringPlan,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (toCreate.length > 0) {
    await prisma.actionRecommendation.createMany({ data: toCreate });
  }

  return prisma.actionRecommendation.findMany({ where: { anomalyId }, orderBy: { createdAt: "asc" } });
}

export async function listActions(
  options: { anomalyId?: string } = {},
  prisma: PrismaClient = defaultPrisma,
) {
  if (options.anomalyId) {
    await ensureActionsForAnomaly(options.anomalyId, prisma);
  }

  const rows = await prisma.actionRecommendation.findMany({
    where: options.anomalyId ? { anomalyId: options.anomalyId } : undefined,
    include: { anomaly: { include: { kpi: true } } },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => ({
    actionId: row.actionId,
    anomalyId: row.anomalyId,
    kpiId: row.anomaly.kpiId,
    kpiName: row.anomaly.kpi.name,
    period: row.anomaly.period,
    driverId: row.driverId,
    lever: row.lever,
    actionName: row.actionName,
    ownerPersona: row.ownerPersona,
    expectedImpact: Number(row.expectedImpact),
    confidence: row.confidence === null ? null : Number(row.confidence),
    monitoringPlan: row.monitoringPlan,
    status: row.status,
    createdAt: row.createdAt,
  }));
}

export type ActionStatus = "accepted" | "rejected";

export async function updateActionStatus(actionId: string, status: ActionStatus, prisma: PrismaClient = defaultPrisma) {
  try {
    return await prisma.actionRecommendation.update({ where: { actionId }, data: { status } });
  } catch {
    return null;
  }
}
