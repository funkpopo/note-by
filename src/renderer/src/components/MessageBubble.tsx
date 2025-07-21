import React from 'react'
import { Button, Dropdown, Toast } from '@douyinfe/semi-ui'
import { IconMore, IconRefresh, IconDelete, IconCopy } from '@douyinfe/semi-icons'
import MessageRenderer from './MessageRenderer'

interface MessageBubbleProps {
  message: {
    id: string | number
    role: 'user' | 'assistant' | 'system'
    content: string
    createAt: number
    status?: 'loading' | 'streaming' | 'incomplete' | 'complete' | 'error'
  }
  onRetry?: (message: any) => void
  onDelete?: (message: any) => void
  onCopy?: (content: string) => void
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onRetry, onDelete, onCopy }) => {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  const handleCopy = () => {
    if (onCopy) {
      onCopy(message.content)
    } else {
      navigator.clipboard.writeText(message.content)
      Toast.success('已复制到剪贴板')
    }
  }

  const handleRetry = () => {
    if (onRetry) {
      onRetry(message)
    }
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete(message)
    }
  }

  const dropdownItems = [
    {
      key: 'copy',
      label: '复制',
      icon: <IconCopy />,
      onClick: handleCopy
    },
    ...(isAssistant ? [{
      key: 'retry',
      label: '重新生成',
      icon: <IconRefresh />,
      onClick: handleRetry
    }] : []),
    {
      key: 'delete',
      label: '删除',
      icon: <IconDelete />,
      onClick: handleDelete,
      type: 'danger' as const
    }
  ]

  const getStatusText = () => {
    switch (message.status) {
      case 'loading':
        return '正在思考...'
      case 'streaming':
        return '正在回复...'
      case 'incomplete':
        return '回复被中断'
      case 'error':
        return '回复出错'
      default:
        return ''
    }
  }

  const getStatusColor = () => {
    switch (message.status) {
      case 'loading':
      case 'streaming':
        return 'var(--semi-color-primary)'
      case 'incomplete':
        return 'var(--semi-color-warning)'
      case 'error':
        return 'var(--semi-color-danger)'
      default:
        return 'var(--semi-color-text-2)'
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        marginBottom: '16px',
        alignItems: 'flex-start',
        gap: '8px'
      }}
    >
      {/* 头像 */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: isUser ? 'var(--semi-color-primary)' : 'var(--semi-color-success)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold',
          flexShrink: 0
        }}
      >
        {isUser ? 'U' : 'AI'}
      </div>

      {/* 消息内容 */}
      <div
        style={{
          maxWidth: 'calc(100% - 80px)',
          position: 'relative'
        }}
      >
        {/* 消息气泡 */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            backgroundColor: isUser 
              ? 'var(--semi-color-primary)' 
              : 'var(--semi-color-bg-2)',
            color: isUser ? 'white' : 'var(--semi-color-text-0)',
            border: isUser ? 'none' : '1px solid var(--semi-color-border)',
            position: 'relative',
            wordBreak: 'break-word'
          }}
        >
          {/* 消息内容 */}
          {isUser ? (
            <div style={{ lineHeight: '1.5' }}>
              {message.content}
            </div>
          ) : (
            <MessageRenderer
              content={message.content || getStatusText()}
              style={{
                color: 'inherit',
                lineHeight: '1.6'
              }}
            />
          )}

          {/* 状态指示器 */}
          {message.status && ['loading', 'streaming', 'incomplete', 'error'].includes(message.status) && (
            <div
              style={{
                marginTop: '8px',
                fontSize: '12px',
                color: getStatusColor(),
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {(message.status === 'loading' || message.status === 'streaming') && (
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    border: '2px solid var(--semi-color-primary)',
                    borderTopColor: 'transparent',
                    animation: 'spin 1s linear infinite'
                  }}
                />
              )}
              {getStatusText()}
            </div>
          )}
        </div>

        {/* 时间戳和操作按钮 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isUser ? 'flex-end' : 'flex-start',
            marginTop: '4px',
            gap: '8px'
          }}
        >
          <span
            style={{
              fontSize: '12px',
              color: 'var(--semi-color-text-2)'
            }}
          >
            {new Date(message.createAt).toLocaleTimeString()}
          </span>

          {/* 操作菜单 */}
          <Dropdown
            trigger="click"
            menu={dropdownItems}
            position="bottomLeft"
          >
            <Button
              icon={<IconMore />}
              type="tertiary"
              size="small"
              theme="borderless"
              style={{
                opacity: 0.6,
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.6'
              }}
            />
          </Dropdown>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default MessageBubble