import type { URL } from "@/api/types";

function extractDateStr(val: unknown): string | null {
  if (val == null) return null;
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null) {
    const obj = val as Record<string, unknown>;
    if ("Valid" in obj && !obj.Valid) return null;
    if ("Time" in obj && typeof obj.Time === "string") return obj.Time;
  }
  return null;
}

function isExpiringSoon(expiresAt: unknown): boolean {
  const s = extractDateStr(expiresAt);
  if (!s) return false;
  return new Date(s).getTime() - Date.now() < 24 * 60 * 60 * 1000;
}

function isExpired(expiresAt: unknown): boolean {
  const s = extractDateStr(expiresAt);
  if (!s) return false;
  return new Date(s) < new Date();
}

type Tone = "neutral" | "success" | "warning" | "danger" | "accent";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-surface-raised text-text-secondary border-border",
  success: "bg-success/10 text-success border-success/25",
  warning: "bg-warning/10 text-warning border-warning/25",
  danger: "bg-danger/10 text-danger border-danger/25",
  accent: "bg-accent-subtle text-accent-strong border-accent/30",
};

function Chip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${TONE_CLASS[tone]}`}>
      {children}
    </span>
  );
}

export function StatusChip({ url }: { url: URL }) {
  if (!url.active) return <Chip tone="neutral">Inactive</Chip>;
  if (isExpired(url.expires_at)) return <Chip tone="danger">Expired</Chip>;
  if (isExpiringSoon(url.expires_at)) return <Chip tone="warning">Expiring Soon</Chip>;
  return <Chip tone="success">Active</Chip>;
}

export function RoleChip({ role }: { role: string }) {
  return role === "admin" ? <Chip tone="accent">Admin</Chip> : <Chip tone="neutral">Member</Chip>;
}

export function WatchlistChip({ allowed }: { allowed: boolean }) {
  return allowed ? <Chip tone="success">Allowed</Chip> : <Chip tone="danger">Blocked</Chip>;
}

export function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function expiryDisplay(expiresAt: unknown): string {
  const s = extractDateStr(expiresAt);
  if (!s) return "—";
  const diff = new Date(s).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}
