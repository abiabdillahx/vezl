import { useEffect, useState } from "react";
import { Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Spinner } from "@heroui/react";
import { usersApi } from "@/api/client";
import type { User } from "@/api/types";
import { RoleChip, relativeTime } from "@/components/chips";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const inputStyles = {
  input: "bg-surface-raised text-text-primary text-sm",
  inputWrapper: "bg-surface-raised border-border hover:border-border-strong data-[focus=true]:border-accent",
  label: "text-text-secondary text-xs",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("member");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    usersApi.list().then(data => setUsers(data || [])).finally(() => setLoading(false));
  }, []);

  function resetForm() {
    setEmail(""); setUsername(""); setPassword(""); setRole("member"); setFormError("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const user = await usersApi.create({ email, username, password, role });
      setUsers(prev => [user, ...prev]);
      setCreateOpen(false);
      resetForm();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create user.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await usersApi.delete(deleteTarget.id);
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Users</h1>
        <Button color="primary" radius="full" size="sm" onPress={() => setCreateOpen(true)}>
          + Create User
        </Button>
      </div>

      <div className="bg-surface-elevated border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-48"><Spinner size="sm" /></div>
        ) : (users || []).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <p className="text-sm font-semibold text-text-primary">No users yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-raised border-b border-border">
                <th className="text-left text-xs font-semibold text-text-secondary px-4 py-3">Email</th>
                <th className="text-left text-xs font-semibold text-text-secondary px-4 py-3">Username</th>
                <th className="text-left text-xs font-semibold text-text-secondary px-4 py-3">Role</th>
                <th className="text-left text-xs font-semibold text-text-secondary px-4 py-3">Created</th>
                <th className="text-right text-xs font-semibold text-text-secondary px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <tr key={user.id} className={`border-b border-border-subtle hover:bg-surface-raised ${i === users.length - 1 ? "border-0" : ""}`}>
                  <td className="px-4 py-3 text-text-primary">{user.email}</td>
                  <td className="px-4 py-3 text-text-secondary">{user.username}</td>
                  <td className="px-4 py-3"><RoleChip role={user.role} /></td>
                  <td className="px-4 py-3 text-xs text-text-tertiary">{relativeTime(user.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm" variant="light"
                      className="text-[#f31260] text-xs h-7 min-w-0 px-2"
                      onPress={() => setDeleteTarget(user)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => { setCreateOpen(false); resetForm(); }}
        classNames={{
          base: "bg-surface-elevated border border-border",
          header: "text-text-primary border-b border-border",
          footer: "border-t border-border",
        }}
      >
        <ModalContent>
          <form onSubmit={handleCreate}>
            <ModalHeader>Create User</ModalHeader>
            <ModalBody className="gap-3 py-4">
              <Input label="Email" type="email" value={email} onValueChange={setEmail} variant="bordered" classNames={inputStyles} isRequired />
              <Input label="Username" value={username} onValueChange={setUsername} variant="bordered" classNames={inputStyles} isRequired />
              <Input label="Password" type="password" value={password} onValueChange={setPassword} variant="bordered" classNames={inputStyles} isRequired />
              <div>
                <p className="text-xs text-text-secondary mb-1">Role</p>
                <div className="flex gap-2">
                  {["member", "admin"].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${role === r ? "border-accent text-accent" : "border-border text-text-secondary hover:border-border-strong"}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              {formError && <p className="text-xs text-[#f31260]">{formError}</p>}
            </ModalBody>
            <ModalFooter>
              <Button variant="light" className="text-text-secondary" type="button" onPress={() => { setCreateOpen(false); resetForm(); }}>Cancel</Button>
              <Button type="submit" color="primary" radius="full" isLoading={saving}>Create User</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete User?"
        description={`This will permanently delete "${deleteTarget?.email}" and all their links.`}
      />
    </>
  );
}
