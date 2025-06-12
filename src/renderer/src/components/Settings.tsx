import React, { useState, useEffect, useCallback } from 'react'
import {
  Typography,
  Card,
  Switch,
  Divider,
  Button,
  Toast,
  Form,
  Modal,
  Empty,
  Popconfirm,
  Spin,
  ButtonGroup,
  Tabs,
  TabPane,
  Radio,
  Slider,
  InputNumber,
  Select,
  List
} from '@douyinfe/semi-ui'
import { IconPulse, IconPlus, IconDelete, IconEdit, IconRefresh } from '@douyinfe/semi-icons'
import { v4 as uuidv4 } from 'uuid'
import WebDAVSettings from './WebDAVSettings'

const { Title, Paragraph, Text } = Typography

// API配置接口
interface AiApiConfig {
  id: string
  name: string
  apiKey: string
  apiUrl: string
  modelName: string
  temperature?: string
  maxTokens?: string
}

interface UpdateResult {
  hasUpdate: boolean
  latestVersion: string
  currentVersion: string
  error?: string
}

// 历史记录管理设置接口
interface HistoryManagementSettings {
  type: 'count' | 'time'
  maxCount: number
  maxDays: number
}

// Embedding API配置接口
interface EmbeddingApiConfig {
  id: string
  name: string
  apiKey: string
  apiUrl: string
  modelName: string
}

// Embedding配置接口
interface EmbeddingConfig {
  enabled: boolean
  model: string
  chunkSize: number
  chunkOverlap: number
  autoEmbedding: boolean
  apiConfigId?: string
}

// RAG配置接口
interface RAGConfig {
  embedding: EmbeddingConfig
  searchSettings: {
    maxResults: number
    similarityThreshold: number
  }
}

