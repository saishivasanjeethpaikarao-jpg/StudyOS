import { describe, expect, it, vi } from "vitest";
import { decryptApiKey, encryptApiKey, maskApiKey } from "./secrets.js";
import { GeminiProvider } from "./providers/gemini.js";
import { GroqProvider } from "./providers/groq.js";
import { NimProvider } from "./providers/nim.js";
import { getAllModels, getAllProviders, getProvider } from "./providers/index.js";
import { chunkAcademicText } from "./ingestion/chunking.js";
import { AIRateLimitError } from "./types.js";

describe("AI Secrets Management & Cryptography", () => {
  it("encrypts and decrypts API keys deterministically using AES-256-GCM", () => {
    const originalKey = "sk-ant-api03-test-secret-key-123456789";
    const encrypted = encryptApiKey(originalKey);

    expect(encrypted).not.toEqual(originalKey);
    expect(encrypted.split(":")).toHaveLength(3); // iv:tag:ciphertext

    const decrypted = decryptApiKey(encrypted);
    expect(decrypted).toEqual(originalKey);
  });

  it("fails to decrypt tampered ciphertexts", () => {
    const originalKey = "AIzaSyD-gemini-secret-api-key";
    const encrypted = encryptApiKey(originalKey);
    const parts = encrypted.split(":");
    // Tamper with the ciphertext guaranteed
    const firstChar = parts[2]!.charAt(0);
    const flippedChar = firstChar === "0" ? "1" : "0";
    const tamperedPayload = flippedChar + parts[2]!.slice(1);
    const tampered = `${parts[0]}:${parts[1]}:${tamperedPayload}`;

    expect(() => decryptApiKey(tampered)).toThrow();
  });

  it("masks API keys safely preserving only a safe suffix", () => {
    expect(maskApiKey("gsk_1234567890abcdef")).toEqual("...cdef");
    expect(maskApiKey("AIzaSyD_abcd")).toEqual("...abcd");
    expect(maskApiKey("short")).toEqual("...rt");
    expect(maskApiKey("")).toEqual("");
  });
});

describe("AI Provider Registry & Adapters", () => {
  it("registers Gemini, Groq, and NVIDIA NIM providers", () => {
    const providers = getAllProviders();
    expect(providers.map((p) => p.id)).toEqual(["gemini", "groq", "nim"]);

    expect(getProvider("gemini")).toBeInstanceOf(GeminiProvider);
    expect(getProvider("groq")).toBeInstanceOf(GroqProvider);
    expect(getProvider("nim")).toBeInstanceOf(NimProvider);
  });

  it("exposes verified models metadata with context limits and capabilities", () => {
    const models = getAllModels();
    expect(models.length).toBeGreaterThanOrEqual(8);

    const flash = models.find((m) => m.id === "gemini-2.5-flash");
    expect(flash).toBeDefined();
    expect(flash?.contextWindow).toBe(1_048_576);
    expect(flash?.supportsStructuredOutput).toBe(true);

    const groqLlama = models.find((m) => m.id === "llama-3.3-70b-versatile");
    expect(groqLlama).toBeDefined();
    expect(groqLlama?.contextWindow).toBe(128_000);

    const nimLlama = models.find((m) => m.id === "meta/llama-3.3-70b-instruct");
    expect(nimLlama).toBeDefined();
    expect(nimLlama?.contextWindow).toBe(128_000);
  });

  it("rejects empty keys on testConnection", async () => {
    const gemini = new GeminiProvider();
    const result = await gemini.testConnection("");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("empty");

    const groq = new GroqProvider();
    const groqResult = await groq.testConnection("   ");
    expect(groqResult.ok).toBe(false);
  });

  it("Gemini adapter formats structured requests and parses JSON output", async () => {
    const gemini = new GeminiProvider();
    const fakeResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  title: "Photosynthesis Quiz",
                  questions: [
                    {
                      type: "single",
                      prompt: "What is the primary pigment in chloroplasts?",
                      explanation: "Chlorophyll absorbs red and blue light.",
                      options: [
                        { text: "Chlorophyll a", isCorrect: true },
                        { text: "Hemoglobin", isCorrect: false },
                      ],
                    },
                  ],
                }),
              },
            ],
          },
        },
      ],
      usageMetadata: {
        promptTokenCount: 150,
        candidatesTokenCount: 80,
        totalTokenCount: 230,
      },
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => fakeResponse,
    } as Response);

    const result = await gemini.generateStructured<{ title: string }>(
      { prompt: "Create photosynthesis quiz" },
      { apiKey: "mock-key", model: "gemini-2.5-flash" }
    );

    expect(result.data.title).toBe("Photosynthesis Quiz");
    expect(result.promptTokens).toBe(150);
    expect(result.completionTokens).toBe(80);
    fetchSpy.mockRestore();
  });

  it("maps rate limits and auth errors correctly", async () => {
    const groq = new GroqProvider();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: new Headers({ "retry-after": "5" }),
      json: async () => ({ error: { message: "Rate limit reached" } }),
    } as Response);

    await expect(
      groq.generateText({ prompt: "hi" }, { apiKey: "key", model: "llama-3.3-70b-versatile" })
    ).rejects.toThrow(AIRateLimitError);

    fetchSpy.mockRestore();
  });
});

describe("Academic Text Ingestion & Chunking", () => {
  it("keeps small texts in a single chunk", () => {
    const text = "This is a short study note about calculus derivatives.";
    const chunks = chunkAcademicText(text, { maxChunkChars: 1000 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  it("chunks large documents while respecting paragraph boundaries", () => {
    const p1 = "First paragraph discussing Newton's first law of motion.\n\n";
    const p2 = "Second paragraph discussing Newton's second law: F = m*a.\n\n";
    const p3 = "Third paragraph discussing Newton's third law of action and reaction.\n\n";
    const longText = p1.repeat(10) + p2.repeat(10) + p3.repeat(10);

    const chunks = chunkAcademicText(longText, { maxChunkChars: 500, overlapChars: 50 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(600);
    }
  });
});
