import { z } from "zod";

export const kpiTimeseriesQuerySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

export type KpiTimeseriesQuery = z.infer<typeof kpiTimeseriesQuerySchema>;
