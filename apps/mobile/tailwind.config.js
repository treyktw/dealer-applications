/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Import colors from our centralized theme
        // These match the web app design system exactly
        primary: {
          DEFAULT: 'rgb(17, 185, 199)',      // hsl(191, 91%, 43%)
          foreground: 'rgb(250, 250, 250)',  // hsl(0, 0%, 98%)
        },
        secondary: {
          DEFAULT: 'rgb(145, 107, 209)',     // hsl(261, 51.7%, 63.5%)
          foreground: 'rgb(250, 250, 250)',  // hsl(0, 0%, 98%)
        },
        background: 'rgb(11, 12, 16)',       // Dark by default
        foreground: 'rgb(250, 250, 250)',
        card: {
          DEFAULT: 'rgb(20, 21, 27)',
          foreground: 'rgb(250, 250, 250)',
        },
        popover: {
          DEFAULT: 'rgb(20, 21, 27)',
          foreground: 'rgb(250, 250, 250)',
        },
        muted: {
          DEFAULT: 'rgb(37, 38, 43)',
          foreground: 'rgb(161, 163, 171)',
        },
        accent: {
          DEFAULT: 'rgb(37, 38, 43)',
          foreground: 'rgb(250, 250, 250)',
        },
        destructive: {
          DEFAULT: 'rgb(239, 68, 68)',
          foreground: 'rgb(250, 250, 250)',
        },
        success: {
          DEFAULT: 'rgb(34, 197, 94)',
          foreground: 'rgb(255, 255, 255)',
        },
        warning: {
          DEFAULT: 'rgb(234, 179, 8)',
          foreground: 'rgb(0, 0, 0)',
        },
        info: {
          DEFAULT: 'rgb(59, 130, 246)',
          foreground: 'rgb(255, 255, 255)',
        },
        border: 'rgb(37, 38, 43)',
        input: 'rgb(37, 38, 43)',
        ring: 'rgb(17, 185, 199)',
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '4px',
      },
    },
  },
  plugins: [],
};
