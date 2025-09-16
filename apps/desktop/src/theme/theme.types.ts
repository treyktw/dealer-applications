// src/theme/theme.types.ts
export interface Theme {
  name: string
  mode: 'light' | 'dark' | 'custom'
  colors: {
    // Base colors
    primary: string
    primaryHover: string
    secondary: string
    accent: string
    
    // Backgrounds
    background: string
    surface: string
    surfaceHover: string
    headerBg: string
    sidebarBg: string
    
    // Text
    text: string
    textSecondary: string
    textTertiary: string
    textOnPrimary: string
    
    // Borders & Dividers
    border: string
    borderHover: string
    divider: string
    
    // Semantic colors
    success: string
    warning: string
    error: string
    info: string
    
    // Special
    overlay: string
    shadow: string
  }
  gradients: {
    header: string
    accent: string
    surface: string
  }
  shadows: {
    sm: string
    md: string
    lg: string
    xl: string
  }
  sidebar: {
    width: string
    collapsedWidth: string
  }
}

export const darkTheme: Theme = {
  name: 'Midnight',
  mode: 'dark',
  colors: {
    primary: '#3B82F6',
    primaryHover: '#2563EB',
    secondary: '#8B5CF6',
    accent: '#06B6D4',
    
    background: '#0A0A0B',
    surface: '#111113',
    surfaceHover: '#1A1A1D',
    headerBg: '#0F0F10',
    sidebarBg: '#0D0D0E',
    
    text: '#000000',
    textSecondary: '#000000',
    textTertiary: '#000000',
    textOnPrimary: '#000000',
    
    border: '#27272A',
    borderHover: '#3F3F46',
    divider: '#1F1F23',
    
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    
    overlay: 'rgba(0, 0, 0, 0.5)',
    shadow: 'rgba(0, 0, 0, 0.3)'
  },
  gradients: {
    header: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
    accent: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
    surface: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
  },
  shadows: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.5)',
    md: '0 4px 12px rgba(0, 0, 0, 0.5)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.5)',
    xl: '0 12px 48px rgba(0, 0, 0, 0.6)'
  },
  sidebar: {
    width: '280px',
    collapsedWidth: '80px'
  }
}

export const lightTheme: Theme = {
  name: 'Daylight',
  mode: 'light',
  colors: {
    primary: '#3B82F6',
    primaryHover: '#2563EB',
    secondary: '#8B5CF6',
    accent: '#06B6D4',
    
    background: '#FFFFFF',
    surface: '#F9FAFB',
    surfaceHover: '#F3F4F6',
    headerBg: '#FFFFFF',
    sidebarBg: '#FAFBFC',
    
    text: '#000000',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    textOnPrimary: '#000000',
    
    border: '#E5E7EB',
    borderHover: '#D1D5DB',
    divider: '#F3F4F6',
    
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    
    overlay: 'rgba(0, 0, 0, 0.1)',
    shadow: 'rgba(0, 0, 0, 0.1)'
  },
  gradients: {
    header: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
    accent: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
    surface: 'linear-gradient(180deg, rgba(59,130,246,0.05) 0%, rgba(139,92,246,0.05) 100%)'
  },
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
  },
  sidebar: {
    width: '280px',
    collapsedWidth: '80px'
  }
}