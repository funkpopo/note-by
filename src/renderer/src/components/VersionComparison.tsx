import React, { useEffect, useMemo, useState, lazy, Suspense } from 'react'
import { Button, Space, Divider, Typography, Tooltip, Spin } from '@douyinfe/semi-ui'
import { IconClose, IconRefresh } from '@douyinfe/semi-icons'
import { useEditor, EditorContent } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { Typography as TypographyExt } from '@tiptap/extension-typography'
import { Highlight } from '@tiptap/extension-highlight'
import { TextAlign } from '@tiptap/extension-text-align'
import { Link } from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { Node } from '@tiptap/core'
import { createLowlight } from 'lowlight'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import cpp from 'highlight.js/lib/languages/cpp'
import c from 'highlight.js/lib/languages/c'
import csharp from 'highlight.js/lib/languages/csharp'
import go from 'highlight.js/lib/languages/go'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import json from 'highlight.js/lib/languages/json'
import sql from 'highlight.js/lib/languages/sql'
import bash from 'highlight.js/lib/languages/bash'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import { smartDiff, DiffResult, type DiffItem } from '../utils/diffUtils'
import type { HistoryItem } from '../../../shared/types/common'
// Lazily load virtual list to reduce initial bundle
const LazyVirtualList = lazy(() => import('./VirtualList'))
import type { VirtualListItem } from './VirtualList'
import './VersionComparison.css'

// 使用自定义的Compare图标
const IconCompare = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 3L5 6.99h3V14h2V6.99h3L9 3zm7 14.01V10h-2v7.01h-3L15 21l4-3.99h-3z" />
  </svg>
)

const lowlight = createLowlight()

// 注册需要的语言
lowlight.register('javascript', javascript)
lowlight.register('typescript', typescript)
lowlight.register('python', python)
lowlight.register('java', java)
lowlight.register('cpp', cpp)
lowlight.register('c', c)
lowlight.register('csharp', csharp)
lowlight.register('go', go)
lowlight.register('xml', xml)
lowlight.register('css', css)
lowlight.register('json', json)
lowlight.register('sql', sql)
lowlight.register('bash', bash)
lowlight.register('dockerfile', dockerfile)

// 简化的图片扩展（只读）
const ReadOnlyImageExtension = Node.create({
  name: 'image',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null
      },
      alt: {
        default: null
      },
      title: {
        default: null
      },
      width: {
        default: null
      },
      height: {
        default: null
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', HTMLAttributes]
  }
})

// 简化的嵌入内容扩展（只读）
const ReadOnlyIframeExtension = Node.create({
  name: 'iframe',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null
      },
      width: {
        default: '100%'
      },
      height: {
        default: '315'
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'iframe[src]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['iframe', HTMLAttributes]
  }
})

// HistoryItem moved to shared/types/common

interface VersionComparisonProps {
  currentContent: string
  historyItem: HistoryItem
  onClose: () => void
  onRestore?: (content: string) => void
  className?: string
}

