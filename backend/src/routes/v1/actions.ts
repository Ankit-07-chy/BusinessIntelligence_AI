import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { notImplemented } from "../../utils/notImplemented.js";

export const actionsRouter = Router();

actionsRouter.use(requireAuth);

actionsRouter.get("/actions", (_req, res) => notImplemented(res, "Action recommendation listing"));
actionsRouter.post("/actions/:actionId/accept", (_req, res) => notImplemented(res, "Action acceptance"));
actionsRouter.post("/actions/:actionId/reject", (_req, res) => notImplemented(res, "Action rejection"));
