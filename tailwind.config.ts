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
        navy: {
          DEFAULT: '#1B2430',
          light: '#263241',
        },
        brand: {
          DEFAULT: '#D97706',
          light: '#FFF1DE',
          dark: '#B45309',
        },
        page: '#F5F1EA',
        surface: '#FFFCF7',
        border: '#E8DDCF',
        muted: '#7C7468',
        active: {
          bg: '#E7F7EE',
          text: '#146C43',
        },
        expiring: {
          bg: '#FFF2D9',
          text: '#9A5A00',
        },
        expired: {
          bg: '#FCE8E8',
          text: '#9C2B2B',
        },
        cancelled: {
          bg: '#EFE9DF',
          text: '#736B5F',
        },
        renewed: {
          bg: '#E7F3FF',
          text: '#155EAA',
        },
        teal: {
          50:  '#E1F5EE',
          400: '#1D9E75',
          600: '#0F6E56',
        },
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '4px',
      },
      fontFamily: {
        sans: ['"Avenir Next"', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
