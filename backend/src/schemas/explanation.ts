import { z } from "zod";

export const narrativeQuerySchema = z.object({
  anomalyId: z.string().uuid(),
});
