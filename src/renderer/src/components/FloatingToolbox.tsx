import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Card, Button, Spin, Typography } from '@douyinfe/semi-ui'
import { IconClose } from '@douyinfe/semi-icons'
import './FloatingToolbox.css'
import Cherry from 'cherry-markdown'
import 'cherry-markdown/dist/cherry-markdown.css'

// 添加选中相关的CSS样式
const selectableContentStyle = `
.cherry-markdown .cherry-markdown-content * {
  user-select: text !important;
  -webkit-user-select: text !important;
}
.floating-toolbox-content * {
  user-select: text !important;
  -webkit-user-select: text !important;
}
`

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
  const contentContainerRef = useRef<HTMLDivElement>(null)
  const [toolboxPosition, setToolboxPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [cherryInstance, setCherryInstance] = useState<Cherry | null>(null)
  const [contentCherryInstance, setContentCherryInstance] = useState<Cherry | null>(null)
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

  // 保持窗口位置的状态，防止位置重置
  const [hasSetInitialPosition, setHasSetInitialPosition] = useState(false)

  // 自动计算宽度（根据内容状态）- 用useCallback包装
  const getCardWidth = useCallback((): number => {
    // 当没有内容且没有子元素时，使用较小的宽度
    if (!content && !children && !loading && !isAiResponse && title === 'AI助手') {
      return 160
    }
    // 当有内容或加载中或自定义调整过大小时使用自定义大小
    return toolboxSize.width
  }, [content, children, loading, isAiResponse, title, toolboxSize.width])

  // 初始化Cherry Markdown实例
  useEffect((): (() => void) => {
    // 确保允许文本选择的样式已添加
    if (!document.getElementById('cherry-selectable-style')) {
      const styleEl = document.createElement('style')
      styleEl.id = 'cherry-selectable-style'
      styleEl.innerHTML = selectableContentStyle
      document.head.appendChild(styleEl)
    }

    // 为AI响应内容初始化Cherry实例
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

    // 为普通内容初始化Cherry实例
    if (
      visible &&
      content &&
      !isAiResponse &&
      contentContainerRef.current &&
      !contentCherryInstance
    ) {
      try {
        const instance = new Cherry({
          id: 'cherry-content',
          value: content,
          editor: {
            defaultModel: 'previewOnly',
            height: '100%'
          },
          toolbars: {
            toolbar: false,
            sidebar: false,
            bubble: false,
            float: false
          }
        })

        setContentCherryInstance(instance)
      } catch (err) {
        console.error('初始化内容Cherry Markdown失败:', err)
      }
    }

    return (): void => {
      if (cherryInstance) {
        cherryInstance.destroy()
        setCherryInstance(null)
      }
      if (contentCherryInstance) {
        contentCherryInstance.destroy()
        setContentCherryInstance(null)
      }
    }
  }, [visible, isAiResponse, content, cherryInstance, contentCherryInstance])

  // 添加选择事件处理和DOM修改
  useEffect(() => {
    // 处理AI内容的DOM，使其可选
    if (cherryContainerRef.current) {
      const contentElements = cherryContainerRef.current.querySelectorAll(
        '.cherry-markdown-content, .cherry-markdown-content *'
      )
      contentElements.forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.userSelect = 'text'
          el.style.webkitUserSelect = 'text'
          el.style.cursor = 'text'
        }
      })
    }

    // 处理普通内容的DOM，使其可选
    if (contentContainerRef.current) {
      const contentElements = contentContainerRef.current.querySelectorAll(
        '.cherry-markdown-content, .cherry-markdown-content *'
      )
      contentElements.forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.userSelect = 'text'
          el.style.webkitUserSelect = 'text'
          el.style.cursor = 'text'
        }
      })
    }
  }, [cherryInstance, contentCherryInstance, visible, aiContent, content])

  // 当content变化时更新内容
  useEffect(() => {
    if (contentCherryInstance && content) {
      contentCherryInstance.setMarkdown(content)
    }
  }, [content, contentCherryInstance])

  // 添加MutationObserver监听DOM变化
  useEffect(() => {
    if (!visible) return

    // 创建MutationObserver实例监听DOM变化
    const observer = new MutationObserver(() => {
      // 每当DOM变化时，确保Cherry Markdown内容可选
      document
        .querySelectorAll(
          '.cherry-markdown .cherry-markdown-content, .cherry-markdown .cherry-markdown-content *'
        )
        .forEach((el) => {
          if (el instanceof HTMLElement) {
            el.style.userSelect = 'text'
            el.style.webkitUserSelect = 'text'
            el.style.cursor = 'text'
          }
        })
    })

    // 观察整个浮动工具箱
    if (toolboxRef.current) {
      observer.observe(toolboxRef.current, {
        childList: true,
        subtree: true,
        attributes: false
      })
    }

    return (): void => {
      observer.disconnect()
    }
  }, [visible])

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

  // 修改 useEffect 使窗口位置仅在首次显示时初始化
  useEffect(() => {
    if (visible && position && !hasSetInitialPosition) {
      setToolboxPosition(position)
      setHasSetInitialPosition(true)
    } else if (!visible) {
      // 重置标记，使窗口下次显示时可以设置新位置
      setHasSetInitialPosition(false)
    }
  }, [visible, position, hasSetInitialPosition])

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

    // 如果用户正在选择文本，不启动拖动
    const selection = window.getSelection()
    if (selection && selection.toString().length > 0) {
      return
    }

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
  const handleDrag = useCallback(
    (e: MouseEvent): void => {
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
    },
    [isDragging, toolboxRef, dragOffset]
  )

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

  // 修改调整大小的处理函数，确保位置不重置
  const handleResizeEnd = (): void => {
    if (!toolboxRef.current) return

    setIsResizing(false)
    setResizeDirection(null)

    // 不重置窗口位置
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', handleResizeEnd)
  }

  // 调整大小时的处理函数
  const handleResize = useCallback(
    (e: MouseEvent): void => {
      if (!isResizing || !toolboxRef.current) return

      let newWidth = toolboxSize.width
      let newHeight = toolboxSize.height === 'auto' ? startSize.height : toolboxSize.height

      if (resizeDirection === 'right' || resizeDirection === 'bottom-right') {
        newWidth = Math.max(160, startSize.width + (e.clientX - startPosition.x))
      }

      if (resizeDirection === 'bottom' || resizeDirection === 'bottom-right') {
        newHeight = Math.max(100, startSize.height + (e.clientY - startPosition.y))
      }

      setToolboxSize({
        width: newWidth,
        height: newHeight
      })
    },
    [isResizing, resizeDirection, startPosition, startSize, toolboxSize]
  )

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
  }, [isDragging, isResizing, handleDrag, handleResize])

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
          height: toolboxSize.height !== 'auto' ? `${toolboxSize.height}px` : 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
        headerLine={false}
        header={
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
        }
        bodyStyle={{
          padding: title === 'AI助手' ? '6px' : '12px',
          height: toolboxSize.height !== 'auto' ? 'calc(100% - 40px)' : 'auto',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 auto'
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Spin />
            <div style={{ marginTop: 8 }}>处理中...</div>
          </div>
        ) : (
          <div
            className="floating-toolbox-content-wrapper"
            style={{ overflow: 'auto', flex: '1 1 auto' }}
          >
            {content && title !== 'AI助手' && !isAiResponse && (
              <div
                ref={contentContainerRef}
                className="floating-toolbox-content"
                id="cherry-content"
              />
            )}
            {isAiResponse && (
              <div
                ref={cherryContainerRef}
                className="floating-toolbox-ai-content"
                style={{ width: '100%', minHeight: '100px' }}
              />
            )}
            {children}
          </div>
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
