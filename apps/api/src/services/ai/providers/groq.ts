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

const GROQ_MODELS: AIModelMetadata[] = [
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B Versatile",
    provider: "groq",
    contextWindow: 128_000,
    maxOutputTokens: 8192,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    recommendedFor: ["quiz_generation", "study_planning", "learning_assistant", "concept_extraction"],
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B Instant",
    provider: "groq",
    contextWindow: 128_000,
    maxOutputTokens: 8192,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    recommendedFor: ["learning_assistant"],
  },
  {
    id: "mixtral-8x7b-32768",
    name: "Mixtral 8x7B",
    provider: "groq",
    contextWindow: 32_768,
    maxOutputTokens: 4096,
    supportsStructuredOutput: true,
    supportsStreaming: true,
    recommendedFor: ["quiz_generation"],
  },
];

export class GroqProvider implements AIProvider {
  readonly id = "groq";
  readonly displayName = "Groq";

  getModels(): AIModelMetadata[] {
    return GROQ_MODELS;
  }

  getDefaultModel(): string {
    return "llama-3.3-70b-versatile";
  }

  async testConnection(
    apiKey: string
  ): Promise<{ ok: boolean; error?: string; models?: string[] }> {
    if (!apiKey?.trim()) {
      return { ok: false, error: "API key is empty" };
    }
    try {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        return {
          ok: false,
          error: body.error?.message || `HTTP ${res.status}: ${res.statusText}`,
        };
      }
      const data = (await res.json()) as { data?: { id: string }[] };
      const modelNames = (data.data || []).map((m) => m.id);
      return { ok: true, models: modelNames };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      return { ok: false, error: msg };
    }
  }

  private mapError(status: number, errorData: unknown, headers?: Headers): AIError {
    const errObj = (typeof errorData === "object" && errorData !== null ? errorData : {}) as {
      error?: { message?: string; code?: string };
    };
    const message = errObj.error?.message || `Groq API error (${status})`;
    if (status === 401 || status === 403) {
      return new AIAuthenticationError("groq", message);
    }
    if (status === 429) {
      const retryAfter = headers?.get("retry-after");
      const seconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
      return new AIRateLimitError("groq", message, Number.isFinite(seconds) ? seconds : undefined);
    }
    if (status === 402) {
      return new AIQuotaError("groq", message);
    }
    if (status === 504 || status === 408) {
      return new AITimeoutError("groq", message);
    }
    return new AIConnectionError("groq", message);
  }

  async generateText(
    request: AITextRequest,
    config: AIProviderExecutionConfig
  ): Promise<AITextResponse> {
    const model = config.model || this.getDefaultModel();
    const url = "https://api.groq.com/openai/v1/chat/completions";

    const messages: { role: string; content: string }[] = [];
    if (request.systemPrompt) {
      messages.push({ role: "system", content: request.systemPrompt });
    }
    messages.push({ role: "user", content: request.prompt });

    const timeout = request.timeoutMs || 45000;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey.trim()}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: request.temperature ?? 0.2,
          ...(request.maxTokens ? { max_tokens: request.maxTokens } : {}),
        }),
        signal: AbortSignal.timeout(timeout),
      });
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        throw new AITimeoutError("groq", `Groq request timed out after ${timeout}ms`);
      }
      throw new AIConnectionError("groq", err instanceof Error ? err.message : "Fetch failed");
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw this.mapError(res.status, errBody, res.headers);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    const text = data.choices?.[0]?.message?.content ?? "";
    return {
      text,
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
      totalTokens: data.usage?.total_tokens,
      model,
    };
  }

  async generateStructured<T>(
    request: AIStructuredRequest<T>,
    config: AIProviderExecutionConfig
  ): Promise<AIStructuredResponse<T>> {
    const model = config.model || this.getDefaultModel();
    const url = "https://api.groq.com/openai/v1/chat/completions";

    const systemPrompt = [
      request.systemPrompt || "You are an accurate, deterministic academic AI assistant.",
      "Respond strictly with valid, parseable JSON conforming to the requested schema. Do not include markdown codeblocks or conversational filler.",
    ].join("\n\n");

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: request.prompt },
    ];

    const timeout = request.timeoutMs || 60000;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey.trim()}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: request.temperature ?? 0.1,
          response_format: { type: "json_object" },
          ...(request.maxTokens ? { max_tokens: request.maxTokens } : {}),
        }),
        signal: AbortSignal.timeout(timeout),
      });
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        throw new AITimeoutError("groq", `Groq timed out after ${timeout}ms`);
      }
      throw new AIConnectionError("groq", err instanceof Error ? err.message : "Fetch failed");
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw this.mapError(res.status, errBody, res.headers);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    const rawText = data.choices?.[0]?.message?.content ?? "";
    if (!rawText.trim()) {
      throw new AIInvalidOutputError("groq", "Groq returned empty response");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const cleaned = rawText.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, "$1").trim();
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        throw new AIInvalidOutputError("groq", "Failed to parse JSON output from Groq");
      }
    }

    let validated: T;
    if (request.validator) {
      try {
        validated = request.validator(parsed);
      } catch (valErr) {
        throw new AIInvalidOutputError(
          "groq",
          `Schema validation failed: ${valErr instanceof Error ? valErr.message : "Invalid data"}`
        );
      }
    } else {
      validated = parsed as T;
    }

    return {
      data: validated,
      rawText,
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
      totalTokens: data.usage?.total_tokens,
      model,
    };
  }
}
