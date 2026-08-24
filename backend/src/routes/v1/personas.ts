import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { notImplemented } from "../../utils/notImplemented.js";

export const personasRouter = Router();

personasRouter.use(requireAuth);

personasRouter.get("/personas", (_req, res) => {
  res.json(["cfo", "supply_chain_manager", "marketing_manager", "analyst"]);
});
personasRouter.get("/personas/:personaId/narrative", (_req, res) =>
  notImplemented(res, "Persona narrative generation"),
);
