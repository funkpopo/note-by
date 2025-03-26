import React, { useState, useEffect } from 'react'
import { Button, Form, Toast, Banner, Space, Typography } from '@douyinfe/semi-ui'
import { IconUpload, IconDownload, IconSync } from '@douyinfe/semi-icons'
import { FormApi } from '@douyinfe/semi-ui/lib/es/form'

const { Text } = Typography

// 由于我们初始化时只提供了部分字段，使用Partial类型
interface WebDAVConfig {
  url: string
  username: string
  password: string
  remotePath: string
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

  // 从本地存储加载WebDAV配置
  useEffect(() => {
    const savedConfig = localStorage.getItem('webdav-config')
    if (savedConfig && formApi) {
      try {
        const config = JSON.parse(savedConfig)
        formApi.setValues(config)
      } catch (error) {
        console.error('加载WebDAV配置失败:', error)
      }
    }
  }, [formApi])

  // 保存WebDAV配置到本地存储
  const saveConfig = (values: Partial<WebDAVConfig>): void => {
    try {
      localStorage.setItem('webdav-config', JSON.stringify(values))
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
      saveConfig(values)

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
      saveConfig(values)

      const result = await window.api.webdav.syncLocalToRemote(values)
      if (result.success) {
        const message = `上传成功: 上传了 ${result.uploaded} 个文件`
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
      saveConfig(values)

      const result = await window.api.webdav.syncRemoteToLocal(values)
      if (result.success) {
        const message = `下载成功: 下载了 ${result.downloaded} 个文件`
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
      saveConfig(values)

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

  // 获取Form实例
  const getFormApi = (api: FormApi<Partial<WebDAVConfig>>): void => {
    setFormApi(api)
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>WebDAV同步设置</h2>

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
        initValues={{ remotePath: '/markdown' }}
      >
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

        <Form.Input
          field="remotePath"
          label="远程路径"
          placeholder="例如: /markdown 或 /notes"
          rules={[{ required: true, message: '请输入远程路径' }]}
        />

        <div style={{ marginTop: '24px' }}>
          <Space>
            <Button loading={testLoading} onClick={handleTestConnection}>
              测试连接
            </Button>

            <Button
              icon={<IconUpload />}
              loading={loading}
              onClick={handleSyncToRemote}
              theme="solid"
            >
              上传到云端
            </Button>

            <Button
              icon={<IconDownload />}
              loading={loading}
              onClick={handleSyncFromRemote}
              theme="solid"
            >
              从云端下载
            </Button>

            <Button
              icon={<IconSync />}
              loading={loading}
              onClick={handleSyncBidirectional}
              theme="solid"
              type="primary"
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
      </Form>
    </div>
  )
}

export default WebDAVSettings
