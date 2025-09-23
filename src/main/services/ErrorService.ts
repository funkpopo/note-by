import { app } from 'electron'
import path from 'path'
import { is } from '@electron-toolkit/utils'
import {
  UnifiedErrorHandler,
  LogLevel,
  ErrorCategory,
  ErrorInfo,
  ErrorHandlerConfig
} from '../../shared/utils/ErrorHandler'

// Re-export enums and types for convenience
export { LogLevel, ErrorCategory }
export type { ErrorInfo }

// Main process error handler configuration
const config: ErrorHandlerConfig = {
  isDev: is.dev,
  fileLog: {
    enabled: true,
    logFile: path.join(app.getPath('userData'), 'logs', 'main.log'),
    maxLogSize: 10 * 1024 * 1024,
    maxLogFiles: 5
  },
  consoleLog: true,
  setupGlobalHandlers: true,
  onFatalError: (_error: Error) => {
    if (!is.dev) {
      setTimeout(() => {
        app.relaunch()
        app.exit(1)
      }, 1000)
    }
  }
}

export const mainErrorHandler = UnifiedErrorHandler.getInstance(config)

