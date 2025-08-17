import { mainErrorHandler, ErrorCategory } from './ErrorHandler'

// 数据库错误类型枚举
export enum DatabaseErrorType {
  CONNECTION_FAILED = 'connection_failed',
  QUERY_FAILED = 'query_failed',
  TRANSACTION_FAILED = 'transaction_failed',
  CORRUPTION = 'corruption',
  PERMISSION_DENIED = 'permission_denied',
  DISK_FULL = 'disk_full',
  TIMEOUT = 'timeout',
  LOCK_TIMEOUT = 'lock_timeout',
  UNKNOWN = 'unknown'
}

// 错误严重性级别
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// 数据库错误信息接口
export interface DatabaseError {
  type: DatabaseErrorType
  severity: ErrorSeverity
  message: string
  originalError: Error
  timestamp: number
  context?: {
    operation?: string
    table?: string
    query?: string
    retryCount?: number
  }
  recoverable: boolean
  autoRetry: boolean
}

// 错误统计信息
interface ErrorStats {
  totalErrors: number
  errorsByType: Record<DatabaseErrorType, number>
  errorsBySeverity: Record<ErrorSeverity, number>
  lastErrorTime: number
  errorRate: number // 每分钟错误数
}

// 恢复策略接口
interface RecoveryStrategy {
  maxRetries: number
  retryDelay: number
  backoffMultiplier: number
  maxDelay: number
  shouldRetry: (error: DatabaseError, attempt: number) => boolean
  onRecovery?: (error: DatabaseError, attempt: number) => Promise<void>
}

/**
 * 数据库专用错误处理器
 * 提供错误分类、自动恢复、监控和上报功能
 */
export class DatabaseErrorHandler {
  private errorHistory: DatabaseError[] = []
  private readonly maxHistorySize: number = 1000
  private errorStats: ErrorStats = {
    totalErrors: 0,
    errorsByType: {} as Record<DatabaseErrorType, number>,
    errorsBySeverity: {} as Record<ErrorSeverity, number>,
    lastErrorTime: 0,
    errorRate: 0
  }

  private recoveryStrategies: Map<DatabaseErrorType, RecoveryStrategy> = new Map()
  private isMonitoring: boolean = false
  private monitoringInterval?: NodeJS.Timeout

  constructor() {
    this.initializeRecoveryStrategies()
    this.startMonitoring()
  }

  /**
   * 处理数据库错误
   */
  async handleError(
    originalError: Error,
    context?: {
      operation?: string
      table?: string
      query?: string
      retryCount?: number
    }
  ): Promise<DatabaseError> {
    const dbError = this.classifyError(originalError, context)

    // 记录错误
    this.recordError(dbError)

    // 上报错误
    this.reportError(dbError)

    // 尝试自动恢复
    if (dbError.autoRetry && dbError.recoverable) {
      await this.attemptRecovery(dbError)
    }

    return dbError
  }

  /**
   * 分类数据库错误
   */
  private classifyError(
    originalError: Error,
    context?: {
      operation?: string
      table?: string
      query?: string
      retryCount?: number
    }
  ): DatabaseError {
    const message = originalError.message.toLowerCase()
    let type = DatabaseErrorType.UNKNOWN
    let severity = ErrorSeverity.MEDIUM
    let recoverable = false
    let autoRetry = false

    // 连接错误
    if (
      message.includes('database is locked') ||
      message.includes('cannot open database') ||
      message.includes('database disk image is malformed')
    ) {
      type = DatabaseErrorType.CONNECTION_FAILED
      severity = ErrorSeverity.HIGH
      recoverable = true
      autoRetry = true
    }
    // 查询错误
    else if (
      message.includes('syntax error') ||
      message.includes('no such table') ||
      message.includes('no such column')
    ) {
      type = DatabaseErrorType.QUERY_FAILED
      severity = ErrorSeverity.MEDIUM
      recoverable = false
      autoRetry = false
    }
    // 事务错误
    else if (
      message.includes('transaction') ||
      message.includes('rollback') ||
      message.includes('commit')
    ) {
      type = DatabaseErrorType.TRANSACTION_FAILED
      severity = ErrorSeverity.MEDIUM
      recoverable = true
      autoRetry = true
    }
    // 数据库损坏
    else if (
      message.includes('corrupt') ||
      message.includes('malformed') ||
      message.includes('integrity')
    ) {
      type = DatabaseErrorType.CORRUPTION
      severity = ErrorSeverity.CRITICAL
      recoverable = false
      autoRetry = false
    }
    // 权限错误
    else if (
      message.includes('permission') ||
      message.includes('access') ||
      message.includes('readonly')
    ) {
      type = DatabaseErrorType.PERMISSION_DENIED
      severity = ErrorSeverity.HIGH
      recoverable = false
      autoRetry = false
    }
    // 磁盘空间不足
    else if (
      message.includes('disk full') ||
      message.includes('no space') ||
      message.includes('write failed')
    ) {
      type = DatabaseErrorType.DISK_FULL
      severity = ErrorSeverity.CRITICAL
      recoverable = false
      autoRetry = false
    }
    // 超时错误
    else if (message.includes('timeout') || message.includes('busy')) {
      type = DatabaseErrorType.TIMEOUT
      severity = ErrorSeverity.MEDIUM
      recoverable = true
      autoRetry = true
    }
    // 锁超时
    else if (message.includes('lock') && message.includes('timeout')) {
      type = DatabaseErrorType.LOCK_TIMEOUT
      severity = ErrorSeverity.MEDIUM
      recoverable = true
      autoRetry = true
    }

    return {
      type,
      severity,
      message: originalError.message,
      originalError,
      timestamp: Date.now(),
      context,
      recoverable,
      autoRetry
    }
  }

