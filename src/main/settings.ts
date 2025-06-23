import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { is } from '@electron-toolkit/utils'
import {
  encrypt,
  decrypt,
  encryptWithPassword,
  decryptWithPassword,
  generateEncryptionTest
} from './encryption'
import { mainErrorHandler, ErrorCategory } from './utils/ErrorHandler'
import { databaseErrorHandler } from './utils/DatabaseErrorHandler'

// 配置版本控制
interface ConfigVersion {
  version: string
  compatibleVersions: string[]
  migrationRequired: boolean
}

// 配置验证结果
interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  fixedIssues?: string[]
}

// 配置事务接口
interface ConfigTransaction {
  id: string
  startTime: number
  originalConfig: Record<string, unknown>
  targetConfig: Record<string, unknown>
  rollbackData?: Record<string, unknown>
  completed: boolean
  success?: boolean
}

// 获取settings.json的存储路径
function getSettingsPath(): string {
  if (is.dev) {
    return path.join(process.cwd(), 'settings.json')
  } else {
    return path.join(path.dirname(app.getPath('exe')), 'settings.json')
  }
}

// 当前配置版本
const CURRENT_CONFIG_VERSION: ConfigVersion = {
  version: '2.0.0',
  compatibleVersions: ['1.0.0', '1.1.0', '2.0.0'],
  migrationRequired: false
}

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
  enabled: boolean
  syncOnStartup: boolean
  syncDirection: 'localToRemote' | 'remoteToLocal' | 'bidirectional'
  localPath?: string
  useCustomEncryption?: boolean
  encryptionTest?: string
  encryptionTestPlain?: string
}

// 默认设置
const defaultSettings = {
  theme: 'light',
  AiApiConfigs: [] as AiApiConfig[],
  selectedModelId: '',
  webdav: {
    url: '',
    username: '',
    password: '',
    remotePath: '/markdown',
    enabled: false,
    syncOnStartup: false,
    syncDirection: 'bidirectional',
    useCustomEncryption: false,
    encryptionTest: '',
    encryptionTestPlain: ''
  } as WebDAVConfig,
  checkUpdatesOnStartup: true,
  historyManagement: {
    type: 'count',
    maxCount: 20,
    maxDays: 7
  },
  // 添加版本信息
  _version: CURRENT_CONFIG_VERSION.version,
  _lastUpdated: Date.now()
}

/**
 * 增强的配置管理器
 * 提供原子性更新、版本控制等功能
 */
class EnhancedSettingsManager {
  private isLocked: boolean = false
  private activeTransactions: Map<string, ConfigTransaction> = new Map()

  constructor() {
    // 初始化完成
  }

  /**
   * 原子性读取配置
   */
  async readSettingsAtomic(): Promise<Record<string, unknown>> {
    const operation = databaseErrorHandler.createSafeOperation(
      async () => {
        return this.performRead()
      },
      { operation: 'read_settings', table: 'settings_file' }
    )

    const result = await operation()
    return result || { ...defaultSettings }
  }

  /**
   * 原子性写入配置
   */
  async writeSettingsAtomic(settings: Record<string, unknown>): Promise<boolean> {
    if (this.isLocked) {
      throw new Error('Settings are currently locked by another operation')
    }

    const transactionId = this.generateTransactionId()
    const originalConfig = await this.readSettingsAtomic()

    const transaction: ConfigTransaction = {
      id: transactionId,
      startTime: Date.now(),
      originalConfig,
      targetConfig: settings,
      completed: false
    }

    this.activeTransactions.set(transactionId, transaction)

    try {
      this.isLocked = true

      // 验证配置
      const validationResult = this.validateSettings(settings)
      if (!validationResult.isValid) {
        throw new Error(`Configuration validation failed: ${validationResult.errors.join(', ')}`)
      }

      // 执行写入
      const success = await this.performWrite(settings)
      
      transaction.completed = true
      transaction.success = success

      if (success) {
        mainErrorHandler.info('Settings updated successfully', ErrorCategory.SYSTEM, 'writeSettingsAtomic')
      } else {
        throw new Error('Failed to write settings to disk')
      }

      return success
    } catch (error) {
      // 发生错误时回滚
      await this.rollbackTransaction(transactionId)
      mainErrorHandler.error('Settings write failed, rolled back', error, ErrorCategory.SYSTEM, 'writeSettingsAtomic')
      throw error
    } finally {
      this.isLocked = false
      this.activeTransactions.delete(transactionId)
    }
  }

