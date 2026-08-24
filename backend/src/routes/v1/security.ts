import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { loadSemanticYaml } from "../../semantic/loader.js";

export const securityRouter = Router();

securityRouter.use(requireAuth);

securityRouter.get("/admin/security/policies", (_req, res) => {
  const policies = loadSemanticYaml("security/role_policies.yaml");
  res.json(policies);
});
