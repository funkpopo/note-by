import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Card, Button, Spin, Typography, Toast } from '@douyinfe/semi-ui'
import { IconClose, IconCopy } from '@douyinfe/semi-icons'
import './FloatingToolbox.css'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

// 添加选中相关的CSS样式
const selectableContentStyle = `
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
  streamingContent?: boolean // 添加流式内容标志
  onStreamingComplete?: () => void // 流式内容完成回调
}

type ResizeDirection = 'right' | 'bottom' | 'bottom-right' | null

// 添加新的类型定义
interface StartPosition {
  x: number
  y: number
  editorRect?: DOMRect | null
}

const FloatingToolbox: React.FC<FloatingToolboxProps> = ({
  visible,
  title,
  content,
  loading = false,
  position,
  onClose,
  children,
  aiContent = '',
  isAiResponse = false,
  streamingContent = false,
  onStreamingComplete
}) => {
  const toolboxRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const markdownContainerRef = useRef<HTMLDivElement>(null)
  const contentContainerRef = useRef<HTMLDivElement>(null)
  const [toolboxPosition, setToolboxPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [isPrinting, setIsPrinting] = useState(false)
  const [displayedContent, setDisplayedContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false) // 添加流式状态
  const [forceUpdateKey, setForceUpdateKey] = useState(0) // 用于强制更新
  const streamingContentRef = useRef('') // 用于存储流式内容
  const streamTimerRef = useRef<NodeJS.Timeout | null>(null) // 存储定时器引用

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
  // 更新startPosition类型
  const [startPosition, setStartPosition] = useState<StartPosition>({ x: 0, y: 0 })
  const [hasSetInitialPosition, setHasSetInitialPosition] = useState(false)
  const [selectedText, setSelectedText] = useState<string>('')

  // 自动计算宽度（根据内容状态）- 用useCallback包装
  const getCardWidth = useCallback((): number => {
    // 当没有内容且没有子元素时，使用较小的宽度
    if (!content && !children && !loading && !isAiResponse && title === 'AI助手') {
      return 160
    }
    // 当有内容或加载中或自定义调整过大小时使用自定义大小
    return toolboxSize.width
  }, [content, children, loading, isAiResponse, title, toolboxSize.width])

  // 添加判断窗口是否可调整大小的计算函数
  const isResizable = useCallback((): boolean => {
    // 只有以下情况才能调整窗口大小：
    // 1. 窗口显示AI回复内容 (isAiResponse为true)
    // 2. 窗口显示翻译或分析等处理后的内容 (title不是'AI助手')
    return isAiResponse || title !== 'AI助手'
  }, [title, isAiResponse])

  // 设置可选文本的样式
  useEffect((): (() => void) => {
    // 确保允许文本选择的样式已添加
    if (!document.getElementById('markdown-selectable-style')) {
      const styleEl = document.createElement('style')
      styleEl.id = 'markdown-selectable-style'
      styleEl.innerHTML = selectableContentStyle
      document.head.appendChild(styleEl)
    }

    return (): void => {
      const styleEl = document.getElementById('markdown-selectable-style')
      if (styleEl) {
        styleEl.remove()
      }
    }
  }, [])

  // 实现每秒重新渲染 Markdown
  useEffect(() => {
    if (visible && isAiResponse && isStreaming) {
      // 设置定时器，每秒强制更新 ReactMarkdown
      streamTimerRef.current = setInterval(() => {
        setForceUpdateKey((prev) => prev + 1)
      }, 1000)

      return (): void => {
        if (streamTimerRef.current) {
          clearInterval(streamTimerRef.current)
          streamTimerRef.current = null
        }
      }
    }
    return (): void => {} // 添加空函数作为默认返回值
  }, [visible, isAiResponse, isStreaming])

  const updateStreamingContent = useCallback(
    (newContent: string, isComplete: boolean): void => {
      if (
        newContent &&
        streamingContentRef.current &&
        !newContent.includes(streamingContentRef.current)
      ) {
        const updatedContent = streamingContentRef.current + newContent
        streamingContentRef.current = updatedContent
        setDisplayedContent(updatedContent)
      } else {
        streamingContentRef.current = newContent
        setDisplayedContent(newContent)
      }

      if (isComplete) {
        setIsStreaming(false)
        if (streamTimerRef.current) {
          clearInterval(streamTimerRef.current)
          streamTimerRef.current = null
        }
        if (onStreamingComplete) {
          onStreamingComplete()
        }
      }
    },
    [onStreamingComplete]
  )

  // 处理流式内容启动
  useEffect(() => {
    if (visible && isAiResponse && streamingContent) {
      // 如果启用了流式内容但尚未开始流式处理
      if (!isStreaming) {
        setIsStreaming(true)
        streamingContentRef.current = content || ''
        setDisplayedContent(content || '')
      }
    }
    if (visible && isAiResponse && streamingContent && isStreaming && content) {
      updateStreamingContent(content, false)
      setForceUpdateKey((prev) => prev + 1)
    }
  }, [visible, isAiResponse, streamingContent, content, isStreaming, updateStreamingContent])

  useEffect((): void => {
    if (visible && isAiResponse && !streamingContent) {
      if (aiContent && !isPrinting) {
        setIsPrinting(true)
        setCurrentWordIndex(0)

        const printContent = (): void => {
          if (currentWordIndex <= aiContent.length) {
            const currentText = aiContent.substring(0, currentWordIndex)
            setDisplayedContent(currentText)
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
      // 如果没有aiContent但有content，直接显示content
      else if (content && !aiContent && !isPrinting) {
        setDisplayedContent(content)
      }
    }
  }, [visible, isAiResponse, aiContent, content, currentWordIndex, isPrinting, streamingContent])

  // 当content变化时更新内容（非AI响应情况）
  useEffect(() => {
    if (content && !isAiResponse) {
      setDisplayedContent(content)
    }
  }, [content, isAiResponse])

  // 修改 useEffect 使窗口位置仅在首次显示时初始化，并确保不超出编辑器边界
  useEffect(() => {
    if (visible && position && !hasSetInitialPosition) {
      // 获取编辑器边界
      const editorElement = document.querySelector('#cherry-markdown') as HTMLElement
      if (editorElement && toolboxRef.current) {
        const editorRect = editorElement.getBoundingClientRect()
        const toolboxRect = toolboxRef.current.getBoundingClientRect()

        // 计算窗口位置，确保不超出编辑器边界
        const newX = Math.max(
          editorRect.left,
          Math.min(position.x, editorRect.right - toolboxRect.width)
        )
        const newY = Math.max(
          editorRect.top,
          Math.min(position.y, editorRect.bottom - toolboxRect.height)
        )

        setToolboxPosition({ x: newX, y: newY })
      } else {
        // 如果找不到编辑器，直接使用提供的位置
        setToolboxPosition(position)
      }
      setHasSetInitialPosition(true)
    } else if (!visible) {
      // 重置标记，使窗口下次显示时可以设置新位置
      setHasSetInitialPosition(false)
    }
  }, [visible, position, hasSetInitialPosition])

  // 添加窗口大小变化时检查边界的effect
  useEffect(() => {
    if (visible && toolboxRef.current) {
      const editorElement = document.querySelector('#cherry-markdown') as HTMLElement
      if (editorElement) {
        const editorRect = editorElement.getBoundingClientRect()
        const toolboxRect = toolboxRef.current.getBoundingClientRect()

        // 检查当前位置是否超出编辑器
        let newX = toolboxPosition.x
        let newY = toolboxPosition.y

        // 检查右边界
        if (newX + toolboxRect.width > editorRect.right) {
          newX = editorRect.right - toolboxRect.width
        }

        // 检查下边界
        if (newY + toolboxRect.height > editorRect.bottom) {
          newY = editorRect.bottom - toolboxRect.height
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
        if (newX !== toolboxPosition.x || newY !== toolboxPosition.y) {
          setToolboxPosition({ x: newX, y: newY })
        }
      }
    }
  }, [visible, toolboxSize, toolboxPosition])

  // 当标题变为AI助手且isAiResponse为false时，重置窗口大小
  useEffect(() => {
    if (title === 'AI助手' && !isAiResponse) {
      // 重置窗口尺寸为默认值
      setToolboxSize({
        width: 160,
        height: 'auto'
      })
    }
  }, [title, isAiResponse])

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

  // 添加一个专门监听isAiResponse变化的useEffect，处理窗口尺寸优化
  useEffect(() => {
    if (visible) {
      if (isAiResponse) {
        // 当切换到AI响应时，设置合适的尺寸
        const contentLength = content?.length || 0

        // 基础尺寸
        const baseWidth = Math.max(320, toolboxSize.width)
        const baseHeight = 250

        // 预估内容中的代码块和表格
        const hasCodeBlock = content?.includes('```') || false
        const hasTable = content?.includes('|') || false

        // 计算适合的宽度
        let newWidth = baseWidth
        if (hasCodeBlock) newWidth = Math.max(newWidth, 400) // 代码块需要更宽
        if (hasTable) newWidth = Math.max(newWidth, 450) // 表格需要更宽

        // 根据内容长度动态调整高度
        let newHeight = baseHeight
        if (contentLength > 500) newHeight += 100
        if (contentLength > 1000) newHeight += 100

        // 计算新的尺寸
        const calculatedWidth = Math.min(newWidth, 550)
        const calculatedHeight = Math.min(newHeight, 500)

        // 仅当尺寸发生实际变化时才更新状态
        if (
          calculatedWidth !== toolboxSize.width ||
          (toolboxSize.height !== 'auto' && calculatedHeight !== toolboxSize.height)
        ) {
          // 设置新尺寸，同时确保不会太大
          setToolboxSize({
            width: calculatedWidth,
            height: calculatedHeight
          })
        }
      } else {
        // 当切换回普通菜单时，仅当菜单比较小时恢复默认尺寸
        if (title === 'AI助手' && toolboxSize.width > 180) {
          setToolboxSize({
            width: 160,
            height: 'auto'
          })
        }
      }
    }
    // 从依赖数组中移除toolboxSize，防止无限循环
  }, [isAiResponse, visible, content, title])

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

  // 增强handleDrag函数中的边界检查
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

        // 限制在编辑器内，确保考虑了窗口的实际大小
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

  // 修改调整大小的处理函数，限制在编辑器区域内
  const handleResize = useCallback(
    (e: MouseEvent): void => {
      if (!isResizing || !toolboxRef.current || !isResizable()) return

      // 使用 requestAnimationFrame 优化性能
      requestAnimationFrame(() => {
        let newWidth = toolboxSize.width
        let newHeight = toolboxSize.height === 'auto' ? startSize.height : toolboxSize.height

        // 获取编辑器边界 - 仅在调整开始时计算一次边界，避免不必要的DOM访问
        const editorRect = startPosition.editorRect

        if (resizeDirection === 'right' || resizeDirection === 'bottom-right') {
          // 计算新宽度
          newWidth = Math.max(160, startSize.width + (e.clientX - startPosition.x))

          // 确保不超出编辑器右边界
          if (editorRect) {
            const rightLimit = editorRect.right - toolboxPosition.x
            newWidth = Math.min(newWidth, rightLimit)
          } else {
            // 如果找不到编辑器，则使用窗口宽度
            newWidth = Math.min(newWidth, window.innerWidth - toolboxPosition.x - 10)
          }
        }

        if (resizeDirection === 'bottom' || resizeDirection === 'bottom-right') {
          // 计算新高度
          newHeight = Math.max(100, startSize.height + (e.clientY - startPosition.y))

          // 确保不超出编辑器底部边界
          if (editorRect) {
            const bottomLimit = editorRect.bottom - toolboxPosition.y
            newHeight = Math.min(newHeight, bottomLimit)
          } else {
            // 如果找不到编辑器，则使用窗口高度
            newHeight = Math.min(newHeight, window.innerHeight - toolboxPosition.y - 10)
          }
        }

        setToolboxSize({
          width: newWidth,
          height: newHeight
        })
      })
    },
    [
      isResizing,
      resizeDirection,
      startPosition,
      startSize,
      toolboxSize,
      toolboxPosition,
      isResizable
    ]
  )

  // 修改调整大小开始函数，根据可调整状态决定是否响应
  const handleResizeStart = (
    e: React.MouseEvent<HTMLDivElement>,
    direction: ResizeDirection
  ): void => {
    if (!toolboxRef.current || !isResizable()) return

    const rect = toolboxRef.current.getBoundingClientRect()
    setStartSize({
      width: rect.width,
      height: rect.height
    })

    // 预先计算并缓存编辑器边界，避免调整过程中重复计算
    const editorElement = document.querySelector('#cherry-markdown') as HTMLElement
    const editorRect = editorElement ? editorElement.getBoundingClientRect() : null

    setStartPosition({
      x: e.clientX,
      y: e.clientY,
      editorRect // 在开始位置中保存编辑器矩形信息
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

  // 修改调整大小结束函数，确保位置不重置
  const handleResizeEnd = (): void => {
    if (!toolboxRef.current) return

    setIsResizing(false)
    setResizeDirection(null)

    // 恢复光标样式
    document.body.style.cursor = ''

    // 不重置窗口位置
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', handleResizeEnd)
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
  }, [isDragging, isResizing, handleDrag, handleResize])

  // 处理复制功能
  const handleCopy = (): void => {
    if (selectedText) {
      // 如果有选中文本，复制选中的内容
      navigator.clipboard
        .writeText(selectedText)
        .then(() => {
          Toast.success('已复制选中内容')
        })
        .catch((err) => {
          console.error('复制失败:', err)
          Toast.error('复制失败')
        })
    } else if (content) {
      // 如果没有选中文本，则复制整个内容
      navigator.clipboard
        .writeText(content)
        .then(() => {
          Toast.success('已复制全部内容')
        })
        .catch((err) => {
          console.error('复制失败:', err)
          Toast.error('复制失败')
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

  // 组件卸载时清除定时器
  useEffect(() => {
    return (): void => {
      if (streamTimerRef.current) {
        clearInterval(streamTimerRef.current)
        streamTimerRef.current = null
      }
    }
  }, [])

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
            <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
              {/* 添加复制按钮 */}
              {(isAiResponse || content) && (
                <Button
                  type="tertiary"
                  icon={<IconCopy />}
                  size="small"
                  onClick={handleCopy}
                  title="复制内容"
                />
              )}
              <Button type="tertiary" icon={<IconClose />} size="small" onClick={onClose} />
            </div>
          </div>
        }
        bodyStyle={{
          padding: title === 'AI助手' ? '6px' : '12px',
          height: toolboxSize.height !== 'auto' ? 'calc(100% - 40px)' : 'auto',
          overflow: 'auto',
          overflowX: 'hidden',
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
              <div ref={contentContainerRef} className="floating-toolbox-content">
                <ReactMarkdown
                  rehypePlugins={[rehypeRaw, rehypeHighlight]}
                  remarkPlugins={[remarkGfm]}
                >
                  {displayedContent}
                </ReactMarkdown>
              </div>
            )}
            {isAiResponse && (
              <div
                ref={markdownContainerRef}
                className="floating-toolbox-ai-content"
                style={{
                  width: '100%',
                  minHeight: '100px',
                  height: toolboxSize.height !== 'auto' ? 'calc(100% - 30px)' : 'auto',
                  maxHeight: toolboxSize.height !== 'auto' ? 'calc(100% - 30px)' : '400px',
                  overflow: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  overflowX: 'hidden',
                  overflowWrap: 'break-word',
                  wordWrap: 'break-word'
                }}
              >
                <ReactMarkdown
                  key={forceUpdateKey} // 添加key，强制每秒重新渲染
                  rehypePlugins={[rehypeRaw, rehypeHighlight]}
                  remarkPlugins={[remarkGfm]}
                >
                  {displayedContent}
                </ReactMarkdown>
              </div>
            )}
            {children}
          </div>
        )}
      </Card>

      {/* 调整大小的触发区域 - 仅在可调整大小时显示 */}
      {isResizable() && (
        <>
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
        </>
      )}
    </div>
  )
}

export default FloatingToolbox
