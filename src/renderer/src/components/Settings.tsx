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
  Spin,
  ButtonGroup,
  Tabs,
  TabPane,
  Radio
} from '@douyinfe/semi-ui'
import {
  IconPulse,
  IconPlus,
  IconDelete,
  IconEdit,
  IconRefresh,
  IconPieChartStroked,
  IconDownload
} from '@douyinfe/semi-icons'
import { v4 as uuidv4 } from 'uuid'
import WebDAVSettings from './WebDAVSettings'
import './Settings.css'
// 导入性能监控器
import { performanceMonitor, type PerformanceMetrics } from '../utils/PerformanceMonitor'
// 导入多语言hook
import { useTranslation } from '../locales'

const { Title, Paragraph, Text } = Typography

// API配置接口
interface AiApiConfig {
  id: string
  name: string
  type: 'llm' | 'embedding'
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

const Settings: React.FC = () => {
  // 多语言支持
  const { t, formatMessage } = useTranslation()
  
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

  // 性能监控相关状态
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null)
  const [isExportingPerformance, setIsExportingPerformance] = useState(false)

  // 记忆功能相关状态
  const [memoryConfig, setMemoryConfig] = useState({
    enabled: false,
    selectedLlmId: '',
    selectedEmbeddingId: ''
  })

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

