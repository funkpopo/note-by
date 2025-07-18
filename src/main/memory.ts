import { app } from 'electron'
import path from 'path'
import { connect, Table } from "@lancedb/lancedb"
import { is } from '@electron-toolkit/utils'

// Memory service configuration interface
export interface MemoryConfig {
  enabled: boolean
  selectedLlmId?: string,
  selectedEmbeddingId?: string,
  llm?: {
    provider: 'openai'
    apiKey: string
    model: string
    temperature?: number
    maxTokens?: number
    baseURL?: string
  }
}

// Memory result interfaces
export interface MemoryAddResult {
  success: boolean
  memoryId?: string
  error?: string
}

export interface MemorySearchResult {
  success: boolean
  memories?: Array<{
    id: string
    content: string
    metadata?: Record<string, any>
    score?: number
    created_at?: string
  }>
  error?: string
}

class MemoryService {
  private db: any = null
  private table: Table | null = null
  private config: MemoryConfig = {
    enabled: false,
    llm: { provider: 'openai', apiKey: '', model: 'gpt-4' }
  }
  private initialized = false

  private getStoragePath(): string {
    if (is.dev) {
      return path.join(process.cwd(), 'markdown', '.assets', 'lancedb')
    } else {
      return path.join(path.dirname(app.getPath('exe')), 'markdown', '.assets', 'lancedb')
    }
  }

  // 初始化 LanceDB
  async initialize(config: MemoryConfig): Promise<{ success: boolean; error?: string }> {
    try {
      this.config = { ...config }
      if (!config.enabled) {
        this.db = null
        this.table = null
        this.initialized = false
        return { success: true }
      }
      // LanceDB 初始化
      const dbPath = this.getStoragePath()
      this.db = await connect(dbPath)
      this.table = await this.db.openTable('memories')
      this.initialized = true
      return { success: true }
    } catch (error) {
      this.db = null
      this.table = null
      this.initialized = false
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // 添加记忆
  async addMemory(content: string, userId: string, metadata?: Record<string, any>): Promise<MemoryAddResult> {
    try {
      if (!this.isEnabled() || !this.table) return { success: false, error: 'Memory not enabled' }
      // const embedding = await this.generateEmbedding(content)
      const memory: Record<string, unknown> = {
        id: `${userId}_${Date.now()}`,
        content,
        // embedding,
        metadata,
        userId,
        created_at: new Date().toISOString()
      }
      await this.table.add([memory])
      return { success: true, memoryId: String(memory.id) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // 添加对话记忆
  async addConversation(messages: Array<{ role: 'user' | 'assistant'; content: string }>, userId: string, metadata?: Record<string, any>): Promise<MemoryAddResult> {
    const content = messages.map(m => m.content).join('\n')
    return this.addMemory(content, userId, metadata)
  }

  // 相似度检索
  async searchMemories(query: string, _userId: string, limit = 10): Promise<MemorySearchResult> {
    try {
      if (!this.isEnabled() || !this.table) return { success: false, error: 'Memory not enabled' }
      return { success: true, memories: [] }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // 获取所有记忆
  async getAllMemories(userId: string): Promise<MemorySearchResult> {
    try {
      if (!this.isEnabled() || !this.table) return { success: false, error: 'Memory not enabled' }
      const results: any[] = []
      for await (const batch of this.table.query().filter(`userId = '${userId}'`)) {
        for (const row of batch) {
          results.push(row)
        }
      }
      const memories = results.map((row: any) => ({
        id: row.id,
        content: row.content,
        metadata: row.metadata,
        created_at: row.created_at
      }))
      return { success: true, memories }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // 删除记忆
  async deleteMemory(memoryId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isEnabled() || !this.table) return { success: false, error: 'Memory not enabled' }
      await this.table.delete(`id = '${memoryId}'`)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // 更新记忆
  async updateMemory(memoryId: string, newContent: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isEnabled() || !this.table) return { success: false, error: 'Memory not enabled' }
      // const embedding = await this.generateEmbedding(newContent)
      // ... update embedding 相关逻辑如依赖 embedding 需同步调整 ...
      await this.table.update({ content: newContent }, { where: `id = '${memoryId}'` })
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  isEnabled(): boolean {
    return this.config.enabled && this.initialized && this.table !== null
  }

  getConfig(): MemoryConfig {
    return { ...this.config }
  }

  async updateConfig(newConfig: MemoryConfig): Promise<{ success: boolean; error?: string }> {
    return this.initialize(newConfig)
  }

  cleanup(): void {
    this.db = null
    this.table = null
    this.initialized = false
    this.config = {
      enabled: false,
      llm: { provider: 'openai', apiKey: '', model: 'gpt-4' }
    }
  }
}

export const memoryService = new MemoryService()
