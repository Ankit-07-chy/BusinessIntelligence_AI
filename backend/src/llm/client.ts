import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env.js";

export class LlmNotConfiguredError extends Error {
  constructor() {
    super("LLM_API_KEY is not set — no live model call can be made.");
    this.name = "LlmNotConfiguredError";
  }
}

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!env.LLM_API_KEY) throw new LlmNotConfiguredError();
  if (!geminiClient) geminiClient = new GoogleGenAI({ apiKey: env.LLM_API_KEY });
  return geminiClient;
}

export interface StructuredCallInput {
  systemPrompt: string;
  userPrompt: string;
  jsonSchema: object;
}

async function callGroq(input: StructuredCallInput): Promise<unknown> {
  if (!env.LLM_API_KEY) throw new LlmNotConfiguredError();

  const systemPromptWithSchema = `${input.systemPrompt}\n\nYou MUST respond with a JSON object adhering to this schema:\n${JSON.stringify(input.jsonSchema, null, 2)}`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.LLM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.LLM_MODEL || "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPromptWithSchema },
        { role: "user", content: input.userPrompt },
      ],
      temperature: env.LLM_TEMPERATURE,
      max_tokens: env.LLM_MAX_TOKENS,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API returned status ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as any;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq API returned an empty response.");

  return JSON.parse(content);
}

/**
 * Calls the configured model (Gemini or Groq) and forces a JSON response.
 * Returns the parsed (but not yet Zod-validated) JSON — the caller is responsible
 * for validating it against the Zod contract before trusting it.
 */
export async function generateStructuredContent(input: StructuredCallInput): Promise<unknown> {
  const provider = env.LLM_PROVIDER?.toLowerCase();

  if (provider === "groq") {
    return callGroq(input);
  }

  // Default to Gemini
  const ai = getGeminiClient();

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

