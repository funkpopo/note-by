import React, { useState, useEffect, useCallback } from 'react'
import { Typography, Button, Toast, TextArea, Select, Chat, Space } from '@douyinfe/semi-ui'
import { IconSend } from '@douyinfe/semi-icons'
import { modelSelectionService, type AiApiConfig } from '../services/modelSelectionService'
import throttle from 'lodash.throttle'
import { filterThinkingContent } from '../utils/filterThinking'

const { Title, Text } = Typography

// Semi Design Chat组件的角色配置
const roleConfig = {
  user: {
    name: '用户'
  },
  assistant: {
    name: 'AI助手'
  },
  system: {
    name: '系统'
  }
}

// 消息类型定义 - 兼容Semi Design Chat组件
interface ChatMessage {
  id?: string | number
  role: 'user' | 'assistant' | 'system'
  content: string
  createAt: number
  status?: 'loading' | 'streaming' | 'incomplete' | 'complete' | 'error'
  name?: string
  parentId?: string
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [aiApiConfigs, setAiApiConfigs] = useState<AiApiConfig[]>([])
  const [selectedAiConfig, setSelectedAiConfig] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)

  // 流式响应状态管理
  const [currentStreamCleanup, setCurrentStreamCleanup] = useState<(() => void) | null>(null)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)

  // Chat组件强制刷新key
  const [chatKey, setChatKey] = useState<number>(0)

  // 保存最后一条用户消息，用于重发
  const [lastUserMessage, setLastUserMessage] = useState<ChatMessage | null>(null)

  // 节流更新
  const throttledUpdateRef = React.useRef<{
    (updater: React.SetStateAction<ChatMessage[]>): void
    cancel: () => void
  } | null>(null)

  useEffect(() => {
    // 初始化节流函数
    throttledUpdateRef.current = throttle(
      (updater) => {
        setMessages(updater)
      },
      150, // 每150ms最多执行一次
      { leading: true, trailing: true }
    )

    // 组件卸载时清理
    return () => {
      throttledUpdateRef.current?.cancel()
    }
  }, [])

  // 加载AI API配置
  const loadAiApiConfigs = useCallback(async () => {
    try {
      const configs = await modelSelectionService.getAvailableModels()
      setAiApiConfigs(configs)

      // 获取当前选中的模型ID
      const currentSelectedId = await modelSelectionService.getSelectedModelId()
      if (currentSelectedId && configs.some((config) => config.id === currentSelectedId)) {
        setSelectedAiConfig(currentSelectedId)
      } else if (configs.length > 0) {
        // 如果没有选中模型或选中的模型不存在，初始化默认模型
        await modelSelectionService.initializeDefaultModel()
        const newSelectedId = await modelSelectionService.getSelectedModelId()
        setSelectedAiConfig(newSelectedId)
      }
    } catch (error) {
      console.error('加载AI API配置失败:', error)
    }
  }, [])

  // Chat组件的清理上下文回调
  const handleClearContext = useCallback(() => {
    console.log('handleClearContext called') // 调试信息
    setMessages([])
    setLastUserMessage(null) // 清空最后一条用户消息
    // 如果正在生成，也要停止
    if (currentStreamCleanup) {
      currentStreamCleanup()
    }
    setIsGenerating(false)
    setIsLoading(false)
    setStreamingMessageId(null)
    setCurrentStreamCleanup(null)

    // 强制刷新Chat组件，确保状态完全清理
    setChatKey((prev) => prev + 1)

    Toast.success('会话已清空') // 添加成功提示
  }, [currentStreamCleanup])

  // 移除handleCopyMessage，Chat组件内置复制功能

  // 执行AI回复 - 流式响应版本
  const performAIResponse = useCallback(
    async (userContent: string, userMessageId?: string) => {
      try {
        // 获取选中的AI配置
        const aiConfig = aiApiConfigs.find((config) => config.id === selectedAiConfig)
        if (!aiConfig) {
          throw new Error('请先配置AI API')
        }

        // 记忆检索：尝试从记忆中获取相关信息来增强提示
        let enhancedPrompt = userContent
        try {
          const memoryConfigResult = await (window as any).api.memory.getConfig()
          if (memoryConfigResult.success && memoryConfigResult.config?.enabled) {
            // 搜索相关记忆
            const memorySearchResult = await (window as any).api.memory.searchMemories(
              userContent,
              'user',
              5
            )
            if (memorySearchResult.success && memorySearchResult.memories?.length > 0) {
              const relevantMemories = memorySearchResult.memories
                .map((memory) => `记忆：${memory.content}`)
                .join('\n')

              enhancedPrompt = `基于以下记忆内容回答用户问题：
${relevantMemories}

用户问题：${userContent}

请根据记忆内容提供个性化的回答，如果记忆内容与问题相关，请充分利用这些信息。`
            }
          }
        } catch (memoryError) {
          console.warn('Memory retrieval failed:', memoryError)
          // 记忆检索失败不影响正常对话
        }

        // 创建初始的流式消息
        const streamMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '',
          createAt: Date.now(),
          status: 'loading',
          parentId: userMessageId // 设置父消息ID
        }

        setMessages((prev) => [...prev, streamMessage])
        setStreamingMessageId(streamMessage.id?.toString() || null)

        // 调用流式AI API，使用增强的提示
        const streamResult = await window.api.openai.streamGenerateContent(
          {
            apiKey: aiConfig.apiKey,
            apiUrl: aiConfig.apiUrl,
            modelName: aiConfig.modelName,
            prompt: enhancedPrompt,
            maxTokens: parseInt(aiConfig.maxTokens || '2000')
          },
          {
            // 实时更新消息内容
            onData: (chunk: string) => {
              const updater = (prev: ChatMessage[]): ChatMessage[] => {
                const newMessages = [...prev]
                const messageIndex = newMessages.findIndex((msg) => msg.id === streamMessage.id)
                if (messageIndex !== -1) {
                  newMessages[messageIndex] = {
                    ...newMessages[messageIndex],
                    content: newMessages[messageIndex].content + chunk,
                    status: 'streaming'
                  }
                }
                return newMessages
              }
              throttledUpdateRef.current?.(updater)
            },

            // 流式完成处理
            onDone: (fullContent: string) => {
              // 取消任何待处理的节流更新
              throttledUpdateRef.current?.cancel()

              setMessages((prev) => {
                const newMessages = [...prev]
                const messageIndex = newMessages.findIndex((msg) => msg.id === streamMessage.id)
                if (messageIndex !== -1) {
                  newMessages[messageIndex] = {
                    ...newMessages[messageIndex],
                    content: filterThinkingContent(fullContent),
                    status: 'complete'
                  }
                }
                return newMessages
              })

              // 保存对话记忆（异步执行，不阻塞UI）
              setTimeout(async () => {
                try {
                  const memoryConfigResult = await (window as any).api.memory.getConfig()
                  if (memoryConfigResult.success && memoryConfigResult.config?.enabled) {
                    // 构建对话消息数组
                    const conversationMessages = [
                      { role: 'user' as const, content: userContent },
                      { role: 'assistant' as const, content: filterThinkingContent(fullContent) }
                    ]

                    // 构建元数据
                    const metadata = {
                      source: 'chat_conversation',
                      timestamp: new Date().toISOString(),
                      ai_config: aiConfig.name,
                      model: aiConfig.modelName
                    }

                    // 保存对话到记忆
                    await (window as any).api.memory.addConversation(
                      conversationMessages,
                      'user',
                      metadata
                    )
                  }
                } catch (memoryError) {
                  console.warn('Failed to save conversation to memory:', memoryError)
                }
              }, 100)

              // 清理状态
              setIsGenerating(false)
              setIsLoading(false)
              setStreamingMessageId(null)
              setCurrentStreamCleanup(null)
            },

            // 错误处理
            onError: (error: string) => {
              // 取消任何待处理的节流更新
              throttledUpdateRef.current?.cancel()

              setMessages((prev) => {
                const newMessages = [...prev]
                const messageIndex = newMessages.findIndex((msg) => msg.id === streamMessage.id)
                if (messageIndex !== -1) {
                  const currentContent = newMessages[messageIndex].content

                  // 使用实时的消息内容进行超时判断，而不是从旧的messages状态查找
                  const hasContent = currentContent && currentContent.trim().length > 0

                  // 只有在真正的错误时才显示错误提示，超时且有内容时不显示
                  if (!error.includes('请求超时') || !hasContent) {
                    Toast.error(`发送消息失败: ${error}`)
                  }

                  // 如果有内容且是超时错误，标记为完成而不是错误
                  if (hasContent && error.includes('请求超时')) {
                    newMessages[messageIndex] = {
                      ...newMessages[messageIndex],
                      content: filterThinkingContent(currentContent), // 在此过滤
                      status: 'complete'
                    }
                  } else {
                    // 其他错误情况
                    newMessages[messageIndex] = {
                      ...newMessages[messageIndex],
                      status: 'error',
                      content:
                        filterThinkingContent(newMessages[messageIndex].content || '') + // 在此过滤
                        `\n\n[错误: ${error}]`
                    }
                  }
                }
                return newMessages
              })

              // 清理状态
              setIsGenerating(false)
              setIsLoading(false)
              setStreamingMessageId(null)
              setCurrentStreamCleanup(null)
            }
          }
        )

        // 保存清理函数用于中断
        if (streamResult.success && streamResult.streamId) {
          // 流式请求成功启动，设置生成状态
          setIsGenerating(true)
          setIsLoading(false) // 流式开始后不再是loading状态
          console.log('流式请求启动成功，设置isGenerating为true，streamId:', streamResult.streamId) // 调试信息

          // 创建真正的清理函数，包含停止流式请求的API调用
          const cleanup = () => {
            // 调用停止流式请求的API
            if (streamResult.streamId) {
              window.api.openai.stopStreamGenerate(streamResult.streamId).catch((error) => {
                console.error('停止流式请求失败:', error)
              })
            }

            setIsGenerating(false)
            setIsLoading(false)
            setStreamingMessageId(null)
            setCurrentStreamCleanup(null)
            console.log('流式请求清理完成，设置isGenerating为false') // 调试信息
          }
          setCurrentStreamCleanup(() => cleanup)
        } else {
          console.log('流式请求启动失败') // 调试信息
        }
      } catch (error) {
        Toast.error(`发送消息失败: ${error instanceof Error ? error.message : String(error)}`)

        // 清理状态
        setIsGenerating(false)
        setIsLoading(false)
        setStreamingMessageId(null)
        setCurrentStreamCleanup(null)
      }
    },
    [aiApiConfigs, selectedAiConfig]
  )

  // 停止生成处理 - 真正的流式中断
  const handleStopGenerate = useCallback(() => {
    console.log('停止生成被调用，streamingMessageId:', streamingMessageId) // 调试信息

    // 调用流式请求的清理函数
    if (currentStreamCleanup) {
      currentStreamCleanup()
    }

    // 更新正在流式传输的消息状态
    if (streamingMessageId) {
      setMessages((prev) => {
        const newMessages = [...prev]
        const messageIndex = newMessages.findIndex(
          (msg) => msg.id?.toString() === streamingMessageId
        )
        if (messageIndex !== -1) {
          const currentMessage = newMessages[messageIndex]
          newMessages[messageIndex] = {
            ...currentMessage,
            content:
              currentMessage.content +
              (currentMessage.content ? '\n\n[生成已停止]' : '[生成已停止]'),
            status: 'incomplete'
          }
        }
        return newMessages
      })
    }

    // 清理所有状态
    setIsGenerating(false)
    setIsLoading(false)
    setStreamingMessageId(null)
    setCurrentStreamCleanup(null)

    Toast.info('已停止生成') // 添加用户提示
  }, [currentStreamCleanup, streamingMessageId])

  // 消息重置处理 - 重新发送上一条请求
  const handleMessageReset = useCallback(
    (message: any) => {
      console.log('消息重置被调用，消息:', message) // 调试信息

      // 检查是否有选中的AI配置
      if (!selectedAiConfig) {
        Toast.error('请先选择AI配置')
        return
      }

      // 如果正在生成，先停止
      if (isGenerating && currentStreamCleanup) {
        currentStreamCleanup()
      }

      try {
        // 方法1：通过parentId找到对应的用户消息
        if (message.parentId) {
          const parentMessage = messages.find((msg) => msg.id?.toString() === message.parentId)
          if (parentMessage && parentMessage.role === 'user') {
            // 移除当前AI消息
            setMessages((prev) => prev.filter((msg) => msg.id !== message.id))

            // 重新发送用户消息
            setIsLoading(true)
            performAIResponse(parentMessage.content, parentMessage.id?.toString())

            Toast.info('正在重新生成回复...')
            return
          }
        }

        // 方法2：如果没有parentId或找不到父消息，使用最后一条用户消息
        if (lastUserMessage) {
          // 移除当前AI消息
          setMessages((prev) => prev.filter((msg) => msg.id !== message.id))

          // 重新发送最后一条用户消息
          setIsLoading(true)
          performAIResponse(lastUserMessage.content, lastUserMessage.id?.toString())

          Toast.info('正在重新生成回复...')
          return
        }

        // 如果都找不到，提示错误
        Toast.error('无法找到对应的用户消息，无法重新生成')
      } catch (error) {
        console.error('消息重置失败:', error)
        Toast.error('重新生成失败，请稍后重试')
      }
    },
    [
      selectedAiConfig,
      isGenerating,
      currentStreamCleanup,
      messages,
      lastUserMessage,
      performAIResponse
    ]
  )

  // 消息删除处理 - 删除指定消息
  const handleMessageDelete = useCallback(
    (message: any) => {
      console.log('消息删除被调用，消息:', message) // 调试信息

      try {
        // 如果正在生成且删除的是正在生成的消息，先停止生成
        if (isGenerating && streamingMessageId === message.id?.toString() && currentStreamCleanup) {
          currentStreamCleanup()
        }

        setMessages((prev) => {
          let newMessages = [...prev]

          // 如果删除的是用户消息，同时删除对应的AI回复
          if (message.role === 'user') {
            // 找到所有以此用户消息为父消息的AI回复
            const relatedAIMessages = newMessages.filter(
              (msg) => msg.parentId === message.id?.toString()
            )

            // 删除用户消息和相关的AI回复
            newMessages = newMessages.filter(
              (msg) =>
                msg.id !== message.id && !relatedAIMessages.some((aiMsg) => aiMsg.id === msg.id)
            )

            // 如果删除的是最后一条用户消息，更新lastUserMessage
            if (lastUserMessage && lastUserMessage.id === message.id) {
              // 找到剩余消息中最后一条用户消息
              const remainingUserMessages = newMessages.filter((msg) => msg.role === 'user')
              setLastUserMessage(
                remainingUserMessages.length > 0
                  ? remainingUserMessages[remainingUserMessages.length - 1]
                  : null
              )
            }
          } else {
            // 如果删除的是AI消息，只删除该消息
            newMessages = newMessages.filter((msg) => msg.id !== message.id)
          }

          return newMessages
        })

        Toast.success('消息已删除')
      } catch (error) {
        console.error('消息删除失败:', error)
        Toast.error('删除消息失败，请稍后重试')
      }
    },
    [isGenerating, streamingMessageId, currentStreamCleanup, lastUserMessage]
  )

  // Semi Chat组件的消息发送处理
  const handleChatMessageSend = useCallback(
    (content: string, _attachment?: any[]) => {
      if (!content.trim() || isLoading) return

      // 检查是否有选中的AI配置
      if (!selectedAiConfig) {
        Toast.error('请先选择AI配置')
        return
      }

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: content.trim(),
        createAt: Date.now()
      }

      setMessages((prev) => [...prev, userMessage])
      setLastUserMessage(userMessage) // 保存最后一条用户消息

      setIsLoading(true)

      // 执行AI回复的逻辑，传递用户消息ID
      performAIResponse(userMessage.content, userMessage.id?.toString())
    },
    [isLoading, selectedAiConfig, performAIResponse]
  )

  // Chat组件的消息变化处理 - 禁用自动同步，避免重复消息
  const handleChatsChange = useCallback((_chats?: any[]) => {
    // 不处理Chat组件的消息变化，完全由我们手动控制消息状态
    // 这样可以避免Chat组件和手动状态更新的冲突
  }, [])

  // 自定义消息内容渲染
  const renderChatBoxContent = useCallback((props: any) => {
    const { defaultContent, className } = props

    return (
      <div
        className={className}
        style={{
          wordBreak: 'break-word',
          overflow: 'hidden',
          maxWidth: '100%'
        }}
      >
        {defaultContent}
      </div>
    )
  }, [])

  // 自定义输入区域渲染 - 集成配置选择
  const renderInputArea = useCallback(
    (props: any) => {
      const { onSend } = props

      // 处理发送消息，防止重复发送
      const handleSendMessage = () => {
        if (!inputValue.trim() || isLoading || !selectedAiConfig) return

        const content = inputValue.trim()
        setInputValue('') // 立即清空输入框，防止重复发送
        onSend(content)
      }

      // 处理键盘事件
      const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          handleSendMessage()
        }
      }

      return (
        <div
          style={{
            margin: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflow: 'hidden', // 防止输入区域溢出
            maxWidth: '100%'
          }}
        >
          {/* 输入框区域 */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              padding: '12px',
              border: '1px solid var(--semi-color-border)',
              borderRadius: '8px',
              backgroundColor: 'var(--semi-color-bg-2)',
              overflow: 'hidden', // 防止输入框溢出
              maxWidth: '100%'
            }}
          >
            <TextArea
              value={inputValue}
              onChange={(value: string) => setInputValue(value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Shift+Enter换行，Enter发送)"
              autosize={{ minRows: 1, maxRows: 4 }}
              style={{
                flex: 1,
                minWidth: 0, // 防止flex项目溢出
                maxWidth: '100%'
              }}
              disabled={isLoading}
            />
            <Button
              type="primary"
              icon={<IconSend />}
              onClick={handleSendMessage}
              loading={isLoading}
              disabled={!inputValue.trim() || !selectedAiConfig}
              style={{ flexShrink: 0 }} // 防止按钮被压缩
            >
              发送
            </Button>
          </div>
        </div>
      )
    },
    [inputValue, selectedAiConfig, isLoading]
  )

  useEffect(() => {
    loadAiApiConfigs()
  }, [loadAiApiConfigs])

  // 调试：监控isGenerating状态变化
  useEffect(() => {
    console.log('isGenerating状态变化:', isGenerating, '当前时间:', new Date().toLocaleTimeString())
  }, [isGenerating])

  // 弹出层边缘检测和位置调整
  useEffect(() => {
    const adjustPopoverPosition = () => {
      const portals = document.querySelectorAll('.semi-portal-inner')

      portals.forEach((portal) => {
        const rect = portal.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        // 检查是否超出右边界
        if (rect.right > viewportWidth - 16) {
          ;(portal as HTMLElement).style.left = `${viewportWidth - rect.width - 16}px`
        }

        // 检查是否超出左边界
        if (rect.left < 16) {
          ;(portal as HTMLElement).style.left = '16px'
        }

        // 检查是否超出底部边界
        if (rect.bottom > viewportHeight - 16) {
          ;(portal as HTMLElement).style.top = `${viewportHeight - rect.height - 16}px`
        }

        // 检查是否超出顶部边界
        if (rect.top < 16) {
          ;(portal as HTMLElement).style.top = '16px'
        }
      })
    }

    // 监听弹出层的出现
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element
              if (
                element.classList.contains('semi-portal-inner') ||
                element.querySelector('.semi-portal-inner')
              ) {
                // 延迟调整位置，确保元素已完全渲染
                setTimeout(adjustPopoverPosition, 10)
              }
            }
          })
        }
      })
    })

    // 开始观察document.body的变化
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    // 也监听窗口大小变化
    window.addEventListener('resize', adjustPopoverPosition)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', adjustPopoverPosition)
    }
  }, [])

  // 移除scrollToBottom useEffect，Chat组件会自动处理滚动

  return (
    <div
      className="chat-interface-container"
      style={{
        height: '100%', // 使用全部可用高度
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden', // 防止整体溢出
        minHeight: 0 // 确保flex收缩正常工作
      }}
    >
      {/* 标题和设置区域 */}
      <div
        className="chat-header"
        style={{ marginBottom: '8px', flexShrink: 0, padding: '8px 16px 0' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Title heading={2} style={{ margin: 0 }}>
            AI 对话
          </Title>
          <Space>
            {aiApiConfigs.length > 0 ? (
              <Select
                value={selectedAiConfig}
                onChange={async (value) => {
                  const modelId = value as string
                  setSelectedAiConfig(modelId)
                  try {
                    await modelSelectionService.setSelectedModelId(modelId)
                  } catch (error) {
                    console.error('保存选中模型失败:', error)
                    Toast.error('保存模型选择失败')
                  }
                }}
                style={{ width: 150 }}
                placeholder="选择AI模型"
              >
                {aiApiConfigs.filter((config: any) => (config.type?.toLowerCase?.() === 'llm')).map((config) => (
                  <Select.Option key={config.id} value={config.id}>
                    {config.name}
                  </Select.Option>
                ))}
              </Select>
            ) : (
              <Text type="warning" size="small">
                暂无AI配置
              </Text>
            )}
          </Space>
        </div>
      </div>

      {/* 对话区域 - 使用Semi Design Chat组件 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          minHeight: 0, // 确保flex收缩正常工作
          overflow: 'hidden', // 防止子元素溢出
          padding: '0 8px' // 保留左右边距和少量底部边距
        }}
      >
        {/* 主对话区域 */}
        <div
          style={{
            flex: 1,
            minWidth: 0, // 防止flex项目溢出
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Chat
            key={chatKey} // 添加key支持强制刷新
            chats={messages as any}
            roleConfig={roleConfig}
            onChatsChange={handleChatsChange}
            onMessageSend={handleChatMessageSend}
            onMessageReset={handleMessageReset} // 添加消息重置回调
            onMessageDelete={handleMessageDelete} // 添加消息删除回调
            onStopGenerator={handleStopGenerate}
            showStopGenerate={isGenerating}
            showClearContext={false}
            onClear={handleClearContext} // 添加清理上下文回调
            mode="noBubble" // 使用非气泡模式
            align="leftAlign" // 左对齐布局
            chatBoxRenderConfig={{
              renderChatBoxContent: renderChatBoxContent,
              renderChatBoxAvatar: () => null // 不显示头像
            }}
            renderInputArea={renderInputArea}
            style={{
              height: '100%',
              width: '100%',
              maxWidth: 'none',
              border: '1px solid var(--semi-color-border)',
              borderRadius: '8px',
              overflow: 'hidden', // 防止Chat组件内容溢出
              display: 'flex',
              flexDirection: 'column',
              margin: 0, // 移除任何默认margin以最大化空间利用
              padding: 0 // 移除任何默认padding
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default ChatInterface
