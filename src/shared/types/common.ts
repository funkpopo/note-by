// Common shared types used across preload and renderer

export interface AiApiConfig {
  id: string
  name: string
  apiKey: string
  apiUrl: string
  modelName: string
  temperature?: string
  maxTokens?: string
  isThinkingModel?: boolean
}

export interface HistoryItem {
  id: number
  filePath: string
  content: string
  timestamp: number
}

