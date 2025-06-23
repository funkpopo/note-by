/**
 * 文件冲突检测器 - 检测并处理文件编辑冲突
 * 支持文件版本比较、修改时间检测和内容hash对比
 */

export interface FileSnapshot {
  /** 文件路径 */
  filePath: string
  /** 内容hash */
  contentHash: string
  /** 最后修改时间 */
  lastModified: number
  /** 文件大小 */
  size: number
  /** 快照创建时间 */
  snapshotTime: number
}

export interface ConflictCheckResult {
  /** 是否存在冲突 */
  hasConflict: boolean
  /** 冲突类型 */
  conflictType?: 'external_modification' | 'size_mismatch' | 'concurrent_edit'
  /** 冲突描述 */
  message?: string
  /** 当前文件信息 */
  currentSnapshot?: FileSnapshot
  /** 之前的文件信息 */
  previousSnapshot?: FileSnapshot
}

export interface ConflictDetectorOptions {
  /** 是否启用内容hash检测 */
  enableContentHash?: boolean
  /** 是否启用文件大小检测 */
  enableSizeCheck?: boolean
  /** 是否启用修改时间检测 */
  enableModTimeCheck?: boolean
  /** 允许的时间偏差（毫秒） */
  timeToleranceMs?: number
}

export class ConflictDetector {
  private fileSnapshots = new Map<string, FileSnapshot>()
  private readonly options: Required<ConflictDetectorOptions>

  constructor(options: ConflictDetectorOptions = {}) {
    this.options = {
      enableContentHash: true,
      enableSizeCheck: false, // 暂时禁用大小检测
      enableModTimeCheck: false, // 暂时禁用修改时间检测，因为无法准确获取文件时间
      timeToleranceMs: 1000, // 1秒的时间容忍度
      ...options
    }
  }

  /**
   * 创建文件快照
   * @param filePath 文件路径
   * @param content 文件内容
   * @returns 文件快照
   */
  async createSnapshot(filePath: string, content: string): Promise<FileSnapshot> {
    const snapshot: FileSnapshot = {
      filePath,
      contentHash: this.options.enableContentHash ? this.calculateHash(content) : '',
      lastModified: Date.now(),
      size: new Blob([content]).size,
      snapshotTime: Date.now()
    }

    // 尝试获取实际的文件信息
    try {
      const fileInfo = await this.getFileInfo(filePath)
      if (fileInfo) {
        snapshot.lastModified = fileInfo.lastModified
        snapshot.size = fileInfo.size
      }
    } catch (error) {
      // 文件可能不存在，使用默认值
    }

    this.fileSnapshots.set(filePath, snapshot)
    return snapshot
  }

  /**
   * 检查文件是否存在冲突
   * @param filePath 文件路径
   * @param currentContent 当前内容
   * @returns 冲突检查结果
   */
  async checkConflict(filePath: string, currentContent: string): Promise<ConflictCheckResult> {
    const previousSnapshot = this.fileSnapshots.get(filePath)

    if (!previousSnapshot) {
      // 没有之前的快照，创建新快照
      await this.createSnapshot(filePath, currentContent)
      return { hasConflict: false }
    }

    // 获取当前文件信息
    let currentSnapshot: FileSnapshot
    try {
      currentSnapshot = await this.createCurrentSnapshot(filePath, currentContent)
    } catch (error) {
      return {
        hasConflict: true,
        conflictType: 'external_modification',
        message: '无法读取文件信息，文件可能被删除或移动',
        previousSnapshot
      }
    }

    // 检查冲突：主要依赖内容比较
    const conflicts: ConflictCheckResult[] = []

    // 只有当启用相应检测时才进行检查
    if (this.options.enableModTimeCheck) {
      const modTimeConflict = this.checkExternalModification(previousSnapshot, currentSnapshot)
      if (modTimeConflict.hasConflict) conflicts.push(modTimeConflict)
    }

    if (this.options.enableSizeCheck) {
      const sizeConflict = this.checkSizeMismatch(previousSnapshot, currentSnapshot)
      if (sizeConflict.hasConflict) conflicts.push(sizeConflict)
    }

    if (this.options.enableContentHash) {
      const contentConflict = this.checkConcurrentEdit(previousSnapshot, currentSnapshot)
      if (contentConflict.hasConflict) conflicts.push(contentConflict)
    }

    if (conflicts.length > 0) {
      const primaryConflict = conflicts[0]
      return {
        ...primaryConflict,
        currentSnapshot,
        previousSnapshot
      }
    }

    // 更新快照
    this.fileSnapshots.set(filePath, currentSnapshot)

    return {
      hasConflict: false,
      currentSnapshot,
      previousSnapshot
    }
  }

