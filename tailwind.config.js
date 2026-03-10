/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "#FFFDF7",
          card: "#FFFCF5",
          hover: "#FFF9F0",
        },
        border: {
          subtle: "#F5EED9",
          input: "#E8E0D0",
        },
        category: {
          development: {
            DEFAULT: "#FFDE59",
            bg: "#FFF3CC",
            text: "#8B7355",
            calendar: "#FFF8E1",
          },
          collaboration: {
            DEFAULT: "#FFB366",
            bg: "#FFE8CC",
            text: "#8B6644",
            calendar: "#FFF0E0",
          },
          client: {
            DEFAULT: "#F5A88E",
            bg: "#FFE8DD",
            text: "#8B5A44",
            calendar: "#FFF5F0",
          },
        },
        text: {
          primary: "#4A4A42",
          secondary: "#8B8B7A",
          muted: "#A8A89C",
        },
        status: {
          connected: "#4CAF50",
          "connected-bg": "#E8F5E9",
          "connected-text": "#2E7D32",
        },
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        serif: ["IBM Plex Serif", "Georgia", "serif"],
      },
      borderRadius: {
        DEFAULT: "10px",
        sm: "6px",
        lg: "12px",
      },
      fontSize: {
        xs: ["10px", { lineHeight: "14px" }],
        sm: ["11px", { lineHeight: "16px" }],
        base: ["13px", { lineHeight: "20px" }],
        lg: ["14px", { lineHeight: "22px" }],
        xl: ["18px", { lineHeight: "26px" }],
        "2xl": ["24px", { lineHeight: "32px" }],
      },
    },
  },
  plugins: [],
};
