import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface TableColumnResizeOptions {
  handleWidth: number
  cellMinWidth: number
}

export const TableColumnResize = Extension.create<TableColumnResizeOptions>({
  name: 'tableColumnResize',

  addOptions() {
    return {
      handleWidth: 5,
      cellMinWidth: 50
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('tableColumnResize'),
        
        props: {
          decorations: (state) => {
            const decorations: Decoration[] = []
            const { doc } = state
            
            doc.descendants((node, pos) => {
              if (node.type.name === 'table') {
                // 为每个表格添加resize装饰器
                decorations.push(
                  Decoration.widget(pos + node.nodeSize, () => {
                    const resizeContainer = document.createElement('div')
                    resizeContainer.className = 'table-resize-container'
                    resizeContainer.style.cssText = `
                      position: absolute;
                      top: 0;
                      left: 0;
                      width: 100%;
                      height: 100%;
                      pointer-events: none;
                      z-index: 1;
                    `
                    
                    return resizeContainer
                  }, {
                    side: 1,
                    key: `table-resize-${pos}`
                  })
                )
              }
              return false
            })
            
            return DecorationSet.create(doc, decorations)
          },

          handleDOMEvents: {
            mousemove: (view, event) => {
              const target = event.target as HTMLElement
              const table = target.closest('table')
              
              if (table && view.state.selection.empty) {
                const rect = table.getBoundingClientRect()
                const cells = table.querySelectorAll('td, th')
                
                // 显示列边界的resize光标
                cells.forEach((cell, index) => {
                  const cellRect = cell.getBoundingClientRect()
                  const rightEdge = cellRect.right
                  
                  if (Math.abs(event.clientX - rightEdge) < 5) {
                    document.body.style.cursor = 'col-resize'
                  }
                })
                
                // 如果不在resize区域，重置光标
                if (!Array.from(cells).some(cell => {
                  const cellRect = cell.getBoundingClientRect()
                  return Math.abs(event.clientX - cellRect.right) < 5
                })) {
                  document.body.style.cursor = ''
                }
              }
              
              return false
            },

            mousedown: (view, event) => {
              const target = event.target as HTMLElement
              const table = target.closest('table')
              
              if (table) {
                const cells = table.querySelectorAll('td, th')
                let resizingCell: Element | null = null
                
                // 检查是否点击在列边界上
                cells.forEach(cell => {
                  const cellRect = cell.getBoundingClientRect()
                  if (Math.abs(event.clientX - cellRect.right) < 5) {
                    resizingCell = cell
                  }
                })
                
                if (resizingCell) {
                  event.preventDefault()
                  
                  const startX = event.clientX
                  const startWidth = (resizingCell as HTMLElement).offsetWidth
                  
                  const handleMouseMove = (e: MouseEvent) => {
                    const deltaX = e.clientX - startX
                    const newWidth = Math.max(this.options.cellMinWidth, startWidth + deltaX)
                    
                    ;(resizingCell as HTMLElement).style.width = `${newWidth}px`
                    ;(resizingCell as HTMLElement).style.minWidth = `${newWidth}px`
                  }
                  
                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove)
                    document.removeEventListener('mouseup', handleMouseUp)
                    document.body.style.cursor = ''
                  }
                  
                  document.addEventListener('mousemove', handleMouseMove)
                  document.addEventListener('mouseup', handleMouseUp)
                  document.body.style.cursor = 'col-resize'
                  
                  return true
                }
              }
              
              return false
            },

            mouseleave: () => {
              document.body.style.cursor = ''
              return false
            }
          }
        }
      })
    ]
  }
})

export default TableColumnResize