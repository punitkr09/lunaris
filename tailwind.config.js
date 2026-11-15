/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#040507',
          900: '#090B0F',
          850: '#0E1117',
          800: '#141820',
          700: '#1D222D',
          600: '#2B3242',
        },
        lunar: {
          50: '#FAFBFD',
          100: '#F2F4F8',
          200: '#E2E5EC',
          300: '#B0B7C5',
          400: '#7D8596',
          500: '#535B6B',
        },
        amber: {
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#F59E0B',
          500: '#D97706',
          950: '#231407',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['Inter', '"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.03em',
        widest: '0.06em',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.35s ease-out both',
      },
    },
  },
  plugins: [],
};
