import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import {
  Typography,
  Card,
  Toast,
  Select,
  Button,
  Space,
  Divider,
  Tabs,
  TabPane,
  Progress
} from '@douyinfe/semi-ui'
import { useTheme } from '../context/theme/useTheme'
import { useAnalysisStore } from '../context/analysis/analysisService'
import ReactECharts from 'echarts-for-react'
import 'echarts-wordcloud'
import { DataAnalysisSkeleton } from './Skeleton'
import { modelSelectionService } from '../services/modelSelectionService'
import { VirtualTextList } from './VirtualList'
import { editorMemoryManager } from '../utils/EditorMemoryManager'
import { useLanguage } from '../locales'

// 图谱数据接口定义
interface GraphNode {
  id: string
  name: string
  val: number // 节点大小，基于标签使用频率（保留原有字段兼容性）
  value?: number // ECharts使用value表示数值
  symbolSize?: number // ECharts节点大小
  itemStyle?: {
    // ECharts样式
    color: string
  }
  label?: {
    // ECharts标签
    show: boolean
    formatter: string
  }
  color?: string // 原有字段（保留兼容性）
}

interface GraphLink {
  source: string
  target: string
  value: number // 连接强度，基于标签共现频率
  lineStyle?: {
    // ECharts线条样式
    width: number
    color: string | 'source' | 'target'
  }
}

interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

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

// ECharts数据格式接口
interface EChartsOption {
  title?: {
    text: string
    left?: string | number
    textStyle?: {
      color?: string
      fontSize?: number
    }
  }
  tooltip?: {
    trigger?: 'item' | 'axis'
    formatter?: string | Function
    backgroundColor?: string
    borderColor?: string
    textStyle?: {
      color?: string
    }
    axisPointer?: {
      type?: 'line' | 'shadow' | 'cross'
    }
    show?: boolean
  }
  legend?: {
    type?: 'plain' | 'scroll'
    orient?: 'horizontal' | 'vertical'
    left?: string | number
    right?: string | number
    top?: string | number
    bottom?: string | number
    data?: string[]
    textStyle?: {
      color?: string
    }
  }
  grid?: {
    left?: string | number
    right?: string | number
    top?: string | number
    bottom?: string | number
    containLabel?: boolean
  }
  xAxis?: {
    type?: 'category' | 'value' | 'time'
    data?: any[]
    axisLabel?: {
      color?: string
      formatter?: string | Function
      rotate?: number
    }
    axisLine?: {
      lineStyle?: {
        color?: string
      }
    }
    axisTick?: {
      alignWithLabel?: boolean
    }
    splitLine?: {
      lineStyle?: {
        color?: string | string[]
        type?: 'solid' | 'dashed' | 'dotted'
      }
    }
  }
  yAxis?: {
    type?: 'category' | 'value'
    data?: any[]
    axisLabel?: {
      color?: string
      formatter?: string | Function
    }
    axisLine?: {
      lineStyle?: {
        color?: string
      }
    }
    splitLine?: {
      lineStyle?: {
        color?: string | string[]
        type?: 'solid' | 'dashed' | 'dotted'
      }
    }
  }
  series?: Array<{
    name?: string
    type: 'bar' | 'line' | 'pie' | 'scatter' | 'graph' | 'wordCloud'
    data?: any[]
    radius?: string | string[]
    center?: string[]
    roseType?: boolean | string
    avoidLabelOverlap?: boolean
    label?: {
      show?: boolean
      position?: string
      formatter?: string | Function
      color?: string
    }
    emphasis?: {
      itemStyle?: {
        shadowBlur?: number
        shadowOffsetX?: number
        shadowColor?: string
      }
    }
    areaStyle?: {
      color?: string
      opacity?: number
    }
    lineStyle?: {
      width?: number
      type?: string
      color?: string | Function
    }
    itemStyle?: {
      color?: string | Function
      borderColor?: string
      borderWidth?: number
    }
    smooth?: boolean
    symbolSize?: number
    showSymbol?: boolean
    stack?: string
    barWidth?: string | number
    barCategoryGap?: string
    animation?: boolean
    animationDuration?: number
    animationEasing?: string
    // 力导向图特有
    layout?: 'none' | 'circular' | 'force'
    force?: {
      repulsion?: number
      gravity?: number
      edgeLength?: number | number[]
      friction?: number
    }
    links?: Array<{
      source: string | number
      target: string | number
      value?: number
      lineStyle?: {
        width?: number
        curveness?: number
        color?: string | 'source' | 'target'
      }
    }>
    // 词云特有
    sizeRange?: number[]
    rotationRange?: number[]
    rotationStep?: number
    gridSize?: number
    shape?: string
    textStyle?: {
      fontWeight?: string | number
      color?: string | Function
    }
    left?: string | number
    top?: string | number
    right?: string | number
    bottom?: string | number
    width?: string | number
    height?: string | number
  }>
  color?: string[]
  backgroundColor?: string
  textStyle?: {
    color?: string
  }
  animationDuration?: number
  animationEasing?: string
}

