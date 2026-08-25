import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { chatRequestSchema } from "../../schemas/chat.js";
import { answerChatQuestion } from "../../services/chatService.js";

export const chatRouter = Router();

chatRouter.use(requireAuth);

chatRouter.post("/chat", async (req, res, next) => {
  try {
    const body = chatRequestSchema.parse(req.body);
    const result = await answerChatQuestion(body.anomalyId, body.message, req.user!);
    if (!result) return res.status(404).json({ error: "Anomaly not found" });
    res.json(result);
  } catch (err) {
    next(err);
  }
});
