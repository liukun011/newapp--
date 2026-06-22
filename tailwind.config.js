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
        primary: '#2563EB',
        'bg-start': '#F7FAFE',
        'bg-end': '#FFFFFF',
        success: '#10B981',
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(0deg, #2563EB, #2563EB)',
        'confirm-gradient': 'linear-gradient(0deg, #2563EB, #2563EB)',
        'page-gradient': 'linear-gradient(0deg, #F7FAFE, #F7FAFE)',
        'page-gradient-fade': 'linear-gradient(0deg, #F7FAFE, #F7FAFE)',
        'due-diligence-gradient': 'linear-gradient(0deg, #F7FAFE, #F7FAFE)',
      }
    },
  },
  plugins: [],
}
