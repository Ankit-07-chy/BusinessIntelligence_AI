import { z } from "zod";

export const feedbackRequestSchema = z.object({
  insightId: z.string().uuid(),
  helpful: z.boolean(),
  rootCauseCorrect: z.enum(["yes", "no", "partial"]),
  acceptedAction: z.boolean(),
  correctedDriver: z.string().optional(),
  comments: z.string().optional(),
});

export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;
