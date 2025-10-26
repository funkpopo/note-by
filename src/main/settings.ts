import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { is } from '@electron-toolkit/utils'
import {
  decrypt,
  encryptWithPassword,
  decryptWithPassword,
  generateEncryptionTest
} from './encryption'
import Ajv from 'ajv'
import { SECRET_PLACEHOLDER, buildApiAccount, buildWebDAVAccount, saveSecret } from './secret-store'

function getSettingsPath(): string {
  if (is.dev) {
    return path.join(process.cwd(), 'settings.json')
  } else {
    return path.join(path.dirname(app.getPath('exe')), 'settings.json')
  }
}

// Legacy encrypted keys (for migration only)

export interface AiApiConfig {
  id: string
  name: string
  apiKey: string
  apiUrl: string
  modelName: string
  temperature?: string
  maxTokens?: string
  isThinkingModel?: boolean
  // keytar reference stored in file only
  apiKeyRef?: string
}

export interface WebDAVConfig {
  url: string
  username: string
  password: string
  remotePath: string
  enabled: boolean
  syncOnStartup: boolean
  syncDirection: 'localToRemote' | 'remoteToLocal' | 'bidirectional'
  localPath?: string
  // custom encryption support
  useCustomEncryption?: boolean
  encryptionTest?: string
  encryptionTestPlain?: string
  // keytar reference stored in file only
  passwordRef?: string
}

const defaultSettings = {
  theme: 'light',
  AiApiConfigs: [] as AiApiConfig[],
  // Window state (size/position)
  windowState: {
    width: 1100,
    height: 720
  },
  // Default WebDAV config
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
  }
}

// JSON Schema + Ajv for validation and auto-defaults
const settingsSchema = {
  type: 'object',
  additionalProperties: true,
  properties: {
    theme: { type: 'string', default: 'light' },
    AiApiConfigs: {
      type: 'array',
      default: [],
      items: {
        type: 'object',
        additionalProperties: true,
        properties: {
          id: { type: 'string' },
          name: { type: 'string', default: '' },
          apiKey: { type: 'string', default: '' },
          apiKeyRef: { type: 'string', default: '' },
          apiUrl: { type: 'string', default: '' },
          modelName: { type: 'string', default: '' },
          temperature: { type: 'string', default: '' },
          maxTokens: { type: 'string', default: '' },
          isThinkingModel: { type: 'boolean', default: false }
        },
        required: ['id']
      }
    },
    windowState: {
      type: 'object',
      default: { width: 1100, height: 720 },
      additionalProperties: true,
      properties: {
        width: { type: 'number', default: 1100 },
        height: { type: 'number', default: 720 },
        x: { type: 'number' },
        y: { type: 'number' },
        isMaximized: { type: 'boolean', default: false }
      }
    },
    webdav: {
      type: 'object',
      default: {
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
      },
      additionalProperties: true,
      properties: {
        url: { type: 'string', default: '' },
        username: { type: 'string', default: '' },
        password: { type: 'string', default: '' },
        passwordRef: { type: 'string', default: '' },
        remotePath: { type: 'string', default: '/markdown' },
        enabled: { type: 'boolean', default: false },
        syncOnStartup: { type: 'boolean', default: false },
        syncDirection: {
          type: 'string',
          enum: ['localToRemote', 'remoteToLocal', 'bidirectional'],
          default: 'bidirectional'
        },
        useCustomEncryption: { type: 'boolean', default: false },
        encryptionTest: { type: 'string', default: '' },
        encryptionTestPlain: { type: 'string', default: '' }
      }
    },
    checkUpdatesOnStartup: { type: 'boolean', default: true },
    historyManagement: {
      type: 'object',
      default: { type: 'count', maxCount: 20, maxDays: 7 },
      additionalProperties: true,
      properties: {
        type: { type: 'string', enum: ['count', 'time'], default: 'count' },
        maxCount: { type: 'number', default: 20 },
        maxDays: { type: 'number', default: 7 }
      }
    }
  }
} as const

const ajv = new Ajv({ useDefaults: true, removeAdditional: false, coerceTypes: true })
const validateSettings = ajv.compile(settingsSchema as any)

function applySchemaDefaults(raw: Record<string, unknown>): Record<string, unknown> {
  try {
    const cloned = JSON.parse(JSON.stringify(raw || {}))
    validateSettings(cloned)
    return cloned
  } catch {
    return { ...defaultSettings }
  }
}

