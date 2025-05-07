import React, { useState, useRef } from 'react'
import { Button, Popover, Spin, Typography, Select } from '@douyinfe/semi-ui'
import { IconCommand } from '@douyinfe/semi-icons'
import { useBlockNoteEditor } from '@blocknote/react'
import { useTheme } from '../context/theme/useTheme'

// 摘要长度选项
interface SummaryLengthOption {
  value: string
  label: string
}

const SUMMARY_LENGTH_OPTIONS: SummaryLengthOption[] = [
  { value: 'short', label: '简短' },
  { value: 'medium', label: '中等' },
  { value: 'long', label: '详细' }
]

// SummaryButton component for BlockNote formatting toolbar
export const SummaryButton: React.FC = () => {
  const editor = useBlockNoteEditor()
  const { isDarkMode } = useTheme()
  const [loading, setLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState('')
  const [streamingResponse, setStreamingResponse] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summaryLength, setSummaryLength] = useState<string>('medium')
  const contentRef = useRef<HTMLDivElement>(null)

  // 加载保存的摘要长度偏好
  React.useEffect(() => {
    const loadSummaryLengthPreference = async (): Promise<void> => {
      try {
        const settings = await window.api.settings.getAll()
        if (settings.summaryLength) {
          setSummaryLength(settings.summaryLength as string)
        }
      } catch (err) {
        console.error('加载摘要长度偏好失败:', err)
      }
    }

    loadSummaryLengthPreference()
  }, [])

  // 保存摘要长度偏好
  const saveSummaryLengthPreference = async (length: string): Promise<void> => {
    try {
      await window.api.settings.set('summaryLength', length)
    } catch (err) {
      console.error('保存摘要长度偏好失败:', err)
    }
  }

  // 获取选中文本
  const getSelectedText = async (): Promise<string> => {
    // 首先尝试获取DOM选择以获取最准确的文本选择
    try {
      const domSelection = window.getSelection()
      if (domSelection && domSelection.toString().trim()) {
        return domSelection.toString().trim()
      }
    } catch (err) {
      console.error('获取DOM选择时出错:', err)
    }

    // 如果DOM选择为空，则回退到BlockNote选择
    const selection = editor.getSelection()
    if (!selection) return ''

    // 获取选中的块
    const blocks = selection.blocks || []

    if (blocks.length > 0) {
      // 将选中的块转换为markdown以保留格式
      try {
        const markdown = await editor.blocksToMarkdownLossy(blocks)
        return markdown
      } catch (error) {
        console.error('将块转换为markdown时出错:', error)
        return ''
      }
    }

    return ''
  }

  // 使用AI处理选中的文本
  const processWithAI = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    setAiResponse('')
    setStreamingResponse('')
    setIsStreaming(true)

    try {
      const selectedText = await getSelectedText()
      if (!selectedText) {
        setError('请先选择一些文本')
        setLoading(false)
        setIsStreaming(false)
        return
      }

      // 获取API设置
      const settings = await window.api.settings.getAll()
      const apiConfigs =
        (settings.apiConfigs as Array<{
          id: string
          name: string
          apiKey: string
          apiUrl: string
          modelName: string
          temperature?: string
          maxTokens?: string
        }>) || []

      if (apiConfigs.length === 0) {
        setError('未配置AI模型，请先在设置中配置AI模型')
        setLoading(false)
        setIsStreaming(false)
        return
      }

      // 获取从localStorage中存储的选中模型ID
      const selectedModelId = window.localStorage.getItem('selectedModelId')

      // 根据选中的模型ID获取API配置，如果未找到则使用第一个
      let AiApiConfig = apiConfigs[0]
      if (selectedModelId) {
        const selectedConfig = apiConfigs.find((config) => config.id === selectedModelId)
        if (selectedConfig) {
          AiApiConfig = selectedConfig
        }
      }

      // 创建摘要提示
      let prompt = ''
      const aiPrompts = (settings.aiPrompts as Record<string, string>) || {}

      // 获取摘要长度描述
      let lengthDescription = '中等长度的'
      switch (summaryLength) {
        case 'short':
          lengthDescription = '简短的'
          break
        case 'long':
          lengthDescription = '详细的'
          break
        default:
          lengthDescription = '中等长度的'
      }

      if (
        aiPrompts &&
        typeof aiPrompts === 'object' &&
        'summary' in aiPrompts &&
        aiPrompts.summary.trim() !== ''
      ) {
        // 替换占位符
        prompt = aiPrompts.summary
          .replace('${content}', selectedText.trim())
          .replace('${summaryLength}', lengthDescription)
      } else {
        // 默认摘要提示
        prompt = `请为以下内容生成${lengthDescription}摘要，只输出摘要内容，不要解释或包含原文：\n\n${selectedText.trim()}`
      }

      // 使用流式API
      const result = await window.api.openai.streamGenerateContent(
        {
          apiKey: AiApiConfig.apiKey,
          apiUrl: AiApiConfig.apiUrl,
          modelName: AiApiConfig.modelName,
          prompt: prompt,
          maxTokens: parseInt(AiApiConfig.maxTokens || '2000')
        },
        {
          onData: (chunk: string) => {
            // 更新流式响应，添加新的文本块
            setStreamingResponse((prev) => prev + chunk)

            // 自动滚动到底部
            if (contentRef.current) {
              contentRef.current.scrollTop = contentRef.current.scrollHeight
            }
          },
          onDone: (content: string) => {
            // 完成时设置最终响应
            setAiResponse(content)
            setLoading(false)
            setIsStreaming(false)
          },
          onError: (error: string) => {
            setError(error)
            setLoading(false)
            setIsStreaming(false)
          }
        }
      )

      if (!result.success) {
        setError(result.error || '处理失败')
        setLoading(false)
        setIsStreaming(false)
      }
    } catch (err) {
      setError('AI处理出错：' + (err instanceof Error ? err.message : String(err)))
      setLoading(false)
      setIsStreaming(false)
    }
  }

  // 应用AI响应到编辑器
  const applyAIResponse = (): void => {
    const responseToApply = aiResponse || streamingResponse
    if (!responseToApply) return

    const selection = editor.getSelection()
    if (!selection) return

    // 检查是否在编辑器中进行了文本选择
    const domSelection = window.getSelection()
    if (domSelection && !domSelection.isCollapsed) {
      // 简单替换文本选择
      const cleanResponse = responseToApply.trim()

      try {
        // 对于部分文本选择，直接插入重写的文本
        document.execCommand('insertText', false, cleanResponse)
        // 关闭弹出窗口
        setAiResponse('')
        setStreamingResponse('')
        return
      } catch (err) {
        console.error('使用execCommand出错:', err)
        // 如果execCommand失败，回退到BlockNote替换
      }
    }

    // 回退到BlockNote块替换
    try {
      editor.tryParseMarkdownToBlocks(responseToApply).then((blocks) => {
        if (blocks && blocks.length > 0) {
          editor.replaceBlocks(selection.blocks, blocks)
        } else {
          // 如果解析失败，则回退
          editor.replaceBlocks(selection.blocks, [
            {
              type: 'paragraph',
              content: responseToApply
            }
          ])
        }
      })
    } catch (err) {
      console.error('替换块时出错:', err)
    }

    // 通过清除响应关闭弹出窗口
    setAiResponse('')
    setStreamingResponse('')
  }

  // 处理摘要长度变化
  const handleSummaryLengthChange = (value: string): void => {
    setSummaryLength(value)
    saveSummaryLengthPreference(value)
  }

  // 基于状态渲染弹出窗口内容
  const renderPopoverContent = (): React.ReactNode => {
    if (loading) {
      return (
        <div
          style={{
            padding: '12px',
            minWidth: '300px',
            maxWidth: '300px',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <Spin size="small" />
            <Typography.Text style={{ display: 'block', marginTop: '8px' }}>
              AI正在{isStreaming ? '生成' : '处理'}...
            </Typography.Text>
          </div>

          {isStreaming && streamingResponse && (
            <div
              ref={contentRef}
              style={{
                marginTop: '12px',
                maxHeight: '300px',
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '8px',
                border: '1px solid var(--semi-color-border)',
                borderRadius: '4px',
                backgroundColor: isDarkMode ? 'var(--semi-color-bg-1)' : 'var(--semi-color-bg-0)'
              }}
            >
              <Typography.Paragraph
                style={{ whiteSpace: 'pre-wrap', margin: 0, wordBreak: 'break-word' }}
              >
                {streamingResponse}
              </Typography.Paragraph>
            </div>
          )}

          {isStreaming && streamingResponse && (
            <div style={{ marginTop: '12px', textAlign: 'right' }}>
              <Button
                size="small"
                type="tertiary"
                onClick={() => {
                  setLoading(false)
                  setIsStreaming(false)
                }}
              >
                取消
              </Button>
              <Button
                size="small"
                type="primary"
                style={{ marginLeft: '8px' }}
                onClick={applyAIResponse}
              >
                应用
              </Button>
            </div>
          )}
        </div>
      )
    }

    if (error) {
      return (
        <div style={{ padding: '12px' }}>
          <Typography.Text type="danger">{error}</Typography.Text>
          <Button size="small" style={{ marginTop: '8px' }} onClick={() => setError(null)}>
            关闭
          </Button>
        </div>
      )
    }

    if (aiResponse) {
      return (
        <div
          style={{
            padding: '12px',
            minWidth: '300px',
            maxWidth: '300px',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <div
            style={{
              maxHeight: '300px',
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '8px',
              border: '1px solid var(--semi-color-border)',
              borderRadius: '4px',
              backgroundColor: isDarkMode ? 'var(--semi-color-bg-1)' : 'var(--semi-color-bg-0)'
            }}
          >
            <Typography.Paragraph
              style={{ whiteSpace: 'pre-wrap', margin: 0, wordBreak: 'break-word' }}
            >
              {aiResponse}
            </Typography.Paragraph>
          </div>
          <div style={{ marginTop: '12px', textAlign: 'right' }}>
            <Button size="small" onClick={() => setAiResponse('')}>
              取消
            </Button>
            <Button
              size="small"
              type="primary"
              style={{ marginLeft: '8px' }}
              onClick={applyAIResponse}
            >
              应用
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div style={{ padding: '12px', width: '300px' }}>
        <Typography.Text style={{ display: 'block', marginBottom: '8px' }}>
          摘要设置
        </Typography.Text>

        <div style={{ marginBottom: '12px' }}>
          <Typography.Text style={{ display: 'block', marginBottom: '4px' }}>
            摘要长度
          </Typography.Text>
          <Select
            style={{ width: '100%' }}
            value={summaryLength}
            onChange={(
              value: string | number | unknown[] | Record<string, unknown> | undefined
            ) => {
              if (typeof value === 'string') {
                handleSummaryLengthChange(value)
              }
            }}
          >
            {SUMMARY_LENGTH_OPTIONS.map((option) => (
              <Select.Option key={option.value} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Select>
        </div>

        <Typography.Text style={{ display: 'block', marginBottom: '12px' }}>
          使用AI为选中的内容生成摘要，仅输出精炼后的关键信息
        </Typography.Text>
        <Button size="small" type="primary" onClick={processWithAI} style={{ marginTop: '8px' }}>
          生成摘要
        </Button>
      </div>
    )
  }

  // 使用自定义样式的按钮
  return (
    <Popover content={renderPopoverContent()} trigger="click" position="bottomLeft">
      <div
        className="bn-formatting-toolbar-button"
        title="AI摘要"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: '4px 8px'
        }}
      >
        <IconCommand style={{ color: isDarkMode ? '#dedede' : undefined }} />
      </div>
    </Popover>
  )
}
