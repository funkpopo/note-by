import React from 'react'
import { createPortal } from 'react-dom'

interface StreamingOverlayProps {
  visible: boolean
  title?: string
  content: string
  modelName?: string
  cancellable?: boolean
  onCancel?: () => void
  status?: 'streaming' | 'complete' | 'error'
}

const StreamingOverlay: React.FC<StreamingOverlayProps> = ({
  visible,
  title,
  content,
  modelName,
  cancellable = true,
  onCancel,
  status = 'streaming'
}) => {
  if (!visible) return null

  const node = (
    <div className={`ai-stream-overlay ${status}`} role="status" aria-live="polite">
      <div className="ai-stream-header">
        <div className="ai-stream-title">
          {title || 'AI 正在生成...'}
          {modelName ? <span className="ai-stream-model">{modelName}</span> : null}
        </div>
        {cancellable && onCancel ? (
          <button className="ai-stream-cancel" onClick={onCancel} title="停止生成">
            ×
          </button>
        ) : null}
      </div>
      <div className="ai-stream-body">
        {content ? (
          <pre className="ai-stream-text">{content}</pre>
        ) : (
          <div className="ai-stream-spinner" />
        )}
      </div>
    </div>
  )

  return createPortal(node, document.body)
}

export default StreamingOverlay
