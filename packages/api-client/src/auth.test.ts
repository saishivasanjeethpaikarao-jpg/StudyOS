import { describe, expect, it, vi } from "vitest";
import { createApi } from "./index.js";

describe("AuthApi — exchangeMobileHandoff", () => {
  it("calls auth/google/mobile/exchange with code payload and returns token", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    let capturedBody: unknown = null;

    const customFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = (input as Request).url;
      capturedMethod = (input as Request).method;
      capturedBody = await (input as Request).json();
      return new Response(
        JSON.stringify({
          success: true,
          data: { token: "jwt-test-token-12345" },
        }),
        { headers: { "content-type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const api = createApi({ baseUrl: "https://api.test", customFetch });
    const result = await api.auth.exchangeMobileHandoff("handoff-code-abcdef1234567890");

    expect(capturedUrl).toBe("https://api.test/auth/google/mobile/exchange");
    expect(capturedMethod).toBe("POST");
    expect(capturedBody).toEqual({ code: "handoff-code-abcdef1234567890" });
    expect(result.token).toBe("jwt-test-token-12345");
  });

  it("propagates 401 ApiError when the exchange code is invalid or expired", async () => {
    const customFetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "AUTHENTICATION_ERROR",
              message: "Invalid or expired Google sign-in handoff",
            },
          }),
          { status: 401, headers: { "content-type": "application/json" } }
        )
    ) as unknown as typeof fetch;

    const api = createApi({ baseUrl: "https://api.test", customFetch });
    await expect(api.auth.exchangeMobileHandoff("invalid-or-expired-code")).rejects.toThrow(
      "Invalid or expired Google sign-in handoff"
    );
  });
});
