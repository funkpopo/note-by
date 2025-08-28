import React, { useEffect, useState, useCallback, RefObject } from 'react'
import {
  Dropdown,
  List,
  Typography,
  Button,
  SideSheet,
  Spin,
  Empty,
  Space
} from '@douyinfe/semi-ui'
import { IconHistory, IconChevronRight } from '@douyinfe/semi-icons'
import VersionComparison from './VersionComparison'
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

  return (
    <div
      style={{
        border: '1px solid var(--semi-color-border)',
        borderRadius: '4px',
        padding: '16px',
        marginTop: '16px',
        backgroundColor: 'var(--semi-color-fill-0)',
        minHeight: '300px',
        maxHeight: 'calc(100vh - 200px)',
        overflow: 'auto'
      }}
    >
      <EditorContent editor={editor} />
    </div>
  )
}

interface HistoryDropdownProps {
  filePath?: string
  currentContent?: string
  onRestore?: (content: string) => void
  disabled?: boolean
  containerRef?: RefObject<HTMLElement>
}

const HistoryDropdown: React.FC<HistoryDropdownProps> = ({
  filePath,
  currentContent = '',
  onRestore,
  disabled = false,
  containerRef
}) => {
  const [historyList, setHistoryList] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null)
  const [previewVisible, setPreviewVisible] = useState<boolean>(false)
  const [comparisonVisible, setComparisonVisible] = useState<boolean>(false)
  const [dropdownVisible, setDropdownVisible] = useState<boolean>(false)

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
    } catch {
      setHistoryList([])
    } finally {
      setLoading(false)
    }
  }, [filePath])

  // 加载历史记录
  useEffect(() => {
    if (dropdownVisible && filePath) {
      loadHistory()
    }
  }, [dropdownVisible, filePath, loadHistory])

  // 打开版本对比界面
  const handleCompareHistory = async (historyId: number): Promise<void> => {
    try {
      const response = await window.api.markdown.getHistoryById(historyId)
      if (response.success && response.history) {
        setSelectedHistory(response.history)
        setComparisonVisible(true)
        setDropdownVisible(false)
      }
    } catch {}
  }

  // 查看历史记录详情
  const handleViewHistory = async (historyId: number): Promise<void> => {
    try {
      const response = await window.api.markdown.getHistoryById(historyId)
      if (response.success && response.history) {
        setSelectedHistory(response.history)
        setPreviewVisible(true)
        setDropdownVisible(false) // 关闭下拉菜单
      }
    } catch {}
  }

  // 恢复历史版本
  const handleRestore = (): void => {
    if (selectedHistory && onRestore) {
      onRestore(selectedHistory.content)
      setPreviewVisible(false)
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

  // 在侧边栏显示完整时间戳，包含秒数
  const formatFullTimestamp = (timestamp: number): string => {
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

  return (
    <>
      <Dropdown
        trigger="click"
        visible={dropdownVisible}
        onVisibleChange={setDropdownVisible}
        disabled={disabled}
        position="leftBottom"
        autoAdjustOverflow={false}
        getPopupContainer={() => containerRef?.current || document.body}
        render={
          <div style={{ minWidth: '180px', maxWidth: '220px' }}>
            {loading ? (
              <div style={{ padding: '12px', textAlign: 'center' }}>
                <Spin size="middle" />
              </div>
            ) : historyList.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center' }}>
                <Empty description="暂无历史记录" />
              </div>
            ) : (
              <List
                dataSource={historyList}
                style={{ maxHeight: '300px', overflow: 'auto' }}
                renderItem={(item) => (
                  <List.Item
                    style={{ padding: '8px 12px' }}
                    main={
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          width: '100%',
                          alignItems: 'center'
                        }}
                      >
                        <Typography.Text style={{ fontSize: '13px', flexGrow: 1 }}>
                          {formatTimestamp(item.timestamp)}
                        </Typography.Text>
                        <Space>
                          <Button
                            type="tertiary"
                            onClick={() => handleCompareHistory(item.id)}
                            size="small"
                            style={{ padding: '4px 8px' }}
                          >
                            对比
                          </Button>
                          <Button
                            type="tertiary"
                            icon={<IconChevronRight />}
                            onClick={() => handleViewHistory(item.id)}
                            size="small"
                            style={{ padding: '4px 8px' }}
                          >
                            查看
                          </Button>
                        </Space>
                      </div>
                    }
                  />
                )}
              />
            )}
          </div>
        }
      >
        <Button icon={<IconHistory />} disabled={disabled}>
          历史
        </Button>
      </Dropdown>

      <SideSheet
        title="历史版本内容"
        visible={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={700}
        placement="right"
        footer={
          <Space>
            <Button onClick={() => setPreviewVisible(false)}>关闭</Button>
            <Button type="primary" theme="solid" onClick={handleRestore}>
              恢复此版本
            </Button>
          </Space>
        }
      >
        {selectedHistory ? (
          <div
            style={{ padding: '0 16px', whiteSpace: 'pre-wrap', height: '100%', overflow: 'auto' }}
          >
            <Typography.Title heading={5}>
              {formatFullTimestamp(selectedHistory.timestamp)}
            </Typography.Title>
            <HistoryPreview content={selectedHistory.content} />
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '300px'
            }}
          >
            <Spin size="large" />
          </div>
        )}
      </SideSheet>

      {/* 版本对比界面 */}
      {comparisonVisible && selectedHistory && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          zIndex: 1050,
          background: 'var(--semi-color-bg-0)' 
        }}>
          <VersionComparison
            currentContent={currentContent}
            historyItem={selectedHistory}
            onClose={() => setComparisonVisible(false)}
            onRestore={(content) => {
              if (onRestore) {
                onRestore(content)
                setComparisonVisible(false)
              }
            }}
          />
        </div>
      )}
    </>
  )
}

export default HistoryDropdown
