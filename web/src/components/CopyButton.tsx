import { useState } from "react";
import { Button, Tooltip } from "@heroui/react";

const CHECK_ICON = (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const COPY_ICON = (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <Tooltip content={copied ? "Copied!" : "Copy"}>
      <Button
        isIconOnly
        size="sm"
        variant="flat"
        className="w-7 h-7 min-w-0 bg-surface-raised border border-border text-text-secondary hover:text-text-primary"
        onPress={handleCopy}
      >
        {copied ? CHECK_ICON : COPY_ICON}
      </Button>
    </Tooltip>
  );
}
