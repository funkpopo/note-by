import { app } from 'electron'
import path from 'path'
import { Memory } from 'mem0ai/oss'
import { is } from '@electron-toolkit/utils'

// Memory service configuration interface
export interface MemoryConfig {
  enabled: boolean
  selectedLlmId?: string // 选择的LLM配置ID
  llm?: {
    provider: 'openai'
    apiKey: string
    model: string
    temperature?: number
    maxTokens?: number
    baseURL?: string
  }
  embedder: {
    provider: 'openai'
    name?: string
    apiKey: string
    apiUrl?: string
    model: string
  }
  vectorStore?: {
    provider: 'chroma'
    path?: string
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
  private memoryClient: Memory | null = null
  private config: MemoryConfig = {
    enabled: false,
    llm: { provider: 'openai', apiKey: '', model: 'gpt-4' },
    embedder: { provider: 'openai', apiKey: '', model: 'text-embedding-3-small' }
  }
  private initialized = false

  // Get the storage path for memories
  private getStoragePath(): string {
    if (is.dev) {
      return path.join(process.cwd(), 'markdown', '.assets', 'memories')
    } else {
      return path.join(path.dirname(app.getPath('exe')), 'markdown', '.assets', 'memories')
    }
  }

  // Initialize memory service with configuration
  async initialize(config: MemoryConfig): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Initializing memory service with config:', {
        enabled: config.enabled,
        hasLlm: !!config.llm,
        hasEmbedder: !!config.embedder
      })

      this.config = { ...config }

      if (!config.enabled) {
        console.log('Memory service disabled, cleaning up')
        this.memoryClient = null
        this.initialized = false
        return { success: true }
      }

      // 验证LLM配置
      if (!config.llm?.apiKey) {
        return { success: false, error: 'LLM API key is required' }
      }

      if (!config.embedder?.apiKey) {
        return { success: false, error: 'Embedder API key is required' }
      }

      // Initialize Memory with local configuration
      const memoryConfig = {
        llm: {
          provider: 'openai', // 目前只支持OpenAI
          config: {
            apiKey: config.llm.apiKey,
            model: config.llm.model,
            temperature: config.llm.temperature || 0.1,
            maxTokens: config.llm.maxTokens || 2000,
            ...(config.llm.baseURL &&
              config.llm.baseURL !== 'https://api.openai.com/v1' && {
                baseURL: config.llm.baseURL
              })
          }
        },
        embedder: {
          provider: config.embedder.provider,
          config: {
            apiKey: config.embedder.apiKey,
            model: config.embedder.model,
            ...(config.embedder.apiUrl &&
              config.embedder.apiUrl !== 'https://api.openai.com/v1' && {
                baseURL: config.embedder.apiUrl
              })
          }
        },
        vectorStore: {
          provider: 'chroma',
          config: {
            collectionName: 'memories',
            path: this.getStoragePath(), // 使用 getStoragePath 获取路径
            allowReset: false
          }
        },
        version: 'v1.1'
      }

      console.log('Creating Memory client with config:', JSON.stringify(memoryConfig, null, 2))

      this.memoryClient = new Memory(memoryConfig)
      this.initialized = true

      console.log('Memory service initialized successfully')
      return { success: true }
    } catch (error) {
      console.error('Failed to initialize memory service:', error)
      this.memoryClient = null
      this.initialized = false
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Add content to memory
  async addMemory(
    content: string,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<MemoryAddResult> {
    try {
      if (!this.isEnabled()) {
        return { success: false, error: 'Memory service is not enabled' }
      }

      if (!this.memoryClient) {
        return { success: false, error: 'Memory service is not initialized' }
      }

      // For Memory OSS, we format the content as messages
      const messages = [{ role: 'user' as const, content: content }]

      const result = await this.memoryClient.add(messages, {
        userId: userId,
        ...(metadata && { metadata })
      })

      return {
        success: true,
        memoryId: (result as any)?.id || 'unknown'
      }
    } catch (error) {
      console.error('Failed to add memory:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Add conversation messages to memory
  async addConversation(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<MemoryAddResult> {
    try {
      if (!this.isEnabled()) {
        return { success: false, error: 'Memory service is not enabled' }
      }

      if (!this.memoryClient) {
        return { success: false, error: 'Memory service is not initialized' }
      }

      const result = await this.memoryClient.add(messages, {
        userId: userId,
        ...(metadata && { metadata })
      })

      return {
        success: true,
        memoryId: (result as any)?.id || 'unknown'
      }
    } catch (error) {
      console.error('Failed to add conversation:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Search memories
  async searchMemories(query: string, userId: string, limit = 10): Promise<MemorySearchResult> {
    try {
      if (!this.isEnabled()) {
        return { success: false, error: 'Memory service is not enabled' }
      }

      if (!this.memoryClient) {
        return { success: false, error: 'Memory service is not initialized' }
      }

      const results = await this.memoryClient.search(query, {
        userId: userId,
        limit
      })

      // Handle different result formats from mem0 OSS
      const resultArray = Array.isArray(results) ? results : (results as any)?.results || []
      const memories = resultArray.map((result: any) => ({
        id: result.id,
        content: result.memory || result.text || result.content,
        metadata: result.metadata,
        score: result.score,
        created_at: result.created_at
      }))

      return {
        success: true,
        memories
      }
    } catch (error) {
      console.error('Failed to search memories:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Get all memories for a user
  async getAllMemories(userId: string): Promise<MemorySearchResult> {
    try {
      if (!this.isEnabled()) {
        return { success: false, error: 'Memory service is not enabled' }
      }

      if (!this.memoryClient) {
        return { success: false, error: 'Memory service is not initialized' }
      }

      const results = await this.memoryClient.getAll({
        userId: userId
      })

      // Handle different result formats from mem0 OSS
      const resultArray = Array.isArray(results) ? results : (results as any)?.results || []
      const memories = resultArray.map((result: any) => ({
        id: result.id,
        content: result.memory || result.text || result.content,
        metadata: result.metadata,
        created_at: result.created_at
      }))

      return {
        success: true,
        memories
      }
    } catch (error) {
      console.error('Failed to get all memories:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Delete a memory
  async deleteMemory(memoryId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isEnabled()) {
        return { success: false, error: 'Memory service is not enabled' }
      }

      if (!this.memoryClient) {
        return { success: false, error: 'Memory service is not initialized' }
      }

      await this.memoryClient.delete(memoryId)
      return { success: true }
    } catch (error) {
      console.error('Failed to delete memory:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Update a memory
  async updateMemory(
    memoryId: string,
    newContent: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isEnabled()) {
        return { success: false, error: 'Memory service is not enabled' }
      }

      if (!this.memoryClient) {
        return { success: false, error: 'Memory service is not initialized' }
      }

      await this.memoryClient.update(memoryId, newContent)
      return { success: true }
    } catch (error) {
      console.error('Failed to update memory:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Check if memory service is enabled and initialized
  isEnabled(): boolean {
    return this.config.enabled && this.initialized && this.memoryClient !== null
  }

  // Get current configuration
  getConfig(): MemoryConfig {
    return { ...this.config }
  }

  // Update configuration
  async updateConfig(newConfig: MemoryConfig): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Updating memory config:', {
        enabled: newConfig.enabled,
        hasLlmKey: !!newConfig.llm?.apiKey,
        hasEmbedderKey: !!newConfig.embedder?.apiKey
      })

      // 如果记忆功能被禁用，清理资源
      if (!newConfig.enabled) {
        console.log('Memory disabled, cleaning up resources')
        this.cleanup()
        return { success: true }
      }

      // 重新初始化服务
      const result = await this.initialize(newConfig)
      console.log('Memory config update result:', result)
      return result
    } catch (error) {
      console.error('Failed to update memory config:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Clean up resources
  cleanup(): void {
    this.memoryClient = null
    this.initialized = false
    this.config = {
      enabled: false,
      llm: { provider: 'openai', apiKey: '', model: 'gpt-4' },
      embedder: { provider: 'openai', apiKey: '', model: 'text-embedding-3-small' }
    }
  }
}

// Export singleton instance
export const memoryService = new MemoryService()
