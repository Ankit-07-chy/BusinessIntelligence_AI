import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { checkAnomalyAccess } from "../../services/anomalyService.js";
import { buildEvidencePackForAnomaly, getOrCreateExplanation } from "../../services/explanationService.js";

export const explanationsRouter = Router();

explanationsRouter.use(requireAuth);

explanationsRouter.get("/explanations/:anomalyId", async (req, res) => {
  const access = await checkAnomalyAccess(req.params.anomalyId, req.user);
  if (access === "not_found") return res.status(404).json({ error: "Anomaly not found" });
  if (access === "restricted") {
    return res.status(403).json({ error: "This anomaly's KPI is restricted for your role." });
  }

  const explanation = await getOrCreateExplanation(req.params.anomalyId, req.user!.persona, req.user!);
  if (!explanation) return res.status(404).json({ error: "Anomaly not found" });
  res.json(explanation);
});

explanationsRouter.get("/explanations/:anomalyId/evidence", async (req, res) => {
  const context = await buildEvidencePackForAnomaly(req.params.anomalyId, req.user!.persona, req.user!);
  if (!context) return res.status(404).json({ error: "Anomaly not found" });
  res.json(context.evidencePack);
});
