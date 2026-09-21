import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitSessionExpired } from './sessionEvents';

export const API_URL = 'https://api.malaw.app/api';

const TOKEN_KEY = '@malaw-livreur/token';
const REFRESH_KEY = '@malaw-livreur/refreshToken';
const USER_KEY = '@malaw-livreur/user';

// ---------- token & session storage ----------

export type Session = {
  token?: string;
  refreshToken?: string;
  user?: Record<string, unknown>;
};

export async function saveSession({ token, refreshToken, user }: Session) {
  const pairs: [string, string][] = [];
  if (token) pairs.push([TOKEN_KEY, token]);
  if (refreshToken) pairs.push([REFRESH_KEY, refreshToken]);
  if (user) pairs.push([USER_KEY, JSON.stringify(user)]);
  if (pairs.length) await AsyncStorage.multiSet(pairs);
}

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getRefreshToken() {
  return AsyncStorage.getItem(REFRESH_KEY);
}

export async function getStoredUser<T = Record<string, unknown>>(): Promise<T | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function clearSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY, USER_KEY]);
}

// ---------- error type ----------

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function extractMessage(body: any, fallback: string): string {
  if (!body) return fallback;
  const msg = body.message;
  if (Array.isArray(msg)) return msg.join('\n');
  return msg || body.error || fallback;
}

// ---------- core fetch wrapper ----------

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
};

async function rawRequest(path: string, { method = 'GET', body, token, headers }: RequestOptions = {}) {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body != null ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Impossible de joindre le serveur. Vérifiez votre connexion.', 0, null);
  }

  const text = await res.text();
  let data: any = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    throw new ApiError(extractMessage(data, `Erreur ${res.status}`), res.status, data);
  }
  return data;
}

let refreshing: Promise<string> | null = null;

async function refreshSession(): Promise<string> {
  if (!refreshing) {
    refreshing = (async () => {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) throw new ApiError('Session expirée', 401, null);
      const data = await rawRequest('/auth/refresh', { method: 'POST', body: { refreshToken } });
      await saveSession(data);
      return data.token as string;
    })().finally(() => { refreshing = null; });
  }
  return refreshing;
}

/**
 * Authenticated-aware request. Attaches the stored access token when present;
 * on a 401, tries one token refresh then replays the request.
 */
export async function api(path: string, options: RequestOptions = {}) {
  const token = await getToken();
  try {
    return await rawRequest(path, { ...options, token });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401 && token) {
      try {
        const newToken = await refreshSession();
        return await rawRequest(path, { ...options, token: newToken });
      } catch {
        // Refresh échoué : session définitivement perdue → on prévient l'UI
        // pour afficher une invite de reconnexion claire.
        await clearSession();
        emitSessionExpired();
        throw e;
      }
    }
    throw e;
  }
}

/** Unauthenticated request (login endpoint). */
export function apiPublic(path: string, options: RequestOptions = {}) {
  return rawRequest(path, options);
}
