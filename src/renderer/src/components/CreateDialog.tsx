import React, { useState, useEffect } from 'react'
import { Modal, Button, Form, Select } from '@douyinfe/semi-ui'

interface CreateDialogProps {
  visible: boolean
  title: string
  type: 'folder' | 'note'
  folders: string[]
  onConfirm: (name: string, folder?: string) => void
  onCancel: () => void
  placeholder?: string
  validateMessage?: string
}

const CreateDialog: React.FC<CreateDialogProps> = ({
  visible,
  title,
  type,
  folders,
  onConfirm,
  onCancel,
  placeholder = '请输入名称',
  validateMessage = '名称不能为空'
}) => {
  const [value, setValue] = useState('')
  const [selectedFolder, setSelectedFolder] = useState('')
  const [error, setError] = useState('')

  // 当对话框显示时，设置默认值
  useEffect(() => {
    if (visible) {
      // 每次显示对话框时重置输入值为空
      setValue('')
      setError('')

      // 如果有文件夹，默认选择第一个
      if (type === 'note' && folders.length > 0) {
        setSelectedFolder(folders[0])
      }
    }
  }, [visible, type, folders])

  // 重置表单状态
  const resetForm = (): void => {
    setValue('')
    setError('')
    if (folders.length > 0) {
      setSelectedFolder(folders[0])
    } else {
      setSelectedFolder('')
    }
  }

  // 处理提交
  const handleSubmit = (): void => {
    if (!value.trim()) {
      setError(validateMessage)
      return
    }

    if (type === 'folder') {
      onConfirm(value.trim())
    } else {
      // 创建笔记需要选择文件夹
      if (!selectedFolder && folders.length > 0) {
        setError('请选择一个文件夹')
        return
      }
      onConfirm(value.trim(), selectedFolder)
    }
  }

  // 处理输入变化
  const handleChange = (val: string): void => {
    setValue(val)
    if (val.trim()) {
      setError('')
    }
  }

  // 处理文件夹选择变化
  const handleFolderChange = (val: string | number | any[] | Record<string, any>): void => {
    setSelectedFolder(val as string)
  }

  // 处理按键事件，按Enter提交
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

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
      afterClose={resetForm} // 对话框关闭后重置表单状态
    >
      <Form>
        {/* 如果是创建笔记，先选择文件夹 */}
        {type === 'note' && (
          <Form.Select
            field="folder"
            label="选择文件夹"
            placeholder="请选择文件夹"
            initValue={folders.length > 0 ? folders[0] : undefined}
            onChange={handleFolderChange}
            style={{ width: '100%', marginBottom: '16px' }}
          >
            {folders.map((folder) => (
              <Select.Option key={folder} value={folder}>
                {folder}
              </Select.Option>
            ))}
          </Form.Select>
        )}

        <Form.Input
          field="name"
          label={type === 'folder' ? '文件夹名称' : '笔记名称'}
          placeholder={placeholder}
          initValue="" // 强制初始值为空字符串，不使用state中的value
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

export default CreateDialog
