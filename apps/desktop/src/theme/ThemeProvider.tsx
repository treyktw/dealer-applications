// src/theme/ThemeProvider.tsx
import React, { createContext, useContext, useEffect, useCallback } from 'react'
import { Store, useStore } from '@tanstack/react-store'
import { Theme, darkTheme, lightTheme } from './theme.types'

interface ThemeState {
  currentTheme: Theme
  mode: 'light' | 'dark' | 'custom'
  customThemes: Theme[]
}

const themeStore = new Store<ThemeState>({
  currentTheme: darkTheme,
  mode: 'dark',
  customThemes: []
})

interface ThemeContextValue {
  theme: Theme
  mode: 'light' | 'dark' | 'custom'
  setTheme: (theme: Theme | 'light' | 'dark') => void
  toggleTheme: () => void
  customThemes: Theme[]
  addCustomTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const state = useStore(themeStore)

  const applyThemeToDOM = useCallback((theme: Theme) => {
    const root = document.documentElement
    
    // Apply CSS variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value)
    })
    
    Object.entries(theme.gradients).forEach(([key, value]) => {
      root.style.setProperty(`--gradient-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value)
    })
    
    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value)
    })
    
    root.style.setProperty('--sidebar-width', theme.sidebar.width)
    root.style.setProperty('--sidebar-collapsed-width', theme.sidebar.collapsedWidth)
    
    // Set theme mode class
    root.classList.remove('light', 'dark')
    root.classList.add(theme.mode)
    
    // Store in localStorage
    localStorage.setItem('theme-mode', theme.mode)
    if (theme.mode === 'custom') {
      localStorage.setItem('custom-theme', JSON.stringify(theme))
    }
  }, [])

  useEffect(() => {
    // Load saved theme on mount
    const savedMode = localStorage.getItem('theme-mode') as 'light' | 'dark' | 'custom'
    if (savedMode === 'custom') {
      const customTheme = localStorage.getItem('custom-theme')
      if (customTheme) {
        const theme = JSON.parse(customTheme) as Theme
        themeStore.setState(() => ({
          currentTheme: theme,
          mode: 'custom',
          customThemes: [theme]
        }))
        applyThemeToDOM(theme)
        return
      }
    } else if (savedMode) {
      const theme = savedMode === 'light' ? lightTheme : darkTheme
      themeStore.setState(() => ({
        currentTheme: theme,
        mode: savedMode,
        customThemes: []
      }))
      applyThemeToDOM(theme)
      return
    }
    
    // Default to dark theme
    applyThemeToDOM(darkTheme)
  }, [applyThemeToDOM])

  const setTheme = useCallback((theme: Theme | 'light' | 'dark') => {
    if (typeof theme === 'string') {
      const newTheme = theme === 'light' ? lightTheme : darkTheme
      themeStore.setState((state) => ({
        ...state,
        currentTheme: newTheme,
        mode: theme
      }))
      applyThemeToDOM(newTheme)
    } else {
      themeStore.setState((state) => ({
        ...state,
        currentTheme: theme,
        mode: theme.mode
      }))
      applyThemeToDOM(theme)
    }
  }, [applyThemeToDOM])

  const toggleTheme = useCallback(() => {
    const newMode = state.mode === 'dark' ? 'light' : 'dark'
    setTheme(newMode)
  }, [state.mode, setTheme])

  const addCustomTheme = useCallback((theme: Theme) => {
    themeStore.setState((state) => ({
      ...state,
      customThemes: [...state.customThemes, theme]
    }))
    localStorage.setItem('custom-themes', JSON.stringify([...state.customThemes, theme]))
  }, [state.customThemes])

  return (
    <ThemeContext.Provider 
      value={{
        theme: state.currentTheme,
        mode: state.mode,
        setTheme,
        toggleTheme,
        customThemes: state.customThemes,
        addCustomTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}