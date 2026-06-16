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
        primary: '#004ACC',
        'bg-start': '#F7FAFE',
        'bg-end': '#FFFFFF',
        success: '#10B981',
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(180deg, #337DFF 0%, #004ACC 100%)',
        'confirm-gradient': 'linear-gradient(180deg, #337DFF 0%, #004ACC 100%)',
        'page-gradient': 'linear-gradient(180deg, #F7FAFE 0%, #FFFFFF 100%)',
        'page-gradient-fade': 'linear-gradient(180deg, #F7FAFE 0%, rgba(255,255,255,0) 100%)',
        'due-diligence-gradient': 'linear-gradient(180deg, #F7FAFE 0%, rgba(255,255,255,0) 100%)',
      }
    },
  },
  plugins: [],
}
