import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Palette Sinistria : encre (structure), ardoise (texte secondaire), signal (accent teal)
        ink: {
          DEFAULT: "#1B2430",
          light: "#2E3A4A",
        },
        slate: {
          DEFAULT: "#3D5A73",
          light: "#6B8299",
        },
        signal: {
          DEFAULT: "#0F6E56",
          light: "#1D9E75",
          bg: "#E1F5EE",
        },
        canvas: "#F6F5F1",
        line: "#D8D5CC",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
