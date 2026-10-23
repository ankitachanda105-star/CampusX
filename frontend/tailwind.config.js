/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // LPU Primary: Deep Maroon / Burgundy palette
        brand: {
          50: '#fdf2f4',
          100: '#fce7ea',
          200: '#f8d2d9',
          300: '#f2abb9',
          400: '#e7778f',
          500: '#d54767',
          600: '#bc2b4e',
          700: '#800020', // Classic Burgundy
          800: '#6e1324', // Deep LPU Maroon Primary
          900: '#521320', // Darker Maroon
          950: '#310610',
        },
        // LPU Secondary: Warm Institutional Gold palette
        gold: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308', // LPU Warm Gold Secondary
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
          950: '#422006',
        },
      },
    },
  },
  plugins: [],
}
