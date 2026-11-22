import { generateText, Output, NoObjectGeneratedError } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { triageResultSchema, type TriageResult } from "./schema";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import type { ValidInput } from "./validation";

export const DEFAULT_MODEL = "gemini-3.5-flash-lite";

export class TriageError extends Error {}

export async function runTriage(input: ValidInput): Promise<TriageResult> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new TriageError("The server is missing its AI API key.");
  }

  const google = createGoogleGenerativeAI({ apiKey });
  const modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  try {
    const { output } = await generateText({
      model: google(modelName),
      system: SYSTEM_PROMPT,
      prompt: buildUserPrompt(input),
      output: Output.object({ schema: triageResultSchema }),
      temperature: 0.2,
    });
    return triageResultSchema.parse(output);
  } catch (error) {
    console.error(
      "Triage error:",
      error instanceof Error ? error.message : "unknown error"
    );
    if (NoObjectGeneratedError.isInstance(error)) {
      throw new TriageError("The AI returned an unusable response. Please try again.");
    }
    throw new TriageError("The AI service is unavailable right now. Please try again.");
  }
}