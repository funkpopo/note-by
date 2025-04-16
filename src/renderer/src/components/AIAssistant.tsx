import React, { useState, useEffect } from 'react'
import MenuFloatingWindow from './MenuFloatingWindow'
import ResponseFloatingWindow from './ResponseFloatingWindow'
import './AIAssistant.css'

// 定义 AI 助手的行为类型
type AIAction = 'rewrite' | 'continue' | 'translate' | 'analyze' | null

interface AIAssistantProps {
  visible: boolean
  title: string
  content?: string
  loading: boolean
  position?: { x: number; y: number }
  action: AIAction
  isAiResponse?: boolean
  streamingContent?: boolean
  onClose: () => void
  onMenuItemClick: (action: Exclude<AIAction, null>) => void
  onReturn?: () => void
  onApply: (content: string) => void
}

const AIAssistant: React.FC<AIAssistantProps> = ({
  visible,
  title,
  content,
  loading,
  position,
  action,
  isAiResponse = false,
  streamingContent = false,
  onClose,
  onMenuItemClick,
  onReturn,
  onApply
}) => {
  // 菜单位置和响应窗口位置
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [responsePosition, setResponsePosition] = useState({ x: 0, y: 0 })

  // 初始化位置
  useEffect(() => {
    if (position) {
      // 菜单窗口位置
      setMenuPosition({
        x: position.x,
        y: position.y
      })

      // 响应窗口位置在菜单窗口右侧
      setResponsePosition({
        x: position.x + 200, // 估计菜单窗口宽度并留出一定间距
        y: position.y
      })
    }
  }, [position])

  // 当窗口尺寸变化时调整位置
  useEffect(() => {
    const handleResize = (): void => {
      // 保持当前相对位置
      if (position) {
        setMenuPosition({
          x: position.x,
          y: position.y
        })

        setResponsePosition({
          x: position.x + 200,
          y: position.y
        })
      }
    }

    window.addEventListener('resize', handleResize)
    return (): void => {
      window.removeEventListener('resize', handleResize)
    }
  }, [position])

  // 添加ESC键监听，实现按ESC关闭窗口
  useEffect(() => {
    // 只有当浮动窗口可见时才添加监听
    if (visible) {
      const handleKeyDown = (event: KeyboardEvent): void => {
        // 检查是否按下ESC键
        if (event.key === 'Escape' || event.keyCode === 27) {
          onClose()
        }
      }

      // 添加键盘事件监听
      window.addEventListener('keydown', handleKeyDown)

      // 组件卸载时移除监听
      return (): void => {
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
    return undefined
  }, [visible, onClose])

  // 显示处理逻辑
  const showMenu = visible && action === null
  const showResponse = visible && (action !== null || isAiResponse)

  return (
    <>
      {/* 菜单浮动窗口 */}
      <MenuFloatingWindow
        visible={showMenu}
        position={menuPosition}
        onMenuItemClick={onMenuItemClick}
      />

      {/* 回复浮动窗口 */}
      <ResponseFloatingWindow
        visible={showResponse}
        title={title}
        content={content}
        loading={loading}
        position={responsePosition}
        onClose={onClose}
        isStreaming={streamingContent}
        onReturn={onReturn}
        onApply={onApply}
      />
    </>
  )
}

export default AIAssistant
