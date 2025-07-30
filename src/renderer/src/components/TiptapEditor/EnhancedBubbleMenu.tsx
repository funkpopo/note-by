import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { posToDOMRect } from '@tiptap/core'
import AiSelector from './AiSelector'
import LinkDialog from './LinkDialog'
import { 
  FiBold, 
  FiItalic, 
  FiUnderline, 
  FiSlash, 
  FiCode, 
  FiLink, 
  FiAlignLeft, 
  FiAlignCenter, 
  FiAlignRight, 
  FiAlignJustify, 
  FiMoreVertical,
  FiList,
  FiImage,
  FiMinus,
  FiMessageSquare,
  FiGrid,
  FiPlus,
  FiX,
  FiType
} from 'react-icons/fi'
import {
  MdFormatColorFill,
  MdOutlineColorLens
} from 'react-icons/md'

interface EnhancedBubbleMenuProps {
  editor: Editor
}

interface TooltipProps {
  text: string
  children: React.ReactNode
  place?: 'top' | 'bottom'
}

const Tooltip: React.FC<TooltipProps> = ({ text, children, place = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => setIsVisible(true), 500)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div 
      className="tooltip-container" 
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          className="tooltip"
          style={{
            position: 'absolute',
            ...(place === 'top' ? { bottom: '100%', marginBottom: '4px' } : { top: '100%', marginTop: '4px' }),
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--semi-color-bg-4)',
            color: 'var(--semi-color-text-0)',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            zIndex: 1002,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            border: '1px solid var(--semi-color-border)',
            pointerEvents: 'none'
          }}
        >
          {text}
          <div
            style={{
              position: 'absolute',
              ...(place === 'top' ? { top: '100%' } : { bottom: '100%' }),
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              ...(place === 'top' 
                ? { borderTop: '4px solid var(--semi-color-bg-4)' }
                : { borderBottom: '4px solid var(--semi-color-bg-4)' }
              )
            }}
          />
        </div>
      )}
    </div>
  )
}

interface CustomDropdownProps {
  visible: boolean
  onVisibleChange: (visible: boolean) => void
  trigger: React.ReactNode
  children: React.ReactNode
  minSpaceNeeded?: number
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ 
  visible, 
  onVisibleChange, 
  trigger, 
  children,
  minSpaceNeeded = 150 // 默认值为150，适合大多数下拉菜单
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  // 边缘检测和位置调整
  const adjustPosition = useCallback(() => {
    if (!dropdownRef.current || !visible) return

    const dropdown = dropdownRef.current
    const editorWrapper = dropdown.closest('.block-editor-wrapper')
    
    if (!editorWrapper) return

    const wrapperRect = editorWrapper.getBoundingClientRect()
    const dropdownRect = dropdown.getBoundingClientRect()

    // 重置之前的样式修改
    dropdown.style.transform = ''
    dropdown.style.top = ''
    dropdown.style.bottom = ''
    dropdown.style.marginTop = ''
    dropdown.style.marginBottom = ''
    dropdown.style.maxHeight = ''
    dropdown.style.overflowY = ''

    let transformX = 0

    // 检查右边界
    if (dropdownRect.right > wrapperRect.right) {
      const overflow = dropdownRect.right - wrapperRect.right
      transformX = -(overflow + 8)
    }

    // 检查左边界
    if (dropdownRect.left < wrapperRect.left) {
      const overflow = wrapperRect.left - dropdownRect.left
      transformX = overflow + 8
    }

    // 检查底部边界 - 使用传入的最小空间需求
    const spaceBelow = wrapperRect.bottom - dropdownRect.bottom
    const spaceAbove = dropdownRect.top - wrapperRect.top

    if (spaceBelow < minSpaceNeeded && spaceAbove > minSpaceNeeded) {
      dropdown.style.top = 'auto'
      dropdown.style.bottom = '100%'
      dropdown.style.marginTop = '0'
      dropdown.style.marginBottom = '4px'
    } else if (spaceBelow < minSpaceNeeded && spaceAbove <= minSpaceNeeded) {
      // 如果上下都没有足够空间，显示在下方但限制高度
      const maxHeight = Math.max(150, spaceBelow - 16)
      dropdown.style.maxHeight = `${maxHeight}px`
      dropdown.style.overflowY = 'auto'
    }

    // 应用水平变换
    if (transformX !== 0) {
      dropdown.style.transform = `translateX(${transformX}px)`
    }
  }, [visible])

