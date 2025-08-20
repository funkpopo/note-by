import React, { useState, useEffect } from 'react'
import { Typography, Button, Input, List, Toast } from '@douyinfe/semi-ui'
import { IconSearch, IconDelete, IconClose } from '@douyinfe/semi-icons'
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

interface ChatSession {
  id: string
  title?: string
  createdAt: number
  updatedAt: number
  messageCount: number
  isArchived: boolean
}

interface ChatHistorySidebarProps {
  isOpen: boolean
  onClose: () => void
  onSelectSession: (sessionId: string) => void
  onSessionDeleted?: (sessionId: string) => void
  currentSessionId?: string
}

const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  isOpen,
  onClose,
  onSelectSession,
  onSessionDeleted,
  currentSessionId
}) => {
  const t = getTranslations()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [filteredSessions, setFilteredSessions] = useState<ChatSession[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastUserMessages, setLastUserMessages] = useState<Record<string, string>>({})

  // 加载聊天会话列表
  const loadSessions = async (): Promise<void> => {
    setLoading(true)
    try {
      const sessionList = await window.api.chat.getSessions()
      setSessions(sessionList)
      setFilteredSessions(sessionList)
      // 获取所有会话的最后一条用户消息
      const lastUserMsgMap: Record<string, string> = {}
      await Promise.all(
        sessionList.map(async (session) => {
          const messages = await window.api.chat.getSessionMessages(session.id)
          const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
          lastUserMsgMap[session.id] = lastUserMsg
            ? lastUserMsg.content
            : session.title || t.chat?.history.newChat || '新对话'
        })
      )
      setLastUserMessages(lastUserMsgMap)
    } catch (error) {
      console.error('加载聊天会话失败:', error)
      Toast.error(t.chat?.history.loadFailed || '加载对话历史失败')
    } finally {
      setLoading(false)
    }
  }

  // 搜索过滤
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSessions(sessions)
    } else {
      const filtered = sessions.filter((session) => {
        const titleMatch = session.title?.toLowerCase().includes(searchTerm.toLowerCase())
        const idMatch = session.id.includes(searchTerm)
        const lastMsg = lastUserMessages[session.id] || ''
        const lastMsgMatch = lastMsg.toLowerCase().includes(searchTerm.toLowerCase())
        return titleMatch || idMatch || lastMsgMatch
      })
      setFilteredSessions(filtered)
    }
  }, [searchTerm, sessions, lastUserMessages])

  // 组件加载时获取会话列表
  useEffect(() => {
    if (isOpen) {
      loadSessions()
    }
  }, [isOpen, currentSessionId]) // Add currentSessionId as dependency to refresh when it changes

  // 格式化时间显示
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInDays === 1) {
      const lang = getCurrentLanguage()
      return lang === 'zh-CN' ? '昨天' : 'Yesterday'
    } else if (diffInDays < 7) {
      const lang = getCurrentLanguage()
      return lang === 'zh-CN' ? `${diffInDays}天前` : `${diffInDays} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  // 删除会话
  const deleteSession = async (sessionId: string): Promise<void> => {
    try {
      await window.api.chat.deleteSession(sessionId)
      await loadSessions()
      Toast.success(t.chat?.notifications.deleted || '对话已删除')
      if (currentSessionId === sessionId) {
        // 当前会话被删除，通知父组件清空界面
        onSessionDeleted?.(sessionId)
        onClose()
      }
    } catch (error) {
      console.error('删除会话失败:', error)
      Toast.error(t.chat?.history.deleteFailed || '删除对话历史失败')
    }
  }

  // 生成会话显示标题（用户最后一条消息）
  const getSessionDisplayTitle = (session: ChatSession): string => {
    return (
      lastUserMessages[session.id] ||
      session.title ||
      `${t.chat?.history.newChat || '新对话'} ${session.messageCount}`
    )
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        width: '200px',
        height: '100%',
        background: 'var(--semi-color-bg-1)',
        borderRight: '1px solid var(--semi-color-border)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '2px 0 8px rgba(0,0,0,0.1)'
      }}
    >
      {/* 侧边栏头部 */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--semi-color-border)',
          background: 'var(--semi-color-bg-2)'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}
        >
          <Text strong>{t.chat?.history.title || '对话历史'}</Text>
          <Button
            icon={<IconClose />}
            type="tertiary"
            theme="borderless"
            size="small"
            onClick={onClose}
          />
        </div>

        {/* 搜索框 */}
        <Input
          prefix={<IconSearch />}
          placeholder={t.chat?.history.searchPlaceholder || '搜索对话...'}
          value={searchTerm}
          onChange={setSearchTerm}
        />
      </div>

      {/* 会话列表 */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 0'
        }}
      >
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <Text type="tertiary">加载中...</Text>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <Text type="tertiary">
              {searchTerm ? '未找到匹配的对话' : t.chat?.history.empty || '暂无对话历史'}
            </Text>
          </div>
        ) : (
          <List
            dataSource={filteredSessions}
            renderItem={(session) => (
              <List.Item
                key={session.id}
                style={{
                  padding: '12px 20px',
                  margin: 0,
                  cursor: 'pointer',
                  background:
                    session.id === currentSessionId
                      ? 'var(--semi-color-primary-light-default)'
                      : 'transparent',
                  borderLeft:
                    session.id === currentSessionId
                      ? '3px solid var(--semi-color-primary)'
                      : '3px solid transparent'
                }}
                onMouseEnter={(e) => {
                  if (session.id !== currentSessionId) {
                    e.currentTarget.style.background = 'var(--semi-color-fill-0)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (session.id !== currentSessionId) {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
                onClick={() => {
                  onSelectSession(session.id)
                  onClose()
                }}
              >
                <div
                  style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}
                >
                  {/* 会话标题 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '4px'
                    }}
                  >
                    <Text
                      strong
                      style={{
                        fontSize: '14px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        marginRight: '8px'
                      }}
                    >
                      {getSessionDisplayTitle(session)}
                    </Text>
                    <Button
                      icon={<IconDelete />}
                      type="tertiary"
                      theme="borderless"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteSession(session.id)
                      }}
                    />
                  </div>

                  {/* 会话信息 */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <Text size="small" type="tertiary">
                      {session.messageCount} 条消息
                    </Text>
                    <Text size="small" type="tertiary">
                      {formatDate(session.updatedAt)}
                    </Text>
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  )
}

export default ChatHistorySidebar
