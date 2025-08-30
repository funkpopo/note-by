/**
 * 文件流管理器
 * 提供流式文件I/O操作，优化大文件处理性能
 */
import * as fs from 'fs'
import * as path from 'path'
import { pipeline } from 'stream/promises'
import { Transform } from 'stream'

// 文件操作配置
interface FileStreamConfig {
  chunkSize?: number // 块大小，默认64KB
  maxConcurrency?: number // 最大并发数，默认5
  encoding?: BufferEncoding // 文件编码，默认utf-8
  createDirIfNotExists?: boolean // 如果目录不存在是否创建
}

// 批量操作配置
interface BatchOperationConfig extends FileStreamConfig {
  batchSize?: number // 批处理大小，默认10
  onProgress?: (completed: number, total: number) => void // 进度回调
  onError?: (error: Error, filePath: string) => void // 错误回调
}

// 文件信息接口
interface FileInfo {
  path: string
  size: number
  exists: boolean
  isDirectory: boolean
  lastModified: Date
}

class FileStreamManager {
  private readonly defaultConfig: Required<FileStreamConfig> = {
    chunkSize: 64 * 1024, // 64KB
    maxConcurrency: 5,
    encoding: 'utf-8',
    createDirIfNotExists: true
  }

  /**
   * 流式读取文件内容
   * @param filePath 文件路径
   * @param config 配置选项
   */
  async readFileStream(
    filePath: string,
    config: FileStreamConfig = {}
  ): Promise<{ success: boolean; content?: string; error?: string; size?: number }> {
    const finalConfig = { ...this.defaultConfig, ...config }

    try {
      // 检查文件是否存在
      const fileInfo = await this.getFileInfo(filePath)
      if (!fileInfo.exists) {
        return { success: false, error: '文件不存在' }
      }

      // 对于小文件（<1MB），直接使用常规读取
      if (fileInfo.size < 1024 * 1024) {
        const content = await fs.promises.readFile(filePath, finalConfig.encoding)
        return { success: true, content, size: fileInfo.size }
      }

      // 大文件使用流式读取
      const chunks: Buffer[] = []
      const readStream = fs.createReadStream(filePath, {
        highWaterMark: finalConfig.chunkSize,
        encoding: finalConfig.encoding
      })

      await pipeline(
        readStream,
        new Transform({
          transform(chunk, _encoding, callback) {
            chunks.push(Buffer.from(chunk))
            callback(null, chunk)
          }
        })
      )

      const content = Buffer.concat(chunks).toString(finalConfig.encoding)
      return { success: true, content, size: fileInfo.size }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 流式写入文件内容
   * @param filePath 文件路径
   * @param content 文件内容
   * @param config 配置选项
   */
  async writeFileStream(
    filePath: string,
    content: string,
    config: FileStreamConfig = {}
  ): Promise<{ success: boolean; error?: string; bytesWritten?: number }> {
    const finalConfig = { ...this.defaultConfig, ...config }

    try {
      // 确保目录存在
      if (finalConfig.createDirIfNotExists) {
        const dir = path.dirname(filePath)
        await fs.promises.mkdir(dir, { recursive: true })
      }

      const buffer = Buffer.from(content, finalConfig.encoding)

      // 对于小文件（<1MB），直接使用常规写入
      if (buffer.length < 1024 * 1024) {
        await fs.promises.writeFile(filePath, content, finalConfig.encoding)
        return { success: true, bytesWritten: buffer.length }
      }

      // 大文件使用流式写入
      const writeStream = fs.createWriteStream(filePath, {
        highWaterMark: finalConfig.chunkSize
      })

      let bytesWritten = 0

      await pipeline(async function* () {
        let offset = 0
        while (offset < buffer.length) {
          const chunk = buffer.subarray(offset, offset + finalConfig.chunkSize)
          bytesWritten += chunk.length
          yield chunk
          offset += finalConfig.chunkSize
        }
      }, writeStream)

      return { success: true, bytesWritten }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 批量文件操作
   * @param operations 操作列表
   * @param config 批量配置
   */
  async batchFileOperations<T>(
    operations: Array<() => Promise<T>>,
    config: BatchOperationConfig = {}
  ): Promise<{
    success: boolean
    results: Array<{ success: boolean; result?: T; error?: string }>
    completedCount: number
    totalCount: number
  }> {
    const finalConfig = {
      ...this.defaultConfig,
      batchSize: 10,
      ...config
    }

    const results: Array<{ success: boolean; result?: T; error?: string }> = []
    let completedCount = 0
    const totalCount = operations.length

    try {
      // 按批次处理操作
      for (let i = 0; i < operations.length; i += finalConfig.batchSize) {
        const batch = operations.slice(i, i + finalConfig.batchSize)

        // 限制并发数量
        const semaphore = new Array(Math.min(finalConfig.maxConcurrency, batch.length))
          .fill(null)
          .map(() => Promise.resolve())

        const batchPromises = batch.map(async (operation, index) => {
          // 等待信号量
          await semaphore[index % semaphore.length]

          try {
            const result = await operation()
            const success = { success: true, result }
            results.push(success)
            completedCount++

            // 调用进度回调
            config.onProgress?.(completedCount, totalCount)

            return success
          } catch (error) {
            const failure = {
              success: false,
              error: error instanceof Error ? error.message : String(error)
            }
            results.push(failure)
            completedCount++

            // 调用错误回调
            config.onError?.(
              error instanceof Error ? error : new Error(String(error)),
              `operation-${i + index}`
            )
            config.onProgress?.(completedCount, totalCount)

            return failure
          }
        })

        await Promise.all(batchPromises)
      }

      return {
        success: true,
        results,
        completedCount,
        totalCount
      }
    } catch {
      return {
        success: false,
        results,
        completedCount,
        totalCount
      }
    }
  }

  /**
   * 复制文件（流式）
   * @param sourcePath 源文件路径
   * @param targetPath 目标文件路径
   * @param config 配置选项
   */
  async copyFileStream(
    sourcePath: string,
    targetPath: string,
    config: FileStreamConfig = {}
  ): Promise<{ success: boolean; error?: string; bytescopied?: number }> {
    const finalConfig = { ...this.defaultConfig, ...config }

    try {
      // 检查源文件是否存在
      const sourceInfo = await this.getFileInfo(sourcePath)
      if (!sourceInfo.exists) {
        return { success: false, error: '源文件不存在' }
      }

      // 确保目标目录存在
      if (finalConfig.createDirIfNotExists) {
        const targetDir = path.dirname(targetPath)
        await fs.promises.mkdir(targetDir, { recursive: true })
      }

      // 使用流式复制
      const readStream = fs.createReadStream(sourcePath, {
        highWaterMark: finalConfig.chunkSize
      })

      const writeStream = fs.createWriteStream(targetPath, {
        highWaterMark: finalConfig.chunkSize
      })

      let bytescopied = 0

      await pipeline(
        readStream,
        new Transform({
          transform(chunk, _encoding, callback) {
            bytescopied += chunk.length
            callback(null, chunk)
          }
        }),
        writeStream
      )

      return { success: true, bytescopied }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 获取文件信息
   * @param filePath 文件路径
   */
  async getFileInfo(filePath: string): Promise<FileInfo> {
    try {
      const stats = await fs.promises.stat(filePath)
      return {
        path: filePath,
        size: stats.size,
        exists: true,
        isDirectory: stats.isDirectory(),
        lastModified: stats.mtime
      }
    } catch {
      return {
        path: filePath,
        size: 0,
        exists: false,
        isDirectory: false,
        lastModified: new Date(0)
      }
    }
  }

  /**
   * 批量获取文件信息
   * @param filePaths 文件路径列表
   */
  async batchGetFileInfo(filePaths: string[]): Promise<FileInfo[]> {
    const result = await this.batchFileOperations(
      filePaths.map((filePath) => () => this.getFileInfo(filePath)),
      { maxConcurrency: 10 }
    )

    return result.results.filter((r) => r.success).map((r) => r.result!)
  }

  /**
   * 批量读取文件
   * @param filePaths 文件路径列表
   * @param config 配置选项
   */
  async batchReadFiles(
    filePaths: string[],
    config: BatchOperationConfig = {}
  ): Promise<Array<{ success: boolean; content?: string; error?: string; filePath: string }>> {
    const finalConfig = { ...this.defaultConfig, ...config }

    const operations = filePaths.map((filePath) => async () => {
      const result = await this.readFileStream(filePath, finalConfig)
      return {
        ...result,
        filePath
      }
    })

    const batchResult = await this.batchFileOperations(operations, finalConfig)

    return batchResult.results.map((r) =>
      r.success
        ? r.result!
        : {
            success: false,
            error: r.error || '未知错误',
            filePath: filePaths[batchResult.results.indexOf(r)]
          }
    )
  }

  /**
   * 批量写入文件
   * @param operations 写入操作列表
   * @param config 配置选项
   */
  async batchWriteFiles(
    operations: Array<{ filePath: string; content: string }>,
    config: BatchOperationConfig = {}
  ): Promise<Array<{ success: boolean; error?: string; filePath: string }>> {
    const finalConfig = { ...this.defaultConfig, ...config }

    const writeOperations = operations.map((op) => async () => {
      const result = await this.writeFileStream(op.filePath, op.content, finalConfig)
      return {
        ...result,
        filePath: op.filePath
      }
    })

    const batchResult = await this.batchFileOperations(writeOperations, finalConfig)

    return batchResult.results.map((r, index) =>
      r.success
        ? {
            success: true,
            filePath: operations[index].filePath
          }
        : {
            success: false,
            error: r.error || '未知错误',
            filePath: operations[index].filePath
          }
    )
  }

  /**
   * 清理临时文件
   * @param filePaths 要清理的文件路径
   */
  async cleanupFiles(filePaths: string[]): Promise<{
    success: boolean
    cleanedCount: number
    errors: Array<{ path: string; error: string }>
  }> {
    const errors: Array<{ path: string; error: string }> = []
    let cleanedCount = 0

    await this.batchFileOperations(
      filePaths.map((filePath) => async () => {
        try {
          await fs.promises.unlink(filePath)
          cleanedCount++
          return true
        } catch (error) {
          errors.push({
            path: filePath,
            error: error instanceof Error ? error.message : String(error)
          })
          return false
        }
      }),
      {
        maxConcurrency: 5,
        onError: () => {
          // 清理文件失败
        }
      }
    )

    return {
      success: errors.length === 0,
      cleanedCount,
      errors
    }
  }
}

// 导出单例实例
export const fileStreamManager = new FileStreamManager()
