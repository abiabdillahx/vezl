import { useEffect, useState } from "react";
import { Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { apiKeysApi } from "@/api/client";
import { useAuth } from "@/contexts/AuthContext";
import type { APIKey } from "@/api/types";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CopyButton } from "@/components/CopyButton";
import { relativeTime } from "@/components/chips";
import { inputClassNames, modalClassNames } from "@/components/styles";

export default function SettingsPage() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [plainKey, setPlainKey] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<APIKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    apiKeysApi.list().then(data => setKeys(data || [])).catch(() => setKeys([]));
  }, []);

  async function handleCreateKey() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const { key, plain_key } = await apiKeysApi.create(newKeyName.trim());
      setKeys(prev => [key, ...prev]);
      setPlainKey(plain_key);
      setNewKeyName("");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await apiKeysApi.delete(revokeTarget.id);
      setKeys(prev => prev.filter(k => k.id !== revokeTarget.id));
      setRevokeTarget(null);
    } finally {
      setRevoking(false);
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold text-text-primary tracking-display">Settings</h1>
      </div>

      {/* Profile section */}
      <section className="bg-surface-elevated border border-border rounded-xl p-6 mb-5">
        <h2 className="text-lg font-medium text-text-primary mb-5">Profile</h2>
        <div className="grid grid-cols-3 gap-6 max-w-2xl">
          <div>
            <p className="text-sm text-text-tertiary mb-1">Email</p>
            <p className="text-[15px] text-text-primary">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm text-text-tertiary mb-1">Username</p>
            <p className="text-[15px] text-text-primary">{user?.username}</p>
          </div>
          <div>
            <p className="text-sm text-text-tertiary mb-1">Role</p>
            <p className="text-[15px] text-text-primary capitalize">{user?.role}</p>
          </div>
        </div>
      </section>

      {/* API Keys section */}
      <section className="bg-surface-elevated border border-border rounded-xl p-6">
        <h2 className="text-lg font-medium text-text-primary mb-5">API Keys</h2>

        <div className="flex gap-2 mb-6 max-w-md">
          <Input
            placeholder="Key name"
            value={newKeyName}
            onValueChange={setNewKeyName}
            variant="bordered"
            classNames={inputClassNames}
          />
          <Button
            color="primary" className="font-medium shrink-0"
            isLoading={creating}
            onPress={handleCreateKey}
            isDisabled={!newKeyName.trim()}
          >
            Create
          </Button>
        </div>

        {(keys || []).length === 0 ? (
          <p className="text-[15px] text-text-tertiary">No API keys yet.</p>
        ) : (
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-[1fr_180px_140px_90px] gap-4 px-4 py-2.5 text-[13px] font-medium text-text-tertiary border-b border-border-subtle">
              <span>Name</span><span>Last Used</span><span>Created</span><span className="text-right">Actions</span>
            </div>
            {(keys || []).map(key => (
              <div key={key.id} className="grid grid-cols-[1fr_180px_140px_90px] gap-4 items-center px-4 py-3 rounded-md hover:bg-surface-muted">
                <span className="text-[15px] text-text-primary font-medium">{key.name}</span>
                <span className="text-sm text-text-tertiary">
                  {key.last_used ? relativeTime(key.last_used) : "Never"}
                </span>
                <span className="text-sm text-text-tertiary">{relativeTime(key.created_at)}</span>
                <div className="flex justify-end">
                  <Button
                    size="sm" variant="light"
                    className="text-danger text-sm font-medium h-8 min-w-0 px-2.5 data-[hover=true]:bg-danger/10"
                    onPress={() => setRevokeTarget(key)}
                  >
                    Revoke
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* API Key reveal modal */}
      <Modal
        isOpen={!!plainKey}
        onClose={() => setPlainKey(null)}
        classNames={modalClassNames}
      >
        <ModalContent>
          <ModalHeader>API Key Created</ModalHeader>
          <ModalBody className="py-4 gap-3">
            <p className="text-sm text-warning">⚠ This key will not be shown again. Copy it now.</p>
            <div className="flex items-center gap-2 bg-surface-muted border border-border rounded-md px-3 py-2.5">
              <code className="font-mono text-[13px] text-text-primary flex-1 break-all">{plainKey}</code>
              {plainKey && <CopyButton text={plainKey} />}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="primary" className="font-medium" onPress={() => setPlainKey(null)}>Done</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ConfirmDialog
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        loading={revoking}
        title="Revoke API Key?"
        description={`This will permanently revoke "${revokeTarget?.name}". Any integrations using this key will stop working.`}
      />
    </>
  );
}
