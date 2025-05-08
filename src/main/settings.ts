import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { is } from '@electron-toolkit/utils'
import { encrypt, decrypt } from './encryption'

// 获取settings.json的存储路径
// 在开发环境中，文件位于项目根目录下
// 在生产环境中，文件位于应用程序同级目录
function getSettingsPath(): string {
  if (is.dev) {
    // 开发环境，使用项目根目录
    return path.join(process.cwd(), 'settings.json')
  } else {
    // 生产环境，使用应用程序所在目录
    return path.join(path.dirname(app.getPath('exe')), 'settings.json')
  }
}

// 需要加密的设置项键名列表
const ENCRYPTED_KEYS = ['apiKey', 'webdavPassword']

// API配置接口
export interface AiApiConfig {
  id: string
  name: string
  apiKey: string
  apiUrl: string
  modelName: string
  temperature?: string
  maxTokens?: string
}

// WebDAV配置接口
export interface WebDAVConfig {
  url: string
  username: string
  password: string
  remotePath: string
  enabled: boolean // 是否启用自动同步
  syncOnStartup: boolean // 是否在应用启动时自动同步
  syncDirection: 'localToRemote' | 'remoteToLocal' | 'bidirectional' // 同步方向
  localPath?: string // 本地路径，在运行时由主进程提供
}

// 默认设置
const defaultSettings = {
  theme: 'light',
  // 改为空数组，不提供默认API配置
  AiApiConfigs: [] as AiApiConfig[],
  // 默认AI提示设置
  aiPrompts: {
    rewrite:
      '对${content}的内容进行写作风格的修改，不要修改${content}的本意。仅输出修改后的内容，不提出任何建议，不对${content}发表任何评论。',
    continue:
      '对${content}的内容继续进行创作，创作的内容需要符合${content}的写作风格。仅返回续写后的内容，不对后续写作提出任何建议，不对${content}发表任何评论。',
    translate:
      '将${content}作为${sourceLanguage}文本翻译成${targetLanguage}，仅返回${targetLanguage}，不要提出任何建议，不要做任何解释，不对${content}发表任何评论。'
  },
  // 默认WebDAV配置
  webdav: {
    url: '',
    username: '',
    password: '',
    remotePath: '/markdown',
    enabled: false,
    syncOnStartup: false,
    syncDirection: 'bidirectional'
  } as WebDAVConfig,
  // 默认更新设置
  checkUpdatesOnStartup: true,
  // 默认历史记录管理设置
  historyManagement: {
    type: 'count', // 'count' 或 'time'
    maxCount: 20, // 保留的最大记录数
    maxDays: 7 // 保留的最大天数
  }
}

// 读取设置
export function readSettings(): Record<string, unknown> {
  const settingsPath = getSettingsPath()

  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8')
      const settings = JSON.parse(data)

      // 解密API配置中的API Keys
      if (settings.AiApiConfigs && Array.isArray(settings.AiApiConfigs)) {
        ;(settings.AiApiConfigs as AiApiConfig[]).forEach((config) => {
          if (ENCRYPTED_KEYS.includes('apiKey') && config.apiKey && config.apiKey !== '') {
            try {
              config.apiKey = decrypt(config.apiKey)
            } catch (decryptError) {
              console.error('解密API Key失败:', decryptError)
              // 保留原始加密值，以免解密失败导致键被删除
            }
          }
        })
      } else {
        settings.AiApiConfigs = []
      }

      // 解密WebDAV密码
      if (settings.webdav && settings.webdav.password) {
        settings.webdav.password = decrypt(settings.webdav.password)
      }

      return settings
    }
  } catch (error) {
    console.error('读取设置文件失败:', error)
  }

  // 如果文件不存在或读取失败，返回默认设置
  console.log('返回默认设置')
  return { ...defaultSettings }
}

// 写入设置
export function writeSettings(settings: Record<string, unknown>): void {
  const settingsPath = getSettingsPath()

  try {
    // 合并默认设置和新设置
    const updatedSettings = { ...defaultSettings, ...settings }

    // 在保存前加密API配置中的API Keys
    const settingsToSave = { ...updatedSettings }

    if (settingsToSave.AiApiConfigs && Array.isArray(settingsToSave.AiApiConfigs)) {
      ;(settingsToSave.AiApiConfigs as AiApiConfig[]) = JSON.parse(
        JSON.stringify(settingsToSave.AiApiConfigs)
      )
      ;(settingsToSave.AiApiConfigs as AiApiConfig[]).forEach((config) => {
        if (config.apiKey && config.apiKey !== '') {
          config.apiKey = encrypt(config.apiKey)
        }
      })
    }

    // 加密WebDAV密码
    if (settingsToSave.webdav && (settingsToSave.webdav as WebDAVConfig).password) {
      const webdavConfig = { ...(settingsToSave.webdav as WebDAVConfig) }
      webdavConfig.password = encrypt(webdavConfig.password)
      settingsToSave.webdav = webdavConfig
    }

    fs.writeFileSync(settingsPath, JSON.stringify(settingsToSave, null, 2), 'utf8')
  } catch (error) {
    console.error('写入设置文件失败:', error)
  }
}

// 更新单个设置项
export function updateSetting(key: string, value: unknown): void {
  const settings = readSettings()

  // 不直接修改settings，因为它已经包含了解密后的值
  settings[key] = value
  writeSettings(settings)
}

// 获取单个设置项
export function getSetting<T>(key: string, defaultValue?: T): T | unknown {
  const settings = readSettings()
  return settings[key] !== undefined ? settings[key] : defaultValue
}

// 获取WebDAV配置
export function getWebDAVConfig(): WebDAVConfig {
  const settings = readSettings()
  return (settings.webdav as WebDAVConfig) || defaultSettings.webdav
}

// 更新WebDAV配置
export function updateWebDAVConfig(config: WebDAVConfig): void {
  const settings = readSettings()
  settings.webdav = config
  writeSettings(settings)
}
