import React, { useState, useCallback, useEffect } from 'react'
import { Typography, Card, Divider, Button, Spin, Badge, Progress, Tag, Tooltip, Space } from '@douyinfe/semi-ui'
import { IconPieChartStroked, IconRefresh, IconDownload, IconCheckCircleStroked, IconInfoCircle } from '@douyinfe/semi-icons'
import { performanceMonitor, type PerformanceMetrics } from '../../utils/PerformanceMonitor'

const { Title, Text } = Typography

const PerformanceMonitorSection: React.FC = () => {
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null)
  const [isExportingPerformance, setIsExportingPerformance] = useState(false)

  const loadPerformanceMetrics = useCallback(() => {
    const metrics = performanceMonitor.getCurrentMetrics()
    setPerformanceMetrics(metrics)
  }, [])

  const handleResetPerformanceMetrics = useCallback(() => {
    performanceMonitor.resetMetrics()
    loadPerformanceMetrics()
  }, [loadPerformanceMetrics])

  const handleExportPerformanceData = useCallback(async () => {
    try {
      setIsExportingPerformance(true)
      const data = performanceMonitor.exportData()

      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `performance-data-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      // Toast would need to be imported from parent or use a callback
    } finally {
      setIsExportingPerformance(false)
    }
  }, [])

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`
  }

  useEffect(() => {
    loadPerformanceMetrics()
    const interval = setInterval(loadPerformanceMetrics, 10000)
    return () => clearInterval(interval)
  }, [loadPerformanceMetrics])

  return (
    <div className="tab-content">
      <Card className="settings-card animated-card">
        <div className="card-header">
          <div className="card-icon-wrapper performance-icon">
            <IconPieChartStroked size="large" />
          </div>
          <div className="card-content">
            <Title heading={6}>性能统计</Title>
            <Text type="tertiary" className="card-description">
              监控应用性能和资源使用情况
            </Text>
          </div>
          <Space>
            <Tooltip content="刷新数据" position="top">
              <Button
                icon={<IconRefresh />}
                onClick={loadPerformanceMetrics}
                theme="borderless"
                type="tertiary"
                className="icon-btn"
              />
            </Tooltip>
            <Button
              icon={<IconDownload />}
              onClick={handleExportPerformanceData}
              loading={isExportingPerformance}
              theme="light"
              type="primary"
            >
              导出数据
            </Button>
            <Button
              onClick={handleResetPerformanceMetrics}
              theme="borderless"
              type="danger"
            >
              重置
            </Button>
          </Space>
        </div>
        <Divider className="settings-divider" />
        {performanceMetrics ? (
          <div className="performance-metrics-container">
            <div className="performance-grid">
              {/* 内存使用 */}
              <div className="metric-card">
                <div className="metric-header">
                  <Title heading={6}>内存使用</Title>
                  <div className="metric-badge">
                    <Progress
                      percent={performanceMetrics.memoryUsage.percentage}
                      size="small"
                      type="circle"
                      width={40}
                      strokeWidth={8}
                      showInfo={false}
                      stroke={
                        performanceMetrics.memoryUsage.percentage > 90
                          ? 'var(--semi-color-danger)'
                          : performanceMetrics.memoryUsage.percentage > 75
                            ? 'var(--semi-color-warning)'
                            : 'var(--semi-color-success)'
                      }
                    />
                  </div>
                </div>
                <div className="metric-content">
                  <div className="metric-item">
                    <Text type="tertiary">已使用</Text>
                    <Text strong>{formatBytes(performanceMetrics.memoryUsage.used)}</Text>
                  </div>
                  <div className="metric-item">
                    <Text type="tertiary">总量</Text>
                    <Text strong>{formatBytes(performanceMetrics.memoryUsage.total)}</Text>
                  </div>
                  <div className="metric-item">
                    <Text type="tertiary">使用率</Text>
                    <Text
                      strong
                      className={`metric-value ${
                        performanceMetrics.memoryUsage.percentage > 90
                          ? 'danger'
                          : performanceMetrics.memoryUsage.percentage > 75
                            ? 'warning'
                            : 'success'
                      }`}
                    >
                      {performanceMetrics.memoryUsage.percentage.toFixed(1)}%
                    </Text>
                  </div>
                </div>
              </div>

              {/* 编辑器性能 */}
              <div className="metric-card">
                <div className="metric-header">
                  <Title heading={6}>编辑器性能</Title>
                  <Tag color="blue" size="small">
                    实时
                  </Tag>
                </div>
                <div className="metric-content">
                  <div className="metric-item">
                    <Text type="tertiary">加载时间</Text>
                    <Text strong>
                      {formatTime(performanceMetrics.editorPerformance.loadTime)}
                    </Text>
                  </div>
                  <div className="metric-item">
                    <Text type="tertiary">保存时间</Text>
                    <Text strong>
                      {formatTime(performanceMetrics.editorPerformance.saveTime)}
                    </Text>
                  </div>
                  <div className="metric-item">
                    <Text type="tertiary">渲染时间</Text>
                    <Text strong>
                      {formatTime(performanceMetrics.editorPerformance.renderTime)}
                    </Text>
                  </div>
                </div>
              </div>

              {/* 用户操作统计 */}
              <div className="metric-card">
                <div className="metric-header">
                  <Title heading={6}>操作统计</Title>
                  <Badge
                    count={
                      performanceMetrics.userActions.editorChanges +
                      performanceMetrics.userActions.saves +
                      performanceMetrics.userActions.loads +
                      performanceMetrics.userActions.searches
                    }
                    type="tertiary"
                  />
                </div>
                <div className="metric-content">
                  <div className="metric-item">
                    <Text type="tertiary">编辑次数</Text>
                    <Text strong>{performanceMetrics.userActions.editorChanges}</Text>
                  </div>
                  <div className="metric-item">
                    <Text type="tertiary">保存次数</Text>
                    <Text strong>{performanceMetrics.userActions.saves}</Text>
                  </div>
                  <div className="metric-item">
                    <Text type="tertiary">加载次数</Text>
                    <Text strong>{performanceMetrics.userActions.loads}</Text>
                  </div>
                  <div className="metric-item">
                    <Text type="tertiary">搜索次数</Text>
                    <Text strong>{performanceMetrics.userActions.searches}</Text>
                  </div>
                </div>
              </div>

              {/* 网络性能 */}
              <div className="metric-card">
                <div className="metric-header">
                  <Title heading={6}>网络性能</Title>
                  {performanceMetrics.networkPerformance.latency > 0 && (
                    <Tag
                      color={
                        performanceMetrics.networkPerformance.latency < 100
                          ? 'green'
                          : performanceMetrics.networkPerformance.latency < 300
                            ? 'orange'
                            : 'red'
                      }
                      size="small"
                    >
                      {performanceMetrics.networkPerformance.latency < 100
                        ? '良好'
                        : performanceMetrics.networkPerformance.latency < 300
                          ? '一般'
                          : '较差'}
                    </Tag>
                  )}
                </div>
                <div className="metric-content">
                  <div className="metric-item">
                    <Text type="tertiary">上传速度</Text>
                    <Text strong>
                      {performanceMetrics.networkPerformance.uploadSpeed > 0
                        ? formatSpeed(performanceMetrics.networkPerformance.uploadSpeed)
                        : '未记录'}
                    </Text>
                  </div>
                  <div className="metric-item">
                    <Text type="tertiary">下载速度</Text>
                    <Text strong>
                      {performanceMetrics.networkPerformance.downloadSpeed > 0
                        ? formatSpeed(performanceMetrics.networkPerformance.downloadSpeed)
                        : '未记录'}
                    </Text>
                  </div>
                  <div className="metric-item">
                    <Text type="tertiary">网络延迟</Text>
                    <Text strong>
                      {performanceMetrics.networkPerformance.latency > 0
                        ? `${performanceMetrics.networkPerformance.latency.toFixed(0)}ms`
                        : '未记录'}
                    </Text>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="loading-container">
            <Spin size="large" />
            <Text type="tertiary">加载性能数据中...</Text>
          </div>
        )}

        {/* 性能报告 */}
        {performanceMetrics && (
          <div className="performance-report">
            <div className="report-header">
              <Title heading={5}>性能分析报告</Title>
              <Tag color="blue">自动生成</Tag>
            </div>
            {(() => {
              const report = performanceMonitor.generatePerformanceReport()
              return (
                <div className="report-content">
                  <div className="report-section">
                    <Title heading={6}>性能摘要</Title>
                    <div className="summary-grid">
                      <div className="summary-item">
                        <Text type="tertiary">平均内存使用</Text>
                        <Text strong>{report.summary.averageMemoryUsage}%</Text>
                      </div>
                      <div className="summary-item">
                        <Text type="tertiary">平均加载时间</Text>
                        <Text strong>{formatTime(report.summary.averageLoadTime)}</Text>
                      </div>
                      <div className="summary-item">
                        <Text type="tertiary">平均保存时间</Text>
                        <Text strong>{formatTime(report.summary.averageSaveTime)}</Text>
                      </div>
                      <div className="summary-item">
                        <Text type="tertiary">总操作次数</Text>
                        <Text strong>{report.summary.totalUserActions}</Text>
                      </div>
                    </div>
                  </div>

                  <div className="report-section">
                    <Title heading={6}>性能趋势</Title>
                    <div className="trends-container">
                      <div className="trend-item">
                        <Text type="tertiary">内存趋势</Text>
                        <Tag
                          color={
                            report.trends.memoryTrend === 'increasing'
                              ? 'orange'
                              : report.trends.memoryTrend === 'decreasing'
                                ? 'green'
                                : 'cyan'
                          }
                        >
                          {report.trends.memoryTrend === 'increasing'
                            ? '↑ 上升'
                            : report.trends.memoryTrend === 'decreasing'
                              ? '↓ 下降'
                              : '→ 稳定'}
                        </Tag>
                      </div>
                      <div className="trend-item">
                        <Text type="tertiary">性能趋势</Text>
                        <Tag
                          color={
                            report.trends.performanceTrend === 'improving'
                              ? 'green'
                              : report.trends.performanceTrend === 'declining'
                                ? 'orange'
                                : 'cyan'
                          }
                        >
                          {report.trends.performanceTrend === 'improving'
                            ? '↑ 提升'
                            : report.trends.performanceTrend === 'declining'
                              ? '↓ 下降'
                              : '→ 稳定'}
                        </Tag>
                      </div>
                    </div>
                  </div>

                  <div className="report-section">
                    <Title heading={6}>优化建议</Title>
                    <div className="recommendations-list">
                      {report.recommendations.map((rec, index) => (
                        <div key={index} className="recommendation-item">
                          <IconCheckCircleStroked className="recommendation-icon" />
                          <Text type="tertiary">{rec}</Text>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        <div className="card-footer">
          <Text type="tertiary" size="small">
            <IconInfoCircle size="small" />{' '}
            性能数据每1分钟自动更新，导出数据包含详细历史记录
          </Text>
        </div>
      </Card>
    </div>
  )
}

export default PerformanceMonitorSection