import {
  BaseErrorHandler,
  EnvironmentAdapter,
  LogLevel,
  ErrorCategory,
  ErrorInfo
} from '../../../shared/utils/ErrorHandler'

// 重新导出共享的类型和枚举，以保持向后兼容性
export { LogLevel, ErrorCategory }
export type { ErrorInfo }

class RendererErrorHandler extends BaseErrorHandler {
  constructor() {
    const adapter: EnvironmentAdapter = {
      isDev: import.meta.env.DEV,
      log: async (info: ErrorInfo, message: string) => {
        // 输出到控制台
        switch (info.level) {
          case LogLevel.DEBUG:
            console.debug(message)
            break
          case LogLevel.INFO:
            console.info(message)
            break
          case LogLevel.WARN:
            console.warn(message)
            break
          case LogLevel.ERROR:
            console.error(message)
            break
        }

        // 在开发环境中，也可以发送到主进程进行持久化
        if (import.meta.env.DEV && info.level >= LogLevel.ERROR) {
          try {
            // 发送到主进程（如果需要）
            // window.api?.log?.error?.(message)
          } catch {
            // 静默处理
          }
        }
      },
      setupGlobalHandlers: (handler) => {
        // 延迟到super调用后执行
        setTimeout(() => this.setupGlobalHandlers(handler), 0)
      }
    }

    super(adapter)
  }

  // 处理React错误边界
  public handleReactError(error: Error, errorInfo: { componentStack: string }): void {
    this.error('React Error Boundary Caught Error', error, ErrorCategory.UI, 'ReactErrorBoundary')

    this.error(
      'React Component Stack',
      { componentStack: errorInfo.componentStack },
      ErrorCategory.UI,
      'ReactErrorBoundary'
    )
  }

  // 处理Promise拒绝
  private handlePromiseRejection(event: PromiseRejectionEvent): void {
    this.error(
      'Unhandled Promise Rejection',
      event.reason,
      ErrorCategory.SYSTEM,
      'unhandledrejection'
    )
  }

  // 处理运行时错误
  private handleRuntimeError(event: ErrorEvent): void {
    this.error(
      'Runtime Error',
      {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      },
      ErrorCategory.SYSTEM,
      'error'
    )
  }

  // 设置全局错误处理器
  private setupGlobalHandlers(handler: BaseErrorHandler): void {
    // 处理未捕获的Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.handlePromiseRejection(event)
    })

    // 处理运行时错误
    window.addEventListener('error', (event) => {
      this.handleRuntimeError(event)
    })

    // 处理资源加载错误
    window.addEventListener(
      'error',
      (event) => {
        const target = event.target
        if (target && target instanceof HTMLElement) {
          handler.error(
            'Resource Load Error',
            {
              tagName: target.tagName,
              src: (target as HTMLImageElement | HTMLScriptElement).src,
              href: (target as HTMLLinkElement).href
            },
            ErrorCategory.NETWORK,
            'resourceerror'
          )
        }
      },
      true
    )
  }

  // 实现抽象方法
  protected getUrl(): string | undefined {
    return window?.location?.href
  }

  protected getUserAgent(): string | undefined {
    return navigator?.userAgent
  }
}

// 导出单例实例
export const rendererErrorHandler = new RendererErrorHandler()
