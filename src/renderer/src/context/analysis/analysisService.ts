import { create } from 'zustand'
import { filterThinkingContent } from '../../utils/filterThinking'

// 数据指纹计算函数
const calculateDataFingerprint = (statsData: any, activityData: any): DataFingerprint => {
  // 计算内容哈希
  const contentString = JSON.stringify({
    notesByDate: statsData.notesByDate || [],
    editsByDate: statsData.editsByDate || [],
    editTimeDistribution: statsData.editTimeDistribution || [],
    mostEditedNotes: statsData.mostEditedNotes || [],
    dailyActivity: activityData?.dailyActivity || {}
  })

  // 简单哈希函数
  const simpleHash = (str: string): string => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // 转换为32位整数
    }
    return hash.toString(36)
  }

  // 计算笔记数量哈希
  const notesCountString = `${statsData.totalNotes}-${statsData.totalEdits}`

  // 获取最新编辑时间戳
  const lastEditTimestamp = Math.max(
    ...(statsData.editsByDate || []).map((item: any) => new Date(item.date).getTime()),
    0
  )

  return {
    totalNotes: statsData.totalNotes || 0,
    totalEdits: statsData.totalEdits || 0,
    lastEditTimestamp,
    contentHash: simpleHash(contentString),
    notesCountHash: simpleHash(notesCountString)
  }
}

// 分析状态接口
export interface AnalysisResult {
  summary: string
  writingHabits: {
    title: string
    content: string
  }
  writingRhythm: {
    title: string
    content: string
  }
  topics: {
    title: string
    content: string
  }
  writingBehavior: {
    title: string
    content: string
  }
  recommendations: {
    title: string
    items: string[]
  }
  efficiencyTips: {
    title: string
    items: string[]
  }
  suggestedGoals: {
    title: string
    items: string[]
  }
  // 标签分析相关字段
  tagAnalysis?: {
    title: string
    content: string
  }
  tagRelationships?: {
    title: string
    content: string
  }
}

// 数据指纹接口
export interface DataFingerprint {
  totalNotes: number
  totalEdits: number
  lastEditTimestamp: number
  contentHash: string
  notesCountHash: string
}

// 错误类型枚举
export enum AnalysisErrorType {
  NETWORK_ERROR = 'network_error',
  DATA_ERROR = 'data_error',
  API_ERROR = 'api_error',
  CACHE_ERROR = 'cache_error',
  UNKNOWN_ERROR = 'unknown_error'
}

// 错误状态接口
export interface AnalysisError {
  type: AnalysisErrorType
  message: string
  retryable: boolean
  timestamp: number
}

// 分析状态接口
export interface AnalysisState {
  isAnalyzing: boolean
  analysisCached: boolean
  analysisResult: AnalysisResult | null
  progress: number
  error: AnalysisError | null
  selectedModelId: string | null
  retryCount: number
  maxRetries: number

  // 行为方法
  startAnalysis: (modelId: string, forceUpdate?: boolean) => Promise<void>
  stopAnalysis: () => void
  setAnalysisResult: (result: AnalysisResult) => void
  setSelectedModelId: (modelId: string) => void
  retryAnalysis: () => Promise<void>
  clearError: () => void
  resetCacheStatus: () => void
}

