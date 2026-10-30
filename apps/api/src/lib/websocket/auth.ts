/**
 * WebSocket authentication utilities
 * Handles JWT verification for WebSocket connections
 */

import { verifyToken } from '../jwt.js';
import { getBrowserSession } from '../account-sessions.js';

export interface AuthResult {
  success: boolean;
  userId?: string;
  error?: string;
}

/**
 * Authenticate a WebSocket connection using JWT from query string
 * URL format: ws://host/ws?token=<jwt>
 *
 * @param url - The request URL containing the token query parameter
 * @returns Authentication result with userId on success, error on failure
 */
export function isAllowedBrowserOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  const configured = [process.env.CORS_ORIGIN, process.env.WEB_APP_ORIGIN]
    .filter((value): value is string => !!value)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  const allowed = configured.length ? configured : ["http://localhost:3000"];
  return allowed.includes(origin);
}

export async function authenticateWebSocket(url: string, cookieHeader?: string, origin?: string): Promise<AuthResult> {
  try {
    // Parse URL to extract query parameters
    // Use a dummy base URL since we only care about the path and query
    const urlObj = new URL(url, 'http://localhost');
    const token = urlObj.searchParams.get('token');

    if (!token) {
      const cookie = cookieHeader?.split(';').map((part) => part.trim()).find((part) => part.startsWith('studyos_session='));
      const raw = cookie ? decodeURIComponent(cookie.slice('studyos_session='.length)) : null;
      if (!raw) return { success: false, error: 'Session required' };
      if (!isAllowedBrowserOrigin(origin)) return { success: false, error: 'Browser origin not allowed' };
      const session = await getBrowserSession(raw);
      return session ? { success: true, userId: session.userId } : { success: false, error: 'Invalid session' };
    }

    // Verify the JWT token
    const { userId } = verifyToken(token);

    if (!userId) {
      return { success: false, error: 'Invalid token payload' };
    }

    return { success: true, userId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid token',
    };
  }
}
