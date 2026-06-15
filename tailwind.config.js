// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class', // Habilita o modo escuro baseado na classe 'dark'
  theme: {
    extend: {},
  },
  plugins: [],
};