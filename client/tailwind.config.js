/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'selector',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--bg-primary)',
          50: 'var(--bg-primary)',
        },
        secondary: {
          DEFAULT: 'var(--bg-secondary)',
          50: 'var(--bg-secondary)',
        },
        tertiary: {
          DEFAULT: 'var(--bg-tertiary)',
        },
        elevated: {
          DEFAULT: 'var(--bg-elevated)',
        },
        text: {
          DEFAULT: 'var(--text-primary)',
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        border: {
          DEFAULT: 'var(--border-color)',
          light: 'var(--border-light)',
        },
        accent: {
          DEFAULT: 'var(--accent-primary)',
          primary: 'var(--accent-primary)',
          secondary: 'var(--accent-secondary)',
          tertiary: 'var(--accent-tertiary)',
        },
        nature: {
          1: 'var(--nature-1)',
          2: 'var(--nature-2)',
          3: 'var(--nature-3)',
          4: 'var(--nature-4)',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',
        'error-bg': 'var(--error-bg)',
        cta: {
          text: 'var(--cta-text)',
          bg: 'var(--cta-bg)',
          hover: 'var(--cta-hover)',
        },
      },
    },
  },
  plugins: [],
}
