import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'green-deep': '#1a3a2a',
        'green-mid': '#2d6a4f',
        'green-light': '#52b788',
        'gold': '#c9a84c',
        'gold-light': '#e8c97a',
        'cream': '#f5f0e8',
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config