// Read settings (file may contain only secret references)
export function readSettings(): Record<string, unknown> {
  const settingsPath = getSettingsPath()
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8')
      const raw = JSON.parse(data)
      const settings = applySchemaDefaults(raw)

      // AI API configs -> set placeholder and migrate legacy encrypted values
      if (settings.AiApiConfigs && Array.isArray(settings.AiApiConfigs)) {
        let migrated = false
        ;(settings.AiApiConfigs as AiApiConfig[]).forEach((cfg) => {
          if (cfg.apiKey && !cfg.apiKeyRef) {
            const decrypted = decrypt(cfg.apiKey)
            if (decrypted) {
              const account = buildApiAccount(cfg.id)
              void saveSecret(account, decrypted)
              cfg.apiKeyRef = account
              cfg.apiKey = SECRET_PLACEHOLDER
              migrated = true
            }
          } else if (cfg.apiKeyRef) {
            cfg.apiKey = SECRET_PLACEHOLDER
          } else if (!cfg.apiKey) {
            cfg.apiKey = ''
          }
        })
        if (migrated) {
          try {
            writeSettings(settings)
          } catch {}
        }
      }

      // WebDAV password -> set placeholder and migrate legacy
      if ((settings as any).webdav) {
        const wd = (settings as any).webdav as WebDAVConfig
        if ((wd as any).password && !(wd as any).passwordRef) {
          const decrypted = decrypt((wd as any).password as unknown as string)
          if (decrypted) {
            const account = buildWebDAVAccount()
            void saveSecret(account, decrypted)
            ;(wd as any).passwordRef = account
            ;(wd as any).password = SECRET_PLACEHOLDER
            try {
              writeSettings(settings)
            } catch {}
          }
        } else if ((wd as any).passwordRef) {
          ;(wd as any).password = SECRET_PLACEHOLDER
        } else {
          ;(wd as any).password = (wd as any).password || ''
        }
      }

      return settings
    }
  } catch {
    // ignore
  }
  return { ...defaultSettings }
}

// Write settings (store secrets in keytar and keep only references in file)
export function writeSettings(settings: Record<string, unknown>): void {
  const settingsPath = getSettingsPath()
  try {
    const merged = { ...defaultSettings, ...settings }
    const normalized = applySchemaDefaults(merged)
    const settingsToSave = JSON.parse(JSON.stringify(normalized)) as Record<string, unknown>

    // AI configs secrets -> keytar
    if (Array.isArray((settingsToSave as any).AiApiConfigs)) {
      const arr = (settingsToSave as any).AiApiConfigs as AiApiConfig[]
      for (const cfg of arr) {
        if (cfg.apiKey && cfg.apiKey !== SECRET_PLACEHOLDER) {
          const account =
            cfg.apiKeyRef && cfg.apiKeyRef.startsWith('api:')
              ? cfg.apiKeyRef
              : buildApiAccount(cfg.id)
          void saveSecret(account, cfg.apiKey)
          cfg.apiKeyRef = account
        }
        delete (cfg as any).apiKey
      }
    }

    // WebDAV secret -> keytar
    if ((settingsToSave as any).webdav) {
      const wd = (settingsToSave as any).webdav as WebDAVConfig
      if (wd.password && wd.password !== SECRET_PLACEHOLDER) {
        const account =
          wd.passwordRef && wd.passwordRef.startsWith('webdav:')
            ? wd.passwordRef
            : buildWebDAVAccount()
        void saveSecret(account, wd.password)
        wd.passwordRef = account
      }
      delete (wd as any).password
    }

    fs.writeFileSync(settingsPath, JSON.stringify(settingsToSave, null, 2), 'utf8')
  } catch {
    // ignore
  }
}

// Update a single setting key
export function updateSetting(key: string, value: unknown): void {
  const settings = readSettings()
  ;(settings as any)[key] = value
  writeSettings(settings)
}

// Get a setting with default fallback
export function getSetting<T>(key: string, defaultValue?: T): T | unknown {
  const settings = readSettings()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (settings as any)[key] !== undefined ? (settings as any)[key] : defaultValue
}

// WebDAV helpers
export function getWebDAVConfig(): WebDAVConfig {
  const settings = readSettings() as any
  return (settings.webdav as WebDAVConfig) || (defaultSettings.webdav as WebDAVConfig)
}

export function updateWebDAVConfig(config: WebDAVConfig): void {
  const settings = readSettings() as any
  settings.webdav = config
  writeSettings(settings)
}

// Master password support for WebDAV
export function encryptWebDAVWithMasterPassword(
  config: WebDAVConfig,
  masterPassword: string
): WebDAVConfig {
  const newConfig = { ...config }
  if (newConfig.useCustomEncryption && newConfig.password) {
    newConfig.password = encryptWithPassword(newConfig.password, masterPassword)
    if (!newConfig.encryptionTestPlain) {
      newConfig.encryptionTestPlain = generateEncryptionTest()
    }
    newConfig.encryptionTest = encryptWithPassword(newConfig.encryptionTestPlain, masterPassword)
  }
  return newConfig
}

export function verifyMasterPassword(config: WebDAVConfig, masterPassword: string): boolean {
  if (!config.useCustomEncryption || !config.encryptionTest || !config.encryptionTestPlain) {
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
  const newConfig = { ...config }
  if (newConfig.useCustomEncryption && newConfig.password) {
    try {
      newConfig.password = decryptWithPassword(newConfig.password, masterPassword)
    } catch {
      // ignore
    }
  }
  return newConfig
}
