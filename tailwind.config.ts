import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        luna: {
          base:       "var(--luna-base)",
          "base-1":   "var(--luna-base-1)",
          "base-2":   "var(--luna-base-2)",
          "base-3":   "var(--luna-base-3)",
          hairline:   "var(--luna-hairline)",
          "hairline-2": "var(--luna-hairline-2)",
          fg:         "var(--luna-fg)",
          "fg-2":     "var(--luna-fg-2)",
          "fg-3":     "var(--luna-fg-3)",
          "fg-4":     "var(--luna-fg-4)",
          cyan:       "var(--luna-cyan)",
          "cyan-dim": "var(--luna-cyan-dim)",
          success:    "var(--luna-success)",
          warning:    "var(--luna-warning)",
          danger:     "var(--luna-danger)",
          violet:     "var(--luna-violet)",
        },
      },
      fontFamily: {
        sans:    ["var(--luna-font-body)", "system-ui", "sans-serif"],
        mono:    ["var(--luna-font-mono)", "monospace"],
        display: ["var(--luna-font-display)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--luna-radius-lg)",
        md: "var(--luna-radius-md)",
        DEFAULT: "var(--luna-radius)",
        sm: "var(--luna-radius-sm)",
        xs: "var(--luna-radius-xs)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "luna-pulse": {
          "0%":   { transform: "scale(0.6)", opacity: "0.9" },
          "100%": { transform: "scale(2)",   opacity: "0" },
        },
        "luna-shake": {
          "0%":   { transform: "translateX(0)" },
          "15%":  { transform: "translateX(-6px)" },
          "30%":  { transform: "translateX(6px)" },
          "45%":  { transform: "translateX(-4px)" },
          "60%":  { transform: "translateX(4px)" },
          "75%":  { transform: "translateX(-2px)" },
          "90%":  { transform: "translateX(2px)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "luna-pulse":     "luna-pulse 2.4s infinite cubic-bezier(0.16, 1, 0.3, 1)",
        "luna-shake":     "luna-shake 300ms cubic-bezier(0.22, 0.61, 0.36, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
