import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface TableResizeOptions {
  handleWidth: number
  cellMinWidth: number
  View: any
  lastColumnResizable: boolean
}

export const TableResize = Extension.create<TableResizeOptions>({
  name: 'tableResize',

  addOptions() {
    return {
      handleWidth: 5,
      cellMinWidth: 50,
      View: null,
      lastColumnResizable: true
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('tableResize'),
        
        state: {
          init() {
            return {
              activeHandle: -1,
              dragging: false
            }
          },
          
          apply() {
            return {
              activeHandle: -1,
              dragging: false
            }
          }
        },

        props: {
          decorations: (state) => {
            const decorations: Decoration[] = []
            const { doc } = state
            
            // Find all table nodes in the document
            doc.descendants((node, pos) => {
              if (node.type.name === 'table') {
                // Add resize handles for each column
                const table = node
                if (table.firstChild) {
                  const firstRow = table.firstChild
                  let colIndex = 0
                  
                  firstRow.forEach(() => {
                    const cellPos = pos + 1 + colIndex + 1 // +1 for table, +1 for row, +1 for cell
                    
                    // Add column resize handle
                    decorations.push(
                      Decoration.widget(cellPos, () => {
                        const handle = document.createElement('div')
                        handle.className = 'column-resize-handle'
                        handle.style.cssText = `
                          position: absolute;
                          right: -2px;
                          top: 0;
                          bottom: 0;
                          width: ${this.options.handleWidth}px;
                          cursor: col-resize;
                          background: var(--semi-color-primary);
                          opacity: 0;
                          transition: opacity 0.2s;
                          z-index: 10;
                        `
                        
                        let startX = 0
                        let startWidth = 0
                        let isResizing = false
                        
                        const handleMouseDown = (e: MouseEvent) => {
                          e.preventDefault()
                          e.stopPropagation()
                          
                          isResizing = true
                          startX = e.clientX
                          
                          const cellElement = handle.closest('td, th') as HTMLTableCellElement
                          if (cellElement) {
                            startWidth = cellElement.offsetWidth
                          }
                          
                          document.addEventListener('mousemove', handleMouseMove)
                          document.addEventListener('mouseup', handleMouseUp)
                          
                          handle.style.opacity = '1'
                          document.body.style.cursor = 'col-resize'
                        }
                        
                        const handleMouseMove = (e: MouseEvent) => {
                          if (!isResizing) return
                          
                          const deltaX = e.clientX - startX
                          const newWidth = Math.max(this.options.cellMinWidth, startWidth + deltaX)
                          
                          const cellElement = handle.closest('td, th') as HTMLTableCellElement
                          if (cellElement) {
                            cellElement.style.width = `${newWidth}px`
                            cellElement.style.minWidth = `${newWidth}px`
                          }
                        }
                        
                        const handleMouseUp = () => {
                          isResizing = false
                          document.removeEventListener('mousemove', handleMouseMove)
                          document.removeEventListener('mouseup', handleMouseUp)
                          
                          handle.style.opacity = '0'
                          document.body.style.cursor = ''
                        }
                        
                        handle.addEventListener('mousedown', handleMouseDown)
                        
                        return handle
                      }, {
                        side: 1,
                        key: `column-resize-${colIndex}`
                      })
                    )
                    
                    colIndex++
                  })
                }
              }
              return false
            })
            
            return DecorationSet.create(doc, decorations)
          },

          handleDOMEvents: {
            mouseover: () => {
              // Show resize handles on table hover
              return false
            },
            
            mouseout: () => {
              // Hide resize handles when not hovering
              return false
            }
          }
        }
      })
    ]
  }
})

export default TableResize