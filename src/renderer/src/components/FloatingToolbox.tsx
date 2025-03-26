import React, { useEffect, useRef, useState } from 'react'
import { Card, Button, Spin, Typography } from '@douyinfe/semi-ui'
import { IconClose } from '@douyinfe/semi-icons'
import './FloatingToolbox.css'
import Cherry from 'cherry-markdown'
import 'cherry-markdown/dist/cherry-markdown.css'

interface FloatingToolboxProps {
  visible: boolean
  title: string
  content?: string
  loading?: boolean
  position?: { x: number; y: number }
  onClose: () => void
  children?: React.ReactNode
  aiContent?: string
  isAiResponse?: boolean
}

type ResizeDirection = 'right' | 'bottom' | 'bottom-right' | null

const FloatingToolbox: React.FC<FloatingToolboxProps> = ({
  visible,
  title,
  content,
  loading = false,
  position,
  onClose,
  children,
  aiContent = '',
  isAiResponse = false
}) => {
  const toolboxRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const cherryContainerRef = useRef<HTMLDivElement>(null)
  const [toolboxPosition, setToolboxPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [cherryInstance, setCherryInstance] = useState<Cherry | null>(null)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [isPrinting, setIsPrinting] = useState(false)

  // 调整大小相关状态
  const [isResizing, setIsResizing] = useState(false)
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection>(null)
  const [toolboxSize, setToolboxSize] = useState<{ width: number; height: number | 'auto' }>({
    width: 280, // 增加默认宽度以适应Markdown内容
    height: 'auto'
  })
  const [startSize, setStartSize] = useState<{ width: number; height: number }>({
    width: 280,
    height: 0
  })
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 })

  // 自动计算宽度（根据内容状态）
  const getCardWidth = (): number => {
    // 当没有内容且没有子元素时，使用较小的宽度
    if (!content && !children && !loading && !isAiResponse && title === 'AI助手') {
      return 160
    }
    // 当有内容或加载中或自定义调整过大小时使用自定义大小
    return toolboxSize.width
  }

  // 初始化Cherry Markdown实例
  useEffect((): (() => void) => {
    if (visible && isAiResponse && cherryContainerRef.current && !cherryInstance) {
      try {
        const instance = new Cherry({
          id: 'cherry-ai-response',
          value: '',
          editor: {
            defaultModel: 'previewOnly',
            height: '100%'
          },
          toolbars: {
            toolbar: false,
            sidebar: false,
            bubble: false,
            float: false
          },
          engine: {
            global: {
              flowSessionContext: true // 开启流式适配
            }
          }
        })

        setCherryInstance(instance)
      } catch (err) {
        console.error('初始化Cherry Markdown失败:', err)
      }
    }

    return (): void => {
      if (cherryInstance) {
        cherryInstance.destroy()
        setCherryInstance(null)
      }
    }
  }, [visible, isAiResponse])

  // 处理AI内容流式展示
  useEffect((): void => {
    if (visible && isAiResponse && cherryInstance && aiContent && !isPrinting) {
      setIsPrinting(true)
      setCurrentWordIndex(0)

      const printContent = (): void => {
        if (currentWordIndex <= aiContent.length) {
          const currentText = aiContent.substring(0, currentWordIndex)
          cherryInstance.setMarkdown(currentText)
          setCurrentWordIndex((prev) => prev + 1)

          if (currentWordIndex < aiContent.length) {
            setTimeout(printContent, 30)
          } else {
            setIsPrinting(false)
          }
        }
      }

      printContent()
    }
  }, [visible, isAiResponse, cherryInstance, aiContent, currentWordIndex, isPrinting])

  // 计算并更新浮动窗口位置，确保在视口内
  useEffect(() => {
    if (!visible || !position || !toolboxRef.current) return

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const toolboxWidth = getCardWidth()
    const toolboxHeight = toolboxRef.current.offsetHeight

    // 初始位置：鼠标点击位置
    let x = position.x
    let y = position.y

    // 确保窗口不超出视口右侧
    if (x + toolboxWidth > viewportWidth - 10) {
      // 如果右侧放不下，尝试放在左侧
      x = Math.max(10, position.x - toolboxWidth)
    }

    // 确保窗口不超出视口底部
    if (y + toolboxHeight > viewportHeight - 10) {
      // 如果底部放不下，调整y坐标，确保窗口完全在视口内
      y = Math.max(10, viewportHeight - toolboxHeight - 10)
    }

    setToolboxPosition({ x, y })
  }, [visible, position, toolboxRef])

  // 添加ESC键事件处理，关闭浮动窗口
  useEffect(() => {
    // 只在浮动窗口可见时添加事件监听
    if (!visible) return

    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        e.preventDefault()
        onClose()
      }
    }

    // 使用捕获阶段，确保比其他事件处理器更早捕获到ESC键
    document.addEventListener('keydown', handleEscape, true)

    // 清理函数
    return (): void => {
      document.removeEventListener('keydown', handleEscape, true)
    }
  }, [visible, onClose])

  // 处理拖动开始
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (!toolboxRef.current || !headerRef.current) return

    // 只有点击标题栏才能拖动
    if (!headerRef.current.contains(e.target as Node)) return

    // 计算鼠标相对于toolbox的偏移
    const rect = toolboxRef.current.getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top

    setIsDragging(true)
    setDragOffset({ x: offsetX, y: offsetY })

    // 添加鼠标样式
    document.body.style.cursor = 'move'

    // 防止文本选择
    e.preventDefault()
  }

  // 处理拖动过程
  const handleDrag = (e: MouseEvent): void => {
    if (!isDragging || !toolboxRef.current) return

    // 计算新位置
    let newX = e.clientX - dragOffset.x
    let newY = e.clientY - dragOffset.y

    // 获取编辑器边界
    const editorElement = document.querySelector('#cherry-markdown') as HTMLElement
    if (editorElement) {
      const editorRect = editorElement.getBoundingClientRect()
      const toolboxRect = toolboxRef.current.getBoundingClientRect()

      // 限制在编辑器内
      newX = Math.max(editorRect.left, Math.min(newX, editorRect.right - toolboxRect.width))
      newY = Math.max(editorRect.top, Math.min(newY, editorRect.bottom - toolboxRect.height))
    } else {
      // 如果找不到编辑器，则限制在窗口内
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const toolboxWidth = toolboxRef.current.offsetWidth
      const toolboxHeight = toolboxRef.current.offsetHeight

      newX = Math.max(0, Math.min(newX, viewportWidth - toolboxWidth))
      newY = Math.max(0, Math.min(newY, viewportHeight - toolboxHeight))
    }

    // 更新位置
    setToolboxPosition({ x: newX, y: newY })
  }

  // 处理拖动结束
  const handleDragEnd = (): void => {
    setIsDragging(false)
    document.body.style.cursor = ''
  }

  // 调整大小开始
  const handleResizeStart = (
    e: React.MouseEvent<HTMLDivElement>,
    direction: ResizeDirection
  ): void => {
    if (!toolboxRef.current) return

    const rect = toolboxRef.current.getBoundingClientRect()
    setStartSize({
      width: rect.width,
      height: rect.height
    })
    setStartPosition({
      x: e.clientX,
      y: e.clientY
    })

    setIsResizing(true)
    setResizeDirection(direction)

    // 设置相应的鼠标样式
    switch (direction) {
      case 'right':
        document.body.style.cursor = 'ew-resize'
        break
      case 'bottom':
        document.body.style.cursor = 'ns-resize'
        break
      case 'bottom-right':
        document.body.style.cursor = 'nwse-resize'
        break
    }

    e.preventDefault()
    e.stopPropagation()
  }

  // 调整大小过程
  const handleResize = (e: MouseEvent): void => {
    if (!isResizing || !resizeDirection) return

    const deltaX = e.clientX - startPosition.x
    const deltaY = e.clientY - startPosition.y

    let newWidth = startSize.width
    let newHeight = startSize.height

    // 根据调整方向更新尺寸
    if (resizeDirection === 'right' || resizeDirection === 'bottom-right') {
      newWidth = Math.max(160, startSize.width + deltaX) // 最小宽度160px
    }

    if (resizeDirection === 'bottom' || resizeDirection === 'bottom-right') {
      newHeight = Math.max(100, startSize.height + deltaY) // 最小高度100px
    }

    // 限制在合理范围内
    newWidth = Math.min(newWidth, 500) // 最大宽度500px
    newHeight = Math.min(newHeight, 600) // 最大高度600px

    // 更新尺寸
    setToolboxSize({
      width: newWidth,
      height: resizeDirection.includes('bottom') ? newHeight : 'auto'
    })
  }

  // 调整大小结束
  const handleResizeEnd = (): void => {
    setIsResizing(false)
    setResizeDirection(null)
    document.body.style.cursor = ''
  }

  // 添加和移除拖动/调整大小事件监听器
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag)
      document.addEventListener('mouseup', handleDragEnd)
    } else if (isResizing) {
      document.addEventListener('mousemove', handleResize)
      document.addEventListener('mouseup', handleResizeEnd)
    } else {
      document.removeEventListener('mousemove', handleDrag)
      document.removeEventListener('mouseup', handleDragEnd)
      document.removeEventListener('mousemove', handleResize)
      document.removeEventListener('mouseup', handleResizeEnd)
    }

    return (): void => {
      document.removeEventListener('mousemove', handleDrag)
      document.removeEventListener('mouseup', handleDragEnd)
      document.removeEventListener('mousemove', handleResize)
      document.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [isDragging, isResizing])

  if (!visible) return null

  return (
    <div
      ref={toolboxRef}
      className={`floating-toolbox ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''}`}
      style={{
        position: 'fixed',
        left: `${toolboxPosition.x}px`,
        top: `${toolboxPosition.y}px`,
        zIndex: 1000,
        ...(toolboxSize.height !== 'auto' && { height: toolboxSize.height })
      }}
    >
      <Card
        shadows="hover"
        style={{
          width: getCardWidth(),
          height: toolboxSize.height !== 'auto' ? `${toolboxSize.height}px` : 'auto'
        }}
        headerLine={false}
        header={
          title !== 'AI助手' ? (
            <div ref={headerRef} className="floating-toolbox-header" onMouseDown={handleDragStart}>
              <Typography.Text strong>{title}</Typography.Text>
              <Button
                type="tertiary"
                icon={<IconClose />}
                size="small"
                onClick={onClose}
                style={{ marginLeft: 'auto' }}
              />
            </div>
          ) : (
            <div ref={headerRef} className="floating-toolbox-header" onMouseDown={handleDragStart}>
              <Typography.Text strong>AI助手</Typography.Text>
              <Button
                type="tertiary"
                icon={<IconClose />}
                size="small"
                onClick={onClose}
                style={{ marginLeft: 'auto' }}
              />
            </div>
          )
        }
        bodyStyle={{
          padding: title === 'AI助手' ? '6px' : '12px',
          height: toolboxSize.height !== 'auto' ? 'calc(100% - 40px)' : 'auto',
          overflow: 'auto'
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Spin />
            <div style={{ marginTop: 8 }}>处理中...</div>
          </div>
        ) : (
          <>
            {content && title !== 'AI助手' && !isAiResponse && (
              <div className="floating-toolbox-content">
                <Typography.Paragraph>{content}</Typography.Paragraph>
              </div>
            )}
            {isAiResponse && (
              <div
                ref={cherryContainerRef}
                className="floating-toolbox-ai-content"
                style={{ width: '100%', minHeight: '100px' }}
              />
            )}
            {children}
          </>
        )}
      </Card>

      {/* 调整大小的触发区域 */}
      <div
        className="resize-handle resize-right"
        onMouseDown={(e) => handleResizeStart(e, 'right')}
      />
      <div
        className="resize-handle resize-bottom"
        onMouseDown={(e) => handleResizeStart(e, 'bottom')}
      />
      <div
        className="resize-handle resize-bottom-right"
        onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
      />
    </div>
  )
}

export default FloatingToolbox
