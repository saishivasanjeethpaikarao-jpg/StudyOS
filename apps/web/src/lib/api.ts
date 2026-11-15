import { createApi, createOpenSunsamaClient, type OpenSunsamaClient } from "@open-sunsama/api-client";
import { isDesktop } from "./desktop";
import { notifyNativeTokenChanged } from "./native-bridge";

export const PRODUCTION_API_URL = "https://studyos-api-wy5w.onrender.com";

const isNativeApp = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    isDesktop() ||
    !!(
      (window as any).StudyOSNative ||
      (window as any).__STUDYOS_NATIVE__ ||
      (window as any).ReactNativeWebView ||
      (window as any).Capacitor?.isNativePlatform?.()
    )
  );
};

export function getApiBaseUrl(): string {
  // Desktop and Native Mobile must ALWAYS use the absolute production API URL
  // unless explicitly configured with an absolute remote URL.
  if (isNativeApp()) {
    const custom = import.meta.env.VITE_API_URL;
    if (custom && custom.startsWith("https://") && !custom.includes("localhost")) {
      return custom;
    }
    return PRODUCTION_API_URL;
  }
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() && envUrl !== "/api") {
    return envUrl;
  }
  return import.meta.env.DEV ? "http://localhost:3001" : PRODUCTION_API_URL;
}

export const API_BASE_URL = getApiBaseUrl();
const baseUrl = API_BASE_URL;

const desktopFetch: typeof globalThis.fetch = async (input, init) => {
  const { fetch } = await import("@tauri-apps/plugin-http");
  let requestUrl = input instanceof Request ? input.url : typeof input === "string" ? input : input.toString();
  if (requestUrl.startsWith("/")) {
    requestUrl = `${PRODUCTION_API_URL}${requestUrl}`;
  } else if (requestUrl.startsWith("http://localhost:3001")) {
    requestUrl = requestUrl.replace("http://localhost:3001", PRODUCTION_API_URL);
  } else if (requestUrl.startsWith("http://tauri.localhost")) {
    requestUrl = requestUrl.replace("http://tauri.localhost", PRODUCTION_API_URL);
  }
  return fetch(requestUrl, init);
};
const transportFetch: typeof globalThis.fetch = (input, init) => {
  // Resolve Tauri at call time. The desktop webview injects internals after
  // the first script evaluation, so a module-load check would keep using
  // window.fetch against localhost and fail with ERR_CONNECTION_REFUSED.
  if (isDesktop()) return desktopFetch(input, init);
  return globalThis.fetch(input, init);
};
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
    const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    let pathname = "";
    try {
      pathname = new URL(rawUrl, baseUrl).pathname;
    } catch {
      pathname = rawUrl;
    }
    const cleanPath = pathname.replace(/^\/api\/v1/, "").replace(baseUrl, "");
    if (!authBootstrapPaths.has(cleanPath)) {
      const token = await getCsrfToken();
      if (token) headers.set("X-CSRF-Token", token);
    }
  }
  return transportFetch(input, { ...init, headers, credentials: "include" });
};
export const sessionFetch = customFetch;

const TOKEN_KEY = "studyos_token";
const LEGACY_TOKEN_KEY = "open_sunsama_token";
const STUDYOS_AUTH_TOKEN_KEY = "studyos-auth-token";
const LEGACY_AUTH_TOKEN_KEY = "open-sunsama-auth-token";

export function getToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    localStorage.getItem(TOKEN_KEY) ||
    localStorage.getItem(STUDYOS_AUTH_TOKEN_KEY) ||
    localStorage.getItem(LEGACY_TOKEN_KEY) ||
    localStorage.getItem(LEGACY_AUTH_TOKEN_KEY) ||
    undefined
  );
}

const attemptTokenRefresh = async (): Promise<string | null> => {
  const currentToken = getToken();
  if (!currentToken) return null;
  try {
    const res = await transportFetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${currentToken}`,
        "X-StudyOS-Web-Session": "1",
      },
      credentials: "include",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: { token?: string } };
    const newToken = body?.data?.token;
    if (newToken) {
      setAuthToken(newToken);
      return newToken;
    }
  } catch {
    /* refresh failed */
  }
  return null;
};

const config = {
  baseUrl,
  customFetch,
  credentials: "include" as RequestCredentials,
  defaultHeaders: { "X-StudyOS-Web-Session": "1" },
  getToken,
  onUnauthorized: attemptTokenRefresh,
};
let client: OpenSunsamaClient = createOpenSunsamaClient(config);
let api = createApi(config);

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(STUDYOS_AUTH_TOKEN_KEY, token);
    localStorage.setItem(LEGACY_TOKEN_KEY, token);
    localStorage.setItem(LEGACY_AUTH_TOKEN_KEY, token);
    notifyNativeTokenChanged(token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(STUDYOS_AUTH_TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  }
}
export function refreshAuthToken(): Promise<string | null> {
  return attemptTokenRefresh();
}
export function onTokenRefreshed(_listener: (token: string) => void): () => void { return () => undefined; }
export function getTokenExpiryMs(_token: string): number | null { return null; }

export function getApi() { return api; }
export function getApiClient() { return client; }
export function useApiClient() { return getApi(); }
export function clearApiClient(): void {
  csrfToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(STUDYOS_AUTH_TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  }
  client = createOpenSunsamaClient(config);
  api = createApi(config);
}
export function clearCsrfToken(): void { csrfToken = null; }
export type { OpenSunsamaClient };
