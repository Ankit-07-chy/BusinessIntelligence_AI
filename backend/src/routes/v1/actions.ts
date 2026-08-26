import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { listActions, updateActionStatus } from "../../services/actionService.js";

export const actionsRouter = Router();

actionsRouter.use(requireAuth);

actionsRouter.get("/actions", async (req, res) => {
  const anomalyId = typeof req.query.anomalyId === "string" ? req.query.anomalyId : undefined;
  res.json(await listActions({ anomalyId, user: req.user }));
});

actionsRouter.post("/actions/:actionId/accept", async (req, res) => {
  const updated = await updateActionStatus(req.params.actionId, "accepted", req.user);
  if (!updated) return res.status(404).json({ error: "Action not found" });
  res.json(updated);
});

actionsRouter.post("/actions/:actionId/reject", async (req, res) => {
  const updated = await updateActionStatus(req.params.actionId, "rejected", req.user);
  if (!updated) return res.status(404).json({ error: "Action not found" });
  res.json(updated);
});
