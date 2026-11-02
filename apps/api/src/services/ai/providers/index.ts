import type { AIModelMetadata, AIProviderId } from "@open-sunsama/types";
import type { AIProvider } from "../types.js";
import { GeminiProvider } from "./gemini.js";
import { GroqProvider } from "./groq.js";
import { NimProvider } from "./nim.js";

const providers: Record<AIProviderId, AIProvider> = {
  gemini: new GeminiProvider(),
  groq: new GroqProvider(),
  nim: new NimProvider(),
};

export function getProvider(id: AIProviderId): AIProvider {
  const p = providers[id];
  if (!p) {
    throw new Error(`Unsupported AI provider: ${id}`);
  }
  return p;
}

export function getAllProviders(): AIProvider[] {
  return Object.values(providers);
}

export function getAllModels(): AIModelMetadata[] {
  return Object.values(providers).flatMap((p) => p.getModels());
}

export { GeminiProvider, GroqProvider, NimProvider };
