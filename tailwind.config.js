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
        'bg-start': '#F5F8FD',
        'bg-end': '#FFFFFF',
        success: '#10B981',
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(180deg, #3B82F6 0%, #004ACC 100%)',
        'confirm-gradient': 'linear-gradient(180deg, #3B82F6 0%, #004ACC 100%)',
        'page-gradient': 'radial-gradient(circle at 16% 4%, rgba(51,125,255,0.11) 0, rgba(51,125,255,0) 30%), radial-gradient(circle at 92% 16%, rgba(124,58,237,0.065) 0, rgba(124,58,237,0) 28%), linear-gradient(180deg, #F7FAFE 0%, #FFFFFF 100%)',
        'page-gradient-fade': 'linear-gradient(180deg, #F7FAFE 0%, rgba(255,255,255,0) 100%)',
        'due-diligence-gradient': 'radial-gradient(circle at 16% 4%, rgba(51,125,255,0.11) 0, rgba(51,125,255,0) 30%), linear-gradient(180deg, #F7FAFE 0%, rgba(255,255,255,0) 100%)',
      }
    },
  },
  plugins: [],
}
