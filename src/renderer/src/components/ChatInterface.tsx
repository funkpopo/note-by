import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ChatMessage } from '../../../main/database'
import {
  Typography,
  Button,
  Toast,
  TextArea,
  Select,
  Space,
  Spin,
  Dropdown,
  Card
} from '@douyinfe/semi-ui'
import {
  IconSend,
  IconStop,
  IconRefresh,
  IconMore,
  IconCopy,
  IconDelete,
  IconHistory
} from '@douyinfe/semi-icons'
import { modelSelectionService, type AiApiConfig } from '../services/modelSelectionService'
import throttle from 'lodash.throttle'
import { processThinkingContent, stripThinkingForStreaming } from '../utils/filterThinking'
import MessageRenderer from './MessageRenderer'
import './ChatInterface.css'
import ChatHistorySidebar from './ChatHistorySidebar'
import { ChatSkeleton } from './Skeleton'
import { zhCN } from '../locales/zh-CN'
import { enUS } from '../locales/en-US'

const { Text } = Typography

// 获取当前语言设置
const getCurrentLanguage = (): 'zh-CN' | 'en-US' => {
  return (localStorage.getItem('app-language') as 'zh-CN' | 'en-US') || 'zh-CN'
}

// 获取翻译文本
const getTranslations = (): typeof zhCN => {
  const lang = getCurrentLanguage()
  return lang === 'zh-CN' ? zhCN : enUS
}

