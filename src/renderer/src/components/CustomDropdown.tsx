import React, { useState, useRef, useEffect, ReactNode } from 'react'
import './CustomDropdown.css'

export interface DropdownMenuItem {
  node: 'item' | 'divider' | 'title'
  name?: string
  onClick?: () => void
  disabled?: boolean
  icon?: ReactNode
}

export interface CustomDropdownProps {
  children: ReactNode
  menu: DropdownMenuItem[]
  trigger?: 'click' | 'hover'
  position?: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight'
  disabled?: boolean
  className?: string
  dropdownStyle?: React.CSSProperties
  getPopupContainer?: () => HTMLElement
  // 新增：是否自动调整位置以防止溢出
  autoAdjustOverflow?: boolean
  // 新增：限制菜单在特定容器内
  constrainToContainer?: boolean
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  children,
  menu,
  trigger = 'click',
  position = 'bottomLeft',
  disabled = false,
  className = '',
  dropdownStyle = {},
  getPopupContainer,
  autoAdjustOverflow = true,
  constrainToContainer = true
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [adjustedPosition, setAdjustedPosition] = useState(position)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  // 获取可点击的菜单项
  const clickableItems = menu.filter((item) => item.node === 'item' && !item.disabled)

  // 处理触发器点击
  const handleTriggerClick = () => {
    if (disabled) return
    if (trigger === 'click') {
      setIsOpen(!isOpen)
      setFocusedIndex(-1)
    }
  }

  // 处理触发器悬停
  const handleTriggerHover = () => {
    if (disabled) return
    if (trigger === 'hover') {
      setIsOpen(true)
      setFocusedIndex(-1)
    }
  }

  const handleTriggerLeave = () => {
    if (trigger === 'hover') {
      // 延迟关闭以允许鼠标移动到菜单上
      setTimeout(() => {
        if (!menuRef.current?.matches(':hover') && !triggerRef.current?.matches(':hover')) {
          setIsOpen(false)
        }
      }, 100)
    }
  }

  // 处理菜单项点击
  const handleMenuItemClick = (item: DropdownMenuItem) => {
    if (item.disabled) return
    item.onClick?.()
    setIsOpen(false)
    setFocusedIndex(-1)
  }

  // 处理键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'Escape':
        setIsOpen(false)
        setFocusedIndex(-1)
        break
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex((prev) => {
          const nextIndex = prev + 1
          return nextIndex >= clickableItems.length ? 0 : nextIndex
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex((prev) => {
          const nextIndex = prev - 1
          return nextIndex < 0 ? clickableItems.length - 1 : nextIndex
        })
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < clickableItems.length) {
          handleMenuItemClick(clickableItems[focusedIndex])
        }
        break
    }
  }

  // 外部点击关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setFocusedIndex(-1)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }

    return undefined
  }, [isOpen])

  // 计算菜单位置，包含边界检测和自动调整
  const calculateMenuPosition = () => {
    if (!triggerRef.current || !menuRef.current) return position

    if (!autoAdjustOverflow) return position

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const menuRect = menuRef.current.getBoundingClientRect()

    // 获取限制容器，默认为窗口
    let containerRect = { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight }

    if (constrainToContainer && getPopupContainer) {
      const container = getPopupContainer()
      if (container) {
        const rect = container.getBoundingClientRect()
        containerRect = {
          top: rect.top,
          left: rect.left,
          right: rect.right,
          bottom: rect.bottom
        }
      }
    }

    // 检查各个方向的可用空间
    const spaceBelow = containerRect.bottom - triggerRect.bottom
    const spaceAbove = triggerRect.top - containerRect.top
    const spaceRight = containerRect.right - triggerRect.left
    const spaceLeft = triggerRect.right - containerRect.left

    const menuHeight = menuRect.height || 200 // 预估高度
    const menuWidth = menuRect.width || 160 // 预估宽度

    // 自动选择最适合的位置
    let bestPosition = position

    // 优先考虑垂直方向（上/下）
    const preferBottom = position.includes('bottom')
    const canFitBelow = spaceBelow >= menuHeight + 8
    const canFitAbove = spaceAbove >= menuHeight + 8

    if (preferBottom && canFitBelow) {
      bestPosition = position.includes('Left') ? 'bottomLeft' : 'bottomRight'
    } else if (canFitAbove) {
      bestPosition = position.includes('Left') ? 'topLeft' : 'topRight'
    } else if (canFitBelow) {
      bestPosition = position.includes('Left') ? 'bottomLeft' : 'bottomRight'
    }

    // 检查水平方向（左/右）
    const preferLeft = bestPosition.includes('Left')
    const canFitRight = spaceRight >= menuWidth
    const canFitLeft = spaceLeft >= menuWidth

    if (preferLeft && canFitRight) {
      // 保持Left
    } else if (canFitLeft) {
      bestPosition = bestPosition.replace('Left', 'Right') as typeof position
    } else if (canFitRight) {
      bestPosition = bestPosition.replace('Right', 'Left') as typeof position
    }

    return bestPosition
  }

  // 菜单打开时计算位置
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const newPosition = calculateMenuPosition()
      setAdjustedPosition(newPosition)
    }
  }, [isOpen, position, autoAdjustOverflow, constrainToContainer])

  // 计算菜单位置样式
  const getMenuPosition = () => {
    const positionMap = {
      bottomLeft: 'dropdown-menu-bottom-left',
      bottomRight: 'dropdown-menu-bottom-right',
      topLeft: 'dropdown-menu-top-left',
      topRight: 'dropdown-menu-top-right'
    }
    return positionMap[adjustedPosition]
  }

  // 渲染菜单项
  const renderMenuItem = (item: DropdownMenuItem, _index: number) => {
    const originalIndex = menu.indexOf(item)
    const clickableIndex = clickableItems.indexOf(item)

    switch (item.node) {
      case 'divider':
        return <div key={`divider-${originalIndex}`} className="dropdown-menu-divider" />

      case 'title':
        return (
          <div key={`title-${originalIndex}`} className="dropdown-menu-title">
            {item.name}
          </div>
        )

      case 'item':
        return (
          <button
            key={`item-${originalIndex}`}
            className={`dropdown-menu-item ${item.disabled ? 'disabled' : ''} ${
              clickableIndex === focusedIndex ? 'focused' : ''
            }`}
            onClick={() => handleMenuItemClick(item)}
            disabled={item.disabled}
            tabIndex={-1}
          >
            {item.icon && <span className="dropdown-menu-item-icon">{item.icon}</span>}
            <span className="dropdown-menu-item-text">{item.name}</span>
          </button>
        )

      default:
        return null
    }
  }

  return (
    <div
      ref={dropdownRef}
      className={`custom-dropdown ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div
        ref={triggerRef}
        className="dropdown-trigger"
        onClick={handleTriggerClick}
        onMouseEnter={handleTriggerHover}
        onMouseLeave={handleTriggerLeave}
      >
        {children}
      </div>

      {isOpen && (
        <div
          ref={menuRef}
          className={`dropdown-menu ${getMenuPosition()} ${isOpen ? 'dropdown-menu-open' : ''}`}
          style={dropdownStyle}
          onMouseLeave={trigger === 'hover' ? handleTriggerLeave : undefined}
        >
          {menu.map((item, index) => renderMenuItem(item, index))}
        </div>
      )}
    </div>
  )
}

export default CustomDropdown
