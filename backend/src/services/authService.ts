import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../db/prismaClient.js";
import type { AuthTokenPayload, LoginRequest } from "../schemas/auth.js";

export class InvalidCredentialsError extends Error {}

export async function login({ username, password }: LoginRequest) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new InvalidCredentialsError();

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) throw new InvalidCredentialsError();

  const payload: AuthTokenPayload = {
    sub: user.id,
    username: user.username,
    persona: user.persona,
    allowedRegions: user.allowedRegions,
  };

  const token = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: `${env.ACCESS_TOKEN_EXPIRE_MINUTES}m`,
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      persona: user.persona,
      allowedRegions: user.allowedRegions,
    },
  };
}
