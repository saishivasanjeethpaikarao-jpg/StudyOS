import type { AIModelMetadata } from "@open-sunsama/types";
import {
  AIAuthenticationError,
  AIConnectionError,
  AIError,
  AIInvalidOutputError,
  AIQuotaError,
  AIRateLimitError,
  AITimeoutError,
  type AIProvider,
  type AIProviderExecutionConfig,
  type AIStructuredRequest,
  type AIStructuredResponse,
  type AITextRequest,
  type AITextResponse,
} from "../types.js";

const GEMINI_MODELS: AIModelMetadata[] = [
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "gemini",
    contextWindow: 1_048_576,
    maxOutputTokens: 8192,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    recommendedFor: ["quiz_generation", "study_planning", "learning_assistant", "concept_extraction"],
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "gemini",
    contextWindow: 2_097_152,
    maxOutputTokens: 8192,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    recommendedFor: ["study_planning", "concept_extraction"],
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    provider: "gemini",
    contextWindow: 1_048_576,
    maxOutputTokens: 8192,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    recommendedFor: ["quiz_generation", "learning_assistant"],
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "gemini",
    contextWindow: 2_097_152,
    maxOutputTokens: 8192,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    recommendedFor: ["study_planning"],
  },
];

export class GeminiProvider implements AIProvider {
  readonly id = "gemini";
  readonly displayName = "Google AI Studio (Gemini)";

  getModels(): AIModelMetadata[] {
    return GEMINI_MODELS;
  }

  getDefaultModel(): string {
    return "gemini-2.5-flash";
  }

  async testConnection(
    apiKey: string
  ): Promise<{ ok: boolean; error?: string; models?: string[] }> {
    if (!apiKey?.trim()) {
      return { ok: false, error: "API key is empty" };
    }
    const cleanKey = apiKey.trim();
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        const msg = body.error?.message || `HTTP ${res.status}: ${res.statusText}`;
        return { ok: false, error: msg };
      }
      const data = (await res.json()) as { models?: { name: string }[] };
      const modelNames = (data.models || []).map((m) =>
        m.name.replace(/^models\//, "")
      );
      return { ok: true, models: modelNames };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      return { ok: false, error: msg };
    }
  }

  private mapError(status: number, errorData: unknown): AIError {
    const errObj = (typeof errorData === "object" && errorData !== null ? errorData : {}) as {
      error?: { message?: string; status?: string };
    };
    const message = errObj.error?.message || `Gemini API error (${status})`;
    const statusStr = errObj.error?.status || "";

    if (status === 400 && message.toLowerCase().includes("api key")) {
      return new AIAuthenticationError("gemini", message);
    }
    if (status === 401 || status === 403) {
      return new AIAuthenticationError("gemini", message);
    }
    if (status === 429 || statusStr === "RESOURCE_EXHAUSTED") {
      if (message.toLowerCase().includes("quota")) {
        return new AIQuotaError("gemini", message);
      }
      return new AIRateLimitError("gemini", message);
    }
    if (status === 504 || status === 408) {
      return new AITimeoutError("gemini", message);
    }
    return new AIConnectionError("gemini", message);
  }

  async generateText(
    request: AITextRequest,
    config: AIProviderExecutionConfig
  ): Promise<AITextResponse> {
    const model = config.model || this.getDefaultModel();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey.trim()}`;

    const body: Record<string, unknown> = {
      contents: [
        {
          role: "user",
          parts: [{ text: request.prompt }],
        },
      ],
      generationConfig: {
        temperature: request.temperature ?? 0.2,
        ...(request.maxTokens ? { maxOutputTokens: request.maxTokens } : {}),
      },
    };

    if (request.systemPrompt) {
      body.systemInstruction = {
        parts: [{ text: request.systemPrompt }],
      };
    }

    const timeout = request.timeoutMs || 45000;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeout),
      });
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        throw new AITimeoutError("gemini", `Gemini timed out after ${timeout}ms`);
      }
      throw new AIConnectionError("gemini", err instanceof Error ? err.message : "Fetch failed");
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw this.mapError(res.status, errBody);
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return {
      text,
      promptTokens: data.usageMetadata?.promptTokenCount,
      completionTokens: data.usageMetadata?.candidatesTokenCount,
      totalTokens: data.usageMetadata?.totalTokenCount,
      model,
    };
  }

  async generateStructured<T>(
    request: AIStructuredRequest<T>,
    config: AIProviderExecutionConfig
  ): Promise<AIStructuredResponse<T>> {
    const model = config.model || this.getDefaultModel();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey.trim()}`;

    const body: Record<string, unknown> = {
      contents: [
        {
          role: "user",
          parts: [{ text: request.prompt }],
        },
      ],
      generationConfig: {
        temperature: request.temperature ?? 0.1,
        responseMimeType: "application/json",
        ...(request.jsonSchema ? { responseSchema: request.jsonSchema } : {}),
        ...(request.maxTokens ? { maxOutputTokens: request.maxTokens } : {}),
      },
    };

    if (request.systemPrompt) {
      body.systemInstruction = {
        parts: [{ text: request.systemPrompt }],
      };
    }

    const timeout = request.timeoutMs || 60000;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeout),
      });
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        throw new AITimeoutError("gemini", `Gemini timed out after ${timeout}ms`);
      }
      throw new AIConnectionError("gemini", err instanceof Error ? err.message : "Fetch failed");
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw this.mapError(res.status, errBody);
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!rawText.trim()) {
      throw new AIInvalidOutputError("gemini", "Gemini returned empty response");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Sometimes models wrap json in markdown block: ```json ... ```
      const cleaned = rawText.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, "$1").trim();
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        throw new AIInvalidOutputError("gemini", "Failed to parse JSON output from Gemini");
      }
    }

    let validated: T;
    if (request.validator) {
      try {
        validated = request.validator(parsed);
      } catch (valErr) {
        throw new AIInvalidOutputError(
          "gemini",
          `Schema validation failed: ${valErr instanceof Error ? valErr.message : "Invalid data"}`
        );
      }
    } else {
      validated = parsed as T;
    }

    return {
      data: validated,
      rawText,
      promptTokens: data.usageMetadata?.promptTokenCount,
      completionTokens: data.usageMetadata?.candidatesTokenCount,
      totalTokens: data.usageMetadata?.totalTokenCount,
      model,
    };
  }
}
