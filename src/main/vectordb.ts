import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { is } from '@electron-toolkit/utils'
import { resolve } from 'path'
import fsPromises from 'fs/promises'
import { connect, Connection, Table } from '@lancedb/lancedb'
import { getEnabledEmbeddingApiConfig, readSettings, AiApiConfig } from './settings'

// 向量化文档接口
export interface VectorDocument {
  id: string
  filePath: string
  fileName: string
  content: string
  summary: string
  embedding: number[]
  fileSize: number
  modifiedTime: number
  createdTime: number
  tags?: string[]
  folder?: string
}

// 搜索结果接口
export interface SearchResult {
  document: VectorDocument
  score: number
  snippet: string
}

// 向量搜索选项
export interface SearchOptions {
  limit?: number
  threshold?: number
  filter?: string
}

/**
 * LanceDB 向量数据库管理器
 */
class VectorDatabaseManager {
  private connection: Connection | null = null
  private table: Table | null = null
  private dbPath: string = ''
  private isInitialized: boolean = false
  private readonly tableName = 'documents'

  async initialize(): Promise<boolean> {
    if (this.isInitialized && this.connection && this.table) {
      return true
    }

    try {
      // 获取数据库路径
      this.dbPath = this.getVectorDBPath()
      
      // 确保目录存在
      const dbDir = path.dirname(this.dbPath)
      if (!fs.existsSync(dbDir)) {
        await fsPromises.mkdir(dbDir, { recursive: true })
      }

      // 连接到LanceDB
      this.connection = await connect(this.dbPath)

      // 检查表是否存在，如果不存在则创建
      const tableNames = await this.connection.tableNames()
      if (!tableNames.includes(this.tableName)) {
        // 获取embedding配置以确定向量维度
        const embeddingConfig = getEnabledEmbeddingApiConfig()
        const dimensions = embeddingConfig?.dimensions || 1536 // 默认使用1536维（OpenAI默认）
        
        // 创建表的schema，先插入一个示例记录
        const schema = [
          {
            id: 'example',
            filePath: '/example/path.md',
            fileName: 'example.md',
            content: 'Example content for schema definition',
            summary: 'Example summary',
            embedding: new Array(dimensions).fill(0), // 使用配置的向量维度
            fileSize: 1024,
            modifiedTime: Date.now(),
            createdTime: Date.now(),
            tags: ['example'],
            folder: 'example'
          }
        ]
        
        this.table = await this.connection.createTable(this.tableName, schema)
        
        // 删除示例记录
        await this.table.delete('id = "example"')
      } else {
        this.table = await this.connection.openTable(this.tableName)
      }

      this.isInitialized = true
      console.log('Vector database initialized successfully')
      return true

    } catch (error) {
      console.error('Failed to initialize vector database:', error)
      return false
    }
  }

  private getVectorDBPath(): string {
    let markdownPath
    if (is.dev) {
      markdownPath = resolve(app.getAppPath(), 'markdown')
    } else {
      markdownPath = resolve(app.getPath('exe'), '..', 'markdown')
    }
    return path.join(markdownPath, '.assets', 'vector_db')
  }

  private getMarkdownPath(): string {
    if (is.dev) {
      return resolve(app.getAppPath(), 'markdown')
    } else {
      return resolve(app.getPath('exe'), '..', 'markdown')
    }
  }

