import React from 'react'
import { Modal, Button, Typography } from '@douyinfe/semi-ui'

export interface ConfirmDialogProps {
  visible: boolean
  title: string
  content: string
  onConfirm: () => void
  onCancel: () => void
  type?: 'warning' | 'danger' | 'info' | 'success'
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  content,
  onConfirm,
  onCancel,
  type = 'warning'
}) => {
  // 根据类型设置按钮颜色
  const getButtonType = (): 'primary' | 'secondary' | 'tertiary' | 'warning' | 'danger' => {
    switch (type) {
      case 'danger':
        return 'danger'
      case 'warning':
        return 'warning'
      case 'success':
        return 'primary'
      default:
        return 'primary'
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
          <Button type={getButtonType()} onClick={onConfirm}>
            确定
          </Button>
        </>
      }
      closeOnEsc
      style={{ width: '400px' }}
    >
      <Typography.Text>{content}</Typography.Text>
    </Modal>
  )
}

export default ConfirmDialog
