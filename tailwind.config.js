/** @type {import('tailwindcss').Config} */

const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: ["./app/**/*.{ts,tsx,jsx,js}"],
  theme: {
    extend: {
      fontFamily: {
        alfaSlab: ['"Alfa Slab One"', "Rockwell", "cursive"],
        sans: [
          "Sanchez",
          '"Courier New"',
          "monospace",
          ...defaultTheme.fontFamily.sans,
        ],
      },
      gridTemplateColumns: {
        cardsMobile: "repeat(auto-fill, 1fr)",
        cardsDesktop: "repeat(auto-fill, minmax(20rem, 1fr))",
      },
    },
  },
  plugins: [],
};
