import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface SlashCommandOptions {
  HTMLAttributes: Record<string, any>
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('slashCommand'),
        state: {
          init() {
            return {
              active: false,
            }
          },
          apply(tr, prev) {
            const meta = tr.getMeta('slashCommand')
            if (meta) {
              return { ...prev, ...meta }
            }
            return prev
          },
        },
        props: {
          handleKeyDown(view, event) {
            // Close slash menu on Escape
            if (event.key === 'Escape') {
              view.dispatch(
                view.state.tr.setMeta('slashCommand', { active: false })
              )
              return true
            }
            
            return false
          },
          decorations(state) {
            const { doc, selection } = state
            const decorations: Decoration[] = []
            const { $from } = selection
            
            // 只在光标位置且满足特定条件时添加装饰
            if (selection.from === selection.to) {
              const currentNode = $from.parent
              const currentPos = $from.parentOffset
              
              if (currentNode.isText || currentNode.type.name === 'paragraph') {
                const text = currentNode.textContent
                
                // 检查是否是行首的"/"或者前面只有空格的"/"
                if (currentPos > 0 && text) {
                  const charBeforeCursor = text.charAt(currentPos - 1)
                  const textBeforeSlash = text.substring(0, currentPos - 1)
                  
                  // 只有当"/"字符在行首或前面只有空格时才添加装饰
                  if (charBeforeCursor === '/' && 
                      (textBeforeSlash.trim() === '' || textBeforeSlash === '')) {
                    
                    // 计算"/"字符的绝对位置
                    const slashPos = $from.pos - 1
                    decorations.push(
                      Decoration.inline(slashPos, slashPos + 1, {
                        class: 'slash-command-trigger',
                      })
                    )
                  }
                }
              }
            }
            
            return DecorationSet.create(doc, decorations)
          },
        },
      }),
    ]
  },
})

export default SlashCommand