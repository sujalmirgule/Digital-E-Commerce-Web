import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Velvet Market Design System Tokens
        plum: {
          950: "#120A12", // Main Deep Plum background
          900: "#1B101B", // Secondary sections & surfaces
          850: "#231523",
          800: "#2D1B2D",
        },
        mocha: {
          950: "#181210",
          900: "#211815", // Dark Mocha - primary cards & panels
          850: "#261C18",
          800: "#2B201C", // Elevated Mocha - hover & modals
          750: "#322521",
          700: "#3A2B26",
        },
        cream: {
          50: "#FDFBF7",
          100: "#F7EFE2", // Soft Cream - main text & headings
          200: "#E8D5B5", // Cream - signature highlight & accent
          300: "#DAC39F",
          400: "#BBAE9F", // Muted Cream - secondary text
          500: "#9E9080",
        },
        rose: {
          300: "#FDA4AF",
          400: "#FB7185", // Soft Rose - hover & highlights
          500: "#F43F5E", // Primary Rose - signature CTA
          600: "#E11D48",
          700: "#BE123C",
          800: "#9F1239", // Deep Rose - pressed & active states
          900: "#881337",
        },
        velvet: {
          bg: "#120A12",
          surface: "#1B101B",
          card: "#211815",
          elevated: "#2B201C",
          border: "#3A2930",
          borderHover: "#523B44",
          cream: "#E8D5B5",
          softCream: "#F7EFE2",
          mutedCream: "#BBAE9F",
          rose: "#F43F5E",
          softRose: "#FB7185",
          deepRose: "#9F1239",
          success: "#86A989",
          error: "#E57373",
        },
        // Backward compatibility mappings for existing component classes
        brand: {
          50: "#FDFBF7",
          100: "#F7EFE2",
          200: "#E8D5B5",
          300: "#FB7185",
          400: "#FB7185",
          500: "#F43F5E",
          600: "#E11D48",
          700: "#BE123C",
          800: "#9F1239",
          900: "#881337",
          950: "#120A12",
        },
        dark: {
          950: "#120A12",
          900: "#1B101B",
          850: "#211815",
          800: "#2B201C",
          750: "#322521",
          700: "#3A2930",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Playfair Display", "Georgia", "serif"],
        display: ["var(--font-serif)", "Playfair Display", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "Inter", "sans-serif"],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
export default config;

