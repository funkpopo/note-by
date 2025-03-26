import React, { useState, useEffect } from 'react'
import { Modal, Button, Form } from '@douyinfe/semi-ui'

interface RenameDialogProps {
  visible: boolean
  title: string
  initialValue: string
  onConfirm: (newName: string) => void
  onCancel: () => void
  validateMessage?: string
  type?: 'folder' | 'file'
}

const RenameDialog: React.FC<RenameDialogProps> = ({
  visible,
  title,
  initialValue,
  onConfirm,
  onCancel,
  validateMessage = '名称不能为空',
  type = 'file'
}) => {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  // 当对话框显示时，重置为空值，不显示原始名称
  useEffect(() => {
    if (visible) {
      setValue('') // 设置为空字符串，而不是初始值
    }
  }, [visible])

  // 清除错误信息
  useEffect(() => {
    if (!visible) {
      setError('')
    }
  }, [visible])

  // 处理提交
  const handleSubmit = (): void => {
    if (!value.trim()) {
      setError(validateMessage)
      return
    }

    onConfirm(value.trim())
  }

  // 处理输入变化
  const handleChange = (val: string): void => {
    setValue(val)
    if (val.trim()) {
      setError('')
    }
  }

  // 处理按键事件，按Enter提交
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  // 自定义占位符，显示原始名称
  const customPlaceholder = `请输入新名称 (原名: ${initialValue})`

  return (
    <Modal
      title={title}
      visible={visible}
      onCancel={onCancel}
      footer={
        <>
          <Button type="tertiary" onClick={onCancel}>
            取消
          </Button>
          <Button type="primary" onClick={handleSubmit}>
            确定
          </Button>
        </>
      }
      closeOnEsc
      style={{ width: '400px' }}
      afterClose={() => {
        // 对话框关闭后重置状态
        setValue('')
        setError('')
      }}
    >
      <Form>
        <Form.Input
          field="name"
          label={type === 'folder' ? '文件夹名称' : '笔记名称'}
          placeholder={customPlaceholder}
          initValue=""
          onChange={(val) => handleChange(val as string)}
          onKeyDown={handleKeyDown}
          autoFocus
          validateStatus={error ? 'error' : undefined}
          showClear
          style={{ width: '100%' }}
        />
        {error && <div style={{ color: 'var(--semi-color-danger)' }}>{error}</div>}
      </Form>
    </Modal>
  )
}

export default RenameDialog
