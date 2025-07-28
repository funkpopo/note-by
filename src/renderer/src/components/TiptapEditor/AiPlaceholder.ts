import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import AiPlaceholderView from './AiPlaceholderView'

export interface AiPlaceholderOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiPlaceholder: {
      /**
       * Add an AI placeholder
       */
      setAiPlaceholder: (props: { from: number; to: number }) => ReturnType
    }
  }
}

export const AiPlaceholder = Node.create<AiPlaceholderOptions>({
  name: 'aiPlaceholder',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: false,
  marks: '_',

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'ai-placeholder',
      },
    }
  },

  addCommands() {
    return {
      setAiPlaceholder:
        ({ from, to }) =>
        ({ chain }) => {
          return chain()
            .focus()
            .insertContentAt(
              { from, to },
              {
                type: this.name,
              }
            )
            .setMeta('preventUpdate', true)
            .run()
        },
    }
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(AiPlaceholderView)
  },
})

export default AiPlaceholder