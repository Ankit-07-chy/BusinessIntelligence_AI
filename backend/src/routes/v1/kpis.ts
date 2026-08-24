import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { kpiTimeseriesQuerySchema } from "../../schemas/kpi.js";
import { getKpi, getKpiTimeseries, listKpis } from "../../services/kpiService.js";

export const kpisRouter = Router();

kpisRouter.use(requireAuth);

kpisRouter.get("/kpis", async (_req, res) => {
  res.json(await listKpis());
});

kpisRouter.get("/kpis/:kpiId", async (req, res) => {
  const kpi = await getKpi(req.params.kpiId);
  if (!kpi) return res.status(404).json({ error: "KPI not found" });
  res.json(kpi);
});

kpisRouter.get("/kpis/:kpiId/timeseries", async (req, res, next) => {
  try {
    const query = kpiTimeseriesQuerySchema.parse(req.query);
    const timeseries = await getKpiTimeseries(req.params.kpiId, {
      allowedRegions: req.user!.allowedRegions,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
    if (timeseries === null) {
      return res.status(501).json({
        status: "not_implemented",
        message: `Timeseries for '${req.params.kpiId}' is not wired to the analytics engine yet.`,
      });
    }
    res.json(timeseries);
  } catch (err) {
    next(err);
  }
});
