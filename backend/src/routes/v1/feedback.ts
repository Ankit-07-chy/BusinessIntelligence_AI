import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../db/prismaClient.js";
import { feedbackRequestSchema } from "../../schemas/feedback.js";

export const feedbackRouter = Router();

feedbackRouter.use(requireAuth);

feedbackRouter.post("/feedback", async (req, res, next) => {
  try {
    const body = feedbackRequestSchema.parse(req.body);
    const feedback = await prisma.feedback.create({
      data: {
        insightId: body.insightId,
        userId: req.user!.sub,
        persona: req.user!.persona,
        helpful: body.helpful,
        rootCauseCorrect: body.rootCauseCorrect,
        acceptedAction: body.acceptedAction,
        correctedDriver: body.correctedDriver,
        comments: body.comments,
      },
    });
    res.status(201).json(feedback);
  } catch (err) {
    next(err);
  }
});
