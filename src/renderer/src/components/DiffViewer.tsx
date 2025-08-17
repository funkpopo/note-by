import React, { useState, useCallback, useEffect } from 'react'
import { Button, Space, Spin, Divider } from '@douyinfe/semi-ui'
import { IconClose, IconEdit } from '@douyinfe/semi-icons'
import { DiffResult, DiffItem, applyDiff } from '../utils/diffUtils'
import './DiffViewer.css'

// 使用自定义的Check图标
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
  </svg>
)

interface DiffViewerProps {
  originalText: string
  newText: string
  diffResult: DiffResult
  title?: string
  onAccept?: (finalText: string) => void
  onReject?: () => void
  onEdit?: (text: string) => void
  loading?: boolean
  className?: string
}

interface DiffLineProps {
  diff: DiffItem
  showLineNumbers?: boolean
  lineNumber?: number
}

/**
 * 单个diff行组件
 */
const DiffLine: React.FC<DiffLineProps> = ({ diff, showLineNumbers, lineNumber }) => {
  const getClassName = () => {
    switch (diff.type) {
      case 'insert':
        return 'diff-line diff-insert'
      case 'delete':
        return 'diff-line diff-delete'
      case 'replace':
        return 'diff-line diff-replace'
      case 'equal':
        return 'diff-line diff-equal'
      default:
        return 'diff-line'
    }
  }

  const getPrefix = () => {
    switch (diff.type) {
      case 'insert':
        return '+'
      case 'delete':
        return '-'
      case 'replace':
        return '~'
      case 'equal':
        return ' '
      default:
        return ' '
    }
  }

  const renderContent = () => {
    if (diff.type === 'replace') {
      return (
        <div className="diff-replace-content">
          <div className="diff-original">
            <span className="diff-prefix">-</span>
            <span className="diff-text">{diff.originalText}</span>
          </div>
          <div className="diff-new">
            <span className="diff-prefix">+</span>
            <span className="diff-text">{diff.newText}</span>
          </div>
        </div>
      )
    }

    const text = diff.type === 'delete' ? diff.originalText : diff.newText
    return (
      <div className="diff-single-content">
        <span className="diff-prefix">{getPrefix()}</span>
        {showLineNumbers && <span className="diff-line-number">{lineNumber}</span>}
        <span className="diff-text">{text}</span>
      </div>
    )
  }

  return <div className={getClassName()}>{renderContent()}</div>
}

/**
 * Diff查看器主组件
 */
const DiffViewer: React.FC<DiffViewerProps> = ({
  originalText,
  newText,
  diffResult,
  title = 'AI生成内容对比',
  onAccept,
  onReject,
  onEdit,
  loading = false,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showLineNumbers, setShowLineNumbers] = useState(false)

  // 检测是否是多行文本
  const isMultiLine = originalText.includes('\n') || newText.includes('\n')

  // 统计变更信息
  const stats = React.useMemo(() => {
    const insertions = diffResult.diffs.filter((d) => d.type === 'insert').length
    const deletions = diffResult.diffs.filter((d) => d.type === 'delete').length
    const replacements = diffResult.diffs.filter((d) => d.type === 'replace').length

    return { insertions, deletions, replacements }
  }, [diffResult.diffs])

  const handleAccept = useCallback(() => {
    if (onAccept) {
      const finalText = applyDiff(originalText, diffResult.diffs)
      onAccept(finalText)
    }
  }, [originalText, diffResult.diffs, onAccept])

  const handleReject = useCallback(() => {
    onReject?.()
  }, [onReject])

  const handleEdit = useCallback(() => {
    if (onEdit) {
      const finalText = applyDiff(originalText, diffResult.diffs)
      onEdit(finalText)
    }
  }, [originalText, diffResult.diffs, onEdit])

  useEffect(() => {
    // 如果是多行文本，默认显示行号
    if (isMultiLine) {
      setShowLineNumbers(true)
    }
  }, [isMultiLine])

  if (loading) {
    return (
      <div className={`diff-viewer loading ${className}`}>
        <div className="diff-header">
          <div className="diff-title">
            <Spin size="small" />
            <span>AI正在生成差异对比...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!diffResult.hasChanges) {
    return (
      <div className={`diff-viewer no-changes ${className}`}>
        <div className="diff-header">
          <div className="diff-title">
            <IconCheck />
            <span>内容无变化</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`diff-viewer ${className}`}>
      <div className="diff-header">
        <div className="diff-title">
          <span>{title}</span>
          <div className="diff-stats">
            {stats.insertions > 0 && (
              <span className="diff-stat diff-stat-insert">+{stats.insertions}</span>
            )}
            {stats.deletions > 0 && (
              <span className="diff-stat diff-stat-delete">-{stats.deletions}</span>
            )}
            {stats.replacements > 0 && (
              <span className="diff-stat diff-stat-replace">~{stats.replacements}</span>
            )}
          </div>
        </div>

        <div className="diff-actions">
          <Space>
            {isMultiLine && (
              <Button
                size="small"
                type="tertiary"
                onClick={() => setShowLineNumbers(!showLineNumbers)}
              >
                {showLineNumbers ? '隐藏行号' : '显示行号'}
              </Button>
            )}

            <Button size="small" type="tertiary" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? '收起' : '展开'}
            </Button>
          </Space>
        </div>
      </div>

      {isExpanded && (
        <>
          <div className="diff-content">
            {diffResult.diffs.map((diff, index) => (
              <DiffLine
                key={`${diff.index}-${index}`}
                diff={diff}
                showLineNumbers={showLineNumbers && isMultiLine}
                lineNumber={index + 1}
              />
            ))}
          </div>

          <Divider margin="12px" />

          <div className="diff-footer">
            <div className="diff-preview">
              <span className="diff-preview-label">预览结果:</span>
              <div className="diff-preview-content">
                {applyDiff(originalText, diffResult.diffs)}
              </div>
            </div>

            <div className="diff-controls">
              <Space>
                {onReject && (
                  <Button
                    icon={<IconClose />}
                    onClick={handleReject}
                    type="tertiary"
                    theme="borderless"
                  >
                    拒绝
                  </Button>
                )}

                {onEdit && (
                  <Button icon={<IconEdit />} onClick={handleEdit} type="secondary">
                    编辑
                  </Button>
                )}

                {onAccept && (
                  <Button icon={<IconCheck />} onClick={handleAccept} type="primary">
                    接受更改
                  </Button>
                )}
              </Space>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default DiffViewer
export type { DiffViewerProps }
