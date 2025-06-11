import React, { useState, useEffect, useCallback } from 'react'
import {
  Typography,
  Card,
  Button,
  Toast,
  TextArea,
  Space,
  Divider,
  List,
  Tag,
  Select,
  Tooltip,
  Chat
} from '@douyinfe/semi-ui'
import {
  IconSend,
  IconRefresh,
  IconSearch,
  IconBookmark
} from '@douyinfe/semi-icons'

const { Title, Text, Paragraph } = Typography

// Semi Design Chat组件的角色配置
const roleConfig = {
  user: {
    name: '用户',
    avatar: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/ptlz_zlp/ljhwZthlaukjlkulzlp/docs-icon.png'
  },
  assistant: {
    name: 'AI助手',
    avatar: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/ptlz_zlp/ljhwZthlaukjlkulzlp/other/logo.png'
  },
  system: {
    name: '系统',
    avatar: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/ptlz_zlp/ljhwZthlaukjlkulzlp/other/logo.png'
  }
}

// 消息类型定义 - 兼容Semi Design Chat组件
interface ChatMessage {
  id?: string | number
  role: 'user' | 'assistant' | 'system'
  content: string
  createAt: number
  ragSources?: Array<{
    filePath: string
    content: string
    similarity: number
  }>
  status?: 'loading' | 'incomplete' | 'complete' | 'error'
  name?: string
  parentId?: string
}

// AI API配置接口
interface AiApiConfig {
  id: string
  name: string
  apiKey: string
  apiUrl: string
  modelName: string
  temperature?: string
  maxTokens?: string
}



