import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { zhCN } from './zh-CN'
import { enUS } from './en-US'
import type { ExtendedDictionary } from './zh-CN'

type Language = 'zh-CN' | 'en-US'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string>) => string
  locale: ExtendedDictionary
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const locales: Record<Language, ExtendedDictionary> = {
  'zh-CN': zhCN,
  'en-US': enUS
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language')
    if (saved === 'zh-CN' || saved === 'en-US') {
      return saved
    }
    // 检测系统语言
    const systemLang = navigator.language.toLowerCase()
    return systemLang.startsWith('zh') ? 'zh-CN' : 'en-US'
  })

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('app-language', lang)
  }

  // 翻译函数，支持嵌套键和参数替换
  const t = (key: string, params?: Record<string, string>): string => {
    const keys = key.split('.')
    let value: any = locales[language]
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        // 如果找不到，尝试英文
        value = keys.reduce((acc: any, k) => acc?.[k], locales['en-US'])
        if (!value) {
          console.warn(`Translation key not found: ${key}`)
          return key
        }
        break
      }
    }

    if (typeof value !== 'string') {
      console.warn(`Translation value is not a string: ${key}`)
      return key
    }

    // 参数替换
    if (params) {
      Object.entries(params).forEach(([param, val]) => {
        value = value.replace(new RegExp(`\\{${param}\\}`, 'g'), val)
      })
    }

    return value
  }

  useEffect(() => {
    // 设置HTML lang属性
    document.documentElement.lang = language
  }, [language])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, locale: locales[language] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

// 便捷导出
export type { Language }