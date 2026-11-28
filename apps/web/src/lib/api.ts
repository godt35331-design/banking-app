import { trackBusy } from './busy';

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const OFFLINE = "We can't reach the bank's server right now. Please try again in a moment.";

const TOKEN_KEY = 'auth_token';

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function failure(res: Response) {
  const body = await res.json().catch(() => ({}));
  const msg = Array.isArray(body.message) ? body.message.join('. ') : body.message;
  if (msg) return new ApiError(msg, res.status);
  if (res.status >= 500) return new ApiError(OFFLINE, res.status);
  return new ApiError(`Something went wrong (error ${res.status}). Please try again.`, res.status);
}

async function send(path: string, init: RequestInit) {
  try {
    return await trackBusy(fetch(`${BASE}${path}`, {
      credentials: 'include',
      ...init,
      headers: { ...authHeaders(), ...init.headers },
    }));
  } catch {
    throw new Error(OFFLINE);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await send(path, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  if (!res.ok) throw await failure(res);
  return res.json();
}

/**
 * Opens a protected file (an uploaded document) in a new tab. A plain link can't carry the
 * sign-in token and would point at the website instead of the server, so fetch it here.
 */
export async function openFile(path: string) {
  const win = window.open('', '_blank'); // opened during the click so browsers don't block it
  try {
    const res = await send(path, { method: 'GET' });
    if (!res.ok) throw await failure(res);
    const url = URL.createObjectURL(await res.blob());
    if (win) { win.opener = null; win.location.href = url; } else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
  } catch (err) {
    win?.close();
    alert((err as Error).message || 'Could not open the document.');
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: async <T>(path: string, form: FormData): Promise<T> => {
    const res = await send(path, { method: 'POST', body: form });
    if (!res.ok) throw await failure(res);
    return res.json();
  },
};