  /**
   * 向量化文档内容
   */
  async embedDocument(content: string): Promise<number[]> {
    try {
      // 获取启用的embedding配置
      const embeddingConfig = getEnabledEmbeddingApiConfig()
      
      if (!embeddingConfig) {
        throw new Error('No embedding API configuration enabled. Please configure an embedding model in settings.')
      }

      if (!embeddingConfig.apiKey) {
        throw new Error('Embedding API key not configured')
      }

      const response = await fetch(`${embeddingConfig.apiUrl}/v1/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${embeddingConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: content,
          model: embeddingConfig.modelName
        })
      })

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data[0].embedding

    } catch (error) {
      console.error('Failed to embed document:', error)
      throw error
    }
  }

  /**
   * 生成文档摘要
   */
  async generateSummary(content: string): Promise<string> {
    try {
      // 如果内容较短，直接返回前200个字符作为摘要
      if (content.length <= 300) {
        return content.slice(0, 200) + (content.length > 200 ? '...' : '')
      }

      // 对于较长的内容，尝试使用LLM生成摘要
      const settings = readSettings()
      const aiConfigs = (settings.AiApiConfigs as AiApiConfig[]) || []
      
      // 查找可用的AI配置
      const availableConfig = aiConfigs.find(config => config.apiKey && config.apiUrl && config.modelName)
      
      if (!availableConfig) {
        // 如果没有可用的AI配置，使用简单的截断方法
        return content.slice(0, 200) + '...'
      }

      const response = await fetch(`${availableConfig.apiUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${availableConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: availableConfig.modelName,
          messages: [
            {
              role: 'system',
              content: '你是一个文档摘要助手，请为给定的文档内容生成简洁的摘要，不超过150个字符。'
            },
            {
              role: 'user',
              content: `请为以下内容生成摘要：\n\n${content.slice(0, 2000)}` // 限制输入长度
            }
          ],
          max_tokens: parseInt(availableConfig.maxTokens || '100'),
          temperature: parseFloat(availableConfig.temperature || '0.3')
        })
      })

      if (!response.ok) {
        // API调用失败，使用简单截断
        return content.slice(0, 200) + '...'
      }

      const data = await response.json()
      return data.choices[0].message.content || content.slice(0, 200) + '...'

    } catch (error) {
      console.error('Failed to generate summary:', error)
      // 出错时使用简单截断方法
      return content.slice(0, 200) + (content.length > 200 ? '...' : '')
    }
  }

  /**
   * 添加或更新文档到向量数据库
   */
  async addDocument(filePath: string, content: string): Promise<boolean> {
    if (!this.table) {
      const initialized = await this.initialize()
      if (!initialized) {
        return false
      }
    }

    try {
      // 将相对路径转换为绝对路径
      let absoluteFilePath = filePath
      if (!path.isAbsolute(filePath)) {
        absoluteFilePath = path.join(this.getMarkdownPath(), filePath)
      }

      // Check if file exists first
      if (!fs.existsSync(absoluteFilePath)) {
        console.warn(`File does not exist, skipping vector indexing: ${absoluteFilePath}`)
        return false
      }

      const fileName = path.basename(absoluteFilePath)
      const folder = path.dirname(absoluteFilePath).split(path.sep).pop() || ''
      const stats = await fsPromises.stat(absoluteFilePath)
      
      // 提取标签
      const tags = this.extractTags(content)
      
      // 生成摘要和向量
      const summary = await this.generateSummary(content)
      const embedding = await this.embedDocument(content)

      const document: VectorDocument = {
        id: filePath, // 使用原始路径作为唯一ID
        filePath: filePath, // 保存原始路径
        fileName,
        content,
        summary,
        embedding,
        fileSize: stats.size,
        modifiedTime: stats.mtime.getTime(),
        createdTime: stats.ctime.getTime(),
        tags,
        folder
      }

      // 检查文档是否已存在
      try {
        const count = await this.table!.countRows(`id = '${filePath}'`)
        if (count > 0) {
          // 更新现有文档 - 先删除再插入
          await this.table!.delete(`id = '${filePath}'`)
        }
      } catch (error) {
        // 查询失败，可能是首次插入，继续执行
      }

      // 插入文档
      await this.table!.add([document as unknown as Record<string, unknown>])
      
      console.log(`Document added to vector database: ${fileName}`)
      return true

    } catch (error) {
      console.error('Failed to add document to vector database:', error)
      return false
    }
  }

  /**
   * 从内容中提取标签
   */
  private extractTags(content: string): string[] {
    const tags: string[] = []

    // 1. HTML注释中的标签 (<!-- tags: tag1,tag2,tag3 -->)
    const tagsMatch = content.match(/<!-- tags: ([^>]*) -->/)
    if (tagsMatch && tagsMatch[1]) {
      const commentTags = tagsMatch[1]
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
      tags.push(...commentTags)
    }

    // 2. @标签 (排除邮件地址)
    const atTagsMatches = content.matchAll(
      /(?<![a-zA-Z0-9_\u4e00-\u9fa5])@([a-zA-Z0-9_\u4e00-\u9fa5]+)(?!\.[a-zA-Z0-9_\u4e00-\u9fa5]+)/g
    )
    for (const match of atTagsMatches) {
      if (match[1] && !tags.includes(match[1])) {
        tags.push(match[1])
      }
    }

    return tags
  }

  /**
   * 搜索相似文档
   */
  async searchDocuments(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.table) {
      const initialized = await this.initialize()
      if (!initialized) {
        return []
      }
    }

    try {
      const { limit = 5, threshold = 0.7 } = options

      // 对查询进行向量化
      const queryEmbedding = await this.embedDocument(query)

      // 执行向量搜索
      let searchQuery = this.table!.search(queryEmbedding).limit(limit)

      // 如果有过滤条件，应用过滤
      if (options.filter) {
        searchQuery = searchQuery.where(options.filter)
      }

      const results = await searchQuery.toArray()

      // 转换结果格式并生成snippet
      const searchResults: SearchResult[] = results
        .filter((result: any) => result._distance <= (1 - threshold)) // LanceDB使用距离，需要转换为相似度
        .map((result: any) => {
          const document = result as VectorDocument
          const score = 1 - result._distance // 转换为相似度分数
          const snippet = this.generateSnippet(document.content, query)

          return {
            document,
            score,
            snippet
          }
        })

      return searchResults

    } catch (error) {
      console.error('Failed to search documents:', error)
      return []
    }
  }

  /**
   * 生成搜索结果片段
   */
  private generateSnippet(content: string, query: string): string {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    const contentLower = content.toLowerCase()
    
    // 寻找包含查询词的位置
    let bestPosition = 0
    let maxMatches = 0
    
    for (let i = 0; i < content.length - 200; i += 50) {
      const snippet = contentLower.slice(i, i + 200)
      const matches = words.filter(word => snippet.includes(word)).length
      if (matches > maxMatches) {
        maxMatches = matches
        bestPosition = i
      }
    }

    const snippet = content.slice(bestPosition, bestPosition + 200)
    return snippet + (content.length > bestPosition + 200 ? '...' : '')
  }

  /**
   * 删除文档
   */
  async deleteDocument(filePath: string): Promise<boolean> {
    if (!this.table) {
      const initialized = await this.initialize()
      if (!initialized) {
        return false
      }
    }

    try {
      await this.table!.delete(`id = '${filePath}'`)
      console.log(`Document deleted from vector database: ${filePath}`)
      return true
    } catch (error) {
      console.error('Failed to delete document from vector database:', error)
      return false
    }
  }

  /**
   * 获取数据库统计信息
   */
  async getStats(): Promise<{
    totalDocuments: number
    dbSize: number
    lastUpdated: number
  }> {
    if (!this.table) {
      return { totalDocuments: 0, dbSize: 0, lastUpdated: 0 }
    }

    try {
      const totalDocuments = await this.table.countRows()
      const dbStats = await fsPromises.stat(this.dbPath).catch(() => ({ size: 0, mtime: new Date(0) }))
      
      return {
        totalDocuments,
        dbSize: dbStats.size,
        lastUpdated: dbStats.mtime.getTime()
      }
    } catch (error) {
      console.error('Failed to get vector database stats:', error)
      return { totalDocuments: 0, dbSize: 0, lastUpdated: 0 }
    }
  }

  /**
   * 清空向量数据库
   */
  async clearDatabase(): Promise<boolean> {
    if (!this.table) {
      const initialized = await this.initialize()
      if (!initialized) {
        return false
      }
    }

    try {
      // 删除所有记录
      await this.table!.delete('id IS NOT NULL')
      console.log('Vector database cleared successfully')
      return true
    } catch (error) {
      console.error('Failed to clear vector database:', error)
      return false
    }
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    try {
      if (this.connection) {
        // LanceDB连接会自动管理，通常不需要显式关闭
        this.connection = null
        this.table = null
        this.isInitialized = false
      }
    } catch (error) {
      console.error('Failed to close vector database:', error)
    }
  }
}

// 全局向量数据库实例
const vectorDB = new VectorDatabaseManager()

// 导出函数
export async function initVectorDatabase(): Promise<boolean> {
  return await vectorDB.initialize()
}

export async function addDocumentToVector(filePath: string, content: string): Promise<boolean> {
  return await vectorDB.addDocument(filePath, content)
}

export async function searchSimilarDocuments(
  query: string, 
  options?: SearchOptions
): Promise<SearchResult[]> {
  return await vectorDB.searchDocuments(query, options)
}

export async function deleteDocumentFromVector(filePath: string): Promise<boolean> {
  return await vectorDB.deleteDocument(filePath)
}

export async function getVectorDatabaseStats(): Promise<{
  totalDocuments: number
  dbSize: number
  lastUpdated: number
}> {
  return await vectorDB.getStats()
}

export async function clearVectorDatabase(): Promise<boolean> {
  return await vectorDB.clearDatabase()
}

export async function closeVectorDatabase(): Promise<void> {
  return await vectorDB.close()
}