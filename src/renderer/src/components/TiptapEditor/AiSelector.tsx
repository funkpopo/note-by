import React, { useState } from 'react'
import { Editor } from '@tiptap/react'
import { Button, Dropdown, Toast } from '@douyinfe/semi-ui'
import { IconChevronDown } from '@douyinfe/semi-icons'
import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

// 自定义AI图标
const AiIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M12 2L13.5 8.5L20 7L14.5 12L20 17L13.5 15.5L12 22L10.5 15.5L4 17L9.5 12L4 7L10.5 8.5L12 2Z" 
      fill="currentColor"
    />
  </svg>
)

interface AiSelectorProps {
  editor: Editor
  modelId?: string
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

  const handleAiCommand = async (command: typeof AI_COMMANDS[0]) => {
    if (!editor || isLoading) return

    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to)

    if (!selectedText.trim()) {
      Toast.warning('请先选择要处理的文本')
      return
    }

    setIsLoading(true)
    try {
      // 获取用户配置的API信息
      const aiConfigs = await window.api.settings.get('AiApiConfigs')
      if (!aiConfigs || !Array.isArray(aiConfigs) || aiConfigs.length === 0) {
        Toast.error('请先在设置中配置AI API')
        setIsLoading(false)
        return
      }
      
      // 使用指定的模型或第一个配置
      const config = modelId 
        ? aiConfigs.find(c => c.id === modelId) 
        : aiConfigs[0]
      
      if (!config) {
        Toast.error('未找到指定的AI模型配置')
        setIsLoading(false)
        return
      }
      
      // 验证配置
      if (!config.apiKey || !config.apiUrl || !config.modelName) {
        Toast.error('AI API配置不完整，请检查设置')
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
      
      // 替换选中的文本
      editor.chain().focus().deleteSelection().insertContent(response).run()
      
      Toast.success(`${command.label}完成`)
    } catch (error) {
      console.error('AI处理失败:', error)
      Toast.error(`AI处理失败: ${(error as Error).message || '未知错误'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dropdown
      render={
        <Dropdown.Menu>
          {AI_COMMANDS.map((command) => (
            <Dropdown.Item
              key={command.value}
              onClick={() => handleAiCommand(command)}
              disabled={isLoading}
            >
              {command.label}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      }
      position="bottomLeft"
      trigger="click"
    >
      <Button
        size="small"
        type="tertiary"
        theme="solid"
        icon={<AiIcon />}
        suffix={<IconChevronDown />}
        loading={isLoading}
        disabled={isLoading}
      >
        AI
      </Button>
    </Dropdown>
  )
}

export default AiSelector