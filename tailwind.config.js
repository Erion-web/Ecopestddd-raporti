/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        green: {
          DEFAULT: '#1a6b2a',
          light: '#2d8a40',
          pale: '#e8f5eb',
        },
        yellow: { DEFAULT: '#f5c518', pale: '#fffbec' },
        ecoRed: { DEFAULT: '#c0392b', pale: '#fdf0ef' },
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
