import { z } from "zod";

export const chatRequestSchema = z.object({
  anomalyId: z.string().uuid(),
  message: z.string().min(1),
});
