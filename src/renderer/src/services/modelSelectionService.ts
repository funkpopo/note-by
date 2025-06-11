/**
 * 统一的AI模型选择服务
 * 负责管理全局AI模型选择状态，统一使用settings.json进行持久化存储
 */

// AI API配置接口
interface AiApiConfig {
  id: string
  name: string
  apiKey: string
  apiUrl: string
  modelName: string
  temperature?: string
  maxTokens?: string
}

// 模型选择服务类
class ModelSelectionService {
  private static instance: ModelSelectionService
  private listeners: Array<(modelId: string) => void> = []

  private constructor() {}

  // 获取单例实例
  static getInstance(): ModelSelectionService {
    if (!ModelSelectionService.instance) {
      ModelSelectionService.instance = new ModelSelectionService()
    }
    return ModelSelectionService.instance
  }

  // 获取当前选中的模型ID
  async getSelectedModelId(): Promise<string> {
    try {
      const selectedModelId = await window.api.settings.get('selectedModelId')
      return selectedModelId as string || ''
    } catch (error) {
      console.error('获取选中模型ID失败:', error)
      return ''
    }
  }

  // 设置选中的模型ID
  async setSelectedModelId(modelId: string): Promise<void> {
    try {
      await window.api.settings.set('selectedModelId', modelId)
      // 通知所有监听器
      this.listeners.forEach(listener => listener(modelId))
    } catch (error) {
      console.error('设置选中模型ID失败:', error)
      throw error
    }
  }

  // 获取所有可用的AI模型配置
  async getAvailableModels(): Promise<AiApiConfig[]> {
    try {
      const settings = await window.api.settings.getAll()
      return (settings.AiApiConfigs as AiApiConfig[]) || []
    } catch (error) {
      console.error('获取可用模型失败:', error)
      return []
    }
  }

  // 获取当前选中模型的详细配置
  async getSelectedModelConfig(): Promise<AiApiConfig | null> {
    try {
      const selectedModelId = await this.getSelectedModelId()
      if (!selectedModelId) return null

      const availableModels = await this.getAvailableModels()
      return availableModels.find(model => model.id === selectedModelId) || null
    } catch (error) {
      console.error('获取选中模型配置失败:', error)
      return null
    }
  }

  // 初始化默认模型选择（如果没有选中任何模型）
  async initializeDefaultModel(): Promise<void> {
    try {
      const selectedModelId = await this.getSelectedModelId()
      if (selectedModelId) return // 已有选中模型

      const availableModels = await this.getAvailableModels()
      if (availableModels.length > 0) {
        await this.setSelectedModelId(availableModels[0].id)
      }
    } catch (error) {
      console.error('初始化默认模型失败:', error)
    }
  }

  // 添加模型选择变化监听器
  addListener(listener: (modelId: string) => void): void {
    this.listeners.push(listener)
  }

  // 移除模型选择变化监听器
  removeListener(listener: (modelId: string) => void): void {
    const index = this.listeners.indexOf(listener)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  // 验证模型ID是否有效
  async isValidModelId(modelId: string): Promise<boolean> {
    try {
      const availableModels = await this.getAvailableModels()
      return availableModels.some(model => model.id === modelId)
    } catch (error) {
      console.error('验证模型ID失败:', error)
      return false
    }
  }

  // 清理无效的模型选择
  async cleanupInvalidSelection(): Promise<void> {
    try {
      const selectedModelId = await this.getSelectedModelId()
      if (!selectedModelId) return

      const isValid = await this.isValidModelId(selectedModelId)
      if (!isValid) {
        // 清除无效的选择并初始化默认模型
        await this.setSelectedModelId('')
        await this.initializeDefaultModel()
      }
    } catch (error) {
      console.error('清理无效模型选择失败:', error)
    }
  }
}

// 导出单例实例
export const modelSelectionService = ModelSelectionService.getInstance()

// 导出类型
export type { AiApiConfig }
