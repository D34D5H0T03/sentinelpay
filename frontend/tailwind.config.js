/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          subtle: 'var(--color-surface-subtle)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          strong: 'var(--color-border-strong)',
        },
        text: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          subtle: 'var(--color-primary-subtle)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          bg: 'var(--color-success-bg)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          bg: 'var(--color-warning-bg)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          bg: 'var(--color-danger-bg)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          bg: 'var(--color-info-bg)',
        },
        neutral: {
          DEFAULT: 'var(--color-neutral)',
          bg: 'var(--color-neutral-bg)',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['monospace'],
      },
      fontSize: {
        '12': ['12px', '16px'],
        '14': ['14px', '20px'],
        '15': ['15px', '22.5px'],
        '20': ['20px', '28px'],
        '28': ['28px', '36px'],
      },
      borderRadius: {
        DEFAULT: '6px',
        input: '6px',
        btn: '6px',
        card: '8px',
        modal: '8px',
      },
      boxShadow: {
        dropdown: '0 4px 16px -2px rgba(0, 0, 0, 0.12), 0 2px 4px -2px rgba(0, 0, 0, 0.08)',
        modal: '0 12px 32px -4px rgba(0, 0, 0, 0.24), 0 4px 8px -2px rgba(0, 0, 0, 0.12)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
};