// 统计数据接口
interface StatsData {
  totalNotes: number
  totalEdits: number
  averageEditLength: number
  mostEditedNotes: Array<{
    filePath: string
    count: number
    lastEditTime: number
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

const { Title, Paragraph, Text } = Typography

// 图表配置生成器
const generateChartConfig = (
  chartType: 'pie' | 'bar' | 'line' | 'wordCloud',
  data: ChartData,
  options: {
    title?: string
    vertical?: boolean
    highlightIndex?: number
    isDarkMode?: boolean
  } = {}
): EChartsOption => {
  const { vertical = true, highlightIndex, isDarkMode = false } = options

  switch (chartType) {
    case 'pie': {
      // 直接生成饼图数据
      const seriesData = data.labels.map((label, index) => ({
        name: label,
        value: data.datasets[0].data[index]
      }))

      const colors = Array.isArray(data.datasets[0].backgroundColor)
        ? data.datasets[0].backgroundColor
        : [data.datasets[0].backgroundColor]

      return {
        title: { text: '', left: 'center' },
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c} ({d}%)',
          backgroundColor: isDarkMode ? '#333' : '#fff',
          borderColor: isDarkMode ? '#555' : '#ddd',
          textStyle: { color: isDarkMode ? '#fff' : '#333' }
        },
        legend: {
          orient: 'horizontal',
          bottom: 0,
          data: data.labels,
          textStyle: { color: isDarkMode ? '#e9e9e9' : '#333' }
        },
        series: [
          {
            name: data.datasets[0].label,
            type: 'pie',
            radius: '70%',
            center: ['50%', '45%'],
            data: seriesData,
            label: {
              show: true,
              formatter: '{b}: {d}%',
              color: isDarkMode ? '#e9e9e9' : '#333'
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            itemStyle: {
              borderWidth: data.datasets[0].borderWidth || 1,
              borderColor: isDarkMode ? '#1c1c1c' : '#fff'
            },
            animationDuration: 800,
            animationEasing: 'cubicOut'
          }
        ],
        color: colors,
        backgroundColor: 'transparent',
        textStyle: { color: isDarkMode ? '#e9e9e9' : '#333' }
      }
    }

    case 'bar': {
      // 直接生成柱状图数据
      const seriesData = data.datasets.map((dataset) => ({
        name: dataset.label,
        type: 'bar' as const,
        data: dataset.data,
        itemStyle: {
          color: (params: any) => {
            if (highlightIndex !== undefined && params.dataIndex === highlightIndex) {
              return 'rgba(255, 99, 132, 0.8)'
            }
            if (Array.isArray(dataset.backgroundColor)) {
              return dataset.backgroundColor[params.dataIndex] || dataset.backgroundColor[0]
            }
            return dataset.backgroundColor
          }
        },
        barWidth: vertical ? '60%' : undefined,
        barCategoryGap: '30%',
        label: { show: false }
      }))

      return {
        title: { text: '', left: 'center' },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          backgroundColor: isDarkMode ? '#333' : '#fff',
          borderColor: isDarkMode ? '#555' : '#ddd',
          textStyle: { color: isDarkMode ? '#fff' : '#333' }
        },
        legend: {
          data: data.datasets.map((dataset) => dataset.label),
          top: 0,
          textStyle: { color: isDarkMode ? '#e9e9e9' : '#333' }
        },
        grid: {
          left: vertical ? '3%' : '15%',
          right: '4%',
          bottom: vertical ? '10%' : '3%',
          top: vertical ? '15%' : '10%',
          containLabel: true
        },
        xAxis: vertical
          ? {
              type: 'category',
              data: data.labels,
              axisLabel: {
                color: isDarkMode ? '#e9e9e9' : '#333',
                rotate: data.labels.length > 10 ? 45 : 0
              },
              axisLine: {
                lineStyle: {
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
                }
              },
              splitLine: {
                lineStyle: {
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }
              }
            }
          : {
              type: 'value',
              axisLabel: { color: isDarkMode ? '#e9e9e9' : '#333' },
              axisLine: {
                lineStyle: {
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
                }
              },
              splitLine: {
                lineStyle: {
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }
              }
            },
        yAxis: vertical
          ? {
              type: 'value',
              axisLabel: { color: isDarkMode ? '#e9e9e9' : '#333' },
              axisLine: {
                lineStyle: {
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
                }
              },
              splitLine: {
                lineStyle: {
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }
              }
            }
          : {
              type: 'category',
              data: data.labels,
              axisLabel: { color: isDarkMode ? '#e9e9e9' : '#333' },
              axisLine: {
                lineStyle: {
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
                }
              },
              splitLine: {
                lineStyle: {
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }
              }
            },
        series: seriesData,
        backgroundColor: 'transparent',
        textStyle: { color: isDarkMode ? '#e9e9e9' : '#333' },
        animationDuration: 800,
        animationEasing: 'cubicOut'
      }
    }

    case 'line': {
      // 直接生成折线图数据
      const seriesData = data.datasets.map((dataset) => ({
        name: dataset.label,
        type: 'line' as const,
        data: dataset.data,
        itemStyle: {
          color: Array.isArray(dataset.borderColor) ? dataset.borderColor[0] : dataset.borderColor
        },
        lineStyle: {
          width: dataset.borderWidth || 2,
          type: 'solid',
          color: Array.isArray(dataset.borderColor) ? dataset.borderColor[0] : dataset.borderColor
        },
        areaStyle: dataset.backgroundColor
          ? {
              color: Array.isArray(dataset.backgroundColor)
                ? dataset.backgroundColor[0]
                : dataset.backgroundColor,
              opacity: 0.3
            }
          : undefined,
        smooth: dataset.tension ? true : false,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false
      }))

      return {
        title: { text: '', left: 'center' },
        tooltip: {
          trigger: 'axis',
          backgroundColor: isDarkMode ? '#333' : '#fff',
          borderColor: isDarkMode ? '#555' : '#ddd',
          textStyle: { color: isDarkMode ? '#fff' : '#333' }
        },
        legend: {
          data: data.datasets.map((dataset) => dataset.label),
          top: 0,
          textStyle: { color: isDarkMode ? '#e9e9e9' : '#333' }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: data.labels,
          axisLabel: {
            color: isDarkMode ? '#e9e9e9' : '#333',
            rotate: data.labels.length > 15 ? 45 : 0
          },
          axisLine: {
            lineStyle: { color: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)' }
          },
          splitLine: {
            lineStyle: { color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }
          }
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: isDarkMode ? '#e9e9e9' : '#333' },
          axisLine: {
            lineStyle: { color: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)' }
          },
          splitLine: {
            lineStyle: { color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }
          }
        },
        series: seriesData,
        backgroundColor: 'transparent',
        textStyle: { color: isDarkMode ? '#e9e9e9' : '#333' },
        animationDuration: 800,
        animationEasing: 'cubicOut'
      }
    }

    case 'wordCloud': {
      // 直接生成词云数据
      const cloudData = data.labels.map((label, index) => ({
        name: label,
        value: data.datasets[0].data[index]
      }))

      const colors = Array.isArray(data.datasets[0].backgroundColor)
        ? data.datasets[0].backgroundColor
        : [data.datasets[0].backgroundColor]

      return {
        tooltip: {
          show: true,
          formatter: (params: any) => `${params.name}: ${params.value}`,
          backgroundColor: isDarkMode ? '#333' : '#fff',
          textStyle: { color: isDarkMode ? '#fff' : '#333' }
        },
        series: [
          {
            type: 'wordCloud' as const,
            shape: 'circle',
            left: 'center',
            top: 'center',
            width: '90%',
            height: '90%',
            sizeRange: [12, 28],
            rotationRange: [-45, 45],
            rotationStep: 15,
            gridSize: 20,
            textStyle: {
              color: function () {
                return colors[Math.floor(Math.random() * colors.length)]
              },
              fontWeight: 'bold'
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.5)'
              }
            },
            data: cloudData
          }
        ],
        backgroundColor: 'transparent'
      }
    }

    default:
      throw new Error(`Unsupported chart type: ${chartType}`)
  }
}

// 异步图表容器组件
const AsyncChartContainer: React.FC<{
  chartType: 'pie' | 'bar' | 'line' | 'wordCloud'
  data: ChartData
  title: string
  height?: number
  vertical?: boolean
  highlightIndex?: number
  isDarkMode: boolean
}> = memo(
  ({ chartType, data, title, height = 350, vertical = true, highlightIndex, isDarkMode }) => {
    const [chartOption, setChartOption] = useState<EChartsOption | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const cacheKey = `chart-${chartType}-${title}-${JSON.stringify(data).slice(0, 100)}`

    useEffect(() => {
      const loadChart = async () => {
        setIsLoading(true)

        try {
          // 尝试从缓存获取渲染结果
          const cachedOption = editorMemoryManager.getCachedRenderResult(cacheKey)

          if (cachedOption) {
            setChartOption(cachedOption)
            setIsLoading(false)
            return
          }

          // 生成图表配置
          const option = generateChartConfig(chartType, data, {
            title,
            vertical,
            highlightIndex,
            isDarkMode
          })

          // 缓存渲染结果
          editorMemoryManager.cacheRenderResult(cacheKey, option)

          setChartOption(option)
          setIsLoading(false)
        } catch (error) {
          console.error('Chart generation failed:', error)
          setIsLoading(false)
        }
      }

      loadChart()
    }, [chartType, data, title, vertical, highlightIndex, isDarkMode, cacheKey])

    if (isLoading) {
      return (
        <div style={{ maxWidth: '100%', height, marginBottom: 16 }}>
          <Title
            heading={6}
            style={{ textAlign: 'center', marginBottom: 16, color: 'var(--semi-color-text-0)' }}
          >
            {title}
          </Title>
          <div
            style={{
              height: height - 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--semi-color-bg-1)',
              borderRadius: 8
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  border: '3px solid var(--semi-color-primary)',
                  borderTop: '3px solid transparent',
                  borderRadius: '50%',
                  margin: '0 auto 8px',
                  animation: 'spin 1s linear infinite'
                }}
              />
              <Text type="tertiary">图表生成中...</Text>
            </div>
          </div>
        </div>
      )
    }

    if (!chartOption) {
      return (
        <div style={{ maxWidth: '100%', height, marginBottom: 16 }}>
          <Title
            heading={6}
            style={{ textAlign: 'center', marginBottom: 16, color: 'var(--semi-color-text-0)' }}
          >
            {title}
          </Title>
          <div
            style={{
              height: height - 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--semi-color-bg-1)',
              borderRadius: 8
            }}
          >
            <Text type="tertiary">图表加载失败</Text>
          </div>
        </div>
      )
    }

    return (
      <div style={{ maxWidth: '100%', height, marginBottom: 16 }}>
        <Title
          heading={6}
          style={{ textAlign: 'center', marginBottom: 16, color: 'var(--semi-color-text-0)' }}
        >
          {title}
        </Title>
        {highlightIndex !== undefined && highlightIndex >= 0 && data.labels[highlightIndex] && (
          <Paragraph
            style={{ textAlign: 'center', marginBottom: 16, color: 'var(--semi-color-text-0)' }}
          >
            最活跃时段: {data.labels[highlightIndex]} ({data.datasets[0].data[highlightIndex]}%)
          </Paragraph>
        )}
        <ReactECharts
          option={chartOption}
          style={{ height: height - 50 }}
          notMerge={true}
          lazyUpdate={true}
          opts={{ renderer: 'canvas' }}
        />
      </div>
    )
  }
)

