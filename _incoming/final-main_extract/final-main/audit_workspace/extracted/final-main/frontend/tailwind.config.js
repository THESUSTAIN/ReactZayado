/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fraunces"', '"Cormorant Garamond"', 'Georgia', 'serif'],
        serif: ['"Fraunces"', '"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        '3xl': '24px',
        '4xl': '28px',
        '5xl': '36px',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        navy: {
          DEFAULT: '#1A3A6E',
          deep: '#0C1D33',
          dark: '#102945',
          bright: '#1E4178',
          mist: '#14305A',
          ink: '#1A2238',
        },
        cream: {
          DEFAULT: '#F6F3EE',
          soft: '#FBF6EA',
          base: '#F6F3EE',
        },
        gold: {
          DEFAULT: '#B89855',
          soft: '#D4B982',
          deep: '#9C7D40',
          bg: '#F3E9D0',
        },
        'gold-bg': '#F3E9D0',
        'gold-deep': '#9C7D40',
        sand: {
          50: '#F6F3EE',
          100: '#FBF6EA',
          200: '#F3E9D0',
          300: '#E2DAC7',
          400: '#D4CAB5',
        },
        ink: {
          DEFAULT: '#1A1815',
          soft: '#4A4538',
          muted: '#6B6358',
        },
        inkMuted: '#6B6358',
        outline: '#E8E2D8',
        canvasSoft: '#FBF6EA',
        aubergine: {
          DEFAULT: '#1F2937',
          deep: '#0F1726',
        },
        blush: '#F5EDE6',
      },
      boxShadow: {
        soft: '0 12px 38px rgba(20, 30, 60, 0.06)',
        float: '0 24px 60px rgba(7, 19, 42, 0.20)',
        glow: '0 0 0 4px rgba(11, 27, 58, 0.08)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
};
