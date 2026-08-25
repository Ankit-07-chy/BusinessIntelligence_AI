import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env.js";

export class LlmNotConfiguredError extends Error {
  constructor() {
    super("LLM_API_KEY is not set — no live model call can be made.");
    this.name = "LlmNotConfiguredError";
  }
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!env.LLM_API_KEY) throw new LlmNotConfiguredError();
  if (!client) client = new GoogleGenAI({ apiKey: env.LLM_API_KEY });
  return client;
}

export interface StructuredCallInput {
  systemPrompt: string;
  userPrompt: string;
  jsonSchema: object;
}

/**
 * Calls the configured Gemini model and forces a JSON response matching
 * `jsonSchema` (Gemini's native structured-output mode). Returns the parsed
 * (but not yet Zod-validated) JSON — the caller is responsible for
 * validating it against the Zod contract before trusting it.
 */
export async function generateStructuredContent(input: StructuredCallInput): Promise<unknown> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: env.LLM_MODEL,
    contents: input.userPrompt,
    config: {
      systemInstruction: input.systemPrompt,
      responseMimeType: "application/json",
      responseJsonSchema: input.jsonSchema,
      temperature: env.LLM_TEMPERATURE,
      maxOutputTokens: env.LLM_MAX_TOKENS,
    },
  });

  const text = response.text;
  if (!text) throw new Error("LLM returned an empty response.");
  return JSON.parse(text);
}