AsyncChartContainer.displayName = 'AsyncChartContainer'

// 写作效率趋势分析组件
const WritingEfficiencyTrend: React.FC<{
  statsData: StatsData | null
  activityData: ActivityData | null
  isDarkMode: boolean
}> = memo(({ statsData, activityData, isDarkMode }) => {
  // 计算写作效率数据
  const generateEfficiencyData = useCallback(() => {
    if (!statsData?.editsByDate || !activityData?.dailyActivity) return []

    const efficiencyData: Array<{
      date: string
      efficiency: number
      edits: number
      activeHours: number
    }> = []

    // 获取最近30天的数据
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      // 获取当天的编辑次数
      const dayEdits = statsData.editsByDate.find((item) => item.date === dateStr)?.count || 0

      // 获取当天的活跃小时数
      const dayActivity = activityData.dailyActivity[dateStr]
      const activeHours = dayActivity?.activeHours?.length || 0

      // 计算效率：编辑次数/活跃小时数（避免除零）
      const efficiency = activeHours > 0 ? dayEdits / activeHours : 0

      efficiencyData.push({
        date: dateStr,
        efficiency: Math.round(efficiency * 100) / 100, // 保留两位小数
        edits: dayEdits,
        activeHours
      })
    }

    return efficiencyData
  }, [statsData, activityData])

  // 生成效率数据 - 只调用一次并缓存结果
  const efficiencyData = generateEfficiencyData()

  const efficiencyOption: EChartsOption = {
    title: {
      text: '写作效率趋势分析',
      left: 'center',
      textStyle: {
        color: isDarkMode ? '#ffffff' : '#333333',
        fontSize: 16
      }
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const data = params[0]
        const efficiency = efficiencyData[data.dataIndex]
        return `${efficiency.date}<br/>
                效率指数: ${efficiency.efficiency}<br/>
                编辑次数: ${efficiency.edits}<br/>
                活跃小时: ${efficiency.activeHours}`
      }
    },
    grid: {
      left: '10%',
      right: '10%',
      top: '15%',
      bottom: '15%'
    },
    xAxis: {
      type: 'category',
      data: efficiencyData.map((item) => {
        const date = new Date(item.date)
        return `${date.getMonth() + 1}/${date.getDate()}`
      }),
      axisLabel: {
        color: isDarkMode ? '#ffffff' : '#333333',
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: isDarkMode ? '#ffffff' : '#333333'
      }
    },
    series: [
      {
        type: 'line',
        data: efficiencyData.map((item) => item.efficiency),
        smooth: true,
        lineStyle: {
          color: isDarkMode ? '#4299e1' : '#1890ff',
          width: 3
        },
        areaStyle: {
          color: isDarkMode ? 'rgba(66, 153, 225, 0.2)' : 'rgba(24, 144, 255, 0.2)'
        },
        symbolSize: 6
      }
    ]
  }

  return (
    <Card title="写作效率趋势" style={{ marginBottom: 16 }}>
      <ReactECharts
        option={efficiencyOption}
        style={{ height: '300px' }}
        notMerge={true}
        lazyUpdate={true}
        theme={isDarkMode ? 'dark' : 'light'}
      />
      <div style={{ marginTop: 16, fontSize: 12, color: 'var(--semi-color-text-2)' }}>
        * 效率指数 = 编辑次数 ÷ 活跃小时数，反映单位时间内的写作产出
      </div>
    </Card>
  )
})

// 内容质量评分组件
const ContentQualityScore: React.FC<{
  statsData: StatsData | null
  isDarkMode: boolean
}> = memo(({ statsData, isDarkMode }) => {
  // 计算内容质量评分
  const calculateQualityScore = useCallback(() => {
    if (!statsData)
      return {
        overall: 0,
        metrics: {
          consistency: 0, // 一致性：基于编辑频率的稳定性
          productivity: 0, // 生产力：基于笔记数量和编辑次数
          engagement: 0, // 参与度：基于活跃时段分布
          organization: 0, // 组织性：基于文件夹和标签使用
          depth: 0 // 深度：基于平均编辑长度
        }
      }

    const metrics = {
      consistency: 0, // 一致性：基于编辑频率的稳定性
      productivity: 0, // 生产力：基于笔记数量和编辑次数
      engagement: 0, // 参与度：基于活跃时段分布
      organization: 0, // 组织性：基于文件夹和标签使用
      depth: 0 // 深度：基于平均编辑长度
    }

    // 1. 一致性评分 (0-100)
    if (statsData.editsByDate && statsData.editsByDate.length > 0) {
      const editCounts = statsData.editsByDate.map((item) => item.count)
      const avgEdits = editCounts.reduce((sum, count) => sum + count, 0) / editCounts.length
      const variance =
        editCounts.reduce((sum, count) => sum + Math.pow(count - avgEdits, 2), 0) /
        editCounts.length
      const stdDev = Math.sqrt(variance)
      const consistencyScore = Math.max(0, 100 - (stdDev / avgEdits) * 100)
      metrics.consistency = Math.min(100, consistencyScore)
    }

    // 2. 生产力评分 (0-100)
    const totalNotes = statsData.totalNotes || 0
    const totalEdits = statsData.totalEdits || 0
    const productivityScore = Math.min(100, totalNotes * 2 + totalEdits * 0.5)
    metrics.productivity = productivityScore

    // 3. 参与度评分 (0-100)
    if (statsData.editTimeDistribution && statsData.editTimeDistribution.length > 0) {
      const activeHours = statsData.editTimeDistribution.filter((item) => item.count > 0).length
      const engagementScore = (activeHours / 24) * 100
      metrics.engagement = engagementScore
    }

    // 4. 组织性评分 (0-100)
    const folderCount = statsData.topFolders?.length || 0
    const tagCount = statsData.topTags?.length || 0
    const organizationScore = Math.min(100, folderCount * 10 + tagCount * 5)
    metrics.organization = organizationScore

    // 5. 深度评分 (0-100)
    const avgEditLength = statsData.averageEditLength || 0
    const depthScore = Math.min(100, avgEditLength / 10) // 假设1000字符为满分
    metrics.depth = depthScore

    // 计算总体评分
    const overall =
      Object.values(metrics).reduce((sum, score) => sum + score, 0) / Object.keys(metrics).length

    return { overall: parseFloat(overall.toFixed(2)), metrics }
  }, [statsData])

  const { overall, metrics } = calculateQualityScore()

  const scoreOption: EChartsOption = {
    title: {
      text: '内容质量评分分布',
      left: 'center',
      textStyle: {
        color: isDarkMode ? '#ffffff' : '#333333',
        fontSize: 16
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        return `${params.name}: ${params.value}分`
      }
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '60%'],
        data: [
          { name: '一致性', value: metrics.consistency || 0 },
          { name: '生产力', value: metrics.productivity || 0 },
          { name: '参与度', value: metrics.engagement || 0 },
          { name: '组织性', value: metrics.organization || 0 },
          { name: '深度', value: metrics.depth || 0 }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        label: {
          show: true,
          formatter: '{b}: {c}分'
        }
      }
    ]
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#52c41a'
    if (score >= 60) return '#faad14'
    if (score >= 40) return '#ff7875'
    return '#ff4d4f'
  }

  return (
    <Card title="内容质量评分" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <div
          style={{
            fontSize: 48,
            fontWeight: 'bold',
            color: getScoreColor(overall),
            marginRight: 16
          }}
        >
          {overall.toFixed(2)}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 'bold' }}>总体评分</div>
          <div style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>
            基于写作习惯和内容质量的综合评估
          </div>
        </div>
      </div>
      <ReactECharts
        option={scoreOption}
        style={{ height: '300px' }}
        notMerge={true}
        lazyUpdate={true}
        theme={isDarkMode ? 'dark' : 'light'}
      />
    </Card>
  )
})

