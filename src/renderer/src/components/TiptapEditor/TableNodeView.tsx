import React, { useCallback, useEffect, useRef } from 'react'
import { NodeViewWrapper, ReactNodeViewRenderer, ReactNodeViewProps } from '@tiptap/react'
import { FiMove, FiGrid, FiPlus } from 'react-icons/fi'

const TableNodeView: React.FC<ReactNodeViewProps> = ({ 
  editor
}) => {
  const tableRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = React.useState(false)
  const [isDragging, setIsDragging] = React.useState(false)

  // Handle table drag functionality
  const handleDragStart = useCallback((e: React.DragEvent) => {
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', tableRef.current?.innerHTML || '')
  }, [])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Handle mouse events for showing/hiding controls
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
  }, [])

  // Add column/row buttons
  const addColumnBefore = useCallback(() => {
    editor.chain().focus().addColumnBefore().run()
  }, [editor])

  const addRowBefore = useCallback(() => {
    editor.chain().focus().addRowBefore().run()
  }, [editor])

  const deleteTable = useCallback(() => {
    editor.chain().focus().deleteTable().run()
  }, [editor])

  // Enhanced cell selection support
  useEffect(() => {
    if (!tableRef.current) return

    const table = tableRef.current.querySelector('table')
    if (!table) return

    const handleCellMouseDown = (e: MouseEvent) => {
      const cell = (e.target as HTMLElement).closest('td, th')
      if (!cell) return

      // Start cell selection tracking
      let isSelecting = false
      const startCell = cell
      
      const handleCellMouseEnter = (e: MouseEvent) => {
        if (!isSelecting) return
        
        const currentCell = (e.target as HTMLElement).closest('td, th')
        if (currentCell && currentCell !== startCell) {
          // Visual feedback for multi-cell selection
          const cells = Array.from(table.querySelectorAll('td, th'))
          const startIndex = cells.indexOf(startCell as HTMLTableCellElement)
          const endIndex = cells.indexOf(currentCell as HTMLTableCellElement)
          
          // Clear previous selection
          cells.forEach(c => c.classList.remove('table-cell-selected'))
          
          // Add selection to range
          const minIndex = Math.min(startIndex, endIndex)
          const maxIndex = Math.max(startIndex, endIndex)
          for (let i = minIndex; i <= maxIndex; i++) {
            cells[i]?.classList.add('table-cell-selected')
          }
        }
      }

      const handleMouseUp = () => {
        isSelecting = false
        document.removeEventListener('mousemove', handleCellMouseEnter)
        document.removeEventListener('mouseup', handleMouseUp)
        
        // Clean up selection classes
        setTimeout(() => {
          table.querySelectorAll('.table-cell-selected').forEach(c => {
            c.classList.remove('table-cell-selected')
          })
        }, 100)
      }

      // Only start selecting if holding shift or ctrl
      if (e.shiftKey || e.ctrlKey) {
        isSelecting = true
        document.addEventListener('mousemove', handleCellMouseEnter)
        document.addEventListener('mouseup', handleMouseUp)
      }
    }

    table.addEventListener('mousedown', handleCellMouseDown)

    return () => {
      table.removeEventListener('mousedown', handleCellMouseDown)
    }
  }, [])

  return (
    <NodeViewWrapper className="table-node-wrapper">
      <div
        ref={tableRef}
        className={`table-container ${isHovered ? 'hovered' : ''} ${isDragging ? 'dragging' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ position: 'relative' }}
      >
        {/* Table controls */}
        {isHovered && (
          <div className="table-controls" style={{
            position: 'absolute',
            top: '-36px',
            left: '0',
            display: 'flex',
            gap: '4px',
            zIndex: 10,
            background: 'var(--semi-color-bg-2)',
            border: '1px solid var(--semi-color-border)',
            borderRadius: '6px',
            padding: '4px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}>
            {/* Drag handle */}
            <button
              className="table-control-button"
              title="拖拽移动表格"
              draggable
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px',
                borderRadius: '4px',
                cursor: 'move',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--semi-color-text-1)'
              }}
            >
              <FiMove size={14} />
            </button>

            {/* Add column before */}
            <button
              className="table-control-button"
              title="在前方插入列"
              onClick={addColumnBefore}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--semi-color-text-1)'
              }}
            >
              <FiPlus size={12} />
              <span style={{ fontSize: '10px', marginLeft: '2px' }}>列</span>
            </button>

            {/* Add row before */}
            <button
              className="table-control-button"
              title="在上方插入行"
              onClick={addRowBefore}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--semi-color-text-1)'
              }}
            >
              <FiPlus size={12} />
              <span style={{ fontSize: '10px', marginLeft: '2px' }}>行</span>
            </button>

            {/* Delete table */}
            <button
              className="table-control-button"
              title="删除表格"
              onClick={deleteTable}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--semi-color-danger)'
              }}
            >
              <FiGrid size={14} />
            </button>
          </div>
        )}

        {/* The actual table content will be rendered here by Tiptap */}
        <div className="table-content" />
      </div>
    </NodeViewWrapper>
  )
}

// Export the node view renderer
export const TableNodeViewRenderer = ReactNodeViewRenderer(TableNodeView)

export default TableNodeView