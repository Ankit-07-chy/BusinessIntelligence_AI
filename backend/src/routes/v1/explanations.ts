import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { notImplemented } from "../../utils/notImplemented.js";

export const explanationsRouter = Router();

explanationsRouter.use(requireAuth);

explanationsRouter.get("/explanations/:anomalyId", (_req, res) =>
  notImplemented(res, "Explanation generation"),
);
explanationsRouter.get("/explanations/:anomalyId/evidence", (_req, res) =>
  notImplemented(res, "Evidence pack retrieval"),
);
