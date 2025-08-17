/**
 * 渲染优化管理器
 * 提供异步渲染调度、分批处理、性能监控集成等功能
 */

import { performanceMonitor } from './PerformanceMonitor'

// 渲染任务接口
export interface RenderTask<T = unknown> {
  id: string
  priority: 'high' | 'medium' | 'low'
  callback: () => Promise<T> | T
  timeout?: number
  dependencies?: string[]
}

// 渲染优先级配置
export interface RenderPriorityConfig {
  high: { timeout: number; maxConcurrent: number }
  medium: { timeout: number; maxConcurrent: number }
  low: { timeout: number; maxConcurrent: number }
}

// 批处理配置
export interface BatchConfig {
  batchSize: number
  delayBetweenBatches: number
  useIdleCallback: boolean
}

class RenderOptimizer {
  private static instance: RenderOptimizer | null = null
  private taskQueue: Map<
    string,
    RenderTask & { resolve: (value: any) => void; reject: (reason?: unknown) => void }
  > = new Map()
  private runningTasks: Set<string> = new Set()
  private completedTasks: Set<string> = new Set()

  // 配置
  private priorityConfig: RenderPriorityConfig = {
    high: { timeout: 5000, maxConcurrent: 3 }, // 5秒超时
    medium: { timeout: 10000, maxConcurrent: 2 }, // 10秒超时
    low: { timeout: 30000, maxConcurrent: 1 } // 30秒超时
  }

  private batchConfig: BatchConfig = {
    batchSize: 5,
    delayBetweenBatches: 16,
    useIdleCallback: true
  }

  private isProcessing = false
  private processingController?: AbortController

  static getInstance(): RenderOptimizer {
    if (!RenderOptimizer.instance) {
      RenderOptimizer.instance = new RenderOptimizer()
    }
    return RenderOptimizer.instance
  }

