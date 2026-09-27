import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Spinner, Tooltip } from "@heroui/react";
import { urlsApi } from "@/api/client";
import { useAuth } from "@/contexts/AuthContext";
import type { URL as VezlURL, CreateURLPayload, UpdateURLPayload } from "@/api/types";
import { StatusChip, relativeTime, expiryDisplay } from "@/components/chips";
import { CopyButton } from "@/components/CopyButton";
import { URLFormModal } from "@/components/URLFormModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { inputClassNames, secondaryButtonClass } from "@/components/styles";

interface ExportLink {
  shortcode: string;
  original_url: string;
  notes?: string | null;
  hit_limit?: number;
  expires_at?: string | null;
  utm?: Record<string, string>;
}

const EDIT_ICON = (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const DELETE_ICON = (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </svg>
);
const DETAIL_ICON = (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);

export default function LinksPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const navigate = useNavigate();
  const [urls, setUrls] = useState<VezlURL[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<VezlURL | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VezlURL | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await urlsApi.list({ limit: 100 });
      setUrls(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = (urls || []).filter(u =>
    u.shortcode.includes(search) ||
    u.original_url.toLowerCase().includes(search.toLowerCase())
  );

  const active = (urls || []).filter(u => u.active).length;
  const expiringSoon = (urls || []).filter(u =>
    u.expires_at && new Date(u.expires_at).getTime() - Date.now() < 24 * 60 * 60 * 1000 &&
    new Date(u.expires_at) > new Date()
  ).length;
  const totalHits = (urls || []).reduce((s, u) => s + u.hit, 0);

  async function handleCreate(payload: CreateURLPayload | UpdateURLPayload) {
    await urlsApi.create(payload as CreateURLPayload);
    await load();
  }

  async function handleEdit(payload: CreateURLPayload | UpdateURLPayload) {
    if (!editTarget) return;
    await urlsApi.update(editTarget.id, payload as UpdateURLPayload);
    await load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await urlsApi.delete(deleteTarget.id);
      await load();
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  function handleExport() {
    const data: ExportLink[] = urls.map(u => ({
      shortcode: u.shortcode,
      original_url: u.original_url,
      notes: u.notes,
      hit_limit: u.hit_limit,
      expires_at: u.expires_at,
      utm: u.utm,
    }));
    const blob = new Blob([JSON.stringify({ "vezl-links": data }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vezl-links-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const links: ExportLink[] = json["vezl-links"] ?? json.links ?? json;
      if (!Array.isArray(links)) throw new Error("Invalid format: expected array of links");
      for (const link of links) {
        if (!link.original_url) continue;
        await urlsApi.create({
          original_url: link.original_url,
          shortcode: link.shortcode || undefined,
          notes: link.notes ?? undefined,
          hit_limit: link.hit_limit ?? undefined,
          expires_at: link.expires_at ?? undefined,
          utm: link.utm ?? undefined,
        });
      }
      await load();
    } catch (err) {
      alert(`Import failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-semibold text-text-primary tracking-display">Links</h1>
        <Button color="primary" className="font-medium" onPress={() => setCreateOpen(true)}>
          + Create Link
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Links", value: (urls || []).length },
          { label: "Total Clicks", value: totalHits },
          { label: "Active Links", value: active },
          { label: "Expiring Soon", value: expiringSoon },
        ].map(card => (
          <div key={card.label} className="bg-surface-elevated border border-border rounded-xl px-6 py-5">
            <p className="text-sm font-medium text-text-tertiary mb-2">{card.label}</p>
            <p className="text-3xl font-medium text-text-primary tracking-display">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Table container */}
      <div className="bg-surface-elevated border border-border rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between gap-4">
          <Input
            placeholder="Search shortcode or URL..."
            value={search}
            onValueChange={setSearch}
            variant="bordered"
            className="max-w-sm"
            startContent={
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-text-tertiary shrink-0">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
            }
            classNames={inputClassNames}
          />
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
            <Tooltip content="Import from JSON">
              <Button
                isLoading={importing}
                onPress={() => fileInputRef.current?.click()}
                className={secondaryButtonClass}
                startContent={
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                }
              >
                Import
              </Button>
            </Tooltip>
            <Tooltip content="Export as JSON">
              <Button
                onPress={handleExport}
                className={secondaryButtonClass}
                startContent={
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                }
              >
                Export
              </Button>
            </Tooltip>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Spinner size="sm" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-12 h-12 rounded-full bg-accent-subtle text-accent-strong flex items-center justify-center">
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
              </svg>
            </div>
            <p className="text-base font-medium text-text-primary">No links yet</p>
            <p className="text-sm text-text-secondary">Create your first short link to get started.</p>
            <Button color="primary" className="font-medium mt-1" onPress={() => setCreateOpen(true)}>
              + Create Link
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-[15px] whitespace-nowrap">
            <thead>
              <tr className="bg-surface-muted border-b border-border-subtle">
                <th className="text-left text-[13px] font-medium text-text-tertiary px-5 py-3">Shortcode</th>
                <th className="text-left text-[13px] font-medium text-text-tertiary px-5 py-3">Original URL</th>
                <th className="text-left text-[13px] font-medium text-text-tertiary px-5 py-3">Status</th>
                <th className="text-left text-[13px] font-medium text-text-tertiary px-5 py-3">Hits</th>
                {isAdmin && <th className="text-left text-[13px] font-medium text-text-tertiary px-5 py-3">Created By</th>}
                <th className="text-left text-[13px] font-medium text-text-tertiary px-5 py-3">Expires</th>
                <th className="text-left text-[13px] font-medium text-text-tertiary px-5 py-3">Created</th>
                <th className="text-right text-[13px] font-medium text-text-tertiary px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((url, i) => (
                <tr
                  key={url.id}
                  className={`border-b border-border-subtle hover:bg-surface-muted transition-colors ${i === filtered.length - 1 ? "border-0" : ""}`}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-text-primary">{url.shortcode}</span>
                      <CopyButton text={`${window.location.origin}/${url.shortcode}`} />
                    </div>
                  </td>
                  <td className="px-5 py-3.5 w-full max-w-0 min-w-[200px]">
                    <Tooltip content={url.original_url} placement="top">
                      <a
                        href={url.original_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-link truncate block hover:underline"
                      >
                        {url.original_url}
                      </a>
                    </Tooltip>
                  </td>
                  <td className="px-5 py-3.5"><StatusChip url={url} /></td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col gap-1">
                      <span className="text-text-primary">{url.hit}</span>
                      {url.hit_limit > 0 && (
                        <div className="w-16 h-1 bg-surface-subtle rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              url.hit / url.hit_limit > 0.95
                                ? "bg-danger"
                                : url.hit / url.hit_limit > 0.80
                                ? "bg-warning"
                                : "bg-accent"
                            }`}
                            style={{ width: `${Math.min((url.hit / url.hit_limit) * 100, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-text-secondary">{url.created_by || "—"}</span>
                    </td>
                  )}
                  <td className="px-5 py-3.5">
                    <span
                      className={`text-sm ${
                        url.expires_at && typeof url.expires_at === 'string' && new Date(url.expires_at).getTime() - Date.now() < 24 * 60 * 60 * 1000
                          ? "text-warning"
                          : "text-text-tertiary"
                      }`}
                    >
                      {expiryDisplay(url.expires_at)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-text-tertiary">{relativeTime(url.created_at)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip content="Analytics">
                        <Button
                          isIconOnly size="sm" variant="light"
                          className="w-8 h-8 min-w-0 text-text-tertiary hover:text-text-primary"
                          onPress={() => navigate(`/links/${url.id}`)}
                        >
                          {DETAIL_ICON}
                        </Button>
                      </Tooltip>
                      <Tooltip content="Edit">
                        <Button
                          isIconOnly size="sm" variant="light"
                          className="w-8 h-8 min-w-0 text-text-tertiary hover:text-text-primary"
                          onPress={() => setEditTarget(url)}
                        >
                          {EDIT_ICON}
                        </Button>
                      </Tooltip>
                      <Tooltip content="Delete">
                        <Button
                          isIconOnly size="sm" variant="light"
                          className="w-8 h-8 min-w-0 text-text-tertiary hover:text-danger data-[hover=true]:bg-danger/10"
                          onPress={() => setDeleteTarget(url)}
                        >
                          {DELETE_ICON}
                        </Button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <URLFormModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />
      <URLFormModal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSubmit={handleEdit}
        initial={editTarget ?? undefined}
      />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Link?"
        description={`This will permanently delete "/${deleteTarget?.shortcode}". This action cannot be undone.`}
      />
    </>
  );
}
