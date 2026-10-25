/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#080a10',
        surface: '#111621',
        'surface-alt': '#1a2234',
        'surface-hover': '#242f47',
        primary: '#10b981',
        secondary: '#0ea5e9',
        accent: '#f59e0b',
        text: '#f8fafc',
        muted: '#94a3b8',
        border: '#1e293b',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      }
    },
  },
  plugins: [],
}