// 创建分析状态存储
export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  isAnalyzing: false,
  analysisCached: false,
  analysisResult: null,
  progress: 0,
  error: null,
  selectedModelId: null,
  retryCount: 0,
  maxRetries: 3,

  // 设置选中的模型ID
  setSelectedModelId: (modelId: string) => {
    set({ selectedModelId: modelId })
    window.localStorage.setItem('selectedModelId', modelId)
  },

  // 设置分析结果
  setAnalysisResult: (result: AnalysisResult) => {
    set({
      analysisResult: result,
      isAnalyzing: false,
      analysisCached: true
    })
  },

  // 停止分析
  stopAnalysis: () => {
    if (!get().isAnalyzing) return

    // 这里可以添加取消请求的逻辑，如果API支持的话
    set({ isAnalyzing: false, progress: 0 })
  },

  // 开始分析
  startAnalysis: async (modelId: string, forceUpdate: boolean = false) => {
    // 如果已经在分析中，就不再启动新的分析
    if (get().isAnalyzing) return

    try {
      set({
        isAnalyzing: true,
        error: null,
        progress: 0,
        selectedModelId: modelId,
        retryCount: 0, // 重置重试计数
        analysisCached: false // 重置缓存状态，确保新分析不显示缓存标识
      })

      // 获取基础统计数据
      set({ progress: 30 })
      let statsResult
      try {
        statsResult = await window.api.analytics.getNoteHistoryStats()
      } catch (error) {
        throw {
          type: AnalysisErrorType.DATA_ERROR,
          message: `获取统计数据失败: ${error instanceof Error ? error.message : String(error)}`,
          retryable: true,
          timestamp: Date.now()
        }
      }

      // 检查统计数据是否有效
      if (!statsResult.success || !statsResult.stats) {
        throw {
          type: AnalysisErrorType.DATA_ERROR,
          message: '暂无笔记数据，请先创建和编辑一些笔记后再进行分析',
          retryable: false,
          timestamp: Date.now()
        }
      }

      const statsData = statsResult.stats

      // 获取用户活动数据
      set({ progress: 40 })
      let activityResult
      try {
        activityResult = await window.api.analytics.getUserActivityData(30)
      } catch (error) {
        console.warn('获取活动数据失败:', error)
        // 活动数据失败不阻止分析继续进行
        activityResult = { success: false, activityData: null }
      }
      const activityData = activityResult.success ? activityResult.activityData : null

      // 智能缓存检查（如果不是强制更新）
      if (!forceUpdate) {
        set({ progress: 50 })
        let cacheResult
        try {
          cacheResult = await window.api.analytics.getAnalysisCache()
        } catch (error) {
          console.warn('缓存检查失败:', error)
          // 缓存失败不阻止分析继续进行
          cacheResult = { success: false, cache: null }
        }

        if (cacheResult.success && cacheResult.cache) {
          try {
            // 计算当前数据指纹
            const currentFingerprint = calculateDataFingerprint(statsData, activityData)

            // 比较数据指纹而不是日期
            if (cacheResult.cache.dataFingerprint) {
              const cachedFingerprint = cacheResult.cache.dataFingerprint
              const isFingerprintMatch =
                cachedFingerprint.totalNotes === currentFingerprint.totalNotes &&
                cachedFingerprint.totalEdits === currentFingerprint.totalEdits &&
                cachedFingerprint.lastEditTimestamp === currentFingerprint.lastEditTimestamp &&
                cachedFingerprint.contentHash === currentFingerprint.contentHash &&
                cachedFingerprint.notesCountHash === currentFingerprint.notesCountHash

              if (isFingerprintMatch && cacheResult.cache.modelId === modelId) {
                set({
                  analysisResult: cacheResult.cache.result,
                  isAnalyzing: false,
                  analysisCached: true,
                  progress: 100
                })
                return
              }
            } else {
              // 兼容旧缓存格式，使用日期检查
              const today = new Date().toISOString().split('T')[0]
              if (cacheResult.cache.date === today && cacheResult.cache.modelId === modelId) {
                set({
                  analysisResult: cacheResult.cache.result,
                  isAnalyzing: false,
                  analysisCached: true,
                  progress: 100
                })
                return
              }
            }
          } catch (error) {
            // 缓存处理失败，继续新的分析
          }
        }
      }

      // 检查活动数据是否有效
      if (!activityData) {
        // 可以继续进行分析，只是活动数据为空
      }

      // 获取AI模型配置
      set({ progress: 60 })
      let settings
      try {
        settings = await window.api.settings.getAll()
      } catch (error) {
        throw {
          type: AnalysisErrorType.DATA_ERROR,
          message: `获取设置失败: ${error instanceof Error ? error.message : String(error)}`,
          retryable: true,
          timestamp: Date.now()
        }
      }

      const aiApiConfigs =
        (settings.AiApiConfigs as Array<{
          id: string
          name: string
          apiKey: string
          apiUrl: string
          modelName: string
          temperature?: string
          maxTokens?: string
        }>) || []

      if (aiApiConfigs.length === 0) {
        throw {
          type: AnalysisErrorType.DATA_ERROR,
          message: '未配置AI模型，请先在设置中配置AI模型后再进行分析',
          retryable: false,
          timestamp: Date.now()
        }
      }

      // 使用选中的模型，如果没有选中，则使用第一个
      let aiApiConfig = aiApiConfigs[0]
      const selectedConfig = aiApiConfigs.find((config) => config.id === modelId)
      if (selectedConfig) {
        aiApiConfig = selectedConfig
      }

      // 准备分析数据，添加安全的数据访问
      const analysisData = {
        totalNotes: statsData.totalNotes || 0,
        totalEdits: statsData.totalEdits || 0,
        averageEditLength: statsData.averageEditLength || 0,
        mostEditedNotes:
          (statsData.mostEditedNotes || [])
            .map((note) => note.filePath.split('/').pop())
            .join(', ') || '暂无数据',
        notesByDate:
          Object.entries(
            (statsData.notesByDate || []).reduce((acc: Record<string, number>, item) => {
              acc[item.date] = item.count
              return acc
            }, {})
          )
            .map(([date, count]) => `${date}:${count}`)
            .join(', ') || '暂无数据',
        editsByDate:
          Object.entries(
            (statsData.editsByDate || []).reduce((acc: Record<string, number>, item) => {
              acc[item.date] = item.count
              return acc
            }, {})
          )
            .map(([date, count]) => `${date}:${count}`)
            .join(', ') || '暂无数据',
        editTimeDistribution:
          (statsData.editTimeDistribution || [])
            .map((item) => `${item.hour}点:${item.count}次`)
            .join(', ') || '暂无数据',
        tagUsage: '暂无标签数据', // 当前API不包含标签数据
        tagRelations: '暂无标签关联数据' // 当前API不包含标签关联数据
      }

      // 获取分析提示词模板
      let prompt = ''
      if (
        settings.aiPrompts &&
        typeof settings.aiPrompts === 'object' &&
        'writingAnalysis' in settings.aiPrompts
      ) {
        prompt = settings.aiPrompts.writingAnalysis as string
      } else {
        // 默认提示词
        prompt = `我有以下笔记应用使用数据，请分析我的写作习惯并给出改进建议：
                  - 总笔记数量: \${totalNotes}
                  - 总编辑次数: \${totalEdits}
                  - 平均编辑长度: \${averageEditLength} 字符
                  - 最常编辑的前3个笔记: \${mostEditedNotes}
                  - 每日笔记数量趋势: \${notesByDate}
                  - 每日编辑次数趋势: \${editsByDate}
                  - 编辑时间分布: \${editTimeDistribution}
                  - 标签使用情况: \${tagUsage}
                  - 标签关联关系: \${tagRelations}

                  请提供以下详细分析：
                  1. 写作习惯概述：分析我的整体写作模式、频率和时间分布
                  2. 写作节奏和时间管理：识别我的高效写作时段、写作连贯性和持续时间
                  3. 主题和内容偏好：基于编辑模式推断我最关注的内容领域
                  4. 写作行为分析：分析我的修改习惯、编辑深度和完善程度
                  5. 标签使用分析：分析我如何使用标签组织和关联内容
                  6. 标签关联网络：分析标签之间的关联关系和知识网络结构
                  7. 个性化改进建议：提供3-5条具体可行的改进建议，包括时间安排、内容组织和写作技巧
                  8. 效率提升策略：如何更有效地利用笔记应用功能提高写作效率
                  9. 建议的写作目标：根据当前习惯，提出合理的短期写作目标

                  请以JSON格式返回结果，格式如下：
                  {
                    "summary": "整体分析摘要",
                    "writingHabits": {
                      "title": "写作习惯概述",
                      "content": "详细分析内容"
                    },
                    "writingRhythm": {
                      "title": "写作节奏和时间管理",
                      "content": "详细分析内容"
                    },
                    "topics": {
                      "title": "主题和内容偏好",
                      "content": "详细分析内容"
                    },
                    "writingBehavior": {
                      "title": "写作行为分析",
                      "content": "详细分析内容"
                    },
                    "tagAnalysis": {
                      "title": "标签使用分析",
                      "content": "详细分析内容"
                    },
                    "tagRelationships": {
                      "title": "标签关联网络",
                      "content": "详细分析内容"
                    },
                    "recommendations": {
                      "title": "个性化改进建议",
                      "items": ["建议1", "建议2", "建议3", "建议4", "建议5"]
                    },
                    "efficiencyTips": {
                      "title": "效率提升策略",
                      "items": ["策略1", "策略2", "策略3"]
                    },
                    "suggestedGoals": {
                      "title": "建议的写作目标",
                      "items": ["目标1", "目标2", "目标3"]
                    }
                  }`
      }

      // 填充提示词模板
      for (const [key, value] of Object.entries(analysisData)) {
        prompt = prompt.replace(`\${${key}}`, String(value))
      }

      // 调用AI进行分析
      set({ progress: 80 })
      let result: AnalysisResult | null = null
      let aiResponse
      try {
        aiResponse = await window.api.openai.generateContent({
          apiKey: aiApiConfig.apiKey,
          apiUrl: aiApiConfig.apiUrl,
          modelName: aiApiConfig.modelName,
          prompt: prompt,
          maxTokens: parseInt(aiApiConfig.maxTokens || '4000')
        })
      } catch (error) {
        throw {
          type: AnalysisErrorType.NETWORK_ERROR,
          message: `AI API调用失败: ${error instanceof Error ? error.message : String(error)}`,
          retryable: true,
          timestamp: Date.now()
        }
      }

      if (!aiResponse.success || !aiResponse.content) {
        const errorMessage = aiResponse.error || '分析失败，未返回结果'
        // 根据错误内容判断错误类型
        let errorType = AnalysisErrorType.API_ERROR
        if (
          errorMessage.includes('网络') ||
          errorMessage.includes('连接') ||
          errorMessage.includes('超时')
        ) {
          errorType = AnalysisErrorType.NETWORK_ERROR
        } else if (
          errorMessage.includes('认证') ||
          errorMessage.includes('授权') ||
          errorMessage.includes('密钥')
        ) {
          errorType = AnalysisErrorType.API_ERROR
        }

        throw {
          type: errorType,
          message: errorMessage,
          retryable: errorType === AnalysisErrorType.NETWORK_ERROR,
          timestamp: Date.now()
        }
      }

      // 过滤思维标签内容
      const filteredContent = filterThinkingContent(aiResponse.content)

      // 解析JSON结果
      try {
        // 尝试提取JSON部分
        const jsonMatch = filteredContent.match(/\{[\s\S]*\}/)
        const jsonStr = jsonMatch ? jsonMatch[0] : filteredContent
        result = JSON.parse(jsonStr) as AnalysisResult

        // 保存分析结果
        set({
          analysisResult: result,
          isAnalyzing: false,
          progress: 100
        })

        // 保存到缓存
        if (result) {
          try {
            const dataFingerprint = calculateDataFingerprint(statsData, activityData)
            // @ts-ignore - API可能存在但TypeScript不知道
            await window.api.analytics.saveAnalysisCache({
              date: new Date().toISOString().split('T')[0],
              stats: statsData,
              activityData,
              result,
              modelId,
              dataFingerprint
            })
          } catch (cacheError) {
            // 缓存保存失败不影响分析结果的显示
          }
        }
      } catch (jsonError) {
        throw {
          type: AnalysisErrorType.API_ERROR,
          message: `处理AI返回的数据格式失败: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`,
          retryable: false,
          timestamp: Date.now()
        }
      }
    } catch (error) {
      // 检查是否为自定义错误对象（包含type字段）
      let analysisError: AnalysisError
      if (error && typeof error === 'object' && 'type' in error && 'message' in error) {
        analysisError = error as AnalysisError
      } else {
        // 处理其他类型的错误
        analysisError = {
          type: AnalysisErrorType.UNKNOWN_ERROR,
          message: error instanceof Error ? error.message : String(error),
          retryable: true,
          timestamp: Date.now()
        }
      }

      set({
        error: analysisError,
        isAnalyzing: false,
        progress: 0
      })

      // 自动重试逻辑：只对可重试的错误进行自动重试
      const currentState = get()
      if (
        analysisError.retryable &&
        currentState.retryCount < currentState.maxRetries &&
        (analysisError.type === AnalysisErrorType.NETWORK_ERROR ||
          analysisError.type === AnalysisErrorType.DATA_ERROR)
      ) {
        // 延迟后自动重试
        setTimeout(async () => {
          try {
            await get().retryAnalysis()
          } catch (retryError) {}
        }, 2000) // 2秒后重试
      }
    }
  },

  retryAnalysis: async () => {
    const state = get()
    if (state.retryCount >= state.maxRetries) {
      set({
        error: {
          type: AnalysisErrorType.UNKNOWN_ERROR,
          message: '达到最大重试次数，请检查网络连接或AI模型配置后手动重试',
          retryable: false,
          timestamp: Date.now()
        }
      })
      return
    }

    if (!state.selectedModelId) {
      set({
        error: {
          type: AnalysisErrorType.DATA_ERROR,
          message: '未选择AI模型，无法重试',
          retryable: false,
          timestamp: Date.now()
        }
      })
      return
    }

    try {
      set({
        retryCount: state.retryCount + 1,
        error: null // 清除之前的错误
      })

      // 添加延迟重试，避免频繁请求
      const retryDelay = Math.min(1000 * Math.pow(2, state.retryCount), 10000) // 指数退避，最大10秒
      if (retryDelay > 1000) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay))
      }

      await state.startAnalysis(state.selectedModelId, true)
    } catch (error) {
      set({
        error: {
          type: AnalysisErrorType.UNKNOWN_ERROR,
          message: `重试失败: ${error instanceof Error ? error.message : String(error)}`,
          retryable: true,
          timestamp: Date.now()
        }
      })
    }
  },

  clearError: () => {
    set({ error: null })
  },

  // 重置缓存状态
  resetCacheStatus: () => {
    set({ analysisCached: false })
  }
}))
