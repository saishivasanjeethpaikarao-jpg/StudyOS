import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  aiProviderConfigs,
  aiTaskHistory,
  aiUserSettings,
  and,
  desc,
  eq,
  getDb,
} from "@open-sunsama/database";
import type { AIProviderId } from "@open-sunsama/types";
import { NotFoundError, ValidationError } from "@open-sunsama/utils";
import { jwtAuth, type AuthVariables } from "../middleware/auth.js";
import {
  getAllModels,
  getAllProviders,
  getProvider,
} from "../services/ai/providers/index.js";
import { encryptApiKey, maskApiKey, decryptApiKey } from "../services/ai/secrets.js";
import { QuizGeneratorService } from "../services/ai/quiz-generator.js";
import { StudyPlannerAssistantService } from "../services/ai/study-planner-assistant.js";
import { LearningAssistantService } from "../services/ai/learning-assistant.js";

const aiRouter = new Hono<{ Variables: AuthVariables }>();
aiRouter.use("*", jwtAuth);

const providerParam = z.object({
  provider: z.enum(["gemini", "groq", "nim"]),
});

const updateSettingsSchema = z
  .object({
    aiEnabled: z.boolean().optional(),
    defaultProvider: z.enum(["gemini", "groq", "nim"]).optional(),
    fallbackProviders: z.array(z.enum(["gemini", "groq", "nim"])).max(3).optional(),
    allowFallback: z.boolean().optional(),
  })
  .strict();

const updateProviderSchema = z
  .object({
    apiKey: z.string().trim().min(1).max(1024).optional(),
    defaultModel: z.string().trim().max(128).nullable().optional(),
    customEndpoint: z.string().trim().url().max(512).nullable().optional(),
    isEnabled: z.boolean().optional(),
  })
  .strict();

const testProviderSchema = z
  .object({
    apiKey: z.string().trim().max(1024).optional(),
    customEndpoint: z.string().trim().max(512).nullable().optional(),
  })
  .strict()
  .optional();

const quizGenerateSchema = z
  .object({
    sourceType: z.enum(["resource", "note", "text"]),
    resourceId: z.string().uuid().optional(),
    noteId: z.string().uuid().optional(),
    pastedText: z.string().max(100_000).optional(),
    subjectId: z.string().uuid().optional(),
    assignmentId: z.string().uuid().optional(),
    questionCount: z.number().int().min(1).max(20).default(5),
    difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
    questionType: z.enum(["single", "multiple", "mixed"]).default("mixed"),
    focusTopics: z.string().max(1000).optional(),
  })
  .strict();

const planSuggestSchema = z
  .object({
    assignmentId: z.string().uuid(),
    timezone: z.string().min(1).max(64),
    notes: z.string().max(2000).optional(),
  })
  .strict();

const assistantSchema = z
  .object({
    action: z.enum(["chat", "explain", "summarize", "revision_notes", "practice"]).default("chat"),
    message: z.string().trim().min(1).max(10_000),
    context: z
      .object({
        subjectId: z.string().uuid().optional(),
        assignmentId: z.string().uuid().optional(),
        resourceId: z.string().uuid().optional(),
        noteId: z.string().uuid().optional(),
        quizId: z.string().uuid().optional(),
        selectedText: z.string().max(10_000).optional(),
      })
      .strict()
      .optional(),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().max(10_000),
        })
      )
      .max(10)
      .optional(),
  })
  .strict();

/**
 * GET /ai/settings
 * Fetch global user AI preferences and configured providers (keys masked).
 */
