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
  ButtonGroup,
  Tabs,
  TabPane
} from '@douyinfe/semi-ui'
import {
  IconMoon,
  IconSun,
  IconPulse,
  IconPlus,
  IconDelete,
  IconEdit,
  IconRefresh
} from '@douyinfe/semi-icons'
import { FormApi } from '@douyinfe/semi-ui/lib/es/form'
import { useTheme } from '../context/theme/useTheme'
import { v4 as uuidv4 } from 'uuid'
import WebDAVSettings from './WebDAVSettings'

const { Title, Paragraph, Text } = Typography

// API配置接口
interface ApiConfig {
  id: string
  name: string
  apiKey: string
  apiUrl: string
  modelName: string
  temperature?: string
  maxTokens?: string
}

// AI提示配置接口
interface AIPrompts {
  rewrite: string
  continue: string
  translate: string
  analyze: string
}

interface UpdateResult {
  hasUpdate: boolean
  latestVersion: string
  currentVersion: string
  error?: string
}

const Settings: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme()
  const [isLoading, setIsLoading] = useState(true)
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([])
  const [currentConfig, setCurrentConfig] = useState<ApiConfig | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; message: string }>
  >({})
  const testResultTimersRef = React.useRef<Record<string, NodeJS.Timeout>>({})
  const [aiPrompts, setAiPrompts] = useState<AIPrompts>({
    rewrite: '',
    continue: '',
    translate: '',
    analyze: ''
  })
  const [formApi, setFormApi] = useState<FormApi<AIPrompts> | null>(null)
  const [checkUpdatesOnStartup, setCheckUpdatesOnStartup] = useState<boolean>(true)
  const [isCheckingUpdates, setIsCheckingUpdates] = useState<boolean>(false)
  const [updateResult, setUpdateResult] = useState<UpdateResult | null>(null)

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

  // 监听formApi变化，确保表单值正确设置
  useEffect(() => {
    if (formApi && aiPrompts) {
      formApi.setValues({
        rewrite: aiPrompts.rewrite || '',
        continue: aiPrompts.continue || '',
        translate: aiPrompts.translate || '',
        analyze: aiPrompts.analyze || ''
      })
    }
  }, [formApi, aiPrompts])

  // 加载设置函数
  const loadSettings = async (): Promise<void> => {
    try {
      setIsLoading(true)
      const settings = await window.api.settings.getAll()

      // 设置API配置
      if (settings.apiConfigs && Array.isArray(settings.apiConfigs)) {
        setApiConfigs(settings.apiConfigs as ApiConfig[])
      }

      // 设置AI提示配置
      if (settings.aiPrompts) {
        const loadedPrompts = settings.aiPrompts as AIPrompts

        // 如果没有translate字段，但有旧的翻译字段，进行迁移
        const oldPrompts = loadedPrompts as unknown as Record<string, string>
        if (!loadedPrompts.translate && oldPrompts.translateToZh) {
          loadedPrompts.translate =
            '请将以下${sourceLanguage}文本翻译成${targetLanguage}：\n\n${content}'
        }

        setAiPrompts(loadedPrompts)

        // 如果表单API已经初始化，设置表单值
        if (formApi) {
          formApi.setValues({
            rewrite: loadedPrompts.rewrite || '',
            continue: loadedPrompts.continue || '',
            translate:
              loadedPrompts.translate ||
              '请将以下${sourceLanguage}文本翻译成${targetLanguage}：\n\n${content}',
            analyze: loadedPrompts.analyze || ''
          })
        }
      } else {
        // 如果没有任何AI提示设置，设置默认值
        const defaultPrompts = {
          rewrite: '重写以下内容，保持原意但改进表达，使其更流畅、更清晰：\n\n${content}',
          continue: '继续以下内容，保持风格和逻辑连贯：\n\n${content}',
          translate: '请将以下${sourceLanguage}文本翻译成${targetLanguage}：\n\n${content}',
          analyze: '分析以下内容，提供关键点、主题、情感倾向等分析：\n\n${content}'
        }
        setAiPrompts(defaultPrompts)

        if (formApi) {
          formApi.setValues(defaultPrompts)
        }
      }

      // 加载更新检查设置
      if (settings.checkUpdatesOnStartup !== undefined) {
        setCheckUpdatesOnStartup(settings.checkUpdatesOnStartup as boolean)
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
      modelName: '',
      temperature: '0.7',
      maxTokens: '2000'
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
    setCurrentConfig((prev) => {
      if (!prev) return null
      return {
        ...prev,
        [key]: value
      }
    })
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

  // 保存AI提示设置
  const saveAIPrompts = async (): Promise<void> => {
    try {
      setIsLoading(true)
      const settings = await window.api.settings.getAll()

      // 更新AI提示设置
      const updatedSettings = {
        ...settings,
        aiPrompts
      }

      const success = await window.api.settings.setAll(updatedSettings)

      if (success) {
        Toast.success('AI提示设置已保存')
      } else {
        Toast.error('保存AI提示设置失败')
      }
    } catch (error) {
      console.error('保存AI提示设置失败:', error)
      Toast.error('保存AI提示设置失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 处理AI提示变化
  const handleAIPromptChange = (key: keyof AIPrompts, value: string): void => {
    setAiPrompts((prev) => ({
      ...prev,
      [key]: value
    }))
  }

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
      console.error('保存更新检查设置失败:', error)
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
      console.error('检查更新出错:', error)
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

  return (
    <div>
      <Tabs type="line" defaultActiveKey="theme">
        <TabPane tab="基本设置" itemKey="theme">
          <div className="settings-scroll-container">
            {/* 主题设置卡片 */}
            <Card style={{ marginTop: 20, marginBottom: 20 }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
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

        <TabPane tab="AI提示设置" itemKey="ai-prompts">
          <div className="settings-scroll-container">
            <Card style={{ marginTop: 20, marginBottom: 20 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 5
                }}
              >
                <Title heading={5}>AI提示模板设置</Title>
                <Button
                  type="primary"
                  theme="solid"
                  size="small"
                  onClick={saveAIPrompts}
                  loading={isLoading}
                >
                  保存设置
                </Button>
              </div>
              <Divider />
              <Paragraph style={{ marginBottom: 5 }}>
                在下面设置各种AI操作的提示模板，使用 ${'{content}'} 表示要处理的文本内容。
              </Paragraph>

              <Form<AIPrompts>
                labelPosition="top"
                getFormApi={(api) => setFormApi(api)}
                initValues={aiPrompts}
              >
                <Form.TextArea
                  field="rewrite"
                  label="风格改写提示"
                  placeholder="请设置风格改写的提示模板"
                  onChange={(value) => handleAIPromptChange('rewrite', value)}
                  rows={3}
                  showClear
                  style={{ marginBottom: 0 }}
                />

                <Form.TextArea
                  field="continue"
                  label="内容续写提示"
                  placeholder="请设置内容续写的提示模板"
                  onChange={(value) => handleAIPromptChange('continue', value)}
                  rows={3}
                  showClear
                  style={{ marginBottom: 0 }}
                />

                <Form.TextArea
                  field="translate"
                  label="翻译提示: 使用 ${sourceLanguage} 表示原语言，${targetLanguage} 表示目标语言。"
                  placeholder="请设置翻译的提示模板，例如：请将以下${sourceLanguage}文本翻译成${targetLanguage}: ${content}"
                  onChange={(value) => handleAIPromptChange('translate', value)}
                  rows={3}
                  showClear
                  style={{ marginBottom: 0 }}
                />

                <Form.TextArea
                  field="analyze"
                  label="分析提示"
                  placeholder="请设置分析的提示模板"
                  onChange={(value) => handleAIPromptChange('analyze', value)}
                  rows={3}
                  showClear
                  style={{ marginBottom: 0 }}
                />
              </Form>

              <Divider />
              <Paragraph type="tertiary" style={{ fontSize: '13px' }}>
                AI提示设置会保存在settings.json文件中，应用启动时会自动载入
              </Paragraph>
            </Card>
          </div>
        </TabPane>

        <TabPane tab="WebDAV同步" itemKey="webdav">
          <WebDAVSettings onSyncComplete={handleSyncComplete} />
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
        <Form<ApiConfig> labelPosition="left" labelWidth={100}>
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
              <div style={{ width: '85%', marginRight: 10 }}>
                <Form.Slider
                  field="temperature"
                  initValue={parseFloat(currentConfig?.temperature || '0.7')}
                  onChange={(value) => handleConfigChange('temperature', (value || 0).toString())}
                  max={2}
                  min={0}
                  step={0.1}
                  marks={{ 0: '0', 1: '1', 2: '2' }}
                />
              </div>
            </div>
            <Paragraph size="small" type="tertiary" style={{ marginTop: 4 }}>
              较低的值使输出更确定，较高的值使输出更随机、创造性
            </Paragraph>
          </div>
          <div style={{ marginBottom: 10 }}>
            <Form.Label>最大Token数 (Max Tokens)</Form.Label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '85%', marginRight: 10 }}>
                <Form.Slider
                  field="maxTokens"
                  initValue={parseInt(currentConfig?.maxTokens || '2000')}
                  onChange={(value) => handleConfigChange('maxTokens', (value || 100).toString())}
                  max={16000}
                  min={100}
                  step={100}
                  marks={{ 100: '100', 4000: '4k', 8000: '8k', 16000: '16k' }}
                />
              </div>
            </div>
            <Paragraph size="small" type="tertiary" style={{ marginTop: 4 }}>
              限制模型生成的最大token数量
            </Paragraph>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

export default Settings
