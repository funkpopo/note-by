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
  // 更新startPosition类型
  const [startPosition, setStartPosition] = useState<StartPosition>({ x: 0, y: 0 })
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

  // 添加判断窗口是否可调整大小的计算函数
  const isResizable = useCallback((): boolean => {
    // 只有以下情况才能调整窗口大小：
    // 1. 窗口显示AI回复内容 (isAiResponse为true)
    // 2. 窗口显示翻译或分析等处理后的内容 (title不是'AI助手')
    return isAiResponse || title !== 'AI助手'
  }, [title, isAiResponse])

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
        // 清除之前可能的内容
        if (cherryContainerRef.current.innerHTML) {
          cherryContainerRef.current.innerHTML = ''
        }

        // 创建一个div元素作为Cherry的挂载点
        const mountDiv = document.createElement('div')
        mountDiv.id = 'cherry-ai-response'
        cherryContainerRef.current.appendChild(mountDiv)

        const instance = new Cherry({
          id: 'cherry-ai-response',
          value: content || '',
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
          },
          callback: {
            afterInit: (): void => {
              // 强制使用预览模式
              instance.switchModel('previewOnly')

              // 处理横向滚动问题
              const contentElement = document.querySelector(
                '#cherry-ai-response .cherry-markdown-content'
              )
              if (contentElement instanceof HTMLElement) {
                contentElement.style.overflow = 'hidden'
                contentElement.style.wordWrap = 'break-word'
                contentElement.style.overflowWrap = 'break-word'
                contentElement.style.whiteSpace = 'pre-wrap'
              }
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
        // 清除之前可能的内容
        if (contentContainerRef.current.innerHTML) {
          contentContainerRef.current.innerHTML = ''
        }

        // 创建一个div元素作为Cherry的挂载点
        const mountDiv = document.createElement('div')
        mountDiv.id = 'cherry-content'
        contentContainerRef.current.appendChild(mountDiv)

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

  // 添加MutationObserver监听DOM变化，专门确保文本可选择
  useEffect(() => {
    if (!visible) return

    // 创建MutationObserver实例监听DOM变化
    const selectObserver = new MutationObserver(() => {
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
      selectObserver.observe(toolboxRef.current, {
        childList: true,
        subtree: true,
        attributes: false
      })
    }

    return (): void => {
      selectObserver.disconnect()
    }
  }, [visible])

  // 修改处理横向滚动问题的代码，增强内容处理
  const handleContentRender = (content: HTMLElement): void => {
    if (!content) return;
    
    // 设置主容器样式
    content.style.overflow = 'hidden';
    content.style.overflowX = 'hidden';
    content.style.wordWrap = 'break-word';
    content.style.overflowWrap = 'break-word';
    content.style.wordBreak = 'break-word';
    content.style.maxWidth = '100%';
    content.style.width = '100%';
    content.style.boxSizing = 'border-box';
    
    // 处理所有可能导致溢出的元素
    const elementsToHandle = content.querySelectorAll(
      'pre, code, table, img, iframe, svg, div, p, ul, ol, blockquote'
    );
    
    elementsToHandle.forEach((el) => {
      if (el instanceof HTMLElement) {
        el.style.maxWidth = '100%';
        el.style.boxSizing = 'border-box';
        
        // 针对不同元素类型应用特定样式
        if (el.tagName === 'PRE' || el.tagName === 'CODE') {
          el.style.whiteSpace = 'pre-wrap';
          el.style.wordBreak = 'break-word';
          el.style.paddingRight = '20px';
        } else if (el.tagName === 'TABLE') {
          el.style.tableLayout = 'fixed';
          el.style.width = 'fit-content';
          el.style.maxWidth = '100%';
          el.style.display = 'block';
          
          // 处理表格内的单元格
          el.querySelectorAll('td, th').forEach((cell) => {
            if (cell instanceof HTMLElement) {
              cell.style.wordBreak = 'break-word';
              cell.style.maxWidth = '200px';
              cell.style.overflow = 'hidden';
              cell.style.textOverflow = 'ellipsis';
            }
          });
        } else if (el.tagName === 'IMG') {
          el.style.maxWidth = '100%';
          el.style.height = 'auto';
        } else if (el.tagName === 'BLOCKQUOTE') {
          el.style.paddingRight = '10px';
          el.style.margin = '8px 0';
        }
      }
    });
  };

  // 当content变化时更新内容
  useEffect(() => {
    if (contentCherryInstance && content && !isAiResponse) {
      contentCherryInstance.setMarkdown(content)
    }

    if (cherryInstance && content && isAiResponse && !aiContent) {
      cherryInstance.setMarkdown(content)

      // 在每次内容更新后应用样式以隐藏横向滚动条
      setTimeout(() => {
        const contentElement = document.querySelector(
          '#cherry-ai-response .cherry-markdown-content'
        )
        if (contentElement instanceof HTMLElement) {
          handleContentRender(contentElement)
        }
      }, 0)
    }
  }, [content, contentCherryInstance, cherryInstance, isAiResponse, aiContent])

  // 添加MutationObserver监听DOM变化，专门处理横向滚动问题
  useEffect(() => {
    if (!visible || !isAiResponse) return

    // 创建MutationObserver实例监听DOM变化
    const scrollObserver = new MutationObserver(() => {
      // 每当DOM变化时，确保所有内容元素都不会产生横向滚动
      const contentElement = document.querySelector('#cherry-ai-response .cherry-markdown-content')
      if (contentElement instanceof HTMLElement) {
        handleContentRender(contentElement)
      }
    })

    // 观察markdown内容区域
    const targetNode = document.querySelector('#cherry-ai-response')
    if (targetNode) {
      scrollObserver.observe(targetNode, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      })
    }

    return (): void => {
      scrollObserver.disconnect()
    }
  }, [visible, isAiResponse])

  // 处理AI内容流式展示
  useEffect((): void => {
    if (visible && isAiResponse && cherryInstance) {
      // 如果有aiContent，进行流式打印
      if (aiContent && !isPrinting) {
        setIsPrinting(true)
        setCurrentWordIndex(0)

        const printContent = (): void => {
          if (currentWordIndex <= aiContent.length) {
            const currentText = aiContent.substring(0, currentWordIndex)
            cherryInstance.setMarkdown(currentText)
            setCurrentWordIndex((prev) => prev + 1)

            // 即使在流式输出过程中也确保不显示横向滚动条
            const contentElement = document.querySelector(
              '#cherry-ai-response .cherry-markdown-content'
            )
            if (contentElement instanceof HTMLElement) {
              contentElement.style.overflow = 'hidden'
              contentElement.style.wordWrap = 'break-word'
              contentElement.style.overflowWrap = 'break-word'
              contentElement.style.whiteSpace = 'pre-wrap'
            }

            if (currentWordIndex < aiContent.length) {
              setTimeout(printContent, 30)
            } else {
              setIsPrinting(false)

              // 流式输出完成后，确保所有元素都应用了样式
              setTimeout(() => {
                const contentElement = document.querySelector(
                  '#cherry-ai-response .cherry-markdown-content'
                )
                if (contentElement instanceof HTMLElement) {
                  // 应用主容器样式
                  contentElement.style.overflow = 'hidden'
                  contentElement.style.wordWrap = 'break-word'
                  contentElement.style.overflowWrap = 'break-word'
                  contentElement.style.whiteSpace = 'pre-wrap'

                  // 处理所有代码块和表格
                  contentElement.querySelectorAll('pre, code').forEach((el) => {
                    if (el instanceof HTMLElement) {
                      el.style.whiteSpace = 'pre-wrap'
                      el.style.wordBreak = 'break-word'
                      el.style.overflowX = 'hidden'
                    }
                  })

                  contentElement.querySelectorAll('table').forEach((el) => {
                    if (el instanceof HTMLElement) {
                      el.style.maxWidth = '100%'
                      el.style.tableLayout = 'fixed'
                      el.style.wordBreak = 'break-word'
                    }
                  })
                }
              }, 50)
            }
          }
        }

        printContent()
      }
      // 如果没有aiContent但有content，直接显示content
      else if (content && !aiContent && !isPrinting) {
        cherryInstance.setMarkdown(content)
      }
    }
  }, [visible, isAiResponse, cherryInstance, aiContent, content, currentWordIndex, isPrinting])

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

  // 监听isAiResponse变化，确保Cherry实例正确更新
  useEffect(() => {
    // 当isAiResponse状态变化时，销毁旧的实例
    if (!isAiResponse && cherryInstance) {
      cherryInstance.destroy()
      setCherryInstance(null)
    }

    if (isAiResponse && !cherryInstance && visible && content && cherryContainerRef.current) {
      // 清除容器内容
      if (cherryContainerRef.current.innerHTML) {
        cherryContainerRef.current.innerHTML = ''
      }

      // 创建挂载点
      const mountDiv = document.createElement('div')
      mountDiv.id = 'cherry-ai-response'
      cherryContainerRef.current.appendChild(mountDiv)

      // 创建新实例
      try {
        const instance = new Cherry({
          id: 'cherry-ai-response',
          value: content || '',
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
              flowSessionContext: true
            }
          },
          callback: {
            afterInit: (): void => {
              // 强制使用预览模式
              instance.switchModel('previewOnly')

              // 处理横向滚动问题
              const contentElement = document.querySelector(
                '#cherry-ai-response .cherry-markdown-content'
              )
              if (contentElement instanceof HTMLElement) {
                contentElement.style.overflow = 'hidden'
                contentElement.style.wordWrap = 'break-word'
                contentElement.style.overflowWrap = 'break-word'
                contentElement.style.whiteSpace = 'pre-wrap'
              }
            }
          }
        })

        setCherryInstance(instance)
      } catch (err) {
        console.error('重新初始化Cherry Markdown失败:', err)
      }
    }
  }, [isAiResponse, visible, content, cherryInstance])

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
        if (calculatedWidth !== toolboxSize.width || 
            (toolboxSize.height !== 'auto' && calculatedHeight !== toolboxSize.height)) {
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
              />
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
