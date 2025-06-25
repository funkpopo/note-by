import { SuggestionMenuController, getDefaultReactSlashMenuItems } from '@blocknote/react'
import { getAISlashMenuItems } from '@blocknote/xl-ai'
import { type BlockNoteEditor } from '@blocknote/core'
import { LanguageModelV1 } from '@ai-sdk/provider'

export const SuggestionMenuWithAI = ({
  editor,
  currentAiModel
}: {
  editor: BlockNoteEditor
  currentAiModel: LanguageModelV1 | null
}): JSX.Element => {
  return (
    <SuggestionMenuController
      triggerCharacter="/"
      getItems={async (query) => {
        // 获取默认斜杠菜单项
        const defaultItems = getDefaultReactSlashMenuItems(editor)

        // 过滤掉Video、Audio和File插入选项，只保留Image和其他选项
        const filteredItems = defaultItems.filter((item) => {
          return !(
            (item.title.includes('Video') ||
              item.title.includes('视频') ||
              item.title.includes('Audio') ||
              item.title.includes('音频') ||
              item.title.includes('File') ||
              item.title.includes('文件')) &&
            !(item.title.includes('Image') || item.title.includes('图片'))
          )
        })

        // 添加AI菜单项（如果有可用的OpenAI模型）
        const menuItems = currentAiModel
          ? [...filteredItems, ...getAISlashMenuItems(editor)]
          : filteredItems

        // 根据用户输入的查询过滤菜单项
        return menuItems.filter((item) => {
          const itemTitle = item.title.toLowerCase()
          const itemSubtext = (item.subtext || '').toLowerCase()
          const itemAliases = item.aliases || []
          const queryLower = query.toLowerCase()

          return (
            itemTitle.includes(queryLower) ||
            itemSubtext.includes(queryLower) ||
            itemAliases.some((alias) => alias.toLowerCase().includes(queryLower))
          )
        })
      }}
    />
  )
} 