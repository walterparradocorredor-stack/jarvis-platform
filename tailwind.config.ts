import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        jarvis: {
          bg: "#050811",
          card: "#0b1021",
          border: "rgba(34, 211, 238, 0.15)",
          cyan: "#06b6d4",
          blue: "#3b82f6",
          emerald: "#10b981",
          accent: "#22d3ee",
          darkNavy: "#070c1a",
          darkCard: "#0f172a",
        },
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        glowCyan: "0 0 25px rgba(6, 182, 212, 0.25)",
        glowBlue: "0 0 25px rgba(59, 130, 246, 0.25)",
        glowEmerald: "0 0 25px rgba(16, 185, 129, 0.25)",
      },
      animation: {
        pulseGlow: "pulseGlow 3s ease-in-out infinite",
        scanline: "scanline 8s linear infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