aiRouter.get("/settings", async (c) => {
  const db = getDb();
  const userId = c.get("userId");

  let [settings] = await db
    .select()
    .from(aiUserSettings)
    .where(eq(aiUserSettings.userId, userId))
    .limit(1);

  if (!settings) {
    const [created] = await db
      .insert(aiUserSettings)
      .values({
        userId,
        aiEnabled: true,
        defaultProvider: "gemini",
        fallbackProviders: ["groq", "nim"],
        allowFallback: true,
      })
      .returning();
    settings = created!;
  }

  const configs = await db
    .select({
      id: aiProviderConfigs.id,
      userId: aiProviderConfigs.userId,
      provider: aiProviderConfigs.provider,
      keyMask: aiProviderConfigs.keyMask,
      defaultModel: aiProviderConfigs.defaultModel,
      customEndpoint: aiProviderConfigs.customEndpoint,
      isEnabled: aiProviderConfigs.isEnabled,
      status: aiProviderConfigs.status,
      lastVerifiedAt: aiProviderConfigs.lastVerifiedAt,
      lastError: aiProviderConfigs.lastError,
      createdAt: aiProviderConfigs.createdAt,
      updatedAt: aiProviderConfigs.updatedAt,
      hasKey: aiProviderConfigs.encryptedApiKey,
    })
    .from(aiProviderConfigs)
    .where(eq(aiProviderConfigs.userId, userId));

  const safeConfigs = configs.map((c) => ({
    ...c,
    hasKey: Boolean(c.hasKey),
  }));

  return c.json({
    success: true,
    data: {
      settings,
      configs: safeConfigs,
    },
  });
});

/**
 * PATCH /ai/settings
 * Update global AI feature toggle, default provider, or fallback preferences.
 */
aiRouter.patch("/settings", zValidator("json", updateSettingsSchema), async (c) => {
  const db = getDb();
  const userId = c.get("userId");
  const updates = c.req.valid("json");

  const [existing] = await db
    .select()
    .from(aiUserSettings)
    .where(eq(aiUserSettings.userId, userId))
    .limit(1);

  let result;
  if (!existing) {
    [result] = await db
      .insert(aiUserSettings)
      .values({
        userId,
        ...updates,
      })
      .returning();
  } else {
    [result] = await db
      .update(aiUserSettings)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(aiUserSettings.userId, userId))
      .returning();
  }

  return c.json({ success: true, data: result });
});

/**
 * GET /ai/providers
 * Returns registry of supported AI providers and their models metadata.
 */
aiRouter.get("/providers", async (c) => {
  const providers = getAllProviders().map((p) => ({
    id: p.id,
    displayName: p.displayName,
    defaultModel: p.getDefaultModel(),
    models: p.getModels(),
  }));
  return c.json({ success: true, data: providers });
});

/**
 * PUT /ai/providers/:provider
 * Save or update provider configuration and encrypted API key.
 */
aiRouter.put(
  "/providers/:provider",
  zValidator("param", providerParam),
  zValidator("json", updateProviderSchema),
  async (c) => {
    const db = getDb();
    const userId = c.get("userId");
    const { provider } = c.req.valid("param");
    const body = c.req.valid("json");

    const [existing] = await db
      .select()
      .from(aiProviderConfigs)
      .where(
        and(
          eq(aiProviderConfigs.userId, userId),
          eq(aiProviderConfigs.provider, provider)
        )
      )
      .limit(1);

    const valuesToUpdate: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.apiKey) {
      valuesToUpdate.encryptedApiKey = encryptApiKey(body.apiKey);
      valuesToUpdate.keyMask = maskApiKey(body.apiKey);
      valuesToUpdate.status = "configured";
      valuesToUpdate.lastError = null;
    }
    if (body.defaultModel !== undefined) {
      valuesToUpdate.defaultModel = body.defaultModel;
    }
    if (body.customEndpoint !== undefined) {
      valuesToUpdate.customEndpoint = body.customEndpoint;
    }
    if (body.isEnabled !== undefined) {
      valuesToUpdate.isEnabled = body.isEnabled;
    }

    let saved;
    if (existing) {
      [saved] = await db
        .update(aiProviderConfigs)
        .set(valuesToUpdate)
        .where(
          and(
            eq(aiProviderConfigs.userId, userId),
            eq(aiProviderConfigs.provider, provider)
          )
        )
        .returning();
    } else {
      [saved] = await db
        .insert(aiProviderConfigs)
        .values({
          userId,
          provider,
          ...valuesToUpdate,
        })
        .returning();
    }

    // Never return the encryptedApiKey back
    const { encryptedApiKey, ...safeConfig } = saved!;
    return c.json({
      success: true,
      data: {
        ...safeConfig,
        hasKey: Boolean(encryptedApiKey),
      },
    });
  }
);

