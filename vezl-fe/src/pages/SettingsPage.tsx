import { useEffect, useState } from "react";
import { Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { apiKeysApi } from "@/api/client";
import { useAuth } from "@/contexts/AuthContext";
import type { APIKey } from "@/api/types";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CopyButton } from "@/components/CopyButton";
import { relativeTime } from "@/components/chips";

const inputStyles = {
  input: "bg-surface-raised text-text-primary text-sm",
  inputWrapper: "bg-surface-raised border-border hover:border-border-strong data-[focus=true]:border-accent",
  label: "text-text-secondary text-xs",
};

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
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Settings</h1>
      </div>

      {/* Profile section */}
      <section className="bg-surface-elevated border border-border rounded-lg p-6 mb-4">
        <h2 className="text-base font-semibold text-text-primary mb-4">Profile</h2>
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div>
            <p className="text-xs text-text-secondary mb-1">Email</p>
            <p className="text-sm text-text-primary">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-1">Username</p>
            <p className="text-sm text-text-primary">{user?.username}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-1">Role</p>
            <p className="text-sm text-text-primary capitalize">{user?.role}</p>
          </div>
        </div>
      </section>

      {/* API Keys section */}
      <section className="bg-surface-elevated border border-border rounded-lg p-6">
        <h2 className="text-base font-semibold text-text-primary mb-4">API Keys</h2>

        <div className="flex gap-2 mb-6 max-w-sm">
          <Input
            placeholder="Key name"
            value={newKeyName}
            onValueChange={setNewKeyName}
            size="sm"
            variant="bordered"
            classNames={inputStyles}
          />
          <Button
            color="primary" radius="full" size="sm"
            isLoading={creating}
            onPress={handleCreateKey}
            isDisabled={!newKeyName.trim()}
          >
            Create
          </Button>
        </div>

        {(keys || []).length === 0 ? (
          <p className="text-sm text-text-tertiary">No API keys yet.</p>
        ) : (
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-[1fr_160px_120px_80px] gap-4 px-3 py-2 text-xs font-semibold text-text-secondary">
              <span>Name</span><span>Last Used</span><span>Created</span><span className="text-right">Actions</span>
            </div>
            {(keys || []).map(key => (
              <div key={key.id} className="grid grid-cols-[1fr_160px_120px_80px] gap-4 items-center px-3 py-2 rounded-lg hover:bg-surface-raised">
                <span className="text-sm text-text-primary font-medium">{key.name}</span>
                <span className="text-xs text-text-tertiary">
                  {key.last_used ? relativeTime(key.last_used) : "Never"}
                </span>
                <span className="text-xs text-text-tertiary">{relativeTime(key.created_at)}</span>
                <div className="flex justify-end">
                  <Button
                    size="sm" variant="light"
                    className="text-[#f31260] text-xs h-7 min-w-0 px-2"
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
        classNames={{
          base: "bg-surface-elevated border border-border",
          header: "text-text-primary border-b border-border",
          footer: "border-t border-border",
        }}
      >
        <ModalContent>
          <ModalHeader>API Key Created</ModalHeader>
          <ModalBody className="py-4 gap-3">
            <p className="text-sm" style={{ color: "#f5a524" }}>⚠ This key will not be shown again. Copy it now.</p>
            <div className="flex items-center gap-2 bg-surface-raised rounded-lg px-3 py-2">
              <code className="font-mono text-xs text-text-primary flex-1 break-all">{plainKey}</code>
              {plainKey && <CopyButton text={plainKey} />}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="primary" radius="full" onPress={() => setPlainKey(null)}>Done</Button>
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
