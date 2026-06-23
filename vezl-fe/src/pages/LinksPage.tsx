import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Spinner, Tooltip } from "@heroui/react";
import { urlsApi } from "@/api/client";
import { useAuth } from "@/contexts/AuthContext";
import type { URL as VezlURL, CreateURLPayload, UpdateURLPayload } from "@/api/types";
import { StatusChip, relativeTime, expiryDisplay } from "@/components/chips";
import { CopyButton } from "@/components/CopyButton";
import { URLFormModal } from "@/components/URLFormModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const EDIT_ICON = (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const DELETE_ICON = (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </svg>
);
const DETAIL_ICON = (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Links</h1>
        <Button color="primary" radius="full" size="sm" onPress={() => setCreateOpen(true)}>
          + Create Link
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: "Total Links", value: (urls || []).length },
          { label: "Total Clicks", value: totalHits },
          { label: "Active Links", value: active },
          { label: "Expiring Soon", value: expiringSoon },
        ].map(card => (
          <div key={card.label} className="bg-surface-elevated border border-border rounded-lg p-5">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">{card.label}</p>
            <p className="text-2xl font-bold text-text-primary">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Table container */}
      <div className="bg-surface-elevated border border-border rounded-lg overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-border">
          <Input
            placeholder="Search shortcode or URL..."
            value={search}
            onValueChange={setSearch}
            size="sm"
            variant="bordered"
            startContent={
              <svg width="14" height="14" fill="none" stroke="#71717a" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
            }
            classNames={{
              input: "bg-surface-raised text-text-primary text-sm placeholder:text-text-tertiary",
              inputWrapper: "bg-surface-raised border-border h-8 max-w-xs",
            }}
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Spinner size="sm" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="w-12 h-12 rounded-full bg-surface-subtle flex items-center justify-center">
              <svg width="20" height="20" fill="none" stroke="#71717a" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-text-primary">No links yet</p>
            <p className="text-sm text-text-secondary">Create your first short link to get started.</p>
            <Button color="primary" radius="full" size="sm" onPress={() => setCreateOpen(true)}>
              + Create Link
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-raised border-b border-border">
                <th className="text-left text-xs font-semibold text-text-secondary px-4 py-3">Shortcode</th>
                <th className="text-left text-xs font-semibold text-text-secondary px-4 py-3">Original URL</th>
                <th className="text-left text-xs font-semibold text-text-secondary px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-text-secondary px-4 py-3">Hits</th>
                {isAdmin && <th className="text-left text-xs font-semibold text-text-secondary px-4 py-3">Created By</th>}
                <th className="text-left text-xs font-semibold text-text-secondary px-4 py-3">Expires</th>
                <th className="text-left text-xs font-semibold text-text-secondary px-4 py-3">Created</th>
                <th className="text-right text-xs font-semibold text-text-secondary px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((url, i) => (
                <tr
                  key={url.id}
                  className={`border-b border-border-subtle hover:bg-surface-raised transition-colors ${i === filtered.length - 1 ? "border-0" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-text-primary">{url.shortcode}</span>
                      <CopyButton text={url.shortcode} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Tooltip content={url.original_url} placement="top">
                      <a
                        href={url.original_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-link truncate-url block hover:underline"
                      >
                        {url.original_url}
                      </a>
                    </Tooltip>
                  </td>
                  <td className="px-4 py-3"><StatusChip url={url} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-text-primary">{url.hit}</span>
                      {url.hit_limit > 0 && (
                        <div className="w-16 h-0.5 bg-surface-raised rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min((url.hit / url.hit_limit) * 100, 100)}%`,
                              background: url.hit / url.hit_limit > 0.95
                                ? "#f31260"
                                : url.hit / url.hit_limit > 0.80
                                ? "#f5a524"
                                : "#006FEE",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <span className="text-xs text-text-secondary">{url.created_by || "—"}</span>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span
                      className="text-xs"
                      style={{
                        color: url.expires_at && typeof url.expires_at === 'string' && new Date(url.expires_at).getTime() - Date.now() < 24 * 60 * 60 * 1000
                          ? "#f5a524"
                          : "#71717a",
                      }}
                    >
                      {expiryDisplay(url.expires_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-text-tertiary">{relativeTime(url.created_at)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip content="Analytics">
                        <Button
                          isIconOnly size="sm" variant="light"
                          className="w-7 h-7 min-w-0 text-text-secondary hover:text-text-primary"
                          onPress={() => navigate(`/links/${url.id}`)}
                        >
                          {DETAIL_ICON}
                        </Button>
                      </Tooltip>
                      <Tooltip content="Edit">
                        <Button
                          isIconOnly size="sm" variant="light"
                          className="w-7 h-7 min-w-0 text-text-secondary hover:text-text-primary"
                          onPress={() => setEditTarget(url)}
                        >
                          {EDIT_ICON}
                        </Button>
                      </Tooltip>
                      <Tooltip content="Delete">
                        <Button
                          isIconOnly size="sm" variant="light"
                          className="w-7 h-7 min-w-0 text-[#f31260]"
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
