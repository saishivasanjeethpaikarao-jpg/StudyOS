import { createApi, createOpenSunsamaClient, type OpenSunsamaClient } from "@open-sunsama/api-client";
import { isDesktop } from "./desktop";

export const PRODUCTION_API_URL = "https://studyos-api-wy5w.onrender.com";
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:3001" : PRODUCTION_API_URL);

const baseUrl = API_BASE_URL;

const desktopFetch: typeof globalThis.fetch = async (input, init) => {
  const { fetch } = await import("@tauri-apps/plugin-http");
  return fetch(input, init);
};
const transportFetch = isDesktop() ? desktopFetch : globalThis.fetch.bind(globalThis);
let csrfToken: string | null = null;
let csrfPromise: Promise<string | null> | null = null;
const unsafe = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const authBootstrapPaths = new Set(["/auth/login", "/auth/register"]);

async function getCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  if (!csrfPromise) {
    csrfPromise = transportFetch(`${baseUrl}/auth/csrf`, {
      method: "GET",
      credentials: "include",
      headers: { "X-StudyOS-Web-Session": "1" },
    }).then(async (response) => {
      if (!response.ok) return null;
      const body = await response.json() as { data?: { csrfToken?: string } };
      csrfToken = body.data?.csrfToken ?? null;
      return csrfToken;
    }).catch(() => null).finally(() => { csrfPromise = null; });
  }
  return csrfPromise;
}

const customFetch: typeof globalThis.fetch = async (input, init = {}) => {
  const request = input instanceof Request ? input : null;
  const method = (init.method || request?.method || "GET").toUpperCase();
  const headers = new Headers(request?.headers);
  new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  headers.set("X-StudyOS-Web-Session", "1");
  const authToken = getToken();
  if (authToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }
  if (unsafe.has(method)) {
    const requestUrl = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
    if (!authBootstrapPaths.has(requestUrl.pathname.replace(baseUrl, ""))) {
      const token = await getCsrfToken();
      if (token) headers.set("X-CSRF-Token", token);
    }
  }
  return transportFetch(input, { ...init, headers, credentials: "include" });
};
export const sessionFetch = customFetch;

const TOKEN_KEY = "open_sunsama_token";

export function getToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return localStorage.getItem(TOKEN_KEY) || undefined;
}

const config = {
  baseUrl,
  customFetch,
  credentials: "include" as RequestCredentials,
  defaultHeaders: { "X-StudyOS-Web-Session": "1" },
  getToken,
};
let client: OpenSunsamaClient = createOpenSunsamaClient(config);
let api = createApi(config);

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}
export function refreshAuthToken(): Promise<string | null> { return Promise.resolve(null); }
export function onTokenRefreshed(_listener: (token: string) => void): () => void { return () => undefined; }
export function getTokenExpiryMs(_token: string): number | null { return null; }

export function getApi() { return api; }
export function getApiClient() { return client; }
export function useApiClient() { return getApi(); }
export function clearApiClient(): void {
  csrfToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
  client = createOpenSunsamaClient(config);
  api = createApi(config);
}
export function clearCsrfToken(): void { csrfToken = null; }
export type { OpenSunsamaClient };
