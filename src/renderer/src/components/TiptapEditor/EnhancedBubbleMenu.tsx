import React, { useState, useRef, useEffect } from 'react'
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
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [visible, onVisibleChange])

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
            minWidth: '160px',
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
        color: 'var(--semi-color-text-0)'
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
      <div className="enhanced-bubble-menu">
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