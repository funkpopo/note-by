import React, { useState, useEffect, useRef } from 'react'
import {
  Typography,
  Card,
  Spin,
  Toast,
  Select,
  Button,
  Space,
  Divider,
  Tabs,
  TabPane,
  Progress
} from '@douyinfe/semi-ui'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  PointElement,
  LineElement
} from 'chart.js'
import { Pie, Bar, Line } from 'react-chartjs-2'
import { useTheme } from '../context/theme/useTheme'
import { useAnalysisStore } from '../context/analysis/analysisService'

// 注册Chart.js组件
ChartJS.register(
  ArcElement,
  ChartTooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ChartTitle,
  PointElement,
  LineElement
)

// 图表数据集接口
interface ChartDataset {
  label: string
  data: number[]
  backgroundColor: string | string[]
  borderColor: string | string[]
  borderWidth: number
  tension?: number
}

// 图表数据接口
interface ChartData {
  labels: string[]
  datasets: ChartDataset[]
}

// 可视化分析结果接口
interface AnalysisResult {
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

// 统计数据接口
interface StatsData {
  totalNotes: number
  totalEdits: number
  averageEditLength: number
  mostEditedNotes: Array<{
    filePath: string
    editCount: number
    count?: number // 兼容mostEditedNotes.map(note => note.count)的用法
  }>
  notesByDate: Array<{
    date: string
    count: number
  }>
  editsByDate: Array<{
    date: string
    count: number
  }>
  editTimeDistribution: Array<{
    hour: number
    count: number
  }>
  topFolders?: Array<{
    folder: string
    count: number
  }>
  // 标签分析相关字段
  topTags?: Array<{
    tag: string
    count: number
  }>
  tagRelations?: Array<{
    source: string
    target: string
    strength: number // 关联强度，代表两个标签共同出现的频率
  }>
  documentTags?: Array<{
    filePath: string
    tags: string[]
  }>
}

// 活动数据接口
interface ActivityData {
  dailyActivity: Record<
    string,
    {
      activeHours: number[]
      [key: string]: unknown
    }
  >
  [key: string]: unknown
}

// 分析缓存项接口
interface AnalysisCacheItem {
  date: string // 分析日期，格式：YYYY-MM-DD
  stats: StatsData // 统计数据
  activityData: ActivityData // 活动数据
  result: AnalysisResult // 分析结果
  modelId: string // 使用的模型ID
}

interface AnalyticsAPI {
  getNoteHistoryStats: () => Promise<{
    success: boolean
    stats: StatsData
    error?: string
  }>
  getUserActivityData: (days: number) => Promise<{
    success: boolean
    activityData: ActivityData
    error?: string
  }>
  getAnalysisCache: () => Promise<{
    success: boolean
    cache?: AnalysisCacheItem
    error?: string
  }>
  saveAnalysisCache: (cacheData: AnalysisCacheItem) => Promise<{
    success: boolean
    error?: string
  }>
  resetAnalysisCache?: () => Promise<{
    success: boolean
    error?: string
  }>
}

const { Title, Paragraph, Text } = Typography

const DataAnalysis: React.FC = () => {
  const { isDarkMode } = useTheme()
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [statsData, setStatsData] = useState<StatsData | null>(null)
  const [activityData, setActivityData] = useState<ActivityData | null>(null)
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string }>>([])
  const analysisContainerRef = useRef<HTMLDivElement>(null)
  const [cacheDate, setCacheDate] = useState<string | null>(null)

  // 使用分析服务的状态
  const {
    isAnalyzing,
    analysisResult,
    analysisCached,
    selectedModelId,
    progress,
    error,
    startAnalysis,
    setSelectedModelId,
    setAnalysisResult
  } = useAnalysisStore()

  // 格式化日期函数，将YYYY-MM-DD格式转为更友好的显示
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '未知日期'

