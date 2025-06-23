import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Button,
  Form,
  Toast,
  Banner,
  Space,
  Typography,
  Card,
  Progress,
  Modal,
  Input
} from '@douyinfe/semi-ui'
import { IconUpload, IconDownload, IconSync, IconLock } from '@douyinfe/semi-icons'
import { FormApi } from '@douyinfe/semi-ui/lib/es/form'
import PasswordPrompt from './PasswordPrompt'

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
  useCustomEncryption?: boolean
  encryptionTest?: string
  encryptionTestPlain?: string
  [key: string]: unknown
}

// 配置状态管理器
class WebDAVConfigManager {
  private config: WebDAVConfig = {
    url: '',
    username: '',
    password: '',
    remotePath: '/markdown',
    enabled: false,
    syncOnStartup: false,
    syncDirection: 'bidirectional',
    useCustomEncryption: false,
    encryptionTest: '',
    encryptionTestPlain: ''
  }

  private listeners: Set<(config: WebDAVConfig) => void> = new Set()
  private isLoading = false

  async loadConfig(): Promise<WebDAVConfig> {
    if (this.isLoading) return this.config

    this.isLoading = true
    try {
      const settings = await window.api.settings.getAll()
      if (settings?.webdav) {
        this.config = { ...this.config, ...settings.webdav }
      }
      this.notifyListeners()
      return this.config
    } catch (error) {
      console.error('Failed to load WebDAV config:', error)
      return this.config
    } finally {
      this.isLoading = false
    }
  }

  async saveConfig(newConfig: Partial<WebDAVConfig>): Promise<boolean> {
    try {
      // 创建原子性更新
      const updatedConfig = { ...this.config, ...newConfig }
      
      // 验证配置
      if (!this.validateConfig(updatedConfig)) {
        throw new Error('Invalid configuration')
      }

      // 保存到主进程
      await window.api.settings.set('webdav', updatedConfig)
      await window.api.webdav.notifyConfigChanged()

      // 更新本地状态
      this.config = updatedConfig
      this.notifyListeners()
      
      return true
    } catch (error) {
      console.error('Failed to save WebDAV config:', error)
      return false
    }
  }

  getConfig(): WebDAVConfig {
    return { ...this.config }
  }

  subscribe(listener: (config: WebDAVConfig) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private validateConfig(config: WebDAVConfig): boolean {
    // 基本验证
    if (config.enabled) {
      if (!config.url || !config.username || !config.password) {
        return false
      }
    }
    return true
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.config)
      } catch (error) {
        console.error('Config listener error:', error)
      }
    }
  }

  async toggleEncryption(enabled: boolean, masterPassword?: string): Promise<boolean> {
    try {
      if (enabled && masterPassword) {
        // 启用加密
        const result = await window.api.webdav.setMasterPassword({
          password: masterPassword,
          webdavConfig: this.config
        })
        
                 if (result.success) {
           return await this.saveConfig({
             useCustomEncryption: true,
             encryptionTest: (result as any).encryptionTest || '',
             encryptionTestPlain: (result as any).encryptionTestPlain || ''
           })
        }
        return false
      } else if (!enabled) {
        // 禁用加密
        return await this.saveConfig({
          useCustomEncryption: false,
          encryptionTest: '',
          encryptionTestPlain: ''
        })
      }
      return false
    } catch (error) {
      console.error('Failed to toggle encryption:', error)
      return false
    }
  }
}

interface SyncCompleteCallback {
  success: boolean
  message: string
  direction: 'localToRemote' | 'remoteToLocal' | 'bidirectional'
  cancelled?: boolean
}

interface WebDAVSettingsProps {
  onSyncComplete?: (result: SyncCompleteCallback) => void
}

