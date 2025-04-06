import React, { useState, useEffect, useCallback } from 'react'
import {
  Button,
  Form,
  Toast,
  Banner,
  Space,
  Typography,
  Card,
  Tabs,
  TabPane
} from '@douyinfe/semi-ui'
import { IconUpload, IconDownload, IconSync } from '@douyinfe/semi-icons'
import { FormApi } from '@douyinfe/semi-ui/lib/es/form'

const { Text } = Typography

// 完整的WebDAV配置接口
interface WebDAVConfig {
  url: string
  username: string
  password: string
  remotePath: string
  enabled: boolean
  syncOnStartup: boolean
  syncDirection: 'localToRemote' | 'remoteToLocal' | 'bidirectional'
}

interface WebDAVSettingsProps {
  onSyncComplete?: (result: {
    success: boolean
    message: string
    direction: 'upload' | 'download' | 'bidirectional'
  }) => void
}

const WebDAVSettings: React.FC<WebDAVSettingsProps> = ({ onSyncComplete }) => {
  // 使用统一的Partial<WebDAVConfig>类型
  const [formApi, setFormApi] = useState<FormApi<Partial<WebDAVConfig>> | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [testLoading, setTestLoading] = useState<boolean>(false)
  const [syncStatus, setSyncStatus] = useState<{
    show: boolean
    type: 'success' | 'warning' | 'danger'
    message: string
  } | null>(null)

  // 加载WebDAV配置
  const loadConfig = useCallback(async (): Promise<void> => {
    if (!formApi) return

    try {
      // 从主进程加载设置
      const settings = await window.api.settings.getAll()
      if (settings && settings.webdav) {
        formApi.setValues(settings.webdav)
      }
    } catch (error) {
      console.error('加载WebDAV配置失败:', error)
    }
  }, [formApi])

  // 从设置加载WebDAV配置
  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  // 保存WebDAV配置到设置
  const saveConfig = async (values: Partial<WebDAVConfig>): Promise<void> => {
    try {
      // 保存到主进程设置
      await window.api.settings.set('webdav', values)
    } catch (error) {
      console.error('保存WebDAV配置失败:', error)
      Toast.error('保存WebDAV配置失败')
    }
  }

  // 测试连接
  const handleTestConnection = async (): Promise<void> => {
    if (!formApi) return

    try {
      setTestLoading(true)
      const values = (await formApi.validate()) as WebDAVConfig
      await saveConfig(values)

      const result = await window.api.webdav.testConnection(values)
      if (result.success) {
        Toast.success('连接成功')
        setSyncStatus({
          show: true,
          type: 'success',
          message: '连接成功'
        })
      } else {
        Toast.error(`连接失败: ${result.message}`)
        setSyncStatus({
          show: true,
          type: 'danger',
          message: `连接失败: ${result.message}`
        })
      }
    } catch (error) {
      console.error('测试连接失败:', error)
      Toast.error(`测试连接失败: ${error}`)
      setSyncStatus({
        show: true,
        type: 'danger',
        message: `测试失败: ${error}`
      })
    } finally {
      setTestLoading(false)
    }
  }

  // 同步本地到远程
  const handleSyncToRemote = async (): Promise<void> => {
    if (!formApi) return

    try {
      setLoading(true)
      const values = (await formApi.validate()) as WebDAVConfig
      await saveConfig(values)

      const result = await window.api.webdav.syncLocalToRemote(values)
      if (result.success) {
        const message = `上传成功: 上传了 ${result.uploaded} 个文件${result.skipped ? `，跳过 ${result.skipped} 个未修改文件` : ''}`
        Toast.success(message)
        setSyncStatus({
          show: true,
          type: 'success',
          message
        })

        if (onSyncComplete) {
          onSyncComplete({
            success: true,
            message,
            direction: 'upload'
          })
        }
      } else {
        Toast.error(`上传失败: ${result.message}`)
        setSyncStatus({
          show: true,
          type: 'danger',
          message: `上传失败: ${result.message}`
        })

        if (onSyncComplete) {
          onSyncComplete({
            success: false,
            message: result.message,
            direction: 'upload'
          })
        }
      }
    } catch (error) {
      console.error('上传失败:', error)
      Toast.error(`上传失败: ${error}`)
      setSyncStatus({
        show: true,
        type: 'danger',
        message: `上传失败: ${error}`
      })

      if (onSyncComplete) {
        onSyncComplete({
          success: false,
          message: String(error),
          direction: 'upload'
        })
      }
    } finally {
      setLoading(false)
    }
  }

  // 同步远程到本地
  const handleSyncFromRemote = async (): Promise<void> => {
    if (!formApi) return

    try {
      setLoading(true)
      const values = (await formApi.validate()) as WebDAVConfig
      await saveConfig(values)

      const result = await window.api.webdav.syncRemoteToLocal(values)
      if (result.success) {
        const message = `下载成功: 下载了 ${result.downloaded} 个文件${result.skipped ? `，跳过 ${result.skipped} 个未修改文件` : ''}`
        Toast.success(message)
        setSyncStatus({
          show: true,
          type: 'success',
          message
        })

        if (onSyncComplete) {
          onSyncComplete({
            success: true,
            message,
            direction: 'download'
          })
        }
      } else {
        Toast.error(`下载失败: ${result.message}`)
        setSyncStatus({
          show: true,
          type: 'danger',
          message: `下载失败: ${result.message}`
        })

        if (onSyncComplete) {
          onSyncComplete({
            success: false,
            message: result.message,
            direction: 'download'
          })
        }
      }
    } catch (error) {
      console.error('下载失败:', error)
      Toast.error(`下载失败: ${error}`)
      setSyncStatus({
        show: true,
        type: 'danger',
        message: `下载失败: ${error}`
      })

      if (onSyncComplete) {
        onSyncComplete({
          success: false,
          message: String(error),
          direction: 'download'
        })
      }
    } finally {
      setLoading(false)
    }
  }

  // 双向同步
  const handleSyncBidirectional = async (): Promise<void> => {
    if (!formApi) return

    try {
      setLoading(true)
      const values = (await formApi.validate()) as WebDAVConfig
      await saveConfig(values)

      const result = await window.api.webdav.syncBidirectional(values)
      if (result.success) {
        const message = `同步成功: 上传了 ${result.uploaded} 个文件，下载了 ${result.downloaded} 个文件`
        Toast.success(message)
        setSyncStatus({
          show: true,
          type: 'success',
          message
        })

        if (onSyncComplete) {
          onSyncComplete({
            success: true,
            message,
            direction: 'bidirectional'
          })
        }
      } else {
        Toast.error(`同步失败: ${result.message}`)
        setSyncStatus({
          show: true,
          type: 'danger',
          message: `同步失败: ${result.message}`
        })

        if (onSyncComplete) {
          onSyncComplete({
            success: false,
            message: result.message,
            direction: 'bidirectional'
          })
        }
      }
    } catch (error) {
      console.error('同步失败:', error)
      Toast.error(`同步失败: ${error}`)
      setSyncStatus({
        show: true,
        type: 'danger',
        message: `同步失败: ${error}`
      })

      if (onSyncComplete) {
        onSyncComplete({
          success: false,
          message: String(error),
          direction: 'bidirectional'
        })
      }
    } finally {
      setLoading(false)
    }
  }

  // 处理配置变更
  const handleConfigChange = async (): Promise<void> => {
    if (!formApi) return

    // 获取当前所有值
    const allValues = formApi.getValues()
    // 确保remotePath始终为/markdown
    allValues.remotePath = '/markdown'
    // 保存更新的配置
    await saveConfig(allValues)
  }

  // 显式保存配置
  const handleSaveConfig = async (): Promise<void> => {
    if (!formApi) return

    try {
      const values = await formApi.validate()
      // 确保remotePath始终为/markdown
      values.remotePath = '/markdown'
      await saveConfig(values)
      Toast.success('WebDAV配置已保存')
    } catch (error) {
      console.error('保存配置失败:', error)
      Toast.error('保存配置失败，请检查表单填写是否正确')
    }
  }

  // 获取Form实例
  const getFormApi = (api: FormApi<Partial<WebDAVConfig>>): void => {
    setFormApi(api)
  }

  return (
    <div
      className="settings-scroll-container webdav-settings"
      style={{
        padding: '20px'
      }}
    >
      {syncStatus && syncStatus.show && (
        <Banner
          type={syncStatus.type}
          description={syncStatus.message}
          closeIcon
          onClose={() => setSyncStatus(null)}
          style={{ marginBottom: '16px' }}
        />
      )}

      <Form<Partial<WebDAVConfig>>
        layout="vertical"
        getFormApi={getFormApi}
        onValueChange={handleConfigChange}
        initValues={{
          remotePath: '/markdown',
          enabled: false,
          syncOnStartup: false,
          syncDirection: 'bidirectional'
        }}
      >
        <Tabs type="line" defaultActiveKey="server">
          {/* 服务器信息标签页 */}
          <TabPane tab="服务器设置" itemKey="server">
            <Card style={{ marginTop: 20, marginBottom: 20 }}>
              <div style={{ marginTop: 16 }}>
                <Form.Input
                  field="url"
                  label="WebDAV服务器地址"
                  placeholder="例如: https://dav.example.com/remote.php/dav/files/username/"
                  rules={[{ required: true, message: '请输入WebDAV服务器地址' }]}
                />

                <Form.Input
                  field="username"
                  label="用户名"
                  placeholder="WebDAV用户名"
                  rules={[{ required: true, message: '请输入用户名' }]}
                />

                <Form.Input
                  field="password"
                  label="密码"
                  placeholder="WebDAV密码"
                  type="password"
                  rules={[{ required: true, message: '请输入密码' }]}
                />
              </div>
              <div style={{ marginTop: 16 }}>
                <Button loading={testLoading} onClick={handleTestConnection} type="primary">
                  测试连接
                </Button>
              </div>
            </Card>
          </TabPane>

          {/* 同步设置标签页 */}
          <TabPane tab="同步选项" itemKey="sync">
            <Card style={{ marginTop: 20, marginBottom: 20 }}>
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                  <Form.Switch field="enabled" label="启用WebDAV同步" noLabel />
                  <Text style={{ marginLeft: '16px' }}>启用WebDAV同步功能</Text>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                  <Form.Switch
                    field="syncOnStartup"
                    label="应用启动时自动同步"
                    noLabel
                    disabled={!formApi?.getValues()?.enabled}
                  />
                  <Text style={{ marginLeft: '16px' }}>应用启动时自动同步文件</Text>
                </div>

                <Form.RadioGroup
                  field="syncDirection"
                  label="同步方向"
                  disabled={!formApi?.getValues()?.enabled}
                >
                  <Form.Radio value="localToRemote">本地 → 远程 (上传)</Form.Radio>
                  <Form.Radio value="remoteToLocal">远程 → 本地 (下载)</Form.Radio>
                  <Form.Radio value="bidirectional">双向同步</Form.Radio>
                </Form.RadioGroup>
              </div>
            </Card>

            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Button type="secondary" onClick={handleSaveConfig}>
                保存配置
              </Button>
            </div>
          </TabPane>

          {/* 操作标签页 */}
          <TabPane tab="同步操作" itemKey="actions">
            <Card style={{ marginTop: 20, marginBottom: 20 }}>
              <div style={{ marginTop: 16 }}>
                <Space>
                  <Button
                    icon={<IconUpload />}
                    loading={loading}
                    onClick={handleSyncToRemote}
                    theme="solid"
                    disabled={!formApi?.getValues()?.enabled}
                  >
                    上传到云端
                  </Button>

                  <Button
                    icon={<IconDownload />}
                    loading={loading}
                    onClick={handleSyncFromRemote}
                    theme="solid"
                    disabled={!formApi?.getValues()?.enabled}
                  >
                    从云端下载
                  </Button>

                  <Button
                    icon={<IconSync />}
                    loading={loading}
                    onClick={handleSyncBidirectional}
                    theme="solid"
                    type="primary"
                    disabled={!formApi?.getValues()?.enabled}
                  >
                    双向同步
                  </Button>
                </Space>
              </div>
              <div style={{ marginTop: '16px' }}>
                <Text type="tertiary">
                  注意: 同步会对比本地和远程文件，只传输不同的文件，避免不必要的流量消耗。
                </Text>
              </div>
            </Card>
          </TabPane>
        </Tabs>
      </Form>
    </div>
  )
}

export default WebDAVSettings