  /**
   * 添加渲染任务
   */
  addTask<T>(task: RenderTask<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // 检查依赖是否满足
      if (task.dependencies && !this.areDependenciesMet(task.dependencies)) {
        // 延迟添加任务直到依赖满足
        this.waitForDependencies(task.dependencies).then(() => {
          this.addTaskInternal(task, resolve, reject)
        })
      } else {
        this.addTaskInternal(task, resolve, reject)
      }
    })
  }

  private addTaskInternal<T>(
    task: RenderTask<T>,
    resolve: (value: T) => void,
    reject: (reason?: unknown) => void
  ): void {
    const enhancedTask = {
      ...task,
      resolve,
      reject
    }

    this.taskQueue.set(task.id, enhancedTask)

    // 记录任务添加
    performanceMonitor.recordUserAction('edit')

    // 如果没有在处理，开始处理
    if (!this.isProcessing) {
      this.processTasks()
    }
  }

  /**
   * 处理任务队列
   */
  private async processTasks(): Promise<void> {
    if (this.isProcessing) return

    this.isProcessing = true
    this.processingController = new AbortController()

    try {
      while (this.taskQueue.size > 0 && !this.processingController.signal.aborted) {
        await this.processTasksByPriority()
      }
    } catch (error) {
      // 任务处理错误
    } finally {
      this.isProcessing = false
      this.processingController = undefined
    }
  }

  /**
   * 按优先级处理任务
   */
  private async processTasksByPriority(): Promise<void> {
    const priorities: Array<keyof RenderPriorityConfig> = ['high', 'medium', 'low']

    for (const priority of priorities) {
      const tasks = this.getTasksByPriority(priority)
      if (tasks.length > 0) {
        await this.executeTasks(tasks, priority)
        return // 处理完一个优先级就退出，下一轮继续
      }
    }
  }

  /**
   * 获取指定优先级的任务
   */
  private getTasksByPriority(
    priority: keyof RenderPriorityConfig
  ): Array<RenderTask & { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }> {
    return Array.from(this.taskQueue.values()).filter((task) => task.priority === priority)
  }

  /**
   * 执行任务
   */
  private async executeTasks(
    tasks: Array<
      RenderTask & { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }
    >,
    priority: keyof RenderPriorityConfig
  ): Promise<void> {
    const config = this.priorityConfig[priority]
    const maxConcurrent = Math.min(config.maxConcurrent, tasks.length)

    // 分批执行任务
    for (let i = 0; i < tasks.length; i += maxConcurrent) {
      const batch = tasks.slice(i, i + maxConcurrent)

      if (this.batchConfig.useIdleCallback && priority === 'low') {
        await this.executeTasksInIdleTime(batch, config.timeout)
      } else {
        await this.executeTasksImmediately(batch, config.timeout)
      }

      // 批次间延迟
      if (i + maxConcurrent < tasks.length) {
        await this.delay(this.batchConfig.delayBetweenBatches)
      }
    }
  }

  /**
   * 在空闲时间执行任务
   */
  private async executeTasksInIdleTime(
    tasks: Array<
      RenderTask & { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }
    >,
    timeout: number
  ): Promise<void> {
    return new Promise((resolve) => {
      this.requestIdleCallback(
        async () => {
          await this.executeTasksImmediately(tasks, timeout)
          resolve()
        },
        { timeout }
      )
    })
  }

  /**
   * 立即执行任务
   */
  private async executeTasksImmediately(
    tasks: Array<
      RenderTask & { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }
    >,
    timeout: number
  ): Promise<void> {
    const startTime = performance.now()

    const promises = tasks.map(async (task) => {
      const taskStartTime = performance.now()

      try {
        this.runningTasks.add(task.id)
        const result = await Promise.race([
          Promise.resolve(task.callback()),
          this.timeoutPromise(task.timeout || timeout)
        ])

        // 记录性能
        const duration = performance.now() - taskStartTime
        performanceMonitor.recordEditorPerformance('render', duration)

        this.completedTasks.add(task.id)
        this.taskQueue.delete(task.id)
        task.resolve(result)
      } catch (error) {
        // 任务执行失败
        this.taskQueue.delete(task.id)
        task.reject(error)
      } finally {
        this.runningTasks.delete(task.id)
      }
    })

    await Promise.allSettled(promises)

    const totalDuration = performance.now() - startTime
    performanceMonitor.recordEditorPerformance('render', totalDuration)
  }

  /**
   * 分批处理大量数据
   */
  async processBatch<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R> | R,
    options: Partial<BatchConfig> = {}
  ): Promise<R[]> {
    const config = { ...this.batchConfig, ...options }
    const results: R[] = []

    for (let i = 0; i < items.length; i += config.batchSize) {
      const batch = items.slice(i, i + config.batchSize)

      const batchResults = await Promise.all(
        batch.map((item, batchIndex) => processor(item, i + batchIndex))
      )

      results.push(...batchResults)

      // 批次间让出主线程
      if (i + config.batchSize < items.length) {
        if (config.useIdleCallback) {
          await new Promise((resolve) => this.requestIdleCallback(() => resolve(undefined)))
        } else {
          await this.delay(config.delayBetweenBatches)
        }
      }
    }

    return results
  }

  /**
   * 异步延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 超时Promise
   */
  private timeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('任务超时')), timeout)
    })
  }

  /**
   * requestIdleCallback 封装
   */
  private requestIdleCallback(callback: () => void, options?: { timeout?: number }): void {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(callback, options)
    } else {
      // 降级处理
      setTimeout(callback, 0)
    }
  }

  /**
   * 检查依赖是否满足
   */
  private areDependenciesMet(dependencies: string[]): boolean {
    return dependencies.every((dep) => this.completedTasks.has(dep))
  }

  /**
   * 等待依赖完成
   */
  private async waitForDependencies(dependencies: string[]): Promise<void> {
    const checkInterval = 16 // 1帧的时间

    while (!this.areDependenciesMet(dependencies)) {
      await this.delay(checkInterval)
    }
  }

  /**
   * 取消所有任务
   */
  cancelAllTasks(): void {
    if (this.processingController) {
      this.processingController.abort()
    }

    // 拒绝所有未完成的任务
    for (const task of this.taskQueue.values()) {
      task.reject(new Error('任务被取消'))
    }

    this.taskQueue.clear()
    this.runningTasks.clear()
  }

  /**
   * 更新配置
   */
  updateConfig(
    priorityConfig?: Partial<RenderPriorityConfig>,
    batchConfig?: Partial<BatchConfig>
  ): void {
    if (priorityConfig) {
      this.priorityConfig = { ...this.priorityConfig, ...priorityConfig }
    }
    if (batchConfig) {
      this.batchConfig = { ...this.batchConfig, ...batchConfig }
    }
  }

  /**
   * 获取任务统计
   */
  getTaskStats(): {
    queued: number
    running: number
    completed: number
  } {
    return {
      queued: this.taskQueue.size,
      running: this.runningTasks.size,
      completed: this.completedTasks.size
    }
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.completedTasks.clear()
  }
}

// 导出单例实例
export const renderOptimizer = RenderOptimizer.getInstance()

// 导出便捷函数
export const scheduleRenderTask = <T>(task: RenderTask<T>) => renderOptimizer.addTask(task)

export const processBatch = <T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R> | R,
  options?: Partial<BatchConfig>
) => renderOptimizer.processBatch(items, processor, options)
