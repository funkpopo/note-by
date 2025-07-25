import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
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

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside)
      // 监听滚动和窗口大小变化
      const handleResize = () => adjustPosition()
      window.addEventListener('resize', handleResize)
      window.addEventListener('scroll', handleResize, true)

      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
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
  const bubbleMenuRef = useRef<HTMLDivElement>(null)
  
  // 边缘检测和动态定位
  const adjustBubbleMenuPosition = useCallback(() => {
    if (!bubbleMenuRef.current) return

    const bubbleMenu = bubbleMenuRef.current
    const editorWrapper = bubbleMenu.closest('.block-editor-wrapper')
    
    if (!editorWrapper) return

    const wrapperRect = editorWrapper.getBoundingClientRect()
    const menuRect = bubbleMenu.getBoundingClientRect()

    // 检查是否超出右边界
    if (menuRect.right > wrapperRect.right) {
      const overflow = menuRect.right - wrapperRect.right
      bubbleMenu.style.transform = `translateX(-${overflow + 8}px)`
    }

    // 检查是否超出左边界
    if (menuRect.left < wrapperRect.left) {
      const overflow = wrapperRect.left - menuRect.left
      bubbleMenu.style.transform = `translateX(${overflow + 8}px)`
    }
  }, [])

  useEffect(() => {
    // 监听bubble menu的显示
    const observer = new MutationObserver(() => {
      if (bubbleMenuRef.current && bubbleMenuRef.current.offsetParent) {
        // bubble menu变为可见时调整位置
        setTimeout(adjustBubbleMenuPosition, 0)
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

  return (
    <BubbleMenu 
      editor={editor} 
      options={{ 
        offset: 6,
        placement: 'top',
      }}
      shouldShow={({ from, to }) => {
        // Only show when there is a text selection
        return from !== to
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