import { generateStructuredContent } from "./client.js";
import { EXPLANATION_RESPONSE_JSON_SCHEMA } from "./schemas.js";

console.log("Diagnostics starting via local imports...");
console.log("LLM API Key set:", !!process.env.LLM_API_KEY);

async function run() {
  try {
    const raw = await generateStructuredContent({
      systemPrompt: "You are a helpful assistant.",
      userPrompt: "Hello! If you receive this, respond with a JSON object containing a property 'summary' set to 'DIAGNOSTICS_SUCCESS'.",
      jsonSchema: EXPLANATION_RESPONSE_JSON_SCHEMA,
    });
    console.log("SUCCESS: LLM client is configured and verified successfully!");
    console.log("Response payload:", JSON.stringify(raw));
  } catch (err: any) {
    console.error("DIAGNOSTICS_FAILED: API returned an error:");
    console.error(err.message || err);
  }
}

run();
