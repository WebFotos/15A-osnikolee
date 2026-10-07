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
          deep: '#1A4D33',   /* was #123B2A */
          natural: '#3B8B5B', /* was #2F6F4E */
          emerald: '#5CB377', /* was #4F8F62 */
          light: '#A3D274',   /* was #86A95A */
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
