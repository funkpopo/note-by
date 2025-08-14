import React, { useState, useEffect } from 'react'
import { Button, Space } from '@douyinfe/semi-ui'
import { IconClose, IconEdit } from '@douyinfe/semi-icons'
import { NodeViewWrapper } from '@tiptap/react'
import { DiffResult, DiffItem } from '../utils/diffUtils'
import './InlineDiff.css'

// 自定义Check图标
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
  </svg>
)

interface InlineDiffProps {
  node: any
  updateAttributes: (attrs: any) => void
  deleteNode: () => void
  getPos: () => number
  editor: any
}

const InlineDiff: React.FC<InlineDiffProps> = ({ node, updateAttributes, deleteNode, getPos, editor }) => {
  const { originalText, newText, diffResult, feature } = node.attrs
  const [isCollapsed, setIsCollapsed] = useState(false)

  // 组件挂载时记录节点，卸载时清理
  useEffect(() => {
    const pos = getPos()
    
    // 这里可以添加节点跟踪逻辑
    
    return () => {
      // 组件卸载时的清理逻辑
    }
  }, [getPos])

  const handleAccept = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // 获取当前节点的位置
    const pos = getPos()
    const nodeSize = node.nodeSize
    
    // 替换整个节点为新文本
    editor.view.dispatch(
      editor.state.tr.replaceWith(pos, pos + nodeSize, editor.schema.text(newText))
    )
  }

  const handleReject = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // 获取当前节点的位置
    const pos = getPos()
    const nodeSize = node.nodeSize
    
    // 替换整个节点为原文本
    editor.view.dispatch(
      editor.state.tr.replaceWith(pos, pos + nodeSize, editor.schema.text(originalText))
    )
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsCollapsed(!isCollapsed)
  }

  const renderDiffText = () => {
    if (!diffResult || !diffResult.diffs) return null

    return diffResult.diffs.map((diff: DiffItem, index: number) => {
      let className = 'diff-text'
      let text = ''

      switch (diff.type) {
        case 'insert':
          className += ' diff-insert'
          text = diff.newText
          break
        case 'delete':
          className += ' diff-delete'
          text = diff.originalText
          break
        case 'replace':
          return (
            <span key={index} className="diff-replace">
              <span className="diff-text diff-delete">{diff.originalText}</span>
              <span className="diff-text diff-insert">{diff.newText}</span>
            </span>
          )
        case 'equal':
          className += ' diff-equal'
          text = diff.originalText
          break
        default:
          text = diff.originalText || diff.newText
      }

      return (
        <span key={index} className={className}>
          {text}
        </span>
      )
    })
  }

  return (
    <NodeViewWrapper 
      className="inline-diff-wrapper"
      contentEditable={false}
      draggable={false}
    >
      <div 
        className="inline-diff"
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onSelectStart={(e) => {
          e.preventDefault()
          return false
        }}
      >
        <div className="inline-diff-header">
          <span className="inline-diff-label">AI{feature?.label || '处理'}结果</span>
          <Space size="small">
            <Button
              size="small"
              type="tertiary"
              onClick={handleToggle}
            >
              {isCollapsed ? '展开' : '收起'}
            </Button>
          </Space>
        </div>
        
        {!isCollapsed && (
          <div className="inline-diff-content">
            <div className="inline-diff-text">
              {renderDiffText()}
            </div>
            
            <div className="inline-diff-actions">
              <Space size="small">
                <Button
                  icon={<IconClose />}
                  size="small"
                  type="tertiary"
                  onClick={handleReject}
                >
                  拒绝
                </Button>
                <Button
                  icon={<IconCheck />}
                  size="small"
                  type="primary"
                  onClick={handleAccept}
                >
                  接受
                </Button>
              </Space>
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

export default InlineDiff