import {
  UnifiedErrorHandler,
  LogLevel,
  ErrorCategory,
  ErrorInfo,
  ErrorHandlerConfig
} from '../../../shared/utils/ErrorHandler'

// Re-export enums and types for convenience
export { LogLevel, ErrorCategory }
export type { ErrorInfo }

// Renderer process error handler configuration
const config: ErrorHandlerConfig = {
  isDev: import.meta.env.DEV,
  consoleLog: true,
  setupGlobalHandlers: true,
  fileLog: {
    enabled: false
  },
  onError: import.meta.env.DEV
    ? async (info: ErrorInfo) => {
        if (info.level >= LogLevel.ERROR) {
          try {
            // Hook for sending to main via IPC if desired
            // window.api?.log?.error?.(JSON.stringify(info))
          } catch {
            // noop in dev if IPC not available
          }
        }
      }
    : undefined
}

const errorHandler = UnifiedErrorHandler.getInstance(config)

export const rendererErrorHandler = {
  ...errorHandler,
  handleReactError: errorHandler.handleReactError.bind(errorHandler),
  warn: errorHandler.warn.bind(errorHandler),
  error: errorHandler.error.bind(errorHandler),
  info: errorHandler.info.bind(errorHandler),
  debug: errorHandler.debug.bind(errorHandler)
}

