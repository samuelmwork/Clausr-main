import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        midnight: {
          DEFAULT: '#020617',
          light: '#0f172a',
        },
        brand: {
          DEFAULT: '#4f46e5', // Indigo 600
          light: '#eef2ff',
          dark: '#4338ca',
        },
        page: '#f8fafc', // Slate 50
        surface: '#ffffff',
        border: '#e2e8f0', // Slate 200
        muted: '#64748b', // Slate 500
        active: {
          bg: '#f0fdf4',
          text: '#15803d',
        },
        expiring: {
          bg: '#fffbeb',
          text: '#b45309',
        },
        expired: {
          bg: '#fef2f2',
          text: '#b91c1c',
        },
        cancelled: {
          bg: '#f1f5f9',
          text: '#475569',
        },
        renewed: {
          bg: '#eff6ff',
          text: '#1d4ed8',
        },
      },
      borderRadius: {
        xl: '14px',
        lg: '10px',
        md: '8px',
        sm: '4px',
      },
      fontFamily: {
        sans: ['Inter', '"Avenir Next"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
