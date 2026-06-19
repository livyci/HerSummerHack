/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#2D6A4F',
          dark: '#1B4332',
          light: '#40916C',
          50: '#E9F3EE',
        },
        amber: {
          DEFAULT: '#F4A261',
          dark: '#E76F51',
        },
        slate: {
          bg: '#F1F3F5',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
