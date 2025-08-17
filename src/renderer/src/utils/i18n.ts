// Simple i18n utility to get locale strings
import locales from '../locales'

// Default to Chinese for now, can be made configurable
const currentLocale = 'zh-CN'

export function t(key: string): string {
  const keys = key.split('.')
  let value: any = locales[currentLocale]

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      // Translation key not found: ${key}
      return key
    }
  }

  return typeof value === 'string' ? value : key
}

export default t
