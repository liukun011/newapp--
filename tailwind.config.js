/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#C99A3A',
        'bg-start': '#F8F3E8',
        'bg-end': '#FFFDF8',
        success: '#07C160',
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(180deg, #E8D287 0%, #C99A3A 100%)',
        'confirm-gradient': 'linear-gradient(180deg, #E8D287 0%, #C99A3A 100%)',
        'page-gradient': 'linear-gradient(180deg, #F8F3E8 0%, #FFFDF8 100%)',
        'page-gradient-fade': 'linear-gradient(180deg, #F8F3E8 0%, rgba(255,253,248,0) 100%)',
        'due-diligence-gradient': 'linear-gradient(180deg, #F8F3E8 0%, rgba(255,253,248,0) 100%)',
      }
    },
  },
  plugins: [],
}
