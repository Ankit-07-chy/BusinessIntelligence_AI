import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { buildEvidencePackForAnomaly, getOrCreateExplanation } from "../../services/explanationService.js";

export const explanationsRouter = Router();

explanationsRouter.use(requireAuth);

explanationsRouter.get("/explanations/:anomalyId", async (req, res) => {
  const explanation = await getOrCreateExplanation(req.params.anomalyId, req.user!.persona, req.user!);
  if (!explanation) return res.status(404).json({ error: "Anomaly not found" });
  res.json(explanation);
});

explanationsRouter.get("/explanations/:anomalyId/evidence", async (req, res) => {
  const context = await buildEvidencePackForAnomaly(req.params.anomalyId, req.user!.persona, req.user!);
  if (!context) return res.status(404).json({ error: "Anomaly not found" });
  res.json(context.evidencePack);
});