const Settings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [AiApiConfigs, setApiConfigs] = useState<AiApiConfig[]>([])
  const [currentConfig, setCurrentConfig] = useState<AiApiConfig | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; message: string }>
  >({})
  const testResultTimersRef = React.useRef<Record<string, NodeJS.Timeout>>({})

  const [checkUpdatesOnStartup, setCheckUpdatesOnStartup] = useState<boolean>(true)
  const [isCheckingUpdates, setIsCheckingUpdates] = useState<boolean>(false)
  const [updateResult, setUpdateResult] = useState<UpdateResult | null>(null)
  const [historyManagement, setHistoryManagement] = useState<HistoryManagementSettings>({
    type: 'count',
    maxCount: 20,
    maxDays: 7
  })

  // RAG设置状态
  const [RAGConfig, setRAGConfig] = useState<RAGConfig>({
    embedding: {
      enabled: false,
      model: 'text-embedding-3-small',
      chunkSize: 1000,
      chunkOverlap: 200,
      autoEmbedding: false,
      apiConfigId: undefined
    },
    searchSettings: {
      maxResults: 10,
      similarityThreshold: 0.7
    }
  })

  const [kbStatsLoading, setKbStatsLoading] = useState(false)
  const [kbStats, setKbStats] = useState<any>(null)

  // Embedding API配置状态
  const [embeddingApiConfigs, setEmbeddingApiConfigs] = useState<EmbeddingApiConfig[]>([])
  const [showEmbeddingModal, setShowEmbeddingModal] = useState(false)
  const [currentEmbeddingConfig, setCurrentEmbeddingConfig] = useState<EmbeddingApiConfig | null>(
    null
  )
  const [isEmbeddingEditMode, setIsEmbeddingEditMode] = useState(false)

  // 加载设置函数
  const loadSettings = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true)
      const settings = await window.api.settings.getAll()

      // 设置API配置
      if (settings.AiApiConfigs && Array.isArray(settings.AiApiConfigs)) {
        setApiConfigs(settings.AiApiConfigs as AiApiConfig[])
      }

      // 加载更新检查设置
      if (settings.checkUpdatesOnStartup !== undefined) {
        setCheckUpdatesOnStartup(settings.checkUpdatesOnStartup as boolean)
      }

      // 加载历史记录管理设置
      if (settings.historyManagement) {
        setHistoryManagement(settings.historyManagement as HistoryManagementSettings)
      }

      // 加载RAG设置
      if (settings.RAG) {
        setRAGConfig(settings.RAG as RAGConfig)
      }

      // 加载Embedding API配置
      if (settings.embeddingApiConfigs && Array.isArray(settings.embeddingApiConfigs)) {
        setEmbeddingApiConfigs(settings.embeddingApiConfigs as EmbeddingApiConfig[])
      }
    } catch (error) {
      Toast.error('加载设置失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 加载RAG统计信息
  const loadKbStats = useCallback(async (): Promise<void> => {
    try {
      setKbStatsLoading(true)
      const result = await window.api.RAG.getStats()
      if (result.success) {
        setKbStats(result.stats)
      }
    } catch (error) {
      console.error('加载RAG统计失败:', error)
    } finally {
      setKbStatsLoading(false)
    }
  }, [])

  // 加载所有设置
  useEffect(() => {
    loadSettings()
    loadKbStats()

    // 捕获当前的ref值
    const timers = testResultTimersRef.current

    // 组件卸载时清除所有定时器
    return (): void => {
      Object.values(timers).forEach((timerId) => {
        clearTimeout(timerId)
      })
    }
  }, [loadSettings, loadKbStats])

  // 打开添加新配置的模态框
  const handleAddConfig = (): void => {
    setCurrentConfig({
      id: uuidv4(),
      name: '',
      apiKey: '',
      apiUrl: '',
      modelName: '',
      temperature: '0.7',
      maxTokens: '2000'
    })
    setIsEditMode(false)
    setIsModalOpen(true)
  }

  // 编辑配置
  const handleEditConfig = (config: AiApiConfig): void => {
    setCurrentConfig({ ...config })
    setIsEditMode(true)
    setIsModalOpen(true)
  }

  // 保存配置
  const handleSaveConfig = async (): Promise<void> => {
    try {
      // 校验必填字段
      if (!currentConfig?.name.trim()) {
        Toast.error('请输入配置名称')
        return
      }

      // 保存配置
      const result = await window.api.api.saveConfig(currentConfig)

      if (result.success) {
        Toast.success(isEditMode ? '配置已更新' : '配置已添加')
        setIsModalOpen(false)
        // 重新加载配置
        await loadSettings()

        // 清除相关的测试结果，使用函数式更新
        if (testResults[currentConfig.id]) {
          setTestResults((prev) => {
            const newResults = { ...prev }
            delete newResults[currentConfig.id]
            return newResults
          })
        }
      } else {
        Toast.error('保存配置失败: ' + (result.error || '未知错误'))
      }
    } catch (error) {
      Toast.error('保存配置失败')
    }
  }

  // 删除配置
  const handleDeleteConfig = async (configId: string): Promise<void> => {
    try {
      const result = await window.api.api.deleteConfig(configId)

      if (result.success) {
        Toast.success('配置已删除')
        // 重新加载配置
        await loadSettings()

        // 清除相关的测试结果，使用函数式更新
        if (testResults[configId]) {
          setTestResults((prev) => {
            const newResults = { ...prev }
            delete newResults[configId]
            return newResults
          })
        }
      } else {
        Toast.error('删除配置失败: ' + (result.error || '未知错误'))
      }
    } catch (error) {
      Toast.error('删除配置失败')
    }
  }

  // 更新当前编辑的配置
  const handleConfigChange = (key: keyof AiApiConfig, value: string): void => {
    setCurrentConfig((prev) => {
      if (!prev) return null
      return {
        ...prev,
        [key]: value
      }
    })
  }

  // 开始拖动滑块时阻止文本选中
  const handleSliderDragStart = (): void => {
    document.body.style.userSelect = 'none'
  }

  // 结束拖动滑块时恢复文本选中
  const handleSliderDragEnd = (): void => {
    document.body.style.userSelect = ''
  }

  // 测试连接
  const handleTestConnection = async (config: AiApiConfig): Promise<void> => {
    try {
      setTestingId(config.id)

      // 清除此配置的旧测试结果，使用函数式更新
      setTestResults((prev) => {
        const newResults = { ...prev }
        delete newResults[config.id]
        return newResults
      })

      // 清除该配置可能存在的定时器
      if (testResultTimersRef.current[config.id]) {
        clearTimeout(testResultTimersRef.current[config.id])
      }

      // 调用API测试连接
      const result = await window.api.openai.testConnection(config)

      // 保存测试结果，使用函数式更新确保基于最新状态
      setTestResults((prev) => ({
        ...prev,
        [config.id]: result
      }))

      // 显示测试结果提示
      if (result.success) {
        Toast.success('连接测试成功')
      } else {
        Toast.error('连接测试失败')
      }

      // 设置5秒后自动消失
      testResultTimersRef.current[config.id] = setTimeout(() => {
        setTestResults((prev) => {
          const newResults = { ...prev }
          delete newResults[config.id]
          return newResults
        })
        delete testResultTimersRef.current[config.id]
      }, 5000)
    } catch (error) {
      // 错误情况下也使用函数式更新
      setTestResults((prev) => ({
        ...prev,
        [config.id]: { success: false, message: '测试过程出错' }
      }))
      Toast.error('连接测试出错')

      // 错误情况下也设置5秒后自动消失
      testResultTimersRef.current[config.id] = setTimeout(() => {
        setTestResults((prev) => {
          const newResults = { ...prev }
          delete newResults[config.id]
          return newResults
        })
        delete testResultTimersRef.current[config.id]
      }, 5000)
    } finally {
      setTestingId(null)
    }
  }

  // 渲染配置卡片
  const renderApiConfigCards = (): React.ReactNode => {
    if (AiApiConfigs.length === 0) {
      return (
        <Empty
          image={<IconPlus size="large" />}
          title="暂无API配置"
          description="点击上方'添加API配置'按钮创建新的API配置"
        />
      )
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {AiApiConfigs.map((config) => (
          <Card
            key={config.id}
            headerLine={true}
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>{/* 从标题中移除名称 */}</div>
            }
            headerExtraContent={
              <ButtonGroup>
                <Button
                  icon={<IconPulse />}
                  onClick={() => handleTestConnection(config)}
                  loading={testingId === config.id}
                  theme="borderless"
                  type="primary"
                  size="small"
                >
                  测试连接
                </Button>
                <Button
                  icon={<IconEdit />}
                  onClick={() => handleEditConfig(config)}
                  theme="borderless"
                  type="tertiary"
                  size="small"
                >
                  编辑
                </Button>
                <Popconfirm
                  title="确定要删除这个API配置吗？"
                  content="删除后无法恢复"
                  onConfirm={() => handleDeleteConfig(config.id)}
                >
                  <Button icon={<IconDelete />} theme="borderless" type="danger" size="small">
                    删除
                  </Button>
                </Popconfirm>
              </ButtonGroup>
            }
          >
            <div style={{ padding: '0 4px' }}>
              {/* 将名称添加到卡片内容区域 */}
              <div style={{ marginBottom: 12 }}>
                <Text strong style={{ fontSize: '16px' }}>
                  {config.name}
                </Text>
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text type="tertiary" style={{ marginRight: 6 }}>
                  API URL:
                </Text>
                <Text>{config.apiUrl || '未设置'}</Text>
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text type="tertiary" style={{ marginRight: 6 }}>
                  API Key:
                </Text>
                <Text>{config.apiKey ? '******' : '未设置'}</Text>
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text type="tertiary" style={{ marginRight: 6 }}>
                  模型:
                </Text>
                <Text>{config.modelName || '未设置'}</Text>
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text type="tertiary" style={{ marginRight: 6 }}>
                  温度:
                </Text>
                <Text>{config.temperature || '0.7'}</Text>
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text type="tertiary" style={{ marginRight: 6 }}>
                  最大Token:
                </Text>
                <Text>{config.maxTokens || '2000'}</Text>
              </div>

              {/* 测试结果显示区域 */}
              {testResults[config.id] && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    borderRadius: 6,
                    backgroundColor: testResults[config.id].success
                      ? 'rgba(0, 180, 42, 0.1)'
                      : 'rgba(253, 77, 77, 0.1)',
                    border: `1px solid ${
                      testResults[config.id].success
                        ? 'rgba(0, 180, 42, 0.2)'
                        : 'rgba(253, 77, 77, 0.2)'
                    }`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Text
                      strong
                      style={{ color: testResults[config.id].success ? '#00b42a' : '#fd4d4d' }}
                    >
                      {testResults[config.id].success ? '✓ 连接成功' : '✗ 连接失败'}
                    </Text>
                  </div>
                  <Text style={{ marginTop: 4, fontSize: '13px' }}>
                    {testResults[config.id].message}
                  </Text>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    )
  }

  // 添加WebDAV同步完成回调
  const handleSyncComplete = (): void => {}

  // 处理更新检查设置变更
  const handleUpdateCheckingChange = async (checked: boolean): Promise<void> => {
    try {
      setCheckUpdatesOnStartup(checked)
      const settings = await window.api.settings.getAll()
      const updatedSettings = {
        ...settings,
        checkUpdatesOnStartup: checked
      }
      const success = await window.api.settings.setAll(updatedSettings)

      if (!success) {
        Toast.error('保存更新检查设置失败')
      }
    } catch (error) {
      Toast.error('保存更新检查设置失败')
    }
  }

  // 手动检查更新
  const handleCheckUpdates = async (): Promise<void> => {
    try {
      setIsCheckingUpdates(true)
      setUpdateResult(null)

      const result = await window.api.updates.checkForUpdates()

      // 检查是否有错误信息
      if (result.error) {
        // 有错误信息表示检查失败
        Toast.error(`检查更新失败: ${result.error}`)
        setUpdateResult({
          hasUpdate: false,
          latestVersion: '',
          currentVersion: result.currentVersion,
          error: result.error
        })
      } else if (result.hasUpdate) {
        // 有更新
        Toast.info(`发现新版本: ${result.latestVersion}`)
        setUpdateResult(result)
      } else if (result.latestVersion) {
        // 已是最新版本
        Toast.info('当前已是最新版本')
        setUpdateResult(result)
      } else {
        // 检查失败，但没有详细错误信息
        Toast.error('检查更新失败，请检查网络连接')
        setUpdateResult({
          ...result,
          error: '无法连接到更新服务器'
        })
      }
    } catch (error) {
      Toast.error('检查更新出错')
      setUpdateResult({
        hasUpdate: false,
        latestVersion: '',
        currentVersion: '',
        error: error instanceof Error ? error.message : '未知错误'
      })
    } finally {
      setIsCheckingUpdates(false)
    }
  }

  // 监听更新通知
  useEffect(() => {
    const handleUpdateAvailable = (updateInfo: {
      latestVersion: string
      currentVersion: string
    }): void => {
      Toast.info(`发现新版本: ${updateInfo.latestVersion}`)
      setUpdateResult({
        hasUpdate: true,
        ...updateInfo
      })
    }

    window.api.updates.onUpdateAvailable(handleUpdateAvailable)
  }, [])

  // 保存历史记录管理设置
  const saveHistoryManagement = async (): Promise<void> => {
    try {
      // 根据当前选择的类型创建一个新的设置对象
      const settingsToSave = {
        type: historyManagement.type,
        // 只保存当前选择模式相关的值，另一个值设为默认值
        maxCount: historyManagement.type === 'count' ? historyManagement.maxCount : 20,
        maxDays: historyManagement.type === 'time' ? historyManagement.maxDays : 7
      }

      await window.api.settings.set('historyManagement', settingsToSave)
      Toast.success('历史记录管理设置已保存')
    } catch (error) {
      Toast.error('保存历史记录管理设置失败')
    }
  }

  // 处理历史记录管理类型变更
  const handleHistoryTypeChange = (
    e: { target: { value: 'count' | 'time' } } | 'count' | 'time'
  ): void => {
    const newType = typeof e === 'object' && 'target' in e ? e.target.value : e
    setHistoryManagement({
      ...historyManagement,
      type: newType
    })
  }

  // 处理历史记录保留数量变更
  const handleMaxCountChange = (value: string | number): void => {
    const numValue = typeof value === 'string' ? parseInt(value, 10) : value
    if (!isNaN(numValue) && numValue > 0) {
      setHistoryManagement({
        ...historyManagement,
        maxCount: numValue
      })
    }
  }

  // 处理历史记录保留天数变更
  const handleMaxDaysChange = (value: string | number): void => {
    const numValue = typeof value === 'string' ? parseInt(value, 10) : value
    if (!isNaN(numValue) && numValue > 0) {
      setHistoryManagement({
        ...historyManagement,
        maxDays: numValue
      })
    }
  }

  // 保存RAG设置
  const saveRAGConfig = async (): Promise<void> => {
    try {
      await window.api.settings.set('RAG', RAGConfig)
      Toast.success('RAG设置已保存')
    } catch (error) {
      Toast.error('保存RAG设置失败')
    }
  }

  // 处理embedding配置变更
  const handleEmbeddingConfigChange = (key: keyof EmbeddingConfig, value: any): void => {
    setRAGConfig((prev) => ({
      ...prev,
      embedding: {
        ...prev.embedding,
        [key]: value
      }
    }))
  }

  // 处理搜索设置变更
  const handleSearchSettingsChange = (key: string, value: any): void => {
    setRAGConfig((prev) => ({
      ...prev,
      searchSettings: {
        ...prev.searchSettings,
        [key]: value
      }
    }))
  }

  // 批量向量化所有文档
  const handleEmbedAllDocuments = async (): Promise<void> => {
    try {
      Toast.info('开始批量向量化，请稍候...')

      // 监听进度更新
      window.api.RAG.onEmbedProgress((progress) => {
        Toast.info(`正在处理: ${progress.filePath} (${progress.current}/${progress.total})`)
      })

      const result = await window.api.RAG.embedAllDocuments()

      // 移除进度监听器
      window.api.RAG.removeEmbedProgressListener()

      if (result.success) {
        const { success, failed, skipped, total } = result.result
        Toast.success(
          `批量向量化完成！成功: ${success}, 失败: ${failed}, 跳过: ${skipped}, 总计: ${total}`
        )
        // 刷新统计信息
        await loadKbStats()
      } else {
        Toast.error(`批量向量化失败: ${result.error}`)
      }
    } catch (error) {
      Toast.error('批量向量化过程中发生错误')
      // 确保移除监听器
      window.api.RAG.removeEmbedProgressListener()
    }
  }

  // Embedding API配置管理函数
  const handleAddEmbeddingConfig = (): void => {
    setCurrentEmbeddingConfig({
      id: uuidv4(),
      name: '',
      apiKey: '',
      apiUrl: '',
      modelName: ''
    })
    setIsEmbeddingEditMode(false)
    setShowEmbeddingModal(true)
  }

  const handleEditEmbeddingConfig = (config: EmbeddingApiConfig): void => {
    setCurrentEmbeddingConfig({ ...config })
    setIsEmbeddingEditMode(true)
    setShowEmbeddingModal(true)
  }

  const handleSaveEmbeddingConfig = async (): Promise<void> => {
    try {
      if (!currentEmbeddingConfig?.name.trim()) {
        Toast.error('请输入配置名称')
        return
      }

      let updatedConfigs: EmbeddingApiConfig[]
      if (isEmbeddingEditMode) {
        updatedConfigs = embeddingApiConfigs.map((config) =>
          config.id === currentEmbeddingConfig.id ? currentEmbeddingConfig : config
        )
      } else {
        updatedConfigs = [...embeddingApiConfigs, currentEmbeddingConfig]
      }

      await window.api.settings.set('embeddingApiConfigs', updatedConfigs)
      setEmbeddingApiConfigs(updatedConfigs)
      setShowEmbeddingModal(false)
      Toast.success(isEmbeddingEditMode ? '配置已更新' : '配置已添加')
    } catch (error) {
      Toast.error('保存配置失败')
    }
  }

  const handleDeleteEmbeddingConfig = async (configId: string): Promise<void> => {
    try {
      const updatedConfigs = embeddingApiConfigs.filter((config) => config.id !== configId)
      await window.api.settings.set('embeddingApiConfigs', updatedConfigs)
      setEmbeddingApiConfigs(updatedConfigs)

      // 如果删除的是当前选中的配置，清除选择
      if (RAGConfig.embedding.apiConfigId === configId) {
        const updatedKbConfig = {
          ...RAGConfig,
          embedding: {
            ...RAGConfig.embedding,
            apiConfigId: undefined
          }
        }
        setRAGConfig(updatedKbConfig)
        await window.api.settings.set('RAG', updatedKbConfig)
      }

      Toast.success('配置已删除')
    } catch (error) {
      Toast.error('删除配置失败')
    }
  }

  const handleEmbeddingConfigInputChange = (key: string, value: any): void => {
    setCurrentEmbeddingConfig((prev) => {
      if (!prev) return null
      return { ...prev, [key]: value }
    })
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
      <Title heading={2}>设置</Title>

      <Tabs
        type="line"
        size="large"
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden'
        }}
        tabPosition="top"
        contentStyle={{
          flex: 1,
          overflow: 'hidden'
        }}
      >
        <TabPane tab="基本设置" itemKey="basic">
          <div className="settings-scroll-container">
            {/* 更新检查设置卡片 */}
            <Card style={{ marginBottom: 20 }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <Text strong>自动检查更新</Text>
                  <Paragraph spacing="normal" type="tertiary">
                    应用启动时自动检查是否有新版本
                  </Paragraph>
                </div>
                <Switch
                  onChange={handleUpdateCheckingChange}
                  checked={checkUpdatesOnStartup}
                  size="large"
                  style={{ marginLeft: '16px' }}
                />
              </div>
              <Divider />
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <Text strong>手动检查更新</Text>
                  <Paragraph spacing="normal" type="tertiary">
                    检查GitHub上是否有新版本发布
                  </Paragraph>
                </div>
                <Button
                  icon={<IconRefresh />}
                  onClick={handleCheckUpdates}
                  loading={isCheckingUpdates}
                  theme="solid"
                  type="tertiary"
                >
                  检查更新
                </Button>
              </div>

              {updateResult && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    borderRadius: 6,
                    backgroundColor: updateResult.error
                      ? 'rgba(255, 77, 79, 0.1)'
                      : updateResult.hasUpdate
                        ? 'rgba(0, 100, 250, 0.1)'
                        : 'rgba(0, 180, 42, 0.1)',
                    border: `1px solid ${
                      updateResult.error
                        ? 'rgba(255, 77, 79, 0.2)'
                        : updateResult.hasUpdate
                          ? 'rgba(0, 100, 250, 0.2)'
                          : 'rgba(0, 180, 42, 0.2)'
                    }`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Text
                      strong
                      style={{
                        color: updateResult.error
                          ? '#ff4d4f'
                          : updateResult.hasUpdate
                            ? '#0064fa'
                            : '#00b42a'
                      }}
                    >
                      {updateResult.error
                        ? `❌ 检查更新失败`
                        : updateResult.hasUpdate
                          ? `✓ 发现新版本: ${updateResult.latestVersion}`
                          : '✓ 当前已是最新版本'}
                    </Text>
                  </div>
                  <Text style={{ marginTop: 4, fontSize: '13px' }}>
                    {updateResult.error
                      ? `错误信息: ${updateResult.error}`
                      : updateResult.hasUpdate
                        ? `您当前的版本为 ${updateResult.currentVersion}，可以前往 GitHub 下载最新版本`
                        : `当前版本: ${updateResult.currentVersion}`}
                  </Text>
                  {updateResult.hasUpdate && !updateResult.error && (
                    <div style={{ marginTop: 8 }}>
                      <Button
                        type="primary"
                        size="small"
                        onClick={() =>
                          window.open('https://github.com/funkpopo/note-by/releases', '_blank')
                        }
                      >
                        前往下载
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <Divider />
              <Paragraph type="tertiary" style={{ fontSize: '13px' }}>
                更新检查会连接GitHub查询最新版本信息，确保你可以访问GitHub
              </Paragraph>
            </Card>

            {/* API配置部分 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16
              }}
            >
              <Title heading={5}>AI API配置</Title>
              <ButtonGroup>
                <Button
                  icon={<IconPlus />}
                  onClick={handleAddConfig}
                  theme="solid"
                  type="primary"
                  size="small"
                >
                  添加API配置
                </Button>
              </ButtonGroup>
            </div>

            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                <Spin size="large" />
              </div>
            ) : (
              renderApiConfigCards()
            )}
          </div>
        </TabPane>

        <TabPane tab="历史记录管理" itemKey="history">
          <div className="settings-scroll-container">
            {/* 历史记录管理设置卡片 */}
            <Card
              title="历史记录管理"
              style={{ marginTop: 20, marginBottom: '16px' }}
              headerExtraContent={
                <Button type="primary" theme="solid" onClick={saveHistoryManagement}>
                  保存
                </Button>
              }
            >
              <Form>
                <Form.RadioGroup
                  field="historyType"
                  label="历史记录保留方式"
                  initValue={historyManagement.type}
                  onChange={handleHistoryTypeChange}
                >
                  <Radio value="count">按数量保留</Radio>
                  <Radio value="time">按时间保留</Radio>
                </Form.RadioGroup>

                {historyManagement.type === 'count' && (
                  <Form.InputNumber
                    field="maxCount"
                    label="保留最近的记录数量"
                    initValue={historyManagement.maxCount}
                    onChange={handleMaxCountChange}
                    min={1}
                    max={1000}
                    step={1}
                    style={{ width: '200px' }}
                  />
                )}

                {historyManagement.type === 'time' && (
                  <Form.InputNumber
                    field="maxDays"
                    label="保留天数"
                    initValue={historyManagement.maxDays}
                    onChange={handleMaxDaysChange}
                    min={1}
                    max={365}
                    step={1}
                    suffix="天"
                    style={{ width: '200px' }}
                  />
                )}

                <Paragraph style={{ marginTop: '16px', color: 'var(--semi-color-text-2)' }}>
                  {historyManagement.type === 'count'
                    ? `系统将为每个文件保留最近的 ${historyManagement.maxCount} 条历史记录。超出的记录将被自动清理。`
                    : `系统将自动清理 ${historyManagement.maxDays} 天前的历史记录。`}
                </Paragraph>
              </Form>
            </Card>
          </div>
        </TabPane>

        <TabPane tab="WebDAV同步" itemKey="webdav">
          <WebDAVSettings onSyncComplete={handleSyncComplete} />
        </TabPane>

        <TabPane tab="RAG" itemKey="RAG">
          <div className="settings-scroll-container">
            {/* RAG基本设置 */}
            <Card
              title="RAG设置"
              style={{ marginTop: 20, marginBottom: '16px' }}
              headerExtraContent={
                <Button type="primary" theme="solid" onClick={saveRAGConfig}>
                  保存设置
                </Button>
              }
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16
                }}
              >
                <div>
                  <Text strong>启用RAG功能</Text>
                  <Paragraph spacing="normal" type="tertiary">
                    开启后可以对markdown文档进行向量化，支持语义搜索
                  </Paragraph>
                </div>
                <Switch
                  checked={RAGConfig.embedding.enabled}
                  onChange={(checked) => handleEmbeddingConfigChange('enabled', checked)}
                  size="large"
                />
              </div>

              {RAGConfig.embedding.enabled && (
                <>
                  <Divider />

                  {/* Embedding API 配置 */}
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>Embedding API 配置</Text>
                    <div
                      style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginTop: 8 }}
                    >
                      <div style={{ flex: 1 }}>
                        <Select
                          value={RAGConfig.embedding.apiConfigId}
                          onChange={(value) => handleEmbeddingConfigChange('apiConfigId', value)}
                          placeholder="选择Embedding API配置"
                          style={{ width: '100%' }}
                        >
                          {embeddingApiConfigs.map((config) => (
                            <Select.Option key={config.id} value={config.id}>
                              {config.name} ({config.modelName})
                            </Select.Option>
                          ))}
                        </Select>
                      </div>
                      <Button icon={<IconPlus />} onClick={handleAddEmbeddingConfig} type="primary">
                        添加
                      </Button>
                    </div>
                  </div>

                  {/* 分块设置 */}
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>分块大小</Text>
                    <InputNumber
                      placeholder="文档分块的字符数"
                      value={RAGConfig.embedding.chunkSize}
                      onChange={(value) => handleEmbeddingConfigChange('chunkSize', value)}
                      min={100}
                      max={4000}
                      style={{ width: '100%', marginTop: 8 }}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <Text strong>分块重叠</Text>
                    <InputNumber
                      placeholder="相邻分块的重叠字符数"
                      value={RAGConfig.embedding.chunkOverlap}
                      onChange={(value) => handleEmbeddingConfigChange('chunkOverlap', value)}
                      min={0}
                      max={1000}
                      style={{ width: '100%', marginTop: 8 }}
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 16
                    }}
                  >
                    <div>
                      <Text strong>自动向量化新文档</Text>
                      <Paragraph spacing="normal" type="tertiary">
                        保存文档时自动进行向量化处理
                      </Paragraph>
                    </div>
                    <Switch
                      checked={RAGConfig.embedding.autoEmbedding}
                      onChange={(checked) => handleEmbeddingConfigChange('autoEmbedding', checked)}
                      size="large"
                    />
                  </div>
                </>
              )}
            </Card>

            {/* 搜索设置 */}
            {RAGConfig.embedding.enabled && (
              <Card title="搜索设置" style={{ marginBottom: '16px' }}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>最大搜索结果数</Text>
                  <InputNumber
                    value={RAGConfig.searchSettings.maxResults}
                    onChange={(value) => handleSearchSettingsChange('maxResults', value)}
                    min={1}
                    max={50}
                    style={{ width: '100%', marginTop: 8 }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <Text
                    strong
                  >{`相似度阈值: ${RAGConfig.searchSettings.similarityThreshold}`}</Text>
                  <Slider
                    value={RAGConfig.searchSettings.similarityThreshold}
                    onChange={(value) => handleSearchSettingsChange('similarityThreshold', value)}
                    min={0.1}
                    max={1.0}
                    step={0.1}
                    style={{ marginTop: 8 }}
                  />
                </div>
              </Card>
            )}

            {/* RAG统计和管理 */}
            {RAGConfig.embedding.enabled && (
              <Card title="RAG管理" style={{ marginBottom: '16px' }}>
                {kbStatsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                    <Spin size="large" />
                  </div>
                ) : kbStats ? (
                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '16px',
                        marginBottom: 16
                      }}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <Text type="secondary">总文档数</Text>
                        <div
                          style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: 'var(--semi-color-primary)'
                          }}
                        >
                          {kbStats.totalDocuments}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <Text type="secondary">已向量化</Text>
                        <div
                          style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: 'var(--semi-color-success)'
                          }}
                        >
                          {kbStats.embeddedDocuments}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <Text type="secondary">待处理</Text>
                        <div
                          style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: 'var(--semi-color-warning)'
                          }}
                        >
                          {kbStats.pendingDocuments}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <Text type="secondary">失败</Text>
                        <div
                          style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: 'var(--semi-color-danger)'
                          }}
                        >
                          {kbStats.failedDocuments}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Button
                        type="primary"
                        onClick={handleEmbedAllDocuments}
                        disabled={kbStats.totalDocuments === 0}
                      >
                        批量向量化所有文档
                      </Button>
                      <Button onClick={loadKbStats}>刷新统计</Button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <Text type="tertiary">无法加载统计信息</Text>
                  </div>
                )}
              </Card>
            )}
          </div>
        </TabPane>
      </Tabs>

      {/* 添加/编辑配置模态框 */}
      <Modal
        title={isEditMode ? '编辑API配置' : '添加API配置'}
        visible={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        centered
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <ButtonGroup>
              <Button type="tertiary" onClick={() => setIsModalOpen(false)}>
                取消
              </Button>
              <Button type="primary" onClick={handleSaveConfig}>
                保存
              </Button>
            </ButtonGroup>
          </div>
        }
      >
        <Form<AiApiConfig> labelPosition="left" labelWidth={100}>
          <Form.Input
            field="name"
            label="配置名称"
            placeholder="请输入配置名称，如OpenAI、Claude等"
            initValue={currentConfig?.name}
            onChange={(value) => handleConfigChange('name', value)}
            showClear
            required
          />
          <Form.Input
            field="apiKey"
            label="API Key"
            placeholder="请输入API Key"
            initValue={currentConfig?.apiKey}
            onChange={(value) => handleConfigChange('apiKey', value)}
            showClear
          />
          <Form.Input
            field="apiUrl"
            label="API URL"
            placeholder="请输入API URL，如https://api.openai.com"
            initValue={currentConfig?.apiUrl}
            onChange={(value) => handleConfigChange('apiUrl', value)}
            showClear
          />
          <Form.Input
            field="modelName"
            label="模型名称"
            placeholder="请输入模型名称，如gpt-3.5-turbo"
            initValue={currentConfig?.modelName}
            onChange={(value) => handleConfigChange('modelName', value)}
            showClear
          />
          <div style={{ marginBottom: 20 }}>
            <Form.Label>温度 (Temperature)</Form.Label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ flexGrow: 1, marginRight: 10, position: 'relative' }}>
                <div
                  style={{ paddingTop: '8px' }}
                  onMouseDown={handleSliderDragStart}
                  onMouseUp={handleSliderDragEnd}
                  onMouseLeave={handleSliderDragEnd}
                >
                  <Form.Slider
                    field="temperature"
                    initValue={parseFloat(currentConfig?.temperature || '0.7')}
                    onChange={(value) => handleConfigChange('temperature', (value || 0).toString())}
                    max={2}
                    min={0}
                    step={0.1}
                    marks={{ 0: '0', 1: '1', 2: '2' }}
                    tipFormatter={() => null}
                    tooltipVisible={false}
                  />
                </div>
              </div>
              <Text style={{ width: '50px', textAlign: 'right', marginLeft: '10px' }}>
                {currentConfig?.temperature}
              </Text>
            </div>
            <Paragraph size="small" type="tertiary" style={{ marginTop: 4 }}>
              较低的值使输出更确定，较高的值使输出更随机、创造性
            </Paragraph>
          </div>
          <div style={{ marginBottom: 10 }}>
            <Form.Label>最大Token数 (Max Tokens)</Form.Label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ flexGrow: 1, marginRight: 10, position: 'relative' }}>
                <div
                  style={{ paddingTop: '8px' }}
                  onMouseDown={handleSliderDragStart}
                  onMouseUp={handleSliderDragEnd}
                  onMouseLeave={handleSliderDragEnd}
                >
                  <Form.Slider
                    field="maxTokens"
                    initValue={parseInt(currentConfig?.maxTokens || '2000')}
                    onChange={(value) => handleConfigChange('maxTokens', (value || 100).toString())}
                    max={65535}
                    min={100}
                    step={100}
                    marks={{ 100: '100', 8000: '8k', 16000: '16k', 32000: '32k', 65535: '65k' }}
                    tipFormatter={() => null}
                    tooltipVisible={false}
                  />
                </div>
              </div>
              <Text style={{ width: '50px', textAlign: 'right', marginLeft: '10px' }}>
                {currentConfig?.maxTokens}
              </Text>
            </div>
            <Paragraph size="small" type="tertiary" style={{ marginTop: 4 }}>
              限制模型生成的最大token数量
            </Paragraph>
          </div>
        </Form>
      </Modal>

      {/* Embedding API配置模态框 */}
      <Modal
        title={isEmbeddingEditMode ? '编辑Embedding API配置' : '添加Embedding API配置'}
        visible={showEmbeddingModal}
        onCancel={() => setShowEmbeddingModal(false)}
        centered
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <ButtonGroup>
              <Button type="tertiary" onClick={() => setShowEmbeddingModal(false)}>
                取消
              </Button>
              <Button type="primary" onClick={handleSaveEmbeddingConfig}>
                保存
              </Button>
            </ButtonGroup>
          </div>
        }
      >
        <Form<EmbeddingApiConfig> labelPosition="left" labelWidth={100}>
          <Form.Input
            field="name"
            label="配置名称"
            placeholder="请输入配置名称，如OpenAI Embedding"
            initValue={currentEmbeddingConfig?.name}
            onChange={(value) => handleEmbeddingConfigInputChange('name', value)}
            showClear
            required
          />
          <Form.Input
            field="apiKey"
            label="API Key"
            placeholder="请输入API Key"
            initValue={currentEmbeddingConfig?.apiKey}
            onChange={(value) => handleEmbeddingConfigInputChange('apiKey', value)}
            showClear
          />
          <Form.Input
            field="apiUrl"
            label="API URL"
            placeholder="请输入API URL，如https://api.openai.com/v1"
            initValue={currentEmbeddingConfig?.apiUrl}
            onChange={(value) => handleEmbeddingConfigInputChange('apiUrl', value)}
            showClear
          />
          <Form.Input
            field="modelName"
            label="模型名称"
            placeholder="请输入模型名称，如text-embedding-3-small"
            initValue={currentEmbeddingConfig?.modelName}
            onChange={(value) => handleEmbeddingConfigInputChange('modelName', value)}
            showClear
          />
        </Form>

        {/* 现有配置列表 */}
        {embeddingApiConfigs.length > 0 && (
          <>
            <Divider />
            <div>
              <Text strong>现有配置</Text>
              <List
                dataSource={embeddingApiConfigs}
                renderItem={(config) => (
                  <List.Item
                    main={
                      <div>
                        <Text strong>{config.name}</Text>
                        <br />
                        <Text type="tertiary" size="small">
                          {config.modelName}
                        </Text>
                      </div>
                    }
                    extra={
                      <ButtonGroup>
                        <Button
                          type="tertiary"
                          size="small"
                          icon={<IconEdit />}
                          onClick={() => handleEditEmbeddingConfig(config)}
                        >
                          编辑
                        </Button>
                        <Popconfirm
                          title="确定要删除这个配置吗？"
                          content="删除后无法恢复"
                          onConfirm={() => handleDeleteEmbeddingConfig(config.id)}
                        >
                          <Button type="danger" size="small" icon={<IconDelete />}>
                            删除
                          </Button>
                        </Popconfirm>
                      </ButtonGroup>
                    }
                  />
                )}
              />
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

export default Settings
