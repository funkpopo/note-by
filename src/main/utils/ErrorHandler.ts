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

// 重新导出共享的类型和枚举，以保持向后兼容性
export { LogLevel, ErrorCategory }
export type { ErrorInfo }

// 创建主进程错误处理器配置
const config: ErrorHandlerConfig = {
  isDev: is.dev,
  fileLog: {
    enabled: true,
    logFile: path.join(app.getPath('userData'), 'logs', 'main.log'),
    maxLogSize: 10 * 1024 * 1024, // 10MB
    maxLogFiles: 5
  },
  consoleLog: true,
  setupGlobalHandlers: true,
  onFatalError: (_error: Error) => {
    // 在生产环境中，考虑重启应用
    if (!is.dev) {
      setTimeout(() => {
        app.relaunch()
        app.exit(1)
      }, 1000)
    }
  }
}

// 导出单例实例
export const mainErrorHandler = UnifiedErrorHandler.getInstance(config)
