import React, { useState, useRef, useEffect, ReactNode } from 'react'
import './CustomDropdown.css'

export interface DropdownMenuItem {
  node: 'item' | 'divider' | 'title'
  name?: string
  onClick?: () => void
  disabled?: boolean
  icon?: ReactNode
}

interface CustomDropdownProps {
  children: ReactNode
  menu: DropdownMenuItem[]
  trigger?: 'click' | 'hover'
  position?: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight'
  disabled?: boolean
  className?: string
  dropdownStyle?: React.CSSProperties
  getPopupContainer?: () => HTMLElement
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  children,
  menu,
  trigger = 'click',
  position = 'bottomLeft',
  disabled = false,
  className = '',
  dropdownStyle = {},
  getPopupContainer
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  // 获取可点击的菜单项
  const clickableItems = menu.filter(item => item.node === 'item' && !item.disabled)

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
        setFocusedIndex(prev => {
          const nextIndex = prev + 1
          return nextIndex >= clickableItems.length ? 0 : nextIndex
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex(prev => {
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
  }, [isOpen])

  // 计算菜单位置
  const getMenuPosition = () => {
    const positionMap = {
      bottomLeft: 'dropdown-menu-bottom-left',
      bottomRight: 'dropdown-menu-bottom-right',
      topLeft: 'dropdown-menu-top-left',
      topRight: 'dropdown-menu-top-right'
    }
    return positionMap[position]
  }

  // 渲染菜单项
  const renderMenuItem = (item: DropdownMenuItem, index: number) => {
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
