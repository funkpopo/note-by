import React, { useCallback, useEffect, useState, useRef } from 'react'
import ReactDOM from 'react-dom'
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
  position?: { top: number; left: number }
}

const SlashMenu: React.FC<SlashMenuProps> = ({ editor, isOpen, onClose, position }) => {
  const [commandFilter, setCommandFilter] = useState('')
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  
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
    // 先删除 "/" 字符
    const { selection } = editor.state
    const { $from } = selection
    const tr = editor.state.tr
    
    // 删除 "/" 字符
    if ($from.pos > 0) {
      tr.delete($from.pos - 1, $from.pos)
      editor.view.dispatch(tr)
    }
    
    // 执行命令
    command()
    onClose()
    setCommandFilter('')
  }, [editor, onClose])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        setCommandFilter('')
        setSelectedIndex(0)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prevIndex) => 
          (prevIndex + 1) % filteredCommands.length
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prevIndex) => 
          prevIndex === 0 ? filteredCommands.length - 1 : prevIndex - 1
        )
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          handleCommand(filteredCommands[selectedIndex].command)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, selectedIndex, filteredCommands, handleCommand])

  // 重置选中索引当过滤器改变时
  useEffect(() => {
    setSelectedIndex(0)
  }, [commandFilter])

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
        setCommandFilter('')
        setSelectedIndex(0)
      }
    }

    // 延迟添加事件监听器，避免立即触发
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen, onClose])

  // 计算菜单位置
  useEffect(() => {
    if (!isOpen || !menuRef.current || !position) return

    const menu = menuRef.current
    const menuRect = menu.getBoundingClientRect()
    const editorElement = editor.view.dom
    const editorRect = editorElement.getBoundingClientRect()
    
    // 获取编辑器的滚动容器
    const scrollContainer = editorElement.closest('.editor-content') || editorElement.parentElement
    const scrollTop = scrollContainer?.scrollTop || 0
    
    // 基础位置（光标下方）
    let top = position.top + 30 - scrollTop // 向下偏移30px避免遮挡当前行
    let left = position.left
    
    // 边缘检测
    // 右边界检测
    if (left + menuRect.width > editorRect.right) {
      left = editorRect.right - menuRect.width - 10
    }
    
    // 左边界检测
    if (left < editorRect.left) {
      left = editorRect.left + 10
    }
    
    // 下边界检测 - 如果菜单超出编辑器底部，显示在光标上方
    if (top + menuRect.height > editorRect.bottom) {
      top = position.top - menuRect.height - 10 - scrollTop
    }
    
    // 上边界检测
    if (top < editorRect.top) {
      top = editorRect.top + 10
    }
    
    setMenuPosition({ top, left })
  }, [isOpen, position, editor])

  if (!isOpen) return null

  const menuContent = (
    <div 
      ref={menuRef}
      className="slash-menu" 
      style={{
        position: 'fixed',
        top: `${menuPosition.top}px`,
        left: `${menuPosition.left}px`,
        zIndex: 1000
      }}>
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
            className={`slash-menu-item ${index === selectedIndex ? 'selected' : ''}`}
            onClick={() => handleCommand(item.command)}
            onMouseEnter={() => setSelectedIndex(index)}
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

  // 使用 Portal 渲染到 body
  return ReactDOM.createPortal(menuContent, document.body)
}

export default SlashMenu