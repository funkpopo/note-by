import React, { useState, useEffect, useCallback } from 'react'
import { Typography, Card, Button, Toast, Form, Modal, Empty, Spin, Tag } from '@douyinfe/semi-ui'
import {
  IconCloud,
  IconPlus,
  IconPulse,
  IconEdit,
  IconDelete,
  IconCheckCircleStroked,
  IconClose,
  IconTick
} from '@douyinfe/semi-icons'
import { v4 as uuidv4 } from 'uuid'
import { useLanguage } from '../../locales'

const { Title, Text, Paragraph } = Typography

interface AiApiConfig {
  id: string
  name: string
  apiKey: string
  apiUrl: string
  modelName: string
  temperature?: string
  maxTokens?: string
  isThinkingModel?: boolean
}

const ApiConfigSection: React.FC = () => {
  const { t } = useLanguage()
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

  const loadSettings = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true)
      const settings = await window.api.settings.getAll()
      if (settings.AiApiConfigs && Array.isArray(settings.AiApiConfigs)) {
        setApiConfigs(settings.AiApiConfigs as AiApiConfig[])
      }
    } catch {
      Toast.error('加载设置失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
    const timers = testResultTimersRef.current
    return (): void => {
      Object.values(timers).forEach((timerId) => {
        clearTimeout(timerId)
      })
    }
  }, [loadSettings])

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

  const handleEditConfig = (config: AiApiConfig): void => {
    setCurrentConfig({ ...config })
    setIsEditMode(true)
    setIsModalOpen(true)
  }

  const handleSaveConfig = async (): Promise<void> => {
    try {
      if (!currentConfig?.name.trim()) {
        Toast.error('请输入配置名称')
        return
      }

      const result = await window.api.api.saveConfig(currentConfig)

      if (result.success) {
        Toast.success(isEditMode ? '配置已更新' : '配置已添加')
        setIsModalOpen(false)
        await loadSettings()

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

  const handleDeleteConfig = async (configId: string): Promise<void> => {
    try {
      const result = await window.api.api.deleteConfig(configId)

      if (result.success) {
        Toast.success('配置已删除')
        await loadSettings()

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

  const handleConfigChange = (key: keyof AiApiConfig, value: string | boolean): void => {
    setCurrentConfig((prev) => {
      if (!prev) return null
      return {
        ...prev,
        [key]: value
      }
    })
  }

  const handleSliderDragStart = (): void => {
    document.body.style.userSelect = 'none'
  }

  const handleSliderDragEnd = (): void => {
    document.body.style.userSelect = ''
  }

  const handleTestConnection = async (config: AiApiConfig): Promise<void> => {
    try {
      setTestingId(config.id)

      setTestResults((prev) => {
        const newResults = { ...prev }
        delete newResults[config.id]
        return newResults
      })

      if (testResultTimersRef.current[config.id]) {
        clearTimeout(testResultTimersRef.current[config.id])
      }

      const result = await window.api.openai.testConnection(config)

      setTestResults((prev) => ({
        ...prev,
        [config.id]: result
      }))

      if (result.success) {
        Toast.success('连接测试成功')
      } else {
        Toast.error('连接测试失败')
      }

      testResultTimersRef.current[config.id] = setTimeout(() => {
        setTestResults((prev) => {
          const newResults = { ...prev }
          delete newResults[config.id]
          return newResults
        })
        delete testResultTimersRef.current[config.id]
      }, 5000)
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [config.id]: { success: false, message: '测试过程出错' }
      }))
      Toast.error('连接测试出错')

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
                <Button
                  icon={<IconPulse />}
                  onClick={() => handleTestConnection(config)}
                  loading={testingId === config.id}
                  theme="borderless"
                  type="primary"
                  className="icon-btn"
                />
                <Button
                  icon={<IconEdit />}
                  onClick={() => handleEditConfig(config)}
                  theme="borderless"
                  type="tertiary"
                  className="icon-btn"
                />
                <Button
                  icon={<IconDelete />}
                  theme="borderless"
                  type="danger"
                  className="icon-btn"
                  onClick={() => handleDeleteConfig(config.id)}
                />
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

  return (
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

      <Modal
        title={
          <div className="modal-title">
            <span>{isEditMode ? '编辑API配置' : '添加API配置'}</span>
          </div>
        }
        visible={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        className="settings-modal"
        width={560}
        bodyStyle={{
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto',
          padding: '20px'
        }}
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
            placeholder={t('settings.apiConfig.namePlaceholder')}
            initValue={currentConfig?.name}
            onChange={(value) => handleConfigChange('name', value)}
            showClear
            required
          />
          <Form.Input
            field="apiKey"
            label="API Key"
            placeholder={t('settings.apiConfig.keyPlaceholder')}
            initValue={currentConfig?.apiKey}
            onChange={(value) => handleConfigChange('apiKey', value)}
            showClear
          />
          <Form.Input
            field="apiUrl"
            label="API URL"
            placeholder={t('settings.apiConfig.urlPlaceholder')}
            initValue={currentConfig?.apiUrl}
            onChange={(value) => handleConfigChange('apiUrl', value)}
            showClear
          />
          <Form.Input
            field="modelName"
            label="模型名称"
            placeholder={t('settings.apiConfig.modelPlaceholder')}
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

export default ApiConfigSection