  useEffect(() => {
    if (visible) {
      // 延迟调整位置，确保DOM已更新
      const timer = setTimeout(adjustPosition, 0)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [visible, adjustPosition])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onVisibleChange(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && visible) {
        event.preventDefault()
        event.stopPropagation()
        onVisibleChange(false)
      }
    }

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
      // 监听滚动和窗口大小变化
      const handleResize = () => adjustPosition()
      window.addEventListener('resize', handleResize)
      window.addEventListener('scroll', handleResize, true)

      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleKeyDown)
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('scroll', handleResize, true)
      }
    }
    return undefined
  }, [visible, onVisibleChange, adjustPosition])

  return (
    <div className="custom-dropdown" style={{ position: 'relative' }}>
      <div
        ref={triggerRef}
        onClick={() => onVisibleChange(!visible)}
      >
        {trigger}
      </div>
      {visible && (
        <div
          ref={dropdownRef}
          className="custom-dropdown-menu"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            background: 'var(--semi-color-bg-2)',
            border: '1px solid var(--semi-color-border)',
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            zIndex: 1001,
            minWidth: '140px',
            maxWidth: '280px', // 增加最大宽度以适应更长的字体名称
            width: 'max-content',
            padding: '4px 0',
            overflow: 'hidden',
            // 确保在编辑器边界内显示
            maxHeight: '300px',
            overflowY: 'auto'
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

interface DropdownItemProps {
  onClick: () => void
  children: React.ReactNode
  icon?: React.ReactNode
  active?: boolean
}

const DropdownItem: React.FC<DropdownItemProps> = ({ onClick, children, icon, active = false }) => {
  return (
    <button
      className="custom-dropdown-item"
      onClick={onClick}
      style={{
        width: '100%',
        padding: '8px 12px',
        border: 'none',
        background: active ? 'var(--semi-color-fill-1)' : 'transparent',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        color: 'var(--semi-color-text-0)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        minWidth: 0,
        boxSizing: 'border-box'
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'var(--semi-color-fill-0)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = active ? 'var(--semi-color-fill-1)' : 'transparent'
      }}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>}
      <span style={{ 
        overflow: 'hidden', 
        textOverflow: 'ellipsis', 
        whiteSpace: 'nowrap',
        minWidth: 0,
        flex: 1
      }}>
        {children}
      </span>
    </button>
  )
}

interface ColorPickerProps {
  colors: string[]
  activeColor?: string
  onColorSelect: (color: string) => void
  onClear?: () => void
}

const ColorPicker: React.FC<ColorPickerProps> = ({ colors, activeColor, onColorSelect, onClear }) => {
  return (
    <div style={{ 
      padding: '12px', 
      width: '200px',
      minWidth: '200px',
      maxWidth: '200px'
    }}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(6, 1fr)', 
        gap: '6px',
        marginBottom: onClear ? '12px' : '0'
      }}>
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => onColorSelect(color)}
            style={{
              width: '26px',
              height: '26px',
              backgroundColor: color,
              border: activeColor === color ? '2px solid var(--semi-color-primary)' : '1px solid var(--semi-color-border)',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
            title={color}
            onMouseEnter={(e) => {
              if (activeColor !== color) {
                e.currentTarget.style.transform = 'scale(1.1)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {activeColor === color && (
              <div style={{
                width: '10px',
                height: '10px',
                backgroundColor: color === '#ffffff' || color === '#f8f9fa' ? '#000' : '#fff',
                borderRadius: '50%',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
              }} />
            )}
          </button>
        ))}
      </div>
      {onClear && (
        <button
          onClick={onClear}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--semi-color-border)',
            borderRadius: '6px',
            background: 'var(--semi-color-bg-1)',
            color: 'var(--semi-color-text-1)',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--semi-color-fill-0)'
            e.currentTarget.style.color = 'var(--semi-color-text-0)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--semi-color-bg-1)'
            e.currentTarget.style.color = 'var(--semi-color-text-1)'
          }}
        >
          清除颜色
        </button>
      )}
    </div>
  )
}

