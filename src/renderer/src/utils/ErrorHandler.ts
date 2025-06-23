// 日志级别枚举
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

// 错误类型分类
export enum ErrorCategory {
  SYSTEM = 'system',
  NETWORK = 'network',
  UI = 'ui',
  STORAGE = 'storage',
  API = 'api',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}

// 错误信息接口
export interface ErrorInfo {
  level: LogLevel
  category: ErrorCategory
  message: string
  details?: unknown
  stack?: string
  timestamp: string
  context?: string
  url?: string
  userAgent?: string
}

class RendererErrorHandler {
  private logLevel: LogLevel = import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO
  private maxLogEntries = 1000
  private logEntries: ErrorInfo[] = []

  constructor() {
    this.setupGlobalHandlers()
  }

  private formatLogMessage(info: ErrorInfo): string {
    const { timestamp, level, category, message, context, details, stack } = info
    const levelStr = LogLevel[level]

    let formatted = `[${timestamp}] [${levelStr}] [${category}]`
    if (context) {
      formatted += ` [${context}]`
    }
    formatted += ` ${message}`

    if (details) {
      formatted += `\nDetails: ${JSON.stringify(details, null, 2)}`
    }

    if (stack) {
      formatted += `\nStack: ${stack}`
    }

    return formatted
  }

  private log(info: ErrorInfo): void {
    // 检查日志级别
    if (info.level < this.logLevel) {
      return
    }

    // 添加到内存中的日志队列
    this.logEntries.push(info)

    // 保持日志队列大小
    if (this.logEntries.length > this.maxLogEntries) {
      this.logEntries.shift()
    }

    const message = this.formatLogMessage(info)

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
      } catch (err) {
        // 静默处理
      }
    }
  }

  // 公共接口方法
  public debug(
    message: string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    context?: string,
    details?: unknown
  ): void {
    this.log({
      level: LogLevel.DEBUG,
      category,
      message,
      context,
      details,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    })
  }

  public info(
    message: string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    context?: string,
    details?: unknown
  ): void {
    this.log({
      level: LogLevel.INFO,
      category,
      message,
      context,
      details,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    })
  }

  public warn(
    message: string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    context?: string,
    details?: unknown
  ): void {
    this.log({
      level: LogLevel.WARN,
      category,
      message,
      context,
      details,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    })
  }

  public error(
    message: string,
    error?: Error | unknown,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    context?: string
  ): void {
    let details: unknown
    let stack: string | undefined

    if (error instanceof Error) {
      details = {
        name: error.name,
        message: error.message,
        cause: error.cause
      }
      stack = error.stack
    } else if (error) {
      details = error
    }

    this.log({
      level: LogLevel.ERROR,
      category,
      message,
      details,
      stack,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    })
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
  public handlePromiseRejection(event: PromiseRejectionEvent): void {
    this.error(
      'Unhandled Promise Rejection',
      event.reason,
      ErrorCategory.SYSTEM,
      'unhandledrejection'
    )
  }

  // 处理运行时错误
  public handleRuntimeError(event: ErrorEvent): void {
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
  private setupGlobalHandlers(): void {
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
          this.error(
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

  // 设置日志级别
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }

  // 获取最近的日志
  public getRecentLogs(lines: number = 100): ErrorInfo[] {
    return this.logEntries.slice(-lines)
  }

  // 清除日志
  public clearLogs(): void {
    this.logEntries = []
  }

  // 导出日志（用于调试）
  public exportLogs(): string {
    return this.logEntries.map((entry) => this.formatLogMessage(entry)).join('\n')
  }

  // 获取错误统计
  public getErrorStats(): {
    total: number
    byLevel: Record<string, number>
    byCategory: Record<string, number>
    recent: number
  } {
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000

    const byLevel: Record<string, number> = {}
    const byCategory: Record<string, number> = {}
    let recent = 0

    for (const entry of this.logEntries) {
      const levelStr = LogLevel[entry.level]
      byLevel[levelStr] = (byLevel[levelStr] || 0) + 1
      byCategory[entry.category] = (byCategory[entry.category] || 0) + 1

      const entryTime = new Date(entry.timestamp).getTime()
      if (entryTime > oneHourAgo) {
        recent++
      }
    }

    return {
      total: this.logEntries.length,
      byLevel,
      byCategory,
      recent
    }
  }
}

// 导出单例实例
export const rendererErrorHandler = new RendererErrorHandler()
