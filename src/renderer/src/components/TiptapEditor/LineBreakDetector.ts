import { Extension } from '@tiptap/core'
import { Node as ProseMirrorNode } from '@tiptap/pm/model'

// 定义需要检测的"其他样式内容"节点类型
const STYLE_CONTENT_NODES = [
  'image',
  'table',
  'codeBlock',
  'blockquote',
  'horizontalRule',
  'bulletList',
  'orderedList',
  'aiPlaceholder',
  'codeBlockComponent'
]

// 定义一般文本节点类型
const TEXT_NODES = [
  'paragraph',
  'heading',
  'text'
]

export interface LineBreakDetectorOptions {
  enabled: boolean
  styleContentNodes: string[]
  textNodes: string[]
}

declare module '@tiptap/core' {
  interface ExtensionOptions {
    lineBreakDetector: LineBreakDetectorOptions
  }
}

export const LineBreakDetector = Extension.create<LineBreakDetectorOptions>({
  name: 'lineBreakDetector',

  addOptions() {
    return {
      enabled: true,
      styleContentNodes: STYLE_CONTENT_NODES,
      textNodes: TEXT_NODES,
    }
  },

  addCommands() {
    return {
      insertLineBreakBeforeText: () => ({ tr, dispatch }) => {
        if (!dispatch) return false
        
        const { selection } = tr
        const { $from } = selection
        
        // 检查当前节点是否为文本节点
        const currentNode = $from.parent
        if (!this.options.textNodes.includes(currentNode.type.name)) {
          return false
        }
        
        // 检查前面是否有样式内容节点
        const prevNode = this.getPreviousNode($from)
        if (prevNode && this.options.styleContentNodes.includes(prevNode.type.name)) {
          // 在文本节点前插入换行
          const brNode = tr.doc.type.schema.nodes.hardBreak.create()
          tr.insert($from.start(), brNode)
          return true
        }
        
        return false
      },

      insertLineBreakAfterText: () => ({ tr, dispatch }) => {
        if (!dispatch) return false
        
        const { selection } = tr
        const { $from } = selection
        
        // 检查当前节点是否为文本节点
        const currentNode = $from.parent
        if (!this.options.textNodes.includes(currentNode.type.name)) {
          return false
        }
        
        // 检查后面是否有样式内容节点
        const nextNode = this.getNextNode($from)
        if (nextNode && this.options.styleContentNodes.includes(nextNode.type.name)) {
          // 在文本节点后插入换行
          const brNode = tr.doc.type.schema.nodes.hardBreak.create()
          tr.insert($from.end(), brNode)
          return true
        }
        
        return false
      },

      autoInsertLineBreaks: () => ({ tr, dispatch }) => {
        if (!dispatch) return false
        
        let hasChanges = false
        const { doc } = tr
        
        // 遍历文档中的所有节点
        doc.descendants((node: ProseMirrorNode, pos: number) => {
          // 检查是否为文本节点
          if (this.options.textNodes.includes(node.type.name)) {
            const $pos = doc.resolve(pos)
            
            // 检查前面是否有样式内容节点
            const prevNode = this.getPreviousNode($pos)
            if (prevNode && this.options.styleContentNodes.includes(prevNode.type.name)) {
              const brNode = tr.doc.type.schema.nodes.hardBreak.create()
              tr.insert(pos, brNode)
              hasChanges = true
            }
            
            // 检查后面是否有样式内容节点
            const nextNode = this.getNextNode($pos)
            if (nextNode && this.options.styleContentNodes.includes(nextNode.type.name)) {
              const brNode = tr.doc.type.schema.nodes.hardBreak.create()
              tr.insert(pos + node.nodeSize, brNode)
              hasChanges = true
            }
          }
        })
        
        return hasChanges
      },
    }
  },

  onTransaction({ transaction }) {
    if (!this.options.enabled) return
    
    // 检查是否有内容变化
    if (transaction.docChanged) {
      const { doc } = transaction
      let hasChanges = false
      const newTr = transaction
      
      // 遍历文档中的所有节点
      doc.descendants((node: ProseMirrorNode, pos: number) => {
        // 检查是否为文本节点
        if (this.options.textNodes.includes(node.type.name)) {
          const $pos = doc.resolve(pos)
          
          // 检查前面是否有样式内容节点
          const prevNode = this.getPreviousNode($pos)
          if (prevNode && this.options.styleContentNodes.includes(prevNode.type.name)) {
            // 检查是否已经有换行符
            const prevContent = $pos.parent.textContent
            const textBefore = prevContent.substring(0, $pos.parentOffset)
            if (!textBefore.endsWith('\n') && !textBefore.endsWith('\r')) {
              const brNode = newTr.doc.type.schema.nodes.hardBreak.create()
              newTr.insert(pos, brNode)
              hasChanges = true
            }
          }
          
          // 检查后面是否有样式内容节点
          const nextNode = this.getNextNode($pos)
          if (nextNode && this.options.styleContentNodes.includes(nextNode.type.name)) {
            // 检查是否已经有换行符
            const nextContent = $pos.parent.textContent
            const textAfter = nextContent.substring($pos.parentOffset)
            if (!textAfter.startsWith('\n') && !textAfter.startsWith('\r')) {
              const brNode = newTr.doc.type.schema.nodes.hardBreak.create()
              newTr.insert(pos + node.nodeSize, brNode)
              hasChanges = true
            }
          }
        }
      })
      
      // 如果有变化，应用事务
      if (hasChanges) {
        this.editor.view.dispatch(newTr)
      }
    }
  },

  // 辅助方法：获取前一个节点
  getPreviousNode($pos: any): ProseMirrorNode | null {
    const { doc } = $pos
    const pos = $pos.pos
    
    if (pos <= 0) return null
    
    // 向前查找最近的节点
    let currentPos = pos - 1
    while (currentPos >= 0) {
      const node = doc.nodeAt(currentPos)
      if (node && node.type.name !== 'text') {
        return node
      }
      currentPos--
    }
    
    return null
  },

  // 辅助方法：获取后一个节点
  getNextNode($pos: any): ProseMirrorNode | null {
    const { doc } = $pos
    const pos = $pos.pos
    
    if (pos >= doc.content.size) return null
    
    // 向后查找最近的节点
    let currentPos = pos + 1
    while (currentPos < doc.content.size) {
      const node = doc.nodeAt(currentPos)
      if (node && node.type.name !== 'text') {
        return node
      }
      currentPos++
    }
    
    return null
  },
}) 