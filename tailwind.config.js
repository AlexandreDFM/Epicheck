/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        epitech: {
          blue: '#00B8D4',
          'blue-dark': '#0097A7',
          'blue-light': '#00E5FF',
          navy: '#1A237E',
          gray: '#F5F5F5',
          'gray-dark': '#424242',
        },
      },
    },
  },
  plugins: [],
}
