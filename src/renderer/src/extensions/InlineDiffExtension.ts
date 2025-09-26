import { Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { DiffResult, DiffFeature } from '../types/diffTypes'
import InlineDiff from '../components/InlineDiff'

export interface InlineDiffOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineDiff: {
      setInlineDiff: (options: {
        originalText: string
        newText: string
        diffResult: DiffResult
        feature: DiffFeature
      }) => ReturnType
    }
  }
}

export const InlineDiffExtension = Node.create<InlineDiffOptions>({
  name: 'inlineDiff',

  group: 'inline',

  inline: true,

  selectable: false, // 禁止选择节点

  atom: true,

  draggable: false, // 禁止拖拽

  addOptions() {
    return {
      HTMLAttributes: {}
    }
  },

  addAttributes() {
    return {
      originalText: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-original-text'),
        renderHTML: (attributes) => {
          if (!attributes.originalText) {
            return {}
          }
          return {
            'data-original-text': attributes.originalText
          }
        }
      },
      newText: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-new-text'),
        renderHTML: (attributes) => {
          if (!attributes.newText) {
            return {}
          }
          return {
            'data-new-text': attributes.newText
          }
        }
      },
      diffResult: {
        default: null,
        parseHTML: (element) => {
          const data = element.getAttribute('data-diff-result')
          return data ? JSON.parse(data) : null
        },
        renderHTML: (attributes) => {
          if (!attributes.diffResult) {
            return {}
          }
          return {
            'data-diff-result': JSON.stringify(attributes.diffResult)
          }
        }
      },
      feature: {
        default: null,
        parseHTML: (element) => {
          const data = element.getAttribute('data-feature')
          return data ? JSON.parse(data) : null
        },
        renderHTML: (attributes) => {
          if (!attributes.feature) {
            return {}
          }
          return {
            'data-feature': JSON.stringify(attributes.feature)
          }
        }
      },
      accepted: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-accepted') === 'true',
        renderHTML: (attributes) => {
          return {
            'data-accepted': attributes.accepted ? 'true' : 'false'
          }
        }
      }
    }
  },

  parseHTML() {
    // 不从HTML解析，防止被持久化
    return []
  },

  renderHTML() {
    // 不渲染到HTML，防止被保存
    return ['span', { 'data-type': 'inline-diff-placeholder' }, '']
  },

  addNodeView() {
    return ReactNodeViewRenderer(InlineDiff)
  },

  addCommands() {
    return {
      setInlineDiff:
        (options: {
          originalText: string
          newText: string
          diffResult: DiffResult
          feature: DiffFeature
        }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options
          })
        }
    }
  }
})

export default InlineDiffExtension


