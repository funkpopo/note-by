import React, { useCallback, useEffect, useState } from 'react'
import { 
  FiBold, 
  FiItalic, 
  FiUnderline, 
  FiHash, 
  FiList, 
  FiMessageSquare, 
  FiImage, 
  FiCode, 
  FiLink 
} from 'react-icons/fi'
import { Editor } from '@tiptap/react'

interface SlashMenuProps {
  editor: Editor
  isOpen: boolean
  onClose: () => void
  onOpen: () => void
}

const SlashMenu: React.FC<SlashMenuProps> = ({ editor, isOpen, onClose }) => {
  const [commandFilter, setCommandFilter] = useState('')
  
  const commands = [
    {
      name: 'Heading 1',
      icon: <FiHash />,
      command: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      description: '大标题'
    },
    {
      name: 'Heading 2',
      icon: <FiHash />,
      command: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      description: '中标题'
    },
    {
      name: 'Heading 3',
      icon: <FiHash />,
      command: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      description: '小标题'
    },
    {
      name: 'Bold',
      icon: <FiBold />,
      command: () => editor.chain().focus().toggleMark('bold').run(),
      description: '粗体'
    },
    {
      name: 'Italic',
      icon: <FiItalic />,
      command: () => editor.chain().focus().toggleMark('italic').run(),
      description: '斜体'
    },
    {
      name: 'Underline',
      icon: <FiUnderline />,
      command: () => editor.chain().focus().toggleMark('underline').run(),
      description: '下划线'
    },
    {
      name: 'Bullet List',
      icon: <FiList />,
      command: () => editor.chain().focus().toggleBulletList().run(),
      description: '无序列表'
    },
    {
      name: 'Ordered List',
      icon: <FiList />,
      command: () => editor.chain().focus().toggleOrderedList().run(),
      description: '有序列表'
    },
    {
      name: 'Quote',
      icon: <FiMessageSquare />,
      command: () => editor.chain().focus().toggleBlockquote().run(),
      description: '引用'
    },
    {
      name: 'Code Block',
      icon: <FiCode />,
      command: () => editor.chain().focus().toggleCodeBlock().run(),
      description: '代码块'
    },
    {
      name: 'Image',
      icon: <FiImage />,
      command: () => {
        const url = prompt('请输入图片链接')
        if (url) {
          editor.chain().focus().setImage({ src: url }).run()
        }
      },
      description: '插入图片'
    },
    {
      name: 'Link',
      icon: <FiLink />,
      command: () => {
        const url = prompt('请输入链接地址')
        if (url) {
          editor.chain().focus().setLink({ href: url }).run()
        }
      },
      description: '插入链接'
    }
  ]

  const filteredCommands = commands.filter(command => 
    command.name.toLowerCase().includes(commandFilter.toLowerCase()) ||
    command.description.toLowerCase().includes(commandFilter.toLowerCase())
  )

  const handleCommand = useCallback((command: () => void) => {
    command()
    onClose()
    setCommandFilter('')
  }, [onClose])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        setCommandFilter('')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="slash-menu">
      <div className="slash-menu-search">
        <input
          type="text"
          placeholder="输入命令..."
          value={commandFilter}
          onChange={(e) => setCommandFilter(e.target.value)}
          autoFocus
        />
      </div>
      <div className="slash-menu-items">
        {filteredCommands.map((item, index) => (
          <button
            key={index}
            className="slash-menu-item"
            onClick={() => handleCommand(item.command)}
          >
            <div className="slash-menu-item-icon">
              {item.icon}
            </div>
            <div className="slash-menu-item-content">
              <div className="slash-menu-item-name">{item.name}</div>
              <div className="slash-menu-item-description">{item.description}</div>
            </div>
          </button>
        ))}
        {filteredCommands.length === 0 && (
          <div className="slash-menu-no-results">
            未找到匹配的命令
          </div>
        )}
      </div>
    </div>
  )
}

export default SlashMenu