const WebDAVSettings: React.FC<WebDAVSettingsProps> = ({ onSyncComplete }) => {
  // 配置管理器
  const configManager = useRef(new WebDAVConfigManager())
  
  // 状态管理
  const [formApi, setFormApi] = useState<FormApi<WebDAVConfig> | null>(null)
  const [config, setConfig] = useState<WebDAVConfig>(() => configManager.current.getConfig())
  const [loading, setLoading] = useState<boolean>(false)
  const [testLoading, setTestLoading] = useState<boolean>(false)
  
  // 同步状态
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

  // 密码相关状态
  const [showPasswordPrompt, setShowPasswordPrompt] = useState<boolean>(false)
  const [showSetPasswordModal, setShowSetPasswordModal] = useState<boolean>(false)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false)
  const [showDisableEncryptionModal, setShowDisableEncryptionModal] = useState<boolean>(false)
  
  const [masterPassword, setMasterPassword] = useState<string>('')
  const [confirmMasterPassword, setConfirmMasterPassword] = useState<string>('')
  const [currentPassword, setCurrentPassword] = useState<string>('')
  const [newPassword, setNewPassword] = useState<string>('')
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('')
  
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false)
  
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number
    feedback: string
    color: string
  }>({ score: 0, feedback: '请输入密码', color: '#c1c1c1' })

  // 等待密码验证的操作
  const pendingOperationRef = useRef<((password: string) => Promise<void>) | null>(null)

  // 订阅配置变化
  useEffect(() => {
    const unsubscribe = configManager.current.subscribe((newConfig) => {
      setConfig(newConfig)
      if (formApi) {
        formApi.setValues(newConfig)
      }
    })

    // 初始加载配置
    configManager.current.loadConfig()

    return unsubscribe
  }, [formApi])

  // 同步进度监听
  useEffect(() => {
    const unsubscribe = window.api.webdav.onSyncProgress((progress) => {
      setSyncProgress(progress)
    })
    return unsubscribe
  }, [])

  // 评估密码强度
  const evaluatePasswordStrength = useCallback((password: string): void => {
    let score = 0
    let feedback = '弱密码'
    let color = '#ff4d4f'

    if (!password) {
      setPasswordStrength({ score: 0, feedback: '请输入密码', color: '#c1c1c1' })
      return
    }

    if (password.length >= 8) score += 1
    if (password.length >= 12) score += 1
    if (/[A-Z]/.test(password)) score += 0.5
    if (/[a-z]/.test(password)) score += 0.5
    if (/[0-9]/.test(password)) score += 0.5
    if (/[^A-Za-z0-9]/.test(password)) score += 1

    if (score >= 3.5) {
      feedback = '非常强'
      color = '#52c41a'
    } else if (score >= 2.5) {
      feedback = '强'
      color = '#52c41a'
    } else if (score >= 1.5) {
      feedback = '中等'
      color = '#faad14'
    } else if (score >= 1) {
      feedback = '弱'
      color = '#ff4d4f'
    } else {
      feedback = '非常弱'
      color = '#ff4d4f'
    }

    setPasswordStrength({ score: Math.min(Math.floor(score), 4), feedback, color })
  }, [])

  // 处理表单值变化
  const handleConfigChange = useCallback(async (changedValues: Partial<WebDAVConfig>) => {
    try {
      // 特殊处理加密设置变化
      if ('useCustomEncryption' in changedValues) {
        const enabled = changedValues.useCustomEncryption
        
        if (enabled && !config.useCustomEncryption) {
          // 要启用加密，显示设置密码对话框
          setShowSetPasswordModal(true)
          return
        } else if (!enabled && config.useCustomEncryption) {
          // 要禁用加密，显示确认对话框
          setShowDisableEncryptionModal(true)
          return
        }
      }

      // 正常的配置更新
      const success = await configManager.current.saveConfig(changedValues)
      if (!success) {
        // 保存失败，恢复表单值
        if (formApi) {
          formApi.setValues(config)
        }
        Toast.error('保存配置失败')
      }
    } catch (error) {
      console.error('Config change error:', error)
      if (formApi) {
        formApi.setValues(config)
      }
    }
  }, [config, formApi])

  // 测试连接
  const handleTestConnection = useCallback(async () => {
    if (!formApi) return

    try {
      setTestLoading(true)
      const values = await formApi.validate() as WebDAVConfig
      
      // 先保存当前配置
      await configManager.current.saveConfig(values)

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
      Toast.error(`测试连接失败: ${error}`)
      setSyncStatus({
        show: true,
        type: 'danger',
        message: `测试失败: ${error}`
      })
    } finally {
      setTestLoading(false)
    }
  }, [formApi])

  // 验证主密码并执行操作
  const executeWithPassword = useCallback(async (operation: (password: string) => Promise<void>) => {
    if (!config.useCustomEncryption) {
      await operation('')
      return
    }

    pendingOperationRef.current = operation
    setShowPasswordPrompt(true)
  }, [config.useCustomEncryption])

  // 处理密码验证
  const handlePasswordVerified = useCallback(async (password: string): Promise<boolean> => {
    try {
      const verified = await window.api.webdav.verifyMasterPassword(password)
      
      if (verified.success && pendingOperationRef.current) {
        setShowPasswordPrompt(false)
        await pendingOperationRef.current(password)
        pendingOperationRef.current = null
        return true
      }
      return false
    } catch (error) {
      console.error('Password verification failed:', error)
      return false
    }
  }, [])

  // 同步操作
  const handleSync = useCallback(async (
    direction: 'localToRemote' | 'remoteToLocal' | 'bidirectional'
  ) => {
    if (!formApi) return

    await executeWithPassword(async (password) => {
      try {
        setLoading(true)
        setSyncProgress(null)
        
        const values = await formApi.validate() as WebDAVConfig
        await configManager.current.saveConfig(values)

        const syncConfig = { ...values, masterPassword: password }
        let result: any

        switch (direction) {
          case 'localToRemote':
            result = await window.api.webdav.syncLocalToRemote(syncConfig)
            break
          case 'remoteToLocal':
            result = await window.api.webdav.syncRemoteToLocal(syncConfig)
            break
          case 'bidirectional':
            result = await window.api.webdav.syncBidirectional(syncConfig)
            break
        }

        if (result.success) {
          let message = '同步成功'
          if (direction === 'localToRemote') {
            message = `上传成功: 上传了 ${result.uploaded} 个文件`
          } else if (direction === 'remoteToLocal') {
            message = `下载成功: 下载了 ${result.downloaded} 个文件`
          } else {
            message = `同步成功: 上传了 ${result.uploaded} 个文件，下载了 ${result.downloaded} 个文件`
          }

          if (result.skipped || result.skippedUpload || result.skippedDownload) {
            const totalSkipped = (result.skipped || 0) + (result.skippedUpload || 0) + (result.skippedDownload || 0)
            message += `，跳过 ${totalSkipped} 个未修改文件`
          }

          Toast.success(message)
          setSyncStatus({
            show: true,
            type: 'success',
            message
          })

          onSyncComplete?.({
            success: true,
            message,
            direction,
            cancelled: result.cancelled
          })
        } else {
          const message = `同步失败: ${result.message}`
          Toast.error(message)
          setSyncStatus({
            show: true,
            type: 'danger',
            message
          })

          onSyncComplete?.({
            success: false,
            message: result.message,
            direction,
            cancelled: result.cancelled
          })
        }
      } catch (error) {
        const message = `同步失败: ${error}`
        Toast.error(message)
        setSyncStatus({
          show: true,
          type: 'danger',
          message
        })

        onSyncComplete?.({
          success: false,
          message: String(error),
          direction
        })
      } finally {
        setLoading(false)
        setSyncProgress(null)
      }
    })
  }, [formApi, executeWithPassword, onSyncComplete])

  // 设置主密码
  const handleSetMasterPassword = useCallback(async () => {
    if (!masterPassword || masterPassword !== confirmMasterPassword || masterPassword.length < 8) {
      setPasswordError('密码验证失败')
      return
    }

    try {
      setLoading(true)
      const success = await configManager.current.toggleEncryption(true, masterPassword)
      
      if (success) {
        Toast.success('主密码设置成功')
        setShowSetPasswordModal(false)
        setMasterPassword('')
        setConfirmMasterPassword('')
        setPasswordError(null)
      } else {
        setPasswordError('设置主密码失败')
      }
    } catch (error) {
      setPasswordError('设置主密码时发生错误')
    } finally {
      setLoading(false)
    }
  }, [masterPassword, confirmMasterPassword])

  // 更改主密码
  const handleChangePassword = useCallback(async () => {
    if (!currentPassword || !newPassword || newPassword !== confirmNewPassword || newPassword.length < 8) {
      setPasswordError('密码验证失败')
      return
    }

    try {
      setIsChangingPassword(true)

      // 验证当前密码
      const verifyResult = await window.api.webdav.verifyMasterPassword(currentPassword)
      if (!verifyResult.success) {
        setPasswordError('当前密码不正确')
        return
      }

      // 设置新密码
      const success = await configManager.current.toggleEncryption(true, newPassword)
      
      if (success) {
        Toast.success('密码已成功更改')
        setShowChangePasswordModal(false)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmNewPassword('')
        setPasswordError(null)
      } else {
        setPasswordError('更改密码失败')
      }
    } catch (error) {
      setPasswordError('更改密码时发生错误')
    } finally {
      setIsChangingPassword(false)
    }
  }, [currentPassword, newPassword, confirmNewPassword])

  // 禁用加密
  const handleDisableEncryption = useCallback(async () => {
    try {
      const success = await configManager.current.toggleEncryption(false)
      
      if (success) {
        Toast.success('已关闭自定义加密')
        setShowDisableEncryptionModal(false)
      } else {
        Toast.error('关闭加密失败')
      }
    } catch (error) {
      Toast.error('关闭加密时发生错误')
    }
  }, [])

  // 清除同步缓存
  const handleClearSyncCache = useCallback(async () => {
    try {
      const result = await window.api.webdav.clearSyncCache()
      if (result.success) {
        Toast.success('同步缓存已清除')
        setSyncStatus({
          show: true,
          type: 'success',
          message: result.message || '同步缓存已清除'
        })
      } else {
        Toast.error(`清除缓存失败: ${result.error}`)
        setSyncStatus({
          show: true,
          type: 'danger',
          message: `清除缓存失败: ${result.error}`
        })
      }
    } catch (error) {
      Toast.error(`清除缓存失败: ${error}`)
      setSyncStatus({
        show: true,
        type: 'danger',
        message: `清除缓存失败: ${error}`
      })
    }
  }, [])

  return (
    <div className="settings-scroll-container webdav-settings" style={{ padding: '20px' }}>
      {syncStatus?.show && (
        <Banner
          type={syncStatus.type}
          description={syncStatus.message}
          closeIcon
          onClose={() => setSyncStatus(null)}
          style={{ marginBottom: '16px' }}
        />
      )}

      {syncProgress && !loading && (
        <Banner
          type="info"
          description={
            <div style={{ marginTop: '8px' }}>
              <Progress
                percent={Math.floor((syncProgress.processed / syncProgress.total) * 100)}
                showInfo
                format={() => `${syncProgress.processed}/${syncProgress.total}`}
                stroke={
                  syncProgress.action === 'upload'
                    ? '#1890ff'
                    : syncProgress.action === 'download'
                      ? '#52c41a'
                      : '#faad14'
                }
              />
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                {syncProgress.action === 'upload'
                  ? '正在上传文件...'
                  : syncProgress.action === 'download'
                    ? '正在下载文件...'
                    : '正在比较文件内容...'}
              </div>
            </div>
          }
          closeIcon
          onClose={() => setSyncProgress(null)}
          style={{ marginBottom: '16px' }}
        />
      )}

      <Form<WebDAVConfig>
        layout="vertical"
        getFormApi={setFormApi}
        onValueChange={handleConfigChange}
        initValues={config}
      >
        <Card style={{ marginBottom: 20 }}>
          <Text strong style={{ fontSize: '18px', display: 'block', marginBottom: '16px' }}>
            WebDAV 服务器设置
          </Text>
          <div>
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
              placeholder="远程存储路径"
              rules={[{ required: true, message: '请输入远程路径' }]}
            />

            <div style={{ marginTop: 16 }}>
              <Button loading={testLoading} onClick={handleTestConnection} type="primary">
                测试连接
              </Button>
            </div>
          </div>
        </Card>

        <Card style={{ marginBottom: 20 }}>
          <Text strong style={{ fontSize: '18px', display: 'block', marginBottom: '16px' }}>
            同步选项
          </Text>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <Form.Switch field="enabled" label="启用WebDAV同步" noLabel />
              <Text style={{ marginLeft: '16px' }}>启用WebDAV同步功能</Text>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <Form.Switch
                field="syncOnStartup"
                label="应用启动时自动同步"
                noLabel
                disabled={!config.enabled}
              />
              <Text style={{ marginLeft: '16px' }}>应用启动时自动同步文件</Text>
            </div>

            <Form.RadioGroup field="syncDirection" label="同步方向" disabled={!config.enabled}>
              <Form.Radio value="localToRemote">本地 → 远程 (上传)</Form.Radio>
              <Form.Radio value="remoteToLocal">远程 → 本地 (下载)</Form.Radio>
              <Form.Radio value="bidirectional">双向同步</Form.Radio>
            </Form.RadioGroup>
          </div>
        </Card>

        <Card style={{ marginBottom: 20 }}>
          <Text strong style={{ fontSize: '18px', display: 'block', marginBottom: '16px' }}>
            加密设置
          </Text>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <Form.Switch
                field="useCustomEncryption"
                label="使用自定义加密"
                noLabel
              />
              <Text style={{ marginLeft: '16px' }}>使用自定义主密码加密同步数据</Text>
            </div>
            {config.useCustomEncryption && (
              <div style={{ marginTop: '8px', marginBottom: '16px' }}>
                <Button type="tertiary" icon={<IconLock />} onClick={() => setShowChangePasswordModal(true)}>
                  更改主密码
                </Button>
              </div>
            )}
            <Text type="tertiary">
              {config.useCustomEncryption
                ? '已启用自定义加密，同步时需要输入主密码。您可以随时关闭此功能。'
                : '启用此选项后，您需要设置一个主密码，用于加密同步数据。'}
            </Text>
          </div>
        </Card>

        <Card style={{ marginBottom: 20 }}>
          <Text strong style={{ fontSize: '18px', display: 'block', marginBottom: '16px' }}>
            同步操作
          </Text>
          <div>
            <div style={{ marginBottom: '16px' }}>
              <Space>
                <Button
                  icon={<IconUpload />}
                  loading={loading}
                  onClick={() => handleSync('localToRemote')}
                  theme="solid"
                  disabled={!config.enabled}
                >
                  上传到云端
                </Button>

                <Button
                  icon={<IconDownload />}
                  loading={loading}
                  onClick={() => handleSync('remoteToLocal')}
                  theme="solid"
                  disabled={!config.enabled}
                >
                  从云端下载
                </Button>

                <Button
                  icon={<IconSync />}
                  loading={loading}
                  onClick={() => handleSync('bidirectional')}
                  theme="solid"
                  type="primary"
                  disabled={!config.enabled}
                >
                  双向同步
                </Button>
              </Space>
            </div>
            <div>
              <Text type="tertiary">
                注意: 同步会对比本地和远程文件，只传输不同的文件，避免不必要的流量消耗。
              </Text>
            </div>
          </div>
        </Card>

        <Card style={{ marginBottom: 20 }}>
          <Text strong style={{ fontSize: '18px', display: 'block', marginBottom: '16px' }}>
            维护操作
          </Text>
          <div>
            <Button type="danger" onClick={handleClearSyncCache} disabled={!config.enabled}>
              清除同步缓存
            </Button>
          </div>
        </Card>
      </Form>

      {/* 密码验证对话框 */}
      <PasswordPrompt
        visible={showPasswordPrompt}
        title="输入主密码"
        explanation="请输入您的WebDAV同步主密码以继续操作"
        confirmText="确认"
        cancelText="取消"
        onCancel={() => {
          setShowPasswordPrompt(false)
          pendingOperationRef.current = null
          setLoading(false)
        }}
        onConfirm={handlePasswordVerified}
      />

      {/* 设置主密码对话框 */}
      <Modal
        title="设置主密码"
        visible={showSetPasswordModal}
        onCancel={() => {
          setShowSetPasswordModal(false)
          setMasterPassword('')
          setConfirmMasterPassword('')
          setPasswordError(null)
          // 恢复开关状态
          if (formApi) {
            formApi.setValues({ ...config, useCustomEncryption: false })
          }
        }}
        footer={null}
        closeOnEsc={true}
        maskClosable={false}
      >
        <div style={{ padding: '0 0 20px' }}>
          <Text>
            请设置用于WebDAV同步的主密码。此密码将用于加密您的同步数据，非常重要，请务必记住。
          </Text>
          
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: '16px' }}>
              <Text>主密码</Text>
              <Input
                placeholder="请输入主密码"
                value={masterPassword}
                type="password"
                onChange={(value) => {
                  setMasterPassword(value)
                  evaluatePasswordStrength(value)
                  if (passwordError) setPasswordError(null)
                }}
                style={{ width: '100%', marginTop: '5px' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                <div
                  style={{
                    flex: '1',
                    height: '5px',
                    background: '#f0f0f0',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      width: `${(passwordStrength.score / 4) * 100}%`,
                      height: '100%',
                      background: passwordStrength.color,
                      transition: 'width 0.3s, background 0.3s'
                    }}
                  />
                </div>
                <Text
                  style={{
                    marginLeft: '10px',
                    color: passwordStrength.color,
                    minWidth: '60px',
                    fontSize: '12px'
                  }}
                >
                  {passwordStrength.feedback}
                </Text>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <Text>确认主密码</Text>
              <Input
                placeholder="请再次输入主密码"
                value={confirmMasterPassword}
                type="password"
                onChange={(value) => {
                  setConfirmMasterPassword(value)
                  if (passwordError) setPasswordError(null)
                }}
                style={{ width: '100%', marginTop: '5px' }}
              />
            </div>

            {passwordError && (
              <div style={{ color: 'var(--semi-color-danger)', marginBottom: '16px' }}>
                <Text type="danger">{passwordError}</Text>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button 
                onClick={() => {
                  setShowSetPasswordModal(false)
                  if (formApi) {
                    formApi.setValues({ ...config, useCustomEncryption: false })
                  }
                }}
              >
                取消
              </Button>
              <Button
                type="primary"
                loading={loading}
                disabled={
                  !masterPassword ||
                  !confirmMasterPassword ||
                  masterPassword !== confirmMasterPassword ||
                  masterPassword.length < 8
                }
                onClick={handleSetMasterPassword}
                icon={<IconLock />}
              >
                确认设置
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* 更改主密码对话框 */}
      <Modal
        title="更改主密码"
        visible={showChangePasswordModal}
        onCancel={() => {
          setShowChangePasswordModal(false)
          setCurrentPassword('')
          setNewPassword('')
          setConfirmNewPassword('')
          setPasswordError(null)
        }}
        footer={null}
      >
        <div style={{ padding: '0 0 20px' }}>
          <Text>请输入当前主密码并设置新的主密码。</Text>
          
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: '16px' }}>
              <Text>当前主密码</Text>
              <Input
                placeholder="请输入当前主密码"
                value={currentPassword}
                type="password"
                onChange={(value) => {
                  setCurrentPassword(value)
                  if (passwordError) setPasswordError(null)
                }}
                style={{ width: '100%', marginTop: '5px' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <Text>新主密码</Text>
              <Input
                placeholder="请输入新主密码"
                value={newPassword}
                type="password"
                onChange={(value) => {
                  setNewPassword(value)
                  evaluatePasswordStrength(value)
                  if (passwordError) setPasswordError(null)
                }}
                style={{ width: '100%', marginTop: '5px' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                <div
                  style={{
                    flex: '1',
                    height: '5px',
                    background: '#f0f0f0',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      width: `${(passwordStrength.score / 4) * 100}%`,
                      height: '100%',
                      background: passwordStrength.color,
                      transition: 'width 0.3s, background 0.3s'
                    }}
                  />
                </div>
                <Text
                  style={{
                    marginLeft: '10px',
                    color: passwordStrength.color,
                    minWidth: '60px',
                    fontSize: '12px'
                  }}
                >
                  {passwordStrength.feedback}
                </Text>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <Text>确认新主密码</Text>
              <Input
                placeholder="请再次输入新主密码"
                value={confirmNewPassword}
                type="password"
                onChange={(value) => {
                  setConfirmNewPassword(value)
                  if (passwordError) setPasswordError(null)
                }}
                style={{ width: '100%', marginTop: '5px' }}
              />
            </div>

            {passwordError && (
              <div style={{ color: 'var(--semi-color-danger)', marginBottom: '16px' }}>
                <Text type="danger">{passwordError}</Text>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button onClick={() => setShowChangePasswordModal(false)}>取消</Button>
              <Button
                type="primary"
                loading={isChangingPassword}
                disabled={
                  !currentPassword ||
                  !newPassword ||
                  !confirmNewPassword ||
                  newPassword !== confirmNewPassword ||
                  newPassword.length < 8
                }
                onClick={handleChangePassword}
                icon={<IconLock />}
              >
                更改密码
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* 关闭加密确认对话框 */}
      <Modal
        title="关闭自定义加密"
        visible={showDisableEncryptionModal}
        onCancel={() => setShowDisableEncryptionModal(false)}
        footer={null}
        width={480}
      >
        <div style={{ padding: '0 0 20px' }}>
          <Text type="warning" strong style={{ fontSize: '16px', display: 'block', marginBottom: '12px' }}>
            ⚠️ 重要提醒
          </Text>
          <div
            style={{
              backgroundColor: '#fff7e6',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #ffd666',
              marginBottom: '20px'
            }}
          >
            <Text>关闭自定义加密将会：</Text>
            <ul style={{ marginLeft: '16px', marginTop: '8px', marginBottom: '8px' }}>
              <li>移除当前的主密码设置</li>
              <li>清除所有加密相关的配置</li>
              <li>后续同步将不再使用自定义加密</li>
            </ul>
            <Text type="warning">
              <strong>注意：</strong>这不会影响已经同步的文件，但新的同步操作将不再加密。
            </Text>
          </div>

          <Text>确认关闭自定义加密功能吗？</Text>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <Button onClick={() => setShowDisableEncryptionModal(false)}>取消</Button>
            <Button type="danger" onClick={handleDisableEncryption}>
              确认关闭
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default WebDAVSettings
