/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Heebo', 'sans-serif'],
        display: ['Rubik', 'sans-serif']
      },
      colors: {
        primary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12'
        },
        premium: {
          cream: '#FAFBFC',
          'cream-warm': '#F8F9FA',
          gold: '#D4AF37',
          'gold-soft': '#F4E5C3',
          'gold-dark': '#B8960A',
          charcoal: '#2D3436',
          slate: '#64748B',
          muted: '#94A3B8'
        },
        dark: {
          deep: '#08090d',
          surface: '#0f1117',
          elevated: '#161922',
          card: '#1a1d27'
        }
      },
      boxShadow: {
        'premium-xs': '0 1px 2px rgba(0, 0, 0, 0.03)',
        'premium-sm': '0 1px 4px rgba(0, 0, 0, 0.04)',
        'premium-md': '0 4px 20px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04)',
        'premium-lg': '0 12px 40px rgba(0, 0, 0, 0.08)',
        'premium-xl': '0 20px 60px rgba(0, 0, 0, 0.1)',
        'premium-glow': '0 0 20px rgba(249, 115, 22, 0.15)',
        'premium-glow-gold': '0 0 20px rgba(212, 175, 55, 0.2)',
        'premium-inset': 'inset 0 2px 4px rgba(0, 0, 0, 0.06)'
      },
      borderRadius: {
        'premium': '1.25rem',
        'premium-sm': '0.875rem',
        'premium-lg': '1.5rem'
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem'
      },
      animation: {
        'hover-lift': 'hover-lift 0.2s ease forwards',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'glow-pulse-gold': 'glow-pulse-gold 2.5s ease-in-out infinite',
        'fade-slide-up': 'fade-slide-up 0.3s ease forwards',
        'subtle-float': 'subtle-float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s ease infinite',
        'skeleton-premium': 'skeleton-premium 2s ease infinite'
      },
      keyframes: {
        'hover-lift': {
          '0%': { transform: 'translateY(0) scale(1)' },
          '100%': { transform: 'translateY(-4px) scale(1.005)' }
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(249, 115, 22, 0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(249, 115, 22, 0.4), 0 0 30px rgba(249, 115, 22, 0.2)' }
        },
        'glow-pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(212, 175, 55, 0.15)' },
          '50%': { boxShadow: '0 0 20px rgba(212, 175, 55, 0.3), 0 0 30px rgba(212, 175, 55, 0.15)' }
        },
        'fade-slide-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'subtle-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' }
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        'skeleton-premium': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' }
        }
      },
      transitionTimingFunction: {
        'premium': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'premium-out': 'cubic-bezier(0.0, 0, 0.2, 1)',
        'premium-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'bounce-premium': 'cubic-bezier(0.34, 1.56, 0.64, 1)'
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
        '400': '400ms'
      },
      backdropBlur: {
        'xs': '2px',
        'premium': '20px'
      }
    }
  },
  plugins: []
}
