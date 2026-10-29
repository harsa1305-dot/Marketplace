import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#121212",
          surface: "#1E1E1E",
          border: "#2E2E2E",
          muted: "#9CA3AF",
        },
        brand: {
          sapphire: "#2563EB",
          sapphireHover: "#1D4ED8",
          electric: "#3B82F6",
          navy: "#1E3A8A",
          deepNavy: "#0F172A",
        },
      },
    },
  },
  plugins: [],
};

export default config;

