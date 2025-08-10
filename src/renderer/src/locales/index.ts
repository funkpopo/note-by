import { zhCN } from './zh-CN'
import { enUS } from './en-US'

export { zhCN, enUS }
export { LanguageProvider, useLanguage, type Language } from './LanguageContext'
export type { ExtendedDictionary } from './zh-CN'

export default {
  'zh-CN': zhCN,
  'en-US': enUS
}
