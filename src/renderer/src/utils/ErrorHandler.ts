import {
  UnifiedErrorHandler,
  LogLevel,
  ErrorCategory,
  ErrorInfo,
  ErrorHandlerConfig
} from '../../../shared/utils/ErrorHandler'

// 重新导出共享的类型和枚举，以保持向后兼容性
export { LogLevel, ErrorCategory }
export type { ErrorInfo }

// 创建渲染器进程错误处理器配置
const config: ErrorHandlerConfig = {
  isDev: import.meta.env.DEV,
  consoleLog: true,
  setupGlobalHandlers: true,
  fileLog: {
    enabled: false // 渲染器进程不直接写文件
  },
  onError: import.meta.env.DEV
    ? async (info: ErrorInfo) => {
        // 在开发环境中，可以发送到主进程进行持久化
        if (info.level >= LogLevel.ERROR) {
          try {
            // 发送到主进程（如果需要）
            // window.api?.log?.error?.(JSON.stringify(info))
          } catch {
            // 静默处理
          }
        }
      }
    : undefined
}

// 创建并导出单例实例
const errorHandler = UnifiedErrorHandler.getInstance(config)

// 添加React错误边界处理方法（保持向后兼容）
export const rendererErrorHandler = {
  ...errorHandler,
  handleReactError: errorHandler.handleReactError.bind(errorHandler)
}
