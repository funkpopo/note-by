import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Button, Spin, Toast } from '@douyinfe/semi-ui'
import { IconHistory } from '@douyinfe/semi-icons'
import { withLazyLoad, SmallComponentLoader, LazyVersionComparison } from './LazyComponents'
const VersionComparisonLazy = withLazyLoad(LazyVersionComparison, SmallComponentLoader)
import './CustomHistoryDropdown.css'

// 轻量历史记录预览（避免创建TipTap实例，提升性能）
const HistoryPreview: React.FC<{ content: string }> = ({ content }) => {
  const sanitize = (html: string) => {
    // 移除脚本和样式标签
    let safe = html.replace(/<\/(?:script|style)>/gi, '')
    safe = safe.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    // 移除内联事件处理（on*）和javascript:协议
    safe = safe.replace(/ on[a-z]+\s*=\s*"[^"]*"/gi, '')
    safe = safe.replace(/ on[a-z]+\s*=\s*'[^']*'/gi, '')
    safe = safe.replace(/ on[a-z]+\s*=\s*[^\s>]+/gi, '')
    safe = safe.replace(/javascript:/gi, '')
    return safe
  }

  const html = sanitize(content || '')
  return (
    <div
      style={{
        border: '1px solid var(--semi-color-border)',
        borderRadius: '4px',
        padding: '12px',
        marginTop: '12px',
        backgroundColor: 'var(--semi-color-fill-0)',
        maxHeight: '60vh',
        overflow: 'auto'
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// 历史记录项接口
interface HistoryItem {
  id: number
  filePath: string
  content: string
  timestamp: number
}

export interface CustomHistoryDropdownProps {
  filePath?: string
  currentContent?: string
  onRestore?: (content: string) => void
  disabled?: boolean
}

const CustomHistoryDropdown: React.FC<CustomHistoryDropdownProps> = ({
  filePath,
  currentContent = '',
  onRestore,
  disabled = false
}) => {
  const [historyList, setHistoryList] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [dropdownVisible, setDropdownVisible] = useState<boolean>(false)
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null)
  const [previewVisible, setPreviewVisible] = useState<boolean>(false)
  const [comparisonVisible, setComparisonVisible] = useState<boolean>(false)
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
    } catch {
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

  // 打开版本对比界面
  const handleCompareHistory = async (historyId: number): Promise<void> => {
    try {
      const response = await window.api.markdown.getHistoryById(historyId)
      if (response.success && response.history) {
        setSelectedHistory(response.history)
        setComparisonVisible(true)
        setDropdownVisible(false)
      }
    } catch {
      Toast.error('加载历史记录失败')
    }
  }

  // 查看历史记录详情
  const handleViewHistory = async (historyId: number): Promise<void> => {
    try {
      const response = await window.api.markdown.getHistoryById(historyId)
      if (response.success && response.history) {
        setSelectedHistory(response.history)
        setPreviewVisible(true)
        setDropdownVisible(false)
      }
    } catch {
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
                      className="history-action-btn compare-btn"
                      onClick={() => handleCompareHistory(item.id)}
                    >
                      对比
                    </button>
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

      {/* 版本对比界面 */}
      {comparisonVisible && selectedHistory && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1050,
            background: 'var(--semi-color-bg-0)'
          }}
        >
          <VersionComparisonLazy
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
    </div>
  )
}

export default CustomHistoryDropdown
