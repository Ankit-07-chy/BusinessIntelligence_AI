import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { checkAnomalyAccess, getAnomalyDetail, listAnomalies, type AnomalySortBy } from "../../services/anomalyService.js";

export const anomaliesRouter = Router();

anomaliesRouter.use(requireAuth);

anomaliesRouter.get("/anomalies", async (req, res) => {
  const sortBy = req.query.sortBy === "confidence" ? "confidence" : ("materiality" as AnomalySortBy);
  res.json(await listAnomalies({ sortBy, user: req.user }));
});

anomaliesRouter.get("/anomalies/:anomalyId", async (req, res) => {
  const access = await checkAnomalyAccess(req.params.anomalyId, req.user);
  if (access === "not_found") return res.status(404).json({ error: "Anomaly not found" });
  if (access === "restricted") {
    return res.status(403).json({ error: "This anomaly's KPI is restricted for your role." });
  }

  const detail = await getAnomalyDetail(req.params.anomalyId, req.user);
  if (!detail) return res.status(404).json({ error: "Anomaly not found" });
  res.json(detail);
});
