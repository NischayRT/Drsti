import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', "monospace"],
        sans: ['"DM Sans"', "sans-serif"],
      },
      colors: {
        bg:             "#080808",
        surface:        "#0d0d0d",
        border:         "#181818",
        accent:         "#c8f04a",
        "accent-dim":   "#8aaa2e",
        muted:          "#5f5f5f",
        "text-primary": "#e8e8e8",
        "text-muted":   "#484848",
        "text-dim":     "#303030",
        "break-short":  "#4af0d4",
        "break-long":   "#f04a8a",
      },
      animation: {
        "fade-in":  "fadeIn 0.4s ease forwards",
        "slide-up": "slideUp 0.3s ease forwards",
        "break-in": "breakIn 0.3s ease forwards",
        blink:      "blink 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        breakIn: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.3" },
        },
      },
    },
  },
  plugins: [],
}

export default config
