import { heroui } from "@heroui/react";

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
        canvas: "#09090b",
        "surface-elevated": "#18181b",
        "surface-raised": "#27272a",
        "surface-subtle": "#3f3f46",
        accent: "#006FEE",
        "accent-hover": "#005BC4",
        "accent-subtle": "rgba(0,111,238,0.12)",
        link: "#338EF7",
        border: "#27272a",
        "border-strong": "#52525b",
        "border-subtle": "#18181b",
        "text-primary": "#fafafa",
        "text-secondary": "#a1a1aa",
        "text-tertiary": "#71717a",
        "text-disabled": "#52525b",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  darkMode: "class",
  plugins: [heroui()],
};
