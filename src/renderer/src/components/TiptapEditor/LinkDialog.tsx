import React, { useState, useEffect, useRef } from 'react'
import { FiLink, FiX, FiCheck } from 'react-icons/fi'

interface LinkDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (url: string, text?: string) => void
  onRemove?: () => void
  initialUrl?: string
  initialText?: string
  hasLink?: boolean
}

const LinkDialog: React.FC<LinkDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onRemove,
  initialUrl = '',
  initialText = '',
  hasLink = false
}) => {
  const [url, setUrl] = useState(initialUrl)
  const [text, setText] = useState(initialText)
  const [isValidUrl, setIsValidUrl] = useState(true)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl)
      setText(initialText)
      setIsValidUrl(true)
      // 聚焦到URL输入框
      setTimeout(() => {
        urlInputRef.current?.focus()
        urlInputRef.current?.select()
      }, 100)
    }
  }, [isOpen, initialUrl, initialText])

  // 验证URL格式
  const validateUrl = (urlString: string): boolean => {
    if (!urlString.trim()) return false
    
    try {
      // 如果不包含协议，自动添加https://
      const urlToTest = urlString.includes('://') ? urlString : `https://${urlString}`
      new URL(urlToTest)
      return true
    } catch {
      // 检查是否是邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (emailRegex.test(urlString)) {
        return true
      }
      return false
    }
  }

  const handleUrlChange = (value: string) => {
    setUrl(value)
    setIsValidUrl(validateUrl(value))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!url.trim()) {
      urlInputRef.current?.focus()
      return
    }

    if (!isValidUrl) {
      return
    }

    // 处理URL格式
    let formattedUrl = url.trim()
    
    // 如果是邮箱，添加mailto:
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (emailRegex.test(formattedUrl)) {
      formattedUrl = `mailto:${formattedUrl}`
    } 
    // 如果不包含协议，添加https://
    else if (!formattedUrl.includes('://')) {
      formattedUrl = `https://${formattedUrl}`
    }

    onConfirm(formattedUrl, text.trim() || undefined)
    onClose()
  }

  const handleRemove = () => {
    onRemove?.()
    onClose()
  }

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'Enter' && event.ctrlKey) {
        event.preventDefault()
        handleSubmit(event as any)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
    
    return undefined
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div 
      className="link-dialog-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000
      }}
    >
      <div
        ref={dialogRef}
        className="link-dialog"
        style={{
          backgroundColor: 'var(--semi-color-bg-2)',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          border: '1px solid var(--semi-color-border)',
          padding: '24px',
          minWidth: '400px',
          maxWidth: '500px',
          position: 'relative'
        }}
      >
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px'
          }}
        >
          <FiLink size={20} style={{ color: 'var(--semi-color-primary)' }} />
          <h3 style={{ 
            margin: 0, 
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--semi-color-text-0)'
          }}>
            {hasLink ? '编辑链接' : '插入链接'}
          </h3>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              color: 'var(--semi-color-text-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--semi-color-fill-0)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <FiX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label 
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--semi-color-text-0)'
              }}
            >
              URL地址 *
            </label>
            <input
              ref={urlInputRef}
              type="text"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://example.com 或 user@example.com"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${isValidUrl ? 'var(--semi-color-border)' : 'var(--semi-color-danger)'}`,
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: 'var(--semi-color-bg-1)',
                color: 'var(--semi-color-text-0)',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--semi-color-primary)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = isValidUrl ? 'var(--semi-color-border)' : 'var(--semi-color-danger)'
              }}
            />
            {!isValidUrl && url.trim() && (
              <div style={{
                marginTop: '4px',
                fontSize: '12px',
                color: 'var(--semi-color-danger)'
              }}>
                请输入有效的URL或邮箱地址
              </div>
            )}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label 
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--semi-color-text-0)'
              }}
            >
              显示文本 (可选)
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="链接显示的文本"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--semi-color-border)',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: 'var(--semi-color-bg-1)',
                color: 'var(--semi-color-text-0)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--semi-color-primary)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--semi-color-border)'
              }}
            />
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            {hasLink && onRemove && (
              <button
                type="button"
                onClick={handleRemove}
                style={{
                  padding: '8px 16px',
                  border: '1px solid var(--semi-color-danger)',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  color: 'var(--semi-color-danger)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--semi-color-danger)'
                  e.currentTarget.style.color = 'white'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = 'var(--semi-color-danger)'
                }}
              >
                <FiX size={14} />
                移除链接
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                border: '1px solid var(--semi-color-border)',
                borderRadius: '6px',
                backgroundColor: 'transparent',
                color: 'var(--semi-color-text-1)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--semi-color-fill-0)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!url.trim() || !isValidUrl}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: url.trim() && isValidUrl ? 'var(--semi-color-primary)' : 'var(--semi-color-disabled-bg)',
                color: 'white',
                cursor: url.trim() && isValidUrl ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color 0.2s'
              }}
            >
              <FiCheck size={14} />
              {hasLink ? '更新' : '插入'}
            </button>
          </div>
        </form>

        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: 'var(--semi-color-fill-0)',
          borderRadius: '6px',
          fontSize: '12px',
          color: 'var(--semi-color-text-2)'
        }}>
          <div style={{ marginBottom: '4px' }}>
            <strong>提示：</strong>
          </div>
          <div>• 支持 HTTP/HTTPS 链接和邮箱地址</div>
          <div>• 使用 Ctrl+Enter 快速插入</div>
          <div>• 如果不填写显示文本，将使用选中的文本或URL作为显示内容</div>
        </div>
      </div>
    </div>
  )
}

export default LinkDialog