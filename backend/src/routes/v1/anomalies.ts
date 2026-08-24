import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { notImplemented } from "../../utils/notImplemented.js";

export const anomaliesRouter = Router();

anomaliesRouter.use(requireAuth);

anomaliesRouter.get("/anomalies", (_req, res) => notImplemented(res, "Anomaly detection"));
anomaliesRouter.get("/anomalies/:anomalyId", (_req, res) => notImplemented(res, "Anomaly detail lookup"));
