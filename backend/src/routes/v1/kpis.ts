import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { kpiTimeseriesQuerySchema } from "../../schemas/kpi.js";
import { getKpi, getKpiTimeseries, listKpis } from "../../services/kpiService.js";
import { getEffectivePolicy, isColumnRestricted } from "../../services/securityPolicy.js";

export const kpisRouter = Router();

kpisRouter.use(requireAuth);

kpisRouter.get("/kpis", async (req, res) => {
  const policy = getEffectivePolicy(req.user!);
  const kpis = await listKpis();
  res.json(kpis.filter((kpi) => !isColumnRestricted(policy, kpi.kpiId)));
});

kpisRouter.get("/kpis/:kpiId", async (req, res) => {
  const policy = getEffectivePolicy(req.user!);
  if (isColumnRestricted(policy, req.params.kpiId)) {
    return res.status(403).json({ error: "This KPI is restricted for your role." });
  }
  const kpi = await getKpi(req.params.kpiId);
  if (!kpi) return res.status(404).json({ error: "KPI not found" });
  res.json(kpi);
});

kpisRouter.get("/kpis/:kpiId/timeseries", async (req, res, next) => {
  try {
    const policy = getEffectivePolicy(req.user!);
    if (isColumnRestricted(policy, req.params.kpiId)) {
      return res.status(403).json({ error: "This KPI is restricted for your role." });
    }
    const query = kpiTimeseriesQuerySchema.parse(req.query);
    const timeseries = await getKpiTimeseries(req.params.kpiId, {
      allowedRegions: policy.allowedRegions,
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