// 侧边并排预览组件
const SideBySideEditor: React.FC<{ content: string; title: string; isChanged: boolean }> = ({
  content,
  title,
  isChanged
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        code: false,
        codeBlock: false
      }),
      Underline,
      TypographyExt,
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: 'editor-highlight'
        }
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'editor-link'
        }
      }),
      ReadOnlyImageExtension,
      Table.configure({
        resizable: false
      }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'plaintext'
      }),
      ReadOnlyIframeExtension
    ],
    content: content,
    editable: false
  })

  return (
    <div className={`side-by-side-editor ${isChanged ? 'has-changes' : ''}`}>
      <div className="side-by-side-header">
        <Typography.Title heading={6}>{title}</Typography.Title>
        {isChanged && (
          <div className="change-indicator">
            <span className="change-dot"></span>
            已修改
          </div>
        )}
      </div>
      <div className="side-by-side-content">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

// Diff高亮行组件
const DiffHighlightLine: React.FC<{
  diff: DiffItem
  lineNumber: number
  showLineNumbers: boolean
}> = ({ diff, lineNumber, showLineNumbers }) => {
  const getClassName = () => {
    switch (diff.type) {
      case 'insert':
        return 'diff-highlight-line diff-insert'
      case 'delete':
        return 'diff-highlight-line diff-delete'
      case 'replace':
        return 'diff-highlight-line diff-replace'
      case 'equal':
        return 'diff-highlight-line diff-equal'
      default:
        return 'diff-highlight-line'
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
      default:
        return ' '
    }
  }

  return (
    <div className={getClassName()}>
      {showLineNumbers && (
        <span className="line-number">{lineNumber.toString().padStart(3, ' ')}</span>
      )}
      <span className="diff-prefix">{getPrefix()}</span>
      <span className="diff-content">
        {diff.type === 'replace' ? (
          <>
            <span className="diff-delete-text">{diff.originalText}</span>
            <span className="diff-arrow"> → </span>
            <span className="diff-insert-text">{diff.newText}</span>
          </>
        ) : (
          <span>{diff.type === 'delete' ? diff.originalText : diff.newText}</span>
        )}
      </span>
    </div>
  )
}

const VersionComparison: React.FC<VersionComparisonProps> = ({
  currentContent,
  historyItem,
  onClose,
  onRestore,
  className = ''
}) => {
  const [showDiff, setShowDiff] = useState(false)
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const [diffResult, setDiffResult] = useState<DiffResult>({ diffs: [], hasChanges: false })
  const [diffLoading, setDiffLoading] = useState<boolean>(true)
  const [listHeight, setListHeight] = useState<number>(Math.max(320, window.innerHeight - 240))

  // Compute diff in a Web Worker to avoid blocking UI
  useEffect(() => {
    let terminated = false
    setDiffLoading(true)
    try {
      const worker = new Worker(new URL('../workers/diffWorker.ts', import.meta.url), {
        type: 'module'
      })
      worker.onmessage = (e: MessageEvent<DiffResult>) => {
        if (terminated) return
        setDiffResult(e.data)
        setDiffLoading(false)
        worker.terminate()
      }
      worker.postMessage({ original: historyItem.content, current: currentContent })
      return () => {
        terminated = true
        try {
          worker.terminate()
        } catch {}
      }
    } catch {
      // Fallback to main-thread diff if worker is unavailable
      const result = smartDiff(historyItem.content, currentContent)
      setDiffResult(result)
      setDiffLoading(false)
      return () => {}
    }
  }, [historyItem.content, currentContent])

  // Track window resize to keep virtual list height reasonable
  useEffect(() => {
    const onResize = () => setListHeight(Math.max(320, window.innerHeight - 240))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // 统计变更信息
  const stats = useMemo(() => {
    const insertions = diffResult.diffs.filter((d) => d.type === 'insert').length
    const deletions = diffResult.diffs.filter((d) => d.type === 'delete').length
    const replacements = diffResult.diffs.filter((d) => d.type === 'replace').length

    return { insertions, deletions, replacements }
  }, [diffResult.diffs])

  // 格式化时间戳
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const handleRestore = () => {
    if (onRestore) {
      onRestore(historyItem.content)
    }
  }

  return (
    <div className={`version-comparison ${className}`}>
      {/* 头部控制栏 */}
      <div className="version-comparison-header">
        <div className="header-left">
          <Typography.Title heading={4}>版本对比</Typography.Title>
          <div className="comparison-info">
            <span className="history-time">历史版本: {formatTimestamp(historyItem.timestamp)}</span>
            {diffResult.hasChanges && (
              <div className="diff-stats">
                {stats.insertions > 0 && (
                  <span className="stat stat-insert">+{stats.insertions}</span>
                )}
                {stats.deletions > 0 && (
                  <span className="stat stat-delete">-{stats.deletions}</span>
                )}
                {stats.replacements > 0 && (
                  <span className="stat stat-replace">~{stats.replacements}</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="header-actions">
          <Space>
            <Tooltip content={showDiff ? '显示并排视图' : '显示差异视图'}>
              <Button
                icon={<IconCompare />}
                onClick={() => setShowDiff(!showDiff)}
                type={showDiff ? 'primary' : 'tertiary'}
              >
                {showDiff ? '并排视图' : '差异视图'}
              </Button>
            </Tooltip>

            {showDiff && (
              <Button
                size="small"
                type="tertiary"
                onClick={() => setShowLineNumbers(!showLineNumbers)}
              >
                {showLineNumbers ? '隐藏行号' : '显示行号'}
              </Button>
            )}

            <Button icon={<IconRefresh />} onClick={handleRestore} type="primary">
              恢复此版本
            </Button>

            <Button icon={<IconClose />} onClick={onClose} type="tertiary">
              关闭
            </Button>
          </Space>
        </div>
      </div>

      <Divider margin="0" />

      {/* 内容区域 */}
      <div className="version-comparison-content">
        {diffLoading ? (
          <div className="no-changes-message" style={{ gap: 8 }}>
            <Spin size="large" />
            <Typography.Text type="secondary">计算差异中...</Typography.Text>
          </div>
        ) : !diffResult.hasChanges ? (
          <div className="no-changes-message">
            <IconCompare />
            <Typography.Title heading={5}>没有发现差异</Typography.Title>
            <Typography.Text type="secondary">当前内容与历史版本完全一致</Typography.Text>
          </div>
        ) : showDiff ? (
          // 差异视图
          <div className="diff-view" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="diff-view-header">
              <Typography.Title heading={6}>差异详情</Typography.Title>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <Suspense fallback={<div style={{height: listHeight, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Spin /></div>}>
                {(() => {
                  const items: VirtualListItem[] = diffResult.diffs.map((diff, index) => ({
                    id: `${diff.index}-${index}`,
                    content: (
                      <DiffHighlightLine
                        diff={diff}
                        lineNumber={index + 1}
                        showLineNumbers={showLineNumbers}
                      />
                    )
                  }))
                  // Fixed row height approximation
                  const rowHeight = 28
                  return (
                    <LazyVirtualList
                      items={items}
                      height={listHeight}
                      itemHeight={rowHeight}
                      width={'100%'}
                    />
                  )
                })()}
              </Suspense>
            </div>
          </div>
        ) : (
          // 并排视图
          <div className="side-by-side-view">
            <SideBySideEditor
              content={historyItem.content}
              title="历史版本内容"
              isChanged={diffResult.hasChanges}
            />
            <div className="side-by-side-divider"></div>
            <SideBySideEditor
              content={currentContent}
              title="当前版本内容"
              isChanged={diffResult.hasChanges}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default VersionComparison
export type { VersionComparisonProps }
