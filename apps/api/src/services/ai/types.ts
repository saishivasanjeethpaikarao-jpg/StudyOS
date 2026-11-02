import type { AIModelMetadata, AIProviderId } from "@open-sunsama/types";

export class AIError extends Error {
  readonly isOperational = true;
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider: AIProviderId,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = "AIError";
  }
}

export class AIRateLimitError extends AIError {
  constructor(provider: AIProviderId, message: string = "AI rate limit reached", public readonly resetSeconds?: number) {
    super(message, "RATE_LIMIT_EXCEEDED", provider, 429, true);
    this.name = "AIRateLimitError";
  }
}

export class AIAuthenticationError extends AIError {
  constructor(provider: AIProviderId, message: string = "Invalid AI API key or unauthorized") {
    super(message, "AUTHENTICATION_FAILED", provider, 401, false);
    this.name = "AIAuthenticationError";
  }
}

export class AIQuotaError extends AIError {
  constructor(provider: AIProviderId, message: string = "AI quota exceeded or billing inactive") {
    super(message, "QUOTA_EXCEEDED", provider, 402, false);
    this.name = "AIQuotaError";
  }
}

export class AITimeoutError extends AIError {
  constructor(provider: AIProviderId, message: string = "AI request timed out") {
    super(message, "TIMEOUT", provider, 504, true);
    this.name = "AITimeoutError";
  }
}

export class AIInvalidOutputError extends AIError {
  constructor(provider: AIProviderId, message: string = "Model returned malformed or invalid output") {
    super(message, "INVALID_OUTPUT", provider, 502, true);
    this.name = "AIInvalidOutputError";
  }
}

export class AIConnectionError extends AIError {
  constructor(provider: AIProviderId, message: string = "Could not connect to AI service") {
    super(message, "CONNECTION_FAILED", provider, 503, true);
    this.name = "AIConnectionError";
  }
}

export interface AITextRequest {
  systemPrompt?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface AITextResponse {
  text: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  model: string;
}

export interface AIStructuredRequest<T> {
  systemPrompt?: string;
  prompt: string;
  jsonSchema?: Record<string, unknown>;
  validator?: (data: unknown) => T;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface AIStructuredResponse<T> {
  data: T;
  rawText: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  model: string;
}

export interface AIProviderExecutionConfig {
  apiKey: string;
  model: string;
  customEndpoint?: string | null;
}

export interface AIProvider {
  readonly id: AIProviderId;
  readonly displayName: string;
  getModels(): AIModelMetadata[];
  getDefaultModel(): string;
  testConnection(
    apiKey: string,
    customEndpoint?: string | null
  ): Promise<{ ok: boolean; error?: string; models?: string[] }>;
  generateText(
    request: AITextRequest,
    config: AIProviderExecutionConfig
  ): Promise<AITextResponse>;
  generateStructured<T>(
    request: AIStructuredRequest<T>,
    config: AIProviderExecutionConfig
  ): Promise<AIStructuredResponse<T>>;
}