const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [aiApiConfigs, setAiApiConfigs] = useState<AiApiConfig[]>([])
  const [selectedAiConfig, setSelectedAiConfig] = useState<string>('')
  const [useRAG, setUseRAG] = useState(true)
  const [ragResults, setRagResults] = useState<any[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  // 移除不再需要的refs和滚动函数，Chat组件会自动处理

  // 加载AI API配置
  const loadAiApiConfigs = useCallback(async () => {
    try {
      const settings = await window.api.settings.get('AiApiConfigs')
      if (settings && Array.isArray(settings)) {
        setAiApiConfigs(settings)
        if (settings.length > 0 && !selectedAiConfig) {
          setSelectedAiConfig(settings[0].id)
        }
      }
    } catch (error) {
      console.error('加载AI API配置失败:', error)
    }
  }, [selectedAiConfig])

  // 加载知识库配置
  const loadKnowledgeBaseConfig = useCallback(async () => {
    try {
      const knowledgeBaseConfig = await window.api.settings.get('knowledgeBase') as any
      if (knowledgeBaseConfig?.embedding?.enabled) {
        setUseRAG(true)
      } else {
        setUseRAG(false)
      }
    } catch (error) {
      console.error('加载知识库配置失败:', error)
      setUseRAG(false)
    }
  }, [])





  // RAG搜索
  const performRAGSearch = async (query: string): Promise<any[]> => {
    if (!useRAG) {
      return []
    }

    try {
      // 从全局设置获取知识库配置
      const knowledgeBaseConfig = await window.api.settings.get('knowledgeBase') as any
      if (!knowledgeBaseConfig?.embedding?.enabled) {
        return []
      }

      const result = await window.api.knowledgeBase.searchDocuments(query, 5, 0.7)
      if (result.success) {
        return result.results
      }
    } catch (error) {
      console.error('RAG搜索失败:', error)
    }
    return []
  }

  // 移除旧的handleSendMessage，现在使用Chat组件的内置发送功能

  // 清空对话
  const handleClearChat = () => {
    setMessages([])
    setRagResults([])
  }

  // 移除handleCopyMessage，Chat组件内置复制功能

  // 执行RAG搜索和AI回复
  const performRAGAndAIResponse = useCallback(async (userContent: string) => {
    try {
      setIsGenerating(true)

      // 执行RAG搜索
      const ragSources = await performRAGSearch(userContent)
      setRagResults(ragSources)

      // 构建增强的提示词
      let enhancedPrompt = userContent
      if (ragSources.length > 0) {
        const contextInfo = ragSources.map(source =>
          `文档: ${source.filePath}\n内容: ${source.content}`
        ).join('\n\n')

        enhancedPrompt = `基于以下相关文档内容回答用户问题：

相关文档：
${contextInfo}

用户问题：${userContent}

请基于提供的文档内容回答问题，如果文档内容不足以回答问题，请说明并提供你的一般性建议。`
      }

      // 获取选中的AI配置
      const aiConfig = aiApiConfigs.find(config => config.id === selectedAiConfig)
      if (!aiConfig) {
        throw new Error('请先配置AI API')
      }

      // 先添加一个loading状态的消息
      const loadingMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '正在思考中...',
        createAt: Date.now(),
        status: 'loading',
        ragSources: ragSources.length > 0 ? ragSources : undefined
      }
      setMessages(prev => [...prev, loadingMessage])

      // 调用AI API
      const response = await window.api.openai.generateContent({
        apiKey: aiConfig.apiKey,
        apiUrl: aiConfig.apiUrl,
        modelName: aiConfig.modelName,
        prompt: enhancedPrompt,
        maxTokens: parseInt(aiConfig.maxTokens || '2000')
      })

      if (response.success && response.content) {
        // 更新消息内容和状态
        setMessages(prev => {
          const newMessages = [...prev]
          const lastIndex = newMessages.length - 1
          if (newMessages[lastIndex].id === loadingMessage.id) {
            newMessages[lastIndex] = {
              ...newMessages[lastIndex],
              content: response.content || '生成回复失败',
              status: 'complete'
            }
          }
          return newMessages
        })
      } else {
        throw new Error(response.error || '生成回复失败')
      }
    } catch (error) {
      Toast.error(`发送消息失败: ${error instanceof Error ? error.message : String(error)}`)

      // 更新为错误消息
      setMessages(prev => {
        const newMessages = [...prev]
        const lastIndex = newMessages.length - 1
        if (newMessages[lastIndex].status === 'loading') {
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            content: '抱歉，我遇到了一些问题，无法回复您的消息。请检查AI API配置或稍后重试。',
            status: 'error'
          }
        }
        return newMessages
      })
    } finally {
      setIsLoading(false)
      setIsGenerating(false)
    }
  }, [aiApiConfigs, selectedAiConfig, useRAG, performRAGSearch])

  // 停止生成处理
  const handleStopGenerate = useCallback(() => {
    setIsGenerating(false)
    setIsLoading(false)

    // 更新最后一条消息的状态
    setMessages(prev => {
      const newMessages = [...prev]
      const lastIndex = newMessages.length - 1
      if (newMessages[lastIndex] && newMessages[lastIndex].status === 'loading') {
        newMessages[lastIndex] = {
          ...newMessages[lastIndex],
          content: newMessages[lastIndex].content + '\n\n[生成已停止]',
          status: 'incomplete'
        }
      }
      return newMessages
    })
  }, [])

  // Semi Chat组件的消息发送处理
  const handleChatMessageSend = useCallback((content: string, _attachment?: any[]) => {
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

    setMessages(prev => [...prev, userMessage])

    setIsLoading(true)

    // 执行RAG搜索和AI回复的逻辑
    performRAGAndAIResponse(userMessage.content)
  }, [isLoading, selectedAiConfig, performRAGAndAIResponse])

  // Chat组件的消息变化处理 - 禁用自动同步，避免重复消息
  const handleChatsChange = useCallback((_chats?: any[]) => {
    // 不处理Chat组件的消息变化，完全由我们手动控制消息状态
    // 这样可以避免Chat组件和手动状态更新的冲突
  }, [])

  // 自定义消息内容渲染 - 显示RAG来源
  const renderChatBoxContent = useCallback((props: any) => {
    const { message, defaultContent, className } = props

    return (
      <div className={className} style={{
        wordBreak: 'break-word',
        overflow: 'hidden',
        maxWidth: '100%'
      }}>
        {/* 默认消息内容 */}
        <div style={{
          marginBottom: message.ragSources ? '12px' : '0',
          overflow: 'hidden',
          wordBreak: 'break-word'
        }}>
          {defaultContent}
        </div>

        {/* RAG来源显示 */}
        {message.ragSources && message.ragSources.length > 0 && (
          <div style={{
            marginTop: '8px',
            padding: '8px',
            backgroundColor: 'var(--semi-color-fill-0)',
            borderRadius: '6px',
            border: '1px solid var(--semi-color-border)',
            overflow: 'hidden',
            maxWidth: '100%'
          }}>
            <Text type="tertiary" size="small" style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '6px',
              overflow: 'hidden'
            }}>
              <IconBookmark style={{ marginRight: '4px', flexShrink: 0 }} />
              <span style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                参考文档 ({message.ragSources.length}个)
              </span>
            </Text>
            <div style={{
              display: 'flex',
              gap: '4px',
              flexWrap: 'wrap',
              overflow: 'hidden',
              maxWidth: '100%'
            }}>
              {message.ragSources.map((source: any, index: number) => (
                <Tooltip
                  key={index}
                  content={
                    <div style={{
                      maxWidth: '280px',
                      wordBreak: 'break-word',
                      overflow: 'hidden',
                      padding: '4px 0'
                    }}>
                      <Text strong style={{
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '12px'
                      }}>
                        {source.filePath}
                      </Text>
                      <Divider margin="6px" />
                      <Text size="small" style={{
                        wordBreak: 'break-word',
                        fontSize: '11px',
                        lineHeight: '1.4'
                      }}>
                        {source.content.substring(0, 150)}...
                      </Text>
                      <Divider margin="6px" />
                      <Text type="tertiary" size="small" style={{ fontSize: '11px' }}>
                        相似度: {(source.similarity * 100).toFixed(1)}%
                      </Text>
                    </div>
                  }
                  position="topLeft" // 设置默认位置
                  autoAdjustOverflow={true} // 启用自动溢出调整
                  getPopupContainer={() => document.querySelector('.chat-interface-container') || document.body} // 指定容器
                >
                  <Tag
                    size="small"
                    color="blue"
                    style={{
                      cursor: 'pointer',
                      marginBottom: '4px',
                      maxWidth: '150px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'inline-block'
                    }}
                  >
                    {source.filePath.split('/').pop()}
                  </Tag>
                </Tooltip>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }, [])

  // 自定义输入区域渲染 - 集成配置选择
  const renderInputArea = useCallback((props: any) => {
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
      <div style={{
        margin: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        overflow: 'hidden', // 防止输入区域溢出
        maxWidth: '100%'
      }}>
        {/* 输入框区域 */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px',
          border: '1px solid var(--semi-color-border)',
          borderRadius: '8px',
          backgroundColor: 'var(--semi-color-bg-2)',
          overflow: 'hidden', // 防止输入框溢出
          maxWidth: '100%'
        }}>
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
  }, [inputValue, selectedAiConfig, isLoading])

  useEffect(() => {
    loadAiApiConfigs()
    loadKnowledgeBaseConfig()
  }, [loadAiApiConfigs, loadKnowledgeBaseConfig])

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
              if (element.classList.contains('semi-portal-inner') ||
                  element.querySelector('.semi-portal-inner')) {
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
        height: 'calc(100% - 48px)', // 减去父容器的padding (24px * 2)
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        overflow: 'hidden', // 防止整体溢出
        minHeight: 0 // 确保flex收缩正常工作
      }}>
      {/* 标题和设置区域 */}
      <div className="chat-header" style={{ marginBottom: '16px', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}
        >
          <Title heading={2} style={{ margin: 0 }}>AI 对话</Title>
          <Space>
            <Button icon={<IconRefresh />} onClick={handleClearChat}>
              清空对话
            </Button>
          </Space>
        </div>

        {/* 配置选择区域 */}
        <Card style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <Text strong>AI模型:</Text>
              {aiApiConfigs.length === 0 ? (
                <div style={{
                  marginTop: '8px',
                  padding: '12px',
                  backgroundColor: 'var(--semi-color-warning-light-default)',
                  borderRadius: '6px',
                  border: '1px solid var(--semi-color-warning-light-active)',
                  wordBreak: 'break-word' // 防止长文本溢出
                }}>
                  <Text type="warning">
                    暂无AI API配置，请先在设置中添加AI API配置
                  </Text>
                </div>
              ) : (
                <Select
                  value={selectedAiConfig}
                  onChange={(value) => setSelectedAiConfig(value as string)}
                  placeholder="选择AI配置"
                  style={{ width: '100%', marginTop: '4px' }}
                >
                  {aiApiConfigs.map((config) => (
                    <Select.Option key={config.id} value={config.id}>
                      {config.name} ({config.modelName})
                    </Select.Option>
                  ))}
                </Select>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* 对话区域 - 使用Semi Design Chat组件 */}
      <div style={{
        flex: 1,
        display: 'flex',
        gap: '16px',
        minHeight: 0, // 确保flex收缩正常工作
        overflow: 'hidden' // 防止子元素溢出
      }}>
        {/* 主对话区域 */}
        <div style={{
          flex: 1,
          minWidth: 0, // 防止flex项目溢出
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Chat
            chats={messages as any}
            roleConfig={roleConfig}
            onChatsChange={handleChatsChange}
            onMessageSend={handleChatMessageSend}
            onStopGenerator={handleStopGenerate}
            showStopGenerate={isGenerating}
            showClearContext={true}
            mode="noBubble" // 使用非气泡模式
            align="leftRight" // 左右对齐布局
            chatBoxRenderConfig={{
              renderChatBoxContent: renderChatBoxContent,
              renderChatBoxAvatar: () => null // 不显示头像
            }}
            renderInputArea={renderInputArea}
            style={{
              height: '100%',
              border: '1px solid var(--semi-color-border)',
              borderRadius: '8px',
              overflow: 'hidden', // 防止Chat组件内容溢出
              display: 'flex',
              flexDirection: 'column'
            }}
          />
        </div>

        {/* RAG结果侧边栏 - 响应式设计 */}
        {useRAG && ragResults.length > 0 && (
          <Card
            className="chat-sidebar"
            style={{
              width: 'min(300px, 30vw)', // 响应式宽度，最大300px或30%视口宽度
              minWidth: '250px', // 最小宽度
              maxWidth: '350px', // 最大宽度
              height: '100%',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0 // 防止侧边栏被压缩
            }}>
            <div style={{ marginBottom: '16px', flexShrink: 0 }}>
              <Text strong>
                <IconSearch /> 相关文档 ({ragResults.length})
              </Text>
            </div>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden', // 防止水平溢出
              minHeight: 0
            }}>
              <List
                dataSource={ragResults}
                renderItem={(item) => (
                  <List.Item
                    main={
                      <div style={{ wordBreak: 'break-word', overflow: 'hidden' }}>
                        <Text strong size="small" style={{
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {item.filePath}
                        </Text>
                        <Paragraph
                          ellipsis={{ rows: 3, expandable: true, collapsible: true }}
                          style={{
                            marginTop: '4px',
                            marginBottom: '4px',
                            fontSize: '12px',
                            wordBreak: 'break-word'
                          }}
                        >
                          {item.content}
                        </Paragraph>
                        <Tag size="small" color="blue">
                          相似度: {(item.similarity * 100).toFixed(1)}%
                        </Tag>
                      </div>
                    }
                  />
                )}
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

export default ChatInterface
