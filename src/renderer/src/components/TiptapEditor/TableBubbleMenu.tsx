import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Editor } from '@tiptap/react'
import { 
  FiPlus, 
  FiMinus,
  FiGrid,
  FiColumns,
  FiMoreHorizontal,
  FiCopy,
  FiScissors
} from 'react-icons/fi'

interface TableBubbleMenuProps {
  editor: Editor
}

interface TableMenuButtonProps {
  onClick: () => void
  children: React.ReactNode
  title: string
  disabled?: boolean
}

const TableMenuButton: React.FC<TableMenuButtonProps> = ({ onClick, children, title, disabled = false }) => {
  return (
    <button
      className="table-bubble-menu-item"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '4px 12px',
        border: 'none',
        background: 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        color: disabled ? 'var(--semi-color-text-3)' : 'var(--semi-color-text-0)',
        opacity: disabled ? 0.6 : 1,
        textAlign: 'left' as const,
        minHeight: '24px',
        borderRadius: '4px'
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = 'var(--semi-color-fill-0)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', width: '16px', justifyContent: 'center' }}>
        {children}
      </span>
      <span>{title}</span>
    </button>
  )
}

const TableBubbleMenu: React.FC<TableBubbleMenuProps> = ({ editor }) => {
  const [menuVisible, setMenuVisible] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const bubbleMenuRef = useRef<HTMLDivElement>(null)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })

  // 处理右键菜单显示
  const handleContextMenu = useCallback((event: MouseEvent) => {
    // 检查是否在表格内或表格边框上
    const target = event.target as HTMLElement
    const table = target.closest('table')
    const tableCell = target.closest('td, th')
    
    // 检查是否点击在表格区域内（包括边框）
    if (table && editor.isActive('table')) {
      event.preventDefault()
      event.stopPropagation()
      
      setContextMenuPosition({ x: event.clientX, y: event.clientY })
      setMenuVisible(true)
      
      // 如果不在单元格内，则选择整个表格
      if (!tableCell) {
        // 获取表格在文档中的位置并选择它
        const pos = editor.view.posAtDOM(table, 0)
        if (pos !== null) {
          editor.chain().focus().setNodeSelection(pos).run()
        }
      }
    }
  }, [editor])

  // 处理点击外部关闭菜单
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (bubbleMenuRef.current && !bubbleMenuRef.current.contains(event.target as Node)) {
      setMenuVisible(false)
    }
  }, [])

  // 处理ESC键关闭菜单
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && menuVisible) {
      event.preventDefault()
      event.stopPropagation()
      setMenuVisible(false)
    }
  }, [menuVisible])

  useEffect(() => {
    // 添加右键菜单监听
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleContextMenu, handleClickOutside, handleKeyDown])

  // 动态调整菜单位置，确保不超出视口
  const adjustMenuPosition = useCallback((): { x: number; y: number } | undefined => {
    if (!bubbleMenuRef.current || !menuVisible) return undefined

    const menu = bubbleMenuRef.current
    const menuRect = menu.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    let { x, y } = contextMenuPosition

    // 菜单最大高度设置为视口高度的80%，留出边距
    const maxMenuHeight = Math.floor(viewportHeight * 0.8)
    const menuPadding = 8 // 上下各4px的内边距
    
    // 如果菜单内容高度超过最大高度，启用滚动
    if (menuRect.height > maxMenuHeight) {
      menu.style.maxHeight = `${maxMenuHeight}px`
      menu.style.overflowY = 'auto'
    } else {
      menu.style.maxHeight = 'none'
      menu.style.overflowY = 'visible'
    }

    // 获取调整后的菜单尺寸
    const adjustedMenuHeight = Math.min(menuRect.height, maxMenuHeight)
    const adjustedMenuWidth = menuRect.width

    // 检查右边界
    if (x + adjustedMenuWidth > viewportWidth) {
      x = Math.max(8, viewportWidth - adjustedMenuWidth - 8)
    }

    // 检查左边界
    if (x < 8) {
      x = 8
    }

    // 检查下边界
    if (y + adjustedMenuHeight > viewportHeight) {
      // 尝试显示在鼠标点击位置上方
      const spaceAbove = y - 8
      if (spaceAbove >= adjustedMenuHeight) {
        y = y - adjustedMenuHeight - 8
      } else {
        // 上方空间也不足，显示在视口顶部附近
        y = Math.max(8, viewportHeight - adjustedMenuHeight - 8)
      }
    }

    // 检查上边界
    if (y < 8) {
      y = 8
    }

    setMenuPosition({ x, y })
    return { x, y }
  }, [contextMenuPosition, menuVisible])

  useEffect(() => {
    if (menuVisible) {
      // 使用多次延迟调整位置以确保DOM已更新和尺寸计算准确
      const timeouts = [0, 10, 50] // 多个时间点进行调整
      timeouts.forEach(delay => {
        setTimeout(() => {
          adjustMenuPosition()
        }, delay)
      })
      
      return () => {
        timeouts.forEach((_, index) => {
          clearTimeout(index)
        })
      }
    }
  }, [menuVisible, adjustMenuPosition])

  // 处理页面滚动和窗口大小变化时的菜单位置调整
  useEffect(() => {
    if (!menuVisible) return

    const handleScroll = (event: Event) => {
      // 检查滚动事件是否来自编辑器内容区域
      const target = event.target as HTMLElement
      const isEditorScroll = target.closest('.editor-content') || 
                            target.closest('.block-editor-wrapper') ||
                            target.closest('.tiptap-editor-content') ||
                            target === document.documentElement ||
                            target === document.body

      if (isEditorScroll) {
        // 编辑器或页面滚动时关闭菜单
        setMenuVisible(false)
      }
    }

    const handleResize = () => {
      // 窗口大小变化时重新调整菜单位置
      adjustMenuPosition()
    }

    // 监听所有滚动事件（包括捕获阶段）
    document.addEventListener('scroll', handleScroll, true)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)

    return () => {
      document.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [menuVisible, adjustMenuPosition])

  const executeCommand = (command: () => void) => {
    command()
    setMenuVisible(false)
  }

  if (!menuVisible) return null

  return (
    <div
      ref={bubbleMenuRef}
      className="table-bubble-menu"
      style={{
        position: 'fixed',
        top: `${menuPosition.y}px`,
        left: `${menuPosition.x}px`,
        zIndex: 1002,
        background: 'var(--semi-color-bg-2)',
        border: '1px solid var(--semi-color-border)',
        borderRadius: '8px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        padding: '4px 0',
        display: 'flex',
        flexDirection: 'column',
        minWidth: '160px',
        maxWidth: '200px',
        maxHeight: '80vh',
        overflowY: 'auto',
        animation: 'tableMenuSlideIn 0.15s ease-out'
      }}
    >
      {/* 列操作 */}
      <TableMenuButton
        onClick={() => executeCommand(() => editor.chain().focus().addColumnBefore().run())}
        title="在前方插入列"
      >
        <FiPlus size={12} />
      </TableMenuButton>
      
      <TableMenuButton
        onClick={() => executeCommand(() => editor.chain().focus().addColumnAfter().run())}
        title="在后方插入列"
      >
        <FiPlus size={12} />
      </TableMenuButton>
      
      <TableMenuButton
        onClick={() => executeCommand(() => editor.chain().focus().deleteColumn().run())}
        title="删除列"
        disabled={!editor.can().deleteColumn()}
      >
        <FiMinus size={12} />
      </TableMenuButton>

      {/* 分割线 */}
      <div style={{ height: '1px', background: 'var(--semi-color-border)', margin: '2px 0' }} />

      {/* 行操作 */}
      <TableMenuButton
        onClick={() => executeCommand(() => editor.chain().focus().addRowBefore().run())}
        title="在上方插入行"
      >
        <FiPlus size={12} />
      </TableMenuButton>
      
      <TableMenuButton
        onClick={() => executeCommand(() => editor.chain().focus().addRowAfter().run())}
        title="在下方插入行"
      >
        <FiPlus size={12} />
      </TableMenuButton>
      
      <TableMenuButton
        onClick={() => executeCommand(() => editor.chain().focus().deleteRow().run())}
        title="删除行"
        disabled={!editor.can().deleteRow()}
      >
        <FiMinus size={12} />
      </TableMenuButton>

      {/* 分割线 */}
      <div style={{ height: '1px', background: 'var(--semi-color-border)', margin: '2px 0' }} />

      {/* 单元格操作 */}
      <TableMenuButton
        onClick={() => executeCommand(() => editor.chain().focus().mergeCells().run())}
        title="合并单元格"
        disabled={!editor.can().mergeCells()}
      >
        <FiCopy size={12} />
      </TableMenuButton>
      
      <TableMenuButton
        onClick={() => executeCommand(() => editor.chain().focus().splitCell().run())}
        title="拆分单元格"
        disabled={!editor.can().splitCell()}
      >
        <FiScissors size={12} />
      </TableMenuButton>

      {/* 分割线 */}
      <div style={{ height: '1px', background: 'var(--semi-color-border)', margin: '2px 0' }} />

      {/* 表头操作 */}
      <TableMenuButton
        onClick={() => executeCommand(() => editor.chain().focus().toggleHeaderColumn().run())}
        title="切换表头列"
      >
        <FiColumns size={12} />
      </TableMenuButton>
      
      <TableMenuButton
        onClick={() => executeCommand(() => editor.chain().focus().toggleHeaderRow().run())}
        title="切换表头行"
      >
        <FiMoreHorizontal size={12} />
      </TableMenuButton>

      {/* 分割线 */}
      <div style={{ height: '1px', background: 'var(--semi-color-border)', margin: '2px 0' }} />

      {/* 表格操作 */}
      <TableMenuButton
        onClick={() => executeCommand(() => editor.chain().focus().deleteTable().run())}
        title="删除表格"
      >
        <FiGrid size={12} />
      </TableMenuButton>
    </div>
  )
}

export default TableBubbleMenu