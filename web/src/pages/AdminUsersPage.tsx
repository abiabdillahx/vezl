import { useEffect, useState } from "react";
import { Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Spinner } from "@heroui/react";
import { usersApi } from "@/api/client";
import type { User } from "@/api/types";
import { RoleChip, relativeTime } from "@/components/chips";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { inputClassNames, modalClassNames, secondaryButtonClass } from "@/components/styles";


export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
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

  function openEdit(user: User) {
    setEditTarget(user);
    setEmail(user.email);
    setUsername(user.username);
    setRole(user.role);
    setPassword("");
    setFormError("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    setFormError("");
    try {
      const payload: { email: string; username: string; role: string; password?: string } = {
        email, username, role,
      };
      if (password.trim()) payload.password = password;
      const updated = await usersApi.update(editTarget.id, payload);
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      setEditTarget(null);
      resetForm();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to update user.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-semibold text-text-primary tracking-display">Users</h1>
        <Button color="primary" className="font-medium" onPress={() => setCreateOpen(true)}>
          + Create User
        </Button>
      </div>

      <div className="bg-surface-elevated border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-48"><Spinner size="sm" /></div>
        ) : (users || []).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <p className="text-base font-medium text-text-primary">No users yet</p>
          </div>
        ) : (
          <table className="w-full text-[15px] whitespace-nowrap">
            <thead>
              <tr className="bg-surface-muted border-b border-border-subtle">
                <th className="text-left text-[13px] font-medium text-text-tertiary px-5 py-3">Email</th>
                <th className="text-left text-[13px] font-medium text-text-tertiary px-5 py-3">Username</th>
                <th className="text-left text-[13px] font-medium text-text-tertiary px-5 py-3">Role</th>
                <th className="text-left text-[13px] font-medium text-text-tertiary px-5 py-3">Created</th>
                <th className="text-right text-[13px] font-medium text-text-tertiary px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <tr key={user.id} className={`border-b border-border-subtle hover:bg-surface-muted ${i === users.length - 1 ? "border-0" : ""}`}>
                  <td className="px-5 py-3.5 text-text-primary">{user.email}</td>
                  <td className="px-5 py-3.5 text-text-secondary">{user.username}</td>
                  <td className="px-5 py-3.5"><RoleChip role={user.role} /></td>
                  <td className="px-5 py-3.5 text-sm text-text-tertiary">{relativeTime(user.created_at)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm" variant="light"
                        className="text-text-secondary text-sm font-medium h-8 min-w-0 px-2.5"
                        onPress={() => openEdit(user)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm" variant="light"
                        className="text-danger text-sm font-medium h-8 min-w-0 px-2.5 data-[hover=true]:bg-danger/10"
                        onPress={() => setDeleteTarget(user)}
                      >
                        Delete
                      </Button>
                    </div>
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
        classNames={modalClassNames}
      >
        <ModalContent>
          <form onSubmit={handleCreate}>
            <ModalHeader>Create User</ModalHeader>
            <ModalBody className="gap-4 py-5">
              <Input label="Email" type="email" value={email} onValueChange={setEmail} variant="bordered" classNames={inputClassNames} isRequired />
              <Input label="Username" value={username} onValueChange={setUsername} variant="bordered" classNames={inputClassNames} isRequired />
              <Input label="Password" type="password" value={password} onValueChange={setPassword} variant="bordered" classNames={inputClassNames} isRequired />
              <div>
                <p className="text-[13px] text-text-secondary mb-1.5">Role</p>
                <div className="flex gap-2">
                  {["member", "admin"].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`px-3.5 py-1.5 rounded-md text-sm font-medium border capitalize transition-colors ${role === r ? "bg-accent-subtle border-accent/40 text-accent-strong" : "bg-canvas border-border text-text-secondary hover:border-border-strong"}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              {formError && <p className="text-[13px] text-danger">{formError}</p>}
            </ModalBody>
            <ModalFooter>
              <Button className={secondaryButtonClass} type="button" onPress={() => { setCreateOpen(false); resetForm(); }}>Cancel</Button>
              <Button type="submit" color="primary" className="font-medium" isLoading={saving}>Create User</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Edit modal */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => { setEditTarget(null); resetForm(); }}
        classNames={modalClassNames}
      >
        <ModalContent>
          <form onSubmit={handleEdit}>
            <ModalHeader>Edit User</ModalHeader>
            <ModalBody className="gap-4 py-5">
              <Input label="Email" type="email" value={email} onValueChange={setEmail} variant="bordered" classNames={inputClassNames} isRequired />
              <Input label="Username" value={username} onValueChange={setUsername} variant="bordered" classNames={inputClassNames} isRequired />
              <Input label="New Password (leave blank to keep)" type="password" value={password} onValueChange={setPassword} variant="bordered" classNames={inputClassNames} />
              <div>
                <p className="text-[13px] text-text-secondary mb-1.5">Role</p>
                <div className="flex gap-2">
                  {["member", "admin"].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`px-3.5 py-1.5 rounded-md text-sm font-medium border capitalize transition-colors ${role === r ? "bg-accent-subtle border-accent/40 text-accent-strong" : "bg-canvas border-border text-text-secondary hover:border-border-strong"}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              {formError && <p className="text-[13px] text-danger">{formError}</p>}
            </ModalBody>
            <ModalFooter>
              <Button className={secondaryButtonClass} type="button" onPress={() => { setEditTarget(null); resetForm(); }}>Cancel</Button>
              <Button type="submit" color="primary" className="font-medium" isLoading={saving}>Save Changes</Button>
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
