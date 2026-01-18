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
        'xs': '375px',
        'xs-only': { 'max': '374px' },
        'sm-only': { 'min': '375px', 'max': '639px' },
      },
      colors: {
        // GTA Casino dark theme
        bg: {
          primary: '#0A0A0B',
          secondary: '#111113',
          tertiary: '#18181B',
          hover: '#1F1F23',
        },
        border: {
          default: '#27272A',
          hover: '#3F3F46',
          active: '#FF2E63',
        },
        // Neon accent palette (Vice City vibes)
        neon: {
          pink: '#FF2E63',
          cyan: '#00F0FF',
          purple: '#9D4EDD',
          yellow: '#FFE66D',
          green: '#00FF88',
          orange: '#FF6B35',
        },
        // Status colors
        status: {
          success: '#22C55E',
          error: '#EF4444',
          warning: '#F59E0B',
          info: '#3B82F6',
        },
        // Text colors
        text: {
          primary: '#FAFAFA',
          secondary: '#A1A1AA',
          tertiary: '#71717A',
        },
      },
      fontFamily: {
        display: ['var(--font-bebas)', 'Bebas Neue', 'sans-serif'],
        heading: ['var(--font-oswald)', 'Oswald', 'sans-serif'],
        body: ['var(--font-inter)', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
      },
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0,0,0,0.4)',
        'md': '0 4px 12px rgba(0,0,0,0.5)',
        'lg': '0 8px 24px rgba(0,0,0,0.6)',
        'neon-pink': '0 0 20px #FF2E63, 0 0 40px rgba(255,46,99,0.3)',
        'neon-cyan': '0 0 20px #00F0FF, 0 0 40px rgba(0,240,255,0.3)',
        'neon-green': '0 0 20px #00FF88, 0 0 40px rgba(0,255,136,0.3)',
        'neon-purple': '0 0 20px #9D4EDD, 0 0 40px rgba(157,78,221,0.3)',
        'glow': '0 0 30px var(--neon-cyan)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-left': 'slideLeft 0.3s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-neon': 'pulseNeon 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
        'crash-multiplier': 'crashMultiplier 0.1s ease-out',
        'win-flash': 'winFlash 0.5s ease-out',
        'lose-shake': 'loseShake 0.5s ease-out',
        'counter-up': 'counterUp 0.3s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideLeft: {
          '0%': { opacity: '0', transform: 'translateX(10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseNeon: {
          '0%, 100%': {
            boxShadow: '0 0 20px #FF2E63, 0 0 40px rgba(255,46,99,0.3)',
            borderColor: '#FF2E63',
          },
          '50%': {
            boxShadow: '0 0 30px #FF2E63, 0 0 60px rgba(255,46,99,0.5)',
            borderColor: '#FF4D7A',
          },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        crashMultiplier: {
          '0%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
        winFlash: {
          '0%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(0, 255, 136, 0.2)' },
          '100%': { backgroundColor: 'transparent' },
        },
        loseShake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' },
        },
        counterUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glowPulse: {
          '0%, 100%': {
            filter: 'drop-shadow(0 0 8px currentColor)',
          },
          '50%': {
            filter: 'drop-shadow(0 0 16px currentColor)',
          },
        },
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
export default config
