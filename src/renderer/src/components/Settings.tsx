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
  Radio,
  Select
} from '@douyinfe/semi-ui'
import {
  IconPulse,
  IconPlus,
  IconDelete,
  IconEdit,
  IconRefresh,
  IconPieChartStroked,
  IconDownload,
  IconLanguage
} from '@douyinfe/semi-icons'
import { v4 as uuidv4 } from 'uuid'
import WebDAVSettings from './WebDAVSettings'
import './Settings.css'
// 导入性能监控器
import { performanceMonitor, type PerformanceMetrics } from '../utils/PerformanceMonitor'
// 导入多语言支持
import { useLanguage } from '../locales'

const { Title, Paragraph, Text } = Typography
const { TabPane } = Tabs

// API配置接口
interface AiApiConfig {
  id: string
  name: string
  apiKey: string
  apiUrl: string
  modelName: string
  temperature?: string
  maxTokens?: string
  isThinkingModel?: boolean // 是否为思维模型
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
  const { language, setLanguage, t } = useLanguage()
  const [activeTab, setActiveTab] = useState('basic')
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
    } catch (error) {
      Toast.error('加载设置失败')
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
      apiKey: '',
      apiUrl: '',
      modelName: '',
      temperature: '0.7',
      maxTokens: '2000',
      isThinkingModel: false
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
  const handleConfigChange = (key: keyof AiApiConfig, value: string | boolean): void => {
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
      <div className="api-config-grid">
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
                <Button
                  icon={<IconDelete />}
                  theme="borderless"
                  type="danger"
                  size="small"
                  onClick={() => handleDeleteConfig(config.id)}
                >
                  删除
                </Button>
              </ButtonGroup>
            }
            style={{
              backgroundColor: config.isThinkingModel ? 'rgba(0, 180, 42, 0.08)' : undefined,
              border: config.isThinkingModel ? '1px solid rgba(0, 180, 42, 0.2)' : undefined
            }}
          >
            <div style={{ padding: '0 4px' }}>
              {/* 将名称添加到卡片内容区域 */}
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Text strong style={{ fontSize: '16px' }}>
                  {config.name}
                </Text>
                {config.isThinkingModel && (
                  <span
                    style={{
                      backgroundColor: 'rgba(0, 180, 42, 0.15)',
                      color: '#00b42a',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    思维模型
                  </span>
                )}
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

  // 加载性能指标
  const loadPerformanceMetrics = useCallback(() => {
    const metrics = performanceMonitor.getCurrentMetrics()
    setPerformanceMetrics(metrics)
  }, [])

  // 重置性能统计
  const handleResetPerformanceMetrics = useCallback(() => {
    performanceMonitor.resetMetrics()
    loadPerformanceMetrics()
    Toast.success('性能统计已重置')
  }, [loadPerformanceMetrics])

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

      Toast.success('性能数据导出成功')
    } catch (error) {
      Toast.error('导出性能数据失败')
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
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <Title 
        heading={2} 
        style={{ 
          marginBottom: '20px',
          flexShrink: 0
        }}
      >
        {t('settings.title')}
      </Title>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="line"
        size="large"
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          width: '100%'
        }}
        tabPosition="top"
        contentStyle={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}
      >
        <TabPane tab={t('settings.tabs.basic')} itemKey="basic" style={{ height: '100%' }}>
          <div className="settings-scroll-container">
            {/* 语言设置卡片 */}
            <Card style={{ marginBottom: 20 }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <IconLanguage />
                    <Text strong>{t('settings.language.title')}</Text>
                  </div>
                  <Paragraph spacing="normal" type="tertiary">
                    {t('settings.language.description')}
                  </Paragraph>
                </div>
                <Select
                  value={language}
                  onChange={(value) => setLanguage(value as 'zh-CN' | 'en-US')}
                  style={{ width: 200 }}
                >
                  <Select.Option value="zh-CN">简体中文</Select.Option>
                  <Select.Option value="en-US">English</Select.Option>
                </Select>
              </div>
            </Card>
            
            {/* 更新检查设置卡片 */}
            <Card style={{ marginBottom: 20 }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <Text strong>{t('settings.autoUpdate.title')}</Text>
                  <Paragraph spacing="normal" type="tertiary">
                    {t('settings.autoUpdate.description')}
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
                  <Text strong>{t('settings.autoUpdate.manual')}</Text>
                  <Paragraph spacing="normal" type="tertiary">
                    {t('settings.autoUpdate.manualDescription')}
                  </Paragraph>
                </div>
                <Button
                  icon={<IconRefresh />}
                  onClick={handleCheckUpdates}
                  loading={isCheckingUpdates}
                  theme="solid"
                  type="tertiary"
                >
                  {t('settings.autoUpdate.checkNow')}
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

        <TabPane tab={t('settings.tabs.history')} itemKey="history" style={{ height: '100%' }}>
          <div className="settings-scroll-container">
            {/* 历史记录管理设置卡片 */}
            <Card
              title={t('settings.history.title')}
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

        <TabPane tab={t('settings.tabs.webdav')} itemKey="webdav" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <WebDAVSettings onSyncComplete={handleSyncComplete} />
        </TabPane>

        <TabPane tab={t('settings.tabs.performance')} itemKey="performance" style={{ height: '100%' }}>
          <div className="settings-scroll-container">
            {/* 性能统计卡片 */}
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IconPieChartStroked />
                  <span>性能统计</span>
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
                    刷新
                  </Button>
                  <Button
                    icon={<IconDownload />}
                    onClick={handleExportPerformanceData}
                    loading={isExportingPerformance}
                    theme="borderless"
                    type="primary"
                    size="small"
                  >
                    导出数据
                  </Button>
                  <Button
                    onClick={handleResetPerformanceMetrics}
                    theme="borderless"
                    type="danger"
                    size="small"
                  >
                    重置统计
                  </Button>
                </ButtonGroup>
              }
            >
              {performanceMetrics ? (
                <div className="performance-grid">
                  {/* 内存使用 */}
                  <div
                    style={{
                      padding: '16px',
                      background: 'var(--semi-color-fill-0)',
                      borderRadius: '6px'
                    }}
                  >
                    <Title heading={6} style={{ marginBottom: '12px' }}>
                      内存使用
                    </Title>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="tertiary">已使用: </Text>
                      <Text>{formatBytes(performanceMetrics.memoryUsage.used)}</Text>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="tertiary">总量: </Text>
                      <Text>{formatBytes(performanceMetrics.memoryUsage.total)}</Text>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="tertiary">使用率: </Text>
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
                      编辑器性能
                    </Title>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="tertiary">加载时间: </Text>
                      <Text>{formatTime(performanceMetrics.editorPerformance.loadTime)}</Text>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="tertiary">保存时间: </Text>
                      <Text>{formatTime(performanceMetrics.editorPerformance.saveTime)}</Text>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="tertiary">渲染时间: </Text>
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
                      操作统计
                    </Title>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="tertiary">编辑次数: </Text>
                      <Text>{performanceMetrics.userActions.editorChanges}</Text>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="tertiary">保存次数: </Text>
                      <Text>{performanceMetrics.userActions.saves}</Text>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="tertiary">加载次数: </Text>
                      <Text>{performanceMetrics.userActions.loads}</Text>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="tertiary">搜索次数: </Text>
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
                      网络性能
                    </Title>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="tertiary">上传速度: </Text>
                      <Text>
                        {performanceMetrics.networkPerformance.uploadSpeed > 0
                          ? formatSpeed(performanceMetrics.networkPerformance.uploadSpeed)
                          : '未记录'}
                      </Text>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="tertiary">下载速度: </Text>
                      <Text>
                        {performanceMetrics.networkPerformance.downloadSpeed > 0
                          ? formatSpeed(performanceMetrics.networkPerformance.downloadSpeed)
                          : '未记录'}
                      </Text>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="tertiary">延迟: </Text>
                      <Text>
                        {performanceMetrics.networkPerformance.latency > 0
                          ? `${performanceMetrics.networkPerformance.latency.toFixed(0)}ms`
                          : '未记录'}
                      </Text>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Spin size="large" />
                  <Paragraph style={{ marginTop: '16px' }}>加载性能数据中...</Paragraph>
                </div>
              )}

              {/* 性能报告 */}
              {performanceMetrics && (
                <div style={{ marginTop: '24px' }}>
                  <Title heading={6} style={{ marginBottom: '12px' }}>
                    性能分析报告
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
                          <Text strong>性能摘要</Text>
                          <div
                            style={{
                              marginTop: '8px',
                              display: 'grid',
                              gridTemplateColumns: 'repeat(2, 1fr)',
                              gap: '8px'
                            }}
                          >
                            <div>
                              <Text type="tertiary">平均内存使用: </Text>
                              <Text>{report.summary.averageMemoryUsage}%</Text>
                            </div>
                            <div>
                              <Text type="tertiary">平均加载时间: </Text>
                              <Text>{formatTime(report.summary.averageLoadTime)}</Text>
                            </div>
                            <div>
                              <Text type="tertiary">平均保存时间: </Text>
                              <Text>{formatTime(report.summary.averageSaveTime)}</Text>
                            </div>
                            <div>
                              <Text type="tertiary">总操作次数: </Text>
                              <Text>{report.summary.totalUserActions}</Text>
                            </div>
                          </div>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                          <Text strong>性能趋势</Text>
                          <div style={{ marginTop: '8px' }}>
                            <div style={{ marginBottom: '4px' }}>
                              <Text type="tertiary">内存趋势: </Text>
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
                                  ? '上升'
                                  : report.trends.memoryTrend === 'decreasing'
                                    ? '下降'
                                    : '稳定'}
                              </Text>
                            </div>
                            <div>
                              <Text type="tertiary">性能趋势: </Text>
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
                                  ? '提升'
                                  : report.trends.performanceTrend === 'declining'
                                    ? '下降'
                                    : '稳定'}
                              </Text>
                            </div>
                          </div>
                        </div>

                        <div>
                          <Text strong>优化建议</Text>
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
                性能数据每1分钟自动更新一次。导出的数据包含详细的历史记录和分析报告，可用于进一步分析和优化。
              </Paragraph>
            </Card>
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
          <Form.Switch
            field="isThinkingModel"
            label="思维模型"
            initValue={currentConfig?.isThinkingModel || false}
            onChange={(checked) => handleConfigChange('isThinkingModel', checked)}
          />
          <Paragraph size="small" type="tertiary" style={{ marginTop: 4 }}>
            启用此选项表示该模型为思维模型
          </Paragraph>
        </Form>
      </Modal>
    </div>
  )
}

export default Settings
