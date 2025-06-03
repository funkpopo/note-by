import { createContext } from 'react'

export interface ThemeContextType {
  isDarkMode: boolean
  toggleTheme: () => void
  isSwitching: boolean
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)