/**
 * DELETE /ai/providers/:provider
 * Remove provider API key and configuration.
 */
aiRouter.delete("/providers/:provider", zValidator("param", providerParam), async (c) => {
  const db = getDb();
  const userId = c.get("userId");
  const { provider } = c.req.valid("param");

  await db
    .delete(aiProviderConfigs)
    .where(
      and(
        eq(aiProviderConfigs.userId, userId),
        eq(aiProviderConfigs.provider, provider)
      )
    );

  return c.json({ success: true, message: "Provider removed successfully" });
});

/**
 * POST /ai/providers/:provider/test
 * Test connectivity with provider using provided key or saved key.
 */
aiRouter.post(
  "/providers/:provider/test",
  zValidator("param", providerParam),
  zValidator("json", testProviderSchema),
  async (c) => {
    const db = getDb();
    const userId = c.get("userId");
    const { provider: providerId } = c.req.valid("param");
    const body = c.req.valid("json");

    let apiKey = body?.apiKey;
    let customEndpoint = body?.customEndpoint;

    // If key not provided in body, load from DB
    if (!apiKey) {
      const [existing] = await db
        .select()
        .from(aiProviderConfigs)
        .where(
          and(
            eq(aiProviderConfigs.userId, userId),
            eq(aiProviderConfigs.provider, providerId)
          )
        )
        .limit(1);

      if (!existing || !existing.encryptedApiKey) {
        throw new ValidationError("No API key configured for this provider");
      }
      apiKey = decryptApiKey(existing.encryptedApiKey);
      if (!customEndpoint && existing.customEndpoint) {
        customEndpoint = existing.customEndpoint;
      }
    }

    const provider = getProvider(providerId as AIProviderId);
    const testResult = await provider.testConnection(apiKey, customEndpoint);

    // Update status in DB
    await db
      .update(aiProviderConfigs)
      .set({
        status: testResult.ok ? "verified" : "error",
        lastVerifiedAt: testResult.ok ? new Date() : undefined,
        lastError: testResult.ok ? null : testResult.error || "Connection failed",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(aiProviderConfigs.userId, userId),
          eq(aiProviderConfigs.provider, providerId)
        )
      )
      .catch(() => undefined);

    return c.json({
      success: true,
      data: testResult,
    });
  }
);

/**
 * POST /ai/quiz/generate
 * Generates grounded, validated Knowledge Check candidate questions.
 */
aiRouter.post("/quiz/generate", zValidator("json", quizGenerateSchema), async (c) => {
  const userId = c.get("userId");
  const input = c.req.valid("json");

  const candidate = await QuizGeneratorService.generateQuizCandidate(userId, input);
  return c.json({ success: true, data: candidate });
});

/**
 * POST /ai/plan/suggest
 * Analyzes deadlines and workload, suggesting study session allocations
 * feeding directly into the canonical deterministic planner preview.
 */
aiRouter.post("/plan/suggest", zValidator("json", planSuggestSchema), async (c) => {
  const userId = c.get("userId");
  const input = c.req.valid("json");

  const suggestion = await StudyPlannerAssistantService.suggestStudyPlan(userId, input);
  return c.json({ success: true, data: suggestion });
});

/**
 * POST /ai/assistant/chat
 * Conversational learning assistant with optional attached academic context.
 */
aiRouter.post("/assistant/chat", zValidator("json", assistantSchema), async (c) => {
  const userId = c.get("userId");
  const req = c.req.valid("json");

  const response = await LearningAssistantService.processAssistantRequest(userId, req);
  return c.json({ success: true, data: response });
});

/**
 * GET /ai/history
 * Fetch audit history of AI operations and token usage.
 */
aiRouter.get("/history", async (c) => {
  const db = getDb();
  const userId = c.get("userId");

  const history = await db
    .select()
    .from(aiTaskHistory)
    .where(eq(aiTaskHistory.userId, userId))
    .orderBy(desc(aiTaskHistory.createdAt))
    .limit(50);

  return c.json({ success: true, data: history });
});

export { aiRouter };
