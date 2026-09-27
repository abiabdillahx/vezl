// Shared HeroUI `classNames` so form fields and dialogs look the same everywhere.

export const inputClassNames = {
  input: "text-text-primary text-sm placeholder:text-text-disabled",
  inputWrapper:
    "bg-canvas border-border shadow-none hover:border-border-strong data-[hover=true]:border-border-strong " +
    "group-data-[focus=true]:border-accent-strong data-[focus=true]:border-accent-strong",
  label: "text-text-secondary text-[13px]",
};

export const modalClassNames = {
  base: "bg-surface-elevated border border-border shadow-xl",
  header: "text-text-primary text-lg font-medium border-b border-border-subtle",
  body: "text-text-secondary",
  footer: "border-t border-border-subtle",
};

// Quiet secondary button: white with a hairline, like an outline button.
export const secondaryButtonClass =
  "bg-canvas border border-border text-text-primary font-medium hover:bg-surface-raised";

// Recharts takes literal colors (SVG attributes can't read CSS variables);
// keep these in sync with the tokens in index.css.
export const chartColors = {
  light: {
    line: "#2f8ff0",
    grid: "#ededed",
    axis: "#707070",
    tooltipBg: "#ffffff",
    tooltipBorder: "#e5e5e5",
    tooltipLabel: "#171717",
    tooltipItem: "#525252",
  },
  dark: {
    line: "#3ea6ff",
    grid: "#27272a",
    axis: "#a1a1aa",
    tooltipBg: "#18181b",
    tooltipBorder: "#3f3f46",
    tooltipLabel: "#fafafa",
    tooltipItem: "#a1a1aa",
  },
};
