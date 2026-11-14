/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#02050a',
          900: '#060d17',
          850: '#0a0f16',
          800: '#0f1722',
          700: '#1d2836',
          600: '#2b3f57',
        },
        rcpt: {
          cyan: '#17a9f0',
          cyanGlow: 'rgba(23, 169, 240, 0.4)',
          good: '#35d08a',
          warn: '#ffb224',
          bad: '#ff5d4d',
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
