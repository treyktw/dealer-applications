/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Theme colors matching web app design system
        primary: {
          DEFAULT: 'hsl(191, 91%, 43%)',      // Cyan
          foreground: 'hsl(0, 0%, 98%)',
        },
        secondary: {
          DEFAULT: 'hsl(261, 51.7%, 63.5%)',  // Purple
          foreground: 'hsl(0, 0%, 98%)',
        },
        background: 'hsl(240, 10%, 3.9%)',    // Dark background
        foreground: 'hsl(0, 0%, 98%)',
        card: {
          DEFAULT: 'hsl(240, 10%, 6.8%)',
          foreground: 'hsl(0, 0%, 98%)',
        },
        muted: {
          DEFAULT: 'hsl(240, 3.7%, 15.9%)',
          foreground: 'hsl(240, 5%, 64.9%)',
        },
        accent: {
          DEFAULT: 'hsl(240, 3.7%, 15.9%)',
          foreground: 'hsl(0, 0%, 98%)',
        },
        destructive: {
          DEFAULT: 'hsl(0, 62.8%, 30.6%)',
          foreground: 'hsl(0, 0%, 98%)',
        },
        border: 'hsl(240, 3.7%, 15.9%)',
        input: 'hsl(240, 3.7%, 15.9%)',
        ring: 'hsl(191, 91%, 43%)',
      },
    },
  },
  plugins: [],
}