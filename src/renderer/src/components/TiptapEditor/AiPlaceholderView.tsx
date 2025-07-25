import React from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import BounceSpinner from './BounceSpinner'

const AiPlaceholderView: React.FC = () => {
  return (
    <NodeViewWrapper>
      <div className="flex items-baseline">
        <BounceSpinner className="ms-2" />
      </div>
    </NodeViewWrapper>
  )
}

export default AiPlaceholderView