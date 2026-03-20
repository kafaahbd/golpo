/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        emerald: {
          50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0',
          300: '#6ee7b7', 400: '#34d399', 500: '#10b981',
          600: '#059669', 700: '#047857', 800: '#065f46',
          900: '#064e3b', 950: '#022c22',
        },
        surface: {
          DEFAULT: '#111827',
          50: '#1f2937', 100: '#374151', 200: '#4b5563',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        arabic: ['Noto Naskh Arabic', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce-subtle': 'bounceSubtle 0.4s ease',
        'pulse-emerald': 'pulseEmerald 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite',
        'ring-pulse': 'ringPulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { transform: 'translateY(12px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
        slideInRight: { from: { transform: 'translateX(20px)', opacity: 0 }, to: { transform: 'translateX(0)', opacity: 1 } },
        scaleIn: { from: { transform: 'scale(0.92)', opacity: 0 }, to: { transform: 'scale(1)', opacity: 1 } },
        bounceSubtle: { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.08)' } },
        pulseEmerald: { '0%,100%': { boxShadow: '0 0 0 0 rgba(16,185,129,0.4)' }, '50%': { boxShadow: '0 0 0 8px rgba(16,185,129,0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        ringPulse: { '0%': { transform: 'scale(1)', opacity: 1 }, '50%': { transform: 'scale(1.15)', opacity: 0.7 }, '100%': { transform: 'scale(1)', opacity: 1 } },
      },
      backdropBlur: { xs: '2px' },
      boxShadow: {
        'emerald-glow': '0 0 20px rgba(16,185,129,0.3)',
        'emerald-glow-lg': '0 0 40px rgba(16,185,129,0.2)',
        'glass': '0 8px 32px rgba(0,0,0,0.4)',
        'message': '0 1px 2px rgba(0,0,0,0.3)',
      },
    },
  },
  plugins: [],
};
