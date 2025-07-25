import React from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { 
  FiMoreVertical, 
  FiType,
  FiList,
  FiCode,
  FiMessageSquare
} from 'react-icons/fi'
import { Editor } from '@tiptap/react'

interface DraggableBlockProps {
  id: string
  editor: Editor
  children: React.ReactNode
}

const DraggableBlock: React.FC<DraggableBlockProps> = ({ id, editor, children }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id,
  })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }
  
  const addBlockBefore = (type: string) => {
    const { from } = editor.state.selection
    switch (type) {
      case 'heading':
        editor.chain().focus().insertContentAt(from, { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'New Heading' }] }).run()
        break
      case 'paragraph':
        editor.chain().focus().insertContentAt(from, { type: 'paragraph', content: [{ type: 'text', text: 'New paragraph' }] }).run()
        break
      case 'bulletList':
        editor.chain().focus().insertContentAt(from, { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'New list item' }] }] }] }).run()
        break
      case 'codeBlock':
        editor.chain().focus().insertContentAt(from, { type: 'codeBlock', content: [{ type: 'text', text: '// New code block' }] }).run()
        break
      case 'blockquote':
        editor.chain().focus().insertContentAt(from, { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'New quote' }] }] }).run()
        break
      default:
        editor.chain().focus().insertContentAt(from, { type: 'paragraph', content: [{ type: 'text', text: 'New paragraph' }] }).run()
    }
  }
  
  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="draggable-block"
    >
      <div className="block-actions">
        <button 
          className="drag-handle"
          {...listeners}
          {...attributes}
        >
          <FiMoreVertical size={16} />
        </button>
        <div className="add-block-buttons">
          <button 
            onClick={() => addBlockBefore('heading')}
          >
            <FiType size={16} />
          </button>
          <button 
            onClick={() => addBlockBefore('bulletList')}
          >
            <FiList size={16} />
          </button>
          <button 
            onClick={() => addBlockBefore('codeBlock')}
          >
            <FiCode size={16} />
          </button>
          <button 
            onClick={() => addBlockBefore('blockquote')}
          >
            <FiMessageSquare size={16} />
          </button>
        </div>
      </div>
      <div className="block-content">
        {children}
      </div>
    </div>
  )
}

export default DraggableBlock