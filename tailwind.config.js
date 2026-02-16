/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#00D4FF",
        dark: "#070B0F",
        glass: "rgba(255, 255, 255, 0.1)",
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
