import React, { useState, useEffect } from 'react'
import { Typography, Button, Input, List, Toast, Space, Popconfirm } from '@douyinfe/semi-ui'
import { IconSearch, IconDelete, IconEdit, IconPlus, IconClose } from '@douyinfe/semi-icons'
import { zhCN } from '../locales/zh-CN'
import { enUS } from '../locales/en-US'

const { Text } = Typography

// 获取当前语言设置
const getCurrentLanguage = () => {
  return (localStorage.getItem('app-language') as 'zh-CN' | 'en-US') || 'zh-CN'
}

// 获取翻译文本
const getTranslations = () => {
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
  onNewChat: () => void
  currentSessionId?: string
}

const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({ 
  isOpen, 
  onClose, 
  onSelectSession, 
  onNewChat,
  currentSessionId 
}) => {
  const t = getTranslations()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [filteredSessions, setFilteredSessions] = useState<ChatSession[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [loading, setLoading] = useState(false)

  // 加载聊天会话列表
  const loadSessions = async () => {
    setLoading(true)
    try {
      const sessionList = await window.api.chat.getSessions()
      setSessions(sessionList)
      setFilteredSessions(sessionList)
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
      const filtered = sessions.filter(session => 
        session.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.id.includes(searchTerm)
      )
      setFilteredSessions(filtered)
    }
  }, [searchTerm, sessions])

  // 组件加载时获取会话列表
  useEffect(() => {
    if (isOpen) {
      loadSessions()
    }
  }, [isOpen])

  // 格式化时间显示
  const formatDate = (timestamp: number) => {
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

  // 开始编辑会话标题
  const startEditingTitle = (session: ChatSession) => {
    setEditingSessionId(session.id)
    setEditingTitle(session.title || t.chat?.history.newChat || '新对话')
  }

  // 保存编辑的标题
  const saveTitle = async () => {
    if (!editingSessionId || !editingTitle.trim()) return
    
    try {
      await window.api.chat.updateSessionTitle(editingSessionId, editingTitle.trim())
      await loadSessions()
      Toast.success('标题已更新')
    } catch (error) {
      console.error('更新标题失败:', error)
      Toast.error('更新标题失败')
    } finally {
      setEditingSessionId(null)
      setEditingTitle('')
    }
  }

  // 删除会话
  const deleteSession = async (sessionId: string) => {
    try {
      await window.api.chat.deleteSession(sessionId)
      await loadSessions()
      Toast.success(t.chat?.notifications.deleted || '对话已删除')
      
      // 如果删除的是当前会话，创建新会话
      if (currentSessionId === sessionId) {
        onNewChat()
      }
    } catch (error) {
      console.error('删除会话失败:', error)
      Toast.error(t.chat?.history.deleteFailed || '删除对话历史失败')
    }
  }

  // 生成会话显示标题
  const getSessionDisplayTitle = (session: ChatSession) => {
    if (session.title) return session.title
    return `${t.chat?.history.newChat || '新对话'} ${session.messageCount}`
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '320px',
      height: '100%',
      background: 'var(--semi-color-bg-1)',
      borderRight: '1px solid var(--semi-color-border)',
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '2px 0 8px rgba(0,0,0,0.1)'
    }}>
      {/* 侧边栏头部 */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--semi-color-border)',
        background: 'var(--semi-color-bg-2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <Text strong>{t.chat?.history.title || '对话历史'}</Text>
          <Button 
            icon={<IconClose />} 
            type="tertiary" 
            theme="borderless"
            size="small"
            onClick={onClose}
          />
        </div>
        
        {/* 新建对话按钮 */}
        <Button 
          icon={<IconPlus />}
          type="primary"
          block
          onClick={() => {
            onNewChat()
            onClose()
          }}
          style={{ marginBottom: '12px' }}
        >
          {t.chat?.history.newChat || '新对话'}
        </Button>

        {/* 搜索框 */}
        <Input
          prefix={<IconSearch />}
          placeholder={t.chat?.history.searchPlaceholder || '搜索对话...'}
          value={searchTerm}
          onChange={setSearchTerm}
        />
      </div>

      {/* 会话列表 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 0'
      }}>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <Text type="tertiary">加载中...</Text>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <Text type="tertiary">
              {searchTerm ? '未找到匹配的对话' : (t.chat?.history.empty || '暂无对话历史')}
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
                  background: session.id === currentSessionId ? 'var(--semi-color-primary-light-default)' : 'transparent',
                  borderLeft: session.id === currentSessionId ? '3px solid var(--semi-color-primary)' : '3px solid transparent'
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
                  if (editingSessionId !== session.id) {
                    onSelectSession(session.id)
                    onClose()
                  }
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>
                  {/* 会话标题 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    {editingSessionId === session.id ? (
                      <Input
                        value={editingTitle}
                        onChange={setEditingTitle}
                        onEnterPress={saveTitle}
                        onBlur={saveTitle}
                        size="small"
                        style={{ fontSize: '14px' }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
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
                        <Space>
                          <Button
                            icon={<IconEdit />}
                            type="tertiary"
                            theme="borderless"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation()
                              startEditingTitle(session)
                            }}
                          />
                          <Popconfirm
                            title={t.chat?.history.deleteConfirm || '确定删除这个对话吗？'}
                            onConfirm={() => deleteSession(session.id)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              icon={<IconDelete />}
                              type="tertiary"
                              theme="borderless"
                              size="small"
                            />
                          </Popconfirm>
                        </Space>
                      </>
                    )}
                  </div>

                  {/* 会话信息 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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