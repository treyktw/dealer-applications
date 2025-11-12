/**
 * CENTRALIZED THEME SYSTEM
 *
 * This is the SINGLE SOURCE OF TRUTH for all colors in the mobile app.
 * DO NOT define color values anywhere else in the codebase.
 *
 * All colors match the web app design system for consistency.
 */

export const colors = {
  // Primary brand color - Cyan/Turquoise
  primary: {
    DEFAULT: 'rgb(17, 185, 199)',      // hsl(191, 91%, 43%)
    foreground: 'rgb(250, 250, 250)',  // hsl(0, 0%, 98%)
  },

  // Secondary brand color - Purple
  secondary: {
    DEFAULT: 'rgb(145, 107, 209)',     // hsl(261, 51.7%, 63.5%)
    foreground: 'rgb(250, 250, 250)',  // hsl(0, 0%, 98%)
  },

  // Background colors
  background: {
    light: 'rgb(255, 255, 255)',       // hsl(0, 0%, 100%)
    dark: 'rgb(11, 12, 16)',           // hsl(240, 10%, 3.9%)
  },

  // Foreground/text colors
  foreground: {
    light: 'rgb(12, 13, 17)',          // hsl(240, 10%, 3.9%)
    dark: 'rgb(250, 250, 250)',        // hsl(0, 0%, 98%)
  },

  // Card backgrounds
  card: {
    light: 'rgb(255, 255, 255)',       // hsl(0, 0%, 100%)
    dark: 'rgb(20, 21, 27)',           // hsl(240, 10%, 6.8%)
    foreground: {
      light: 'rgb(12, 13, 17)',        // hsl(240, 10%, 3.9%)
      dark: 'rgb(250, 250, 250)',      // hsl(0, 0%, 98%)
    },
  },

  // Popover backgrounds
  popover: {
    light: 'rgb(255, 255, 255)',       // hsl(0, 0%, 100%)
    dark: 'rgb(20, 21, 27)',           // hsl(240, 10%, 6.8%)
    foreground: {
      light: 'rgb(12, 13, 17)',        // hsl(240, 10%, 3.9%)
      dark: 'rgb(250, 250, 250)',      // hsl(0, 0%, 98%)
    },
  },

  // Muted backgrounds and text
  muted: {
    light: 'rgb(244, 244, 245)',       // hsl(240, 4.8%, 95.9%)
    dark: 'rgb(37, 38, 43)',           // hsl(240, 3.7%, 15.9%)
    foreground: {
      light: 'rgb(110, 112, 124)',     // hsl(240, 3.8%, 46.1%)
      dark: 'rgb(161, 163, 171)',      // hsl(240, 5%, 64.9%)
    },
  },

  // Accent backgrounds
  accent: {
    light: 'rgb(244, 244, 245)',       // hsl(240, 4.8%, 95.9%)
    dark: 'rgb(37, 38, 43)',           // hsl(240, 3.7%, 15.9%)
    foreground: {
      light: 'rgb(19, 21, 33)',        // hsl(240, 5.9%, 10%)
      dark: 'rgb(250, 250, 250)',      // hsl(0, 0%, 98%)
    },
  },

  // Destructive/error colors
  destructive: {
    light: 'rgb(239, 68, 68)',         // hsl(0, 84.2%, 60.2%)
    dark: 'rgb(127, 29, 29)',          // hsl(0, 62.8%, 30.6%)
    foreground: 'rgb(250, 250, 250)',  // hsl(0, 0%, 98%)
  },

  // Success colors
  success: {
    DEFAULT: 'rgb(34, 197, 94)',
    foreground: 'rgb(255, 255, 255)',
  },

  // Warning colors
  warning: {
    DEFAULT: 'rgb(234, 179, 8)',
    foreground: 'rgb(0, 0, 0)',
  },

  // Info colors
  info: {
    DEFAULT: 'rgb(59, 130, 246)',
    foreground: 'rgb(255, 255, 255)',
  },

  // Border colors
  border: {
    light: 'rgb(228, 229, 231)',       // hsl(240, 5.9%, 90%)
    dark: 'rgb(37, 38, 43)',           // hsl(240, 3.7%, 15.9%)
  },

  // Input borders
  input: {
    light: 'rgb(228, 229, 231)',       // hsl(240, 5.9%, 90%)
    dark: 'rgb(37, 38, 43)',           // hsl(240, 3.7%, 15.9%)
  },

  // Focus ring
  ring: {
    DEFAULT: 'rgb(17, 185, 199)',      // hsl(191, 91%, 43%) - matches primary
  },

  // Status colors for vehicles, clients, etc.
  status: {
    available: 'rgb(34, 197, 94)',     // Green
    pending: 'rgb(234, 179, 8)',       // Yellow
    sold: 'rgb(59, 130, 246)',         // Blue
    reserved: 'rgb(168, 85, 247)',     // Purple
    unavailable: 'rgb(156, 163, 175)', // Gray
  },
} as const;

/**
 * Spacing scale
 * Use these values for consistent spacing throughout the app
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
  '4xl': 64,
} as const;

/**
 * Border radius scale
 */
export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

/**
 * Typography scale
 */
export const typography = {
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

/**
 * Shadow presets for elevation
 */
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

/**
 * Export theme object for easy access
 */
export const theme = {
  colors,
  spacing,
  radius,
  typography,
  shadows,
} as const;

export default theme;