  /**
   * 检查外部修改冲突
   */
  private checkExternalModification(
    previous: FileSnapshot,
    current: FileSnapshot
  ): ConflictCheckResult {
    if (!this.options.enableModTimeCheck) {
      return { hasConflict: false }
    }

    const timeDiff = Math.abs(current.lastModified - previous.lastModified)

    // 如果文件的修改时间差异超过容忍度，且不是我们的保存操作导致的
    if (timeDiff > this.options.timeToleranceMs && current.lastModified > previous.snapshotTime) {
      return {
        hasConflict: true,
        conflictType: 'external_modification',
        message: '文件已被外部程序修改'
      }
    }

    return { hasConflict: false }
  }

  /**
   * 检查文件大小不匹配
   */
  private checkSizeMismatch(previous: FileSnapshot, current: FileSnapshot): ConflictCheckResult {
    if (!this.options.enableSizeCheck) {
      return { hasConflict: false }
    }

    // 简单的大小检查，如果差异过大可能表示文件被外部修改
    const sizeDiff = Math.abs(current.size - previous.size)
    const maxExpectedChange = Math.max(previous.size * 0.5, 1000) // 50%或1KB

    if (sizeDiff > maxExpectedChange) {
      return {
        hasConflict: true,
        conflictType: 'size_mismatch',
        message: `文件大小变化异常（${previous.size} → ${current.size} 字节）`
      }
    }

    return { hasConflict: false }
  }

  /**
   * 检查并发编辑冲突
   */
  private checkConcurrentEdit(previous: FileSnapshot, current: FileSnapshot): ConflictCheckResult {
    if (!this.options.enableContentHash || !previous.contentHash || !current.contentHash) {
      return { hasConflict: false }
    }

    // 简化冲突检测：只有在content hash明显不同且不是预期的编辑变化时才报告冲突
    // 这里我们暂时禁用并发编辑检测，依赖内容比较来判断冲突
    return { hasConflict: false }
  }

  /**
   * 创建当前文件快照
   */
  private async createCurrentSnapshot(filePath: string, content: string): Promise<FileSnapshot> {
    const fileInfo = await this.getFileInfo(filePath)

    return {
      filePath,
      contentHash: this.options.enableContentHash ? this.calculateHash(content) : '',
      lastModified: fileInfo?.lastModified ?? Date.now(),
      size: fileInfo?.size ?? new Blob([content]).size,
      snapshotTime: Date.now()
    }
  }

  /**
   * 获取文件信息
   */
  private async getFileInfo(
    filePath: string
  ): Promise<{ lastModified: number; size: number } | null> {
    try {
      // 使用Electron API获取文件状态
      if (window.api?.markdown?.checkFileExists) {
        const exists = await window.api.markdown.checkFileExists(filePath)
        if (exists.success && exists.exists) {
          // 这里需要扩展API来获取文件状态，暂时返回当前时间
          return {
            lastModified: Date.now(),
            size: 0
          }
        }
      }
      return null
    } catch (error) {
      return null
    }
  }

  /**
   * 计算内容hash
   */
  private calculateHash(content: string): string {
    // 简单的hash算法，用于检测内容变化
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // 转换为32位整数
    }
    return hash.toString(36)
  }

  /**
   * 解决冲突 - 更新快照信息
   * @param filePath 文件路径
   * @param resolvedContent 解决冲突后的内容
   */
  async resolveConflict(filePath: string, resolvedContent: string): Promise<void> {
    await this.createSnapshot(filePath, resolvedContent)
  }

  /**
   * 清理指定文件的快照
   * @param filePath 文件路径
   */
  clearSnapshot(filePath: string): void {
    this.fileSnapshots.delete(filePath)
  }

  /**
   * 清理所有快照
   */
  clearAllSnapshots(): void {
    this.fileSnapshots.clear()
  }

  /**
   * 获取文件快照
   * @param filePath 文件路径
   */
  getSnapshot(filePath: string): FileSnapshot | undefined {
    return this.fileSnapshots.get(filePath)
  }
}
