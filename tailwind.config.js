/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx,jsx,js}"],
  theme: {
    extend: {
      fontFamily: {
        alfaSlab: ['"Alfa Slab One"', "Rockwell", "cursive"],
      },
    },
  },
  plugins: [],
};