  /**
   * 批量更新配置项
   */
  async updateMultipleSettings(updates: Record<string, unknown>): Promise<boolean> {
    const currentSettings = await this.readSettingsAtomic()
    const mergedSettings = { ...currentSettings, ...updates }
    
    // 添加更新时间戳
    mergedSettings._lastUpdated = Date.now()
    
    return await this.writeSettingsAtomic(mergedSettings)
  }

  /**
   * 安全更新单个配置项
   */
  async updateSettingSafe(key: string, value: unknown): Promise<boolean> {
    try {
      const updates = { [key]: value }
      return await this.updateMultipleSettings(updates)
    } catch (error) {
      mainErrorHandler.error(`Failed to update setting ${key}`, error, ErrorCategory.SYSTEM, 'updateSettingSafe')
      return false
    }
  }

  /**
   * 获取单个配置项（带类型安全）
   */
  async getSettingSafe<T>(key: string, defaultValue?: T): Promise<T | unknown> {
    try {
      const settings = await this.readSettingsAtomic()
      return settings[key] !== undefined ? settings[key] : defaultValue
    } catch (error) {
      mainErrorHandler.error(`Failed to get setting ${key}`, error, ErrorCategory.SYSTEM, 'getSettingSafe')
      return defaultValue
    }
  }

  /**
   * 验证配置
   */
  private validateSettings(settings: Record<string, unknown>): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    // 基本结构验证
    if (typeof settings !== 'object' || settings === null) {
      result.isValid = false
      result.errors.push('Settings must be an object')
      return result
    }

    // WebDAV配置验证
    if (settings.webdav && typeof settings.webdav === 'object') {
      const webdav = settings.webdav as WebDAVConfig
      
      if (webdav.enabled) {
        if (!webdav.url || typeof webdav.url !== 'string') {
          result.errors.push('WebDAV URL is required when enabled')
        }
        if (!webdav.username || typeof webdav.username !== 'string') {
          result.errors.push('WebDAV username is required when enabled')
        }
        if (!webdav.password || typeof webdav.password !== 'string') {
          result.errors.push('WebDAV password is required when enabled')
        }
        
        // URL 格式验证
        if (webdav.url) {
          try {
            new URL(webdav.url)
          } catch {
            result.errors.push('WebDAV URL format is invalid')
          }
        }
      }

      // 加密配置验证
      if (webdav.useCustomEncryption) {
        if (!webdav.encryptionTest || !webdav.encryptionTestPlain) {
          result.warnings.push('Custom encryption is enabled but encryption test data is missing')
        }
      }
    }

    // API配置验证
    if (settings.AiApiConfigs && Array.isArray(settings.AiApiConfigs)) {
      const apiConfigs = settings.AiApiConfigs as AiApiConfig[]
      
      for (let i = 0; i < apiConfigs.length; i++) {
        const config = apiConfigs[i]
        if (!config.id || !config.name || !config.apiUrl) {
          result.warnings.push(`API config at index ${i} is missing required fields`)
        }
      }
    }

    // 版本兼容性检查
    if (settings._version && typeof settings._version === 'string') {
      if (!CURRENT_CONFIG_VERSION.compatibleVersions.includes(settings._version)) {
        result.warnings.push(`Configuration version ${settings._version} may not be fully compatible`)
      }
    }

