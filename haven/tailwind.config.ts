import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 50: "#f5f7fb", 100: "#e8edf6", 200: "#cfd8ea", 300: "#a6b5d3", 400: "#7489b4", 500: "#4f6697", 600: "#3b4f7c", 700: "#2f3f64", 800: "#222e4a", 900: "#151d31" },
        haven: { 50: "#eefbf7", 100: "#d5f5ea", 200: "#ade9d6", 300: "#77d6bd", 400: "#3fbc9f", 500: "#1f9f84", 600: "#14806b", 700: "#136657", 800: "#135147", 900: "#11433b" },
        warn: { 50: "#fff8eb", 100: "#feeac7", 500: "#d97706", 700: "#92400e" },
        danger: { 50: "#fef2f2", 100: "#fde2e2", 500: "#dc2626", 700: "#991b1b" },
      },
      fontFamily: { sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"] },
      boxShadow: { soft: "0 8px 28px -14px rgba(21, 29, 49, 0.28)" },
    },
  },
  plugins: [],
} satisfies Config;
