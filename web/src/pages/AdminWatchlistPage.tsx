import { useEffect, useState } from "react";
import { Button, Input, Spinner, Switch } from "@heroui/react";
import { watchlistApi } from "@/api/client";
import type { WatchlistEntry } from "@/api/types";
import { WatchlistChip, relativeTime } from "@/components/chips";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { inputClassNames } from "@/components/styles";

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

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold text-text-primary tracking-display">Watchlist</h1>
        <p className="text-[15px] text-text-secondary mt-1">Manage domains that are blocked or explicitly allowed in redirects.</p>
      </div>

      {/* Inline add form */}
      <form onSubmit={handleAdd} className="bg-surface-elevated border border-border rounded-xl p-6 mb-5">
        <h2 className="text-lg font-medium text-text-primary mb-4">Add Domain</h2>
        <div className="flex gap-3 items-center">
          <Input
            label="Domain"
            placeholder="example.com"
            value={domain}
            onValueChange={setDomain}
            size="sm"
            variant="bordered"
            classNames={inputClassNames}
            className="w-64"
          />
          <Input
            label="Note (optional)"
            value={note}
            onValueChange={setNote}
            size="sm"
            variant="bordered"
            classNames={inputClassNames}
            className="flex-1"
          />
          <div className="flex items-center gap-2 px-1">
            <Switch isSelected={allowed} onValueChange={setAllowed} size="sm" color="primary" />
            <span className="text-sm text-text-secondary w-10">{allowed ? "Allow" : "Block"}</span>
          </div>
          <Button type="submit" color="primary" size="lg" radius="md" className="font-medium" isLoading={saving} isDisabled={!domain.trim()}>
            Add
          </Button>
        </div>
      </form>

      {/* Table */}
      <div className="bg-surface-elevated border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-48"><Spinner size="sm" /></div>
        ) : (entries || []).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <p className="text-base font-medium text-text-primary">No watchlist entries</p>
            <p className="text-sm text-text-secondary">Add domains above to block or allow them.</p>
          </div>
        ) : (
          <table className="w-full text-[15px] whitespace-nowrap">
            <thead>
              <tr className="bg-surface-muted border-b border-border-subtle">
                <th className="text-left text-[13px] font-medium text-text-tertiary px-5 py-3">Domain</th>
                <th className="text-left text-[13px] font-medium text-text-tertiary px-5 py-3">Status</th>
                <th className="text-left text-[13px] font-medium text-text-tertiary px-5 py-3">Note</th>
                <th className="text-left text-[13px] font-medium text-text-tertiary px-5 py-3">Added</th>
                <th className="text-right text-[13px] font-medium text-text-tertiary px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={entry.id} className={`border-b border-border-subtle hover:bg-surface-muted ${i === entries.length - 1 ? "border-0" : ""}`}>
                  <td className="px-5 py-3.5 font-mono text-sm text-text-primary">{entry.domain}</td>
                  <td className="px-5 py-3.5"><WatchlistChip allowed={entry.allowed} /></td>
                  <td className="px-5 py-3.5 text-sm text-text-secondary">{entry.note ?? "—"}</td>
                  <td className="px-5 py-3.5 text-sm text-text-tertiary">{relativeTime(entry.created_at)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <Button
                      size="sm" variant="light"
                      className="text-danger text-sm font-medium h-8 min-w-0 px-2.5 data-[hover=true]:bg-danger/10"
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
