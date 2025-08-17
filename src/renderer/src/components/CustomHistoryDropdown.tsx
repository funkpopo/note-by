import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Button, Spin, Toast } from '@douyinfe/semi-ui'
import { IconHistory } from '@douyinfe/semi-icons'
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
import './CustomHistoryDropdown.css'

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

// 历史记录项接口
interface HistoryItem {
  id: number
  filePath: string
  content: string
  timestamp: number
}

// 历史记录预览组件
const HistoryPreview: React.FC<{ content: string }> = ({ content }) => {
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

  return <EditorContent editor={editor} />
}

interface CustomHistoryDropdownProps {
  filePath?: string
  onRestore?: (content: string) => void
  disabled?: boolean
}

const CustomHistoryDropdown: React.FC<CustomHistoryDropdownProps> = ({
  filePath,
  onRestore,
  disabled = false
}) => {
  const [historyList, setHistoryList] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [dropdownVisible, setDropdownVisible] = useState<boolean>(false)
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null)
  const [previewVisible, setPreviewVisible] = useState<boolean>(false)
  const [isRestoring, setIsRestoring] = useState<boolean>(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLDivElement>(null)

  // 加载历史记录
  const loadHistory = useCallback(async (): Promise<void> => {
    if (!filePath) return

    setLoading(true)
    try {
      const response = await window.api.markdown.getHistory(filePath)
      if (response.success && response.history) {
        setHistoryList(response.history)
      } else {
        setHistoryList([])
      }
    } catch (error) {
      setHistoryList([])
    } finally {
      setLoading(false)
    }
  }, [filePath])

  // 处理下拉菜单显示/隐藏
  const toggleDropdown = useCallback(() => {
    if (disabled) return

    const newVisible = !dropdownVisible
    setDropdownVisible(newVisible)

    if (newVisible && filePath) {
      loadHistory()
    }
  }, [disabled, dropdownVisible, filePath, loadHistory])

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as HTMLElement) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as HTMLElement)
      ) {
        setDropdownVisible(false)
      }
    }

    if (dropdownVisible) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
    return undefined
  }, [dropdownVisible])

  // 查看历史记录详情
  const handleViewHistory = async (historyId: number): Promise<void> => {
    try {
      const response = await window.api.markdown.getHistoryById(historyId)
      if (response.success && response.history) {
        setSelectedHistory(response.history)
        setPreviewVisible(true)
        setDropdownVisible(false)
      }
    } catch (error) {
      Toast.error('加载历史记录失败')
    }
  }

  // 恢复历史版本
  const handleRestore = (item: HistoryItem): void => {
    if (isRestoring || !onRestore) return

    setIsRestoring(true)
    try {
      onRestore(item.content)
      setDropdownVisible(false)
      setPreviewVisible(false)
      // 移除这里的Toast提示，让父组件统一处理
    } finally {
      // 短暂延迟后重置状态，防止重复点击
      setTimeout(() => setIsRestoring(false), 500)
    }
  }

  // 格式化时间戳 - 显示年月日+时间格式
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="custom-history-dropdown">
      <div ref={buttonRef}>
        <Button
          icon={<IconHistory />}
          disabled={disabled}
          onClick={toggleDropdown}
          type="tertiary"
          size="default"
        >
          历史
        </Button>
      </div>

      {dropdownVisible && (
        <div ref={dropdownRef} className="custom-history-dropdown-content">
          {loading ? (
            <div className="history-loading">
              <Spin size="small" />
              <span>加载中...</span>
            </div>
          ) : historyList.length === 0 ? (
            <div className="history-empty">
              <span>暂无历史记录</span>
            </div>
          ) : (
            <div className="history-list">
              <div className="history-header">
                <span>历史版本</span>
              </div>
              {historyList.map((item) => (
                <div key={item.id} className="history-item">
                  <div className="history-item-time">{formatTimestamp(item.timestamp)}</div>
                  <div className="history-item-actions">
                    <button
                      className="history-action-btn preview-btn"
                      onClick={() => handleViewHistory(item.id)}
                    >
                      预览
                    </button>
                    <button
                      className="history-action-btn restore-btn"
                      onClick={() => handleRestore(item)}
                      disabled={isRestoring}
                    >
                      {isRestoring ? '恢复中...' : '恢复'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 预览模态框 */}
      {previewVisible && selectedHistory && (
        <div className="history-preview-overlay" onClick={() => setPreviewVisible(false)}>
          <div className="history-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="history-preview-header">
              <h3>历史版本内容</h3>
              <div className="history-preview-time">
                {new Date(selectedHistory.timestamp).toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}{' '}
                - 版本历史记录
              </div>
              <button className="history-preview-close" onClick={() => setPreviewVisible(false)}>
                ×
              </button>
            </div>
            <div className="history-preview-content">
              <HistoryPreview content={selectedHistory.content} />
            </div>
            <div className="history-preview-footer">
              <button
                className="history-preview-btn cancel-btn"
                onClick={() => setPreviewVisible(false)}
              >
                关闭
              </button>
              <button
                className="history-preview-btn restore-btn"
                onClick={() => handleRestore(selectedHistory)}
                disabled={isRestoring}
              >
                {isRestoring ? '恢复中...' : '恢复此版本'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomHistoryDropdown
