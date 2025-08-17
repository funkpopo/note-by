import React, { useState, useRef, useEffect } from 'react'
import { Modal, Form, Button, Typography, Toast } from '@douyinfe/semi-ui'
import { FormApi } from '@douyinfe/semi-ui/lib/es/form'

const { Text } = Typography

interface PasswordPromptProps {
  visible: boolean
  title?: string
  explanation?: string
  confirmText?: string
  cancelText?: string
  onCancel: () => void
  onConfirm: (password: string) => Promise<boolean>
}

const PasswordPrompt: React.FC<PasswordPromptProps> = ({
  visible,
  title = '输入主密码',
  explanation = '请输入您的主密码以继续操作',
  confirmText = '确认',
  cancelText = '取消',
  onCancel,
  onConfirm
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [formApi, setFormApi] = useState<FormApi<{ password: string }> | null>(null)

  useEffect(() => {
    // 当对话框打开时，聚焦到密码输入框
    if (visible && inputRef.current) {
      // 使用setTimeout确保Modal已完全渲染
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }

    // 当对话框打开时，重置状态
    if (visible) {
      setError(null)
      if (formApi) {
        formApi.setValues({ password: '' })
      }
    }
  }, [visible, formApi])

  const handlePasswordChange = (formApi: FormApi<{ password: string }>): void => {
    setFormApi(formApi)
  }

  const handleConfirm = async (): Promise<void> => {
    if (!formApi) return

    const values = formApi.getValues()
    const pwd = values.password || ''

    if (!pwd.trim()) {
      setError('请输入密码')
      return
    }

    setLoading(true)
    try {
      // 调用传入的确认函数，返回验证结果
      const success = await onConfirm(pwd)
      if (!success) {
        setError('密码不正确，请重试')
        // 清空密码框
        formApi.setValues({ password: '' })
        // 重新聚焦到密码输入框
        inputRef.current?.focus()
      }
    } catch (_err) {
      Toast.error('验证密码时发生错误')
      setError('验证密码时发生错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 处理按回车键确认
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !loading) {
      handleConfirm()
    }
  }

  return (
    <Modal
      title={title}
      visible={visible}
      onCancel={onCancel}
      closeOnEsc={false}
      footer={null}
      maskClosable={false}
      width={400}
    >
      <div style={{ padding: '0 0 20px' }}>
        <Text>{explanation}</Text>

        <div style={{ marginTop: 16 }}>
          <Form getFormApi={handlePasswordChange} onKeyDown={handleKeyDown}>
            <Form.Input
              field="password"
              label="密码"
              type="password"
              placeholder="请输入主密码"
              validateStatus={error ? 'error' : undefined}
              showClear
            />
            {error && (
              <div style={{ color: 'var(--semi-color-danger)', marginTop: 8 }}>
                <Text type="danger">{error}</Text>
              </div>
            )}
          </Form>
        </div>

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="tertiary" onClick={onCancel} style={{ marginRight: 8 }}>
            {cancelText}
          </Button>
          <Button
            type="primary"
            theme="solid"
            loading={loading}
            onClick={handleConfirm}
            disabled={!formApi?.getValues().password?.trim()}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default PasswordPrompt
