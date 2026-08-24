import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { notImplemented } from "../../utils/notImplemented.js";

export const adminRouter = Router();

adminRouter.use(requireAuth);

adminRouter.get("/admin/users", (_req, res) => notImplemented(res, "Admin user management"));
