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
export interface ApiConfig {
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
  apiConfigs: [] as ApiConfig[],
  // 默认AI提示设置
  aiPrompts: {
    rewrite: '请改写以下文本，保持文本原意但使用更优美的表达：\n\n${content}',
    continue: '请继续编写以下内容：\n\n${content}\n\n请直接续写，不要重复已有内容。',
    translateToZh: '请将以下文本翻译成中文：\n\n${content}',
    translateToEn: '请将以下文本翻译成英文：\n\n${content}'
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
  checkUpdatesOnStartup: true
}

// 读取设置
export function readSettings(): Record<string, unknown> {
  const settingsPath = getSettingsPath()

  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8')
      const settings = JSON.parse(data)

      // 解密API配置中的API Keys
      if (settings.apiConfigs && Array.isArray(settings.apiConfigs)) {
        ;(settings.apiConfigs as ApiConfig[]).forEach((config) => {
          if (ENCRYPTED_KEYS.includes('apiKey') && config.apiKey && config.apiKey !== '') {
            config.apiKey = decrypt(config.apiKey)
          }
        })
      } else {
        // 如果不是数组或不存在，初始化为空数组
        settings.apiConfigs = []
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

    if (settingsToSave.apiConfigs && Array.isArray(settingsToSave.apiConfigs)) {
      ;(settingsToSave.apiConfigs as ApiConfig[]) = JSON.parse(
        JSON.stringify(settingsToSave.apiConfigs)
      )
      ;(settingsToSave.apiConfigs as ApiConfig[]).forEach((config) => {
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
