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
            const { doc } = state
            const decorations: Decoration[] = []
            
            doc.descendants((node, pos) => {
              if (node.isText && node.text?.includes('/')) {
                const from = pos
                const to = pos + node.nodeSize
                decorations.push(
                  Decoration.inline(from, to, {
                    class: 'slash-command-trigger',
                  })
                )
              }
            })
            
            return DecorationSet.create(doc, decorations)
          },
        },
      }),
    ]
  },
})

export default SlashCommand