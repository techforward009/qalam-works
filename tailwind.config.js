/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // --font-nastaliq is Mehr Nastaliq Web (see app/globals.css). Noto Nastaliq Urdu is not preloaded.
        nastaliq: ["var(--font-nastaliq)", "var(--font-nastaliq-latin)", "Urdu Typesetting", "serif"],
        // next/font populates --font-naskh at runtime (Noto Naskh Arabic from Google Fonts).
        // Named fallbacks give a readable Urdu/Arabic Naskh face on any system that has one.
        naskh: ["var(--font-naskh)", "Noto Naskh Arabic", "Scheherazade New", "Amiri", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
