// src/lib/theme.ts
import { Store } from '@tanstack/react-store'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
}

export const themeStore = new Store<ThemeState>({
  theme: (localStorage.getItem('theme') as Theme) || 'system',
})

export function setTheme(theme: Theme) {
  localStorage.setItem('theme', theme)
  themeStore.setState(() => ({ theme }))
  applyTheme(theme)
}

export function applyTheme(theme: Theme) {
  const root = window.document.documentElement
  root.classList.remove('light', 'dark')
  
  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    root.classList.add(systemTheme)
  } else {
    root.classList.add(theme)
  }
}

// Initialize theme on load
if (typeof window !== 'undefined') {
  applyTheme(themeStore.state.theme)
}