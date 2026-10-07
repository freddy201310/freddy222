import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        moss: { 50: "#f3f7f1", 100: "#e3ede0", 200: "#c6dbc0", 300: "#9fc297", 400: "#76a46c", 500: "#56874d", 600: "#436c3c", 700: "#365632", 800: "#2d462a", 900: "#263b25" },
        dawn: { 50: "#fff8f1", 100: "#ffeedd", 200: "#ffd9b5", 300: "#ffbd85", 400: "#fb9a57", 500: "#f47c36" },
        sky: { 50: "#f2f8fc", 100: "#e1eff8", 200: "#bfdcef", 300: "#8cc1e2", 400: "#57a0d0", 500: "#3483bb" },
        bark: { 500: "#7a5c43", 700: "#4f3b2b", 900: "#2b2119" },
        cream: "#fbf8f2",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
      },
      boxShadow: { soft: "0 10px 30px -12px rgba(38, 59, 37, 0.25)" },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        sway: { "0%,100%": { transform: "rotate(-1.5deg)" }, "50%": { transform: "rotate(1.5deg)" } },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        sway: "sway 7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
