// src/styles/theme.ts
export const colors = {
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',  // Primary dark blue
    900: '#1e3a8a',
    950: '#172554',
  },
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  semantic: {
    error: '#dc2626',
    errorLight: '#fecaca',
    success: '#16a34a',
    successLight: '#bbf7d0',
    warning: '#f59e0b',
    warningLight: '#fed7aa',
    info: '#0ea5e9',
    infoLight: '#bae6fd',
  }
};

export const theme = {
  light: {
    // Primary colors
    primary: colors.blue[800],
    primaryHover: colors.blue[900],
    primaryLight: colors.blue[100],
    primaryBorder: colors.blue[200],
    
    // Backgrounds
    background: '#ffffff',
    backgroundSecondary: colors.gray[50],
    surface: '#ffffff',
    surfaceHover: colors.gray[50],
    
    // Text
    text: colors.gray[900],
    textSecondary: colors.gray[600],
    textTertiary: colors.gray[500],
    textOnPrimary: '#ffffff',
    
    // Borders & Dividers
    border: colors.gray[200],
    borderHover: colors.gray[300],
    divider: colors.gray[100],
    
    // Form elements
    inputBg: '#ffffff',
    inputBorder: colors.gray[300],
    inputBorderFocus: colors.blue[500],
    inputText: colors.gray[900],
    inputPlaceholder: colors.gray[400],
    
    // Semantic colors
    ...colors.semantic,
    
    // Shadows
    shadow: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
    },
  },
  dark: {
    // Primary colors
    primary: colors.blue[500],
    primaryHover: colors.blue[600],
    primaryLight: colors.blue[950],
    primaryBorder: colors.blue[800],
    
    // Backgrounds
    background: colors.gray[950],
    backgroundSecondary: colors.gray[900],
    surface: colors.gray[900],
    surfaceHover: colors.gray[800],
    
    // Text
    text: colors.gray[50],
    textSecondary: colors.gray[400],
    textTertiary: colors.gray[500],
    textOnPrimary: '#ffffff',
    
    // Borders & Dividers
    border: colors.gray[800],
    borderHover: colors.gray[700],
    divider: colors.gray[800],
    
    // Form elements
    inputBg: colors.gray[900],
    inputBorder: colors.gray[700],
    inputBorderFocus: colors.blue[400],
    inputText: colors.gray[100],
    inputPlaceholder: colors.gray[500],
    
    // Semantic colors (adjusted for dark mode)
    error: '#ef4444',
    errorLight: '#991b1b',
    success: '#22c55e',
    successLight: '#14532d',
    warning: '#fbbf24',
    warningLight: '#78350f',
    info: '#38bdf8',
    infoLight: '#0c4a6e',
    
    // Shadows (with dark mode adjustments)
    shadow: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.25)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.4)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.5)',
    },
  },
};

// Breakpoints for responsive design
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// Typography scale
export const typography = {
  fonts: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  },
  sizes: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },
  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export interface Theme {
  name: string
  mode: 'light' | 'dark' | 'custom'
  colors: {
    // Base colors
    primary: string        // Main brand color
    primaryHover: string   
    secondary: string      
    accent: string         
    
    // Backgrounds
    background: string     // Main background
    surface: string        // Cards, panels
    surfaceHover: string   
    headerBg: string       // Header background
    sidebarBg: string      // Sidebar background
    
    // Text
    text: string           
    textSecondary: string  
    textOnPrimary: string  
    
    // Borders & States
    border: string         
    success: string        
    warning: string        
    error: string          
    info: string           
  }
  gradients: {
    header: string         // For that friendly header
    accent: string         // For buttons/CTAs
  }
  shadows: {
    sm: string
    md: string
    lg: string
  }
}