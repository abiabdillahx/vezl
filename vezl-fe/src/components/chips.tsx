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

export function StatusChip({ url }: { url: URL }) {
  if (!url.active) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-raised text-[#52525b] border border-[#52525b]">
        Inactive
      </span>
    );
  }
  if (isExpired(url.expires_at)) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border" style={{ background: "rgba(243,18,96,0.12)", color: "#f31260", borderColor: "#f31260" }}>
        Expired
      </span>
    );
  }
  if (isExpiringSoon(url.expires_at)) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border" style={{ background: "rgba(245,165,36,0.12)", color: "#f5a524", borderColor: "#f5a524" }}>
        Expiring Soon
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border" style={{ background: "rgba(23,201,100,0.12)", color: "#17c964", borderColor: "#17c964" }}>
      Active
    </span>
  );
}

export function RoleChip({ role }: { role: string }) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border" style={{ background: "rgba(0,111,238,0.12)", color: "#006FEE", borderColor: "#006FEE" }}>
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-raised text-text-secondary border border-border">
      Member
    </span>
  );
}

export function WatchlistChip({ allowed }: { allowed: boolean }) {
  if (allowed) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border" style={{ background: "rgba(23,201,100,0.12)", color: "#17c964", borderColor: "#17c964" }}>
        Allowed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border" style={{ background: "rgba(243,18,96,0.12)", color: "#f31260", borderColor: "#f31260" }}>
      Blocked
    </span>
  );
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
