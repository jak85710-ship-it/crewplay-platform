import type { Config } from "tailwindcss";



const config: Config = {

  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],

  theme: {

    extend: {

      colors: {

        brand: {

          50: "#eef7fc",

          100: "#d6eef9",

          200: "#b3dff5",

          300: "#7ecbf0",

          400: "#38bdf8",

          500: "#00aeef",

          600: "#0284c7",

          700: "#0369a1",

          800: "#1e4976",

          900: "#163356",

        },

      },

    },

  },

  plugins: [],

};



export default config;

