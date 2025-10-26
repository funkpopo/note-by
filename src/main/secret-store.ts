import keytar from 'keytar'

const SERVICE = 'note-by'

// Unified placeholder returned to renderer when a secret exists in keytar
export const SECRET_PLACEHOLDER = '__KEYTAR__'

export function buildApiAccount(id: string): string {
  return `api:${id}`
}

export function buildWebDAVAccount(): string {
  return 'webdav:default'
}

export async function saveSecret(account: string, secret: string): Promise<boolean> {
  try {
    if (!secret) {
      // Clear when empty
      await keytar.deletePassword(SERVICE, account)
      return true
    }
    await keytar.setPassword(SERVICE, account, secret)
    return true
  } catch {
    return false
  }
}

export async function getSecret(account: string): Promise<string | null> {
  try {
    const value = await keytar.getPassword(SERVICE, account)
    return value ?? null
  } catch {
    return null
  }
}

export async function deleteSecret(account: string): Promise<boolean> {
  try {
    return await keytar.deletePassword(SERVICE, account)
  } catch {
    return false
  }
}
