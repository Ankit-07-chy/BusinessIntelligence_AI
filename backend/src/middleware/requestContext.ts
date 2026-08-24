import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { prisma } from "../db/prismaClient.js";
import { logger } from "../core/logger.js";

export function requestContext(req: Request, res: Response, next: NextFunction) {
  const requestId = randomUUID();
  const startedAt = process.hrtime.bigint();
  res.setHeader("X-Request-Id", requestId);

  res.on("finish", () => {
    const latencyMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    if (!env.TELEMETRY_ENABLED) return;

    prisma.telemetryRequest
      .create({
        data: {
          requestId,
          userId: req.user?.sub,
          persona: req.user?.persona,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          latencyMs: Math.round(latencyMs),
        },
      })
      .catch((err) => logger.error({ err }, "Failed to write request telemetry"));
  });

  next();
}