    result.isValid = result.errors.length === 0
    return result
  }

  /**
   * 执行实际的读取操作
   */
  private async performRead(): Promise<Record<string, unknown>> {
    const settingsPath = getSettingsPath()

    if (!fs.existsSync(settingsPath)) {
      return { ...defaultSettings }
    }

    const data = await fs.promises.readFile(settingsPath, 'utf8')
    const settings = JSON.parse(data)

    // 解密敏感数据
    if (settings.AiApiConfigs && Array.isArray(settings.AiApiConfigs)) {
      settings.AiApiConfigs.forEach((config: AiApiConfig) => {
        if (config.apiKey) {
          try {
            config.apiKey = decrypt(config.apiKey)
          } catch (error) {
            mainErrorHandler.warn('Failed to decrypt API key', ErrorCategory.SYSTEM, 'performRead')
          }
        }
      })
    }

    if (settings.webdav?.password) {
      try {
        settings.webdav.password = decrypt(settings.webdav.password)
      } catch (error) {
        mainErrorHandler.warn('Failed to decrypt WebDAV password', ErrorCategory.SYSTEM, 'performRead')
      }
    }

    // 合并默认设置以确保所有必需字段都存在
    return this.mergeWithDefaults(settings)
  }

  /**
   * 执行实际的写入操作
   */
  private async performWrite(settings: Record<string, unknown>): Promise<boolean> {
    try {
      // 合并默认设置并更新版本信息
      const settingsToSave = this.mergeWithDefaults({
        ...settings,
        _version: CURRENT_CONFIG_VERSION.version,
        _lastUpdated: Date.now()
      })

      // 加密敏感数据
      if (settingsToSave.AiApiConfigs && Array.isArray(settingsToSave.AiApiConfigs)) {
        const apiConfigs = JSON.parse(JSON.stringify(settingsToSave.AiApiConfigs)) as AiApiConfig[]
        apiConfigs.forEach((config: AiApiConfig) => {
          if (config.apiKey) {
            config.apiKey = encrypt(config.apiKey)
          }
        })
        settingsToSave.AiApiConfigs = apiConfigs
      }

      if (settingsToSave.webdav && (settingsToSave.webdav as WebDAVConfig).password) {
        const webdavConfig = { ...(settingsToSave.webdav as WebDAVConfig) }
        webdavConfig.password = encrypt(webdavConfig.password)
        settingsToSave.webdav = webdavConfig
      }

      const settingsPath = getSettingsPath()
      
      // 确保目录存在
      const settingsDir = path.dirname(settingsPath)
      if (!fs.existsSync(settingsDir)) {
        await fs.promises.mkdir(settingsDir, { recursive: true })
      }

      // 原子性写入（写入临时文件后重命名）
      const tempPath = `${settingsPath}.tmp`
      await fs.promises.writeFile(tempPath, JSON.stringify(settingsToSave, null, 2), 'utf8')
      await fs.promises.rename(tempPath, settingsPath)

      return true
    } catch (error) {
      mainErrorHandler.error('Failed to write settings', error, ErrorCategory.FILE_IO, 'performWrite')
      return false
    }
  }

  /**
   * 与默认设置合并
   */
  private mergeWithDefaults(settings: Record<string, unknown>): Record<string, unknown> {
    const merged = { ...defaultSettings }
    
    for (const [key, value] of Object.entries(settings)) {
      if (value !== null && value !== undefined) {
        if (typeof value === 'object' && typeof merged[key] === 'object') {
          merged[key] = { ...merged[key], ...value }
        } else {
          merged[key] = value
        }
      }
    }

    return merged
  }

  /**
   * 回滚事务
   */
  private async rollbackTransaction(transactionId: string): Promise<boolean> {
    const transaction = this.activeTransactions.get(transactionId)
    if (!transaction) {
      return false
    }

    try {
      const success = await this.performWrite(transaction.originalConfig)
      
      if (success) {
        mainErrorHandler.info(`Transaction ${transactionId} rolled back successfully`, ErrorCategory.SYSTEM, 'rollbackTransaction')
      }
      
      return success
    } catch (error) {
      mainErrorHandler.error(`Failed to rollback transaction ${transactionId}`, error, ErrorCategory.SYSTEM, 'rollbackTransaction')
      return false
    }
  }

  /**
   * 生成事务ID
   */
  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// 全局设置管理器实例
