/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Lovable "new-york" / slate design system (hex-approximated from its
        // oklch tokens). The `forest` keys keep their names but now carry the
        // neutral dark-slate "primary"; `amber` stays the warm accent.
        forest: {
          DEFAULT: '#1E293B', // slate-800 — primary surfaces/buttons
          dark: '#0F172A', // slate-900 — hover/active
          light: '#334155', // slate-700
          50: '#F1F5F9', // slate-100 — soft fills / badges
        },
        amber: {
          DEFAULT: '#F4A261',
          dark: '#E76F51',
        },
        slate: {
          bg: '#F8FAFC', // slate-50 — app background
        },
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.15rem',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(15 23 42 / 0.04)',
        DEFAULT: '0 4px 16px -6px rgb(15 23 42 / 0.10)',
        md: '0 8px 24px -10px rgb(15 23 42 / 0.12)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
