import { create } from 'zustand'

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
}

// 分析状态接口
export interface AnalysisState {
  isAnalyzing: boolean
  analysisCached: boolean
  analysisResult: AnalysisResult | null
  progress: number
  error: string | null
  selectedModelId: string | null

  // 行为方法
  startAnalysis: (modelId: string, forceUpdate?: boolean) => Promise<void>
  stopAnalysis: () => void
  setAnalysisResult: (result: AnalysisResult) => void
  setSelectedModelId: (modelId: string) => void
}

// 创建分析状态存储
export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  isAnalyzing: false,
  analysisCached: false,
  analysisResult: null,
  progress: 0,
  error: null,
  selectedModelId: null,

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
        selectedModelId: modelId
      })

      // 如果是强制更新，则跳过缓存检查
      if (!forceUpdate) {
        // 检查是否已有当天的分析结果
        const today = new Date().toISOString().split('T')[0]
        const cacheResult = await window.api.analytics.getAnalysisCache()

        if (cacheResult.success && cacheResult.cache && cacheResult.cache.date === today) {
          set({
            analysisResult: cacheResult.cache.result,
            isAnalyzing: false,
            analysisCached: true,
            progress: 100
          })
          return
        }
      }

      // 获取笔记统计数据
      set({ progress: 20 })
      const statsResult = await window.api.analytics.getNoteHistoryStats()
      if (!statsResult.success) {
        throw new Error(`加载统计数据失败: ${statsResult.error}`)
      }
      const statsData = statsResult.stats

      // 获取用户活动数据
      set({ progress: 40 })
      const activityResult = await window.api.analytics.getUserActivityData(30)
      if (!activityResult.success) {
        throw new Error(`加载活动数据失败: ${activityResult.error}`)
      }
      const activityData = activityResult.activityData

      // 获取AI模型配置
      set({ progress: 60 })
      const settings = await window.api.settings.getAll()
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
        throw new Error('未配置AI模型')
      }

      // 使用选中的模型，如果没有选中，则使用第一个
      let aiApiConfig = aiApiConfigs[0]
      const selectedConfig = aiApiConfigs.find((config) => config.id === modelId)
      if (selectedConfig) {
        aiApiConfig = selectedConfig
      }

      // 准备分析数据
      const analysisData = {
        totalNotes: statsData.totalNotes,
        totalEdits: statsData.totalEdits,
        averageEditLength: statsData.averageEditLength,
        mostEditedNotes: statsData.mostEditedNotes
          .map((note) => note.filePath.split('/').pop())
          .join(', '),
        notesByDate: Object.entries(
          statsData.notesByDate.reduce((acc: Record<string, number>, item) => {
            acc[item.date] = item.count
            return acc
          }, {})
        )
          .map(([date, count]) => `${date}:${count}`)
          .join(', '),
        editsByDate: Object.entries(
          statsData.editsByDate.reduce((acc: Record<string, number>, item) => {
            acc[item.date] = item.count
            return acc
          }, {})
        )
          .map(([date, count]) => `${date}:${count}`)
          .join(', '),
        editTimeDistribution: statsData.editTimeDistribution
          .map((item) => `${item.hour}点:${item.count}次`)
          .join(', ')
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

                  请提供以下详细分析：
                  1. 写作习惯概述：分析我的整体写作模式、频率和时间分布
                  2. 写作节奏和时间管理：识别我的高效写作时段、写作连贯性和持续时间
                  3. 主题和内容偏好：基于编辑模式推断我最关注的内容领域
                  4. 写作行为分析：分析我的修改习惯、编辑深度和完善程度
                  5. 个性化改进建议：提供3-5条具体可行的改进建议，包括时间安排、内容组织和写作技巧
                  6. 效率提升策略：如何更有效地利用笔记应用功能提高写作效率
                  7. 建议的写作目标：根据当前习惯，提出合理的短期写作目标

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
      const aiResponse = await window.api.openai.generateContent({
        apiKey: aiApiConfig.apiKey,
        apiUrl: aiApiConfig.apiUrl,
        modelName: aiApiConfig.modelName,
        prompt: prompt,
        maxTokens: parseInt(aiApiConfig.maxTokens || '4000')
      })

      if (!aiResponse.success || !aiResponse.content) {
        throw new Error(aiResponse.error || '分析失败，未返回结果')
      }

      // 解析JSON结果
      try {
        // 尝试提取JSON部分
        const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/)
        const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse.content
        result = JSON.parse(jsonStr) as AnalysisResult

        // 保存分析结果
        set({
          analysisResult: result,
          isAnalyzing: false,
          progress: 100
        })

        // 保存到缓存
        if (result) {
          // @ts-ignore - API可能存在但TypeScript不知道
          await window.api.analytics.saveAnalysisCache({
            date: new Date().toISOString().split('T')[0],
            stats: statsData,
            activityData,
            result,
            modelId
          })
        }
      } catch (jsonError) {
        console.error('解析AI返回的JSON失败:', jsonError, aiResponse.content)
        throw new Error('处理AI返回的数据格式失败')
      }
    } catch (error) {
      console.error('分析失败:', error)
      set({
        error: error instanceof Error ? error.message : String(error),
        isAnalyzing: false,
        progress: 0
      })
    }
  }
}))
