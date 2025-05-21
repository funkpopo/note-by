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

// 历史记录项接口
interface HistoryItem {
  id: number
  filePath: string
  content: string
  timestamp: number
}

interface HistoryDropdownProps {
  filePath?: string
  onRestore?: (content: string) => void
  disabled?: boolean
  containerRef?: RefObject<HTMLElement>
}

const HistoryDropdown: React.FC<HistoryDropdownProps> = ({
  filePath,
  onRestore,
  disabled = false,
  containerRef
}) => {
  const [historyList, setHistoryList] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null)
  const [previewVisible, setPreviewVisible] = useState<boolean>(false)
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
        console.error('加载历史记录失败:', response.error)
        setHistoryList([])
      }
    } catch (error) {
      console.error('加载历史记录异常:', error)
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

  // 查看历史记录详情
  const handleViewHistory = async (historyId: number): Promise<void> => {
    try {
      const response = await window.api.markdown.getHistoryById(historyId)
      if (response.success && response.history) {
        setSelectedHistory(response.history)
        setPreviewVisible(true)
        setDropdownVisible(false) // 关闭下拉菜单
      }
    } catch (error) {
      console.error('加载历史记录详情失败:', error)
    }
  }

  // 恢复历史版本
  const handleRestore = (): void => {
    if (selectedHistory && onRestore) {
      onRestore(selectedHistory.content)
      setPreviewVisible(false)
    }
  }

  // 格式化时间戳 - 使用更紧凑的格式
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp)
    return (
      date.toLocaleDateString('zh-CN') +
      ' ' +
      date.getHours().toString().padStart(2, '0') +
      ':' +
      date.getMinutes().toString().padStart(2, '0')
    )
  }

  // 在侧边栏显示完整时间戳
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
                        <Button
                          type="tertiary"
                          icon={<IconChevronRight />}
                          onClick={() => handleViewHistory(item.id)}
                          size="small"
                          style={{ padding: '4px 8px', marginLeft: '8px' }}
                        >
                          查看
                        </Button>
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
              <Typography.Text style={{ whiteSpace: 'pre-wrap' }}>
                {selectedHistory.content}
              </Typography.Text>
            </div>
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
    </>
  )
}

export default HistoryDropdown
