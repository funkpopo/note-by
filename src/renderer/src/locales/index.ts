import { zhCN } from './zh-CN'
import { ExtendedDictionary } from './zh-CN'

export { zhCN }

export default {
  'zh-CN': zhCN
}

// 简单的翻译hook
export function useTranslation() {
  // 目前仅支持中文，后续可扩展
  const t = (key: string) => {
    const keys = key.split('.')
    let value: any = zhCN
    
    for (const k of keys) {
      value = value?.[k]
      if (value === undefined) {
        console.warn(`Translation key not found: ${key}`)
        return key
      }
    }
    
    return value
  }

  const formatMessage = (template: string, params: Record<string, any>) => {
    return template.replace(/{(\w+)}/g, (match, key) => {
      return params[key] ?? match
    })
  }

  return { t, formatMessage }
}