const DataAnalysis: React.FC = () => {
  const { isDarkMode } = useTheme()
  const { t } = useLanguage()
  const {
    isAnalyzing,
    analysisCached,
    analysisResult,
    error,
    progress,
    selectedModelId,
    startAnalysis,
    setSelectedModelId,
    setAnalysisResult,
    resetCacheStatus
  } = useAnalysisStore()

  // 用于跟踪当前显示的Toast类型，避免重复显示
  const currentToastType = useRef<string | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [statsData, setStatsData] = useState<StatsData | null>(null)
  const [activityData, setActivityData] = useState<ActivityData | null>(null)
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string }>>([])
  const analysisContainerRef = useRef<HTMLDivElement>(null)
  const [cacheDate, setCacheDate] = useState<string | null>(null)
  const [useKnowledgeGraph, setUseKnowledgeGraph] = useState<boolean>(true) // 是否使用知识图谱
  const currentAnalyzingToastRef = useRef<any>(null) // 用于存储当前分析中的Toast引用
  const currentCachedToastRef = useRef<any>(null) // 用于存储当前缓存Toast引用
  const [isInitializing, setIsInitializing] = useState<boolean>(true) // 跟踪是否处于初始化阶段

  // 统一的Toast清理函数
  const clearAnalyzingToast = (): void => {
    if (currentAnalyzingToastRef.current) {
      try {
        currentAnalyzingToastRef.current.destroy()
      } catch {
        // Toast清理失败，继续执行
      } finally {
        currentAnalyzingToastRef.current = null
      }
    }
  }

  // 缓存Toast清理函数
  const clearCachedToast = (): void => {
    if (currentCachedToastRef.current) {
      try {
        Toast.close(currentCachedToastRef.current)
      } catch {
        // Toast清理失败，继续执行
      } finally {
        currentCachedToastRef.current = null
      }
    }
  }

  // 设置分析Toast并添加超时保护
  const setAnalyzingToastWithTimeout = (toastInstance: any): void => {
    currentAnalyzingToastRef.current = toastInstance

    // 设置超时保护，确保Toast最终会被清除（30秒超时）
    setTimeout(() => {
      if (currentAnalyzingToastRef.current === toastInstance) {
        clearAnalyzingToast()
      }
    }, 30000)
  }

  // 响应式Toast管理：根据分析状态自动显示相应的Toast
  const showToastByState = (
    analyzing: boolean,
    cached: boolean,
    error: any,
    forceUpdate: boolean = false
  ): void => {
    const newToastType = analyzing
      ? forceUpdate
        ? 'reanalyzing'
        : 'analyzing'
      : error
        ? 'error'
        : cached
          ? 'cached'
          : 'completed'

    // 避免重复显示相同类型的Toast
    if (currentToastType.current === newToastType) {
      return
    }

    // 如果之前有分析中的Toast，先清除它
    if (currentAnalyzingToastRef.current && !analyzing) {
      clearAnalyzingToast()
    }

    // 如果要显示新的缓存Toast，先清除之前的缓存Toast
    if (newToastType === 'cached' && currentCachedToastRef.current) {
      clearCachedToast()
    }

    currentToastType.current = newToastType

    switch (newToastType) {
      case 'analyzing':
        setAnalyzingToastWithTimeout(
          Toast.info({
            content: '正在分析数据...',
            duration: 0 // 分析期间持续显示
          })
        )
        break
      case 'error':
        Toast.error({
          content: `分析失败: ${error.message || error}`,
          duration: 5000 // 5秒后自动关闭
        })
        break
      case 'completed':
        Toast.success({
          content: '分析完成',
          duration: 3000 // 3秒后自动关闭
        })
        break
    }
  }

  // 初始化
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await Promise.all([fetchData(), loadAvailableModels(), loadCachedAnalysisResult()])
      } finally {
        // 初始化完成，允许显示Toast
        setIsInitializing(false)
      }
    }

    initializeApp()
  }, [])

  // 响应式Toast状态监听：基于分析状态自动管理Toast显示
  useEffect(() => {
    // 根据当前状态决定Toast显示
    if (isAnalyzing) {
      // 正在分析中，Toast在showToastByState中处理
      return
    }

    // 分析完成，根据结果显示相应Toast
    if (error) {
      showToastByState(false, false, error)
    } else if (analysisCached && !isInitializing) {
      // 只有在非初始化阶段才显示缓存Toast
      showToastByState(false, true, null)
    } else if (analysisResult && !analysisCached) {
      // 只有在非缓存结果时才显示完成Toast
      showToastByState(false, false, null)
    }

    // 清理函数：重置Toast类型状态并清理Toast引用
    return () => {
      if (!isAnalyzing) {
        currentToastType.current = null
        // 确保清理任何残留的Toast引用
        clearAnalyzingToast()
        clearCachedToast()
      }
    }
  }, [isAnalyzing, error, analysisCached, analysisResult, isInitializing])

  // 组件卸载时清理所有Toast引用
  useEffect(() => {
    return () => {
      clearAnalyzingToast()
      clearCachedToast()
      currentToastType.current = null
    }
  }, [])

  // 加载缓存的分析结果（仅在初始化时使用）
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

        // 标记为缓存结果，但不显示Toast（因为这是自动加载）
        // Toast提示将由useEffect根据analysisCached状态自动处理

        // 如果分析容器存在，滚动到顶部显示结果
        if (analysisContainerRef.current) {
          analysisContainerRef.current.scrollTop = 0
        }
      }
    } catch {
      // 初始化时的缓存加载失败不显示错误Toast，避免干扰用户
      // 初始化时加载缓存失败，将等待用户手动触发分析
    } finally {
      // 无论成功失败，都结束加载状态
      setIsLoading(false)
    }
  }

  // 加载可用的AI模型
  const loadAvailableModels = async (): Promise<void> => {
    try {
      const configs = await modelSelectionService.getAvailableModels()

      // 转换为下拉菜单选项格式
      const models = configs.map((config) => ({
        id: config.id,
        name: config.name
      }))

      setAvailableModels(models)

      // 获取当前选中的模型ID
      const currentSelectedId = await modelSelectionService.getSelectedModelId()
      if (currentSelectedId && models.some((model) => model.id === currentSelectedId)) {
        setSelectedModelId(currentSelectedId)
      } else if (models.length > 0) {
        // 如果没有选中模型或选中的模型不存在，初始化默认模型
        await modelSelectionService.initializeDefaultModel()
        const newSelectedId = await modelSelectionService.getSelectedModelId()
        setSelectedModelId(newSelectedId)
      }
    } catch (error) {
      console.error('加载AI模型失败:', error)
      Toast.error({
        content: '加载AI模型失败'
      })
    }
  }

  // 加载数据
  const fetchData = async (): Promise<void> => {
    setIsLoading(true)
    try {
      // 获取笔记统计数据
      const statsResult = await window.api.analytics.getNoteHistoryStats()
      if (!statsResult.success) {
        Toast.error({
          content: `加载统计数据失败: ${statsResult.error}`
        })
        setIsLoading(false)
        return
      }
      setStatsData(statsResult.stats || null)

      // 获取用户活动数据
      const activityResult = await window.api.analytics.getUserActivityData(30) // 获取30天的数据
      if (!activityResult.success) {
        Toast.error({
          content: `加载活动数据失败: ${activityResult.error}`
        })
        setIsLoading(false)
        return
      }
      setActivityData(activityResult.activityData || null)
    } catch (error) {
      Toast.error({
        content: `加载数据失败: ${error instanceof Error ? error.message : String(error)}`
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 执行分析的包装函数
  const handlePerformAnalysis = async (userTriggered: boolean = true): Promise<void> => {
    if (!selectedModelId) {
      Toast.error({
        content: '请先选择AI模型'
      })
      return
    }

    try {
      // 用户主动触发的分析总是强制更新（跳过缓存）
      const forceUpdate = userTriggered

      // 用户主动分析时，确保不在初始化状态并重置所有缓存相关状态
      if (userTriggered) {
        setIsInitializing(false)
        setCacheDate(null)
        // 重置缓存状态，确保用户主动分析时不显示缓存相关UI
        resetCacheStatus()
      }

      // 显示分析开始的Toast
      showToastByState(true, false, null, forceUpdate)

      // 执行分析逻辑，用户主动触发时总是强制更新
      await startAnalysis(selectedModelId, forceUpdate)

      // 如果是新分析结果，更新缓存日期为今天
      if (!analysisCached || forceUpdate) {
        setCacheDate(new Date().toISOString().split('T')[0])
      }

      // 分析完成后，滚动到内容顶部
      if (analysisContainerRef.current) {
        analysisContainerRef.current.scrollTop = 0
      }

      // Toast显示由useEffect自动处理，不需要手动管理
    } catch {
      // 错误Toast也由useEffect自动处理
    }
  }

  // 渲染饼图
  const renderPieChart = (data: ChartData, title: string): JSX.Element => {
    // 将ChartData格式转换为ECharts所需的格式
    const seriesData = data.labels.map((label, index) => {
      return {
        name: label,
        value: data.datasets[0].data[index]
      }
    })

    // 设置饼图颜色，如果提供了backgroundColor则使用，否则使用默认颜色方案
    const colors = Array.isArray(data.datasets[0].backgroundColor)
      ? data.datasets[0].backgroundColor
      : [data.datasets[0].backgroundColor]

    // 构建ECharts配置
    const option: EChartsOption = {
      title: {
        text: '',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
        backgroundColor: isDarkMode ? '#333' : '#fff',
        borderColor: isDarkMode ? '#555' : '#ddd',
        textStyle: {
          color: isDarkMode ? '#fff' : '#333'
        }
      },
      legend: {
        orient: 'horizontal',
        bottom: 0,
        data: data.labels,
        textStyle: {
          color: isDarkMode ? '#e9e9e9' : '#333'
        }
      },
      series: [
        {
          name: data.datasets[0].label,
          type: 'pie',
          radius: '70%',
          center: ['50%', '45%'],
          data: seriesData,
          label: {
            show: true,
            formatter: '{b}: {d}%',
            color: isDarkMode ? '#e9e9e9' : '#333'
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          itemStyle: {
            borderWidth: data.datasets[0].borderWidth || 1,
            borderColor: isDarkMode ? '#1c1c1c' : '#fff'
          },
          animationDuration: 1000,
          animationEasing: 'cubicOut'
        }
      ],
      color: colors,
      backgroundColor: 'transparent',
      textStyle: {
        color: isDarkMode ? '#e9e9e9' : '#333'
      }
    }

    return (
      <div style={{ maxWidth: '100%', height: 350, marginBottom: 16 }}>
        <Title
          heading={6}
          style={{ textAlign: 'center', marginBottom: 16, color: 'var(--semi-color-text-0)' }}
        >
          {title}
        </Title>
        <ReactECharts option={option} style={{ height: 300 }} notMerge={true} lazyUpdate={true} opts={{ renderer: 'canvas' }} />
      </div>
    )
  }

  // 渲染柱状图
  const renderBarChart = (
    data: ChartData,
    title: string,
    vertical: boolean = true,
    highlightIndex?: number
  ): JSX.Element => {
    // 准备系列数据
    const seriesData = data.datasets.map((dataset) => {
      return {
        name: dataset.label,
        type: 'bar' as const, // 显式类型转换
        data: dataset.data,
        itemStyle: {
          color: (params) => {
            // 如果有高亮索引，则高亮显示该索引的数据点
            if (highlightIndex !== undefined && params.dataIndex === highlightIndex) {
              return 'rgba(255, 99, 132, 0.8)' // 高亮颜色
            }

            // 使用数据集提供的颜色
            if (Array.isArray(dataset.backgroundColor)) {
              return dataset.backgroundColor[params.dataIndex] || dataset.backgroundColor[0]
            }
            return dataset.backgroundColor
          }
        },
        barWidth: vertical ? '60%' : undefined,
        barCategoryGap: '30%',
        label: {
          show: false
        }
      }
    })

    // 构建ECharts配置
    const option: EChartsOption = {
      title: {
        text: '',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        backgroundColor: isDarkMode ? '#333' : '#fff',
        borderColor: isDarkMode ? '#555' : '#ddd',
        textStyle: {
          color: isDarkMode ? '#fff' : '#333'
        }
      },
      legend: {
        data: data.datasets.map((dataset) => dataset.label),
        top: 0,
        textStyle: {
          color: isDarkMode ? '#e9e9e9' : '#333'
        }
      },
      grid: {
        left: vertical ? '3%' : '15%',
        right: '4%',
        bottom: vertical ? '10%' : '3%',
        top: vertical ? '15%' : '10%',
        containLabel: true
      },
      xAxis: vertical
        ? {
            type: 'category',
            data: data.labels,
            axisLabel: {
              color: isDarkMode ? '#e9e9e9' : '#333',
              rotate: data.labels.length > 10 ? 45 : 0
            },
            axisLine: {
              lineStyle: {
                color: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
              }
            },
            splitLine: {
              lineStyle: {
                color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
              }
            }
          }
        : {
            type: 'value',
            axisLabel: {
              color: isDarkMode ? '#e9e9e9' : '#333'
            },
            axisLine: {
              lineStyle: {
                color: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
              }
            },
            splitLine: {
              lineStyle: {
                color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
              }
            }
          },
      yAxis: vertical
        ? {
            type: 'value',
            axisLabel: {
              color: isDarkMode ? '#e9e9e9' : '#333'
            },
            axisLine: {
              lineStyle: {
                color: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
              }
            },
            splitLine: {
              lineStyle: {
                color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
              }
            }
          }
        : {
            type: 'category',
            data: data.labels,
            axisLabel: {
              color: isDarkMode ? '#e9e9e9' : '#333'
            },
            axisLine: {
              lineStyle: {
                color: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
              }
            },
            splitLine: {
              lineStyle: {
                color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
              }
            }
          },
      series: seriesData,
      backgroundColor: 'transparent',
      textStyle: {
        color: isDarkMode ? '#e9e9e9' : '#333'
      },
      animationDuration: 1000,
      animationEasing: 'cubicOut'
    }

    return (
      <div style={{ maxWidth: '100%', height: vertical ? 350 : 250, marginBottom: 16 }}>
        <Title
          heading={6}
          style={{ textAlign: 'center', marginBottom: 16, color: 'var(--semi-color-text-0)' }}
        >
          {title}
        </Title>
        {highlightIndex !== undefined && highlightIndex >= 0 && data.labels[highlightIndex] && (
          <Paragraph
            style={{ textAlign: 'center', marginBottom: 16, color: 'var(--semi-color-text-0)' }}
          >
            最活跃时段: {data.labels[highlightIndex]} ({data.datasets[0].data[highlightIndex]}%)
          </Paragraph>
        )}
        <ReactECharts
          option={option}
          style={{ height: vertical ? 300 : 200 }}
          notMerge={true}
          lazyUpdate={true}
          opts={{ renderer: 'canvas' }}
        />
      </div>
    )
  }

  // 渲染折线图
  const renderLineChart = (data: ChartData, title: string): JSX.Element => {
    // 准备系列数据
    const seriesData = data.datasets.map((dataset) => {
      return {
        name: dataset.label,
        type: 'line' as const, // 显式类型转换
        data: dataset.data,
        itemStyle: {
          color: Array.isArray(dataset.borderColor) ? dataset.borderColor[0] : dataset.borderColor
        },
        lineStyle: {
          width: dataset.borderWidth || 2,
          type: 'solid',
          color: Array.isArray(dataset.borderColor) ? dataset.borderColor[0] : dataset.borderColor
        },
        areaStyle: dataset.backgroundColor
          ? {
              color: Array.isArray(dataset.backgroundColor)
                ? dataset.backgroundColor[0]
                : dataset.backgroundColor,
              opacity: 0.3
            }
          : undefined,
        smooth: dataset.tension ? true : false,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false // 只在鼠标悬停或数据点较少时显示标记
      }
    })

    // 构建ECharts配置
    const option: EChartsOption = {
      title: {
        text: '',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDarkMode ? '#333' : '#fff',
        borderColor: isDarkMode ? '#555' : '#ddd',
        textStyle: {
          color: isDarkMode ? '#fff' : '#333'
        }
      },
      legend: {
        data: data.datasets.map((dataset) => dataset.label),
        top: 0,
        textStyle: {
          color: isDarkMode ? '#e9e9e9' : '#333'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.labels,
        axisLabel: {
          color: isDarkMode ? '#e9e9e9' : '#333',
          rotate: data.labels.length > 15 ? 45 : 0
        },
        axisLine: {
          lineStyle: {
            color: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
          }
        },
        splitLine: {
          lineStyle: {
            color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: isDarkMode ? '#e9e9e9' : '#333'
        },
        axisLine: {
          lineStyle: {
            color: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
          }
        },
        splitLine: {
          lineStyle: {
            color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      series: seriesData,
      backgroundColor: 'transparent',
      textStyle: {
        color: isDarkMode ? '#e9e9e9' : '#333'
      },
      animationDuration: 1000,
      animationEasing: 'cubicOut'
    }

    return (
      <div style={{ maxWidth: '100%', height: 350, marginBottom: 16 }}>
        <Title
          heading={6}
          style={{ textAlign: 'center', marginBottom: 16, color: 'var(--semi-color-text-0)' }}
        >
          {title}
        </Title>
        <ReactECharts option={option} style={{ height: 300 }} notMerge={true} lazyUpdate={true} opts={{ renderer: 'canvas' }} />
      </div>
    )
  }

  // 渲染标签云
  const renderTagCloud = (data: ChartData, title: string): JSX.Element => {
    // 准备词云数据，保持对原始数据格式的兼容性
    const cloudData = data.labels.map((label, index) => {
      return {
        name: label,
        value: data.datasets[0].data[index]
      }
    })

    // 提取颜色列表
    const colors = Array.isArray(data.datasets[0].backgroundColor)
      ? data.datasets[0].backgroundColor
      : [data.datasets[0].backgroundColor]

    // 构建ECharts配置
    const option: EChartsOption = {
      tooltip: {
        show: true,
        formatter: (params: any) => {
          return `${params.name}: ${params.value}`
        },
        backgroundColor: isDarkMode ? '#333' : '#fff',
        textStyle: {
          color: isDarkMode ? '#fff' : '#333'
        }
      },
      series: [
        {
          type: 'wordCloud' as const,
          shape: 'circle',
          left: 'center',
          top: 'center',
          width: '90%',
          height: '90%',
          sizeRange: [12, 28], // 字体大小范围
          rotationRange: [-45, 45], // 旋转角度范围
          rotationStep: 15, // 旋转步进角度
          gridSize: 20, // 词之间的间距
          textStyle: {
            color: function () {
              // 随机返回颜色数组中的一种颜色
              return colors[Math.floor(Math.random() * colors.length)]
            },
            fontWeight: 'bold'
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.5)'
            }
          },
          data: cloudData
        }
      ],
      backgroundColor: 'transparent'
    }

    return (
      <div style={{ maxWidth: '100%', height: 350, marginBottom: 16 }}>
        <Title
          heading={6}
          style={{ textAlign: 'center', marginBottom: 16, color: 'var(--semi-color-text-0)' }}
        >
          {title}
        </Title>
        <ReactECharts option={option} style={{ height: '300px' }} notMerge={true} lazyUpdate={true} opts={{ renderer: 'canvas' }} />
      </div>
    )
  }

  // 渲染标签关系图（使用饼图模拟简单的关系网络图）
  const renderTagRelations = (
    data: { source: string; target: string; strength: number }[],
    title: string
  ): JSX.Element => {
    // 将关系数据转换为适合显示的格式 - 一次遍历处理所有数据
    const processedData = data.map((relation) => ({
      label: `${relation.source} ↔ ${relation.target}`,
      value: relation.strength
    }))

    const relationLabels = processedData.map((item) => item.label)
    const relationValues = processedData.map((item) => item.value)

    // 为每个关系生成颜色
    const colors = generateColors(relationLabels.length)

    // 创建ECharts饼图数据
    const seriesData = processedData.map((item, index) => {
      return {
        name: item.label,
        value: item.value,
        itemStyle: {
          color: colors[index]
        }
      }
    })

    // 构建ECharts配置
    const option: EChartsOption = {
      title: {
        text: '',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          return `${params.name}: ${params.value} 次共现`
        },
        backgroundColor: isDarkMode ? '#333' : '#fff',
        borderColor: isDarkMode ? '#555' : '#ddd',
        textStyle: {
          color: isDarkMode ? '#fff' : '#333'
        }
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        type: 'scroll',
        data: relationLabels.map((label) => {
          // 限制标签长度，避免过长
          return label.length > 25 ? label.substring(0, 22) + '...' : label
        }),
        textStyle: {
          color: isDarkMode ? '#e9e9e9' : '#333'
        }
      },
      series: [
        {
          name: '关联强度',
          type: 'pie' as const, // 显式类型转换
          radius: '70%',
          center: ['40%', '50%'],
          data: seriesData,
          label: {
            show: false
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          animationDuration: 1000,
          animationEasing: 'cubicOut'
        }
      ],
      backgroundColor: 'transparent',
      textStyle: {
        color: isDarkMode ? '#e9e9e9' : '#333'
      }
    }

    return (
      <div style={{ maxWidth: '100%', height: 500, marginBottom: 16 }}>
        <Title
          heading={6}
          style={{ textAlign: 'center', marginBottom: 16, color: 'var(--semi-color-text-0)' }}
        >
          {title}
        </Title>
        <div style={{ height: '380px', overflowY: 'auto' }}>
          <ReactECharts option={option} style={{ height: '100%' }} notMerge={true} lazyUpdate={true} opts={{ renderer: 'canvas' }} />
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

  // 将标签关系数据转换为知识图谱数据格式（适配ECharts）
  const convertTagRelationsToGraphData = useCallback(
    (
      relations: { source: string; target: string; strength: number }[],
      topTags?: Array<{ tag: string; count: number }>
    ): GraphData => {
      // 创建标签节点映射，以计算节点的值和颜色
      const tagMap = new Map<string, { count: number; color: string }>()

      // 将所有标签添加到映射中
      relations.forEach((rel) => {
        if (!tagMap.has(rel.source)) {
          tagMap.set(rel.source, {
            count: 0,
            color: `hsla(${Math.floor(Math.random() * 360)}, 70%, 60%, 0.8)`
          })
        }

        if (!tagMap.has(rel.target)) {
          tagMap.set(rel.target, {
            count: 0,
            color: `hsla(${Math.floor(Math.random() * 360)}, 70%, 60%, 0.8)`
          })
        }

        // 累加标签出现次数
        tagMap.get(rel.source)!.count += rel.strength
        tagMap.get(rel.target)!.count += rel.strength
      })

      // 如果有topTags数据，使用它来获取更准确的计数和颜色
      if (topTags) {
        topTags.forEach((tag, index) => {
          const hue = (index * 137.5) % 360 // 使用黄金角分布颜色
          if (tagMap.has(tag.tag)) {
            tagMap.set(tag.tag, {
              count: tag.count,
              color: `hsla(${hue}, 70%, 60%, 0.8)`
            })
          }
        })
      }

      // 创建节点数组 - 适配ECharts格式
      const nodes: GraphNode[] = Array.from(tagMap.keys()).map((tag) => {
        const count = tagMap.get(tag)!.count
        const color = tagMap.get(tag)!.color
        return {
          id: tag,
          name: tag,
          val: count, // 保持原有字段兼容性
          value: count, // ECharts使用value属性
          symbolSize: Math.sqrt(count) * 5, // 根据数量设置节点大小
          itemStyle: {
            color: color // 设置节点颜色
          },
          label: {
            show: true,
            formatter: '{b}: {c}' // 显示名称和值
          }
        }
      })

      // 创建链接数组 - 适配ECharts格式
      const links: GraphLink[] = relations.map((rel) => ({
        source: rel.source,
        target: rel.target,
        value: rel.strength, // 连接强度
        lineStyle: {
          width: Math.min(rel.strength / 5 + 1, 6), // 根据强度设置线宽
          color: 'source' // 使用源节点的颜色
        }
      }))

      return { nodes, links }
    },
    []
  )

  // 渲染知识图谱
  const renderKnowledgeGraph = useCallback(
    (
      data: { source: string; target: string; strength: number }[],
      title: string,
      topTags?: Array<{ tag: string; count: number }>
    ): JSX.Element => {
      const graphData = convertTagRelationsToGraphData(data, topTags)

      // 创建一个响应式的高度，确保在移动设备上有良好的体验
      const graphHeight = window.innerWidth < 768 ? 450 : 550

      // 构建ECharts图表配置
      const option = {
        tooltip: {
          trigger: 'item',
          formatter: (params) => {
            if (params.dataType === 'node') {
              return `${params.name}: ${params.value} 次使用`
            }
            if (params.dataType === 'edge') {
              return `${params.data.source} → ${params.data.target}: ${params.data.value} 次共现`
            }
            return ''
          }
        },
        series: [
          {
            type: 'graph',
            layout: 'force',
            data: graphData.nodes,
            links: graphData.links,
            roam: true, // 启用缩放和平移
            draggable: true, // 节点可拖拽
            label: {
              show: true,
              position: 'right',
              color: isDarkMode ? '#e9e9e9' : '#333',
              fontSize: 12
            },
            lineStyle: {
              color: 'source',
              curveness: 0.3 // 添加一点曲率，使线条更美观
            },
            // 力导向图相关配置
            force: {
              repulsion: 120, // 节点之间的斥力
              gravity: 0.1, // 向心力
              edgeLength: 100, // 连接线长度
              friction: 0.6 // 摩擦力
            },
            // 是否启用缩放和平移的极限控制
            scaleLimit: {
              min: 0.3, // 最小缩放比例
              max: 5 // 最大缩放比例
            },
            // 添加动画效果
            animationDuration: 1500,
            animationEasingUpdate: 'quinticInOut'
          }
        ],
        backgroundColor: isDarkMode ? '#1c1c1c' : '#f8f8f8'
      }

      return (
        <div style={{ maxWidth: '100%', height: graphHeight + 50, marginBottom: 16 }}>
          <Title
            heading={6}
            style={{ textAlign: 'center', marginBottom: 16, color: 'var(--semi-color-text-0)' }}
          >
            {title}
          </Title>
          <div
            style={{
              height: `${graphHeight}px`,
              border: '1px solid var(--semi-color-border)',
              borderRadius: '4px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
            }}
          >
          <ReactECharts
            option={option}
            style={{ height: '100%', width: '100%' }}
            notMerge={true}
            lazyUpdate={true}
            onEvents={{
              click: () => {
                // 标签点击事件处理
              }
            }}
            opts={{ renderer: 'canvas' }} // 使用canvas渲染器提高性能
          />
          </div>
        </div>
      )
    },
    [isDarkMode, convertTagRelationsToGraphData]
  )

  // 准备图表数据
  // 图表数据准备函数 - 使用 useMemo 优化性能
  const prepareChartData = useMemo((): {
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

    // 1. 编辑时间分布图表（24小时） - 合并map操作
    const editTimeData = statsData.editTimeDistribution.map((item) => ({
      label: `${item.hour}点:00`,
      count: item.count
    }))

    const hourlyDistribution: ChartData = {
      labels: editTimeData.map((item) => item.label),
      datasets: [
        {
          label: '编辑次数',
          data: editTimeData.map((item) => item.count),
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }
      ]
    }

    // 2. 最常编辑的笔记（饼图） - 合并map操作
    const notesData = statsData.mostEditedNotes.map((note) => {
      // 从文件路径中提取文件名，限制长度
      const fileName = note.filePath.split('/').pop() || ''
      return {
        label: fileName.length > 15 ? fileName.substring(0, 15) + '...' : fileName,
        count: note.count || 0
      }
    })

    const topNotes: ChartData = {
      labels: notesData.map((item) => item.label),
      datasets: [
        {
          label: '编辑次数',
          data: notesData.map((item) => item.count),
          backgroundColor: generateColors(statsData.mostEditedNotes.length),
          borderColor: generateColors(statsData.mostEditedNotes.length, 1),
          borderWidth: 1
        }
      ]
    }

    // 3. 每日编辑次数趋势（折线图） - 合并map操作
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

    // 5. 最常用的文件夹（柱状图） - 合并map操作
    if (statsData.topFolders && statsData.topFolders.length > 0) {
      const foldersData = statsData.topFolders.map((folder) => ({
        label: folder.folder,
        count: folder.count
      }))

      topFolders = {
        labels: foldersData.map((item) => item.label),
        datasets: [
          {
            label: '使用次数',
            data: foldersData.map((item) => item.count),
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
    let totalActiveDays = 0
    if (activityData.dailyActivity) {
      Object.values(activityData.dailyActivity).forEach((day) => {
        if (day.activeHours && Array.isArray(day.activeHours)) {
          // 计算去重后的活跃天数（每个日期记一次）
          totalActiveDays += 1

          // 统计每个小时的活跃天数
          day.activeHours.forEach((hour: number) => {
            activeHoursData[hour] = (activeHoursData[hour] || 0) + 1
          })
        }
      })
    }

    // 计算每个小时活跃的百分比
    const activeHoursWithPercentage = Object.entries(activeHoursData).map(([hour, count]) => {
      const percentage = totalActiveDays > 0 ? Math.round((count / totalActiveDays) * 100) : 0
      return {
        hour: parseInt(hour),
        count,
        percentage
      }
    })

    // 按小时排序
    activeHoursWithPercentage.sort((a, b) => a.hour - b.hour)

    // 定义时段标签
    const getTimeSlotLabel = (hour: number): string => {
      if (hour >= 0 && hour < 6) return `凌晨${hour}点 (${hour}:00)`
      if (hour >= 6 && hour < 12) return `上午${hour}点 (${hour}:00)`
      if (hour === 12) return `中午${hour}点 (${hour}:00)`
      if (hour > 12 && hour < 18) return `下午${hour - 12}点 (${hour}:00)`
      return `晚上${hour - 12}点 (${hour}:00)`
    }

    // 找出活跃度最高的时段
    const mostActiveHour = [...activeHoursWithPercentage].sort(
      (a, b) => b.percentage - a.percentage
    )[0]

    const activeHours: ChartData = {
      labels: activeHoursWithPercentage.map((item) => getTimeSlotLabel(item.hour)),
      datasets: [
        {
          label: '活跃度(%)',
          data: activeHoursWithPercentage.map((item) => item.percentage),
          backgroundColor: activeHoursWithPercentage.map((item) => {
            // 为最活跃时段使用特殊颜色
            if (item.hour === mostActiveHour.hour) {
              return 'rgba(255, 99, 132, 0.8)'
            }
            // 为不同时段使用不同颜色
            if (item.hour >= 0 && item.hour < 6) return 'rgba(153, 102, 255, 0.5)' // 凌晨
            if (item.hour >= 6 && item.hour < 12) return 'rgba(54, 162, 235, 0.5)' // 上午
            if (item.hour >= 12 && item.hour < 18) return 'rgba(255, 206, 86, 0.5)' // 下午
            return 'rgba(75, 192, 192, 0.5)' // 晚上
          }),
          borderColor: activeHoursWithPercentage.map((item) => {
            if (item.hour === mostActiveHour.hour) {
              return 'rgba(255, 99, 132, 1)'
            }
            if (item.hour >= 0 && item.hour < 6) return 'rgba(153, 102, 255, 1)'
            if (item.hour >= 6 && item.hour < 12) return 'rgba(54, 162, 235, 1)'
            if (item.hour >= 12 && item.hour < 18) return 'rgba(255, 206, 86, 1)'
            return 'rgba(75, 192, 192, 1)'
          }),
          borderWidth: 1
        }
      ]
    }

    // 7. 最常用的标签（标签云） - 合并map操作
    let topTags: ChartData | undefined = undefined
    if (statsData.topTags && statsData.topTags.length > 0) {
      const tagsData = statsData.topTags.map((tag) => ({
        label: tag.tag,
        count: tag.count
      }))

      topTags = {
        labels: tagsData.map((item) => item.label),
        datasets: [
          {
            label: '使用次数',
            data: tagsData.map((item) => item.count),
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
  }, [statsData, activityData, isDarkMode])

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

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--semi-color-bg-0)'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid var(--semi-color-border)',
          backgroundColor: 'var(--semi-color-bg-1)',
          flexShrink: 0
        }}
      >
        <Title heading={3} style={{ margin: 0, color: 'var(--semi-color-text-0)' }}>
          笔记数据分析
        </Title>
        <Space>
          <Select
            placeholder={t('placeholder.modelSelect')}
            value={selectedModelId || undefined}
            onChange={async (value) => {
              const modelId = value as string
              setSelectedModelId(modelId)
              try {
                await modelSelectionService.setSelectedModelId(modelId)
              } catch (error) {
                console.error('保存选中模型失败:', error)
                Toast.error({
                  content: '保存模型选择失败'
                })
              }
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
                  await window.api.analytics.resetAnalysisCache?.()
                  Toast.success({
                    content: '分析缓存已重置'
                  })
                } catch {
                  Toast.error({
                    content: '重置缓存失败'
                  })
                }
              }}
            >
              重置缓存
            </Button>
          )}
        </Space>
      </div>
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          ref={analysisContainerRef}
          className="settings-scroll-container data-analysis"
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '20px 24px',
            maxWidth: '1400px',
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box'
          }}
        >
          {(isLoading || (isAnalyzing && !analysisResult)) && (
            <div style={{ position: 'relative', minHeight: '600px' }}>
              <DataAnalysisSkeleton
                style={{
                  width: '100%',
                  minHeight: '600px'
                }}
              />
              {isAnalyzing && (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'var(--semi-color-bg-0)',
                    padding: '20px',
                    borderRadius: '8px',
                    boxShadow: 'var(--semi-shadow-elevated)',
                    textAlign: 'center',
                    zIndex: 10
                  }}
                >
                  <Paragraph style={{ marginBottom: 16 }}>
                    {isAnalyzing ? '正在使用AI分析您的笔记数据...' : '正在加载数据...'}
                  </Paragraph>
                  <div style={{ maxWidth: '300px', margin: '0 auto' }}>
                    <Progress percent={progress} showInfo />
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div style={{ marginTop: 24, textAlign: 'center', color: 'var(--semi-color-danger)' }}>
              <Paragraph>{typeof error === 'string' ? error : error.message}</Paragraph>
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
            <div style={{ paddingBottom: 24 }}>
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
                  <Text type="secondary">
                    分析正在背景中继续进行，您可以安全地切换到其它界面...
                  </Text>
                  <div style={{ maxWidth: '500px', margin: '20px auto' }}>
                    <Progress percent={progress} showInfo />
                  </div>
                </div>
              )}

              <Card style={{ padding: '16px 20px', marginBottom: '16px' }}>
                <Title
                  heading={4}
                  style={{ margin: '16px 24px', color: 'var(--semi-color-text-0)' }}
                >
                  {analysisResult.summary}
                </Title>

                <Tabs type="line" style={{ marginTop: 16 }}>
                  <TabPane tab="写作习惯" itemKey="habits">
                    <div style={{ padding: '12px 16px' }}>
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
                    <div style={{ padding: '12px 16px' }}>
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
                    <div style={{ padding: '12px 16px' }}>
                      <Title
                        heading={5}
                        style={{ color: 'var(--semi-color-text-0)', marginBottom: 16 }}
                      >
                        {analysisResult.recommendations.title}
                      </Title>
                      <div style={{ margin: '16px 0' }}>
                        <VirtualTextList
                          items={analysisResult.recommendations.items}
                          height={Math.min(300, analysisResult.recommendations.items.length * 60)}
                          itemHeight={60}
                          renderItem={(item) => (
                            <div
                              style={{ paddingLeft: 20, display: 'flex', alignItems: 'flex-start' }}
                            >
                              <span style={{ marginRight: 8, marginTop: 4 }}>•</span>
                              <Paragraph style={{ lineHeight: 1.6, margin: 0 }}>{item}</Paragraph>
                            </div>
                          )}
                        />
                      </div>

                      <Divider margin="24px" />

                      <Title
                        heading={5}
                        style={{ color: 'var(--semi-color-text-0)', marginBottom: 16 }}
                      >
                        {analysisResult.efficiencyTips.title}
                      </Title>
                      <div style={{ margin: '16px 0' }}>
                        <VirtualTextList
                          items={analysisResult.efficiencyTips.items}
                          height={Math.min(300, analysisResult.efficiencyTips.items.length * 60)}
                          itemHeight={60}
                          renderItem={(item) => (
                            <div
                              style={{ paddingLeft: 20, display: 'flex', alignItems: 'flex-start' }}
                            >
                              <span style={{ marginRight: 8, marginTop: 4 }}>•</span>
                              <Paragraph style={{ lineHeight: 1.6, margin: 0 }}>{item}</Paragraph>
                            </div>
                          )}
                        />
                      </div>

                      <Divider margin="24px" />

                      <Title
                        heading={5}
                        style={{ color: 'var(--semi-color-text-0)', marginBottom: 16 }}
                      >
                        {analysisResult.suggestedGoals.title}
                      </Title>
                      <div style={{ margin: '16px 0' }}>
                        <VirtualTextList
                          items={analysisResult.suggestedGoals.items}
                          height={Math.min(300, analysisResult.suggestedGoals.items.length * 60)}
                          itemHeight={60}
                          renderItem={(item) => (
                            <div
                              style={{ paddingLeft: 20, display: 'flex', alignItems: 'flex-start' }}
                            >
                              <span style={{ marginRight: 8, marginTop: 4 }}>•</span>
                              <Paragraph style={{ lineHeight: 1.6, margin: 0 }}>{item}</Paragraph>
                            </div>
                          )}
                        />
                      </div>
                    </div>
                  </TabPane>

                  <TabPane tab="数据可视化" itemKey="visualization">
                    {statsData && activityData && (
                      <div style={{ padding: '12px 16px' }}>
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
                            {prepareChartData?.hourlyDistribution &&
                              renderBarChart(
                                prepareChartData.hourlyDistribution,
                                '每日时段编辑分布'
                              )}
                          </div>
                          <div
                            style={{
                              width: 'calc(50% - 24px)',
                              marginRight: '0'
                            }}
                          >
                            {prepareChartData?.topNotes &&
                              renderPieChart(prepareChartData.topNotes, '最常编辑的笔记')}
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
                            {prepareChartData?.editTrend &&
                              renderLineChart(prepareChartData.editTrend, '每日编辑次数趋势')}
                          </div>
                          <div
                            style={{
                              width: 'calc(50% - 24px)',
                              marginRight: '0'
                            }}
                          >
                            {prepareChartData?.noteTrend &&
                              renderLineChart(prepareChartData.noteTrend, '每日活跃笔记数趋势')}
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
                            {prepareChartData?.activeHours &&
                              renderBarChart(
                                prepareChartData.activeHours,
                                '日内活跃时段分布 (占比%)',
                                true,
                                prepareChartData.activeHours.datasets[0].data.indexOf(
                                  Math.max(...prepareChartData.activeHours.datasets[0].data)
                                )
                              )}
                          </div>
                          <div
                            style={{
                              width: 'calc(50% - 24px)',
                              marginRight: '0'
                            }}
                          >
                            {prepareChartData?.topFolders &&
                              renderBarChart(prepareChartData.topFolders, '最常用的文件夹', false)}
                          </div>
                        </div>

                        {/* 添加写作效率趋势分析 */}
                        <div style={{ width: '100%', marginBottom: '24px' }}>
                          <WritingEfficiencyTrend
                            statsData={statsData}
                            activityData={activityData}
                            isDarkMode={isDarkMode}
                          />
                        </div>

                        {/* 添加内容质量评分 */}
                        <div style={{ width: '100%', marginBottom: '24px' }}>
                          <ContentQualityScore statsData={statsData} isDarkMode={isDarkMode} />
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
                                {prepareChartData?.topTags &&
                                  renderTagCloud(prepareChartData.topTags, '最常用的标签')}
                              </div>
                            </div>
                          </>
                        )}

                        {/* 添加标签关系图 */}
                        {statsData.tagRelations && statsData.tagRelations.length > 0 && (
                          <div style={{ width: '100%', marginBottom: '24px' }}>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '16px'
                              }}
                            >
                              <Title
                                heading={6}
                                style={{ margin: 0, color: 'var(--semi-color-text-0)' }}
                              >
                                标签关联分析
                              </Title>
                              <Button
                                size="small"
                                type="tertiary"
                                onClick={() => setUseKnowledgeGraph(!useKnowledgeGraph)}
                              >
                                {useKnowledgeGraph ? '切换为饼图展示' : '切换为知识图谱'}
                              </Button>
                            </div>
                            <div style={{ width: '100%', marginRight: '0' }}>
                              {useKnowledgeGraph
                                ? renderKnowledgeGraph(
                                    statsData.tagRelations.slice(
                                      0,
                                      Math.min(50, statsData.tagRelations.length)
                                    ),
                                    '标签关联知识图谱',
                                    statsData.topTags
                                  )
                                : renderTagRelations(
                                    statsData.tagRelations.slice(
                                      0,
                                      Math.min(50, statsData.tagRelations.length)
                                    ),
                                    '标签关联饼图'
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
    </div>
  )
}

export default DataAnalysis
