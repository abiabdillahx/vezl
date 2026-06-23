export interface User {
  id: string;
  email: string;
  username: string;
  role: "admin" | "member";
  created_at: string;
  updated_at: string;
}

export interface URL {
  id: string;
  user_id: string;
  shortcode: string;
  original_url: string;
  notes: string | null;
  secret: string | null;
  active: boolean;
  hit: number;
  hit_limit: number;
  expires_at: string | null;
  utm: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface Metric {
  id: string;
  url_id: string;
  user_id: string;
  browser: string | null;
  os: string | null;
  device: string | null;
  language: string | null;
  referrer: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  utm: Record<string, string>;
  timestamp: string;
}

export interface AggregateMetric {
  url_id: string;
  browser: string | null;
  os: string | null;
  device: string | null;
  country: string | null;
  count: number;
}

export interface WatchlistEntry {
  id: string;
  domain: string;
  allowed: boolean;
  note: string | null;
  created_at: string;
}

export interface APIKey {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  last_used: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface CreateURLPayload {
  original_url: string;
  shortcode?: string;
  notes?: string;
  secret?: string;
  hit_limit?: number;
  expires_at?: string;
  utm?: Record<string, string>;
}

export interface UpdateURLPayload extends Omit<CreateURLPayload, "original_url"> {
  original_url: string;
  active: boolean;
  hit_limit: number;
}
