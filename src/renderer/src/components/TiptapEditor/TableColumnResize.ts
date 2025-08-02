import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

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
    const options = this.options
    
    return [
      new Plugin({
        key: new PluginKey('tableColumnResize'),
        
        view(editorView) {
          let resizeHandles: HTMLElement[] = []
          let isResizing = false
          let currentHandle: HTMLElement | null = null
          let startX = 0
          let startWidth = 0
          let resizeColumn = -1
          
          const addResizeHandles = () => {
            // 清除现有的resize handles
            resizeHandles.forEach(handle => handle.remove())
            resizeHandles = []
            
            const tables = editorView.dom.querySelectorAll('table')
            
            tables.forEach(table => {
              const firstRow = table.querySelector('tr')
              if (!firstRow) return
              
              const cells = firstRow.querySelectorAll('td, th')
              
              cells.forEach((cell, index) => {
                // 不为最后一列添加resize handle
                if (index >= cells.length - 1) return
                
                const handle = document.createElement('div')
                handle.className = 'column-resize-handle'
                handle.style.cssText = `
                  position: absolute;
                  top: 0;
                  right: -2px;
                  bottom: 0;
                  width: 4px;
                  background-color: var(--semi-color-primary);
                  opacity: 0;
                  cursor: col-resize;
                  z-index: 20;
                  transition: opacity 0.2s;
                `
                
                // 相对于cell定位
                const cellElement = cell as HTMLElement
                cellElement.style.position = 'relative'
                cellElement.appendChild(handle)
                
                // 添加事件监听
                handle.addEventListener('mousedown', (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  
                  isResizing = true
                  currentHandle = handle
                  startX = e.clientX
                  startWidth = cellElement.offsetWidth
                  resizeColumn = index
                  
                  handle.style.opacity = '1'
                  document.body.style.cursor = 'col-resize'
                  document.body.style.userSelect = 'none'
                  
                  document.addEventListener('mousemove', handleMouseMove)
                  document.addEventListener('mouseup', handleMouseUp)
                })
                
                handle.addEventListener('mouseenter', () => {
                  if (!isResizing) {
                    handle.style.opacity = '1'
                  }
                })
                
                handle.addEventListener('mouseleave', () => {
                  if (!isResizing) {
                    handle.style.opacity = '0'
                  }
                })
                
                resizeHandles.push(handle)
              })
              
              // 表格hover时显示resize handles
              table.addEventListener('mouseenter', () => {
                resizeHandles.forEach(handle => {
                  if (!isResizing) {
                    handle.style.opacity = '0.6'
                  }
                })
              })
              
              table.addEventListener('mouseleave', () => {
                resizeHandles.forEach(handle => {
                  if (!isResizing) {
                    handle.style.opacity = '0'
                  }
                })
              })
            })
          }
          
          const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing || !currentHandle || resizeColumn === -1) return
            
            const deltaX = e.clientX - startX
            const newWidth = Math.max(options.cellMinWidth, startWidth + deltaX)
            
            // 找到当前表格的所有行
            const table = currentHandle.closest('table')
            if (!table) return
            
            const rows = table.querySelectorAll('tr')
            rows.forEach(row => {
              const cell = row.children[resizeColumn] as HTMLElement
              if (cell) {
                cell.style.width = `${newWidth}px`
                cell.style.minWidth = `${newWidth}px`
              }
            })
          }
          
          const handleMouseUp = () => {
            if (!isResizing) return
            
            isResizing = false
            if (currentHandle) {
              currentHandle.style.opacity = '0'
            }
            currentHandle = null
            resizeColumn = -1
            
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
            
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
          }
          
          // 初始化
          setTimeout(addResizeHandles, 0)
          
          return {
            update: () => {
              // 当编辑器更新时重新添加resize handles
              setTimeout(addResizeHandles, 0)
            },
            destroy: () => {
              resizeHandles.forEach(handle => handle.remove())
              document.removeEventListener('mousemove', handleMouseMove)
              document.removeEventListener('mouseup', handleMouseUp)
            }
          }
        }
      })
    ]
  }
})

export default TableColumnResize