// 自定义消息气泡组件
const MessageBubbleCustom: React.FC<{
  message: ChatMessage
  onRetry?: (message: ChatMessage) => void
  onDelete?: (message: ChatMessage) => void
  isLast?: boolean
  selectedAiConfig: string
  aiApiConfigs: AiApiConfig[]
}> = ({ message, onRetry, onDelete, isLast, selectedAiConfig, aiApiConfigs }) => {
  const t = getTranslations()
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  // 获取AI模型名称首字母
  const getAiModelInitial = () => {
    if (!isAssistant) return ''
    const aiConfig = aiApiConfigs.find((config) => config.id === selectedAiConfig)
    return aiConfig?.name?.charAt(0)?.toUpperCase() || 'AI'
  }

  const handleCopy = () => {
    const { displayText } = processThinkingContent(message.content)
    navigator.clipboard.writeText(displayText || message.content)
    Toast.success(t.chat?.notifications.copied || '已复制到剪贴板')
  }

  const dropdownItems = [
    {
      node: 'item' as const,
      key: 'copy',
      name: t.chat?.actions.copy || '复制',
      icon: <IconCopy />,
      onClick: handleCopy
    },
    ...(isAssistant && onRetry
      ? [
          {
            node: 'item' as const,
            key: 'retry',
            name: t.chat?.actions.retry || '重新生成',
            icon: <IconRefresh />,
            onClick: () => onRetry(message)
          }
        ]
      : []),
    ...(onDelete
      ? [
          {
            node: 'item' as const,
            key: 'delete',
            name: t.chat?.actions.delete || '删除',
            icon: <IconDelete />,
            onClick: () => onDelete(message),
            type: 'danger' as const
          }
        ]
      : [])
  ]

  const getStatusIndicator = () => {
    switch (message.status) {
      case 'loading':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
            <Spin size="small" />
            <Text size="small" type="tertiary">
              {t.chat?.messages.statusIndicator.loading || '正在思考中...'}
            </Text>
          </div>
        )
      case 'streaming':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                background: 'var(--semi-color-primary)',
                borderRadius: '50%',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}
            />
            <Text size="small" type="tertiary">
              {t.chat?.messages.statusIndicator.streaming || 'AI正在思考...'}
            </Text>
          </div>
        )
      case 'incomplete':
        return (
          <div style={{ marginTop: '12px' }}>
            <Text size="small" type="warning">
              {t.chat?.messages.statusIndicator.incomplete || '⚠️ 生成被中断'}
            </Text>
          </div>
        )
      case 'error':
        return (
          <div style={{ marginTop: '12px' }}>
            <Text size="small" type="danger">
              {t.chat?.messages.statusIndicator.error || '❌ 生成出错'}
            </Text>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div
      style={{
        marginBottom: isLast ? '8px' : '32px',
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        gap: '16px',
        alignItems: 'flex-start'
      }}
    >
      {/* 头像 - 改为文字显示 */}
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: isUser
            ? 'linear-gradient(135deg, var(--semi-color-primary) 0%, var(--semi-color-primary-light-active) 100%)'
            : 'linear-gradient(135deg, var(--semi-color-success) 0%, var(--semi-color-success-light-active) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '14px',
          fontWeight: '600',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}
      >
        {isUser ? '我' : getAiModelInitial()}
      </div>

      {/* 消息内容 */}
      <div
        style={{
          flex: 1,
          maxWidth: 'calc(100% - 80px)',
          minWidth: 0,
          position: 'relative'
        }}
        onMouseEnter={(e) => {
          // 显示快速操作按钮组
          const quickActions = e.currentTarget.querySelector('.quick-actions') as HTMLElement
          if (quickActions) {
            quickActions.style.opacity = '1'
          }
        }}
        onMouseLeave={(e) => {
          // 隐藏快速操作按钮组
          const quickActions = e.currentTarget.querySelector('.quick-actions') as HTMLElement
          if (quickActions) {
            quickActions.style.opacity = '0'
          }
        }}
      >
        {/* 消息内容 */}
        <Card
          className={isUser ? 'chat-user-bubble' : 'chat-ai-bubble'}
          style={{
            background: isUser
              ? 'linear-gradient(135deg, var(--semi-color-primary) 0%, var(--semi-color-primary-light-active) 100%)' // will be overridden by CSS for user bubble
              : 'var(--semi-color-bg-2)',
            border: isUser ? 'none' : '1px solid var(--semi-color-border)',
            borderRadius: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            padding: '0',
            position: 'relative'
          }}
          bodyStyle={{
            padding: '16px 20px',
            color: isUser ? 'white' : 'var(--semi-color-text-0)'
          }}
        >
          {/* 快速操作按钮组 - 仅对AI消息显示 */}
          {isAssistant && (
            <div
              className="quick-actions"
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                display: 'flex',
                gap: '4px',
                opacity: 0,
                transition: 'opacity 0.2s ease',
                zIndex: 10
              }}
            >
              {/* 刷新重发按钮 */}
              {onRetry && (
                <Button
                  icon={<IconRefresh />}
                  type="tertiary"
                  theme="borderless"
                  size="small"
                  onClick={() => onRetry(message)}
                  style={{
                    borderRadius: '6px',
                    padding: '4px',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--semi-color-bg-0)',
                    color: 'var(--semi-color-text-1)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      'var(--semi-color-success-light-default)'
                    e.currentTarget.style.color = 'var(--semi-color-success)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--semi-color-bg-0)'
                    e.currentTarget.style.color = 'var(--semi-color-text-1)'
                  }}
                />
              )}

              {/* 快速复制按钮 */}
              <Button
                icon={<IconCopy />}
                type="tertiary"
                theme="borderless"
                size="small"
                onClick={handleCopy}
                style={{
                  borderRadius: '6px',
                  padding: '4px',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--semi-color-bg-0)',
                  color: 'var(--semi-color-text-1)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--semi-color-primary-light-default)'
                  e.currentTarget.style.color = 'var(--semi-color-primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--semi-color-bg-0)'
                  e.currentTarget.style.color = 'var(--semi-color-text-1)'
                }}
              />
            </div>
          )}

          {isUser ? (
            <div
              className="chat-bubble-content chat-user-message-content"
              style={{
                fontSize: '15px',
                lineHeight: '1.6',
                wordBreak: 'break-word'
              }}
            >
              {message.content}
            </div>
          ) : (
            <MessageRenderer
              key={`${message.id}-${message.status === 'complete' ? 'final' : 'live'}`}
              className="chat-bubble-content chat-ai-message-content"
              content={
                message.status === 'complete'
                  ? message.content || ''
                  : stripThinkingForStreaming(message.content || '')
              }
              style={{
                color: 'inherit',
                fontSize: '15px',
                lineHeight: '1.7'
              }}
            />
          )}

          {getStatusIndicator()}
        </Card>

        {/* 时间和操作 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isUser ? 'flex-end' : 'flex-start',
            marginTop: '8px',
            gap: '12px'
          }}
        >
          <Text size="small" type="tertiary">
            {new Date(message.createdAt).toLocaleTimeString()}
          </Text>

          <Dropdown trigger="click" menu={dropdownItems} position="bottomLeft">
            <Button
              icon={<IconMore />}
              type="tertiary"
              theme="borderless"
              size="small"
              style={{
                opacity: 0.5,
                transition: 'all 0.2s',
                borderRadius: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1'
                e.currentTarget.style.background = 'var(--semi-color-fill-0)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.5'
                e.currentTarget.style.background = 'transparent'
              }}
            />
          </Dropdown>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}

const ChatInterface: React.FC = () => {
  const t = getTranslations()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [aiApiConfigs, setAiApiConfigs] = useState<AiApiConfig[]>([])
  const [selectedAiConfig, setSelectedAiConfig] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)

  // 对话历史相关状态
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false)
  const [unsavedMessages, setUnsavedMessages] = useState<Set<string>>(new Set())

  // 流式响应状态管理
  const [currentStreamCleanup, setCurrentStreamCleanup] = useState<(() => void) | null>(null)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)

  // 保存最后一条用户消息，用于重发
  const [lastUserMessage, setLastUserMessage] = useState<ChatMessage | null>(null)

  // 消息容器引用，用于自动滚动
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // 节流更新
  const throttledUpdateRef = React.useRef<{
    (updater: React.SetStateAction<ChatMessage[]>): void
    cancel: () => void
  } | null>(null)

  useEffect(() => {
    // 初始化节流函数 - 减少节流间隔，提高流式显示流畅度
    throttledUpdateRef.current = throttle(
      (updater) => {
        setMessages(updater)
      },
      50, // 减少到50ms，提高响应性
      { leading: true, trailing: true }
    )

    // 组件卸载时清理
    return () => {
      throttledUpdateRef.current?.cancel()
    }
  }, [])

  // 加载指定会话的消息
  const loadSessionMessages = useCallback(
    async (sessionId: string) => {
      try {
        const sessionMessages = await window.api.chat.getSessionMessages(sessionId)
        // 加载会话消息: sessionId, sessionMessages
        setMessages(sessionMessages)
        setCurrentSessionId(sessionId)
        setUnsavedMessages(new Set())
      } catch (error) {
        console.error('加载会话消息失败:', error)
        Toast.error(t.chat?.history.loadFailed || '加载对话失败')
      }
    },
    [t]
  )

  // 保存消息到数据库
  const saveMessageToDatabase = useCallback(
    async (message: ChatMessage) => {
      if (!currentSessionId) {
        // 无法保存消息：当前会话ID为空
        return
      }

      try {
        const saveResult = await window.api.chat.saveMessage({
          ...message,
          sessionId: currentSessionId,
          createdAt: message.createdAt // Ensure correct property name
        })

        if (saveResult) {
          // 从未保存集合中移除
          setUnsavedMessages((prev) => {
            const newSet = new Set(prev)
            newSet.delete(message.id.toString())
            return newSet
          })
        } else {
          console.error('保存消息失败: API返回false')
          // 将消息ID添加到未保存集合
          setUnsavedMessages((prev) => new Set(prev).add(message.id.toString()))
        }
      } catch (error) {
        console.error('保存消息失败:', error)
        // 将消息ID添加到未保存集合
        setUnsavedMessages((prev) => new Set(prev).add(message.id.toString()))
      }
    },
    [currentSessionId]
  )

  // 自动保存未保存的消息
  useEffect(() => {
    if (unsavedMessages.size === 0) return

    const saveUnsavedMessages = async () => {
      const messagesToSave = messages.filter((msg) => unsavedMessages.has(msg.id.toString()))

      for (const message of messagesToSave) {
        await saveMessageToDatabase(message)
      }
    }

    const timeoutId = setTimeout(saveUnsavedMessages, 1000)
    return () => clearTimeout(timeoutId)
  }, [unsavedMessages, messages, saveMessageToDatabase])

  // 组件加载时自动加载数据库最后一条对话
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const sessions = await window.api.chat.getSessions()
        if (sessions && sessions.length > 0) {
          const lastSession = sessions[0] // 已按updated_at DESC排序
          const msgs = await window.api.chat.getSessionMessages(lastSession.id)
          setCurrentSessionId(lastSession.id)
          setMessages(msgs)
          setUnsavedMessages(new Set())
          localStorage.setItem('lastSessionId', lastSession.id)
        } else {
          setCurrentSessionId(null)
          setMessages([])
          setUnsavedMessages(new Set())
        }
      } catch {
        setCurrentSessionId(null)
        setMessages([])
        setUnsavedMessages(new Set())
      } finally {
        setIsInitializing(false)
      }
    }
    initializeSession()
  }, [])

  // 切换会话时持久化 sessionId
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem('lastSessionId', currentSessionId)
    }
  }, [currentSessionId])

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [])

  // 监听消息变化，自动滚动
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

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

  // 构建对话历史上下文
  const buildConversationContext = useCallback(
    (userContent: string): string => {
      // 获取最近的几条消息作为上下文（通常是最后5-10条）
      const contextMessages = messages.slice(-5) // 使用最后5条消息作为上下文

      // 构建上下文字符串
      let context = ''
      contextMessages.forEach((msg) => {
        const role = msg.role === 'user' ? '用户' : '助手'
        context += `${role}: ${msg.content}\n\n`
      })

      // 添加当前用户消息
      context += `用户: ${userContent}\n\n助手:`

      return context
    },
    [messages]
  )

  // 执行AI回复 - 流式响应版本（带上下文）
  const performAIResponse = useCallback(
    async (userContent: string, userMessageId?: string, sessionId?: string) => {
      try {
        // 获取选中的AI配置
        const aiConfig = aiApiConfigs.find((config) => config.id === selectedAiConfig)
        if (!aiConfig) {
          throw new Error(t.chat?.notifications.selectModel || '请先配置AI API')
        }

        // 使用传入的sessionId或当前会话ID
        const activeSessionId = sessionId || currentSessionId
        if (!activeSessionId) {
          throw new Error(t.chat?.notifications.saveFailed || '没有活动的会话')
        }

        // 构建带有上下文的提示
        const contextualPrompt = buildConversationContext(userContent)

        // 创建初始的流式消息
        const streamMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sessionId: activeSessionId,
          role: 'assistant',
          content: '',
          createdAt: Date.now(),
          status: 'loading',
          parentId: userMessageId // 设置父消息ID
        }

        setMessages((prev) => [...prev, streamMessage])
        setStreamingMessageId(streamMessage.id?.toString() || null)

        // 标记AI消息为待保存
        setUnsavedMessages((prev) => new Set(prev).add(streamMessage.id.toString()))

        // 调用流式AI API，使用带上下文的提示
        const streamResult = await window.api.openai.streamGenerateContent(
          {
            apiKey: aiConfig.apiKey,
            apiUrl: aiConfig.apiUrl,
            modelName: aiConfig.modelName,
            prompt: contextualPrompt, // 使用带上下文的提示
            maxTokens: parseInt(aiConfig.maxTokens || '2000')
          },
          {
            // 实时更新消息内容 - 优化流式显示
            onData: (chunk: string) => {
              const updater = (prev: ChatMessage[]): ChatMessage[] => {
                const newMessages = [...prev]
                const messageIndex = newMessages.findIndex((msg) => msg.id === streamMessage.id)
                if (messageIndex !== -1) {
                  const currentMessage = newMessages[messageIndex]
                  // 确保内容连续性，避免丢失
                  const newContent = currentMessage.content + chunk
                  newMessages[messageIndex] = {
                    ...currentMessage,
                    content: newContent,
                    status: 'streaming'
                  }
                }
                return newMessages
              }
              // 使用节流更新，但确保最后的内容不会丢失
              throttledUpdateRef.current?.(updater)
            },

            // 流式完成处理 - 保留完整内容，让MessageRenderer处理思维内容
            onDone: async (fullContent: string) => {
              // 立即取消任何待处理的节流更新
              throttledUpdateRef.current?.cancel()

              // 立即更新最终内容，不使用节流，保留完整内容
              setMessages((prev) => {
                const newMessages = [...prev]
                const messageIndex = newMessages.findIndex((msg) => msg.id === streamMessage.id)
                if (messageIndex !== -1) {
                  newMessages[messageIndex] = {
                    ...newMessages[messageIndex],
                    content: fullContent, // 保留完整内容，包括思维部分
                    status: 'complete'
                  }
                }
                return newMessages
              })

              // 保存完成的AI消息到数据库
              if (activeSessionId) {
                try {
                  await window.api.chat.saveMessage({
                    id: streamMessage.id,
                    sessionId: activeSessionId,
                    role: 'assistant',
                    content: fullContent,
                    status: 'complete',
                    parentId: userMessageId,
                    createdAt: streamMessage.createdAt
                  })
                  // 从未保存集合中移除
                  setUnsavedMessages((prev) => {
                    const newSet = new Set(prev)
                    newSet.delete(streamMessage.id.toString())
                    return newSet
                  })
                } catch (error) {
                  console.error('保存AI消息失败:', error)
                }
              }

              // 清理状态
              setIsGenerating(false)
              setIsLoading(false)
              setStreamingMessageId(null)
              setCurrentStreamCleanup(null)
            },

            // 错误处理 - 优化超时和内容保留，保留完整内容
            onError: async (error: string) => {
              // 立即取消任何待处理的节流更新
              throttledUpdateRef.current?.cancel()

              // 立即更新错误状态，不使用节流
              setMessages((prev) => {
                const newMessages = [...prev]
                const messageIndex = newMessages.findIndex((msg) => msg.id === streamMessage.id)
                if (messageIndex !== -1) {
                  const currentMessage = newMessages[messageIndex]
                  const currentContent = currentMessage.content

                  // 使用实时的消息内容进行超时判断
                  const hasContent = currentContent && currentContent.trim().length > 0

                  // 只有在真正的错误时才显示错误提示
                  if (!error.includes('请求超时') || !hasContent) {
                    Toast.error(`发送消息失败: ${error}`)
                  }

                  // 如果有内容且是超时错误，标记为完成而不是错误
                  if (hasContent && error.includes('请求超时')) {
                    newMessages[messageIndex] = {
                      ...currentMessage,
                      content: currentContent, // 保留完整内容，包括思维部分
                      status: 'complete'
                    }
                  } else {
                    // 其他错误情况
                    newMessages[messageIndex] = {
                      ...currentMessage,
                      status: 'error',
                      content: (currentContent || '') + `\n\n[错误: ${error}]` // 保留原始内容
                    }
                  }
                }
                return newMessages
              })

              // 保存消息到数据库（即使是错误状态）
              if (activeSessionId) {
                try {
                  const messages = await new Promise<ChatMessage[]>((resolve) => {
                    setMessages((prev) => {
                      resolve(prev)
                      return prev
                    })
                  })
                  const finalMessage = messages.find((msg) => msg.id === streamMessage.id)
                  if (finalMessage) {
                    await window.api.chat.saveMessage({
                      id: streamMessage.id,
                      sessionId: activeSessionId,
                      role: 'assistant',
                      content: finalMessage.content,
                      status: finalMessage.status,
                      parentId: userMessageId,
                      createdAt: streamMessage.createdAt
                    })
                    // 从未保存集合中移除
                    setUnsavedMessages((prev) => {
                      const newSet = new Set(prev)
                      newSet.delete(streamMessage.id.toString())
                      return newSet
                    })
                  }
                } catch (saveError) {
                  console.error('保存AI消息失败:', saveError)
                }
              }

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

          // 创建真正的清理函数
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
          }
          setCurrentStreamCleanup(() => cleanup)
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
    [aiApiConfigs, selectedAiConfig, buildConversationContext, currentSessionId, t]
  )

  // 发送消息
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading || !selectedAiConfig) return

    // 检查是否有选中的AI配置
    if (!selectedAiConfig) {
      Toast.error(t.chat?.notifications.selectModel || '请先选择AI配置')
      return
    }

    // 确保有当前会话ID，如果没有则创建新会话
    let sessionId = currentSessionId
    if (!sessionId) {
      sessionId = await window.api.chat.createSession()
      if (sessionId) {
        setCurrentSessionId(sessionId)
        localStorage.setItem('lastSessionId', sessionId)
      } else {
        Toast.error(t.chat?.notifications.saveFailed || '创建会话失败')
        return
      }
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sessionId: sessionId,
      role: 'user',
      content: inputValue.trim(),
      createdAt: Date.now()
    }

    setMessages((prev) => [...prev, userMessage])
    setLastUserMessage(userMessage) // 保存最后一条用户消息
    setInputValue('') // 清空输入框
    setIsLoading(true)

    // 立即保存用户消息到数据库
    try {
      await window.api.chat.saveMessage({
        id: userMessage.id,
        sessionId: sessionId,
        role: 'user',
        content: userMessage.content,
        status: 'complete',
        createdAt: userMessage.createdAt
      })
    } catch (error) {
      console.error('保存用户消息失败:', error)
    }

    // 执行AI回复
    performAIResponse(userMessage.content, userMessage.id?.toString(), sessionId)
  }, [inputValue, isLoading, selectedAiConfig, currentSessionId, performAIResponse, t])

  // 停止生成
  const handleStopGenerate = useCallback(() => {
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

    Toast.info(t.chat?.notifications.stopped || '已停止生成')
  }, [currentStreamCleanup, streamingMessageId])

  // 处理会话删除
  const handleSessionDeleted = useCallback(
    (deletedSessionId: string) => {
      if (currentSessionId === deletedSessionId) {
        // 当前会话被删除，清空界面并创建新会话
        setCurrentSessionId(null)
        setMessages([])
        setLastUserMessage(null)
        setUnsavedMessages(new Set())
        localStorage.removeItem('lastSessionId')
      }
    },
    [currentSessionId]
  )

  // 创建新的聊天会话
  const createNewSession = useCallback(async () => {
    try {
      const newSessionId = await window.api.chat.createSession()
      if (newSessionId) {
        setCurrentSessionId(newSessionId)
        setMessages([])
        setLastUserMessage(null)
        setUnsavedMessages(new Set())
        localStorage.setItem('lastSessionId', newSessionId)
        return newSessionId
      }
    } catch (error) {
      console.error('创建新会话失败:', error)
      Toast.error('创建新会话失败')
    }
    return null
  }, [])

  // 清空对话
  const handleClearChat = useCallback(async () => {
    // 如果正在生成，先停止
    if (currentStreamCleanup) {
      currentStreamCleanup()
    }
    setIsGenerating(false)
    setIsLoading(false)
    setStreamingMessageId(null)
    setCurrentStreamCleanup(null)

    // 创建新的会话
    await createNewSession()

    Toast.success(t?.chat?.notifications?.cleared || '会话已清空')
  }, [currentStreamCleanup, t, createNewSession])

  // 重新生成消息
  const handleRetryMessage = useCallback(
    (message: ChatMessage) => {
      // 检查是否有选中的AI配置
      if (!selectedAiConfig) {
        Toast.error(t.chat?.notifications.selectModel || '请先选择AI配置')
        return
      }

      // 如果正在生成，先停止
      if (isGenerating && currentStreamCleanup) {
        currentStreamCleanup()
      }

      try {
        // 通过parentId找到对应的用户消息
        if (message.parentId) {
          const parentMessage = messages.find((msg) => msg.id?.toString() === message.parentId)
          if (parentMessage && parentMessage.role === 'user') {
            // 移除当前AI消息
            setMessages((prev) => prev.filter((msg) => msg.id !== message.id))

            // 重新发送用户消息
            setIsLoading(true)
            performAIResponse(
              parentMessage.content,
              parentMessage.id?.toString(),
              currentSessionId || undefined
            )

            Toast.info(t.chat?.notifications.retrying || '正在重新生成回复...')
            return
          }
        }

        // 如果没有parentId或找不到父消息，使用最后一条用户消息
        if (lastUserMessage) {
          // 移除当前AI消息
          setMessages((prev) => prev.filter((msg) => msg.id !== message.id))

          // 重新发送最后一条用户消息
          setIsLoading(true)
          performAIResponse(
            lastUserMessage.content,
            lastUserMessage.id?.toString(),
            currentSessionId || undefined
          )

          Toast.info(t.chat?.notifications.retrying || '正在重新生成回复...')
          return
        }

        Toast.error(t.chat?.notifications.noMessage || '无法找到对应的用户消息，无法重新生成')
      } catch (error) {
        console.error('消息重置失败:', error)
        Toast.error(t.chat?.notifications.retryFailed || '重新生成失败，请稍后重试')
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

  // 删除消息
  const handleDeleteMessage = useCallback(
    (message: ChatMessage) => {
      try {
        // 如果正在生成且删除的是正在生成的消息，先停止生成
        if (isGenerating && streamingMessageId === message.id?.toString() && currentStreamCleanup) {
          currentStreamCleanup()
        }

        // 从数据库中删除消息
        if (message.id) {
          window.api.chat.deleteMessage(message.id.toString()).catch((error) => {
            console.error('从数据库删除消息失败:', error)
            Toast.error('从数据库删除消息失败')
          })
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

        Toast.success(t.chat?.notifications.deleted || '消息已删除')
      } catch (error) {
        console.error('消息删除失败:', error)
        Toast.error(t.chat?.notifications.deleteFailed || '删除消息失败，请稍后重试')
      }
    },
    [isGenerating, streamingMessageId, currentStreamCleanup, lastUserMessage]
  )

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  useEffect(() => {
    loadAiApiConfigs()
  }, [loadAiApiConfigs])

  // 显示初始化骨架屏
  if (isInitializing) {
    return <ChatSkeleton />
  }

  return (
    <div
      className="chat-container"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* 头部 */}
      <div
        className="chat-header-container"
        style={{
          padding: '20px',
          background:
            'linear-gradient(135deg, var(--semi-color-bg-2) 0%, var(--semi-color-bg-1) 100%)',
          borderBottom: '1px solid var(--semi-color-border)',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}
      >
        <div
          className="chat-header-container-right"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%'
          }}
        >
          {/* 左侧历史记录按钮 */}
          <Button
            icon={<IconHistory />}
            onClick={() => setIsHistorySidebarOpen(true)}
            type="tertiary"
            theme="light"
            style={{ borderRadius: '10px' }}
          >
            {t.chat?.actions.history || '对话历史'}
          </Button>

          {/* 右侧控件 */}
          <Space>
            {/* AI模型选择 */}
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
                style={{
                  width: 220,
                  borderRadius: '10px'
                }}
                placeholder={t.chat?.modelSelector.placeholder || '选择AI模型'}
              >
                {aiApiConfigs.map((config) => (
                  <Select.Option key={config.id} value={config.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {config.isThinkingModel && (
                        <span
                          style={{
                            backgroundColor: 'rgba(0, 180, 42, 0.15)',
                            color: '#00b42a',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '500'
                          }}
                        >
                          {t.chat?.modelSelector.thinkingBadge || '思维'}
                        </span>
                      )}
                      <span style={{ fontWeight: '500' }}>{config.name}</span>
                    </div>
                  </Select.Option>
                ))}
              </Select>
            ) : (
              <div
                className="chat-model-llm-container"
                style={{
                  padding: '8px 12px',
                  background: 'var(--semi-color-warning-light-default)',
                  borderRadius: '8px',
                  border: '1px solid var(--semi-color-warning-light-active)'
                }}
              >
                <Text type="warning" size="small">
                  {t.chat?.modelSelector.noModels || '⚠️ 暂无AI配置'}
                </Text>
              </div>
            )}

            {/* 新建会话按钮 */}
            <Button
              onClick={handleClearChat}
              type="primary"
              theme="light"
              style={{
                borderRadius: '10px',
                backgroundColor: 'var(--semi-color-success-light-default)',
                borderColor: 'var(--semi-color-success-light-default)',
                color: 'var(--semi-color-success)'
              }}
              disabled={isGenerating}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--semi-color-success-light-hover)'
                e.currentTarget.style.borderColor = 'var(--semi-color-success-light-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--semi-color-success-light-default)'
                e.currentTarget.style.borderColor = 'var(--semi-color-success-light-default)'
              }}
            >
              {t.chat?.actions.newSession || '新建会话'}
            </Button>
          </Space>
        </div>
      </div>

      {/* 消息列表 */}
      <div
        className="chat-messages-container"
        style={{
          flex: 1,
          overflow: 'hidden',
          background:
            'linear-gradient(135deg, var(--semi-color-bg-0) 0%, var(--semi-color-bg-1) 100%)',
          display: 'flex',
          flexDirection: 'row'
        }}
      >
        {/* 聊天历史侧边栏 */}
        <ChatHistorySidebar
          isOpen={isHistorySidebarOpen}
          onClose={() => setIsHistorySidebarOpen(false)}
          onSelectSession={loadSessionMessages}
          onSessionDeleted={handleSessionDeleted}
          currentSessionId={currentSessionId || undefined}
        />

        {/* 消息内容区域 */}
        <div ref={messagesContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {messages.length === 0 ? (
            <div
              className="chat-suggestions-container"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--semi-color-text-2)',
                textAlign: 'center'
              }}
            >
              <div
                className="chat-suggestions-container-content"
                style={{
                  marginTop: '32px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  justifyContent: 'center'
                }}
              >
                {(
                  t.chat?.suggestions || [
                    '📝 帮我写一篇文章，题材是: ',
                    '🧮 需要解决下述的数学问题: ',
                    '💡 给我一些建议，关于',
                    '🔍 解释这个概念: '
                  ]
                )
                  .slice(0, 4)
                  .map((suggestion) => (
                    <Button
                      key={suggestion}
                      type="tertiary"
                      theme="light"
                      onClick={() => setInputValue(suggestion.split(' ')[1])}
                      style={{
                        borderRadius: '20px',
                        padding: '8px 16px',
                        fontSize: '14px'
                      }}
                    >
                      {suggestion}
                    </Button>
                  ))}
              </div>
            </div>
          ) : (
            <div
              className="chat-messages-container"
              style={{ maxWidth: '900px', margin: '0 auto' }}
            >
              {messages.map((message, index) => (
                <MessageBubbleCustom
                  key={message.id}
                  message={message}
                  onRetry={handleRetryMessage}
                  onDelete={handleDeleteMessage}
                  isLast={index === messages.length - 1}
                  selectedAiConfig={selectedAiConfig}
                  aiApiConfigs={aiApiConfigs}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 输入区域 */}
      <div
        className="chat-input-container"
        style={{
          padding: '5px 10px 10px 10px', // 减少一半高度的内边距
          background: 'var(--semi-color-bg-1)',
          borderTop: '1px solid var(--semi-color-border)',
          flexShrink: 0
        }}
      >
        <div
          className="chat-input-container-content"
          style={{ maxWidth: '700px', margin: '0 auto' }}
        >
          <div
            className="chat-input-container-content"
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              background: 'var(--semi-color-bg-2)',
              padding: '8px',
              borderRadius: '16px',
              border: '1px solid var(--semi-color-border)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}
          >
            <TextArea
              value={inputValue}
              onChange={(value: string) => setInputValue(value)}
              onKeyDown={handleKeyDown}
              placeholder={
                t.chat?.inputPlaceholder || '输入你的问题... (Shift+Enter换行，Enter发送)'
              }
              autosize={{ minRows: 1, maxRows: 4 }}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                fontSize: '14px',
                lineHeight: '1.5'
              }}
              disabled={isLoading || !selectedAiConfig}
            />
            <Button
              type="primary"
              icon={isGenerating ? <IconStop /> : <IconSend />}
              onClick={isGenerating ? handleStopGenerate : handleSendMessage}
              loading={isLoading && !isGenerating}
              disabled={!isGenerating && (!inputValue.trim() || !selectedAiConfig)}
              style={{
                height: '36px',
                width: '36px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
              theme="solid"
            />
          </div>

          {!selectedAiConfig && (
            <div style={{ marginTop: '12px', textAlign: 'center' }}>
              <Text type="warning" size="small">
                {t.chat?.notifications.noUserMessage || '💡 请先在右上角选择AI模型再开始对话'}
              </Text>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatInterface
