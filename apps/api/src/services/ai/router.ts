import {
  aiProviderConfigs,
  aiTaskHistory,
  aiUserSettings,
  and,
  eq,
  getDb,
} from "@open-sunsama/database";
import type { AIModelCapability, AIProviderId } from "@open-sunsama/types";
import { getProvider } from "./providers/index.js";
import { decryptApiKey } from "./secrets.js";
import {
  AIError,
  type AIProvider,
  type AIProviderExecutionConfig,
  type AIStructuredRequest,
  type AIStructuredResponse,
  type AITextRequest,
  type AITextResponse,
} from "./types.js";

export interface ExecutionOptions {
  taskType: AIModelCapability;
  preferredProvider?: AIProviderId;
  preferredModel?: string;
  allowFallback?: boolean;
}

export interface RouterExecutionResult<T> {
  result: T;
  provider: AIProviderId;
  model: string;
  fallbackFrom?: AIProviderId;
}

export class AIRouter {
  /**
   * Load active AI settings and provider configs for a specific user.
   */
  static async getUserAiContext(userId: string) {
    const db = getDb();
    const [settings] = await db
      .select()
      .from(aiUserSettings)
      .where(eq(aiUserSettings.userId, userId))
      .limit(1);

    const configs = await db
      .select()
      .from(aiProviderConfigs)
      .where(and(eq(aiProviderConfigs.userId, userId), eq(aiProviderConfigs.isEnabled, true)));

    const effectiveSettings = settings || {
      aiEnabled: true,
      defaultProvider: "gemini" as AIProviderId,
      fallbackProviders: ["groq", "nim"] as AIProviderId[],
      allowFallback: true,
    };

    return { settings: effectiveSettings, configs };
  }

  /**
   * Execute a structured AI request with intelligent retries and configured fallback.
   */
  static async executeStructured<T>(
    userId: string,
    request: AIStructuredRequest<T>,
    options: ExecutionOptions
  ): Promise<RouterExecutionResult<AIStructuredResponse<T>>> {
    const db = getDb();
    const { settings, configs } = await this.getUserAiContext(userId);

    if (!settings.aiEnabled) {
      throw new AIError(
        "AI features are currently disabled in your account settings.",
        "AI_DISABLED",
        settings.defaultProvider as AIProviderId,
        400,
        false
      );
    }

    // Determine candidate providers in order: primary first, then fallbacks
    const primaryId = (options.preferredProvider || settings.defaultProvider) as AIProviderId;
    const candidateIds: AIProviderId[] = [primaryId];

    const canFallback = options.allowFallback ?? settings.allowFallback;
    if (canFallback && Array.isArray(settings.fallbackProviders)) {
      for (const fb of settings.fallbackProviders) {
        if (!candidateIds.includes(fb as AIProviderId)) {
          candidateIds.push(fb as AIProviderId);
        }
      }
    }

    let lastError: unknown = null;
    let fallbackFrom: AIProviderId | undefined;

    for (let i = 0; i < candidateIds.length; i++) {
      const providerId = candidateIds[i]!;
      const configRow = configs.find((c) => c.provider === providerId);

      // Skip provider if unconfigured or has no key
      if (!configRow || !configRow.encryptedApiKey) {
        continue;
      }

      let apiKey: string;
      try {
        apiKey = decryptApiKey(configRow.encryptedApiKey);
      } catch {
        continue;
      }

      const provider = getProvider(providerId);
      const model =
        (i === 0 && options.preferredModel) ||
        configRow.defaultModel ||
        provider.getDefaultModel();

      const execConfig: AIProviderExecutionConfig = {
        apiKey,
        model,
        customEndpoint: configRow.customEndpoint,
      };

      // Try executing with 1 bounded retry on transient failure
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await provider.generateStructured(request, execConfig);

          // Log success to task history
          await db
            .insert(aiTaskHistory)
            .values({
              userId,
              taskType: options.taskType,
              provider: providerId,
              model,
              promptTokens: res.promptTokens,
              completionTokens: res.completionTokens,
              totalTokens: res.totalTokens,
              status: fallbackFrom ? "fallback_used" : "completed",
              fallbackFrom: fallbackFrom || null,
            })
            .catch(() => undefined);

          return {
            result: res,
            provider: providerId,
            model,
            fallbackFrom,
          };
        } catch (err: unknown) {
          lastError = err;
          const isRetryable = err instanceof AIError && err.retryable;
          if (isRetryable && attempt === 0) {
            // Short backoff before retry
            await new Promise((resolve) => setTimeout(resolve, 600));
            continue;
          }
          break; // Move to next provider
        }
      }

