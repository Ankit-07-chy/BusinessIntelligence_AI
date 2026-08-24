import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";

export const usersRouter = Router();

usersRouter.get("/users/me", requireAuth, (req, res) => {
  res.json(req.user);
});
