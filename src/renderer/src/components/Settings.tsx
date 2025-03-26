import React, { useState, useEffect } from 'react'
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
  ButtonGroup
} from '@douyinfe/semi-ui'
import { IconMoon, IconSun, IconPulse, IconPlus, IconDelete, IconEdit } from '@douyinfe/semi-icons'
import { useTheme } from '../context/theme/useTheme'
import { v4 as uuidv4 } from 'uuid'

const { Title, Paragraph, Text } = Typography

// API配置接口
interface ApiConfig {
  id: string
  name: string
  apiKey: string
  apiUrl: string
  modelName: string
}

const Settings: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme()
  const [isLoading, setIsLoading] = useState(false)
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([])
  const [currentConfig, setCurrentConfig] = useState<ApiConfig>({
    id: '',
    name: '',
    apiKey: '',
    apiUrl: '',
    modelName: ''
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; message: string }>
  >({})
  // 添加一个ref来存储定时器ID
  const testResultTimersRef = React.useRef<Record<string, NodeJS.Timeout>>({})

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
  }, [])

  // 加载设置函数
  const loadSettings = async (): Promise<void> => {
    try {
      setIsLoading(true)
      const settings = await window.api.settings.getAll()

      // 设置API配置
      if (settings.apiConfigs && Array.isArray(settings.apiConfigs)) {
        setApiConfigs(settings.apiConfigs as ApiConfig[])
      }
    } catch (error) {
      console.error('加载设置失败:', error)
      Toast.error('加载设置失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 打开添加新配置的模态框
  const handleAddConfig = (): void => {
    setCurrentConfig({
      id: uuidv4(),
      name: '',
      apiKey: '',
      apiUrl: '',
      modelName: ''
    })
    setIsEditMode(false)
    setIsModalOpen(true)
  }

  // 编辑配置
  const handleEditConfig = (config: ApiConfig): void => {
    setCurrentConfig({ ...config })
    setIsEditMode(true)
    setIsModalOpen(true)
  }

  // 保存配置
  const handleSaveConfig = async (): Promise<void> => {
    try {
      // 校验必填字段
      if (!currentConfig.name.trim()) {
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

        // 清除相关的测试结果
        if (testResults[currentConfig.id]) {
          const newResults = { ...testResults }
          delete newResults[currentConfig.id]
          setTestResults(newResults)
        }
      } else {
        Toast.error('保存配置失败: ' + (result.error || '未知错误'))
      }
    } catch (error) {
      console.error('保存配置失败:', error)
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

        // 清除相关的测试结果
        if (testResults[configId]) {
          const newResults = { ...testResults }
          delete newResults[configId]
          setTestResults(newResults)
        }
      } else {
        Toast.error('删除配置失败: ' + (result.error || '未知错误'))
      }
    } catch (error) {
      console.error('删除配置失败:', error)
      Toast.error('删除配置失败')
    }
  }

  // 更新当前编辑的配置
  const handleConfigChange = (key: keyof ApiConfig, value: string): void => {
    setCurrentConfig((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  // 测试连接
  const handleTestConnection = async (config: ApiConfig): Promise<void> => {
    try {
      setTestingId(config.id)

      // 清除此配置的旧测试结果
      const newResults = { ...testResults }
      delete newResults[config.id]
      setTestResults(newResults)

      // 清除该配置可能存在的定时器
      if (testResultTimersRef.current[config.id]) {
        clearTimeout(testResultTimersRef.current[config.id])
      }

      // 调用API测试连接
      const result = await window.api.openai.testConnection(config)

      // 保存测试结果
      setTestResults({
        ...testResults,
        [config.id]: result
      })

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
      console.error('连接测试出错:', error)
      setTestResults({
        ...testResults,
        [config.id]: { success: false, message: '测试过程出错' }
      })
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
    if (apiConfigs.length === 0) {
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
        {apiConfigs.map((config) => (
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title heading={5}>主题设置</Title>
      </div>
      {/* 主题设置卡片 */}
      <Card style={{ marginTop: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text strong>主题模式</Text>
            <Paragraph spacing="normal" type="tertiary">
              {isDarkMode ? '当前使用深色主题' : '当前使用浅色主题'}
            </Paragraph>
          </div>
          <Switch
            onChange={toggleTheme}
            checked={isDarkMode}
            checkedText={<IconMoon style={{ fontSize: '16px' }} />}
            uncheckedText={<IconSun style={{ fontSize: '16px' }} />}
            size="large"
            style={{ marginLeft: '16px' }}
            loading={isLoading}
          />
        </div>
        <Divider />
        <Paragraph type="tertiary" style={{ fontSize: '13px' }}>
          主题设置会保存在settings.json文件中，应用启动时会自动载入
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

      {/* 添加/编辑配置模态框 */}
      <Modal
        title={isEditMode ? '编辑API配置' : '添加API配置'}
        visible={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
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
        <Form labelPosition="left" labelWidth={100}>
          <Form.Input
            field="name"
            label="配置名称"
            placeholder="请输入配置名称，如OpenAI、Claude等"
            initValue={currentConfig.name}
            onChange={(value) => handleConfigChange('name', value)}
            showClear
            required
          />
          <Form.Input
            field="apiKey"
            label="API Key"
            placeholder="请输入API Key"
            initValue={currentConfig.apiKey}
            onChange={(value) => handleConfigChange('apiKey', value)}
            showClear
          />
          <Form.Input
            field="apiUrl"
            label="API URL"
            placeholder="请输入API URL，如https://api.openai.com"
            initValue={currentConfig.apiUrl}
            onChange={(value) => handleConfigChange('apiUrl', value)}
            showClear
          />
          <Form.Input
            field="modelName"
            label="模型名称"
            placeholder="请输入模型名称，如gpt-3.5-turbo"
            initValue={currentConfig.modelName}
            onChange={(value) => handleConfigChange('modelName', value)}
            showClear
          />
        </Form>
      </Modal>
    </div>
  )
}

export default Settings