      if (!fallbackFrom) {
        fallbackFrom = providerId;
      }
    }

    // If all providers failed, log failure and rethrow
    const errorMsg = lastError instanceof Error ? lastError.message : "All AI providers failed";
    await db
      .insert(aiTaskHistory)
      .values({
        userId,
        taskType: options.taskType,
        provider: primaryId,
        model: options.preferredModel || "unknown",
        status: "failed",
        errorMessage: errorMsg,
      })
      .catch(() => undefined);

    if (lastError instanceof AIError) {
      throw lastError;
    }
    throw new AIError(
      lastError instanceof Error ? lastError.message : "AI service unavailable",
      "ALL_PROVIDERS_FAILED",
      primaryId,
      503,
      false
    );
  }

  /**
   * Execute a free-text AI request with intelligent retries and configured fallback.
   */
  static async executeText(
    userId: string,
    request: AITextRequest,
    options: ExecutionOptions
  ): Promise<RouterExecutionResult<AITextResponse>> {
    const db = getDb();
    const { settings, configs } = await this.getUserAiContext(userId);

    if (!settings.aiEnabled) {
      throw new AIError(
        "AI features are currently disabled in your account settings.",
        "AI_DISABLED",
        settings.defaultProvider as AIProviderId,
        400,
        false
      );
    }

    const primaryId = (options.preferredProvider || settings.defaultProvider) as AIProviderId;
    const candidateIds: AIProviderId[] = [primaryId];

    const canFallback = options.allowFallback ?? settings.allowFallback;
    if (canFallback && Array.isArray(settings.fallbackProviders)) {
      for (const fb of settings.fallbackProviders) {
        if (!candidateIds.includes(fb as AIProviderId)) {
          candidateIds.push(fb as AIProviderId);
        }
      }
    }

    let lastError: unknown = null;
    let fallbackFrom: AIProviderId | undefined;

    for (let i = 0; i < candidateIds.length; i++) {
      const providerId = candidateIds[i]!;
      const configRow = configs.find((c) => c.provider === providerId);

      if (!configRow || !configRow.encryptedApiKey) {
        continue;
      }

      let apiKey: string;
      try {
        apiKey = decryptApiKey(configRow.encryptedApiKey);
      } catch {
        continue;
      }

      const provider = getProvider(providerId);
      const model =
        (i === 0 && options.preferredModel) ||
        configRow.defaultModel ||
        provider.getDefaultModel();

      const execConfig: AIProviderExecutionConfig = {
        apiKey,
        model,
        customEndpoint: configRow.customEndpoint,
      };

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await provider.generateText(request, execConfig);

          await db
            .insert(aiTaskHistory)
            .values({
              userId,
              taskType: options.taskType,
              provider: providerId,
              model,
              promptTokens: res.promptTokens,
              completionTokens: res.completionTokens,
              totalTokens: res.totalTokens,
              status: fallbackFrom ? "fallback_used" : "completed",
              fallbackFrom: fallbackFrom || null,
            })
            .catch(() => undefined);

          return {
            result: res,
            provider: providerId,
            model,
            fallbackFrom,
          };
        } catch (err: unknown) {
          lastError = err;
          const isRetryable = err instanceof AIError && err.retryable;
          if (isRetryable && attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 600));
            continue;
          }
          break;
        }
      }

      if (!fallbackFrom) {
        fallbackFrom = providerId;
      }
    }

    const errorMsg = lastError instanceof Error ? lastError.message : "All AI providers failed";
    await db
      .insert(aiTaskHistory)
      .values({
        userId,
        taskType: options.taskType,
        provider: primaryId,
        model: options.preferredModel || "unknown",
        status: "failed",
        errorMessage: errorMsg,
      })
      .catch(() => undefined);

    if (lastError instanceof AIError) {
      throw lastError;
    }
    throw new AIError(
      lastError instanceof Error ? lastError.message : "AI service unavailable",
      "ALL_PROVIDERS_FAILED",
      primaryId,
      503,
      false
    );
  }
}
