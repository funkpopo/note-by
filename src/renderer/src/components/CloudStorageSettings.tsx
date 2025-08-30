import React, { useState, useEffect, useCallback } from 'react'
import {
  Button,
  Form,
  Toast,
  Banner,
  Space,
  Typography,
  Progress,
  Modal,
  Input,
  Select,
  Radio
} from '@douyinfe/semi-ui'
import { IconUpload, IconDownload, IconSync } from '@douyinfe/semi-icons'
import { FormApi } from '@douyinfe/semi-ui/lib/es/form'
import { CloudStorageConfig, CloudSyncResult } from '../../../shared/types/cloud-storage'
import './CloudStorageSettings.css'

const { Text, Title } = Typography

interface CloudStorageSettingsProps {
  onSyncComplete?: (result: CloudSyncResult) => void
}

const CloudStorageSettings: React.FC<CloudStorageSettingsProps> = ({ onSyncComplete }) => {
  const [formApi, setFormApi] = useState<FormApi<Partial<CloudStorageConfig>> | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [testLoading, setTestLoading] = useState<boolean>(false)
  const [selectedProvider, setSelectedProvider] = useState<string>('webdav')
  const [syncStatus, setSyncStatus] = useState<{
    show: boolean
    type: 'success' | 'warning' | 'danger'
    message: string
  } | null>(null)
  const [syncProgress, setSyncProgress] = useState<{
    total: number
    processed: number
    action: 'upload' | 'download' | 'compare'
  } | null>(null)
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false)
  const [authCode, setAuthCode] = useState<string>('')
  const [availableProviders, setAvailableProviders] = useState<
    Array<{ id: string; name: string; description: string }>
  >([])

  useEffect(() => {
    loadProviders()
    loadConfig()
    setLocalPath()
  }, [])

  const setLocalPath = async (): Promise<void> => {
    try {
      const path = await window.api.getNotesPath()
      if (formApi) {
        formApi.setValue('localPath', path)
      }
    } catch (error) {
      console.error('Failed to get notes path:', error)
    }
  }

  useEffect(() => {
    const unsubscribe = window.api.cloudStorage.onSyncProgress((progress) => {
      setSyncProgress(progress)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (formApi) {
      setLocalPath()
    }
  }, [formApi])

  const loadProviders = async (): Promise<void> => {
    try {
      const providers = await window.api.cloudStorage.getProviders()
      setAvailableProviders(providers)
    } catch (error) {
      console.error('Failed to load providers:', error)
    }
  }

  const loadConfig = useCallback(async (): Promise<void> => {
    if (!formApi) return

    try {
      const settings = await window.api.settings.getAll()
      if (settings && settings.cloudStorage) {
        const config = settings.cloudStorage as CloudStorageConfig
        formApi.setValues(config)
        setSelectedProvider(config.provider || 'webdav')
      }
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  }, [formApi])

  const saveConfig = async (values: Partial<CloudStorageConfig>): Promise<void> => {
    try {
      await window.api.settings.set('cloudStorage', values)
      await window.api.cloudStorage.notifyConfigChanged()
      Toast.success('配置已保存')
    } catch (error) {
      Toast.error('保存配置失败')
    }
  }

  const handleProviderChange = (value: string): void => {
    setSelectedProvider(value)
    formApi?.setValue('provider', value as 'webdav' | 'googledrive' | 'dropbox')
  }

  const handleTestConnection = async (): Promise<void> => {
    setTestLoading(true)
    try {
      const values = formApi?.getValues() as CloudStorageConfig
      values.provider = selectedProvider as 'webdav' | 'googledrive' | 'dropbox'

      const result = await window.api.cloudStorage.testConnection(values)

      if (result.success) {
        Toast.success(result.message)
        setSyncStatus({
          show: true,
          type: 'success',
          message: result.message
        })
      } else {
        Toast.error(result.message)
        setSyncStatus({
          show: true,
          type: 'danger',
          message: result.message
        })
      }
    } catch (error) {
      Toast.error('测试连接失败')
    } finally {
      setTestLoading(false)
    }
  }

  const handleAuthenticate = async (): Promise<void> => {
    try {
      const values = formApi?.getValues() as CloudStorageConfig
      values.provider = selectedProvider as 'webdav' | 'googledrive' | 'dropbox'

      const result = await window.api.cloudStorage.authenticate(values)

      if (result.success && result.authUrl) {
        setShowAuthModal(true)
        window.open(result.authUrl, '_blank')
      } else {
        Toast.error(result.message)
      }
    } catch (error) {
      Toast.error('认证失败')
    }
  }

  const handleAuthCodeSubmit = async (): Promise<void> => {
    try {
      const values = formApi?.getValues() as CloudStorageConfig
      values.auth = values.auth || {}
      values.auth.accessToken = authCode

      await saveConfig(values)
      setShowAuthModal(false)
      Toast.success('认证成功')
    } catch (error) {
      Toast.error('认证失败')
    }
  }

  const handleSync = async (direction: 'upload' | 'download' | 'bidirectional'): Promise<void> => {
    setLoading(true)
    setSyncProgress(null)

    try {
      const values = formApi?.getValues() as CloudStorageConfig
      values.provider = selectedProvider as 'webdav' | 'googledrive' | 'dropbox'

      let result: CloudSyncResult

      if (direction === 'upload') {
        result = await window.api.cloudStorage.syncLocalToRemote(values)
      } else if (direction === 'download') {
        result = await window.api.cloudStorage.syncRemoteToLocal(values)
      } else {
        result = await window.api.cloudStorage.syncBidirectional(values)
      }

      if (result.success) {
        Toast.success(result.message)
        setSyncStatus({
          show: true,
          type: 'success',
          message: result.message
        })
      } else {
        Toast.error(result.message)
        setSyncStatus({
          show: true,
          type: 'danger',
          message: result.message
        })
      }

      onSyncComplete?.(result)
    } catch (error) {
      Toast.error('同步失败')
    } finally {
      setLoading(false)
      setSyncProgress(null)
    }
  }

  const renderProviderForm = (): React.ReactNode => {
    switch (selectedProvider) {
      case 'webdav':
        return (
          <>
            <Form.Input
              field="url"
              label="WebDAV 服务器地址"
              placeholder="https://your-webdav-server.com"
              rules={[{ required: true, message: '请输入WebDAV服务器地址' }]}
            />
            <Form.Input
              field="username"
              label="用户名"
              placeholder="请输入用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            />
            <Form.Input
              field="password"
              label="密码"
              mode="password"
              placeholder="请输入密码"
              rules={[{ required: true, message: '请输入密码' }]}
            />
          </>
        )

      case 'googledrive':
        return (
          <>
            <Form.Input
              field="auth.clientId"
              label="客户端 ID"
              placeholder="请输入Google Cloud客户端ID"
              rules={[{ required: true, message: '请输入客户端ID' }]}
            />
            <Form.Input
              field="auth.clientSecret"
              label="客户端密钥"
              mode="password"
              placeholder="请输入Google Cloud客户端密钥"
              rules={[{ required: true, message: '请输入客户端密钥' }]}
            />
            <Form.Input
              field="auth.redirectUri"
              label="重定向 URI"
              placeholder="http://localhost:3000/auth/callback"
              initValue="http://localhost:3000/auth/callback"
            />
            <Button
              theme="solid"
              type="primary"
              onClick={handleAuthenticate}
              disabled={!formApi?.getValues()?.auth?.clientId}
              style={{ marginTop: 12 }}
            >
              授权 Google Drive
            </Button>
          </>
        )

      case 'dropbox':
        return (
          <>
            <Form.Input
              field="auth.clientId"
              label="App Key"
              placeholder="请输入Dropbox App Key"
              rules={[{ required: true, message: '请输入App Key' }]}
            />
            <Form.Input
              field="auth.clientSecret"
              label="App Secret"
              mode="password"
              placeholder="请输入Dropbox App Secret"
              rules={[{ required: true, message: '请输入App Secret' }]}
            />
            <Form.Input
              field="auth.redirectUri"
              label="重定向 URI"
              placeholder="http://localhost:3000/auth/callback"
              initValue="http://localhost:3000/auth/callback"
            />
            <Button
              theme="solid"
              type="primary"
              onClick={handleAuthenticate}
              disabled={!formApi?.getValues()?.auth?.clientId}
              style={{ marginTop: 12 }}
            >
              授权 Dropbox
            </Button>
          </>
        )

      default:
        return null
    }
  }

  return (
    <div className="cloud-storage-settings">
      <Form
        getFormApi={(api) => setFormApi(api)}
        onSubmit={saveConfig}
        labelPosition="left"
        labelAlign="right"
        labelWidth={140}
      >
        <Form.Select
          field="provider"
          label="云存储服务"
          placeholder="选择云存储服务"
          value={selectedProvider}
          onChange={(value) => handleProviderChange(value as string)}
          className="cloud-storage-select"
          style={{ width: '100%' }}
          dropdownClassName="cloud-storage-dropdown"
          renderSelectedItem={() => {
            const selected = availableProviders.find((p) => p.id === selectedProvider)
            return selected ? selected.name : '选择云存储服务'
          }}
        >
          {availableProviders.map((provider) => (
            <Select.Option key={provider.id} value={provider.id}>
              <div className="cloud-storage-option">
                <div className="cloud-storage-option-title">{provider.name}</div>
                <div className="cloud-storage-option-desc">{provider.description}</div>
              </div>
            </Select.Option>
          ))}
        </Form.Select>

        {renderProviderForm()}

        <Form.Input
          field="remotePath"
          label="远程路径"
          placeholder="/notes"
          initValue="/notes"
          rules={[{ required: true, message: '请输入远程路径' }]}
        />

        <Form.Input
          field="localPath"
          label="本地路径"
          placeholder="本地笔记文件夹路径"
          disabled
          initValue=""
        />

        <Form.Switch field="enabled" label="启用同步" checkedText="开" uncheckedText="关" />

        <Form.Switch
          field="syncOnStartup"
          label="启动时自动同步"
          checkedText="开"
          uncheckedText="关"
        />

        <Form.RadioGroup field="syncDirection" label="同步方向" initValue="bidirectional">
          <Radio value="localToRemote">仅上传</Radio>
          <Radio value="remoteToLocal">仅下载</Radio>
          <Radio value="bidirectional">双向同步</Radio>
        </Form.RadioGroup>

        <div style={{ marginTop: 24 }}>
          <Space>
            <Button
              theme="solid"
              type="secondary"
              loading={testLoading}
              onClick={handleTestConnection}
            >
              测试连接
            </Button>
            <Button theme="solid" type="primary" htmlType="submit">
              保存配置
            </Button>
          </Space>
        </div>
      </Form>

      {syncStatus && syncStatus.show && (
        <Banner
          type={syncStatus.type}
          description={syncStatus.message}
          closeIcon={null}
          style={{ marginTop: 16 }}
        />
      )}

      {syncProgress && (
        <div className="sync-progress-container">
          <Text size="small">
            {syncProgress.action === 'upload' && '正在上传...'}
            {syncProgress.action === 'download' && '正在下载...'}
            {syncProgress.action === 'compare' && '正在比较文件...'}
          </Text>
          <Progress
            percent={Math.round((syncProgress.processed / syncProgress.total) * 100)}
            showInfo
            size="large"
            style={{ marginTop: 8 }}
          />
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <Title heading={6}>手动同步</Title>
        <div className="sync-button-group">
          <Button
            icon={<IconUpload />}
            loading={loading}
            onClick={() => handleSync('upload')}
            disabled={!formApi?.getValues()?.enabled}
          >
            上传到云端
          </Button>
          <Button
            icon={<IconDownload />}
            loading={loading}
            onClick={() => handleSync('download')}
            disabled={!formApi?.getValues()?.enabled}
          >
            从云端下载
          </Button>
          <Button
            icon={<IconSync />}
            loading={loading}
            onClick={() => handleSync('bidirectional')}
            disabled={!formApi?.getValues()?.enabled}
          >
            双向同步
          </Button>
        </div>
      </div>

      <Modal
        title="OAuth 认证"
        visible={showAuthModal}
        onCancel={() => setShowAuthModal(false)}
        onOk={handleAuthCodeSubmit}
      >
        <div>
          <Text>请在浏览器中完成授权，然后将授权码粘贴到下方：</Text>
          <Input
            value={authCode}
            onChange={setAuthCode}
            placeholder="请输入授权码"
            style={{ marginTop: 12 }}
          />
        </div>
      </Modal>
    </div>
  )
}

export default CloudStorageSettings
