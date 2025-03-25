import React, { useState, useEffect, ReactNode } from 'react'
import { LocaleProvider, ConfigProvider } from '@douyinfe/semi-ui'
import zh_CN from '@douyinfe/semi-ui/lib/es/locale/source/zh_CN'
import { ThemeContext } from './ThemeContext'

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // 从本地存储获取主题偏好，默认为浅色模式
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      return savedTheme === 'dark'
    }
    // 如果没有保存的主题，则跟随系统
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    // 监听系统主题变化
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent): void => {
      // 只有当没有手动设置过主题时才跟随系统
      if (!localStorage.getItem('theme')) {
        setIsDarkMode(e.matches)
      }
    }

    mql.addEventListener('change', handleChange)
    return (): void => mql.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    // 切换 body 的 theme 属性
    document.body.setAttribute('theme-mode', isDarkMode ? 'dark' : 'light')

    // 保存到本地存储
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  const toggleTheme = (): void => {
    setIsDarkMode((prev) => !prev)
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <ConfigProvider locale={zh_CN}>
        <LocaleProvider locale={zh_CN}>{children}</LocaleProvider>
      </ConfigProvider>
    </ThemeContext.Provider>
  )
}
