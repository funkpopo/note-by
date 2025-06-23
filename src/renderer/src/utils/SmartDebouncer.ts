/**
 * 智能防抖器 - 为自动保存提供智能的防抖策略
 * 支持多级防抖、内容变化检测和用户行为分析
 */

export interface SmartDebouncerOptions {
  /** 快速输入时的防抖延迟（毫秒） */
  fastTypingDelay?: number
  /** 正常输入时的防抖延迟（毫秒） */
  normalDelay?: number
  /** 停顿后的防抖延迟（毫秒） */
  pauseDelay?: number
  /** 判断快速输入的时间间隔（毫秒） */
  fastTypingThreshold?: number
  /** 最小内容变化量 */
  minContentChange?: number
  /** 最大延迟时间（毫秒） */
  maxDelay?: number
}

interface TypingPattern {
  /** 最后一次操作时间 */
  lastActionTime: number
  /** 连续快速输入次数 */
  fastTypingCount: number
  /** 操作间隔历史 */
  intervalHistory: number[]
}

export class SmartDebouncer {
  private timer: ReturnType<typeof setTimeout> | null = null
  private lastContent: string = ''
  private typingPattern: TypingPattern = {
    lastActionTime: 0,
    fastTypingCount: 0,
    intervalHistory: []
  }

  private readonly options: Required<SmartDebouncerOptions>

  constructor(options: SmartDebouncerOptions = {}) {
    this.options = {
      fastTypingDelay: 1000, // 快速输入：1秒
      normalDelay: 2000, // 正常输入：2秒
      pauseDelay: 500, // 停顿后：0.5秒
      fastTypingThreshold: 200, // 200ms内的输入视为快速输入
      minContentChange: 3, // 至少3个字符变化
      maxDelay: 10000, // 最大10秒必须保存
      ...options
    }
  }

  /**
   * 执行智能防抖
   * @param content 当前内容
   * @param callback 回调函数
   * @param forceDelay 强制使用的延迟时间
   */
  debounce(content: string, callback: () => void, forceDelay?: number): void {
    const now = Date.now()

    // 更新用户行为模式
    this.updateTypingPattern(now)

    // 检查内容是否有实质性变化
    if (!this.hasSignificantChange(content)) {
      return
    }

    // 清除之前的定时器
    if (this.timer) {
      clearTimeout(this.timer)
    }

    // 计算延迟时间
    const delay = forceDelay ?? this.calculateDelay()

    // 设置新的定时器
    this.timer = setTimeout(() => {
      this.lastContent = content
      callback()
      this.resetTypingPattern()
    }, delay)

    // 更新最后内容（用于变化检测）
    this.lastContent = content
  }

  /**
   * 立即执行回调并清除定时器
   * @param callback 回调函数
   */
  flush(callback: () => void): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    callback()
    this.resetTypingPattern()
  }

  /**
   * 取消当前的防抖定时器
   */
  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  /**
   * 检查是否有实质性内容变化
   */
  private hasSignificantChange(content: string): boolean {
    if (!content) {
      return false // 空内容不触发保存
    }

    if (!this.lastContent) {
      return content.trim().length > 0
    }

    const diff = Math.abs(content.length - this.lastContent.length)
    return diff >= this.options.minContentChange || content.trim() !== this.lastContent.trim()
  }

  /**
   * 更新用户输入模式
   */
  private updateTypingPattern(now: number): void {
    const timeSinceLastAction = now - this.typingPattern.lastActionTime

    // 记录间隔时间（最多保留5个）
    if (this.typingPattern.lastActionTime > 0) {
      this.typingPattern.intervalHistory.push(timeSinceLastAction)
      if (this.typingPattern.intervalHistory.length > 5) {
        this.typingPattern.intervalHistory.shift()
      }
    }

    // 判断是否为快速输入
    if (timeSinceLastAction < this.options.fastTypingThreshold) {
      this.typingPattern.fastTypingCount++
    } else {
      this.typingPattern.fastTypingCount = 0
    }

    this.typingPattern.lastActionTime = now
  }

  /**
   * 计算智能延迟时间
   */
  private calculateDelay(): number {
    const now = Date.now()
    const timeSinceLastAction = now - this.typingPattern.lastActionTime

    // 如果用户刚停止输入（停顿），使用较短延迟
    if (timeSinceLastAction > this.options.fastTypingThreshold * 3) {
      return this.options.pauseDelay
    }

    // 如果是连续快速输入，使用较长延迟
    if (this.typingPattern.fastTypingCount > 3) {
      return this.options.fastTypingDelay
    }

    // 计算平均输入间隔
    if (this.typingPattern.intervalHistory.length >= 3) {
      const avgInterval =
        this.typingPattern.intervalHistory.reduce((a, b) => a + b, 0) /
        this.typingPattern.intervalHistory.length

      // 根据输入节奏调整延迟
      if (avgInterval < this.options.fastTypingThreshold) {
        return this.options.fastTypingDelay
      }
    }

    return this.options.normalDelay
  }

  /**
   * 重置输入模式
   */
  private resetTypingPattern(): void {
    this.typingPattern.fastTypingCount = 0
    this.typingPattern.intervalHistory = []
  }

  /**
   * 获取当前防抖状态
   */
  getPendingStatus(): { isPending: boolean; estimatedDelay?: number } {
    return {
      isPending: this.timer !== null,
      estimatedDelay: this.timer ? this.calculateDelay() : undefined
    }
  }
}
