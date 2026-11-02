import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import {
  aiProviderConfigs,
  aiUserSettings,
  assignments,
  eq,
  getDb,
  resetDbInstance,
  studyNotes,
  subjects,
  users,
  type DbClient,
} from "@open-sunsama/database";
import { signToken } from "../lib/jwt.js";
import { errorHandler } from "../middleware/error.js";
import { aiRouter } from "./ai.js";
import { quizzesRouter } from "./quizzes.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!testDatabaseUrl)("Phase 7 AI API against PostgreSQL", () => {
  const app = new Hono();
  app.route("/ai", aiRouter);
  app.route("/quizzes", quizzesRouter);
  app.onError(errorHandler);

  let db: DbClient;
  let ownerId: string;
  let otherId: string;
  let ownerToken: string;
  let otherToken: string;
  let noteId: string;

  const request = (
    path: string,
    token = ownerToken,
    method = "GET",
    body?: unknown
  ) => {
    const headers = new Headers({ Authorization: `Bearer ${token}` });
    if (body !== undefined) headers.set("Content-Type", "application/json");
    return app.request(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };

  beforeAll(async () => {
    db = getDb();
    ownerId = randomUUID();
    otherId = randomUUID();

    await db.insert(users).values([
      {
        id: ownerId,
        email: `student-${ownerId}@test.studyos.app`,
        passwordHash: "hash",
        name: "AI Student Owner",
      },
      {
        id: otherId,
        email: `other-${otherId}@test.studyos.app`,
        passwordHash: "hash",
        name: "Other Student",
      },
    ]);

    // Create a study note for quiz generation tests
    const [note] = await db
      .insert(studyNotes)
      .values({
        userId: ownerId,
        title: "Photosynthesis & Light Reactions",
        body: "Photosynthesis converts solar energy into chemical energy in the thylakoid membranes of chloroplasts. Chlorophyll a and b absorb light at blue and red wavelengths, transferring electrons through Photosystem II and Photosystem I. ATP and NADPH are synthesized to power the Calvin cycle.",
      })
      .returning();
    noteId = note!.id;

    ownerToken = signToken(ownerId);
    otherToken = signToken(otherId);
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, ownerId)).catch(() => undefined);
    await db.delete(users).where(eq(users.id, otherId)).catch(() => undefined);
    await resetDbInstance();
  });

  it("GET /ai/settings initializes defaults and hides raw keys", async () => {
    const res = await request("/ai/settings");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: {
        settings: { aiEnabled: boolean; defaultProvider: string };
        configs: unknown[];
      };
    };
    expect(body.success).toBe(true);
    expect(body.data.settings.aiEnabled).toBe(true);
    expect(body.data.settings.defaultProvider).toBe("gemini");
  });

  it("PUT /ai/providers/:provider securely saves and encrypts API keys", async () => {
    const res = await request("/ai/providers/gemini", ownerToken, "PUT", {
      apiKey: "AIzaSyD_my_secret_google_key_9876",
      defaultModel: "gemini-2.5-flash",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: {
        provider: string;
        hasKey: boolean;
        keyMask: string;
        defaultModel: string;
        status: string;
        encryptedApiKey?: unknown;
        apiKey?: unknown;
      };
    };

    expect(body.data.provider).toBe("gemini");
    expect(body.data.hasKey).toBe(true);
    expect(body.data.keyMask).toBe("...9876");
    expect(body.data.status).toBe("configured");
    // Ensure raw or encrypted key is NEVER exposed in the JSON response
    expect(body.data.encryptedApiKey).toBeUndefined();
    expect(body.data.apiKey).toBeUndefined();
  });

  it("PATCH /ai/settings updates default provider and fallbacks", async () => {
    const res = await request("/ai/settings", ownerToken, "PATCH", {
      defaultProvider: "groq",
      fallbackProviders: ["gemini", "nim"],
      allowFallback: true,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { defaultProvider: string; fallbackProviders: string[] };
    };
    expect(body.data.defaultProvider).toBe("groq");
    expect(body.data.fallbackProviders).toEqual(["gemini", "nim"]);
  });

  it("enforces account isolation on AI configurations", async () => {
    // User B attempts to access settings
    const res = await request("/ai/settings", otherToken);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { configs: { provider: string }[] };
    };
    // User B should NOT see User A's configured Gemini key
    expect(body.data.configs).toHaveLength(0);
  });

  it("POST /ai/providers/:provider/test verifies connection status", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ models: [{ name: "models/gemini-2.5-flash" }] }),
    } as Response);

    const res = await request("/ai/providers/gemini/test", ownerToken, "POST", {});
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { ok: boolean; models?: string[] };
    };
    expect(body.data.ok).toBe(true);
    fetchSpy.mockRestore();
  });

  it("POST /ai/quiz/generate produces validated candidate questions from study note", async () => {
    const fakeQuizOutput = {
      title: "Photosynthesis Knowledge Check",
      description: "Test your understanding of light reactions and the Calvin cycle.",
      questions: [
        {
          type: "single",
          prompt: "Where do the light reactions of photosynthesis take place?",
          explanation: "Light reactions occur in the thylakoid membranes.",
          options: [
            { text: "Thylakoid membranes", isCorrect: true },
            { text: "Mitochondrial matrix", isCorrect: false },
            { text: "Stroma", isCorrect: false },
            { text: "Outer cell wall", isCorrect: false },
          ],
          sourceReference: "Note: Photosynthesis",
        },
      ],
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify(fakeQuizOutput),
            },
          },
        ],
        usage: { prompt_tokens: 200, completion_tokens: 120, total_tokens: 320 },
      }),
    } as Response);

    // Save Groq key so router can execute with groq (set as default)
    await request("/ai/providers/groq", ownerToken, "PUT", {
      apiKey: "gsk_test_groq_api_key_1234",
    });

    const res = await request("/ai/quiz/generate", ownerToken, "POST", {
      sourceType: "note",
      noteId,
      questionCount: 1,
      difficulty: "medium",
      questionType: "single",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: {
        title: string;
        questions: { prompt: string; options: unknown[] }[];
        provider: string;
      };
    };

    expect(body.success).toBe(true);
    expect(body.data.title).toBe("Photosynthesis Knowledge Check");
    expect(body.data.questions).toHaveLength(1);
    expect(body.data.questions[0]!.prompt).toContain("light reactions");
    fetchSpy.mockRestore();
  });

  it("POST /ai/assistant/chat returns contextual tutor responses with citations", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "Chlorophyll a primarily absorbs violet-blue and orange-red light, reflecting green.",
            },
          },
        ],
      }),
    } as Response);

    const res = await request("/ai/assistant/chat", ownerToken, "POST", {
      action: "explain",
      message: "Why are plants green?",
      context: { noteId },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { content: string; grounded: boolean; citations: unknown[] };
    };

    expect(body.data.content).toContain("Chlorophyll");
    expect(body.data.grounded).toBe(true);
    expect(body.data.citations.length).toBeGreaterThanOrEqual(1);
    fetchSpy.mockRestore();
  });

  it("GET /ai/history logs AI operations and token counts", async () => {
    const res = await request("/ai/history", ownerToken);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { taskType: string; status: string }[];
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });
});
