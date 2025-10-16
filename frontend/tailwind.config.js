/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter Black', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Custom fintech palette
        'bg-primary': '#F9FAFB',
        'sidebar-dark': '#1C1E21',
        'blue-gray': '#8DA9C4',
        'pastel-green': '#B7C9A9',
        'pale-pink': '#F2B6B6',
        'soft-yellow': '#E7D9A9',
        'fintech-black': '#111827',
      },
      backgroundImage: {
        'gradient-blue-teal': 'linear-gradient(135deg, #3B82F6 0%, #14B8A6 100%)',
        'gradient-pastel': 'linear-gradient(135deg, #8DA9C4 0%, #B7C9A9 100%)',
      },
    },
  },
  plugins: [],
}