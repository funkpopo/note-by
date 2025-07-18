// 统一API配置类型定义
export type ApiConfigType = 'LLM' | 'Text Embedding'

// 统一API配置接口
export interface UnifiedApiConfig {
  id: string
  name: string
  type: ApiConfigType
  apiKey: string
  apiUrl: string
  modelName: string
  temperature?: string
  maxTokens?: string
}

// API配置颜色标识
export const API_TYPE_COLORS = {
  'LLM': {
    primary: '#0064fa',
    background: 'rgba(0, 100, 250, 0.1)',
    border: 'rgba(0, 100, 250, 0.2)'
  },
  'Text Embedding': {
    primary: '#00b42a',
    background: 'rgba(0, 180, 42, 0.1)', 
    border: 'rgba(0, 180, 42, 0.2)'
  }
} as const

// 配置验证函数
export const validateApiConfig = (config: Partial<UnifiedApiConfig>): string[] => {
  const errors: string[] = []
  
  if (!config.name?.trim()) {
    errors.push('配置名称不能为空')
  }
  
  if (!config.type) {
    errors.push('请选择配置类型')
  }
  
  if (!config.apiKey?.trim()) {
    errors.push('API密钥不能为空')
  }
  
  if (!config.apiUrl?.trim()) {
    errors.push('API地址不能为空')
  }
  
  if (!config.modelName?.trim()) {
    errors.push('模型名称不能为空')
  }
  
  return errors
} 