      // 加载记忆功能设置
      if (settings.memory) {
        const memorySettings = settings.memory as any
        // 处理旧版本配置向新版本的迁移
        if (memorySettings.apiKey && !memorySettings.selectedLlmId) {
          // 旧版本配置迁移
          setMemoryConfig({
            enabled: memorySettings.enabled || false,
            selectedLlmId: '',
            selectedEmbeddingId: ''
          })
        } else {
          // 新版本配置
          setMemoryConfig(memorySettings)
        }
      }
    } catch (error) {
      Toast.error(t('common.loadingFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 加载所有设置
  useEffect(() => {
    loadSettings()

    // 捕获当前的ref值
    const timers = testResultTimersRef.current

    // 组件卸载时清除所有定时器
    return (): void => {
      Object.values(timers).forEach((timerId) => {
        clearTimeout(timerId)
      })
    }
  }, [loadSettings])

  // 打开添加新配置的模态框
  const handleAddConfig = (): void => {
    setCurrentConfig({
      id: uuidv4(),
      name: '',
      type: 'llm',
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
        Toast.error(t('settings.basic.apiConfig.toast.nameRequired'))
        return
      }

      // 保存配置
      const result = await window.api.api.saveConfig(currentConfig)

      if (result.success) {
        Toast.success(isEditMode ? t('settings.basic.apiConfig.toast.updated') : t('settings.basic.apiConfig.toast.saved'))
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
        Toast.error(`${t('settings.basic.apiConfig.toast.saveFailed')}: ${result.error || '未知错误'}`)
      }
    } catch (error) {
      Toast.error(t('settings.basic.apiConfig.toast.saveFailed'))
    }
  }

  // 删除配置
  const handleDeleteConfig = async (configId: string): Promise<void> => {
    try {
      const result = await window.api.api.deleteConfig(configId)

      if (result.success) {
        Toast.success(t('settings.basic.apiConfig.toast.deleted'))
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
        Toast.error(`${t('settings.basic.apiConfig.toast.deleteFailed')}: ${result.error || '未知错误'}`)
      }
    } catch (error) {
      Toast.error(t('settings.basic.apiConfig.toast.deleteFailed'))
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
        Toast.success(t('settings.basic.apiConfig.toast.testSuccess'))
      } else {
        Toast.error(t('settings.basic.apiConfig.toast.testFailed'))
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
      Toast.error(t('settings.basic.apiConfig.toast.testError'))

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
          title={t('settings.basic.apiConfig.noConfigs')}
          description={t('settings.basic.apiConfig.noConfigsDesc')}
        />
      )
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {AiApiConfigs.map((config) => {
          const isLLM = config.type === 'llm'
          const cardStyle = {
            border: `2px solid ${isLLM ? 'rgba(0, 100, 250, 0.3)' : 'rgba(0, 180, 42, 0.3)'}`,
            backgroundColor: isLLM ? 'rgba(0, 100, 250, 0.05)' : 'rgba(0, 180, 42, 0.05)'
          }
          
          return (
          <Card
            key={config.id}
            headerLine={true}
            style={cardStyle}
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ 
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: 'white',
                  backgroundColor: isLLM ? '#0064fa' : '#00b42a',
                  marginRight: '8px'
                }}>
                  {isLLM ? 'LLM' : 'Embedding'}
                </span>
              </div>
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
                  {t('settings.basic.apiConfig.testConnection')}
                </Button>
                <Button
                  icon={<IconEdit />}
                  onClick={() => handleEditConfig(config)}
                  theme="borderless"
                  type="tertiary"
                  size="small"
                >
                  {t('settings.basic.apiConfig.edit')}
                </Button>
                <Button
                  icon={<IconDelete />}
                  theme="borderless"
                  type="danger"
                  size="small"
                  onClick={() => handleDeleteConfig(config.id)}
                >
                  {t('settings.basic.apiConfig.delete')}
                </Button>
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
              {config.type === 'llm' && (
                <>
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
                </>
              )}

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
                      {testResults[config.id].success 
                        ? `✓ ${t('settings.basic.apiConfig.testResult.success')}` 
                        : `✗ ${t('settings.basic.apiConfig.testResult.failed')}`}
                    </Text>
                  </div>
                  <Text style={{ marginTop: 4, fontSize: '13px' }}>
                    {testResults[config.id].message}
                  </Text>
                </div>
              )}
            </div>
          </Card>
          )
        })}
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
        Toast.error(t('common.saveFailed'))
      }
    } catch (error) {
      Toast.error(t('common.saveFailed'))
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
        Toast.error(`${t('settings.basic.updateResult.checkFailedWithError')}: ${result.error}`)
        setUpdateResult({
          hasUpdate: false,
          latestVersion: '',
          currentVersion: result.currentVersion,
          error: result.error
        })
      } else if (result.hasUpdate) {
        // 有更新
        Toast.info(`${t('settings.basic.updateResult.hasUpdatePrefix')}: ${result.latestVersion}`)
        setUpdateResult(result)
      } else if (result.latestVersion) {
        // 已是最新版本
        Toast.info(t('settings.basic.updateResult.noUpdatePrefix'))
        setUpdateResult(result)
      } else {
        // 检查失败，但没有详细错误信息
        Toast.error(t('settings.basic.updateResult.networkCheckFailed'))
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
      Toast.info(`${t('settings.basic.updateResult.hasUpdatePrefix')}: ${updateInfo.latestVersion}`)
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
      Toast.success(t('common.success'))
    } catch (error) {
      Toast.error(t('common.saveFailed'))
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

  // 加载性能指标
  const loadPerformanceMetrics = useCallback(() => {
    const metrics = performanceMonitor.getCurrentMetrics()
    setPerformanceMetrics(metrics)
  }, [])

  // 重置性能统计
  const handleResetPerformanceMetrics = useCallback(() => {
    performanceMonitor.resetMetrics()
    loadPerformanceMetrics()
    Toast.success(t('settings.performance.resetSuccess'))
  }, [loadPerformanceMetrics])

  // 记忆功能相关处理函数
  const handleMemoryConfigChange = async (field: string, value: any): Promise<void> => {
    try {
      let newConfig = { ...memoryConfig }

      // 处理嵌套配置
      if (field === 'selectedLlmId') {
        newConfig.selectedLlmId = value
      } else if (field === 'selectedEmbeddingId') {
        newConfig.selectedEmbeddingId = value
      } else {
        newConfig = { ...newConfig, [field]: value }
      }

      setMemoryConfig(newConfig)

      // 保存到设置
      await window.api.settings.set('memory', newConfig)

      // 如果启用状态改变或API密钥改变，需要初始化或关闭服务
      if (field === 'enabled') {
        await (window as any).api.memory.updateConfig(newConfig)
      }

              Toast.success(t('common.success'))
      } catch (error) {
        Toast.error(t('common.saveFailed'))
      console.error('Memory config save error:', error)
    }
  }

  // 导出性能数据
  const handleExportPerformanceData = useCallback(async () => {
    try {
      setIsExportingPerformance(true)
      const data = performanceMonitor.exportData()

      // 创建下载链接
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `performance-data-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      Toast.success(t('settings.performance.exportSuccess'))
    } catch (error) {
      Toast.error(t('settings.performance.exportFailed'))
    } finally {
      setIsExportingPerformance(false)
    }
  }, [])

  // 格式化字节数
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 格式化时间
  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  // 格式化速度
  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`
  }

  // 加载性能指标和设置定时刷新 (仅用于显示，不启动全局监控)
  useEffect(() => {
    loadPerformanceMetrics()

    // 每10秒更新一次性能指标显示
    const interval = setInterval(loadPerformanceMetrics, 10000)

    return () => clearInterval(interval)
  }, [loadPerformanceMetrics])

  return (
    <div
      style={{
        padding: '0px',
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
    >
      <Title heading={2}>{t('settings.title')}</Title>

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
        <TabPane tab={t('settings.tabs.basic')} itemKey="basic">
          <div className="settings-scroll-container">
            {/* 更新检查设置卡片 */}
            <Card style={{ marginBottom: 20 }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <Text strong>{t('settings.basic.autoUpdate.title')}</Text>
                  <Paragraph spacing="normal" type="tertiary">
                    {t('settings.basic.autoUpdate.description')}
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
                  <Text strong>{t('settings.basic.manualUpdate.title')}</Text>
                  <Paragraph spacing="normal" type="tertiary">
                    {t('settings.basic.manualUpdate.description')}
                  </Paragraph>
                </div>
                <Button
                  icon={<IconRefresh />}
                  onClick={handleCheckUpdates}
                  loading={isCheckingUpdates}
                  theme="solid"
                  type="tertiary"
                >
                  {t('settings.basic.manualUpdate.button')}
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
                        ? `❌ ${t('settings.basic.updateResult.checkFailed')}`
                        : updateResult.hasUpdate
                          ? `✓ ${t('settings.basic.updateResult.hasUpdatePrefix')}: ${updateResult.latestVersion}`
                          : `✓ ${t('settings.basic.updateResult.noUpdatePrefix')}`}
                    </Text>
                  </div>
                  <Text style={{ marginTop: 4, fontSize: '13px' }}>
                    {updateResult.error
                      ? `${t('settings.basic.updateResult.errorInfo')}: ${updateResult.error}`
                      : updateResult.hasUpdate
                        ? formatMessage(t('settings.basic.updateResult.canDownload'), { currentVersion: updateResult.currentVersion })
                        : `${t('settings.basic.updateResult.currentVersion')}: ${updateResult.currentVersion}`}
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
                        {t('settings.basic.updateResult.goToDownload')}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <Divider />
              <Paragraph type="tertiary" style={{ fontSize: '13px' }}>
                {t('settings.basic.updateResult.networkTip')}
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
              <Title heading={5}>{t('settings.basic.apiConfig.title')}</Title>
              <ButtonGroup>
                <Button
                  icon={<IconPlus />}
                  onClick={handleAddConfig}
                  theme="solid"
                  type="primary"
                  size="small"
                >
                  {t('settings.basic.apiConfig.addButton')}
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

        <TabPane tab={t('settings.tabs.history')} itemKey="history">
          <div className="settings-scroll-container">
            {/* 历史记录管理设置卡片 */}
            <Card
              title={t('settings.history.title')}
              style={{ marginTop: 20, marginBottom: '16px' }}
              headerExtraContent={
                <Button type="primary" theme="solid" onClick={saveHistoryManagement}>
                  {t('settings.history.saveButton')}
                </Button>
              }
            >
              <Form>
                <Form.RadioGroup
                  field="historyType"
                  label={t('settings.history.type.label')}
                  initValue={historyManagement.type}
                  onChange={handleHistoryTypeChange}
                >
                  <Radio value="count">{t('settings.history.type.byCount')}</Radio>
                  <Radio value="time">{t('settings.history.type.byTime')}</Radio>
                </Form.RadioGroup>

                {historyManagement.type === 'count' && (
                  <Form.InputNumber
                    field="maxCount"
                    label={t('settings.history.maxCount.label')}
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
                    label={t('settings.history.maxDays.label')}
                    initValue={historyManagement.maxDays}
                    onChange={handleMaxDaysChange}
                    min={1}
                    max={365}
                    step={1}
                    suffix={t('settings.history.maxDays.unit')}
                    style={{ width: '200px' }}
                  />
                )}

                <Paragraph style={{ marginTop: '16px', color: 'var(--semi-color-text-2)' }}>
                  {historyManagement.type === 'count'
                    ? formatMessage(t('settings.history.description.byCount'), { count: historyManagement.maxCount })
                    : formatMessage(t('settings.history.description.byTime'), { days: historyManagement.maxDays })}
                </Paragraph>
              </Form>
            </Card>
          </div>
        </TabPane>

        <TabPane tab={t('settings.tabs.memory')} itemKey="memory">
          <div className="settings-scroll-container">
            <Card title={t('settings.memory.title')} style={{ marginBottom: 20 }}>
              <Form onValueChange={(values) => console.log('Memory form values:', values)}>
                <div style={{ maxWidth: 600 }}>
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong>{t('settings.memory.enable.label')}</Text>
                    </div>
                    <Switch
                      checked={memoryConfig.enabled}
                      onChange={(checked) => handleMemoryConfigChange('enabled', checked)}
                    />
                    <div
                      style={{
                        color: 'var(--semi-color-text-2)',
                        fontSize: '12px',
                        marginTop: '4px'
                      }}
                    >
                      {t('settings.memory.enable.description')}
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong>{t('settings.memory.llmConfig.label')}</Text>
                    </div>
                    <Form.Select
                      field="LLM 选择"
                      initValue={memoryConfig.selectedLlmId || ''}
                      onChange={(value) => handleMemoryConfigChange('selectedLlmId', value)}
                      disabled={!memoryConfig.enabled}
                      style={{ width: '100%' }}
                      placeholder={t('settings.memory.llmConfig.placeholder')}
                    >
                      {AiApiConfigs.filter(config => config.type === 'llm').map((config) => (
                        <Form.Select.Option key={config.id} value={config.id}>
                          {config.name} ({config.modelName})
                        </Form.Select.Option>
                      ))}
                    </Form.Select>
                    <div style={{ color: 'var(--semi-color-text-2)', fontSize: '12px', marginTop: '4px' }}>
                      {t('settings.memory.llmConfig.tip')}
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong>{t('settings.memory.embeddingConfig.label')}</Text>
                    </div>
                    <Form.Select
                      field="Text Embedding 选择"
                      initValue={memoryConfig.selectedEmbeddingId || ''}
                      onChange={(value) => handleMemoryConfigChange('selectedEmbeddingId', value)}
                      disabled={!memoryConfig.enabled}
                      style={{ width: '100%' }}
                      placeholder={t('settings.memory.embeddingConfig.placeholder')}
                    >
                      {AiApiConfigs.filter(config => config.type === 'embedding').map((config) => (
                        <Form.Select.Option key={config.id} value={config.id}>
                          {config.name} ({config.modelName})
                        </Form.Select.Option>
                      ))}
                    </Form.Select>
                    <div style={{ color: 'var(--semi-color-text-2)', fontSize: '12px', marginTop: '4px' }}>
                      {t('settings.memory.embeddingConfig.tip')}
                    </div>
                  </div>
                </div>

                <Paragraph
                  style={{
                    fontSize: '14px',
                    color: 'var(--semi-color-text-2)',
                    marginTop: '16px',
                    padding: '12px',
                    backgroundColor: 'var(--semi-color-fill-0)',
                    borderRadius: '6px'
                  }}
                >
                  <strong>{t('settings.memory.description.title')}</strong>
                  <br />
                  {t('settings.memory.description.line1')}
                  <br />
                  {t('settings.memory.description.line2')}
                  <br />
                  {t('settings.memory.description.line3')}
                  <br />{t('settings.memory.description.line4')}
                </Paragraph>
              </Form>
            </Card>
          </div>
        </TabPane>

        <TabPane tab={t('settings.tabs.webdav')} itemKey="webdav">
          <WebDAVSettings onSyncComplete={handleSyncComplete} />
        </TabPane>

        <TabPane tab={t('settings.tabs.performance')} itemKey="performance">
          <div className="settings-scroll-container">
            {/* 性能统计卡片 */}
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IconPieChartStroked />
                  <span>{t('settings.performance.title')}</span>
                </div>
              }
              style={{ marginBottom: 20 }}
              headerExtraContent={
                <ButtonGroup>
                  <Button
                    icon={<IconRefresh />}
                    onClick={loadPerformanceMetrics}
                    theme="borderless"
                    type="tertiary"
                    size="small"
                  >
                    {t('settings.performance.refresh')}
                  </Button>
                  <Button
                    icon={<IconDownload />}
                    onClick={handleExportPerformanceData}
                    loading={isExportingPerformance}
                    theme="borderless"
                    type="primary"
                    size="small"
                  >
                    {t('settings.performance.export')}
                  </Button>
                  <Button
                    onClick={handleResetPerformanceMetrics}
                    theme="borderless"
                    type="danger"
                    size="small"
                  >
                    {t('settings.performance.reset')}
                  </Button>
                </ButtonGroup>
              }
            >
              {performanceMetrics ? (
                <div
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}
                >
                  {/* 内存使用 */}
                  <div
                    style={{
                      padding: '16px',
                      background: 'var(--semi-color-fill-0)',
                      borderRadius: '6px'
                    }}
                  >
                    <Title heading={6} style={{ marginBottom: '12px' }}>
                      {t('settings.performance.memory.title')}
                    </Title>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="tertiary">{t('settings.performance.memory.used')}: </Text>
                      <Text>{formatBytes(performanceMetrics.memoryUsage.used)}</Text>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="tertiary">{t('settings.performance.memory.total')}: </Text>
                      <Text>{formatBytes(performanceMetrics.memoryUsage.total)}</Text>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="tertiary">{t('settings.performance.memory.usage')}: </Text>
                      <Text
                        style={{
                          color:
                            performanceMetrics.memoryUsage.percentage > 75
                              ? 'var(--semi-color-warning)'
                              : performanceMetrics.memoryUsage.percentage > 90
                                ? 'var(--semi-color-danger)'
                                : 'var(--semi-color-success)'
                        }}
                      >
                        {performanceMetrics.memoryUsage.percentage.toFixed(1)}%
                      </Text>
                    </div>
                  </div>

                  {/* 编辑器性能 */}
                  <div
                    style={{
                      padding: '16px',
                      background: 'var(--semi-color-fill-0)',
                      borderRadius: '6px'
                    }}
                  >
                    <Title heading={6} style={{ marginBottom: '12px' }}>
                      {t('settings.performance.editor.title')}
                    </Title>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="tertiary">{t('settings.performance.editor.loadTime')}: </Text>
                      <Text>{formatTime(performanceMetrics.editorPerformance.loadTime)}</Text>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="tertiary">{t('settings.performance.editor.saveTime')}: </Text>
                      <Text>{formatTime(performanceMetrics.editorPerformance.saveTime)}</Text>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="tertiary">{t('settings.performance.editor.renderTime')}: </Text>
                      <Text>{formatTime(performanceMetrics.editorPerformance.renderTime)}</Text>
                    </div>
                  </div>

                  {/* 用户操作统计 */}
                  <div
                    style={{
                      padding: '16px',
                      background: 'var(--semi-color-fill-0)',
                      borderRadius: '6px'
                    }}
                  >
                    <Title heading={6} style={{ marginBottom: '12px' }}>
                      {t('settings.performance.userActions.title')}
                    </Title>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="tertiary">{t('settings.performance.userActions.editorChanges')}: </Text>
                      <Text>{performanceMetrics.userActions.editorChanges}</Text>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="tertiary">{t('settings.performance.userActions.saves')}: </Text>
                      <Text>{performanceMetrics.userActions.saves}</Text>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="tertiary">{t('settings.performance.userActions.loads')}: </Text>
                      <Text>{performanceMetrics.userActions.loads}</Text>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="tertiary">{t('settings.performance.userActions.searches')}: </Text>
                      <Text>{performanceMetrics.userActions.searches}</Text>
                    </div>
                  </div>

                  {/* 网络性能 */}
                  <div
                    style={{
                      padding: '16px',
                      background: 'var(--semi-color-fill-0)',
                      borderRadius: '6px'
                    }}
                  >
                    <Title heading={6} style={{ marginBottom: '12px' }}>
                      {t('settings.performance.network.title')}
                    </Title>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="tertiary">{t('settings.performance.network.uploadSpeed')}: </Text>
                      <Text>
                        {performanceMetrics.networkPerformance.uploadSpeed > 0
                          ? formatSpeed(performanceMetrics.networkPerformance.uploadSpeed)
                          : t('settings.performance.network.notRecorded')}
                      </Text>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="tertiary">{t('settings.performance.network.downloadSpeed')}: </Text>
                      <Text>
                        {performanceMetrics.networkPerformance.downloadSpeed > 0
                          ? formatSpeed(performanceMetrics.networkPerformance.downloadSpeed)
                          : t('settings.performance.network.notRecorded')}
                      </Text>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="tertiary">{t('settings.performance.network.latency')}: </Text>
                      <Text>
                        {performanceMetrics.networkPerformance.latency > 0
                          ? `${performanceMetrics.networkPerformance.latency.toFixed(0)}ms`
                          : t('settings.performance.network.notRecorded')}
                      </Text>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Spin size="large" />
                  <Paragraph style={{ marginTop: '16px' }}>{t('settings.performance.loading')}</Paragraph>
                </div>
              )}

              {/* 性能报告 */}
              {performanceMetrics && (
                <div style={{ marginTop: '24px' }}>
                  <Title heading={6} style={{ marginBottom: '12px' }}>
                    {t('settings.performance.report.title')}
                  </Title>
                  {(() => {
                    const report = performanceMonitor.generatePerformanceReport()
                    return (
                      <div
                        style={{
                          padding: '16px',
                          background: 'var(--semi-color-fill-0)',
                          borderRadius: '6px'
                        }}
                      >
                        <div style={{ marginBottom: '16px' }}>
                          <Text strong>{t('settings.performance.report.summary.title')}</Text>
                          <div
                            style={{
                              marginTop: '8px',
                              display: 'grid',
                              gridTemplateColumns: 'repeat(2, 1fr)',
                              gap: '8px'
                            }}
                          >
                            <div>
                              <Text type="tertiary">{t('settings.performance.report.summary.averageMemory')}: </Text>
                              <Text>{report.summary.averageMemoryUsage}%</Text>
                            </div>
                            <div>
                              <Text type="tertiary">{t('settings.performance.report.summary.averageLoadTime')}: </Text>
                              <Text>{formatTime(report.summary.averageLoadTime)}</Text>
                            </div>
                            <div>
                              <Text type="tertiary">{t('settings.performance.report.summary.averageSaveTime')}: </Text>
                              <Text>{formatTime(report.summary.averageSaveTime)}</Text>
                            </div>
                            <div>
                              <Text type="tertiary">{t('settings.performance.report.summary.totalActions')}: </Text>
                              <Text>{report.summary.totalUserActions}</Text>
                            </div>
                          </div>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                          <Text strong>{t('settings.performance.report.trends.title')}</Text>
                          <div style={{ marginTop: '8px' }}>
                            <div style={{ marginBottom: '4px' }}>
                              <Text type="tertiary">{t('common.memoryTrend')}: </Text>
                              <Text
                                style={{
                                  color:
                                    report.trends.memoryTrend === 'increasing'
                                      ? 'var(--semi-color-warning)'
                                      : report.trends.memoryTrend === 'decreasing'
                                        ? 'var(--semi-color-success)'
                                        : 'var(--semi-color-text-2)'
                                }}
                              >
                                {report.trends.memoryTrend === 'increasing'
                                  ? t('settings.performance.report.trends.memory.increasing')
                                  : report.trends.memoryTrend === 'decreasing'
                                    ? t('settings.performance.report.trends.memory.decreasing')
                                    : t('settings.performance.report.trends.memory.stable')}
                              </Text>
                            </div>
                            <div>
                              <Text type="tertiary">{t('common.performanceTrend')}: </Text>
                              <Text
                                style={{
                                  color:
                                    report.trends.performanceTrend === 'improving'
                                      ? 'var(--semi-color-success)'
                                      : report.trends.performanceTrend === 'declining'
                                        ? 'var(--semi-color-warning)'
                                        : 'var(--semi-color-text-2)'
                                }}
                              >
                                {report.trends.performanceTrend === 'improving'
                                  ? t('settings.performance.report.trends.performance.improving')
                                  : report.trends.performanceTrend === 'declining'
                                    ? t('settings.performance.report.trends.performance.declining')
                                    : t('settings.performance.report.trends.performance.stable')}
                              </Text>
                            </div>
                          </div>
                        </div>

                        <div>
                          <Text strong>{t('settings.performance.report.recommendations.title')}</Text>
                          <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                            {report.recommendations.map((rec, index) => (
                              <li key={index} style={{ marginBottom: '4px' }}>
                                <Text type="tertiary">{rec}</Text>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              <Paragraph
                style={{ marginTop: '16px', color: 'var(--semi-color-text-2)', fontSize: '13px' }}
              >
                {t('settings.performance.tip')}
              </Paragraph>
            </Card>
          </div>
        </TabPane>
      </Tabs>

      {/* 添加/编辑配置模态框 */}
      <Modal
        title={isEditMode ? t('settings.basic.apiConfig.modal.editTitle') : t('settings.basic.apiConfig.modal.addTitle')}
        visible={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        centered
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <ButtonGroup>
              <Button type="tertiary" onClick={() => setIsModalOpen(false)}>
                {t('settings.basic.apiConfig.modal.cancel')}
              </Button>
              <Button type="primary" onClick={handleSaveConfig}>
                {t('settings.basic.apiConfig.modal.save')}
              </Button>
            </ButtonGroup>
          </div>
        }
      >
        <Form<AiApiConfig> labelPosition="left" labelWidth={100}>
          <Form.Select
            field="type"
            label="API类型"
            placeholder="请选择API类型"
            initValue={currentConfig?.type || 'llm'}
            onChange={(value) => handleConfigChange('type', value as string)}
            style={{ width: '100%' }}
          >
            <Form.Select.Option value="llm">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ 
                  padding: '2px 6px', 
                  borderRadius: '8px', 
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: 'white',
                  backgroundColor: '#0064fa',
                  marginRight: '8px'
                }}>
                  {t('settings.basic.apiConfig.types.llm')}
                </span>
                {t('settings.basic.apiConfig.types.llm')}
              </div>
            </Form.Select.Option>
            <Form.Select.Option value="embedding">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ 
                  padding: '2px 6px', 
                  borderRadius: '8px', 
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: 'white',
                  backgroundColor: '#00b42a',
                  marginRight: '8px'
                }}>
                  Embedding
                </span>
                {t('settings.basic.apiConfig.types.embedding')}
              </div>
            </Form.Select.Option>
          </Form.Select>
          <Form.Input
            field="name"
            label={t('settings.basic.apiConfig.fields.name')}
            placeholder={t('settings.basic.apiConfig.fields.namePlaceholder')}
            initValue={currentConfig?.name}
            onChange={(value) => handleConfigChange('name', value)}
            showClear
            required
          />
          <Form.Input
            field="apiKey"
            label={t('settings.basic.apiConfig.fields.apiKey')}
            placeholder={t('settings.basic.apiConfig.fields.apiKeyPlaceholder')}
            initValue={currentConfig?.apiKey}
            onChange={(value) => handleConfigChange('apiKey', value)}
            showClear
          />
          <Form.Input
            field="apiUrl"
            label={t('settings.basic.apiConfig.fields.apiUrl')}
            placeholder={t('settings.basic.apiConfig.fields.apiUrlPlaceholder')}
            initValue={currentConfig?.apiUrl}
            onChange={(value) => handleConfigChange('apiUrl', value)}
            showClear
          />
          <Form.Input
            field="modelName"
            label={t('settings.basic.apiConfig.fields.modelName')}
            placeholder={t('settings.basic.apiConfig.fields.modelNamePlaceholder')}
            initValue={currentConfig?.modelName}
            onChange={(value) => handleConfigChange('modelName', value)}
            showClear
          />
          {currentConfig?.type === 'llm' && (
          <>
          <div style={{ marginBottom: 20 }}>
            <Form.Label>{t('settings.basic.apiConfig.fields.temperature')}</Form.Label>
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
              {t('settings.basic.apiConfig.fields.temperatureDesc')}
            </Paragraph>
          </div>
          <div style={{ marginBottom: 10 }}>
            <Form.Label>{t('settings.basic.apiConfig.fields.maxTokens')}</Form.Label>
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
              {t('settings.basic.apiConfig.fields.maxTokensDesc')}
            </Paragraph>
          </div>
          </>
          )}
        </Form>
      </Modal>
    </div>
  )
}

export default Settings
