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
        surface: "#FFFFFF",
        line: "#D8D5CC",
        warning: {
          DEFAULT: "#9A6B2F",
          bg: "#F5EDE0",
        },
        error: {
          DEFAULT: "#A23B3B",
          bg: "#F5E4E1",
        },
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
      borderRadius: {
        // Direction "Confident System" (Sprint 26) : cartes en radius-md
        // (10px), pas radius-lg (16px, réservé aux grands panneaux). `sm`
        // (badges, petits boutons) vaut 6px dans les tokens — PAS le 2px
        // par défaut de Tailwind, qui serait un écart silencieux. Le
        // `DEFAULT` (rounded, champs de saisie) reste inchangé.
        sm: "6px",
        md: "10px",
        lg: "16px",
      },
    },
  },
  plugins: [],
};
export default config;
