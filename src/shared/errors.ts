/*
 * Centralized error utilities for consistent error handling & logging
 */

export class AppError extends Error {
  code?: string
  data?: Record<string, unknown>

  constructor(message: string, options?: { code?: string; cause?: unknown; data?: Record<string, unknown> }) {
    super(message)
    this.name = 'AppError'
    this.code = options?.code
    this.data = options?.data
    // Preserve cause when available (Node 16+ / TS lib.dom optional)
    if (options?.cause) {
      // @ts-ignore: cause not in all lib targets
      this.cause = options.cause
    }
  }
}

export function toErrorMessage(err: unknown, fallback = 'Unknown error'): string {
  if (!err) return fallback
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message || fallback
  try {
    return JSON.stringify(err)
  } catch {
    return fallback
  }
}

export function logError(
  scope: string,
  message: string,
  error?: unknown,
  extra?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString()
  // Keep console output structured but readable
  const base = `[${timestamp}] [${scope}] ${message}`
  if (error) {
    // Include parsed error message and raw object for debugging
    // eslint-disable-next-line no-console
    console.error(base, { error: toErrorMessage(error), raw: error, ...extra })
  } else {
    // eslint-disable-next-line no-console
    console.error(base, extra ?? '')
  }
}

export async function withHandledError<T>(
  scope: string,
  message: string,
  fn: () => Promise<T>
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const data = await fn()
    return { ok: true, data }
  } catch (e) {
    const error = toErrorMessage(e)
    logError(scope, message, e)
    return { ok: false, error }
  }
}

