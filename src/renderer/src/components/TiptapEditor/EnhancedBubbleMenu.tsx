import React, { useState } from 'react'
import { Editor } from '@tiptap/react'
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
  FiMoreVertical 
} from 'react-icons/fi'
import { Dropdown } from '@douyinfe/semi-ui'

interface EnhancedBubbleMenuProps {
  editor: Editor
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
  
  // Only show the bubble menu when there is a text selection
  if (!editor) return null

  return (
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
        <Dropdown
          visible={showMoreOptions}
          onVisibleChange={setShowMoreOptions}
          render={
            <Dropdown.Menu>
              <Dropdown.Item 
                onClick={() => editor.chain().focus().toggleList('bulletList', 'listItem').run()}
              >
                无序列表
              </Dropdown.Item>
              <Dropdown.Item 
                onClick={() => editor.chain().focus().toggleList('orderedList', 'listItem').run()}
              >
                有序列表
              </Dropdown.Item>
              <Dropdown.Item 
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
              >
                引用
              </Dropdown.Item>
              <Dropdown.Item 
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
              >
                分割线
              </Dropdown.Item>
              <Dropdown.Item 
                onClick={() => {
                  const url = window.prompt('图片地址:')
                  if (url) {
                    editor.chain().focus().setImage({ src: url }).run()
                  }
                }}
              >
                插入图片
              </Dropdown.Item>
            </Dropdown.Menu>
          }
          trigger="click"
          position="bottomLeft"
        >
          <button className="bubble-menu-button">
            <FiMoreVertical size={16} />
          </button>
        </Dropdown>
      </div>
    </div>
  )
}

export default EnhancedBubbleMenu