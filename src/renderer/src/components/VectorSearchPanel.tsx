import React, { useState, useCallback } from 'react'
import { 
  Input, 
  Button, 
  Typography, 
  Space, 
  Tag, 
  Modal, 
  List, 
  Spin, 
  Empty 
} from '@douyinfe/semi-ui'
import { 
  IconSearch, 
  IconFolder,
  IconClock,
  IconBookmark
} from '@douyinfe/semi-icons'
import { useLanguage } from '../locales/LanguageContext'

const { Text } = Typography

// 向量搜索结果接口
interface VectorSearchResult {
  document: {
    id: string
    filePath: string
    fileName: string
    content: string
    summary: string
    fileSize: number
    modifiedTime: number
    tags?: string[]
    folder?: string
  }
  score: number
  snippet: string
}

interface VectorSearchPanelProps {
  isVisible: boolean
  onClose: () => void
  onInsertText: (text: string) => void
}

const VectorSearchPanel: React.FC<VectorSearchPanelProps> = ({
  isVisible,
  onClose,
  onInsertText
}) => {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<VectorSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set())

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    
    setIsLoading(true)
    try {
      const response = await window.api.vector.searchDocuments(query, {
        limit: 10,
        threshold: 0.6
      })
      
      if (response.success) {
        setResults(response.results)
      } else {
        console.error('Vector search failed:', response.error)
        setResults([])
      }
    } catch (error) {
      console.error('Vector search error:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [query])

  const handleInsertSelected = useCallback(() => {
    if (selectedResults.size === 0) return

    const selectedTexts = results
      .filter(result => selectedResults.has(result.document.id))
      .map(result => {
        const fileName = result.document.fileName
        const snippet = result.snippet
        return `**来源: ${fileName}**\n${snippet}\n`
      })
      .join('\n')

    const contextText = `以下是相关的文档内容，请基于这些信息回答问题：\n\n${selectedTexts}\n---\n\n我的问题是：`
    
    onInsertText(contextText)
    setSelectedResults(new Set())
    setQuery('')
    setResults([])
    onClose()
  }, [selectedResults, results, onInsertText, onClose])

  const toggleSelection = useCallback((documentId: string) => {
    setSelectedResults(prev => {
      const newSet = new Set(prev)
      if (newSet.has(documentId)) {
        newSet.delete(documentId)
      } else {
        newSet.add(documentId)
      }
      return newSet
    })
  }, [])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Modal
      title={
        <Space>
          <IconSearch />
          <span>本地文档搜索</span>
        </Space>
      }
      visible={isVisible}
      onCancel={onClose}
      width={800}
      height={600}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text type="tertiary" size="small">
            已选择 {selectedResults.size} 个文档片段
          </Text>
          <Space>
            <Button onClick={onClose}>取消</Button>
            <Button 
              type="primary" 
              onClick={handleInsertSelected}
              disabled={selectedResults.size === 0}
            >
              插入选中内容 ({selectedResults.size})
            </Button>
          </Space>
        </div>
      }
      style={{ maxWidth: '90vw', maxHeight: '90vh' }}
      bodyStyle={{ 
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        height: '500px'
      }}
    >
      {/* 搜索输入框 */}
      <div style={{ marginBottom: '16px' }}>
        <Input
          placeholder={t('placeholders.vectorSearch')}
          value={query}
          onChange={(value) => setQuery(value)}
          onEnterPress={handleSearch}
          suffix={
            <Button 
              icon={<IconSearch />} 
              theme="borderless" 
              size="small"
              onClick={handleSearch}
              loading={isLoading}
            />
          }
          size="large"
        />
      </div>

      {/* 搜索结果 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px' }}>
              <Text type="tertiary">正在搜索相关文档...</Text>
            </div>
          </div>
        ) : results.length === 0 ? (
          query ? (
            <Empty
              image={<div style={{ fontSize: '48px' }}>📄</div>}
              title="未找到相关文档"
              description="尝试使用不同的关键词或确保已向量化相关文档"
            />
          ) : (
            <Empty
              image={<IconSearch size="extra-large" />}
              title="输入关键词开始搜索"
              description="搜索您的本地文档，找到相关内容作为对话上下文"
            />
          )
        ) : (
          <List
            dataSource={results}
            renderItem={(result) => (
              <List.Item
                key={result.document.id}
                style={{
                  padding: '12px',
                  border: selectedResults.has(result.document.id) 
                    ? '2px solid var(--semi-color-primary)' 
                    : '1px solid var(--semi-color-border)',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  backgroundColor: selectedResults.has(result.document.id)
                    ? 'var(--semi-color-primary-light-hover)'
                    : 'var(--semi-color-bg-2)'
                }}
                onClick={() => toggleSelection(result.document.id)}
              >
                <div>
                  {/* 文件信息 */}
                  <div style={{ marginBottom: '8px' }}>
                    <Space>
                      <div style={{ fontSize: '16px' }}>📄</div>
                      <Text strong>{result.document.fileName}</Text>
                      <Tag size="small" color="blue">
                        相似度: {(result.score * 100).toFixed(1)}%
                      </Tag>
                    </Space>
                  </div>

                  {/* 摘要 */}
                  {result.document.summary && (
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="tertiary" size="small">
                        <IconBookmark size="small" style={{ marginRight: '4px' }} />
                        {result.document.summary}
                      </Text>
                    </div>
                  )}

                  {/* 内容片段 */}
                  <div style={{ marginBottom: '8px' }}>
                    <Text 
                      style={{ 
                        fontSize: '13px',
                        lineHeight: '1.4',
                        display: 'block',
                        background: 'var(--semi-color-fill-0)',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid var(--semi-color-border-light)'
                      }}
                    >
                      {result.snippet}
                    </Text>
                  </div>

                  {/* 元信息 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space align="center">
                      {result.document.folder && (
                        <Tag size="small" type="light">
                          <IconFolder size="small" style={{ marginRight: '2px' }} />
                          {result.document.folder}
                        </Tag>
                      )}
                      {result.document.tags && result.document.tags.map(tag => (
                        <Tag key={tag} size="small" color="cyan">{tag}</Tag>
                      ))}
                    </Space>
                    <Space align="center">
                      <Text type="tertiary" size="small">
                        <IconClock size="small" style={{ marginRight: '2px' }} />
                        {formatTime(result.document.modifiedTime)}
                      </Text>
                      <Text type="tertiary" size="small">
                        {formatFileSize(result.document.fileSize)}
                      </Text>
                    </Space>
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </div>
    </Modal>
  )
}

export default VectorSearchPanel