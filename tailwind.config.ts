import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores institucionales Caja Huancayo
        primary: {
          DEFAULT: '#E2001A',
          light: '#FF6B7A',
          dark: '#B30015',
        },
        secondary: {
          DEFAULT: '#444444',
          light: '#666666',
          dark: '#222222',
        },
        neutral: {
          light: '#F7F7F8',
          white: '#FFFFFF',
        },
      },
    },
  },
  plugins: [
    // Plugin para ocultar scrollbar
    function ({ addUtilities }: any) {
      addUtilities({
        '.scrollbar-hide': {
          /* Firefox */
          'scrollbar-width': 'none',
          /* Safari and Chrome */
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        }
      })
    }
  ],
};

export default config;
