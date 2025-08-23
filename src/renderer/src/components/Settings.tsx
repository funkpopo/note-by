import React, { useState, useEffect, useCallback } from 'react'
import {
  Typography,
  Card,
  Divider,
  Button,
  Toast,
  Form,
  Modal,
  Empty,
  Spin,
  Radio,
  Select,
  Tabs,
  Badge,
  Progress,
  Tag,
  Tooltip,
  Space
} from '@douyinfe/semi-ui'
import {
  IconPulse,
  IconPlus,
  IconDelete,
  IconEdit,
  IconRefresh,
  IconPieChartStroked,
  IconDownload,
  IconLanguage,
  IconHistogram,
  IconCloud,
  IconSettingStroked,
  IconCheckCircleStroked,
  IconAlertCircle,
  IconInfoCircle,
  IconTick,
  IconClose
} from '@douyinfe/semi-icons'
import { v4 as uuidv4 } from 'uuid'
import WebDAVSettings from './WebDAVSettings'
import './Settings.css'
import { performanceMonitor, type PerformanceMetrics } from '../utils/PerformanceMonitor'
import { useLanguage } from '../locales'

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

      // 加载历史记录管理设置
      if (settings.historyManagement) {
        setHistoryManagement(settings.historyManagement as HistoryManagementSettings)
      }
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
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
          image={<IconPlus size="extra-large" />}
          title="暂无API配置"
          description="点击上方'添加配置'按钮创建新的API配置"
          className="empty-state"
        />
      )
    }

    return (
      <div className="api-config-grid">
        {AiApiConfigs.map((config) => (
          <Card
            key={config.id}
            className={`api-config-card animated-card ${config.isThinkingModel ? 'thinking-model' : ''}`}
          >
            <div className="api-card-header">
              <div className="api-card-title">
                <Text strong className="config-name">
                  {config.name}
                </Text>
                {config.isThinkingModel && (
                  <Tag color="green" size="small" className="model-badge">
                    思维模型
                  </Tag>
                )}
              </div>
              <div className="api-card-actions">
                <Tooltip content="测试连接">
                  <Button
                    icon={<IconPulse />}
                    onClick={() => handleTestConnection(config)}
                    loading={testingId === config.id}
                    theme="borderless"
                    type="primary"
                    className="icon-btn"
                  />
                </Tooltip>
                <Tooltip content="编辑配置">
                  <Button
                    icon={<IconEdit />}
                    onClick={() => handleEditConfig(config)}
                    theme="borderless"
                    type="tertiary"
                    className="icon-btn"
                  />
                </Tooltip>
                <Tooltip content="删除配置">
                  <Button
                    icon={<IconDelete />}
                    theme="borderless"
                    type="danger"
                    className="icon-btn"
                    onClick={() => handleDeleteConfig(config.id)}
                  />
                </Tooltip>
              </div>
            </div>

            <div className="api-card-content">
              <div className="config-info">
                <div className="info-item">
                  <Text type="tertiary" size="small">
                    API URL
                  </Text>
                  <Text className="info-value">{config.apiUrl || '未设置'}</Text>
                </div>
                <div className="info-item">
                  <Text type="tertiary" size="small">
                    API Key
                  </Text>
                  <Text className="info-value">{config.apiKey ? '••••••••' : '未设置'}</Text>
                </div>
                <div className="info-item">
                  <Text type="tertiary" size="small">
                    模型
                  </Text>
                  <Text className="info-value">{config.modelName || '未设置'}</Text>
                </div>
                <div className="info-row">
                  <div className="info-item-inline">
                    <Text type="tertiary" size="small">
                      温度
                    </Text>
                    <Tag size="small">{config.temperature || '0.7'}</Tag>
                  </div>
                  <div className="info-item-inline">
                    <Text type="tertiary" size="small">
                      Max Token
                    </Text>
                    <Tag size="small">{config.maxTokens || '2000'}</Tag>
                  </div>
                </div>
              </div>

              {/* 测试结果显示区域 */}
              {testResults[config.id] && (
                <div
                  className={`test-result ${testResults[config.id].success ? 'success' : 'error'}`}
                >
                  <div className="test-result-header">
                    {testResults[config.id].success ? (
                      <IconCheckCircleStroked className="result-icon success" />
                    ) : (
                      <IconClose className="result-icon error" />
                    )}
                    <Text strong className="result-text">
                      {testResults[config.id].success ? '连接成功' : '连接失败'}
                    </Text>
                  </div>
                  <Text type="tertiary" size="small" className="result-message">
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
    } catch {
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
    } catch {
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
    <div className="settings-container">
      <div className="settings-body">
        <Tabs className="settings-tabs" type="card">
          {/* 通用设置标签 */}
          <Tabs.TabPane
            tab={
              <span className="tab-label">
                通用设置
              </span>
            }
            itemKey="general"
          >
            <div className="tab-content">
              {/* 语言设置卡片 */}
              <Card className="settings-card animated-card">
                <div className="card-header">
                  <div className="card-icon-wrapper language-icon">
                    <IconLanguage size="large" />
                  </div>
                  <div className="card-content">
                    <Title heading={6}>{t('settings.language.title')}</Title>
                    <Text type="tertiary" className="card-description">
                      {t('settings.language.description')}
                    </Text>
                  </div>
                  <div className="card-action">
                    <Select
                      value={language}
                      onChange={(value) => setLanguage(value as 'zh-CN' | 'en-US')}
                      className="language-select"
                      size="large"
                    >
                      <Select.Option value="zh-CN">
                        <Space>
                          <span className="language-flag">🇨🇳</span>
                          <span>简体中文</span>
                        </Space>
                      </Select.Option>
                      <Select.Option value="en-US">
                        <Space>
                          <span className="language-flag">🇺🇸</span>
                          <span>English</span>
                        </Space>
                      </Select.Option>
                    </Select>
                  </div>
                </div>
              </Card>

              {/* 更新检查设置卡片 */}
              <Card className="settings-card animated-card">
                <div className="update-settings">
                  <div className="settings-item">
                    <div className="settings-item-header">
                      <div className="settings-item-info">
                        <Title heading={6}>{t('settings.autoUpdate.manual')}</Title>
                        <Text type="tertiary" size="small">
                          {t('settings.autoUpdate.manualDescription')}
                        </Text>
                      </div>
                      <Button
                        icon={<IconRefresh spin={isCheckingUpdates} />}
                        onClick={handleCheckUpdates}
                        loading={isCheckingUpdates}
                        theme="light"
                        type="primary"
                        className="check-update-btn"
                      >
                        {t('settings.autoUpdate.checkNow')}
                      </Button>
                    </div>
                  </div>

                  {updateResult && (
                    <div
                      className={`update-result ${updateResult.error ? 'error' : updateResult.hasUpdate ? 'available' : 'latest'}`}
                    >
                      <div className="update-result-header">
                        {updateResult.error ? (
                          <IconAlertCircle className="update-icon error" />
                        ) : updateResult.hasUpdate ? (
                          <IconInfoCircle className="update-icon info" />
                        ) : (
                          <IconCheckCircleStroked className="update-icon success" />
                        )}
                        <div className="update-result-content">
                          <Text strong className="update-result-title">
                            {updateResult.error
                              ? '检查更新失败'
                              : updateResult.hasUpdate
                                ? `发现新版本: ${updateResult.latestVersion}`
                                : '当前已是最新版本'}
                          </Text>
                          <Text type="tertiary" size="small" className="update-result-desc">
                            {updateResult.error
                              ? `错误信息: ${updateResult.error}`
                              : updateResult.hasUpdate
                                ? `您当前的版本为 ${updateResult.currentVersion}，可以前往 GitHub 下载最新版本`
                                : `当前版本: ${updateResult.currentVersion}`}
                          </Text>
                        </div>
                      </div>
                      {updateResult.hasUpdate && !updateResult.error && (
                        <Button
                          type="primary"
                          theme="solid"
                          size="small"
                          onClick={() =>
                            window.open('https://github.com/funkpopo/note-by/releases', '_blank')
                          }
                          className="download-btn"
                        >
                          前往下载
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <div className="card-footer">
                  <Text type="tertiary" size="small">
                    <IconInfoCircle size="small" /> 更新检查会连接GitHub查询最新版本信息
                  </Text>
                </div>
              </Card>

              {/* 历史记录管理设置卡片 */}
              <Card className="settings-card animated-card">
                <div className="card-header">
                  <div className="card-icon-wrapper history-icon">
                    <IconHistogram size="large" />
                  </div>
                  <div className="card-content">
                    <Title heading={6}>{t('settings.history.title')}</Title>
                    <Text type="tertiary" className="card-description">
                      配置历史记录的保留策略
                    </Text>
                  </div>
                  <Button
                    type="primary"
                    theme="solid"
                    onClick={saveHistoryManagement}
                    className="save-btn"
                  >
                    保存设置
                  </Button>
                </div>
                <Divider className="settings-divider" />
                <div className="history-settings-content">
                  <Form className="history-form">
                    <Form.RadioGroup
                      field="historyType"
                      label="保留方式"
                      initValue={historyManagement.type}
                      onChange={handleHistoryTypeChange}
                      className="radio-group-modern"
                    >
                      <Radio value="count" className="radio-option">
                        <Space>
                          <span>按数量保留</span>
                          <Tag size="small" color="blue">
                            推荐
                          </Tag>
                        </Space>
                      </Radio>
                      <Radio value="time" className="radio-option">
                        按时间保留
                      </Radio>
                    </Form.RadioGroup>

                    <div className="form-input-section">
                      {historyManagement.type === 'count' && (
                        <Form.InputNumber
                          field="maxCount"
                          label="保留记录数"
                          initValue={historyManagement.maxCount}
                          onChange={handleMaxCountChange}
                          min={1}
                          max={1000}
                          step={1}
                          className="modern-input"
                          suffix="条"
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
                          className="modern-input"
                        />
                      )}
                    </div>

                    <div className="info-box">
                      <IconInfoCircle className="info-icon" />
                      <Text type="tertiary" size="small">
                        {historyManagement.type === 'count'
                          ? `系统将为每个文件保留最近的 ${historyManagement.maxCount} 条历史记录`
                          : `系统将自动清理 ${historyManagement.maxDays} 天前的历史记录`}
                      </Text>
                    </div>
                  </Form>
                </div>
              </Card>
            </div>
          </Tabs.TabPane>

          {/* AI API配置标签 */}
          <Tabs.TabPane
            tab={
              <span className="tab-label">
                AI 配置
              </span>
            }
            itemKey="api"
          >
            <div className="tab-content">
              <div className="section-header">
                <div className="section-title">
                  <IconCloud size="large" className="section-icon" />
                  <div>
                    <Title heading={4}>AI API 配置</Title>
                    <Text type="tertiary">管理和配置AI服务接口</Text>
                  </div>
                </div>
                <Button
                  icon={<IconPlus />}
                  onClick={handleAddConfig}
                  theme="solid"
                  type="primary"
                  className="add-config-btn"
                >
                  添加配置
                </Button>
              </div>

              {isLoading ? (
                <div className="loading-container">
                  <Spin size="large" />
                  <Text type="tertiary">加载配置中...</Text>
                </div>
              ) : (
                <div className="api-configs-container">{renderApiConfigCards()}</div>
              )}
            </div>
          </Tabs.TabPane>

          {/* 同步设置标签 */}
          <Tabs.TabPane
            tab={
              <span className="tab-label">
                同步设置
              </span>
            }
            itemKey="sync"
          >
            <div className="tab-content">
              <Card className="settings-card animated-card">
                <div className="card-header">
                  <div className="card-icon-wrapper sync-icon">
                    <IconCloud size="large" />
                  </div>
                  <div className="card-content">
                    <Title heading={6}>WebDAV 同步</Title>
                    <Text type="tertiary" className="card-description">
                      配置WebDAV服务器实现数据同步
                    </Text>
                  </div>
                </div>
                <Divider className="settings-divider" />
                <WebDAVSettings onSyncComplete={handleSyncComplete} />
              </Card>
            </div>
          </Tabs.TabPane>

          {/* 性能监控标签 */}
          <Tabs.TabPane tab={<span className="tab-label">性能监控</span>} itemKey="performance">
            <div className="tab-content">
              <Card className="settings-card animated-card">
                <div className="card-header">
                  <div className="card-icon-wrapper performance-icon">
                    <IconPieChartStroked size="large" />
                  </div>
                  <div className="card-content">
                    <Title heading={6}>性能统计</Title>
                    <Text type="tertiary" className="card-description">
                      监控应用性能和资源使用情况
                    </Text>
                  </div>
                  <Space>
                    <Tooltip content="刷新数据">
                      <Button
                        icon={<IconRefresh />}
                        onClick={loadPerformanceMetrics}
                        theme="borderless"
                        type="tertiary"
                        className="icon-btn"
                      />
                    </Tooltip>
                    <Button
                      icon={<IconDownload />}
                      onClick={handleExportPerformanceData}
                      loading={isExportingPerformance}
                      theme="light"
                      type="primary"
                    >
                      导出数据
                    </Button>
                    <Button
                      onClick={handleResetPerformanceMetrics}
                      theme="borderless"
                      type="danger"
                    >
                      重置
                    </Button>
                  </Space>
                </div>
                <Divider className="settings-divider" />
                {performanceMetrics ? (
                  <div className="performance-metrics-container">
                    <div className="performance-grid">
                      {/* 内存使用 */}
                      <div className="metric-card">
                        <div className="metric-header">
                          <Title heading={6}>内存使用</Title>
                          <div className="metric-badge">
                            <Progress
                              percent={performanceMetrics.memoryUsage.percentage}
                              size="small"
                              type="circle"
                              width={40}
                              strokeWidth={8}
                              showInfo={false}
                              stroke={
                                performanceMetrics.memoryUsage.percentage > 90
                                  ? 'var(--semi-color-danger)'
                                  : performanceMetrics.memoryUsage.percentage > 75
                                    ? 'var(--semi-color-warning)'
                                    : 'var(--semi-color-success)'
                              }
                            />
                          </div>
                        </div>
                        <div className="metric-content">
                          <div className="metric-item">
                            <Text type="tertiary">已使用</Text>
                            <Text strong>{formatBytes(performanceMetrics.memoryUsage.used)}</Text>
                          </div>
                          <div className="metric-item">
                            <Text type="tertiary">总量</Text>
                            <Text strong>{formatBytes(performanceMetrics.memoryUsage.total)}</Text>
                          </div>
                          <div className="metric-item">
                            <Text type="tertiary">使用率</Text>
                            <Text
                              strong
                              className={`metric-value ${
                                performanceMetrics.memoryUsage.percentage > 90
                                  ? 'danger'
                                  : performanceMetrics.memoryUsage.percentage > 75
                                    ? 'warning'
                                    : 'success'
                              }`}
                            >
                              {performanceMetrics.memoryUsage.percentage.toFixed(1)}%
                            </Text>
                          </div>
                        </div>
                      </div>

                      {/* 编辑器性能 */}
                      <div className="metric-card">
                        <div className="metric-header">
                          <Title heading={6}>编辑器性能</Title>
                          <Tag color="blue" size="small">
                            实时
                          </Tag>
                        </div>
                        <div className="metric-content">
                          <div className="metric-item">
                            <Text type="tertiary">加载时间</Text>
                            <Text strong>
                              {formatTime(performanceMetrics.editorPerformance.loadTime)}
                            </Text>
                          </div>
                          <div className="metric-item">
                            <Text type="tertiary">保存时间</Text>
                            <Text strong>
                              {formatTime(performanceMetrics.editorPerformance.saveTime)}
                            </Text>
                          </div>
                          <div className="metric-item">
                            <Text type="tertiary">渲染时间</Text>
                            <Text strong>
                              {formatTime(performanceMetrics.editorPerformance.renderTime)}
                            </Text>
                          </div>
                        </div>
                      </div>

                      {/* 用户操作统计 */}
                      <div className="metric-card">
                        <div className="metric-header">
                          <Title heading={6}>操作统计</Title>
                          <Badge
                            count={
                              performanceMetrics.userActions.editorChanges +
                              performanceMetrics.userActions.saves +
                              performanceMetrics.userActions.loads +
                              performanceMetrics.userActions.searches
                            }
                            type="tertiary"
                          />
                        </div>
                        <div className="metric-content">
                          <div className="metric-item">
                            <Text type="tertiary">编辑次数</Text>
                            <Text strong>{performanceMetrics.userActions.editorChanges}</Text>
                          </div>
                          <div className="metric-item">
                            <Text type="tertiary">保存次数</Text>
                            <Text strong>{performanceMetrics.userActions.saves}</Text>
                          </div>
                          <div className="metric-item">
                            <Text type="tertiary">加载次数</Text>
                            <Text strong>{performanceMetrics.userActions.loads}</Text>
                          </div>
                          <div className="metric-item">
                            <Text type="tertiary">搜索次数</Text>
                            <Text strong>{performanceMetrics.userActions.searches}</Text>
                          </div>
                        </div>
                      </div>

                      {/* 网络性能 */}
                      <div className="metric-card">
                        <div className="metric-header">
                          <Title heading={6}>网络性能</Title>
                          {performanceMetrics.networkPerformance.latency > 0 && (
                            <Tag
                              color={
                                performanceMetrics.networkPerformance.latency < 100
                                  ? 'green'
                                  : performanceMetrics.networkPerformance.latency < 300
                                    ? 'orange'
                                    : 'red'
                              }
                              size="small"
                            >
                              {performanceMetrics.networkPerformance.latency < 100
                                ? '良好'
                                : performanceMetrics.networkPerformance.latency < 300
                                  ? '一般'
                                  : '较差'}
                            </Tag>
                          )}
                        </div>
                        <div className="metric-content">
                          <div className="metric-item">
                            <Text type="tertiary">上传速度</Text>
                            <Text strong>
                              {performanceMetrics.networkPerformance.uploadSpeed > 0
                                ? formatSpeed(performanceMetrics.networkPerformance.uploadSpeed)
                                : '未记录'}
                            </Text>
                          </div>
                          <div className="metric-item">
                            <Text type="tertiary">下载速度</Text>
                            <Text strong>
                              {performanceMetrics.networkPerformance.downloadSpeed > 0
                                ? formatSpeed(performanceMetrics.networkPerformance.downloadSpeed)
                                : '未记录'}
                            </Text>
                          </div>
                          <div className="metric-item">
                            <Text type="tertiary">网络延迟</Text>
                            <Text strong>
                              {performanceMetrics.networkPerformance.latency > 0
                                ? `${performanceMetrics.networkPerformance.latency.toFixed(0)}ms`
                                : '未记录'}
                            </Text>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="loading-container">
                    <Spin size="large" />
                    <Text type="tertiary">加载性能数据中...</Text>
                  </div>
                )}

                {/* 性能报告 */}
                {performanceMetrics && (
                  <div className="performance-report">
                    <div className="report-header">
                      <Title heading={5}>性能分析报告</Title>
                      <Tag color="blue">自动生成</Tag>
                    </div>
                    {(() => {
                      const report = performanceMonitor.generatePerformanceReport()
                      return (
                        <div className="report-content">
                          <div className="report-section">
                            <Title heading={6}>性能摘要</Title>
                            <div className="summary-grid">
                              <div className="summary-item">
                                <Text type="tertiary">平均内存使用</Text>
                                <Text strong>{report.summary.averageMemoryUsage}%</Text>
                              </div>
                              <div className="summary-item">
                                <Text type="tertiary">平均加载时间</Text>
                                <Text strong>{formatTime(report.summary.averageLoadTime)}</Text>
                              </div>
                              <div className="summary-item">
                                <Text type="tertiary">平均保存时间</Text>
                                <Text strong>{formatTime(report.summary.averageSaveTime)}</Text>
                              </div>
                              <div className="summary-item">
                                <Text type="tertiary">总操作次数</Text>
                                <Text strong>{report.summary.totalUserActions}</Text>
                              </div>
                            </div>
                          </div>

                          <div className="report-section">
                            <Title heading={6}>性能趋势</Title>
                            <div className="trends-container">
                              <div className="trend-item">
                                <Text type="tertiary">内存趋势</Text>
                                <Tag
                                  color={
                                    report.trends.memoryTrend === 'increasing'
                                      ? 'orange'
                                      : report.trends.memoryTrend === 'decreasing'
                                        ? 'green'
                                        : 'cyan'
                                  }
                                >
                                  {report.trends.memoryTrend === 'increasing'
                                    ? '↑ 上升'
                                    : report.trends.memoryTrend === 'decreasing'
                                      ? '↓ 下降'
                                      : '→ 稳定'}
                                </Tag>
                              </div>
                              <div className="trend-item">
                                <Text type="tertiary">性能趋势</Text>
                                <Tag
                                  color={
                                    report.trends.performanceTrend === 'improving'
                                      ? 'green'
                                      : report.trends.performanceTrend === 'declining'
                                        ? 'orange'
                                        : 'cyan'
                                  }
                                >
                                  {report.trends.performanceTrend === 'improving'
                                    ? '↑ 提升'
                                    : report.trends.performanceTrend === 'declining'
                                      ? '↓ 下降'
                                      : '→ 稳定'}
                                </Tag>
                              </div>
                            </div>
                          </div>

                          <div className="report-section">
                            <Title heading={6}>优化建议</Title>
                            <div className="recommendations-list">
                              {report.recommendations.map((rec, index) => (
                                <div key={index} className="recommendation-item">
                                  <IconCheckCircleStroked className="recommendation-icon" />
                                  <Text type="tertiary">{rec}</Text>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}

                <div className="card-footer">
                  <Text type="tertiary" size="small">
                    <IconInfoCircle size="small" />{' '}
                    性能数据每1分钟自动更新，导出数据包含详细历史记录
                  </Text>
                </div>
              </Card>
            </div>
          </Tabs.TabPane>
        </Tabs>
      </div>

      {/* 添加/编辑配置模态框 */}
      <Modal
        title={
          <div className="modal-title">
            <span>{isEditMode ? '编辑API配置' : '添加API配置'}</span>
          </div>
        }
        visible={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        centered
        className="settings-modal"
        footer={
          <div className="modal-footer">
            <Button type="tertiary" onClick={() => setIsModalOpen(false)}>
              取消
            </Button>
            <Button type="primary" theme="solid" onClick={handleSaveConfig}>
              <IconTick /> 保存配置
            </Button>
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