  /**
   * 记录错误到历史记录
   */
  private recordError(error: DatabaseError): void {
    // 添加到历史记录
    this.errorHistory.push(error)

    // 保持历史记录大小限制
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize)
    }

    // 更新统计信息
    this.updateErrorStats(error)
  }

  /**
   * 更新错误统计信息
   */
  private updateErrorStats(error: DatabaseError): void {
    this.errorStats.totalErrors++
    this.errorStats.lastErrorTime = error.timestamp

    // 按类型统计
    if (!this.errorStats.errorsByType[error.type]) {
      this.errorStats.errorsByType[error.type] = 0
    }
    this.errorStats.errorsByType[error.type]++

    // 按严重性统计
    if (!this.errorStats.errorsBySeverity[error.severity]) {
      this.errorStats.errorsBySeverity[error.severity] = 0
    }
    this.errorStats.errorsBySeverity[error.severity]++

    // 计算错误率（每分钟）
    this.calculateErrorRate()
  }

  /**
   * 计算错误率
   */
  private calculateErrorRate(): void {
    const now = Date.now()
    const oneMinuteAgo = now - 60000

    const recentErrors = this.errorHistory.filter((error) => error.timestamp > oneMinuteAgo).length

    this.errorStats.errorRate = recentErrors
  }

  /**
   * 上报错误
   */
  private reportError(error: DatabaseError): void {
    // 使用现有的错误处理器进行上报
    mainErrorHandler.error(
      `Database ${error.type}: ${error.message}`,
      error.originalError,
      ErrorCategory.DATABASE,
      error.context?.operation || 'database_operation'
    )

    // 对于严重错误，额外记录
    if (error.severity === ErrorSeverity.CRITICAL) {
      console.error('Critical database error detected:', {
        type: error.type,
        message: error.message,
        context: error.context,
        timestamp: new Date(error.timestamp).toISOString()
      })
    }
  }

  /**
   * 尝试自动恢复
   */
  private async attemptRecovery(error: DatabaseError): Promise<boolean> {
    const strategy = this.recoveryStrategies.get(error.type)
    if (!strategy) {
      return false
    }

    const retryCount = error.context?.retryCount || 0

    if (!strategy.shouldRetry(error, retryCount)) {
      return false
    }

    try {
      // 等待重试延迟
      const delay = Math.min(
        strategy.retryDelay * Math.pow(strategy.backoffMultiplier, retryCount),
        strategy.maxDelay
      )

      await new Promise((resolve) => setTimeout(resolve, delay))

      // 执行恢复回调
      if (strategy.onRecovery) {
        await strategy.onRecovery(error, retryCount + 1)
      }

      // Database error recovery attempted for ${error.type}, attempt ${retryCount + 1}
      return true
    } catch (recoveryError) {
      console.error(`Database error recovery failed for ${error.type}:`, recoveryError)
      return false
    }
  }

  /**
   * 初始化恢复策略
   */
  private initializeRecoveryStrategies(): void {
    // 连接失败恢复策略
    this.recoveryStrategies.set(DatabaseErrorType.CONNECTION_FAILED, {
      maxRetries: 5,
      retryDelay: 1000,
      backoffMultiplier: 2,
      maxDelay: 30000,
      shouldRetry: (_error, attempt) => attempt < 5,
      onRecovery: async (_error) => {
        // Attempting database connection recovery
        // 这里可以添加重新初始化连接池的逻辑
      }
    })

    // 事务失败恢复策略
    this.recoveryStrategies.set(DatabaseErrorType.TRANSACTION_FAILED, {
      maxRetries: 3,
      retryDelay: 500,
      backoffMultiplier: 2,
      maxDelay: 5000,
      shouldRetry: (_error, attempt) => attempt < 3
    })

    // 超时错误恢复策略
    this.recoveryStrategies.set(DatabaseErrorType.TIMEOUT, {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 1.5,
      maxDelay: 10000,
      shouldRetry: (_error, attempt) => attempt < 3
    })

    // 锁超时恢复策略
    this.recoveryStrategies.set(DatabaseErrorType.LOCK_TIMEOUT, {
      maxRetries: 5,
      retryDelay: 200,
      backoffMultiplier: 1.5,
      maxDelay: 2000,
      shouldRetry: (_error, attempt) => attempt < 5
    })
  }

  /**
   * 开始错误监控
   */
  private startMonitoring(): void {
    if (this.isMonitoring) {
      return
    }

    this.isMonitoring = true
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck()
    }, 60000) // 每分钟检查一次
  }

  /**
   * 停止错误监控
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
    }
    this.isMonitoring = false
  }

  /**
   * 执行健康检查
   */
  private performHealthCheck(): void {
    const now = Date.now()
    const fiveMinutesAgo = now - 300000 // 5分钟

    // 检查最近5分钟的错误
    const recentErrors = this.errorHistory.filter((error) => error.timestamp > fiveMinutesAgo)

    // 检查错误率是否过高
    if (recentErrors.length > 50) {
      // 5分钟内超过50个错误
      // Database error rate is high
    }

    // 检查严重错误
    const criticalErrors = recentErrors.filter((error) => error.severity === ErrorSeverity.CRITICAL)

    if (criticalErrors.length > 0) {
      console.error('Critical database errors detected in the last 5 minutes:', {
        count: criticalErrors.length,
        errors: criticalErrors.map((e) => ({ type: e.type, message: e.message }))
      })
    }

    // 更新错误率
    this.calculateErrorRate()
  }

  /**
   * 获取错误统计信息
   */
  getErrorStats(): ErrorStats {
    return { ...this.errorStats }
  }

  /**
   * 获取最近的错误历史
   */
  getRecentErrors(minutes: number = 60): DatabaseError[] {
    const cutoff = Date.now() - minutes * 60000
    return this.errorHistory.filter((error) => error.timestamp > cutoff)
  }

  /**
   * 清除错误历史
   */
  clearErrorHistory(): void {
    this.errorHistory = []
    this.errorStats = {
      totalErrors: 0,
      errorsByType: {} as Record<DatabaseErrorType, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      lastErrorTime: 0,
      errorRate: 0
    }
  }

  /**
   * 检查是否应该阻止操作
   */
  shouldBlockOperation(): boolean {
    // 如果错误率过高，阻止新操作
    if (this.errorStats.errorRate > 20) {
      // 每分钟超过20个错误
      return true
    }

    // 如果最近有严重错误，可能需要阻止操作
    const recentCriticalErrors = this.getRecentErrors(5).filter(
      (error) => error.severity === ErrorSeverity.CRITICAL
    )

    return recentCriticalErrors.length > 3 // 5分钟内超过3个严重错误
  }

  /**
   * 创建安全的数据库操作包装器
   */
  createSafeOperation<T>(
    operation: () => Promise<T>,
    context?: {
      operation?: string
      table?: string
      query?: string
    }
  ): () => Promise<T | null> {
    return async (): Promise<T | null> => {
      // 检查是否应该阻止操作
      if (this.shouldBlockOperation()) {
        // Database operation blocked due to high error rate
        return null
      }

      try {
        return await operation()
      } catch (error) {
        const dbError = await this.handleError(error as Error, context)

        // 对于可恢复的错误，可能需要重试
        if (dbError.recoverable && dbError.autoRetry) {
          // 重试逻辑已在handleError中处理
          // 这里返回null表示操作失败
        }

        return null
      }
    }
  }
}

// 导出全局实例
export const databaseErrorHandler = new DatabaseErrorHandler()
