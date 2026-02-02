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
        primary: '#4337F1', // Deep Violet/Indigo
        'bg-start': '#E0E7FF', // Light Purple
        'bg-end': '#EFF6FF', // Soft Blue
        success: '#07C160',
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(135deg, #4337F1 0%, #6B5EFF 100%)',
        'confirm-gradient': 'linear-gradient(90deg, #4337F1 0%, #6B5EFF 100%)',
        'page-gradient': 'linear-gradient(180deg, #E0E7FF 0%, #EFF6FF 100%)',
        'page-gradient-fade': 'linear-gradient(180deg, #E0E7FF 0%, rgba(255,255,255,0) 100%)',
        'due-diligence-gradient': 'linear-gradient(180deg, #E0E7FF 0%, rgba(247,248,250,0) 100%)',
      }
    },
  },
  plugins: [],
}
