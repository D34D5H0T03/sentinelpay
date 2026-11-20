/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F4F5F2',
        surface: {
          DEFAULT: '#FFFFFF',
          subtle: '#FAFAF8',
        },
        border: {
          DEFAULT: '#E2E4DE',
          strong: '#CDD1C8',
        },
        text: {
          DEFAULT: '#1F2933',
          muted: '#5F6B76',
        },
        primary: {
          DEFAULT: '#1F6F66',
          hover: '#185A52',
          subtle: '#E3F0EE',
        },
        success: {
          DEFAULT: '#2F7A4F',
          bg: '#E6F2EA',
        },
        warning: {
          DEFAULT: '#9A6A12',
          bg: '#FAF0DA',
        },
        danger: {
          DEFAULT: '#B03A33',
          bg: '#FBE9E7',
        },
        info: {
          DEFAULT: '#2F6690',
          bg: '#E5EEF6',
        },
        neutral: {
          DEFAULT: '#5F6B76',
          bg: '#ECEEEA',
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
        dropdown: '0 4px 16px -2px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
        modal: '0 12px 32px -4px rgba(0, 0, 0, 0.12), 0 4px 8px -2px rgba(0, 0, 0, 0.06)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
};
