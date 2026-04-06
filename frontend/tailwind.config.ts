import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#061126",
        ink: "#0B0B0F",
        royal: { 300: "#90bcff", 400: "#5b98ff", 500: "#2f6dff", 600: "#1D4ED8", 700: "#183fb0", 900: "#102A56" },
        navy: { 950: "#061126", 900: "#0B1E3A", 800: "#102A56" },
        orange: { 300: "#fdba74", 400: "#fb923c", 500: "#F97316" }
      },
      fontFamily: { display: ["var(--font-sora)", "sans-serif"], body: ["var(--font-manrope)", "sans-serif"] },
      boxShadow: { royal: "0 20px 80px rgba(29,78,216,0.25)", panel: "0 24px 64px rgba(2, 8, 23, 0.46)" },
      backgroundImage: { 'hero-radial': "radial-gradient(circle at 20% 20%, rgba(47,109,255,0.26), transparent 34%), radial-gradient(circle at 80% 20%, rgba(249,115,22,0.16), transparent 26%), radial-gradient(circle at 50% 50%, rgba(16,42,86,0.12), transparent 55%)" },
      keyframes: { shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } } },
      animation: { shimmer: 'shimmer 3s linear infinite' }
    }
  },
  plugins: []
};

export default config;
