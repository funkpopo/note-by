import React from 'react'
import { BlockNoteEditor } from '@blocknote/core'
import { AIMenu, getAIExtension, getDefaultAIMenuItems } from '@blocknote/xl-ai'
import { IconTextRectangle } from '@douyinfe/semi-icons'

// 创建自定义AI菜单组件
export const CustomAIMenu: React.FC = () => {
  return (
    <AIMenu
      items={(
        editor: BlockNoteEditor,
        aiResponseStatus:
          | 'user-input'
          | 'thinking'
          | 'ai-writing'
          | 'error'
          | 'user-reviewing'
          | 'closed'
      ) => {
        if (aiResponseStatus === 'user-input') {
          // 获取默认菜单项
          const menuItems = [...getDefaultAIMenuItems(editor, aiResponseStatus)]

          // 继续写作菜单项
          menuItems.push({
            key: 'continue_writing',
            title: '继续写作',
            aliases: ['继续', '续写', '接着写', 'continue'],
            icon: <IconTextRectangle />,
            onItemClick: async () => {
              await getAIExtension(editor).callLLM({
                // 向LLM发送的提示词
                userPrompt:
                  '基于当前内容，继续写作后续内容。保持相同的写作风格、语气和上下文连贯性。',
                // 使用选中内容作为上文
                useSelection: true,
                // 配置允许的操作：添加内容、不删除内容、不更新已有内容
                defaultStreamTools: {
                  add: true,
                  delete: false,
                  update: false
                }
              })
            },
            size: 'small'
          })

          return menuItems
        }

        // 对于其他状态，返回默认菜单项
        return getDefaultAIMenuItems(editor, aiResponseStatus)
      }}
    />
  )
}
