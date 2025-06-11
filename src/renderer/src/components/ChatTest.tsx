import React, { useState } from 'react'
import { Chat, Button } from '@douyinfe/semi-ui'

// 简单的测试组件来验证Chat组件是否正常工作
const ChatTest: React.FC = () => {
  const [messages, setMessages] = useState([
    {
      id: '1',
      role: 'user' as const,
      content: '你好！',
      createAt: Date.now() - 60000
    },
    {
      id: '2', 
      role: 'assistant' as const,
      content: '你好！我是AI助手，有什么可以帮助您的吗？',
      createAt: Date.now() - 30000
    }
  ])

  const roleConfig = {
    user: {
      name: '用户',
      avatar: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/ptlz_zlp/ljhwZthlaukjlkulzlp/docs-icon.png'
    },
    assistant: {
      name: 'AI助手',
      avatar: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/ptlz_zlp/ljhwZthlaukjlkulzlp/other/logo.png'
    }
  }

  const handleMessageSend = (content: string) => {
    const newMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content,
      createAt: Date.now()
    }
    setMessages(prev => [...prev, newMessage])

    // 模拟AI回复
    setTimeout(() => {
      const aiReply = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: `我收到了您的消息："${content}"。这是一个测试回复。`,
        createAt: Date.now()
      }
      setMessages(prev => [...prev, aiReply])
    }, 1000)
  }

  const handleChatsChange = (chats: any[]) => {
    setMessages(chats)
  }

  return (
    <div style={{ height: '100vh', padding: '20px' }}>
      <h2>Chat组件测试</h2>
      <div style={{ height: '80%', border: '1px solid #ccc', borderRadius: '8px' }}>
        <Chat
          chats={messages as any}
          roleConfig={roleConfig}
          onChatsChange={handleChatsChange}
          onMessageSend={handleMessageSend}
          style={{ height: '100%' }}
        />
      </div>
      <div style={{ marginTop: '10px' }}>
        <Button onClick={() => setMessages([])}>清空消息</Button>
      </div>
    </div>
  )
}

export default ChatTest
