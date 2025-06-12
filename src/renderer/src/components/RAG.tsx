import React, { useState, useEffect, useCallback } from 'react'
import {
  Typography,
  Card,
  Button,
  Toast,
  Input,
  Table,
  Tag,
  Space,
  Modal,
  Spin,
  Empty,
  Progress,
  Divider,
  List,
  Popconfirm
} from '@douyinfe/semi-ui'
import { IconRefresh, IconDelete, IconPlay, IconFile } from '@douyinfe/semi-icons'

const { Title, Text, Paragraph } = Typography
const { Search } = Input

// RAG文档接口
interface RAGDocument {
  id: number
  filePath: string
  title: string
  content: string
  contentHash: string
  fileSize: number
  lastModified: number
  embeddingStatus: 'pending' | 'processing' | 'completed' | 'failed'
  embeddingModel: string
  createdAt: number
  updatedAt: number
}

// 搜索结果接口
interface SearchResult {
  filePath: string
  content: string
  similarity: number
  documentId: number
  chunkId: number
}

// RAG统计接口
interface RAGStats {
  totalDocuments: number
  embeddedDocuments: number
  pendingDocuments: number
  failedDocuments: number
  totalChunks: number
  totalEmbeddings: number
}

const RAG: React.FC = () => {
  const [documents, setDocuments] = useState<RAGDocument[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [stats, setStats] = useState<RAGStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDocument, setSelectedDocument] = useState<RAGDocument | null>(null)
  const [showDocumentModal, setShowDocumentModal] = useState(false)
  const [embeddingProgress, setEmbeddingProgress] = useState<{
    current: number
    total: number
    filePath: string
  } | null>(null)

  // 加载RAG文档列表
  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true)
      const result = await window.api.RAG.getAllDocuments()
      if (result.success) {
        setDocuments(result.documents)
      } else {
        Toast.error('加载文档列表失败')
      }
    } catch (error) {
      Toast.error('加载文档列表时发生错误')
    } finally {
      setLoading(false)
    }
  }, [])

  // 加载RAG统计信息
  const loadStats = useCallback(async () => {
    try {
      const result = await window.api.RAG.getStats()
      if (result.success) {
        setStats(result.stats)
      }
    } catch (error) {
      console.error('加载统计信息失败:', error)
    }
  }, [])

  // 搜索文档
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    try {
      setSearchLoading(true)
      const result = await window.api.RAG.searchDocuments(query, 10, 0.7)
      if (result.success) {
        setSearchResults(result.results)
        if (result.results.length === 0) {
          Toast.info('未找到相关文档')
        }
      } else {
        Toast.error('搜索失败')
        setSearchResults([])
      }
    } catch (error) {
      Toast.error('搜索时发生错误')
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  // 向量化单个文档
  const handleEmbedDocument = async (document: RAGDocument) => {
    try {
      Toast.info(`开始向量化文档: ${document.title}`)
      const result = await window.api.RAG.embedDocument(
        document.filePath,
        document.content,
        document.title
      )

      if (result.success) {
        Toast.success(`文档向量化成功: ${result.message}`)
        await loadDocuments()
        await loadStats()
      } else {
        Toast.error(`文档向量化失败: ${result.message}`)
      }
    } catch (error) {
      Toast.error('向量化过程中发生错误')
    }
  }

  // 删除文档向量
  const handleRemoveDocument = async (filePath: string) => {
    try {
      const result = await window.api.RAG.removeDocument(filePath)
      if (result.success) {
        Toast.success('文档已从RAG中删除')
        await loadDocuments()
        await loadStats()
      } else {
        Toast.error('删除文档失败')
      }
    } catch (error) {
      Toast.error('删除文档时发生错误')
    }
  }

  // 批量向量化
  const handleBatchEmbed = async () => {
    try {
      Toast.info('开始批量向量化，请稍候...')

      // 监听进度更新
      window.api.RAG.onEmbedProgress((progress) => {
        setEmbeddingProgress(progress)
      })

      const result = await window.api.RAG.embedAllDocuments()

      // 移除进度监听器
      window.api.RAG.removeEmbedProgressListener()
      setEmbeddingProgress(null)

      if (result.success) {
        const { success, failed, skipped, total } = result.result
        Toast.success(
          `批量向量化完成！成功: ${success}, 失败: ${failed}, 跳过: ${skipped}, 总计: ${total}`
        )
        await loadDocuments()
        await loadStats()
      } else {
        Toast.error(`批量向量化失败: ${result.error}`)
      }
    } catch (error) {
      Toast.error('批量向量化过程中发生错误')
      window.api.RAG.removeEmbedProgressListener()
      setEmbeddingProgress(null)
    }
  }

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const statusMap = {
      pending: { color: 'grey', text: '待处理' },
      processing: { color: 'blue', text: '处理中' },
      completed: { color: 'green', text: '已完成' },
      failed: { color: 'red', text: '失败' }
    }
    const config = statusMap[status as keyof typeof statusMap] || statusMap.pending
    return <Tag color={config.color}>{config.text}</Tag>
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 格式化时间
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  // 表格列定义
  const columns = [
    {
      title: '文档标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: RAGDocument) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="tertiary" size="small">
            {record.filePath}
          </Text>
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'embeddingStatus',
      key: 'status',
      render: (status: string) => getStatusTag(status)
    },
    {
      title: '文件大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      render: (size: number) => formatFileSize(size)
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (time: number) => formatTime(time)
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: RAGDocument) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setSelectedDocument(record)
              setShowDocumentModal(true)
            }}
          >
            查看
          </Button>
          {record.embeddingStatus !== 'completed' && (
            <Button
              size="small"
              type="primary"
              icon={<IconPlay />}
              onClick={() => handleEmbedDocument(record)}
            >
              向量化
            </Button>
          )}
          <Popconfirm
            title="确定要删除这个文档的向量数据吗？"
            onConfirm={() => handleRemoveDocument(record.filePath)}
          >
            <Button size="small" type="danger" icon={<IconDelete />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  useEffect(() => {
    loadDocuments()
    loadStats()
  }, [loadDocuments, loadStats])

  return (
    <div style={{ padding: '16px', height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title heading={2}>RAG管理</Title>
        <Paragraph type="tertiary">管理文档向量化，进行语义搜索</Paragraph>
      </div>

      {/* 统计信息卡片 */}
      {stats && (
        <Card style={{ marginBottom: '24px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '16px'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--semi-color-primary)' }}
              >
                {stats.totalDocuments}
              </div>
              <Text type="secondary">总文档数</Text>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--semi-color-success)' }}
              >
                {stats.embeddedDocuments}
              </div>
              <Text type="secondary">已向量化</Text>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--semi-color-warning)' }}
              >
                {stats.pendingDocuments}
              </div>
              <Text type="secondary">待处理</Text>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--semi-color-danger)' }}
              >
                {stats.failedDocuments}
              </div>
              <Text type="secondary">失败</Text>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--semi-color-text-0)' }}
              >
                {stats.totalEmbeddings}
              </div>
              <Text type="secondary">向量数</Text>
            </div>
          </div>
        </Card>
      )}

      {/* 批量向量化进度 */}
      {embeddingProgress && (
        <Card style={{ marginBottom: '24px' }}>
          <div style={{ marginBottom: '8px' }}>
            <Text strong>批量向量化进度</Text>
          </div>
          <Progress
            percent={Math.round((embeddingProgress.current / embeddingProgress.total) * 100)}
            showInfo
            style={{ marginBottom: '8px' }}
          />
          <Text type="tertiary" size="small">
            正在处理: {embeddingProgress.filePath} ({embeddingProgress.current}/
            {embeddingProgress.total})
          </Text>
        </Card>
      )}

      {/* 搜索和操作区域 */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Search
            placeholder="输入关键词进行语义搜索..."
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
            loading={searchLoading}
            style={{ flex: 1, minWidth: '300px' }}
          />
          <Button icon={<IconRefresh />} onClick={loadDocuments}>
            刷新
          </Button>
          <Button
            type="primary"
            onClick={handleBatchEmbed}
            disabled={!stats || stats.totalDocuments === 0 || !!embeddingProgress}
          >
            批量向量化
          </Button>
        </div>
      </Card>

      {/* 搜索结果 */}
      {searchResults.length > 0 && (
        <Card title="搜索结果" style={{ marginBottom: '24px' }}>
          <List
            dataSource={searchResults}
            renderItem={(item) => (
              <List.Item
                main={
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <Text strong>{item.filePath}</Text>
                      <Tag color="blue">相似度: {(item.similarity * 100).toFixed(1)}%</Tag>
                    </div>
                    <Paragraph
                      ellipsis={{ rows: 2, expandable: true, collapsible: true }}
                      style={{ marginTop: '8px', marginBottom: 0 }}
                    >
                      {item.content}
                    </Paragraph>
                  </div>
                }
              />
            )}
          />
        </Card>
      )}

      {/* 文档列表 */}
      <Card title="文档列表">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        ) : documents.length === 0 ? (
          <Empty
            image={<IconFile size="extra-large" />}
            title="暂无文档"
            description="还没有文档被添加到RAG中"
          />
        ) : (
          <Table
            columns={columns}
            dataSource={documents}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true
            }}
          />
        )}
      </Card>

      {/* 文档详情模态框 */}
      <Modal
        title={selectedDocument?.title}
        visible={showDocumentModal}
        onCancel={() => setShowDocumentModal(false)}
        footer={null}
        width={800}
      >
        {selectedDocument && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <Text type="secondary">文件路径: </Text>
              <Text>{selectedDocument.filePath}</Text>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <Text type="secondary">状态: </Text>
              {getStatusTag(selectedDocument.embeddingStatus)}
            </div>
            <div style={{ marginBottom: '16px' }}>
              <Text type="secondary">文件大小: </Text>
              <Text>{formatFileSize(selectedDocument.fileSize)}</Text>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <Text type="secondary">更新时间: </Text>
              <Text>{formatTime(selectedDocument.updatedAt)}</Text>
            </div>
            <Divider />
            <div>
              <Text strong>内容预览:</Text>
              <div
                style={{
                  marginTop: '8px',
                  padding: '12px',
                  backgroundColor: 'var(--semi-color-fill-0)',
                  borderRadius: '6px',
                  maxHeight: '300px',
                  overflow: 'auto'
                }}
              >
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '14px' }}>
                  {selectedDocument.content.substring(0, 1000)}
                  {selectedDocument.content.length > 1000 && '...'}
                </pre>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default RAG
