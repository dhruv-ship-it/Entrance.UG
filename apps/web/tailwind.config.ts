import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f7f8f4',
        ink: '#17221c',
        moss: { 50: '#f2f7f0', 100: '#e2efdf', 200: '#c6dfc0', 500: '#4f8a62', 600: '#367047', 700: '#285a39', 800: '#1f4d3a', 900: '#183c2e' },
        lime: '#cce975',
        amber: '#edb94a',
        coral: '#ea735d',
        sky: '#58a7c4',
      },
      boxShadow: {
        card: '0 1px 2px rgba(23,34,28,.04), 0 12px 30px rgba(40,90,57,.055)',
        float: '0 18px 46px rgba(28,57,42,.14)',
      },
      borderRadius: { '4xl': '1.75rem' },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
} satisfies Config;

