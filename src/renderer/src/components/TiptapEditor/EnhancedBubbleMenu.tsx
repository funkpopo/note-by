import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { posToDOMRect } from '@tiptap/core'
import AiSelector from './AiSelector'
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
  FiMessageSquare
} from 'react-icons/fi'

interface EnhancedBubbleMenuProps {
  editor: Editor
}

interface CustomDropdownProps {
  visible: boolean
  onVisibleChange: (visible: boolean) => void
  trigger: React.ReactNode
  children: React.ReactNode
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ 
  visible, 
  onVisibleChange, 
  trigger, 
  children 
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

    let adjustedStyle = ''

    // 检查右边界
    if (dropdownRect.right > wrapperRect.right) {
      const overflow = dropdownRect.right - wrapperRect.right
      adjustedStyle += `transform: translateX(-${overflow}px); `
    }

    // 检查左边界
    if (dropdownRect.left < wrapperRect.left) {
      const overflow = wrapperRect.left - dropdownRect.left
      adjustedStyle += `transform: translateX(${overflow}px); `
    }

    // 检查底部边界
    if (dropdownRect.bottom > wrapperRect.bottom) {
      // 如果下方空间不足，显示在上方
      adjustedStyle += `top: auto; bottom: 100%; margin-top: 0; margin-bottom: 4px; `
    }

    // 检查顶部边界（当显示在上方时）
    if (dropdownRect.top < wrapperRect.top && adjustedStyle.includes('bottom: 100%')) {
      // 如果上方也不足，恢复显示在下方但调整高度
      adjustedStyle = adjustedStyle.replace('top: auto; bottom: 100%; margin-top: 0; margin-bottom: 4px; ', '')
      const maxHeight = wrapperRect.bottom - dropdownRect.top - 8
      adjustedStyle += `max-height: ${maxHeight}px; overflow-y: auto; `
    }

    if (adjustedStyle) {
      dropdown.style.cssText += adjustedStyle
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
            minWidth: '120px',
            maxWidth: '200px',
            width: 'max-content',
            padding: '4px 0'
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
}

const DropdownItem: React.FC<DropdownItemProps> = ({ onClick, children, icon }) => {
  return (
    <button
      className="custom-dropdown-item"
      onClick={onClick}
      style={{
        width: '100%',
        padding: '8px 12px',
        border: 'none',
        background: 'transparent',
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
        textOverflow: 'ellipsis'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--semi-color-fill-0)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </button>
  )
}

const EnhancedBubbleMenu: React.FC<EnhancedBubbleMenuProps> = ({ editor }) => {
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [placement, setPlacement] = useState<'top-start' | 'bottom-start'>('bottom-start')
  const bubbleMenuRef = useRef<HTMLDivElement>(null)
  
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

  // 监听选择变化来更新 placement
  useEffect(() => {
    const updatePlacement = () => {
      const newPlacement = calculatePlacement()
      if (newPlacement !== placement) {
        setPlacement(newPlacement)
      }
    }

    // 监听编辑器的选择变化
    editor.on('selectionUpdate', updatePlacement)
    editor.on('update', updatePlacement)

    return () => {
      editor.off('selectionUpdate', updatePlacement)
      editor.off('update', updatePlacement)
    }
  }, [editor, calculatePlacement, placement])

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
  
  const toggleLink = () => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('输入链接地址:', previousUrl)

    // cancelled
    if (url === null) {
      return
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
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
          <AiSelector editor={editor} />
          <div className="divider" />
          <button
            className={`bubble-menu-button ${editor.isActive('bold') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleMark('bold').run()}
            disabled={!editor.can().chain().focus().toggleMark('bold').run()}
          >
            <FiBold size={16} />
          </button>
          <button
            className={`bubble-menu-button ${editor.isActive('italic') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleMark('italic').run()}
            disabled={!editor.can().chain().focus().toggleMark('italic').run()}
          >
            <FiItalic size={16} />
          </button>
          <button
            className={`bubble-menu-button ${editor.isActive('underline') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleMark('underline').run()}
            disabled={!editor.can().chain().focus().toggleMark('underline').run()}
          >
            <FiUnderline size={16} />
          </button>
          <button
            className={`bubble-menu-button ${editor.isActive('strike') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleMark('strike').run()}
            disabled={!editor.can().chain().focus().toggleMark('strike').run()}
          >
            <FiSlash size={16} />
          </button>
          <button
            className={`bubble-menu-button ${editor.isActive('code') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleMark('code').run()}
            disabled={!editor.can().chain().focus().toggleMark('code').run()}
          >
            <FiCode size={16} />
          </button>
          <button
            className={`bubble-menu-button ${editor.isActive('link') ? 'active' : ''}`}
            onClick={toggleLink}
          >
            <FiLink size={16} />
          </button>
          <div className="divider" />
          <button
            className={`bubble-menu-button ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
          >
            <FiAlignLeft size={16} />
          </button>
          <button
            className={`bubble-menu-button ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
          >
            <FiAlignCenter size={16} />
          </button>
          <button
            className={`bubble-menu-button ${editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
          >
            <FiAlignRight size={16} />
          </button>
          <button
            className={`bubble-menu-button ${editor.isActive({ textAlign: 'justify' }) ? 'active' : ''}`}
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          >
            <FiAlignJustify size={16} />
          </button>
          <div className="divider" />
          <CustomDropdown
            visible={showMoreOptions}
            onVisibleChange={setShowMoreOptions}
            trigger={
              <button className="bubble-menu-button">
                <FiMoreVertical size={16} />
              </button>
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
          </CustomDropdown>
        </div>
      </div>
    </BubbleMenu>
  )
}

export default EnhancedBubbleMenu