import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0D6E6E",
          foreground: "#FAFAF8",
        },
        amber: {
          brand: "#F5A623",
        },
        coral: {
          brand: "#E8705A",
        },
        "off-white": "#FAFAF8",
        dark: "#1A1A2E",
        // Life area colours
        "life-career": "#0D6E6E",
        "life-health": "#4CAF50",
        "life-relations": "#E8705A",
        "life-learning": "#9C27B0",
        "life-finance": "#F5A623",
        "life-creativity": "#FF5722",
        "life-environment": "#00BCD4",
        "life-contribution": "#3F51B5",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        contemplative: ["Georgia", "ui-serif", "serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
