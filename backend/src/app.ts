import cors from "cors";
import express from "express";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./core/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestContext } from "./middleware/requestContext.js";
import { apiV1Router } from "./routes/index.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGINS.split(",") }));
  app.use(express.json());
  app.use(pinoHttp({ logger }));
  app.use(requestContext);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: env.APP_NAME });
  });

  app.get("/", (_req, res) => {
    res.json({ status: "ok", service: env.APP_NAME, docs: `${env.API_V1_PREFIX}/health` });
  });

  app.use(env.API_V1_PREFIX, apiV1Router);

  app.use(errorHandler);

  return app;
}
