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
        forest: {
          deep: '#123B2A',
          natural: '#2F6F4E',
          emerald: '#4F8F62',
          light: '#86A95A',
        },
        gold: {
          warm: '#D8B65A',
          soft: '#E7CC82',
        },
        cream: '#FFF7E6',
        brown: {
          natural: '#5E432A',
        }
      },
      fontFamily: {
        sans: ['var(--font-lato)', 'sans-serif'],
        serif: ['var(--font-playfair)', 'serif'],
        script: ['var(--font-vibes)', 'cursive'],
      },
    },
  },
  plugins: [],
};
export default config;
