import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Editor } from '@tiptap/react'
import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'
import BounceSpinner from './BounceSpinner'

interface AiSelectorProps {
  editor: Editor
  modelId?: string
}

// Simple toast notification system
const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
  const toast = document.createElement('div')
  toast.className = `ai-toast ai-toast-${type}`
  toast.textContent = message
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 16px;
    border-radius: 8px;
    color: white;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
    max-width: 300px;
    word-wrap: break-word;
    ${type === 'success' ? 'background: #10b981;' : ''}
    ${type === 'error' ? 'background: #ef4444;' : ''}
    ${type === 'warning' ? 'background: #f59e0b;' : ''}
  `
  
  document.body.appendChild(toast)
  
  setTimeout(() => {
    toast.style.opacity = '1'
    toast.style.transform = 'translateX(0)'
  }, 10)
  
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateX(100%)'
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast)
      }
    }, 300)
  }, 3000)
}

interface CustomAiDropdownProps {
  visible: boolean
  onVisibleChange: (visible: boolean) => void
  trigger: React.ReactNode
  children: React.ReactNode
}

const CustomAiDropdown: React.FC<CustomAiDropdownProps> = ({ 
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
    <div className="ai-dropdown" style={{ position: 'relative' }}>
      <div
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation()
          onVisibleChange(!visible)
        }}
      >
        {trigger}
      </div>
      {visible && (
        <div
          ref={dropdownRef}
          className="ai-dropdown-menu"
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
            maxWidth: '180px',
            width: 'max-content',
            padding: '4px 0',
            backdropFilter: 'blur(12px)',
            animation: 'aiDropdownSlideIn 0.15s ease-out'
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

interface AiDropdownItemProps {
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
}

const AiDropdownItem: React.FC<AiDropdownItemProps> = ({ onClick, children, disabled = false }) => {
  return (
    <button
      className="ai-dropdown-item"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '10px 14px',
        border: 'none',
        background: 'transparent',
        textAlign: 'left',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        color: disabled ? 'var(--semi-color-text-2)' : 'var(--semi-color-text-0)',
        opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
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
      {children}
    </button>
  )
}

const AI_COMMANDS = [
  {
    label: '改进写作',
    value: 'improve',
    prompt: '请改进以下文本的写作质量，使其更加清晰、流畅和专业。只返回修改后的文本，不要添加任何解释或评论：'
  },
  {
    label: '简化内容',
    value: 'simplify',
    prompt: '请简化以下内容，使其更加简洁易懂。只返回简化后的文本，不要添加任何解释或评论：'
  },
  {
    label: '扩展内容',
    value: 'expand',
    prompt: '请扩展以下内容，添加更多详细信息和例子。只返回扩展后的文本，不要添加任何解释或评论：'
  },
  {
    label: '修正语法',
    value: 'grammar',
    prompt: '请修正以下文本的语法错误和表达问题。只返回修正后的文本，不要添加任何解释或评论：'
  },
  {
    label: '翻译成英文',
    value: 'translate-en',
    prompt: '请将以下中文内容翻译成英文。只返回翻译结果，不要添加任何解释或评论：'
  },
  {
    label: '翻译成中文',
    value: 'translate-zh',
    prompt: '请将以下英文内容翻译成中文。只返回翻译结果，不要添加任何解释或评论：'
  },
  {
    label: '总结要点',
    value: 'summarize',
    prompt: '请总结以下内容的主要要点。只返回总结结果，不要添加任何解释或评论：'
  },
  {
    label: '续写内容',
    value: 'continue',
    prompt: '请根据以下内容继续写作。只返回续写的内容，不要添加任何解释或评论：'
  }
]

const AiSelector: React.FC<AiSelectorProps> = ({ editor, modelId }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [dropdownVisible, setDropdownVisible] = useState(false)

  const handleAiCommand = async (command: typeof AI_COMMANDS[0]) => {
    if (!editor || isLoading) return

    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to)

    if (!selectedText.trim()) {
      showToast('请先选择要处理的文本', 'warning')
      setDropdownVisible(false)
      return
    }

    setIsLoading(true)
    setDropdownVisible(false)
    try {
      // 获取用户配置的API信息
      const aiConfigs = await window.api.settings.get('AiApiConfigs')
      if (!aiConfigs || !Array.isArray(aiConfigs) || aiConfigs.length === 0) {
        showToast('请先在设置中配置AI API', 'error')
        setIsLoading(false)
        return
      }
      
      // 使用指定的模型或第一个配置
      const config = modelId 
        ? aiConfigs.find(c => c.id === modelId) 
        : aiConfigs[0]
      
      if (!config) {
        showToast('未找到指定的AI模型配置', 'error')
        setIsLoading(false)
        return
      }
      
      // 验证配置
      if (!config.apiKey || !config.apiUrl || !config.modelName) {
        showToast('AI API配置不完整，请检查设置', 'error')
        setIsLoading(false)
        return
      }
      
      // 创建OpenAI客户端
      const openai = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.apiUrl,
      })
      
      // 构建提示
      const prompt = `${command.prompt}\n\n${selectedText}`
      
      // 调用AI API
      const { textStream } = await streamText({
        model: openai(config.modelName),
        messages: [{ role: 'user', content: prompt }],
        temperature: config.temperature ? parseFloat(config.temperature) : 0.7,
        maxTokens: config.maxTokens ? parseInt(config.maxTokens) : 2000,
      })
      
      // 收集AI响应
      let response = ''
      for await (const chunk of textStream) {
        response += chunk
      }
      
      // 替换选中的文本 - 使用事务安全的方式
      try {
        const success = editor.chain()
          .focus()
          .setTextSelection({ from, to })
          .insertContent(response)
          .run()
        
        if (!success) {
          throw new Error('编辑器命令执行失败')
        }
      } catch (editorError) {
        // 如果是编辑器事务错误，检查内容是否实际已经更新
        const originalText = editor.state.doc.textBetween(from, to)
        
        // 如果原始选中内容已经不存在（被替换了），说明操作成功
        if (originalText !== selectedText) {
          console.warn('编辑器事务警告（内容已正确更新）:', editorError)
          return // 内容已更新，忽略事务错误
        }
        
        // 如果内容没有更新，则重新抛出错误
        throw editorError
      }
      
      showToast(`${command.label}完成`, 'success')
    } catch (error) {
      console.error('AI处理失败:', error)
      showToast(`AI处理失败: ${(error as Error).message || '未知错误'}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <CustomAiDropdown
      visible={dropdownVisible}
      onVisibleChange={setDropdownVisible}
      trigger={
        <button
          className="ai-button bubble-menu-button"
          disabled={isLoading}
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white',
            fontWeight: '600',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
            minWidth: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 10px',
            borderRadius: '6px',
            border: 'none',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = 'linear-gradient(135deg, #5b56f1, #7c3aed)'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)'
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = 'linear-gradient(135deg, #6366f1, #8b5cf6)'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.3)'
            }
          }}
        >
          {isLoading ? '处理中' : 'AI'}
          {isLoading ? (
            <BounceSpinner className="ms-2" />
          ) : (
            dropdownVisible ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />
          )}
        </button>
      }
    >
      {AI_COMMANDS.map((command) => (
        <AiDropdownItem
          key={command.value}
          onClick={() => handleAiCommand(command)}
          disabled={isLoading}
        >
          {command.label}
        </AiDropdownItem>
      ))}
    </CustomAiDropdown>
  )
}

export default AiSelector