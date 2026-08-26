import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { narrativeQuerySchema } from "../../schemas/explanation.js";
import { getOrCreateExplanation } from "../../services/explanationService.js";

export const personasRouter = Router();

personasRouter.use(requireAuth);

personasRouter.get("/personas", (_req, res) => {
  res.json(["cfo", "supply_chain_manager", "marketing_manager", "analyst", "digital_product_manager"]);
});

personasRouter.get("/personas/:personaId/narrative", async (req, res, next) => {
  try {
    const query = narrativeQuerySchema.parse(req.query);
    const explanation = await getOrCreateExplanation(query.anomalyId, req.params.personaId, req.user!);
    if (!explanation) return res.status(404).json({ error: "Anomaly not found" });
    res.json(explanation);
  } catch (err) {
    next(err);
  }
});
