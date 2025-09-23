import React, { useEffect } from 'react'
import { Button, Space } from '@douyinfe/semi-ui'
import { IconClose } from '@douyinfe/semi-icons'
import { NodeViewWrapper } from '@tiptap/react'
import { Editor } from '@tiptap/react'
import { DiffResult, DiffFeature, DiffItem } from '../types/diffTypes'
import './InlineDiff.css'

// 自定义Check图标
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
  </svg>
)

interface InlineDiffNode {
  attrs: {
    originalText: string
    newText: string
    diffResult: DiffResult
    feature: DiffFeature
  }
}

interface InlineDiffProps {
  node: InlineDiffNode
  updateAttributes: (attrs: Partial<InlineDiffNode['attrs']>) => void
  deleteNode: () => void
  getPos: () => number
  editor: Editor
}

const InlineDiff: React.FC<InlineDiffProps> = ({ node, getPos, editor }) => {
  const { originalText, newText, diffResult, feature } = node.attrs
  const [isHovered, setIsHovered] = React.useState(false)
  const wrapperRef = React.useRef<HTMLDivElement | null>(null)

  // Dynamically clamp bubble width to editor viewport to avoid overflow
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return

    const EDGE_GAP = 12 // Keep a small gap from editor edges

    const measure = () => {
      // Find the nearest editor container
      const editorContainer =
        (editor?.view?.dom?.closest?.('.tiptap-editor') as HTMLElement | null) ||
        (el.closest('.tiptap-editor') as HTMLElement | null) ||
        (editor?.view?.dom?.parentElement as HTMLElement | null) ||
        document.body

      const containerRect = editorContainer.getBoundingClientRect()
      const selfRect = el.getBoundingClientRect()

      // Available space from current left to editor right edge
      const availableRight = Math.max(0, containerRect.right - selfRect.left - EDGE_GAP)

      // Ensure a sensible minimum and cap to container width
      const maxWidthPx = Math.max(160, Math.min(availableRight, containerRect.width - EDGE_GAP * 2))

      el.style.setProperty('--inline-diff-max-width', `${Math.floor(maxWidthPx)}px`)
    }

    // Measure on next frame to ensure layout is ready
    const raf = requestAnimationFrame(measure)

    // Recalculate on resize
    const handleResize = () => measure()
    window.addEventListener('resize', handleResize)

    // Observe container size changes
    const editorContainer =
      (editor?.view?.dom?.closest?.('.tiptap-editor') as HTMLElement | null) ||
      (el.closest('.tiptap-editor') as HTMLElement | null)
    const ro = editorContainer ? new ResizeObserver(measure) : null
    if (editorContainer && ro) ro.observe(editorContainer)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', handleResize)
      if (editorContainer && ro) ro.disconnect()
    }
  }, [editor])

  // 组件挂载时记录节点，卸载时清理
  useEffect(() => {
    // InlineDiff组件挂载

    return () => {
      // 组件卸载时的清理逻辑
      // InlineDiff组件卸载
    }
  }, [getPos])

  const handleAccept = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // 获取当前节点的位置
    const pos = getPos()
    // 获取节点在编辑器中的实际大小
    const nodeSize = editor.state.doc.nodeAt(pos)?.nodeSize || 1

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
    // 获取节点在编辑器中的实际大小
    const nodeSize = editor.state.doc.nodeAt(pos)?.nodeSize || 1

    // 替换整个节点为原文本
    editor.view.dispatch(
      editor.state.tr.replaceWith(pos, pos + nodeSize, editor.schema.text(originalText))
    )
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
    <NodeViewWrapper className="inline-diff-wrapper" contentEditable={false} draggable={false}>
      <div
        ref={wrapperRef}
        className={`inline-diff ${isHovered ? 'hovered' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        <div className="inline-diff-content">
          <div className="inline-diff-text">{renderDiffText()}</div>

          <div className={`inline-diff-actions ${isHovered ? 'visible' : ''}`}>
            <Space>
              <Button
                icon={<IconClose />}
                size="small"
                type="tertiary"
                onClick={handleReject}
                title="取消"
              />
              <Button
                icon={<IconCheck />}
                size="small"
                type="primary"
                onClick={handleAccept}
                title="确认"
              />
            </Space>
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  )
}

export default InlineDiff
