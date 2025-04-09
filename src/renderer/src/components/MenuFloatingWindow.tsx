import React, { useRef, useState, useEffect } from 'react'
import { IconRefresh, IconDoubleChevronRight, IconLanguage, IconSearch } from '@douyinfe/semi-icons'
import './MenuFloatingWindow.css'

interface MenuFloatingWindowProps {
  visible: boolean
  position?: { x: number; y: number }
  onMenuItemClick: (action: 'rewrite' | 'continue' | 'translate' | 'analyze') => void
}

const MenuFloatingWindow: React.FC<MenuFloatingWindowProps> = ({
  visible,
  position,
  onMenuItemClick
}) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)

  // 初始位置设置
  useEffect(() => {
    if (position) {
      setMenuPosition(position)
    }
  }, [position])

  // 拖拽开始
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>): void => {
    e.preventDefault()
    setIsDragging(true)
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }

  // 拖拽过程
  const handleDrag = (e: MouseEvent): void => {
    if (isDragging) {
      setMenuPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      })
    }
  }

  // 拖拽结束
  const handleDragEnd = (): void => {
    setIsDragging(false)
  }

  // 添加和移除拖拽事件监听器
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag)
      document.addEventListener('mouseup', handleDragEnd)
    }

    return () => {
      document.removeEventListener('mousemove', handleDrag)
      document.removeEventListener('mouseup', handleDragEnd)
    }
  }, [isDragging])

  // 显示工具提示
  const showTooltip = (tooltipId: string): void => {
    setActiveTooltip(tooltipId)
  }

  // 隐藏工具提示
  const hideTooltip = (): void => {
    setActiveTooltip(null)
  }

  if (!visible) return null

  return (
    <div
      ref={menuRef}
      className={`menu-floating-window ${isDragging ? 'dragging' : ''}`}
      style={{
        position: 'fixed',
        left: `${menuPosition.x}px`,
        top: `${menuPosition.y}px`,
        zIndex: 1000
      }}
      onMouseDown={handleDragStart}
    >
      <div className="menu-items">
        <div
          className="menu-item"
          onClick={() => onMenuItemClick('rewrite')}
          onMouseEnter={() => showTooltip('rewrite')}
          onMouseLeave={hideTooltip}
        >
          <IconRefresh />
          {activeTooltip === 'rewrite' && <div className="tooltip">风格改写</div>}
        </div>

        <div
          className="menu-item"
          onClick={() => onMenuItemClick('continue')}
          onMouseEnter={() => showTooltip('continue')}
          onMouseLeave={hideTooltip}
        >
          <IconDoubleChevronRight />
          {activeTooltip === 'continue' && <div className="tooltip">内容续写</div>}
        </div>

        <div
          className="menu-item"
          onClick={() => onMenuItemClick('translate')}
          onMouseEnter={() => showTooltip('translate')}
          onMouseLeave={hideTooltip}
        >
          <IconLanguage />
          {activeTooltip === 'translate' && <div className="tooltip">翻译功能</div>}
        </div>

        <div
          className="menu-item"
          onClick={() => onMenuItemClick('analyze')}
          onMouseEnter={() => showTooltip('analyze')}
          onMouseLeave={hideTooltip}
        >
          <IconSearch />
          {activeTooltip === 'analyze' && <div className="tooltip">内容分析</div>}
        </div>
      </div>
    </div>
  )
}

export default MenuFloatingWindow
