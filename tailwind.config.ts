import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        // Custom breakpoint ranges for fine-grained mobile control
        // xs-only: 320px to 374px (very small phones)
        'xs-only': { 'max': '374px' },
        // sm-only: 375px to 639px (standard phones)
        'sm-only': { 'min': '375px', 'max': '639px' },
        // xs: min 320px (for targeting small screens and up)
        'xs': '320px',
      },
      colors: {
        // Custom dark theme blue-gray palette
        darkbg: {
          950: 'rgb(33, 39, 57)',
          900: 'rgb(41, 48, 71)',
          850: 'rgb(45, 52, 77)',
          800: 'rgb(49, 57, 84)',
          750: 'rgb(55, 64, 94)',
          700: 'rgb(62, 72, 104)',
          600: 'rgb(80, 92, 130)',
          500: 'rgb(100, 114, 158)',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'gradient': 'gradient 3s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
}
export default config
