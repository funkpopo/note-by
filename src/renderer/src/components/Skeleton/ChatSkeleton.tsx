import React from 'react'
import { Skeleton, Card, Space } from '@douyinfe/semi-ui'
import './skeleton.css'

interface ChatSkeletonProps {
  className?: string
  style?: React.CSSProperties
  messageCount?: number
}

const ChatSkeleton: React.FC<ChatSkeletonProps> = ({
  className = '',
  style = {},
  messageCount = 6
}) => {
  return (
    <div className={`chat-skeleton ${className}`} style={style}>
      {/* 聊天头部 */}
      <div className="chat-skeleton-header">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Skeleton.Avatar size="small" />
            <Skeleton.Title style={{ width: 100, height: 20, marginBottom: 0 }} />
          </Space>
          <Space>
            <Skeleton.Button style={{ width: 60, height: 28 }} />
            <Skeleton.Button style={{ width: 80, height: 28 }} />
          </Space>
        </Space>
      </div>

      {/* 聊天消息区域 */}
      <div className="chat-skeleton-messages">
        {Array.from({ length: messageCount }, (_, index) => {
          const isUser = index % 2 === 0
          const messageWidth = 40 + Math.random() * 35 // 40-75%

          return (
            <div
              key={index}
              className={`chat-skeleton-message ${isUser ? 'chat-skeleton-message-user' : 'chat-skeleton-message-assistant'}`}
            >
              <div className="chat-skeleton-message-content" style={{ width: `${messageWidth}%` }}>
                {!isUser && (
                  <Skeleton.Avatar
                    size="small"
                    style={{
                      width: 32,
                      height: 32,
                      marginRight: 12,
                      marginTop: 4,
                      flex: 'none'
                    }}
                  />
                )}
                <Card
                  className="chat-skeleton-message-bubble"
                  bodyStyle={{ padding: '12px 16px' }}
                >
                  <Skeleton.Paragraph
                    rows={Math.floor(Math.random() * 3) + 1}
                    style={{ marginBottom: 0 }}
                  />
                </Card>
                {isUser && (
                  <Skeleton.Avatar
                    size="small"
                    style={{
                      width: 32,
                      height: 32,
                      marginLeft: 12,
                      marginTop: 4,
                      flex: 'none'
                    }}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 输入区域 */}
      <div className="chat-skeleton-input">
        <div className="chat-skeleton-input-container">
          <Skeleton.Title
            style={{
              width: '100%',
              height: 40,
              borderRadius: '20px',
              marginBottom: 0
            }}
          />
          <Skeleton.Button
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              marginLeft: 12
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default ChatSkeleton