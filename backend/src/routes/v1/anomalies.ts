import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { getAnomalyDetail, listAnomalies, type AnomalySortBy } from "../../services/anomalyService.js";

export const anomaliesRouter = Router();

anomaliesRouter.use(requireAuth);

anomaliesRouter.get("/anomalies", async (req, res) => {
  const sortBy = req.query.sortBy === "confidence" ? "confidence" : ("materiality" as AnomalySortBy);
  res.json(await listAnomalies({ sortBy, user: req.user }));
});

anomaliesRouter.get("/anomalies/:anomalyId", async (req, res) => {
  const detail = await getAnomalyDetail(req.params.anomalyId, req.user);
  if (!detail) return res.status(404).json({ error: "Anomaly not found" });
  res.json(detail);
});