const EnhancedBubbleMenu: React.FC<EnhancedBubbleMenuProps> = ({ editor }) => {
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [showFontFamily, setShowFontFamily] = useState(false)
  const [showFontSize, setShowFontSize] = useState(false)
  const [showTextColor, setShowTextColor] = useState(false)
  const [showBgColor, setShowBgColor] = useState(false)
  const [placement, setPlacement] = useState<'top-start' | 'bottom-start'>('bottom-start')
  const [isInTable, setIsInTable] = useState(false)
  const bubbleMenuRef = useRef<HTMLDivElement>(null)

  // 字体系列选项
  const fontFamilies = [
    { name: '默认', value: '' },
    { name: '苹方', value: 'PingFang SC' },
    { name: '微软雅黑', value: 'Microsoft YaHei' },
    { name: '宋体', value: 'SimSun' },
    { name: '黑体', value: 'SimHei' },
    { name: 'Arial', value: 'Arial' },
    { name: 'Helvetica', value: 'Helvetica' },
    { name: 'Times New Roman', value: 'Times New Roman' },
    { name: 'Courier New', value: 'Courier New' },
    { name: 'Georgia', value: 'Georgia' },
  ]

  // 字号选项
  const fontSizes = [
    { name: '小', value: '12px' },
    { name: '较小', value: '14px' },
    { name: '正常', value: '16px' },
    { name: '较大', value: '18px' },
    { name: '大', value: '20px' },
    { name: '特大', value: '24px' },
    { name: '超大', value: '32px' },
  ]

  // 颜色选项
  const textColors = [
    '#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff',
    '#ff0000', '#ff6600', '#ffcc00', '#33cc33', '#0099cc', '#6633cc',
    '#ff3366', '#ff9933', '#ffff00', '#66ff66', '#3399ff', '#9966ff',
    '#cc0000', '#cc6600', '#cc9900', '#009900', '#0066cc', '#6600cc',
    '#990033', '#cc3300', '#999900', '#006600', '#003399', '#330099',
  ]

  const backgroundColors = [
    '#ffffff', '#f8f9fa', '#e9ecef', '#dee2e6', '#ced4da', '#adb5bd',
    '#ffebee', '#fff3e0', '#fff8e1', '#f1f8e9', '#e8f5e8', '#e3f2fd',
    '#fce4ec', '#fff0f5', '#fffbf0', '#f0fff0', '#f0f8ff', '#f5f0ff',
    '#ffcdd2', '#ffcc80', '#fff176', '#c8e6c9', '#81c784', '#64b5f6',
    '#f8bbd9', '#ffab91', '#dce775', '#a5d6a7', '#4fc3f7', '#9575cd',
    '#ef5350', '#ff8a65', '#ffb74d', '#81c784', '#42a5f5', '#ab47bc',
  ]

  // 获取当前字体系列
  const getCurrentFontFamily = () => {
    const attrs = editor.getAttributes('textStyle')
    return attrs.fontFamily || ''
  }

  // 获取当前字号
  const getCurrentFontSize = () => {
    const attrs = editor.getAttributes('textStyle')
    return attrs.fontSize || ''
  }

  // 获取当前文字颜色
  const getCurrentTextColor = () => {
    const attrs = editor.getAttributes('textStyle')
    return attrs.color || ''
  }

  // 获取当前背景颜色
  const getCurrentBgColor = () => {
    const attrs = editor.getAttributes('textStyle')
    return attrs.backgroundColor || ''
  }
  
  // 获取选中区域的边界矩形
  const getSelectionRect = useCallback(() => {
    const { state } = editor
    const { from, to } = state.selection
    
    if (from === to) return null
    
    try {
      // 优先使用原生 Selection API 获取选区，这在双击选择整行时更准确
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        
        // 确保返回的矩形有效
        if (rect.width > 0 && rect.height > 0) {
          return rect
        }
      }
      
      // 回退到使用 Tiptap 的 posToDOMRect
      const minPos = Math.min(from, to)
      const maxPos = Math.max(from, to)
      const startRect = posToDOMRect(editor.view, minPos, minPos)
      const endRect = posToDOMRect(editor.view, maxPos, maxPos)
      
      // 计算选中区域的完整边界
      const left = Math.min(startRect.left, endRect.left)
      const right = Math.max(startRect.right, endRect.right)
      const top = Math.min(startRect.top, endRect.top)
      const bottom = Math.max(startRect.bottom, endRect.bottom)
      
      return new DOMRect(left, top, right - left, bottom - top)
    } catch (error) {
      // 如果出错，返回null避免崩溃
      console.warn('Failed to get selection rect:', error)
      return null
    }
  }, [editor])

  // 计算 BubbleMenu 应该显示的位置
  const calculatePlacement = useCallback(() => {
    const selectionRect = getSelectionRect()
    if (!selectionRect) return 'bottom-start'
    
    const editorWrapper = document.querySelector('.block-editor-wrapper')
    if (!editorWrapper) return 'bottom-start'
    
    const wrapperRect = editorWrapper.getBoundingClientRect()
    const menuHeight = 48 // BubbleMenu 的估计高度
    const offset = 8 // 与选中内容的间距
    
    // 计算可用空间
    const spaceBelow = wrapperRect.bottom - selectionRect.bottom
    const spaceAbove = selectionRect.top - wrapperRect.top
    
    // 如果下方空间不足且上方有足够空间，则显示在上方
    if (spaceBelow < menuHeight + offset && spaceAbove > menuHeight + offset) {
      return 'top-start'
    }
    
    return 'bottom-start'
  }, [getSelectionRect])

  // 边缘检测和动态定位
  const adjustBubbleMenuPosition = useCallback(() => {
    if (!bubbleMenuRef.current) return

    const bubbleMenu = bubbleMenuRef.current
    const editorWrapper = bubbleMenu.closest('.block-editor-wrapper')
    
    if (!editorWrapper) return

    const wrapperRect = editorWrapper.getBoundingClientRect()
    const menuRect = bubbleMenu.getBoundingClientRect()

    let transformX = 0

    // 检查是否超出右边界
    if (menuRect.right > wrapperRect.right) {
      const overflow = menuRect.right - wrapperRect.right
      transformX = -(overflow + 8)
    }

    // 检查是否超出左边界
    if (menuRect.left < wrapperRect.left) {
      const overflow = wrapperRect.left - menuRect.left
      transformX = overflow + 8
    }

    // 应用水平变换
    if (transformX !== 0) {
      bubbleMenu.style.transform = `translateX(${transformX}px)`
    } else {
      bubbleMenu.style.transform = ''
    }

    // 更新 placement
    const newPlacement = calculatePlacement()
    if (newPlacement !== placement) {
      setPlacement(newPlacement)
    }
  }, [calculatePlacement, placement])

  useEffect(() => {
    // 监听bubble menu的显示
    const observer = new MutationObserver(() => {
      if (bubbleMenuRef.current && bubbleMenuRef.current.offsetParent) {
        // bubble menu变为可见时调整位置
        // 增加额外的延迟以确保双击选择后选区已稳定
        const timeouts = [10]
        timeouts.forEach(delay => {
          setTimeout(() => {
            adjustBubbleMenuPosition()
          }, delay)
        })
      }
    })

    if (bubbleMenuRef.current) {
      observer.observe(bubbleMenuRef.current, {
        attributes: true,
        attributeFilter: ['style']
      })
    }

    return () => observer.disconnect()
  }, [adjustBubbleMenuPosition])

  // 监听选择变化来更新 placement 和表格状态
  useEffect(() => {
    const updatePlacement = () => {
      const newPlacement = calculatePlacement()
      if (newPlacement !== placement) {
        setPlacement(newPlacement)
      }
      
      // 检查是否在表格中 - 更严格的检查
      const selection = editor.state.selection
      const { $from } = selection
      
      // 检查当前节点或父节点是否是表格相关节点
      let isInTableCell = false
      
      // 向上遍历节点树检查是否在表格中
      for (let depth = $from.depth; depth >= 0; depth--) {
        const nodeAtDepth = $from.node(depth)
        if (nodeAtDepth.type.name === 'tableCell' || nodeAtDepth.type.name === 'tableHeader') {
          isInTableCell = true
          break
        }
      }
      
      setIsInTable(isInTableCell)
    }

    // 监听编辑器的选择变化
    editor.on('selectionUpdate', updatePlacement)
    editor.on('update', updatePlacement)

    return () => {
      editor.off('selectionUpdate', updatePlacement)
      editor.off('update', updatePlacement)
    }
  }, [editor, calculatePlacement, placement])

  // 监听键盘快捷键事件
  useEffect(() => {
    const handleOpenLinkDialog = () => {
      // 只有当编辑器有焦点时才响应
      if (editor.isFocused) {
        setShowLinkDialog(true)
      }
    }

    document.addEventListener('openLinkDialog', handleOpenLinkDialog)
    return () => {
      document.removeEventListener('openLinkDialog', handleOpenLinkDialog)
    }
  }, [editor])

  // 添加ESC键处理来关闭BubbleMenu
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // 检查BubbleMenu是否可见
        const selection = editor.state.selection
        const { from, to } = selection
        
        if (from !== to) { // BubbleMenu可见时（有文本选择）
          event.preventDefault()
          event.stopPropagation()
          // 清除选择，这会隐藏BubbleMenu
          editor.commands.focus()
          editor.commands.setTextSelection(to)
          
          // 如果有下拉菜单打开，也要关闭
          if (showMoreOptions) {
            setShowMoreOptions(false)
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [editor, showMoreOptions])
  
  const openLinkDialog = () => {
    setShowLinkDialog(true)
  }

  const handleLinkConfirm = (url: string, text?: string) => {
    const { from, to } = editor.state.selection
    
    if (text && from !== to) {
      // 如果提供了显示文本且有选中内容，先替换选中的文本
      editor.chain().focus().deleteSelection().insertContent(text).run()
      // 然后选中刚插入的文本并添加链接
      const newTo = from + text.length
      editor.chain().focus().setTextSelection({ from, to: newTo }).setLink({ href: url }).run()
    } else {
      // 没有显示文本或没有选中内容，直接设置链接
      if (from === to && text) {
        // 没有选中内容但有显示文本，插入带链接的文本
        editor.chain().focus().insertContent(`<a href="${url}">${text}</a>`).run()
      } else {
        // 有选中内容，直接添加链接
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
      }
    }
  }

  const handleLinkRemove = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
  }

  const getLinkAttributes = () => {
    const attrs = editor.getAttributes('link')
    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to, ' ')
    
    return {
      url: attrs.href || '',
      text: selectedText || '',
      hasLink: editor.isActive('link')
    }
  }

  // 使用 useMemo 优化 BubbleMenu 的 options
  const bubbleMenuOptions = useMemo(() => ({
    offset: 8,
    placement: placement
  }), [placement])

  return (
    <BubbleMenu 
      editor={editor} 
      options={bubbleMenuOptions}
      shouldShow={({ editor, from, to }) => {
        // 只在有文本选择时显示
        if (from === to) return false
        
        // 检查选择是否有效
        const selection = window.getSelection()
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
          return false
        }
        
        // 检查选中内容是否在编辑器内
        const range = selection.getRangeAt(0)
        const editorElement = editor.view.dom
        if (!editorElement.contains(range.commonAncestorContainer)) {
          return false
        }
        
        // 获取选中的文本内容，过滤空白内容
        const selectedText = selection.toString().trim()
        if (!selectedText) {
          return false
        }
        
        return true
      }}
    >
      <div className="enhanced-bubble-menu" ref={bubbleMenuRef}>
        <div className="bubble-menu-container">
          {isInTable ? (
            // 表格模式：显示表格操作按钮
            <>
              <Tooltip text="在前方插入列" place="top">
                <button
                  className="bubble-menu-button"
                  onClick={() => editor.chain().focus().addColumnBefore().run()}
                >
                  <FiPlus size={16} />
                </button>
              </Tooltip>
              
              <Tooltip text="在后方插入列" place="top">
                <button
                  className="bubble-menu-button"
                  onClick={() => editor.chain().focus().addColumnAfter().run()}
                >
                  <FiPlus size={16} />
                </button>
              </Tooltip>
              
              <Tooltip text="删除列" place="top">
                <button
                  className="bubble-menu-button"
                  onClick={() => editor.chain().focus().deleteColumn().run()}
                >
                  <FiX size={16} />
                </button>
              </Tooltip>
              
              <div className="divider" />
              
              <Tooltip text="在上方插入行" place="top">
                <button
                  className="bubble-menu-button"
                  onClick={() => editor.chain().focus().addRowBefore().run()}
                >
                  <FiPlus size={16} />
                </button>
              </Tooltip>
              
              <Tooltip text="在下方插入行" place="top">
                <button
                  className="bubble-menu-button"
                  onClick={() => editor.chain().focus().addRowAfter().run()}
                >
                  <FiPlus size={16} />
                </button>
              </Tooltip>
              
              <Tooltip text="删除行" place="top">
                <button
                  className="bubble-menu-button"
                  onClick={() => editor.chain().focus().deleteRow().run()}
                >
                  <FiX size={16} />
                </button>
              </Tooltip>
              
              <div className="divider" />
              
              <Tooltip text="删除表格" place="top">
                <button
                  className="bubble-menu-button"
                  onClick={() => editor.chain().focus().deleteTable().run()}
                >
                  <FiGrid size={16} />
                </button>
              </Tooltip>
            </>
          ) : (
            // 普通模式：显示常规格式化按钮
            <>
              <AiSelector editor={editor} />
              <div className="divider" />
              
              {/* 字体系列下拉框 */}
              <CustomDropdown
                visible={showFontFamily}
                onVisibleChange={setShowFontFamily}
                trigger={
                  <Tooltip text="字体" place="top">
                    <button className="bubble-menu-button">
                      <FiType size={16} />
                    </button>
                  </Tooltip>
                }
              >
                {fontFamilies.map((font) => (
                  <DropdownItem
                    key={font.value}
                    onClick={() => {
                      if (font.value) {
                        editor.chain().focus().setFontFamily(font.value).run()
                      } else {
                        editor.chain().focus().unsetFontFamily().run()
                      }
                      setShowFontFamily(false)
                    }}
                    active={getCurrentFontFamily() === font.value}
                  >
                    <span style={{ fontFamily: font.value || 'inherit' }}>
                      {font.name}
                    </span>
                  </DropdownItem>
                ))}
              </CustomDropdown>

              {/* 字号下拉框 */}
              <CustomDropdown
                visible={showFontSize}
                onVisibleChange={setShowFontSize}
                trigger={
                  <Tooltip text="字号" place="top">
                    <button className="bubble-menu-button">
                      <span style={{ fontSize: '12px', fontWeight: 'bold' }}>A</span>
                    </button>
                  </Tooltip>
                }
              >
                {fontSizes.map((size) => (
                  <DropdownItem
                    key={size.value}
                    onClick={() => {
                      editor.chain().focus().setFontSize(size.value).run()
                      setShowFontSize(false)
                    }}
                    active={getCurrentFontSize() === size.value}
                  >
                    <span style={{ fontSize: size.value }}>
                      {size.name}
                    </span>
                  </DropdownItem>
                ))}
              </CustomDropdown>

              {/* 文字颜色 */}
              <CustomDropdown
                visible={showTextColor}
                onVisibleChange={setShowTextColor}
                minSpaceNeeded={220} // 颜色选择器需要更多空间
                trigger={
                  <Tooltip text="文字颜色" place="top">
                    <button className="bubble-menu-button">
                      <div style={{ position: 'relative' }}>
                        <MdOutlineColorLens size={16} />
                      </div>
                    </button>
                  </Tooltip>
                }
              >
                <ColorPicker
                  colors={textColors}
                  activeColor={getCurrentTextColor()}
                  onColorSelect={(color) => {
                    editor.chain().focus().setColor(color).run()
                    setShowTextColor(false)
                  }}
                  onClear={() => {
                    editor.chain().focus().unsetColor().run()
                    setShowTextColor(false)
                  }}
                />
              </CustomDropdown>

              {/* 背景颜色 */}
              <CustomDropdown
                visible={showBgColor}
                onVisibleChange={setShowBgColor}
                minSpaceNeeded={220} // 颜色选择器需要更多空间
                trigger={
                  <Tooltip text="背景颜色" place="top">
                    <button className="bubble-menu-button">
                      <div style={{ position: 'relative' }}>
                        <MdFormatColorFill size={16} />
                      </div>
                    </button>
                  </Tooltip>
                }
              >
                <ColorPicker
                  colors={backgroundColors}
                  activeColor={getCurrentBgColor()}
                  onColorSelect={(color) => {
                    editor.chain().focus().setBackgroundColor(color).run()
                    setShowBgColor(false)
                  }}
                  onClear={() => {
                    editor.chain().focus().unsetBackgroundColor().run()
                    setShowBgColor(false)
                  }}
                />
              </CustomDropdown>

              <div className="divider" />
              
              <Tooltip text="粗体" place="top">
                <button
                  className={`bubble-menu-button ${editor.isActive('bold') ? 'active' : ''}`}
                  onClick={() => editor.chain().focus().toggleMark('bold').run()}
                  disabled={!editor.can().chain().focus().toggleMark('bold').run()}
                >
                  <FiBold size={16} />
                </button>
              </Tooltip>
              
              <Tooltip text="斜体" place="top">
                <button
                  className={`bubble-menu-button ${editor.isActive('italic') ? 'active' : ''}`}
                  onClick={() => editor.chain().focus().toggleMark('italic').run()}
                  disabled={!editor.can().chain().focus().toggleMark('italic').run()}
                >
                  <FiItalic size={16} />
                </button>
              </Tooltip>
              
              <Tooltip text="下划线" place="top">
                <button
                  className={`bubble-menu-button ${editor.isActive('underline') ? 'active' : ''}`}
                  onClick={() => editor.chain().focus().toggleMark('underline').run()}
                  disabled={!editor.can().chain().focus().toggleMark('underline').run()}
                >
                  <FiUnderline size={16} />
                </button>
              </Tooltip>
              
              <Tooltip text="删除线" place="top">
                <button
                  className={`bubble-menu-button ${editor.isActive('strike') ? 'active' : ''}`}
                  onClick={() => editor.chain().focus().toggleMark('strike').run()}
                  disabled={!editor.can().chain().focus().toggleMark('strike').run()}
                >
                  <FiSlash size={16} />
                </button>
              </Tooltip>
              
              <Tooltip text="行内代码" place="top">
                <button
                  className={`bubble-menu-button ${editor.isActive('code') ? 'active' : ''}`}
                  onClick={() => editor.chain().focus().toggleMark('code').run()}
                  disabled={!editor.can().chain().focus().toggleMark('code').run()}
                >
                  <FiCode size={16} />
                </button>
              </Tooltip>
              
              <Tooltip text={editor.isActive('link') ? '编辑链接' : '插入链接'} place="top">
                <button
                  className={`bubble-menu-button ${editor.isActive('link') ? 'active' : ''}`}
                  onClick={openLinkDialog}
                >
                  <FiLink size={16} />
                </button>
              </Tooltip>
              
              <div className="divider" />
              
              <Tooltip text="左对齐" place="top">
                <button
                  className={`bubble-menu-button ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`}
                  onClick={() => editor.chain().focus().setTextAlign('left').run()}
                >
                  <FiAlignLeft size={16} />
                </button>
              </Tooltip>
              
              <Tooltip text="居中对齐" place="top">
                <button
                  className={`bubble-menu-button ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`}
                  onClick={() => editor.chain().focus().setTextAlign('center').run()}
                >
                  <FiAlignCenter size={16} />
                </button>
              </Tooltip>
              
              <Tooltip text="右对齐" place="top">
                <button
                  className={`bubble-menu-button ${editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`}
                  onClick={() => editor.chain().focus().setTextAlign('right').run()}
                >
                  <FiAlignRight size={16} />
                </button>
              </Tooltip>
              
              <Tooltip text="两端对齐" place="top">
                <button
                  className={`bubble-menu-button ${editor.isActive({ textAlign: 'justify' }) ? 'active' : ''}`}
                  onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                >
                  <FiAlignJustify size={16} />
                </button>
              </Tooltip>
              
              <div className="divider" />
              
              <CustomDropdown
                visible={showMoreOptions}
                onVisibleChange={setShowMoreOptions}
                trigger={
                  <Tooltip text="更多选项" place="top">
                    <button className="bubble-menu-button">
                      <FiMoreVertical size={16} />
                    </button>
                  </Tooltip>
                }
              >
                <DropdownItem 
                  onClick={() => {
                    editor.chain().focus().toggleList('bulletList', 'listItem').run()
                    setShowMoreOptions(false)
                  }}
                  icon={<FiList size={14} />}
                >
                  无序列表
                </DropdownItem>
                <DropdownItem 
                  onClick={() => {
                    editor.chain().focus().toggleList('orderedList', 'listItem').run()
                    setShowMoreOptions(false)
                  }}
                  icon={<FiList size={14} />}
                >
                  有序列表
                </DropdownItem>
                <DropdownItem 
                  onClick={() => {
                    editor.chain().focus().toggleBlockquote().run()
                    setShowMoreOptions(false)
                  }}
                  icon={<FiMessageSquare size={14} />}
                >
                  引用
                </DropdownItem>
                <DropdownItem 
                  onClick={() => {
                    editor.chain().focus().setHorizontalRule().run()
                    setShowMoreOptions(false)
                  }}
                  icon={<FiMinus size={14} />}
                >
                  分割线
                </DropdownItem>
                <DropdownItem 
                  onClick={() => {
                    const url = window.prompt('图片地址:')
                    if (url) {
                      editor.chain().focus().setImage({ src: url }).run()
                    }
                    setShowMoreOptions(false)
                  }}
                  icon={<FiImage size={14} />}
                >
                  插入图片
                </DropdownItem>
                <DropdownItem 
                  onClick={() => {
                    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
                    setShowMoreOptions(false)
                  }}
                  icon={<FiGrid size={14} />}
                >
                  插入表格
                </DropdownItem>
              </CustomDropdown>
            </>
          )}
        </div>
      </div>
      
      {showLinkDialog && (() => {
        const linkAttrs = getLinkAttributes()
        return (
          <LinkDialog
            isOpen={showLinkDialog}
            onClose={() => setShowLinkDialog(false)}
            onConfirm={handleLinkConfirm}
            onRemove={linkAttrs.hasLink ? handleLinkRemove : undefined}
            initialUrl={linkAttrs.url}
            initialText={linkAttrs.text}
            hasLink={linkAttrs.hasLink}
          />
        )
      })()}
    </BubbleMenu>
  )
}

export default EnhancedBubbleMenu