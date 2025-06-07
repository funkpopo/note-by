import React, { useState, useEffect, ReactNode } from 'react'
import { LocaleProvider, ConfigProvider } from '@douyinfe/semi-ui'
import zh_CN from '@douyinfe/semi-ui/lib/es/locale/source/zh_CN'
import { ThemeContext } from './ThemeContext'

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // 从设置获取主题偏好，默认为浅色模式
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSwitching, setIsSwitching] = useState<boolean>(false)

  // 初始化加载主题设置
  useEffect(() => {
    const loadThemeSetting = async (): Promise<void> => {
      try {
        // 从设置中获取主题，默认跟随系统
        const savedTheme = await window.api.settings.get<string>('theme', undefined)

        if (savedTheme) {
          setIsDarkMode(savedTheme === 'dark')
        } else {
          // 如果没有保存的主题，则跟随系统
          setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches)
        }
      } catch (error) {
        // 出错时使用系统主题
        setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches)
      } finally {
        setIsLoading(false)
      }
    }

    loadThemeSetting()
  }, [])

  useEffect(() => {
    // 监听系统主题变化
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = async (e: MediaQueryListEvent): Promise<void> => {
      // 只有当没有手动设置过主题时才跟随系统
      const savedTheme = await window.api.settings.get<string>('theme', undefined)
      if (!savedTheme) {
        setIsDarkMode(e.matches)
      }
    }

    mql.addEventListener('change', handleChange)
    return (): void => mql.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    // 防止初始加载时执行保存
    if (isLoading) return

    // 添加切换状态类
    document.body.classList.add('theme-switching')

    // 延迟切换主题，让动画效果更明显
    setTimeout(() => {
      // 切换 body 的 theme 属性
      document.body.setAttribute('theme-mode', isDarkMode ? 'dark' : 'light')

      // 保存到设置
      window.api.settings.set('theme', isDarkMode ? 'dark' : 'light').catch(() => {})

      // 移除切换状态类
      setTimeout(() => {
        document.body.classList.remove('theme-switching')
        setIsSwitching(false)
      }, 300) // 与CSS动画时长一致
    }, 50)
  }, [isDarkMode, isLoading])

  const toggleTheme = (): void => {
    setIsSwitching(true)
    setIsDarkMode((prev) => !prev)
  }

  // 显示加载状态
  if (isLoading) {
    return null // 或者显示加载指示器
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, isSwitching }}>
      <ConfigProvider locale={zh_CN}>
        <LocaleProvider locale={zh_CN}>{children}</LocaleProvider>
      </ConfigProvider>
    </ThemeContext.Provider>
  )
}
