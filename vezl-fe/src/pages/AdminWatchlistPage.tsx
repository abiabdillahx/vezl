import { useEffect, useState } from "react";
import { Button, Input, Spinner, Switch } from "@heroui/react";
import { watchlistApi } from "@/api/client";
import type { WatchlistEntry } from "@/api/types";
import { WatchlistChip, relativeTime } from "@/components/chips";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export default function AdminWatchlistPage() {
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState("");
  const [note, setNote] = useState("");
  const [allowed, setAllowed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WatchlistEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    watchlistApi.list().then(data => setEntries(data || [])).finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!domain.trim()) return;
    setSaving(true);
    try {
      const entry = await watchlistApi.create({ domain: domain.trim(), allowed, note: note || undefined });
      setEntries(prev => [entry, ...prev]);
      setDomain(""); setNote(""); setAllowed(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await watchlistApi.delete(deleteTarget.id);
      setEntries(prev => prev.filter(e => e.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const inputStyles = {
    input: "bg-surface-raised text-text-primary text-sm",
    inputWrapper: "bg-surface-raised border-border hover:border-border-strong data-[focus=true]:border-accent h-9",
    label: "text-text-secondary text-xs",
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Watchlist</h1>
        <p className="text-sm text-text-secondary mt-1">Manage domains that are blocked or explicitly allowed in redirects.</p>
      </div>

      {/* Inline add form */}
      <form onSubmit={handleAdd} className="bg-surface-elevated border border-border rounded-lg p-5 mb-4">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Add Domain</h2>
        <div className="flex gap-3 items-end">
          <Input
            label="Domain"
            placeholder="example.com"
            value={domain}
            onValueChange={setDomain}
            size="sm"
            variant="bordered"
            classNames={inputStyles}
            className="w-48"
          />
          <Input
            label="Note (optional)"
            value={note}
            onValueChange={setNote}
            size="sm"
            variant="bordered"
            classNames={inputStyles}
            className="flex-1"
          />
          <div className="flex items-center gap-2 pb-1">
            <Switch isSelected={allowed} onValueChange={setAllowed} size="sm" color="success" />
            <span className="text-xs text-text-secondary">{allowed ? "Allow" : "Block"}</span>
          </div>
          <Button type="submit" color="primary" radius="full" size="sm" isLoading={saving} isDisabled={!domain.trim()}>
            Add
          </Button>
        </div>
      </form>

      {/* Table */}
      <div className="bg-surface-elevated border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-48"><Spinner size="sm" /></div>
        ) : (entries || []).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <p className="text-sm font-semibold text-text-primary">No watchlist entries</p>
            <p className="text-sm text-text-secondary">Add domains above to block or allow them.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-raised border-b border-border">
                <th className="text-left text-xs font-semibold text-text-secondary px-4 py-3">Domain</th>
                <th className="text-left text-xs font-semibold text-text-secondary px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-text-secondary px-4 py-3">Note</th>
                <th className="text-left text-xs font-semibold text-text-secondary px-4 py-3">Added</th>
                <th className="text-right text-xs font-semibold text-text-secondary px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={entry.id} className={`border-b border-border-subtle hover:bg-surface-raised ${i === entries.length - 1 ? "border-0" : ""}`}>
                  <td className="px-4 py-3 font-mono text-xs text-text-primary">{entry.domain}</td>
                  <td className="px-4 py-3"><WatchlistChip allowed={entry.allowed} /></td>
                  <td className="px-4 py-3 text-xs text-text-secondary">{entry.note ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-text-tertiary">{relativeTime(entry.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm" variant="light"
                      className="text-[#f31260] text-xs h-7 min-w-0 px-2"
                      onPress={() => setDeleteTarget(entry)}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Remove Domain?"
        description={`Remove "${deleteTarget?.domain}" from the watchlist?`}
      />
    </>
  );
}
