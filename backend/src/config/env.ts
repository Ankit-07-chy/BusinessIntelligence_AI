import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["local", "test", "production"]).default("local"),
  PORT: z.coerce.number().default(8000),
  APP_NAME: z.string().default("KPI Intelligence Engine"),
  API_V1_PREFIX: z.string().default("/api/v1"),
  DATABASE_URL: z.string(),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET must be set"),
  ACCESS_TOKEN_EXPIRE_MINUTES: z.coerce.number().default(60),
  LLM_PROVIDER: z.string().default("gemini"),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default("gemini-2.5-flash"),
  LLM_TEMPERATURE: z.coerce.number().default(0.2),
  LLM_MAX_TOKENS: z.coerce.number().default(1200),
  TELEMETRY_ENABLED: z.coerce.boolean().default(true),
});

export const env = envSchema.parse(process.env);
export type Env = typeof env;
