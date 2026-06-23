import type {
  User, URL, Metric, AggregateMetric,
  WatchlistEntry, APIKey,
  CreateURLPayload, UpdateURLPayload,
} from "./types";

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new APIError(res.status, body.error ?? "Unknown error");
  }
  return res.json();
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    request<{ user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  me: () => request<User>("/auth/me"),
};

// URLs
export const urlsApi = {
  list: (params?: { limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    return request<URL[]>(`/urls?${q}`);
  },
  get: (id: string) => request<URL>(`/urls/${id}`),
  create: (payload: CreateURLPayload) =>
    request<URL>("/urls", { method: "POST", body: JSON.stringify(payload) }),
  update: (id: string, payload: UpdateURLPayload) =>
    request<URL>(`/urls/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  delete: (id: string) => request<void>(`/urls/${id}`, { method: "DELETE" }),
  stats: (id: string) => request<Metric[]>(`/urls/${id}/stats`),
};

// Metrics
export const metricsApi = {
  aggregate: (params?: { from?: string; to?: string; url_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    if (params?.url_id) q.set("url_id", params.url_id);
    return request<AggregateMetric[]>(`/metrics?${q}`);
  },
};

// Users (admin)
export const usersApi = {
  list: () => request<User[]>("/users"),
  create: (payload: { email: string; username: string; password: string; role?: string }) =>
    request<User>("/users", { method: "POST", body: JSON.stringify(payload) }),
  update: (id: string, payload: { email: string; username: string; role: string }) =>
    request<User>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  delete: (id: string) => request<void>(`/users/${id}`, { method: "DELETE" }),
};

// Watchlist (admin)
export const watchlistApi = {
  list: () => request<WatchlistEntry[]>("/watchlist"),
  create: (payload: { domain: string; allowed: boolean; note?: string }) =>
    request<WatchlistEntry>("/watchlist", { method: "POST", body: JSON.stringify(payload) }),
  delete: (id: string) => request<void>(`/watchlist/${id}`, { method: "DELETE" }),
};

// API Keys
export const apiKeysApi = {
  list: () => request<APIKey[]>("/api-keys"),
  create: (name: string) =>
    request<{ key: APIKey; plain_key: string }>("/api-keys", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  delete: (id: string) => request<void>(`/api-keys/${id}`, { method: "DELETE" }),
};

export { APIError };
