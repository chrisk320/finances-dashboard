import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          page: "#070910",
          panel: "#0b0d14",
          card: "#0f1117",
          inset: "#09090f",
        },
        border: {
          DEFAULT: "#1a1d2e",
          subtle: "#2a2d3e",
        },
        text: {
          primary: "#f0f2f8",
          secondary: "#8b9ab8",
          muted: "#4a5170",
          dim: "#3a4060",
        },
      },
      fontFamily: {
        mono: ["'DM Mono'", "monospace"],
        sans: ["'DM Sans'", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
