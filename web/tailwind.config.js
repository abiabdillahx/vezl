import { heroui } from "@heroui/react";

// Colors are CSS variables (RGB channels) defined in src/index.css, so Tailwind
// opacity modifiers like `bg-accent/10` keep working.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: token("canvas"),
        "canvas-soft": token("canvas-soft"),
        "surface-elevated": token("surface-elevated"),
        "surface-raised": token("surface-raised"),
        "surface-subtle": token("surface-subtle"),
        "surface-muted": token("surface-muted"),
        // Accent: a light azure fill carrying near-black ink (the "lit surface"
        // idea), plus a deeper blue for text, links, and focus on white.
        accent: token("accent"),
        "accent-hover": token("accent-hover"),
        "accent-strong": token("accent-strong"),
        "accent-subtle": "rgb(var(--accent) / 0.12)",
        link: token("accent-strong"),
        border: token("border"),
        "border-strong": token("border-strong"),
        "border-subtle": token("border-subtle"),
        "text-primary": token("text-primary"),
        "text-secondary": token("text-secondary"),
        "text-tertiary": token("text-tertiary"),
        "text-disabled": token("text-disabled"),
        success: token("success"),
        warning: token("warning"),
        danger: token("danger"),
      },
      fontFamily: {
        sans: ["Outfit", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      letterSpacing: {
        display: "-0.015em",
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      layout: {
        // Square-ish, technical shapes: 6px controls, 12px cards/modals.
        radius: { small: "4px", medium: "6px", large: "12px" },
        borderWidth: { small: "1px", medium: "1px", large: "1px" },
      },
      themes: {
        light: {
          colors: {
            background: "#fafafa",
            foreground: "#171717",
            divider: "#ededed",
            focus: "#1766c9",
            content1: "#ffffff",
            content2: "#fafafa",
            content3: "#f2f2f2",
            content4: "#ededed",
            default: {
              50: "#fafafa", 100: "#f2f2f2", 200: "#e6e6e6", 300: "#d4d4d4", 400: "#b2b2b2",
              500: "#9a9a9a", 600: "#707070", 700: "#525252", 800: "#2e2e2e", 900: "#171717",
              DEFAULT: "#e6e6e6", foreground: "#171717",
            },
            primary: {
              50: "#eef7ff", 100: "#d9edff", 200: "#b5dcff", 300: "#86c6ff", 400: "#5eb4ff",
              500: "#3ea6ff", 600: "#2f8ff0", 700: "#1766c9", 800: "#154f98", 900: "#133f75",
              DEFAULT: "#3ea6ff", foreground: "#171717",
            },
            success: { DEFAULT: "#16a34a", foreground: "#ffffff" },
            warning: { DEFAULT: "#f59e0b", foreground: "#171717" },
            danger: { DEFAULT: "#dc2626", foreground: "#ffffff" },
          },
        },
        dark: {
          colors: {
            background: "#18181b",
            foreground: "#fafafa",
            divider: "#27272a",
            focus: "#338ef7",
            content1: "#18181b",
            content2: "#27272a",
            content3: "#3f3f46",
            content4: "#52525b",
            default: {
              50: "#09090b", 100: "#18181b", 200: "#27272a", 300: "#3f3f46", 400: "#52525b",
              500: "#71717a", 600: "#a1a1aa", 700: "#d4d4d8", 800: "#e4e4e7", 900: "#fafafa",
              DEFAULT: "#3f3f46", foreground: "#fafafa",
            },
            primary: {
              50: "#133f75", 100: "#154f98", 200: "#1766c9", 300: "#2f8ff0", 400: "#3ea6ff",
              500: "#3ea6ff", 600: "#5eb4ff", 700: "#86c6ff", 800: "#b5dcff", 900: "#d9edff",
              DEFAULT: "#3ea6ff", foreground: "#171717",
            },
            success: { DEFAULT: "#17c964", foreground: "#09090b" },
            warning: { DEFAULT: "#f5a524", foreground: "#09090b" },
            danger: { DEFAULT: "#f31260", foreground: "#ffffff" },
          },
        },
      },
    }),
  ],
};
