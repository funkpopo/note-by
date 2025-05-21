import React from 'react'
import { BlockNoteEditor } from '@blocknote/core'
import {
  AIMenu,
  getAIExtension,
  getDefaultAIMenuItems,
  AIMenuSuggestionItem
} from '@blocknote/xl-ai'
import { IconTextRectangle, IconBolt } from '@douyinfe/semi-icons'

// 继续写作命令
const continueWriting = (editor: BlockNoteEditor): AIMenuSuggestionItem => ({
  key: 'continue_writing',
  title: '继续写作',
  aliases: ['继续', '续写', '接着写', 'continue'],
  icon: <IconTextRectangle />,
  onItemClick: async () => {
    await getAIExtension(editor).callLLM({
      userPrompt: '基于当前内容，继续写作后续内容。保持相同的写作风格、语气和上下文连贯性。',
      useSelection: true,
      defaultStreamTools: {
        add: true,
        delete: false,
        update: false
      }
    })
  },
  size: 'small'
})

// 自定义AI命令：修复语法错误
const fixGrammar = (editor: BlockNoteEditor): AIMenuSuggestionItem => ({
  key: 'fix_grammar',
  title: '修复语法错误',
  aliases: ['语法', '错误', '修复', 'grammar'],
  icon: <IconBolt />,
  onItemClick: async () => {
    await getAIExtension(editor).callLLM({
      userPrompt:
        '请修正选中文本中的语法、拼写和标点符号错误，但保持内容和风格不变，使用和原文一样的语言',
      useSelection: true,
      defaultStreamTools: {
        add: false,
        delete: false,
        update: true
      }
    })
  },
  size: 'small'
})

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
          // 检查是否有选中内容，用于决定显示哪些菜单项
          const hasSelection = !!editor.getSelection()

          // 获取默认菜单项
          const defaultItems = getDefaultAIMenuItems(editor, aiResponseStatus)

          if (hasSelection) {
            // 当有内容被选中时的菜单项
            return [...defaultItems, fixGrammar(editor), continueWriting(editor)]
          } else {
            // 当没有内容被选中时的菜单项（全文操作）
            return [...defaultItems, continueWriting(editor)]
          }
        }

        // 对于其他状态，返回默认菜单项
        return getDefaultAIMenuItems(editor, aiResponseStatus)
      }}
    />
  )
}
