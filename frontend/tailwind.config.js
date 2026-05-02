/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Clash Display'", "ui-sans-serif", "system-ui"],
        body: ["Satoshi", "ui-sans-serif", "system-ui"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      colors: {
        app: "#0A0B0E",
        surface: "#111318",
        surfaceHover: "#1A1D24",
        lime: {
          DEFAULT: "#ccff00",
          muted: "rgba(204, 255, 0, 0.15)",
        },
        cyan: {
          DEFAULT: "#00F0FF",
          muted: "rgba(0, 240, 255, 0.15)",
        },
        status: {
          online: "#ccff00",
          offline: "#FF3366",
          degraded: "#FFB000",
        },
      },
      borderRadius: {
        sm: "3px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
