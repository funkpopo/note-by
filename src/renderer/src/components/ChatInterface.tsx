import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Typography, Button, Toast, TextArea, Select, Space, Spin, Dropdown, Card } from '@douyinfe/semi-ui'
import { IconSend, IconStop, IconClear, IconRefresh, IconMore, IconCopy, IconDelete } from '@douyinfe/semi-icons'
import { modelSelectionService, type AiApiConfig } from '../services/modelSelectionService'
import throttle from 'lodash.throttle'
import { filterThinkingContent } from '../utils/filterThinking'
import MessageRenderer from './MessageRenderer'

const { Text } = Typography

// 自定义消息气泡组件
const MessageBubbleCustom: React.FC<{
  message: ChatMessage
  onRetry?: (message: ChatMessage) => void
  onDelete?: (message: ChatMessage) => void
  isLast?: boolean
}> = ({ message, onRetry, onDelete, isLast }) => {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    Toast.success('已复制到剪贴板')
  }

  const dropdownItems = [
    {
      node: 'item' as const,
      key: 'copy',
      name: '复制',
      icon: <IconCopy />,
      onClick: handleCopy
    },
    ...(isAssistant && onRetry ? [{
      node: 'item' as const,
      key: 'retry',
      name: '重新生成',
      icon: <IconRefresh />,
      onClick: () => onRetry(message)
    }] : []),
    ...(onDelete ? [{
      node: 'item' as const,
      key: 'delete',
      name: '删除',
      icon: <IconDelete />,
      onClick: () => onDelete(message),
      type: 'danger' as const
    }] : [])
  ]

  const getStatusIndicator = () => {
    switch (message.status) {
      case 'loading':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
            <Spin size="small" />
            <Text size="small" type="tertiary">正在思考中...</Text>
          </div>
        )
      case 'streaming':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              background: 'var(--semi-color-primary)',
              borderRadius: '50%',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
            <Text size="small" type="tertiary">AI正在思考...</Text>
          </div>
        )
      case 'incomplete':
        return (
          <div style={{ marginTop: '12px' }}>
            <Text size="small" type="warning">⚠️ 生成被中断</Text>
          </div>
        )
      case 'error':
        return (
          <div style={{ marginTop: '12px' }}>
            <Text size="small" type="danger">❌ 生成出错</Text>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div style={{ 
      marginBottom: isLast ? '8px' : '32px',
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: '16px',
      alignItems: 'flex-start'
    }}>
      {/* 头像 */}
      <div style={{
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
        fontSize: '16px',
        fontWeight: '600',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        {isUser ? '👤' : '🤖'}
      </div>

      {/* 消息内容 */}
      <div style={{ 
        flex: 1, 
        maxWidth: 'calc(100% - 80px)',
        minWidth: 0
      }}>
        {/* 消息卡片 */}
        <Card
          style={{
            background: isUser 
              ? 'linear-gradient(135deg, var(--semi-color-primary) 0%, var(--semi-color-primary-light-active) 100%)'
              : 'var(--semi-color-bg-2)',
            border: isUser ? 'none' : '1px solid var(--semi-color-border)',
            borderRadius: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            padding: '0'
          }}
          bodyStyle={{ 
            padding: '16px 20px',
            color: isUser ? 'white' : 'var(--semi-color-text-0)'
          }}
        >
          {isUser ? (
            <div style={{ 
              fontSize: '15px', 
              lineHeight: '1.6',
              wordBreak: 'break-word'
            }}>
              {message.content}
            </div>
          ) : (
            <MessageRenderer
              content={message.content || ''}
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
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          marginTop: '8px',
          gap: '12px'
        }}>
          <Text size="small" type="tertiary">
            {new Date(message.createAt).toLocaleTimeString()}
          </Text>
          
          <Dropdown
            trigger="click"
            menu={dropdownItems}
            position="bottomLeft"
          >
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

// 消息类型定义
interface ChatMessage {
  id: string | number
  role: 'user' | 'assistant' | 'system'
  content: string
  createAt: number
  status?: 'loading' | 'streaming' | 'incomplete' | 'complete' | 'error'
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

  // 执行AI回复 - 流式响应版本
  const performAIResponse = useCallback(
    async (userContent: string, userMessageId?: string) => {
      try {
        // 获取选中的AI配置
        const aiConfig = aiApiConfigs.find((config) => config.id === selectedAiConfig)
        if (!aiConfig) {
          throw new Error('请先配置AI API')
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

        // 调用流式AI API
        const streamResult = await window.api.openai.streamGenerateContent(
          {
            apiKey: aiConfig.apiKey,
            apiUrl: aiConfig.apiUrl,
            modelName: aiConfig.modelName,
            prompt: userContent,
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

            // 流式完成处理 - 确保最终内容完整
            onDone: (fullContent: string) => {
              // 立即取消任何待处理的节流更新
              throttledUpdateRef.current?.cancel()

              // 立即更新最终内容，不使用节流
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

              // 清理状态
              setIsGenerating(false)
              setIsLoading(false)
              setStreamingMessageId(null)
              setCurrentStreamCleanup(null)
            },

            // 错误处理 - 优化超时和内容保留
            onError: (error: string) => {
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
                      content: filterThinkingContent(currentContent),
                      status: 'complete'
                    }
                  } else {
                    // 其他错误情况
                    newMessages[messageIndex] = {
                      ...currentMessage,
                      status: 'error',
                      content:
                        filterThinkingContent(currentContent || '') +
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
    [aiApiConfigs, selectedAiConfig]
  )

  // 发送消息
  const handleSendMessage = useCallback(() => {
    if (!inputValue.trim() || isLoading || !selectedAiConfig) return

    // 检查是否有选中的AI配置
    if (!selectedAiConfig) {
      Toast.error('请先选择AI配置')
      return
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      createAt: Date.now()
    }

    setMessages((prev) => [...prev, userMessage])
    setLastUserMessage(userMessage) // 保存最后一条用户消息
    setInputValue('') // 清空输入框
    setIsLoading(true)

    // 执行AI回复
    performAIResponse(userMessage.content, userMessage.id?.toString())
  }, [inputValue, isLoading, selectedAiConfig, performAIResponse])

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

    Toast.info('已停止生成')
  }, [currentStreamCleanup, streamingMessageId])

  // 清空对话
  const handleClearChat = useCallback(() => {
    setMessages([])
    setLastUserMessage(null)
    
    // 如果正在生成，也要停止
    if (currentStreamCleanup) {
      currentStreamCleanup()
    }
    setIsGenerating(false)
    setIsLoading(false)
    setStreamingMessageId(null)
    setCurrentStreamCleanup(null)

    Toast.success('会话已清空')
  }, [currentStreamCleanup])

  // 重新生成消息
  const handleRetryMessage = useCallback(
    (message: ChatMessage) => {
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
        // 通过parentId找到对应的用户消息
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

        // 如果没有parentId或找不到父消息，使用最后一条用户消息
        if (lastUserMessage) {
          // 移除当前AI消息
          setMessages((prev) => prev.filter((msg) => msg.id !== message.id))

          // 重新发送最后一条用户消息
          setIsLoading(true)
          performAIResponse(lastUserMessage.content, lastUserMessage.id?.toString())

          Toast.info('正在重新生成回复...')
          return
        }

        Toast.error('无法找到对应的用户消息，无法重新生成')
      } catch (error) {
        console.error('消息重置失败:', error)
        Toast.error('重新生成失败，请稍后重试')
      }
    },
    [selectedAiConfig, isGenerating, currentStreamCleanup, messages, lastUserMessage, performAIResponse]
  )

  // 删除消息
  const handleDeleteMessage = useCallback((message: ChatMessage) => {
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
  }, [isGenerating, streamingMessageId, currentStreamCleanup, lastUserMessage])

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

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* 头部 */}
      <div
        style={{
          padding: '20px',
          background: 'linear-gradient(135deg, var(--semi-color-bg-2) 0%, var(--semi-color-bg-1) 100%)',
          borderBottom: '1px solid var(--semi-color-border)',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            maxWidth: '900px',
            margin: '0 auto'
          }}
        >
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
                placeholder="选择AI模型"
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
                          思维
                        </span>
                      )}
                      <span style={{ fontWeight: '500' }}>{config.name}</span>
                    </div>
                  </Select.Option>
                ))}
              </Select>
            ) : (
              <div style={{ 
                padding: '8px 12px',
                background: 'var(--semi-color-warning-light-default)',
                borderRadius: '8px',
                border: '1px solid var(--semi-color-warning-light-active)'
              }}>
                <Text type="warning" size="small">
                  ⚠️ 暂无AI配置
                </Text>
              </div>
            )}

            {/* 清空对话按钮 */}
            <Button
              icon={<IconClear />}
              onClick={handleClearChat}
              type="tertiary"
              theme="light"
              style={{ borderRadius: '10px' }}
            >
              清空对话
            </Button>
          </Space>
        </div>
      </div>

      {/* 消息列表 */}
      <div
        ref={messagesContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          background: 'linear-gradient(135deg, var(--semi-color-bg-0) 0%, var(--semi-color-bg-1) 100%)'
        }}
      >
        {messages.length === 0 ? (
          <div
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
            <div style={{ 
              marginTop: '32px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              justifyContent: 'center'
            }}>
              {[
                '📝 帮我写一篇文章',
                '🧮 解决数学问题', 
                '💡 给我一些建议',
                '🔍 解释一个概念'
              ].map((suggestion) => (
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
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {messages.map((message, index) => (
              <MessageBubbleCustom
                key={message.id}
                message={message}
                onRetry={handleRetryMessage}
                onDelete={handleDeleteMessage}
                isLast={index === messages.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div
        style={{
          padding: '20px 20px 30px 20px', // 增加底部内边距
          background: 'var(--semi-color-bg-1)',
          borderTop: '1px solid var(--semi-color-border)',
          flexShrink: 0
        }}
      >
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-end',
              background: 'var(--semi-color-bg-2)',
              padding: '12px',
              borderRadius: '16px',
              border: '1px solid var(--semi-color-border)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}
          >
            <TextArea
              value={inputValue}
              onChange={(value: string) => setInputValue(value)}
              onKeyDown={handleKeyDown}
              placeholder="输入你的问题... (Shift+Enter换行，Enter发送)"
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
                💡 请先在右上角选择AI模型再开始对话
              </Text>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatInterface