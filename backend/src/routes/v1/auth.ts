import { Router } from "express";
import { loginRequestSchema } from "../../schemas/auth.js";
import { InvalidCredentialsError, login } from "../../services/authService.js";

export const authRouter = Router();

authRouter.post("/auth/login", async (req, res, next) => {
  try {
    const credentials = loginRequestSchema.parse(req.body);
    const result = await login(credentials);
    res.json(result);
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    next(err);
  }
});
