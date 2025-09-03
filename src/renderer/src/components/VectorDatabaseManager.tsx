import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Button,
  Typography,
  Space,
  Tag,
  Modal,
  Toast,
  Spin,
  Progress,
  Divider
} from '@douyinfe/semi-ui'
import {
  IconServer,
  IconRefresh,
  IconDelete,
  IconUpload,
  IconInfoCircle
} from '@douyinfe/semi-icons'

const { Text } = Typography

interface VectorDatabaseManagerProps {
  visible: boolean
  onClose: () => void
}

const VectorDatabaseManager: React.FC<VectorDatabaseManagerProps> = ({ visible, onClose }) => {
  const [stats, setStats] = useState<{
    totalDocuments: number
    dbSize: number
    lastUpdated: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [isBatchAdding, setIsBatchAdding] = useState(false)
  const [batchProgress, setBatchProgress] = useState<{
    total: number
    processed: number
    current: string
  } | null>(null)

  // 获取统计信息
  const fetchStats = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await window.api.vector.getStats()
      if (response.success && response.stats) {
        setStats(response.stats)
      } else {
        console.error('Failed to get vector database stats:', response.error)
        setStats(null)
      }
    } catch (error) {
      console.error('Error fetching vector stats:', error)
      setStats(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 初始化向量数据库
  const handleInitDatabase = useCallback(async () => {
    setIsInitializing(true)
    try {
      const response = await window.api.vector.initDatabase()
      if (response.success) {
        Toast.success('向量数据库初始化成功')
        await fetchStats()
      } else {
        Toast.error(`初始化失败: ${response.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('Error initializing vector database:', error)
      Toast.error('初始化向量数据库时发生错误')
    } finally {
      setIsInitializing(false)
    }
  }, [fetchStats])

  // 清空数据库
  const handleClearDatabase = useCallback(async () => {
    Modal.confirm({
      title: '确认清空向量数据库',
      content: '这将删除所有已向量化的文档，操作不可撤销。确定要继续吗？',
      okType: 'danger',
      onOk: async () => {
        setIsClearing(true)
        try {
          const response = await window.api.vector.clearDatabase()
          if (response.success) {
            Toast.success('向量数据库已清空')
            await fetchStats()
          } else {
            Toast.error(`清空失败: ${response.error || '未知错误'}`)
          }
        } catch (error) {
          console.error('Error clearing vector database:', error)
          Toast.error('清空向量数据库时发生错误')
        } finally {
          setIsClearing(false)
        }
      }
    })
  }, [fetchStats])

  // 批量添加文档
  const handleBatchAddDocuments = useCallback(async () => {
    setIsBatchAdding(true)
    setBatchProgress({ total: 0, processed: 0, current: '正在获取文件列表...' })

    try {
      // 获取所有markdown文件
      const foldersResponse = await window.api.markdown.getFolders()
      if (!foldersResponse.success || !foldersResponse.folders) {
        Toast.error('获取文件夹列表失败')
        return
      }

      const allDocuments: Array<{ filePath: string; content: string }> = []
      
      // 收集所有文档
      for (const folderName of foldersResponse.folders) {
        const filesResponse = await window.api.markdown.getFiles(folderName)
        if (filesResponse.success && filesResponse.files) {
          for (const fileName of filesResponse.files) {
            const filePath = `${folderName}/${fileName}`
            const contentResponse = await window.api.markdown.readFile(filePath)
            if (contentResponse.success && contentResponse.content) {
              allDocuments.push({
                filePath,
                content: contentResponse.content
              })
            }
          }
        }
      }

      if (allDocuments.length === 0) {
        Toast.warning('没有找到可向量化的文档')
        return
      }

      setBatchProgress({
        total: allDocuments.length,
        processed: 0,
        current: '开始向量化文档...'
      })

      // 分批处理，每批5个文档
      const batchSize = 5
      let successCount = 0
      let failedCount = 0

      for (let i = 0; i < allDocuments.length; i += batchSize) {
        const batch = allDocuments.slice(i, i + batchSize)
        
        setBatchProgress(prev => ({
          ...prev!,
          current: `正在处理第 ${i + 1}-${Math.min(i + batchSize, allDocuments.length)} 个文档...`
        }))

        const batchResponse = await window.api.vector.batchAddDocuments(batch)
        if (batchResponse.success) {
          successCount += batchResponse.successCount
          failedCount += batchResponse.failedCount
        } else {
          failedCount += batch.length
        }

        setBatchProgress(prev => ({
          ...prev!,
          processed: i + batch.length
        }))

        // 添加小延时避免过于频繁的API调用
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      if (successCount > 0) {
        Toast.success(`成功向量化 ${successCount} 个文档${failedCount > 0 ? `，${failedCount} 个失败` : ''}`)
      } else {
        Toast.error(`向量化失败，共 ${failedCount} 个文档处理失败`)
      }

      await fetchStats()
    } catch (error) {
      console.error('Error during batch add:', error)
      Toast.error('批量添加文档时发生错误')
    } finally {
      setIsBatchAdding(false)
      setBatchProgress(null)
    }
  }, [fetchStats])

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // 格式化时间
  const formatTime = (timestamp: number): string => {
    if (timestamp === 0) return '从未更新'
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  // 组件加载时获取统计信息
  useEffect(() => {
    if (visible) {
      fetchStats()
    }
  }, [visible, fetchStats])

  return (
    <Modal
      title={
        <Space>
          <IconServer />
          <span>向量数据库管理</span>
        </Space>
      }
      visible={visible}
      onCancel={onClose}
      width={700}
      footer={
        <Button onClick={onClose}>
          关闭
        </Button>
      }
      style={{ maxWidth: '90vw' }}
      bodyStyle={{ padding: '24px' }}
    >
      <div>
        {/* 统计信息卡片 */}
        <Card
          title={
            <Space>
              <IconInfoCircle />
              <span>数据库状态</span>
              <Button
                icon={<IconRefresh />}
                theme="borderless"
                size="small"
                onClick={fetchStats}
                loading={isLoading}
              />
            </Space>
          }
          style={{ marginBottom: '16px' }}
        >
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spin size="large" />
            </div>
          ) : stats ? (
            <div>
              <Space vertical style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>文档总数:</Text>
                  <Tag color="blue">{stats.totalDocuments} 个</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>数据库大小:</Text>
                  <Tag color="green">{formatFileSize(stats.dbSize)}</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>最后更新:</Text>
                  <Tag color="orange">{formatTime(stats.lastUpdated)}</Tag>
                </div>
              </Space>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--semi-color-text-2)' }}>
              <Text type="tertiary">无法获取数据库状态</Text>
            </div>
          )}
        </Card>

        <Divider />

        {/* 操作按钮 */}
        <Card title="数据库操作" style={{ marginBottom: '16px' }}>
          <Space wrap>
            <Button
              icon={<IconServer />}
              onClick={handleInitDatabase}
              loading={isInitializing}
              type="primary"
            >
              {isInitializing ? '初始化中...' : '初始化数据库'}
            </Button>

            <Button
              icon={<IconUpload />}
              onClick={handleBatchAddDocuments}
              loading={isBatchAdding}
              type="secondary"
              disabled={isInitializing}
            >
              {isBatchAdding ? '向量化中...' : '批量向量化文档'}
            </Button>

            <Button
              icon={<IconDelete />}
              onClick={handleClearDatabase}
              loading={isClearing}
              type="danger"
              disabled={isInitializing || isBatchAdding}
            >
              {isClearing ? '清空中...' : '清空数据库'}
            </Button>
          </Space>
        </Card>

        {/* 批量处理进度 */}
        {batchProgress && (
          <Card title="处理进度" style={{ marginBottom: '16px' }}>
            <Space vertical style={{ width: '100%' }}>
              <Text>{batchProgress.current}</Text>
              <Progress
                percent={batchProgress.total > 0 ? (batchProgress.processed / batchProgress.total) * 100 : 0}
                format={() => `${batchProgress.processed}/${batchProgress.total}`}
                showInfo
              />
            </Space>
          </Card>
        )}

        {/* 使用说明 */}
        <Card title="使用说明" style={{ background: 'var(--semi-color-bg-2)' }}>
          <Space vertical style={{ width: '100%' }}>
            <Text size="small" type="tertiary">
              1. 首次使用需要点击"初始化数据库"按钮
            </Text>
            <Text size="small" type="tertiary">
              2. 使用"批量向量化文档"将所有markdown文件添加到向量数据库
            </Text>
            <Text size="small" type="tertiary">
              3. 在聊天界面点击搜索图标可以搜索相关文档作为对话上下文
            </Text>
            <Text size="small" type="tertiary">
              4. 向量化过程需要OpenAI API，请确保已正确配置API密钥
            </Text>
          </Space>
        </Card>
      </div>
    </Modal>
  )
}

export default VectorDatabaseManager