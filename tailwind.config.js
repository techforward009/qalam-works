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
        // next/font populates --font-nastaliq at runtime (Noto Nastaliq Urdu from Google Fonts).
        // Named fallbacks cover environments where the variable is not yet set (e.g. FOUT,
        // pre-hydration) or where Google Fonts cannot be reached.
        nastaliq: ["var(--font-nastaliq)", "var(--font-nastaliq-latin)", "Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", "Urdu Typesetting", "serif"],
        // next/font populates --font-naskh at runtime (Noto Naskh Arabic from Google Fonts).
        // Named fallbacks give a readable Urdu/Arabic Naskh face on any system that has one.
        naskh: ["var(--font-naskh)", "Noto Naskh Arabic", "Scheherazade New", "Traditional Arabic", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
