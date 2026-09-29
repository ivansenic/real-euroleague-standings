import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      keyframes: {
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(1.5rem)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-1.5rem)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "slide-in-right": "slide-in-right 150ms ease-out",
        "slide-in-left": "slide-in-left 150ms ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
