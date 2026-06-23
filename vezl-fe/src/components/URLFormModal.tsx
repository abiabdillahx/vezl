import { useEffect, useState } from "react";
import {
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Button, Input, Textarea, Switch,
} from "@heroui/react";
import type { URL, CreateURLPayload, UpdateURLPayload } from "@/api/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateURLPayload | UpdateURLPayload) => Promise<void>;
  initial?: URL;
}

function extractStr(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null && "String" in val) return (val as { String: string }).String ?? "";
  return String(val);
}

const inputStyles = {
  input: "bg-surface-raised text-text-primary text-sm",
  inputWrapper: "bg-surface-raised border-border hover:border-border-strong data-[focus=true]:border-accent",
  label: "text-text-secondary text-xs",
};

export function URLFormModal({ isOpen, onClose, onSubmit, initial }: Props) {
  const isEdit = !!initial;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [originalUrl, setOriginalUrl] = useState("");
  const [shortcode, setShortcode] = useState("");
  const [notes, setNotes] = useState("");
  const [secret, setSecret] = useState("");
  const [hitLimit, setHitLimit] = useState("-1");
  const [expiresAt, setExpiresAt] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (initial) {
      setOriginalUrl(initial.original_url);
      setShortcode(initial.shortcode);
      setNotes(extractStr(initial.notes));
      setSecret(extractStr(initial.secret));
      setHitLimit(String(initial.hit_limit));
      setExpiresAt(initial.expires_at && typeof initial.expires_at === 'string' ? initial.expires_at.slice(0, 16) : "");
      setActive(initial.active);
    } else {
      setOriginalUrl(""); setShortcode(""); setNotes(""); setSecret("");
      setHitLimit("-1"); setExpiresAt(""); setActive(true);
    }
    setError("");
  }, [initial, isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload: CreateURLPayload | UpdateURLPayload = {
        original_url: originalUrl,
        ...(shortcode && !isEdit && { shortcode }),
        ...(notes && { notes }),
        ...(secret && { secret }),
        hit_limit: parseInt(hitLimit) || -1,
        ...(expiresAt && { expires_at: new Date(expiresAt).toISOString() }),
        ...(isEdit && { active }),
      };
      await onSubmit(payload);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      classNames={{
        base: "bg-surface-elevated border border-border",
        header: "text-text-primary border-b border-border",
        footer: "border-t border-border",
      }}
    >
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader>{isEdit ? "Edit Link" : "Create Short URL"}</ModalHeader>
          <ModalBody className="gap-3 py-4">
            <Input
              label="Original URL"
              placeholder="https://example.com/long-url"
              value={originalUrl}
              onValueChange={setOriginalUrl}
              variant="bordered"
              classNames={inputStyles}
              isRequired
            />
            {!isEdit && (
              <Input
                label="Custom shortcode (optional)"
                placeholder="my-link"
                value={shortcode}
                onValueChange={setShortcode}
                variant="bordered"
                classNames={{ ...inputStyles, input: "bg-surface-raised text-text-primary text-sm font-mono" }}
              />
            )}
            <Textarea
              label="Notes (optional)"
              value={notes}
              onValueChange={setNotes}
              variant="bordered"
              minRows={2}
              classNames={inputStyles}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Hit limit (-1 = unlimited)"
                type="number"
                value={hitLimit}
                onValueChange={setHitLimit}
                variant="bordered"
                classNames={inputStyles}
              />
              <Input
                label="Expires at"
                type="datetime-local"
                value={expiresAt}
                onValueChange={setExpiresAt}
                variant="bordered"
                classNames={inputStyles}
              />
            </div>
            <Input
              label="Secret (optional)"
              type="password"
              value={secret}
              onValueChange={setSecret}
              variant="bordered"
              classNames={inputStyles}
            />
            {isEdit && (
              <div className="flex items-center gap-3">
                <Switch isSelected={active} onValueChange={setActive} size="sm" color="success" />
                <span className="text-sm text-text-secondary">Active</span>
              </div>
            )}
            {error && <p className="text-xs text-[#f31260]">{error}</p>}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" className="text-text-secondary" onPress={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit" color="primary" radius="full" isLoading={loading}>
              {isEdit ? "Save Changes" : "Create Link"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
