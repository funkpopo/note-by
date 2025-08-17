import React, { useState, useEffect, useCallback } from 'react'
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
  useCustomEncryption?: boolean // 是否使用自定义加密
  encryptionTest?: string // 用于验证主密码的测试字符串
  encryptionTestPlain?: string // 加密前的原始字符串
  [key: string]: unknown // 添加索引签名，使其与Record<string, unknown>兼容
}

interface SyncCompleteCallback {
  success: boolean
  message: string
  direction: 'upload' | 'download' | 'bidirectional'
  cancelled?: boolean
}

interface WebDAVSettingsProps {
  onSyncComplete?: (result: SyncCompleteCallback) => void
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
  // 添加同步进度状态
  const [syncProgress, setSyncProgress] = useState<{
    total: number
    processed: number
    action: 'upload' | 'download' | 'compare'
  } | null>(null)
  // 添加密码相关状态
  const [showPasswordPrompt, setShowPasswordPrompt] = useState<boolean>(false)
  const [showSetPasswordModal, setShowSetPasswordModal] = useState<boolean>(false)
  const [masterPassword, setMasterPassword] = useState<string>('')
  const [confirmMasterPassword, setConfirmMasterPassword] = useState<string>('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [customEncryptionEnabled, setCustomEncryptionEnabled] = useState<boolean>(false)
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number // 0-4 分数
    feedback: string // 反馈信息
    color: string // 颜色
  }>({ score: 0, feedback: '请输入密码', color: '#c1c1c1' })
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false)
  const [currentPassword, setCurrentPassword] = useState<string>('')
  const [newPassword, setNewPassword] = useState<string>('')
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('')
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false)
  const [showDisableEncryptionModal, setShowDisableEncryptionModal] = useState<boolean>(false)

  // 添加独立的enabled状态管理
  const [enabledState, setEnabledState] = useState<boolean>(false)

  // 加载WebDAV配置
  const loadConfig = useCallback(async (): Promise<void> => {
    if (!formApi) return

    try {
      // 从主进程加载设置
      const settings = await window.api.settings.getAll()
      if (settings && settings.webdav) {
        formApi.setValues(settings.webdav)
        // 更新自定义加密状态
        setCustomEncryptionEnabled((settings.webdav as WebDAVConfig).useCustomEncryption || false)
        // 同步enabled状态
        setEnabledState((settings.webdav as WebDAVConfig).enabled || false)
      }
    } catch (_error) {}
  }, [formApi])

  // 从设置加载WebDAV配置
  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  // 添加同步进度事件监听
  useEffect(() => {
    // 监听同步进度
    const unsubscribe = window.api.webdav.onSyncProgress((progress) => {
      setSyncProgress(progress)
    })

    return () => {
      // 组件卸载时取消监听
      unsubscribe()
    }
  }, [])

  // 保存WebDAV配置到设置
  const saveConfig = async (values: Partial<WebDAVConfig>): Promise<void> => {
    try {
      // 保存到主进程设置
      await window.api.settings.set('webdav', values)
      // 通知主进程WebDAV配置已变更，立即生效
      await window.api.webdav.notifyConfigChanged()
    } catch (error) {
      Toast.error('保存WebDAV配置失败')
    }
  }

  // 添加评估密码强度的函数
  const evaluatePasswordStrength = (password: string): void => {
    // 简单的密码强度评估
    let score = 0
    let feedback = '弱密码'
    let color = '#ff4d4f' // 红色

    if (!password) {
      setPasswordStrength({ score: 0, feedback: '请输入密码', color: '#c1c1c1' })
      return
    }

    // 基础长度评分
    if (password.length >= 8) score += 1
    if (password.length >= 12) score += 1

    // 字符多样性评分
    if (/[A-Z]/.test(password)) score += 0.5
    if (/[a-z]/.test(password)) score += 0.5
    if (/[0-9]/.test(password)) score += 0.5
    if (/[^A-Za-z0-9]/.test(password)) score += 1

    // 设置反馈和颜色
    if (score >= 3.5) {
      feedback = '非常强'
      color = '#52c41a' // 绿色
    } else if (score >= 2.5) {
      feedback = '强'
      color = '#52c41a' // 绿色
    } else if (score >= 1.5) {
      feedback = '中等'
      color = '#faad14' // 黄色
    } else if (score >= 1) {
      feedback = '弱'
      color = '#ff4d4f' // 红色
    } else {
      feedback = '非常弱'
      color = '#ff4d4f' // 红色
    }

    setPasswordStrength({ score: Math.min(Math.floor(score), 4), feedback, color })
  }

  // 更新处理密码输入
  const handlePasswordInput = (value: string): void => {
    setMasterPassword(value)
    // 评估密码强度
    evaluatePasswordStrength(value)
    // 如果之前有错误，清除
    if (passwordError) {
      setPasswordError(null)
    }
  }

  // 处理确认密码输入
  const handleConfirmPasswordInput = (value: string): void => {
    setConfirmMasterPassword(value)
    // 如果之前有错误，清除
    if (passwordError) {
      setPasswordError(null)
    }
  }

  // 验证并设置主密码
  const handleSetMasterPassword = async (): Promise<void> => {
    // 验证密码
    if (!masterPassword) {
      setPasswordError('请输入主密码')
      return
    }

    if (masterPassword !== confirmMasterPassword) {
      setPasswordError('两次输入的密码不一致')
      return
    }

    if (masterPassword.length < 8) {
      setPasswordError('密码长度至少为8个字符')
      return
    }

    try {
      setLoading(true)

      // 获取当前WebDAV配置
      const currentConfig = formApi?.getValues() as WebDAVConfig

      // 设置主密码
      const result = await window.api.webdav.setMasterPassword({
        password: masterPassword,
        webdavConfig: currentConfig
      })

      if (result.success) {
        Toast.success('主密码设置成功')
        // 关闭设置对话框
        setShowSetPasswordModal(false)
        // 清空输入
        setMasterPassword('')
        setConfirmMasterPassword('')
        // 更新加密状态
        setCustomEncryptionEnabled(true)
        // 重新加载配置
        await loadConfig()
      } else {
        Toast.error(`设置主密码失败: ${result.error || result.message}`)
        setPasswordError(result.error || result.message || '设置主密码失败')
      }
    } catch (error) {
      Toast.error('设置主密码时发生错误')
      setPasswordError('设置主密码时发生错误')
    } finally {
      setLoading(false)
    }
  }

  // 验证主密码
  const verifyMasterPassword = async (password: string): Promise<boolean> => {
    try {
      const result = await window.api.webdav.verifyMasterPassword(password)
      return result.success
    } catch (error) {
      return false
    }
  }

  // 获取已验证的主密码并执行操作
  const getVerifiedMasterPassword = async (
    callback: (password: string) => Promise<void>
  ): Promise<void> => {
    // 检查是否启用了自定义加密
    const config = formApi?.getValues()
    if (!config?.useCustomEncryption) {
      // 未启用自定义加密，直接执行回调，不传递密码
      await callback('')
      return
    }

    // 显示密码输入框
    setShowPasswordPrompt(true)

    // 密码验证函数将在PasswordPrompt组件中调用verifyMasterPassword
    // 如果验证成功，PasswordPrompt会关闭，并调用回调函数
  }

  // 处理密码验证成功
  const handlePasswordVerified = async (password: string): Promise<boolean> => {
    const verified = await verifyMasterPassword(password)

    if (verified) {
      // 关闭密码提示
      setShowPasswordPrompt(false)
      return true
    }

    return false
  }

  // 处理更改密码对话框打开
  const handleOpenChangePassword = (): void => {
    // 重置输入
    setCurrentPassword('')
    setNewPassword('')
    setConfirmNewPassword('')
    setPasswordError(null)
    setPasswordStrength({ score: 0, feedback: '请输入密码', color: '#c1c1c1' })
    setShowChangePasswordModal(true)
  }

  // 处理更改密码
  const handleChangePassword = async (): Promise<void> => {
    // 验证输入
    if (!currentPassword) {
      setPasswordError('请输入当前密码')
      return
    }

    if (!newPassword) {
      setPasswordError('请输入新密码')
      return
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('两次输入的新密码不一致')
      return
    }

    if (newPassword.length < 8) {
      setPasswordError('新密码长度至少为8个字符')
      return
    }

    // 验证当前密码
    try {
      setIsChangingPassword(true)

      const verifyResult = await window.api.webdav.verifyMasterPassword(currentPassword)

      if (!verifyResult.success) {
        setPasswordError('当前密码不正确')
        setIsChangingPassword(false)
        return
      }

      // 获取当前WebDAV配置
      const currentConfig = formApi?.getValues() as WebDAVConfig

      // 设置新密码
      const result = await window.api.webdav.setMasterPassword({
        password: newPassword,
        webdavConfig: currentConfig
      })

      if (result.success) {
        Toast.success('密码已成功更改')
        // 关闭对话框
        setShowChangePasswordModal(false)
        // 清空输入
        setCurrentPassword('')
        setNewPassword('')
        setConfirmNewPassword('')
        // 重新加载配置
        await loadConfig()
      } else {
        Toast.error(`更改密码失败: ${result.error || result.message}`)
        setPasswordError(result.error || result.message || '更改密码失败')
      }
    } catch (error) {
      Toast.error('更改密码时发生错误')
      setPasswordError('更改密码时发生错误')
    } finally {
      setIsChangingPassword(false)
    }
  }

  // 处理新密码输入和强度评估
  const handleNewPasswordInput = (value: string): void => {
    setNewPassword(value)
    // 评估密码强度
    evaluatePasswordStrength(value)
    // 如果之前有错误，清除
    if (passwordError) {
      setPasswordError(null)
    }
  }

  // 处理确认新密码输入
  const handleConfirmNewPasswordInput = (value: string): void => {
    setConfirmNewPassword(value)
    // 如果之前有错误，清除
    if (passwordError) {
      setPasswordError(null)
    }
  }

  // 处理当前密码输入
  const handleCurrentPasswordInput = (value: string): void => {
    setCurrentPassword(value)
    // 如果之前有错误，清除
    if (passwordError) {
      setPasswordError(null)
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

    // 验证主密码并执行同步
    await getVerifiedMasterPassword(async (password) => {
      try {
        setLoading(true)
        // 重置同步进度
        setSyncProgress(null)
        const values = (await formApi.validate()) as WebDAVConfig
        await saveConfig(values)

        // 添加主密码到配置
        const syncConfig = { ...values, masterPassword: password }

        const result = await window.api.webdav.syncLocalToRemote(syncConfig)
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
        // 重置同步进度
        setSyncProgress(null)
      }
    })
  }

  // 同步远程到本地
  const handleSyncFromRemote = async (): Promise<void> => {
    if (!formApi) return

    // 验证主密码并执行同步
    await getVerifiedMasterPassword(async (password) => {
      try {
        setLoading(true)
        // 重置同步进度
        setSyncProgress(null)
        const values = (await formApi.validate()) as WebDAVConfig
        await saveConfig(values)

        // 添加主密码到配置
        const syncConfig = { ...values, masterPassword: password }

        const result = await window.api.webdav.syncRemoteToLocal(syncConfig)
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
        // 重置同步进度
        setSyncProgress(null)
      }
    })
  }

  // 双向同步
  const handleSyncBidirectional = async (): Promise<void> => {
    if (!formApi) return

    // 验证主密码并执行同步
    await getVerifiedMasterPassword(async (password) => {
      try {
        setLoading(true)
        // 重置同步进度
        setSyncProgress(null)
        const values = (await formApi.validate()) as WebDAVConfig
        await saveConfig(values)

        // 添加主密码到配置
        const syncConfig = { ...values, masterPassword: password }

        const result = await window.api.webdav.syncBidirectional(syncConfig)
        if (result.success) {
          const message = `同步成功: 上传了 ${result.uploaded} 个文件，下载了 ${result.downloaded} 个文件${result.skippedUpload || result.skippedDownload ? `，跳过 ${result.skippedUpload + result.skippedDownload} 个未修改文件` : ''}`
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
              direction: 'bidirectional',
              cancelled: result.cancelled
            })
          }
        }
      } catch (error) {
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
        // 重置同步进度
        setSyncProgress(null)
      }
    })
  }

  // 处理设置变更
  const handleConfigChange = async (): Promise<void> => {
    // 配置变更后自动保存
    if (formApi) {
      try {
        const currentValues = formApi.getValues()
        // 检测enabled状态变化并立即更新本地状态
        if (currentValues.enabled !== enabledState) {
          setEnabledState(currentValues.enabled || false)
        }
        await saveConfig(currentValues)
      } catch (_error) {}
    }
  }

  // 清除同步缓存
  const handleClearSyncCache = async (): Promise<void> => {
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
  }

  // 保存配置
  const handleSaveConfig = async (): Promise<void> => {
    if (!formApi) return

    try {
      const values = await formApi.validate()
      await saveConfig(values)
      Toast.success('WebDAV配置已保存')
    } catch (formError) {
      Toast.error('请检查表单填写是否正确')
    }
  }

  // 获取Form组件的API引用
  const getFormApi = (api: FormApi<Partial<WebDAVConfig>>): void => {
    setFormApi(api)
  }

  // 处理自定义加密切换
  const handleEncryptionToggle = (value: boolean): void => {
    if (value && !customEncryptionEnabled) {
      // 启用自定义加密，显示密码设置对话框
      setShowSetPasswordModal(true)
    } else if (!value && customEncryptionEnabled) {
      // 禁用自定义加密，显示确认对话框
      setShowDisableEncryptionModal(true)
    }
  }

  // 处理关闭加密确认
  const handleDisableEncryptionConfirm = async (): Promise<void> => {
    if (!formApi) return

    try {
      // 获取当前配置
      const values = formApi.getValues()

      // 重置加密相关配置
      const updatedValues = {
        ...values,
        useCustomEncryption: false,
        encryptionTest: '',
        encryptionTestPlain: ''
      }

      // 更新表单值
      formApi.setValues(updatedValues)

      // 更新本地状态
      setCustomEncryptionEnabled(false)

      // 保存配置
      await saveConfig(updatedValues)

      // 关闭对话框
      setShowDisableEncryptionModal(false)

      Toast.success('已关闭自定义加密')
    } catch (error) {
      Toast.error('关闭加密失败')
    }
  }

  return (
    <div className="settings-scroll-container webdav-settings">
      {syncStatus && syncStatus.show && (
        <Banner
          type={syncStatus.type}
          description={syncStatus.message}
          closeIcon
          onClose={() => setSyncStatus(null)}
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* 显示当前同步进度 */}
      {syncProgress && loading && (
        <Banner
          type="info"
          description={
            <div style={{ marginTop: '8px' }}>
              <Progress
                percent={
                  syncProgress.total > 0
                    ? Math.floor((syncProgress.processed / syncProgress.total) * 100)
                    : 0
                }
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

      <Form<Partial<WebDAVConfig>>
        layout="vertical"
        getFormApi={getFormApi}
        onValueChange={handleConfigChange}
        initValues={{
          remotePath: '/markdown',
          enabled: false,
          syncOnStartup: false,
          syncDirection: 'bidirectional',
          useCustomEncryption: false
        }}
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
                disabled={!enabledState}
              />
              <Text style={{ marginLeft: '16px' }}>应用启动时自动同步文件</Text>
            </div>

            <Form.RadioGroup field="syncDirection" label="同步方向" disabled={!enabledState}>
              <Form.Radio value="localToRemote">本地 → 远程 (上传)</Form.Radio>
              <Form.Radio value="remoteToLocal">远程 → 本地 (下载)</Form.Radio>
              <Form.Radio value="bidirectional">双向同步</Form.Radio>
            </Form.RadioGroup>
          </div>
        </Card>

        {/* 添加加密设置卡片 */}
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
                onChange={handleEncryptionToggle}
              />
              <Text style={{ marginLeft: '16px' }}>使用自定义主密码加密同步数据</Text>
            </div>
            {customEncryptionEnabled && (
              <div style={{ marginTop: '8px', marginBottom: '16px' }}>
                <Button type="tertiary" icon={<IconLock />} onClick={handleOpenChangePassword}>
                  更改主密码
                </Button>
              </div>
            )}
            <Text type="tertiary">
              {customEncryptionEnabled
                ? '已启用自定义加密，同步时需要输入主密码。您可以随时关闭此功能。'
                : '启用此选项后，您需要设置一个主密码，用于加密同步数据。请务必记住此密码，忘记将无法恢复数据。您可以随时关闭此功能。'}
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
                  onClick={handleSyncToRemote}
                  theme="solid"
                  disabled={!enabledState}
                >
                  上传到云端
                </Button>

                <Button
                  icon={<IconDownload />}
                  loading={loading}
                  onClick={handleSyncFromRemote}
                  theme="solid"
                  disabled={!enabledState}
                >
                  从云端下载
                </Button>

                <Button
                  icon={<IconSync />}
                  loading={loading}
                  onClick={handleSyncBidirectional}
                  theme="solid"
                  type="primary"
                  disabled={!enabledState}
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
            清除同步缓存
          </Text>
          <div>
            <Button type="danger" onClick={handleClearSyncCache} disabled={!enabledState}>
              清除同步缓存
            </Button>
          </div>
        </Card>

        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Button type="secondary" onClick={handleSaveConfig}>
            保存配置
          </Button>
        </div>
      </Form>

      {/* 主密码验证对话框 */}
      <PasswordPrompt
        visible={showPasswordPrompt}
        title="输入主密码"
        explanation="请输入您的WebDAV同步主密码以继续操作"
        confirmText="确认"
        cancelText="取消"
        onCancel={() => {
          setShowPasswordPrompt(false)
          // 取消同步
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
          // 如果取消设置密码，重置开关状态
          if (formApi) {
            formApi.setValues({
              ...formApi.getValues(),
              useCustomEncryption: false
            })
          }
          setCustomEncryptionEnabled(false)
        }}
        footer={null}
        closeOnEsc={true}
        maskClosable={false}
      >
        <div style={{ padding: '0 0 20px' }}>
          <div className="password-setup-guide">
            <Text>
              请设置用于WebDAV同步的主密码。此密码将用于加密您的同步数据，非常重要，请务必记住。
            </Text>
            <div className="password-requirements">
              <Text strong>密码要求：</Text>
              <ul>
                <li>至少8个字符</li>
                <li>建议包含大小写字母、数字和特殊符号</li>
                <li>请勿使用与其他账户相同的密码</li>
              </ul>
              <Text type="warning">注意：如果忘记密码，将无法恢复已加密的数据！</Text>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <Form>
              <Input
                placeholder="请输入主密码"
                value={masterPassword}
                autoComplete="new-password"
                type="password"
                onChange={(value) => handlePasswordInput(value)}
                style={{ width: '100%' }}
              />
              <div className="password-strength-indicator" style={{ marginTop: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '3px' }}>
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
              <div style={{ marginTop: '16px' }}>
                <Text>确认主密码</Text>
                <Input
                  placeholder="请再次输入主密码"
                  value={confirmMasterPassword}
                  autoComplete="new-password"
                  type="password"
                  onChange={(value) => handleConfirmPasswordInput(value)}
                  style={{ width: '100%', marginTop: '5px' }}
                />
              </div>
              {passwordError && (
                <div style={{ color: 'var(--semi-color-danger)', marginTop: 8 }}>
                  <Text type="danger">{passwordError}</Text>
                </div>
              )}
            </Form>
          </div>

          <div className="form-actions">
            <Space>
              <Button onClick={() => setShowSetPasswordModal(false)}>取消</Button>
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
            </Space>
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
          <div className="password-setup-guide">
            <Text>请输入当前主密码并设置新的主密码。</Text>
            <Text type="warning">
              请注意：更改密码后，所有使用旧密码加密的数据将无法解密，请确保没有重要数据正在同步中。
            </Text>
          </div>

          <div style={{ marginTop: 16 }}>
            <Form>
              <div style={{ marginBottom: '16px' }}>
                <Text>当前主密码</Text>
                <Input
                  placeholder="请输入当前主密码"
                  value={currentPassword}
                  type="password"
                  autoComplete="current-password"
                  onChange={(value) => handleCurrentPasswordInput(value)}
                  style={{ width: '100%', marginTop: '5px' }}
                />
              </div>

              <div>
                <Text>新主密码</Text>
                <Input
                  placeholder="请输入新主密码"
                  value={newPassword}
                  type="password"
                  autoComplete="new-password"
                  onChange={(value) => handleNewPasswordInput(value)}
                  style={{ width: '100%', marginTop: '5px' }}
                />
                <div className="password-strength-indicator" style={{ marginTop: '5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: '3px' }}>
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
              </div>

              <div style={{ marginTop: '16px' }}>
                <Text>确认新主密码</Text>
                <Input
                  placeholder="请再次输入新主密码"
                  value={confirmNewPassword}
                  type="password"
                  autoComplete="new-password"
                  onChange={(value) => handleConfirmNewPasswordInput(value)}
                  style={{ width: '100%', marginTop: '5px' }}
                />
              </div>

              {passwordError && (
                <div style={{ color: 'var(--semi-color-danger)', marginTop: 8 }}>
                  {passwordError}
                </div>
              )}
            </Form>
          </div>

          <div className="form-actions" style={{ marginTop: '24px' }}>
            <Space>
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
            </Space>
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
          <div style={{ marginBottom: '20px' }}>
            <Text
              type="warning"
              strong
              style={{ fontSize: '16px', display: 'block', marginBottom: '12px' }}
            >
              ⚠️ 重要提醒
            </Text>
            <div
              style={{
                backgroundColor: '#fff7e6',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #ffd666'
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
          </div>

          <div style={{ marginBottom: '20px' }}>
            <Text>确认关闭自定义加密功能吗？</Text>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button onClick={() => setShowDisableEncryptionModal(false)}>取消</Button>
            <Button type="danger" onClick={handleDisableEncryptionConfirm}>
              确认关闭
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default WebDAVSettings
