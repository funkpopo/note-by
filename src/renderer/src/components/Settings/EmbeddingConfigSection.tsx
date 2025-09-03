import React, { useState, useEffect, useCallback } from 'react'
import { Typography, Card, Button, Toast, Form, Modal, Empty, Spin, Tag, Switch } from '@douyinfe/semi-ui'
import {
  IconSetting,
  IconPlus,
  IconPulse,
  IconEdit,
  IconDelete,
  IconCheckCircleStroked,
  IconClose,
  IconTick
} from '@douyinfe/semi-icons'
import { v4 as uuidv4 } from 'uuid'

const { Title, Text, Paragraph } = Typography

interface EmbeddingApiConfig {
  id: string
  name: string
  apiKey: string
  apiUrl: string
  modelName: string
  dimensions?: number
  enabled: boolean
}

const EmbeddingConfigSection: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [embeddingConfigs, setEmbeddingConfigs] = useState<EmbeddingApiConfig[]>([])
  const [currentConfig, setCurrentConfig] = useState<EmbeddingApiConfig | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; message: string }>
  >({})
  const testResultTimersRef = React.useRef<Record<string, NodeJS.Timeout>>({})

  const loadConfigs = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true)
      const result = await window.api.embedding.getConfigs()
      if (result.success && result.configs) {
        setEmbeddingConfigs(result.configs)
      }
    } catch (error) {
      Toast.error('加载Embedding配置失败')
      console.error('Failed to load embedding configs:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConfigs()
    const timers = testResultTimersRef.current
    return (): void => {
      Object.values(timers).forEach((timerId) => {
        clearTimeout(timerId)
      })
    }
  }, [loadConfigs])

  const handleAddConfig = (): void => {
    setCurrentConfig({
      id: uuidv4(),
      name: '',
      apiKey: '',
      apiUrl: 'https://api.openai.com',
      modelName: 'text-embedding-3-small',
      dimensions: 1536,
      enabled: false
    })
    setIsEditMode(false)
    setIsModalOpen(true)
  }

  const handleEditConfig = (config: EmbeddingApiConfig): void => {
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
      if (!currentConfig?.apiKey.trim()) {
        Toast.error('请输入API Key')
        return
      }
      if (!currentConfig?.apiUrl.trim()) {
        Toast.error('请输入API URL')
        return
      }
      if (!currentConfig?.modelName.trim()) {
        Toast.error('请输入模型名称')
        return
      }

      const result = await window.api.embedding.saveConfig(currentConfig)

      if (result.success) {
        Toast.success(isEditMode ? '配置已更新' : '配置已添加')
        setIsModalOpen(false)
        await loadConfigs()

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
      console.error('Failed to save embedding config:', error)
    }
  }

  const handleDeleteConfig = async (configId: string): Promise<void> => {
    try {
      const result = await window.api.embedding.deleteConfig(configId)

      if (result.success) {
        Toast.success('配置已删除')
        await loadConfigs()

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
      console.error('Failed to delete embedding config:', error)
    }
  }

  const handleConfigChange = (key: keyof EmbeddingApiConfig, value: string | number | boolean): void => {
    setCurrentConfig((prev) => {
      if (!prev) return null
      return {
        ...prev,
        [key]: value
      }
    })
  }

  const handleTestConnection = async (config: EmbeddingApiConfig): Promise<void> => {
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

      const result = await window.api.embedding.testConnection(config)

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
    } catch (error) {
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

  const handleToggleEnabled = async (configId: string, enabled: boolean): Promise<void> => {
    try {
      const result = await window.api.embedding.setConfigEnabled(configId, enabled)
      if (result.success) {
        Toast.success(enabled ? '已启用配置' : '已禁用配置')
        await loadConfigs()
      } else {
        Toast.error('更新配置状态失败: ' + (result.error || '未知错误'))
      }
    } catch (error) {
      Toast.error('更新配置状态失败')
      console.error('Failed to toggle embedding config:', error)
    }
  }

  const renderEmbeddingConfigCards = (): React.ReactNode => {
    if (embeddingConfigs.length === 0) {
      return (
        <Empty
          image={<IconPlus size="extra-large" />}
          title="暂无Embedding配置"
          description="点击上方'添加配置'按钮创建新的Embedding模型配置"
          className="empty-state"
        />
      )
    }

    return (
      <div className="api-config-grid">
        {embeddingConfigs.map((config) => (
          <Card
            key={config.id}
            className={`api-config-card animated-card ${config.enabled ? 'enabled-config' : ''}`}
          >
            <div className="api-card-header">
              <div className="api-card-title">
                <Text strong className="config-name">
                  {config.name}
                </Text>
                {config.enabled && (
                  <Tag color="green" size="small" className="model-badge">
                    已启用
                  </Tag>
                )}
              </div>
              <div className="api-card-actions">
                <Switch
                  checked={config.enabled}
                  onChange={(checked) => handleToggleEnabled(config.id, checked)}
                  size="small"
                  style={{ marginRight: '8px' }}
                />
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
                      向量维度
                    </Text>
                    <Tag size="small">{config.dimensions || '默认'}</Tag>
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
          <IconSetting size="large" className="section-icon" />
          <div>
            <Title heading={4}>Embedding模型配置</Title>
            <Text type="tertiary">管理和配置向量化模型接口</Text>
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
        <div className="api-configs-container">{renderEmbeddingConfigCards()}</div>
      )}

      <Modal
        title={
          <div className="modal-title">
            <span>{isEditMode ? '编辑Embedding配置' : '添加Embedding配置'}</span>
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
        <Form<EmbeddingApiConfig> labelPosition="left" labelWidth={100}>
          <Form.Input
            field="name"
            label="配置名称"
            placeholder="请输入配置名称，如OpenAI Embedding等"
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
            required
          />
          <Form.Input
            field="apiUrl"
            label="API URL"
            placeholder="请输入API URL，如https://api.openai.com"
            initValue={currentConfig?.apiUrl}
            onChange={(value) => handleConfigChange('apiUrl', value)}
            showClear
            required
          />
          <Form.Input
            field="modelName"
            label="模型名称"
            placeholder="请输入模型名称，如text-embedding-3-small"
            initValue={currentConfig?.modelName}
            onChange={(value) => handleConfigChange('modelName', value)}
            showClear
            required
          />
          <Form.InputNumber
            field="dimensions"
            label="向量维度"
            placeholder="请输入向量维度，如1536"
            initValue={currentConfig?.dimensions}
            onChange={(value) => handleConfigChange('dimensions', value || 1536)}
            min={1}
            max={10000}
            style={{ width: '100%' }}
          />
          <Paragraph size="small" type="tertiary" style={{ marginTop: 4, marginBottom: 16 }}>
            向量维度必须与所选模型匹配，如text-embedding-3-small为1536维
          </Paragraph>
        </Form>
      </Modal>
    </div>
  )
}

export default EmbeddingConfigSection