const enhancedSettings = new EnhancedSettingsManager()

// 向后兼容的API - 使用增强的设置管理器
export function readSettings(): Record<string, unknown> {
  let settings: Record<string, unknown> = {}
  
  try {
    const settingsPath = getSettingsPath()
    
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8')
      settings = JSON.parse(data)
      
      // 解密敏感数据
      if (settings.AiApiConfigs && Array.isArray(settings.AiApiConfigs)) {
        settings.AiApiConfigs.forEach((config: AiApiConfig) => {
          if (config.apiKey) {
            try {
              config.apiKey = decrypt(config.apiKey)
            } catch (error) {
              // 解密失败，保持原值
            }
          }
        })
      }
      
      if (settings.webdav && (settings.webdav as WebDAVConfig).password) {
        try {
          (settings.webdav as WebDAVConfig).password = decrypt((settings.webdav as WebDAVConfig).password)
        } catch (error) {
          // 解密失败，保持原值
        }
      }
    }
  } catch (error) {
    console.error('Failed to read settings:', error)
  }
  
  return { ...defaultSettings, ...settings }
}

export function writeSettings(settings: Record<string, unknown>): void {
  enhancedSettings.writeSettingsAtomic(settings).catch(error => {
    console.error('Failed to write settings:', error)
  })
}

export function updateSetting(key: string, value: unknown): void {
  enhancedSettings.updateSettingSafe(key, value).catch(error => {
    console.error(`Failed to update setting ${key}:`, error)
  })
}

export function getSetting<T>(key: string, defaultValue?: T): T | unknown {
  const settings = readSettings()
  return settings[key] !== undefined ? settings[key] : defaultValue
}

// 导出增强设置管理器的异步API
export const enhancedSettingsAPI = {
  read: () => enhancedSettings.readSettingsAtomic(),
  write: (settings: Record<string, unknown>) => enhancedSettings.writeSettingsAtomic(settings),
  update: (key: string, value: unknown) => enhancedSettings.updateSettingSafe(key, value),
  updateMultiple: (updates: Record<string, unknown>) => enhancedSettings.updateMultipleSettings(updates),
  get: <T>(key: string, defaultValue?: T) => enhancedSettings.getSettingSafe(key, defaultValue)
}

// WebDAV配置管理
export function getWebDAVConfig(): WebDAVConfig {
  const settings = readSettings()
  return (settings.webdav as WebDAVConfig) || defaultSettings.webdav
}

export function updateWebDAVConfig(config: WebDAVConfig): void {
  updateSetting('webdav', config)
}

export function encryptWebDAVWithMasterPassword(
  config: WebDAVConfig, 
  masterPassword: string
): WebDAVConfig {
  const result = { ...config }
  
  try {
    const testPlain = generateEncryptionTest()
    result.encryptionTestPlain = testPlain
    result.encryptionTest = encryptWithPassword(testPlain, masterPassword)
    result.useCustomEncryption = true
  } catch (error) {
    console.error('Failed to encrypt WebDAV config:', error)
    throw new Error('加密失败')
  }
  
  return result
}

export function verifyMasterPassword(config: WebDAVConfig, masterPassword: string): boolean {
  if (!config.encryptionTest || !config.encryptionTestPlain) {
    return false
  }
  
  try {
    const decrypted = decryptWithPassword(config.encryptionTest, masterPassword)
    return decrypted === config.encryptionTestPlain
  } catch {
    return false
  }
}

export function decryptWebDAVWithMasterPassword(
  config: WebDAVConfig, 
  masterPassword: string
): WebDAVConfig {
  if (!verifyMasterPassword(config, masterPassword)) {
    throw new Error('密码验证失败')
  }
  
  return { ...config, useCustomEncryption: false }
}
