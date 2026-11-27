import { trackBusy } from './busy';

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const OFFLINE = "We can't reach the bank's server right now. Please try again in a moment.";

/** A readable error: the server's message, or a plain explanation when the server can't be reached. */
async function failure(res: Response) {
  const body = await res.json().catch(() => ({}));
  const msg = Array.isArray(body.message) ? body.message.join('. ') : body.message;
  if (msg) return new Error(msg);
  if (res.status >= 500) return new Error(OFFLINE);
  return new Error(`Something went wrong (error ${res.status}). Please try again.`);
}

async function send(path: string, init: RequestInit) {
  try {
    return await trackBusy(fetch(`${BASE}${path}`, { credentials: 'include', ...init }));
  } catch {
    throw new Error(OFFLINE);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await send(path, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  if (!res.ok) throw await failure(res);
  return res.json();
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
  /** multipart/form-data upload (the browser sets the boundary header itself). */
  upload: async <T>(path: string, form: FormData): Promise<T> => {
    const res = await send(path, { method: 'POST', body: form });
    if (!res.ok) throw await failure(res);
    return res.json();
  },
};
