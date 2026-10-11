/** Côté navigateur : origine relative, relayée par le proxy Next (next.config.mjs). */
export const API_URL = '/api/v1';
/** Côté serveur (Server Components) : URL interne de l'API, jamais exposée au client. */
export const API_INTERNAL = `${(process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '')}/api/v1`;
const KEY = 'sc_token';
export const getToken = () => (typeof window === 'undefined' ? null : sessionStorage.getItem(KEY));
export const setToken = (t: string | null) => (t ? sessionStorage.setItem(KEY, t) : sessionStorage.removeItem(KEY));
export class ApiError extends Error { constructor(public status: number, message: string, public body?: unknown) { super(message); } }
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, { credentials: 'same-origin', ...init, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
  if (res.status === 401 && typeof window !== 'undefined' && !path.startsWith('/auth/login')) { setToken(null); window.location.href = '/connexion'; }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    throw new ApiError(res.status, Array.isArray(body.message) ? body.message.join(', ') : body.message ?? 'Erreur', body);
  }
  return res.json() as Promise<T>;
}
