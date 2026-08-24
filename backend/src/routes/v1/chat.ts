import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { notImplemented } from "../../utils/notImplemented.js";

export const chatRouter = Router();

chatRouter.use(requireAuth);

chatRouter.post("/chat", (_req, res) => notImplemented(res, "Conversational KPI analysis"));