    try {
      const date = new Date(dateString)
      // 检查是否为今天
      const today = new Date()
      if (date.toDateString() === today.toDateString()) {
        return '今天'
      }

      // 检查是否为昨天
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      if (date.toDateString() === yesterday.toDateString()) {
        return '昨天'
      }

      // 否则返回完整日期
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
    } catch {
      return dateString // 如果解析失败，返回原始日期字符串
    }
  }

  // 初始化
  useEffect(() => {
    fetchData()
    loadAvailableModels()

    // 添加自动加载缓存的分析结果
    loadCachedAnalysisResult()
  }, [])

  // 加载缓存的分析结果
  const loadCachedAnalysisResult = async (): Promise<void> => {
    try {
      // 修改加载状态，表示正在加载缓存
      setIsLoading(true)

      // 检查是否有缓存的分析结果
      const cacheResult = await window.api.analytics.getAnalysisCache()

      if (cacheResult.success && cacheResult.cache) {
        const cache = cacheResult.cache
        // 设置分析结果
        setSelectedModelId(cache.modelId)
        setAnalysisResult(cache.result)

        // 保存缓存的日期
        setCacheDate(cache.date)

        // 更新状态，表示已有缓存的分析结果
        console.log('已加载缓存的分析结果，日期:', cache.date)

        // 如果分析容器存在，滚动到顶部显示结果
        if (analysisContainerRef.current) {
          analysisContainerRef.current.scrollTop = 0
        }
      } else {
        console.log('未找到缓存的分析结果')
      }
    } catch (error) {
      console.error('加载缓存的分析结果失败:', error)
      Toast.error(
        `加载缓存的分析结果失败: ${error instanceof Error ? error.message : String(error)}`
      )
    } finally {
      // 无论成功失败，都结束加载状态
      setIsLoading(false)
    }
  }

  // 加载可用的AI模型
  const loadAvailableModels = async (): Promise<void> => {
    try {
      const settings = await window.api.settings.getAll()
      const aiApiConfigs =
        (settings.AiApiConfigs as Array<{
          id: string
          name: string
          apiKey: string
          apiUrl: string
          modelName: string
        }>) || []

      // 转换为下拉菜单选项格式
      const models = aiApiConfigs.map((config) => ({
        id: config.id,
        name: config.name
      }))

      setAvailableModels(models)

      // 获取存储的选中模型ID，或默认使用第一个
      const savedModelId = window.localStorage.getItem('selectedModelId')
      if (savedModelId && models.some((model) => model.id === savedModelId)) {
        setSelectedModelId(savedModelId)
      } else if (models.length > 0) {
        setSelectedModelId(models[0].id)
      }
    } catch (error) {
      console.error('加载AI模型失败:', error)
      Toast.error('加载AI模型失败')
    }
  }

  // 加载数据
  const fetchData = async (): Promise<void> => {
    setIsLoading(true)
    try {
      // 获取笔记统计数据
      const statsResult = await window.api.analytics.getNoteHistoryStats()
      if (!statsResult.success) {
        Toast.error(`加载统计数据失败: ${statsResult.error}`)
        setIsLoading(false)
        return
      }
      setStatsData(statsResult.stats)

      // 获取用户活动数据
      const activityResult = await window.api.analytics.getUserActivityData(30) // 获取30天的数据
      if (!activityResult.success) {
        Toast.error(`加载活动数据失败: ${activityResult.error}`)
        setIsLoading(false)
        return
      }
      setActivityData(activityResult.activityData)
    } catch (error) {
      console.error('加载数据失败:', error)
      Toast.error(`加载数据失败: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 执行分析的包装函数
  const handlePerformAnalysis = async (forceUpdate: boolean = false): Promise<void> => {
    if (!selectedModelId) {
      Toast.error('请先选择AI模型')
      return
    }

    try {
      // 显示开始分析的提示
      if (forceUpdate) {
        Toast.info('开始重新分析...')
        // 如果是重新分析，先清除缓存日期显示
        setCacheDate(null)
      } else {
        Toast.info('开始分析，检查缓存...')
      }

      await startAnalysis(selectedModelId, forceUpdate)

      // 如果是新分析结果，更新缓存日期为今天
      if (!analysisCached || forceUpdate) {
        setCacheDate(new Date().toISOString().split('T')[0])
      }

      // 分析完成后，滚动到内容顶部
      if (analysisContainerRef.current) {
        analysisContainerRef.current.scrollTop = 0
      }

      if (!error) {
        if (analysisCached && !forceUpdate) {
          Toast.success('已加载缓存的分析结果')
        } else {
          Toast.success('分析完成')
        }
      }
    } catch (err) {
      console.error('分析出错:', err)
      Toast.error(`分析失败: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // 渲染饼图
  const renderPieChart = (data: ChartData, title: string): JSX.Element => {
    return (
      <div style={{ maxWidth: '100%', height: 350, marginBottom: 24 }}>
        <Title
          heading={6}
          style={{ textAlign: 'center', marginBottom: 16, color: 'var(--semi-color-text-0)' }}
        >
          {title}
        </Title>
        <Pie
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  color: isDarkMode ? '#e9e9e9' : '#333',
                  padding: 16,
                  font: {
                    size: 12
                  }
                }
              },
              tooltip: {
                backgroundColor: isDarkMode ? '#333' : '#fff',
                titleColor: isDarkMode ? '#fff' : '#333',
                bodyColor: isDarkMode ? '#fff' : '#333',
                borderColor: isDarkMode ? '#555' : '#ddd',
                borderWidth: 1,
                padding: 12
              }
            }
          }}
        />
      </div>
    )
  }

  // 渲染柱状图
  const renderBarChart = (
    data: ChartData,
    title: string,
    vertical: boolean = true
  ): JSX.Element => {
    return (
      <div style={{ maxWidth: '100%', height: vertical ? 350 : 250, marginBottom: 24 }}>
        <Title
          heading={6}
          style={{ textAlign: 'center', marginBottom: 16, color: 'var(--semi-color-text-0)' }}
        >
          {title}
        </Title>
        <Bar
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: vertical ? 'x' : 'y',
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  color: isDarkMode ? '#e9e9e9' : '#333',
                  padding: 12,
                  font: {
                    size: 12
                  }
                }
              },
              tooltip: {
                backgroundColor: isDarkMode ? '#333' : '#fff',
                titleColor: isDarkMode ? '#fff' : '#333',
                bodyColor: isDarkMode ? '#fff' : '#333',
                borderColor: isDarkMode ? '#555' : '#ddd',
                borderWidth: 1,
                padding: 12
              }
            },
            scales: {
              x: {
                ticks: {
                  color: isDarkMode ? '#e9e9e9' : '#333'
                },
                grid: {
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }
              },
              y: {
                ticks: {
                  color: isDarkMode ? '#e9e9e9' : '#333'
                },
                grid: {
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }
              }
            }
          }}
        />
      </div>
    )
  }

  // 渲染折线图
  const renderLineChart = (data: ChartData, title: string): JSX.Element => {
    return (
      <div style={{ maxWidth: '100%', height: 350, marginBottom: 24 }}>
        <Title
          heading={6}
          style={{ textAlign: 'center', marginBottom: 16, color: 'var(--semi-color-text-0)' }}
        >
          {title}
        </Title>
        <Line
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  color: isDarkMode ? '#e9e9e9' : '#333',
                  padding: 12,
                  font: {
                    size: 12
                  }
                }
              },
              tooltip: {
                backgroundColor: isDarkMode ? '#333' : '#fff',
                titleColor: isDarkMode ? '#fff' : '#333',
                bodyColor: isDarkMode ? '#fff' : '#333',
                borderColor: isDarkMode ? '#555' : '#ddd',
                borderWidth: 1,
                padding: 12
              }
            },
            scales: {
              x: {
                ticks: {
                  color: isDarkMode ? '#e9e9e9' : '#333'
                },
                grid: {
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }
              },
              y: {
                ticks: {
                  color: isDarkMode ? '#e9e9e9' : '#333'
                },
                grid: {
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }
              }
            }
          }}
        />
      </div>
    )
  }

  // 渲染标签云
  const renderTagCloud = (data: ChartData, title: string): JSX.Element => {
    return (
      <div style={{ maxWidth: '100%', height: 350, marginBottom: 24 }}>
        <Title
          heading={6}
          style={{ textAlign: 'center', marginBottom: 16, color: 'var(--semi-color-text-0)' }}
        >
          {title}
        </Title>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            height: '80%',
            padding: '20px'
          }}
        >
          {data.labels.map((label, index) => {
            // 计算标签的字体大小，基于数值的相对大小
            const maxSize = 28
            const minSize = 12
            const maxValue = Math.max(...data.datasets[0].data)
            const value = data.datasets[0].data[index]
            const fontSize = minSize + ((maxSize - minSize) * value) / maxValue

            // 使用数据集的颜色
            const color = Array.isArray(data.datasets[0].backgroundColor)
              ? data.datasets[0].backgroundColor[index]
              : data.datasets[0].backgroundColor

            return (
              <span
                key={label}
                style={{
                  fontSize: `${fontSize}px`,
                  color: typeof color === 'string' ? color : 'var(--semi-color-primary)',
                  margin: '8px',
                  padding: '4px 8px',
                  background: 'var(--semi-color-primary-light-default)',
                  borderRadius: '4px',
                  display: 'inline-block',
                  cursor: 'default'
                }}
                title={`${label}: ${value}`}
              >
                {label}
              </span>
            )
          })}
        </div>
      </div>
    )
  }

  // 渲染标签关系图（使用饼图模拟简单的关系网络图）
  const renderTagRelations = (
    data: { source: string; target: string; strength: number }[],
    title: string
  ): JSX.Element => {
    // 将关系数据转换为适合显示的格式
    const relationLabels = data.map((relation) => `${relation.source} ↔ ${relation.target}`)
    const relationValues = data.map((relation) => relation.strength)

    // 创建一个Chart.js数据对象
    const chartData: ChartData = {
      labels: relationLabels,
      datasets: [
        {
          label: '关联强度',
          data: relationValues,
          backgroundColor: generateColors(relationLabels.length),
          borderColor: generateColors(relationLabels.length, 1),
          borderWidth: 1
        }
      ]
    }

    return (
      <div style={{ maxWidth: '100%', height: 500, marginBottom: 24 }}>
        <Title
          heading={6}
          style={{ textAlign: 'center', marginBottom: 16, color: 'var(--semi-color-text-0)' }}
        >
          {title}
        </Title>
        <div style={{ height: '380px', overflowY: 'auto' }}>
          <Pie
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'right',
                  labels: {
                    color: isDarkMode ? '#e9e9e9' : '#333',
                    padding: 16,
                    font: {
                      size: 12
                    },
                    // 限制标签长度，避免过长
                    generateLabels: (chart) => {
                      const originalLabels =
                        ChartJS.defaults.plugins.legend.labels.generateLabels!(chart)
                      return originalLabels.map((label) => {
                        if (label.text && label.text.length > 25) {
                          label.text = label.text.substring(0, 22) + '...'
                        }
                        return label
                      })
                    }
                  }
                },
                tooltip: {
                  backgroundColor: isDarkMode ? '#333' : '#fff',
                  titleColor: isDarkMode ? '#fff' : '#333',
                  bodyColor: isDarkMode ? '#fff' : '#333',
                  borderColor: isDarkMode ? '#555' : '#ddd',
                  borderWidth: 1,
                  padding: 12,
                  callbacks: {
                    label: (context) => {
                      const label = context.label || ''
                      const value = context.raw as number
                      return `${label}: ${value} 次共现`
                    }
                  }
                }
              }
            }}
          />
        </div>
      </div>
    )
  }

  // 生成颜色函数
  const generateColors = (count: number, alpha: number = 0.7): string[] => {
    const colors: string[] = []
    for (let i = 0; i < count; i++) {
      const hue = (i * 137.5) % 360 // 使用黄金角分布颜色
      colors.push(`hsla(${hue}, 70%, 60%, ${alpha})`)
    }
    return colors
  }

  // 准备图表数据
  const prepareChartData = (): {
    hourlyDistribution: ChartData
    topNotes: ChartData
    editTrend: ChartData
    noteTrend: ChartData
    topFolders?: ChartData
    activeHours: ChartData
    topTags?: ChartData
  } | null => {
    if (!statsData || !activityData) return null

    // 生成颜色
    const generateColors = (count: number, alpha: number = 0.7): string[] => {
      const colors: string[] = []
      for (let i = 0; i < count; i++) {
        const hue = (i * 137.5) % 360 // 使用黄金角分布颜色
        colors.push(`hsla(${hue}, 70%, 60%, ${alpha})`)
      }
      return colors
    }

    // 1. 编辑时间分布图表（24小时）
    const hourlyDistribution: ChartData = {
      labels: statsData.editTimeDistribution.map((item) => `${item.hour}点:00`),
      datasets: [
        {
          label: '编辑次数',
          data: statsData.editTimeDistribution.map((item) => item.count),
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }
      ]
    }

    // 2. 最常编辑的笔记（饼图）
    const topNotes: ChartData = {
      labels: statsData.mostEditedNotes.map((note) => {
        // 从文件路径中提取文件名，限制长度
        const fileName = note.filePath.split('/').pop() || ''
        return fileName.length > 15 ? fileName.substring(0, 15) + '...' : fileName
      }),
      datasets: [
        {
          label: '编辑次数',
          data: statsData.mostEditedNotes.map((note) => {
            return (note.editCount !== undefined ? note.editCount : note.count) || 0
          }),
          backgroundColor: generateColors(statsData.mostEditedNotes.length),
          borderColor: generateColors(statsData.mostEditedNotes.length, 1),
          borderWidth: 1
        }
      ]
    }

    // 3. 每日编辑次数趋势（折线图）
    const sortedEditsByDate = [...statsData.editsByDate].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime()
    })

    const editTrend: ChartData = {
      labels: sortedEditsByDate.map((item) => item.date),
      datasets: [
        {
          label: '编辑次数',
          data: sortedEditsByDate.map((item) => item.count),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          tension: 0.2
        }
      ]
    }

    // 4. 每日笔记数量趋势（折线图）
    const sortedNotesByDate = [...statsData.notesByDate].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime()
    })

    const noteTrend: ChartData = {
      labels: sortedNotesByDate.map((item) => item.date),
      datasets: [
        {
          label: '活跃笔记数',
          data: sortedNotesByDate.map((item) => item.count),
          backgroundColor: 'rgba(255, 159, 64, 0.5)',
          borderColor: 'rgba(255, 159, 64, 1)',
          borderWidth: 1,
          tension: 0.2
        }
      ]
    }

    let topFolders: ChartData | undefined = undefined

    // 5. 最常用的文件夹（柱状图）
    if (statsData.topFolders && statsData.topFolders.length > 0) {
      topFolders = {
        labels: statsData.topFolders.map((folder) => folder.folder),
        datasets: [
          {
            label: '使用次数',
            data: statsData.topFolders.map((folder) => folder.count),
            backgroundColor: 'rgba(153, 102, 255, 0.5)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1
          }
        ]
      }
    }

    // 6. 计算活动时段分布
    const activeHoursData: Record<number, number> = {}
    for (let i = 0; i < 24; i++) {
      activeHoursData[i] = 0
    }

    // 合并活动数据中的所有活跃小时
    if (activityData.dailyActivity) {
      Object.values(activityData.dailyActivity).forEach((day) => {
        if (day.activeHours && Array.isArray(day.activeHours)) {
          day.activeHours.forEach((hour: number) => {
            activeHoursData[hour] = (activeHoursData[hour] || 0) + 1
          })
        }
      })
    }

    const activeHours: ChartData = {
      labels: Object.keys(activeHoursData).map((hour) => `${hour}:00`),
      datasets: [
        {
          label: '活跃天数',
          data: Object.values(activeHoursData),
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }
      ]
    }

    // 7. 最常用的标签（标签云）
    let topTags: ChartData | undefined = undefined
    if (statsData.topTags && statsData.topTags.length > 0) {
      topTags = {
        labels: statsData.topTags.map((tag) => tag.tag),
        datasets: [
          {
            label: '使用次数',
            data: statsData.topTags.map((tag) => tag.count),
            backgroundColor: generateColors(statsData.topTags.length),
            borderColor: generateColors(statsData.topTags.length, 1),
            borderWidth: 1
          }
        ]
      }
    }

    return {
      hourlyDistribution,
      topNotes,
      editTrend,
      noteTrend,
      topFolders,
      activeHours,
      topTags
    }
  }

  return (
    <div
      style={{
        padding: '16px',
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 32px)' // 减去上下padding
      }}
    >
      <Title heading={3} style={{ margin: 0, color: 'var(--semi-color-text-0)' }}>
        笔记数据分析
      </Title>
      <div ref={analysisContainerRef} className="settings-scroll-container">
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            marginBottom: 24,
            marginTop: 20
          }}
        >
          <Space>
            <Select
              placeholder="选择AI模型"
              value={selectedModelId || undefined}
              onChange={(value) => {
                setSelectedModelId(value as string)
              }}
              style={{ width: 200 }}
            >
              {availableModels.map((model) => (
                <Select.Option key={model.id} value={model.id}>
                  {model.name}
                </Select.Option>
              ))}
            </Select>
            <Button
              theme="solid"
              type="primary"
              onClick={() => handlePerformAnalysis(true)}
              loading={isAnalyzing}
              disabled={!selectedModelId || availableModels.length === 0}
            >
              {isAnalyzing ? '分析中...' : '执行分析'}
            </Button>
            {process.env.NODE_ENV !== 'production' && (
              <Button
                type="warning"
                onClick={async () => {
                  try {
                    await (window.api.analytics as AnalyticsAPI).resetAnalysisCache?.()
                    Toast.success('分析缓存已重置')
                  } catch (error) {
                    console.error('重置缓存失败:', error)
                    Toast.error('重置缓存失败')
                  }
                }}
              >
                重置缓存
              </Button>
            )}
          </Space>
        </div>

        {(isLoading || (isAnalyzing && !analysisResult)) && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
            <Paragraph style={{ marginTop: 16 }}>
              {isAnalyzing ? '正在使用AI分析您的笔记数据...' : '正在加载数据...'}
            </Paragraph>
            {isAnalyzing && (
              <div style={{ maxWidth: '500px', margin: '20px auto' }}>
                <Progress percent={progress} showInfo />
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{ marginTop: 24, textAlign: 'center', color: 'var(--semi-color-danger)' }}>
            <Paragraph>{error}</Paragraph>
          </div>
        )}

        {!isLoading && !isAnalyzing && !analysisResult && !error && (
          <Card style={{ marginTop: 24, padding: '24px' }}>
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Title heading={4}>暂无分析结果</Title>
              <Paragraph>点击 执行分析 按钮，使用AI分析您的笔记使用习惯。</Paragraph>
            </div>
          </Card>
        )}

        {analysisResult && !isLoading && (
          <div style={{ marginTop: 24, marginBottom: 24 }}>
            {analysisCached && (
              <div
                style={{
                  marginBottom: 16,
                  backgroundColor: 'var(--semi-color-info-light-default)',
                  padding: '8px 16px',
                  borderRadius: '4px'
                }}
              >
                <Text>
                  <Space>
                    <span>当前显示的是缓存的分析结果，日期: {formatDate(cacheDate)}</span>
                    <Button
                      size="small"
                      type="tertiary"
                      onClick={() => handlePerformAnalysis(true)}
                      disabled={isAnalyzing}
                    >
                      重新分析
                    </Button>
                  </Space>
                </Text>
              </div>
            )}

            {isAnalyzing && (
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary">分析正在背景中继续进行，您可以安全地切换到其它界面...</Text>
                <div style={{ maxWidth: '500px', margin: '20px auto' }}>
                  <Progress percent={progress} showInfo />
                </div>
              </div>
            )}

            <Card style={{ padding: '8px 16px', marginBottom: '16px' }}>
              <Title heading={4} style={{ margin: '16px 24px', color: 'var(--semi-color-text-0)' }}>
                {analysisResult.summary}
              </Title>

              <Tabs type="line" style={{ marginTop: 16 }}>
                <TabPane tab="写作习惯" itemKey="habits">
                  <div style={{ padding: '16px 24px' }}>
                    <Title
                      heading={5}
                      style={{ color: 'var(--semi-color-text-0)', marginBottom: 16 }}
                    >
                      {analysisResult.writingHabits.title}
                    </Title>
                    <Paragraph style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                      {analysisResult.writingHabits.content}
                    </Paragraph>

                    <Divider margin="24px" />

                    <Title
                      heading={5}
                      style={{ color: 'var(--semi-color-text-0)', marginBottom: 16 }}
                    >
                      {analysisResult.writingRhythm.title}
                    </Title>
                    <Paragraph style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                      {analysisResult.writingRhythm.content}
                    </Paragraph>
                  </div>
                </TabPane>

                <TabPane tab="内容分析" itemKey="content">
                  <div style={{ padding: '16px 24px' }}>
                    <Title
                      heading={5}
                      style={{ color: 'var(--semi-color-text-0)', marginBottom: 16 }}
                    >
                      {analysisResult.topics.title}
                    </Title>
                    <Paragraph style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                      {analysisResult.topics.content}
                    </Paragraph>

                    <Divider margin="24px" />

                    <Title
                      heading={5}
                      style={{ color: 'var(--semi-color-text-0)', marginBottom: 16 }}
                    >
                      {analysisResult.writingBehavior.title}
                    </Title>
                    <Paragraph style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                      {analysisResult.writingBehavior.content}
                    </Paragraph>

                    {/* 添加标签分析描述 */}
                    {analysisResult.tagAnalysis && (
                      <>
                        <Divider margin="24px" />

                        <Title
                          heading={5}
                          style={{ color: 'var(--semi-color-text-0)', marginBottom: 16 }}
                        >
                          {analysisResult.tagAnalysis.title}
                        </Title>
                        <Paragraph style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                          {analysisResult.tagAnalysis.content}
                        </Paragraph>
                      </>
                    )}

                    {/* 添加标签关系描述 */}
                    {analysisResult.tagRelationships && (
                      <>
                        <Divider margin="24px" />

                        <Title
                          heading={5}
                          style={{ color: 'var(--semi-color-text-0)', marginBottom: 16 }}
                        >
                          {analysisResult.tagRelationships.title}
                        </Title>
                        <Paragraph style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                          {analysisResult.tagRelationships.content}
                        </Paragraph>
                      </>
                    )}
                  </div>
                </TabPane>

                <TabPane tab="改进建议" itemKey="suggestions">
                  <div style={{ padding: '16px 24px' }}>
                    <Title
                      heading={5}
                      style={{ color: 'var(--semi-color-text-0)', marginBottom: 16 }}
                    >
                      {analysisResult.recommendations.title}
                    </Title>
                    <ul style={{ paddingLeft: 20, margin: '16px 0' }}>
                      {analysisResult.recommendations.items.map((item, index) => (
                        <li key={index} style={{ marginBottom: 12 }}>
                          <Paragraph style={{ lineHeight: 1.6 }}>{item}</Paragraph>
                        </li>
                      ))}
                    </ul>

                    <Divider margin="24px" />

                    <Title
                      heading={5}
                      style={{ color: 'var(--semi-color-text-0)', marginBottom: 16 }}
                    >
                      {analysisResult.efficiencyTips.title}
                    </Title>
                    <ul style={{ paddingLeft: 20, margin: '16px 0' }}>
                      {analysisResult.efficiencyTips.items.map((item, index) => (
                        <li key={index} style={{ marginBottom: 12 }}>
                          <Paragraph style={{ lineHeight: 1.6 }}>{item}</Paragraph>
                        </li>
                      ))}
                    </ul>

                    <Divider margin="24px" />

                    <Title
                      heading={5}
                      style={{ color: 'var(--semi-color-text-0)', marginBottom: 16 }}
                    >
                      {analysisResult.suggestedGoals.title}
                    </Title>
                    <ul style={{ paddingLeft: 20, margin: '16px 0' }}>
                      {analysisResult.suggestedGoals.items.map((item, index) => (
                        <li key={index} style={{ marginBottom: 12 }}>
                          <Paragraph style={{ lineHeight: 1.6 }}>{item}</Paragraph>
                        </li>
                      ))}
                    </ul>
                  </div>
                </TabPane>

                <TabPane tab="数据可视化" itemKey="visualization">
                  {statsData && activityData && (
                    <div style={{ padding: '16px 24px' }}>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          justifyContent: 'space-between',
                          gap: '24px',
                          marginBottom: '24px'
                        }}
                      >
                        <div
                          style={{
                            width: 'calc(50% - 24px)',
                            marginRight: '0'
                          }}
                        >
                          {prepareChartData()?.hourlyDistribution &&
                            renderBarChart(
                              prepareChartData()!.hourlyDistribution,
                              '每日时段编辑分布'
                            )}
                        </div>
                        <div
                          style={{
                            width: 'calc(50% - 24px)',
                            marginRight: '0'
                          }}
                        >
                          {prepareChartData()?.topNotes &&
                            renderPieChart(prepareChartData()!.topNotes, '最常编辑的笔记')}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          justifyContent: 'space-between',
                          gap: '24px',
                          marginBottom: '24px'
                        }}
                      >
                        <div
                          style={{
                            width: 'calc(50% - 24px)',
                            marginRight: '0'
                          }}
                        >
                          {prepareChartData()?.editTrend &&
                            renderLineChart(prepareChartData()!.editTrend, '每日编辑次数趋势')}
                        </div>
                        <div
                          style={{
                            width: 'calc(50% - 24px)',
                            marginRight: '0'
                          }}
                        >
                          {prepareChartData()?.noteTrend &&
                            renderLineChart(prepareChartData()!.noteTrend, '每日活跃笔记数趋势')}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          justifyContent: 'space-between',
                          gap: '24px',
                          marginBottom: '24px'
                        }}
                      >
                        <div
                          style={{
                            width: 'calc(50% - 24px)',
                            marginRight: '0'
                          }}
                        >
                          {prepareChartData()?.activeHours &&
                            renderBarChart(prepareChartData()!.activeHours, '活跃时段分布')}
                        </div>
                        <div
                          style={{
                            width: 'calc(50% - 24px)',
                            marginRight: '0'
                          }}
                        >
                          {prepareChartData()?.topFolders &&
                            renderBarChart(
                              prepareChartData()!.topFolders!,
                              '最常用的文件夹',
                              false
                            )}
                        </div>
                      </div>

                      {/* 添加标签分析相关的可视化 */}
                      {statsData.topTags && statsData.topTags.length > 0 && (
                        <>
                          <Divider margin="24px">标签分析</Divider>
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              justifyContent: 'space-between',
                              gap: '24px',
                              marginBottom: '24px'
                            }}
                          >
                            <div style={{ width: '100%', marginRight: '0' }}>
                              {prepareChartData()?.topTags &&
                                renderTagCloud(prepareChartData()!.topTags!, '最常用的标签')}

                              {statsData.topTags &&
                                statsData.topTags.length > 0 &&
                                prepareChartData()?.topTags &&
                                renderTagCloud(prepareChartData()!.topTags!, '最常用的标签')}
                            </div>
                          </div>
                        </>
                      )}

                      {/* 添加标签关系图 */}
                      {statsData.tagRelations && statsData.tagRelations.length > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'space-between',
                            gap: '24px',
                            marginBottom: '24px'
                          }}
                        >
                          <div style={{ width: '100%', marginRight: '0' }}>
                            {renderTagRelations(statsData.tagRelations, '标签关联关系')}
                          </div>

                          <div style={{ width: '100%', marginRight: '0' }}>
                            {statsData.tagRelations &&
                              statsData.tagRelations.length > 0 &&
                              renderTagRelations(
                                statsData.tagRelations.slice(
                                  0,
                                  Math.min(10, statsData.tagRelations.length)
                                ),
                                '标签关联关系'
                              )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TabPane>
              </Tabs>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default DataAnalysis
