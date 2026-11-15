import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User, LoginInput, CreateUserInput, AuthResponse, UpdateUserInput } from "@open-sunsama/types";
import { getApi, clearApiClient, clearCsrfToken, getToken, setAuthToken, refreshAuthToken, API_BASE_URL } from "@/lib/api";
import { clearPersistedCache } from "@/lib/query-persister";
import { identifyUser, trackGoal } from "@/lib/analytics";
import { notifyNativeLogout } from "@/lib/native-bridge";
import { isDesktop } from "@/lib/desktop";

const AUTH_USER_KEY = "studyos_user";
const LEGACY_AUTH_USER_KEY = "open_sunsama_user";
interface AuthState { user: User | null; token: string | null; isAuthenticated: boolean; isLoading: boolean; }
interface AuthContextValue extends AuthState {
  login: (credentials: LoginInput) => Promise<void>;
  register: (data: CreateUserInput) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: UpdateUserInput) => Promise<void>;
}
const AuthContext = React.createContext<AuthContextValue | null>(null);

function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY) || localStorage.getItem(LEGACY_AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}
function storeUser(user: User) {
  try {
    const raw = JSON.stringify(user);
    localStorage.setItem(AUTH_USER_KEY, raw);
    localStorage.setItem(LEGACY_AUTH_USER_KEY, raw);
  } catch {
    /* profile cache is optional */
  }
}
function clearAuthData() {
  const hadToken = !!getToken();
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(LEGACY_AUTH_USER_KEY);
  setAuthToken(null);
  if (hadToken) notifyNativeLogout();
  clearCsrfToken();
  clearApiClient();
  clearPersistedCache();
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const value = error as { status?: unknown; response?: { status?: unknown } };
  if (typeof value.status === "number") return value.status;
  return typeof value.response?.status === "number" ? value.response.status : undefined;
}

function isAuthenticationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  return getErrorStatus(error) === 401 ||
    message.includes("Authentication required") ||
    message.includes("Unauthorized");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [cachedUser, setCachedUser] = React.useState<User | null>(getStoredUser);
  const [hasSession, setHasSession] = React.useState(() => !!getToken());
  const [checkingSession, setCheckingSession] = React.useState(true);

  const handleAuthHandoff = React.useCallback(async (code: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/google/mobile/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) return;
      const body = (await res.json()) as { success?: boolean; data?: { token?: string } };
      const token = body.data?.token;
      if (token) {
        setAuthToken(token);
        setHasSession(true);
        void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      }
    } catch (err) {
      console.error("Failed to exchange auth handoff code", err);
    }
  }, [queryClient]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Android Native WebView deep link callback
    (window as any).handleMobileAuthCallback = (url: string) => {
      try {
        const u = new URL(url);
        const code = u.searchParams.get("code");
        if (code) {
          void handleAuthHandoff(code);
        }
      } catch {
        // Ignore invalid callback URLs
      }
    };

    // 2. Tauri Desktop deep link listener
    if (isDesktop()) {
      import("@tauri-apps/plugin-deep-link")
        .then(({ onOpenUrl }) => {
          onOpenUrl((urls: string[]) => {
            for (const rawUrl of urls) {
              try {
                const u = new URL(rawUrl);
                const code = u.searchParams.get("code");
                if (code) {
                  void handleAuthHandoff(code);
                }
              } catch {
                // Ignore invalid callback URLs
              }
            }
          });
        })
        .catch(() => {
          // Deep link plugin unavailable in non-desktop environments
        });
    }

    return () => {
      delete (window as any).handleMobileAuthCallback;
    };
  }, [handleAuthHandoff]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    let tokenFromUrl: string | null = null;
    if (window.location.hash.includes("token=")) {
      const match = window.location.hash.match(/token=([^&]+)/);
      if (match?.[1]) tokenFromUrl = decodeURIComponent(match[1]);
    } else if (window.location.search.includes("token=")) {
      const match = window.location.search.match(/[?&]token=([^&]+)/);
      if (match?.[1]) tokenFromUrl = decodeURIComponent(match[1]);
    }
    if (tokenFromUrl) {
      setAuthToken(tokenFromUrl);
      setHasSession(true);
      try {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete("token");
        if (currentUrl.hash.includes("token=")) {
          const newHash = currentUrl.hash.replace(/[?&]?token=[^&]+/, "").replace(/^#\??$/, "");
          currentUrl.hash = newHash;
        }
        window.history.replaceState(null, "", currentUrl.toString());
      } catch {
        // Fallback for non-standard browser URL schemes
      }
      void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    }
  }, [queryClient]);

  const { data: user } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const requestToken = getToken();
      try {
        const me = await getApi().auth.getMe();
        setHasSession(true);
        setCachedUser(me);
        storeUser(me);
        return me;
      } catch (error) {
        if (isAuthenticationError(error)) {
          const preserveChangedSession = () => {
            const latestToken = getToken();
            const latestUser = latestToken ? getStoredUser() : null;
            setCachedUser(latestUser);
            setHasSession(!!latestToken);
            return latestUser;
          };

          // A request started before sign-in can finish after the login mutation
          // stores a new token. Its 401 belongs to the old, unauthenticated state.
          if (getToken() !== requestToken) return preserveChangedSession();

          // Attempt token refresh before clearing the session —
          // prevents redirect loop when background refetch races against a fresh login
          const currentToken = getToken();
          if (currentToken) {
            try {
              const refreshedToken = await refreshAuthToken();
              if (refreshedToken) {
                try {
                  const me = await getApi().auth.getMe();
                  setHasSession(true);
                  setCachedUser(me);
                  storeUser(me);
                  return me;
                } catch (refreshError) {
                  if (getToken() !== refreshedToken) return preserveChangedSession();
                  if (!isAuthenticationError(refreshError)) {
                    setHasSession(!!cachedUser && !!getToken());
                    return cachedUser;
                  }
                }
              }
            } catch {
              if (getToken() !== requestToken) return preserveChangedSession();
              setHasSession(!!cachedUser && !!getToken());
              return cachedUser;
            }
          }

          if (getToken() !== requestToken) return preserveChangedSession();
          clearAuthData();
          setCachedUser(null);
          setHasSession(false);
          return null;
        }
        // Keep the last local profile available through a temporary outage.
        setHasSession(!!cachedUser && !!getToken());
        return cachedUser;
      } finally { setCheckingSession(false); }
    },
    initialData: cachedUser ?? undefined,
    staleTime: 30_000,
    gcTime: Infinity,
    retry: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginInput): Promise<AuthResponse> => getApi().auth.login(credentials),
    onSuccess: ({ user: nextUser, token }) => {
      if (token) setAuthToken(token);
      storeUser(nextUser); setCachedUser(nextUser); setHasSession(true);
      queryClient.setQueryData(["auth", "me"], nextUser);
    },
  });
  const registerMutation = useMutation({
    mutationFn: (data: CreateUserInput): Promise<AuthResponse> => getApi().auth.register(data),
    onSuccess: ({ user: nextUser, token }) => {
      if (token) setAuthToken(token);
      trackGoal("signup"); storeUser(nextUser); setCachedUser(nextUser); setHasSession(true);
      queryClient.setQueryData(["auth", "me"], nextUser);
    },
  });
  const updateUserMutation = useMutation({
    mutationFn: (data: UpdateUserInput): Promise<User> => getApi().auth.updateMe(data),
    onSuccess: (nextUser) => {
      queryClient.setQueryData(["auth", "me"], nextUser); storeUser(nextUser); setCachedUser(nextUser);
    },
  });

  const login = React.useCallback(async (credentials: LoginInput) => {
    const result = await loginMutation.mutateAsync(credentials);
    if (result.token) setAuthToken(result.token);
    if (result.user) {
      storeUser(result.user);
      setCachedUser(result.user);
      setHasSession(true);
      queryClient.setQueryData(["auth", "me"], result.user);
    }
  }, [loginMutation, queryClient]);

  const register = React.useCallback(async (data: CreateUserInput) => {
    const result = await registerMutation.mutateAsync(data);
    if (result.token) setAuthToken(result.token);
    if (result.user) {
      storeUser(result.user);
      setCachedUser(result.user);
      setHasSession(true);
      queryClient.setQueryData(["auth", "me"], result.user);
    }
  }, [registerMutation, queryClient]);

  const logout = React.useCallback(async () => {
    try { if (hasSession || getToken()) await getApi().auth.logout(); } finally {
      clearAuthData(); setHasSession(false); setCachedUser(null); setCheckingSession(false);
      queryClient.setQueryData(["auth", "me"], null); queryClient.clear();
    }
  }, [hasSession, queryClient]);
  const updateUser = React.useCallback(async (data: UpdateUserInput) => { await updateUserMutation.mutateAsync(data); }, [updateUserMutation]);

  const effectiveUser = user ?? cachedUser;
  React.useEffect(() => { if (effectiveUser) identifyUser(effectiveUser); }, [effectiveUser?.id, effectiveUser?.email, effectiveUser?.name, effectiveUser?.avatarUrl]);
  const hasToken = !!getToken();
  const isAuthenticated = hasToken || hasSession || (checkingSession && !!cachedUser);
  const value = React.useMemo<AuthContextValue>(() => ({
    user: effectiveUser,
    token: getToken() ?? null,
    isAuthenticated,
    isLoading: checkingSession && !hasToken && !cachedUser,
    login, register, logout, updateUser,
  }), [effectiveUser, isAuthenticated, checkingSession, cachedUser, hasToken, login, register, logout, updateUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

export function useRequireAuth(): User {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) throw new Promise(() => {});
  if (!isAuthenticated || !user) throw new Error("Not authenticated");
  return user;
}
