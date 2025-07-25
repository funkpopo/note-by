import React from 'react'
import { NodeViewProps } from '@tiptap/core'
import { NodeViewWrapper } from '@tiptap/react'
import BounceSpinner from './BounceSpinner'

const AiPlaceholderView: React.FC<NodeViewProps> = ({ editor }) => {
  return (
    <NodeViewWrapper>
      <div className="flex items-baseline">
        <BounceSpinner className="ms-2" />
      </div>
    </NodeViewWrapper>
  )
}

export default AiPlaceholderView