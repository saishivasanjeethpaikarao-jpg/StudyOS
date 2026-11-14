import { describe, expect, it } from "vitest";
import { getGoogleAuthStartUrl } from "./native-bridge";

describe("getGoogleAuthStartUrl", () => {
  it("adds the app callback URI only inside a native mobile shell", () => {
    const nativeUrl = new URL(
      getGoogleAuthStartUrl("https://studyos-api.example.com", true)
    );
    const webUrl = new URL(
      getGoogleAuthStartUrl("https://studyos-api.example.com", false)
    );

    expect(nativeUrl.pathname).toBe("/auth/google/start");
    expect(nativeUrl.searchParams.get("mobile_redirect_uri")).toBe(
      "studyos://auth/callback"
    );
    expect(webUrl.searchParams.has("mobile_redirect_uri")).toBe(false);
  });
});
