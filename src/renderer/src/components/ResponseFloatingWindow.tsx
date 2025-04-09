import React, { useRef, useState, useEffect } from 'react'
import { Button, Spin, Typography } from '@douyinfe/semi-ui'
import { IconClose, IconCopy } from '@douyinfe/semi-icons'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import './ResponseFloatingWindow.css'

interface ResponseFloatingWindowProps {
  visible: boolean
  title: string
  content?: string
  loading?: boolean
  position?: { x: number; y: number }
  onClose: () => void
  isStreaming?: boolean
  onReturn?: () => void
}

const ResponseFloatingWindow: React.FC<ResponseFloatingWindowProps> = ({
  visible,
  title,
  content = '',
  loading = false,
  position,
  onClose,
  isStreaming = false,
  onReturn
}) => {
  const responseRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [responsePosition, setResponsePosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [selectedText, setSelectedText] = useState<string>('')

  // 初始位置设置
  useEffect(() => {
    if (position) {
      setResponsePosition(position)
    }
  }, [position])

  // 拖拽开始
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>): void => {
    e.preventDefault()
    setIsDragging(true)
    if (headerRef.current) {
      const rect = headerRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }

  // 拖拽过程
  const handleDrag = (e: MouseEvent): void => {
    if (isDragging) {
      setResponsePosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      })
    }
  }

  // 拖拽结束
  const handleDragEnd = (): void => {
    setIsDragging(false)
  }

  // 处理复制功能
  const handleCopy = (): void => {
    if (selectedText) {
      // 如果有选中文本，复制选中的内容
      navigator.clipboard
        .writeText(selectedText)
        .then(() => {
          console.log('已复制选中内容')
        })
        .catch((err) => {
          console.error('复制失败:', err)
        })
    } else if (content) {
      // 如果没有选中文本，则复制整个内容
      navigator.clipboard
        .writeText(content)
        .then(() => {
          console.log('已复制全部内容')
        })
        .catch((err) => {
          console.error('复制失败:', err)
        })
    }
  }

  // 监听文本选择事件
  useEffect(() => {
    const handleSelection = (): void => {
      const selection = window.getSelection()
      setSelectedText(selection ? selection.toString() : '')
    }

    // 添加监听器
    document.addEventListener('mouseup', handleSelection)
    document.addEventListener('keyup', handleSelection)

    return (): void => {
      // 移除监听器
      document.removeEventListener('mouseup', handleSelection)
      document.removeEventListener('keyup', handleSelection)
    }
  }, [])

  // 添加和移除拖拽事件监听器
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag)
      document.addEventListener('mouseup', handleDragEnd)
    }

    return (): void => {
      document.removeEventListener('mousemove', handleDrag)
      document.removeEventListener('mouseup', handleDragEnd)
    }
  }, [isDragging])

  // 检查窗口边界
  useEffect(() => {
    if (visible && responseRef.current) {
      const editorElement = document.querySelector('#cherry-markdown') as HTMLElement
      if (editorElement) {
        const editorRect = editorElement.getBoundingClientRect()
        const responseRect = responseRef.current.getBoundingClientRect()

        // 检查当前位置是否超出编辑器
        let newX = responsePosition.x
        let newY = responsePosition.y

        // 检查右边界
        if (newX + responseRect.width > editorRect.right) {
          newX = editorRect.right - responseRect.width
        }

        // 检查下边界
        if (newY + responseRect.height > editorRect.bottom) {
          newY = editorRect.bottom - responseRect.height
        }

        // 检查左边界
        if (newX < editorRect.left) {
          newX = editorRect.left
        }

        // 检查上边界
        if (newY < editorRect.top) {
          newY = editorRect.top
        }

        // 只有当位置发生变化时才更新
        if (newX !== responsePosition.x || newY !== responsePosition.y) {
          setResponsePosition({ x: newX, y: newY })
        }
      }
    }
  }, [visible, responsePosition])

  // 返回主菜单
  const handleReturn = (): void => {
    if (onReturn) {
      onReturn()
    }
  }

  if (!visible) return null

  return (
    <div
      ref={responseRef}
      className={`response-floating-window ${isDragging ? 'dragging' : ''}`}
      style={{
        position: 'fixed',
        left: `${responsePosition.x}px`,
        top: `${responsePosition.y}px`,
        zIndex: 1000
      }}
    >
      <div ref={headerRef} className="response-header" onMouseDown={handleDragStart}>
        <Typography.Text strong>{title}</Typography.Text>
        <div className="response-header-buttons">
          {onReturn && (
            <Button type="tertiary" size="small" onClick={handleReturn} title="返回">
              返回
            </Button>
          )}
          <Button
            type="tertiary"
            icon={<IconCopy />}
            size="small"
            onClick={handleCopy}
            title="复制内容"
          />
          <Button type="tertiary" icon={<IconClose />} size="small" onClick={onClose} />
        </div>
      </div>

      <div className="response-content">
        {loading ? (
          <div className="response-loading">
            <Spin />
            <div>处理中...</div>
          </div>
        ) : (
          <>
            <div ref={contentRef} className={`response-markdown${isStreaming ? ' streaming' : ''}`}>
              <ReactMarkdown
                rehypePlugins={[rehypeRaw, rehypeHighlight]}
                remarkPlugins={[remarkGfm]}
              >
                {content}
              </ReactMarkdown>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ResponseFloatingWindow
