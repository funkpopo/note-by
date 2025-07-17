import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { MemoryClient } from 'mem0ai'
import { is } from '@electron-toolkit/utils'

// Memory service configuration interface
export interface MemoryConfig {
  enabled: boolean
  apiKey?: string
  storagePath?: string
  model?: string
  temperature?: number
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
  private memoryClient: MemoryClient | null = null
  private config: MemoryConfig = { enabled: false }
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
      this.config = { ...config }
      
      if (!config.enabled) {
        this.memoryClient = null
        this.initialized = false
        return { success: true }
      }

      if (!config.apiKey) {
        return { success: false, error: 'Mem0 API key is required' }
      }

      // Ensure storage directory exists (for local file management)
      const storagePath = config.storagePath || this.getStoragePath()
      if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true })
      }

      // Initialize MemoryClient with API key
      this.memoryClient = new MemoryClient({ apiKey: config.apiKey })
      this.initialized = true
      
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

      // For MemoryClient, we need to format the content as messages
      const messages = [
        { role: 'user' as const, content: content }
      ]

      const result = await this.memoryClient.add(messages, {
        user_id: userId,
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
        user_id: userId,
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
  async searchMemories(
    query: string, 
    userId: string, 
    limit = 10
  ): Promise<MemorySearchResult> {
    try {
      if (!this.isEnabled()) {
        return { success: false, error: 'Memory service is not enabled' }
      }

      if (!this.memoryClient) {
        return { success: false, error: 'Memory service is not initialized' }
      }

      const results = await this.memoryClient.search(query, {
        user_id: userId,
        limit
      })

      const memories = results.map((result: any) => ({
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
        user_id: userId
      })

      const memories = results.map((result: any) => ({
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
    return await this.initialize(newConfig)
  }

  // Clean up resources
  cleanup(): void {
    this.memoryClient = null
    this.initialized = false
    this.config = { enabled: false }
  }
}

// Export singleton instance
export const memoryService = new MemoryService() 