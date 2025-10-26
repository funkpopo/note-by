import type { AiApiConfig } from './common'
import type { CloudStorageConfig } from './cloud-storage'

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function isAiApiConfig(value: unknown): value is AiApiConfig {
  if (!isObject(value)) return false
  const v = value as Record<string, unknown>
  return (
    isNonEmptyString(v.id) &&
    isNonEmptyString(v.name) &&
    isNonEmptyString(v.apiKey) &&
    isNonEmptyString(v.apiUrl) &&
    isNonEmptyString(v.modelName)
  )
}

export function isCloudStorageConfig(value: unknown): value is CloudStorageConfig {
  if (!isObject(value)) return false
  const v = value as Record<string, unknown>

  const providerOk =
    v.provider === 'webdav' || v.provider === 'googledrive' || v.provider === 'dropbox'
  const syncDirOk =
    v.syncDirection === 'localToRemote' ||
    v.syncDirection === 'remoteToLocal' ||
    v.syncDirection === 'bidirectional'

  return (
    providerOk &&
    typeof v.enabled === 'boolean' &&
    typeof v.syncOnStartup === 'boolean' &&
    isNonEmptyString(v.remotePath) &&
    isNonEmptyString(v.localPath) &&
    syncDirOk &&
    isObject(v.auth)
  )
}
