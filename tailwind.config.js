/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'navy': '#0a0a1a',
        'navy-card': '#0f1729',
        'navy-light': '#1a2440',
        'electric': '#00ff87',
        'electric-dim': '#00cc6a',
        'gold': '#ffd700',
        'gold-dim': '#ccaa00',
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        body: ['system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
