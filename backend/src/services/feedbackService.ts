import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../db/prismaClient.js";

export async function getFeedbackSummary(options: { anomalyId?: string } = {}, prisma: PrismaClient = defaultPrisma) {
  const rows = await prisma.feedback.findMany({
    where: options.anomalyId ? { insightId: options.anomalyId } : undefined,
  });

  const total = rows.length;
  const helpfulCount = rows.filter((row) => row.helpful).length;
  const acceptedActionCount = rows.filter((row) => row.acceptedAction).length;

  const rootCauseCorrectBreakdown = { yes: 0, no: 0, partial: 0 } as Record<string, number>;
  const correctedDriverCounts = new Map<string, number>();
  for (const row of rows) {
    rootCauseCorrectBreakdown[row.rootCauseCorrect] = (rootCauseCorrectBreakdown[row.rootCauseCorrect] ?? 0) + 1;
    if (row.correctedDriver) {
      correctedDriverCounts.set(row.correctedDriver, (correctedDriverCounts.get(row.correctedDriver) ?? 0) + 1);
    }
  }

  return {
    total,
    helpfulRate: total === 0 ? 0 : helpfulCount / total,
    acceptedActionRate: total === 0 ? 0 : acceptedActionCount / total,
    rootCauseCorrectBreakdown,
    topCorrectedDrivers: Array.from(correctedDriverCounts.entries())
      .map(([driverId, count]) => ({ driverId, count }))
      .sort((a, b) => b.count - a.count),
  };
}
