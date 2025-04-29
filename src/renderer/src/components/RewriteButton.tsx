import React, { useState, useRef } from 'react'
import { Button, Popover, Spin, Typography } from '@douyinfe/semi-ui'
import { IconRotationStroked } from '@douyinfe/semi-icons'
import { useBlockNoteEditor } from '@blocknote/react'
import { useTheme } from '../context/theme/useTheme'

// RewriteButton component for BlockNote formatting toolbar
export const RewriteButton: React.FC = () => {
  const editor = useBlockNoteEditor()
  const { isDarkMode } = useTheme()
  const [loading, setLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState('')
  const [streamingResponse, setStreamingResponse] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Function to get selected text from editor
  const getSelectedText = async (): Promise<string> => {
    // First try to get the DOM selection for most accurate text selection
    try {
      const domSelection = window.getSelection()
      if (domSelection && domSelection.toString().trim()) {
        return domSelection.toString().trim()
      }
    } catch (err) {
      console.error('Error getting DOM selection:', err)
    }

    // Fallback to BlockNote selection if DOM selection is empty
    const selection = editor.getSelection()
    if (!selection) return ''

    // Get selected blocks
    const blocks = selection.blocks || []

    if (blocks.length > 0) {
      // Convert selected blocks to markdown to preserve formatting
      try {
        const markdown = await editor.blocksToMarkdownLossy(blocks)
        return markdown
      } catch (error) {
        console.error('Error converting blocks to markdown:', error)
        return ''
      }
    }

    return ''
  }

  // Function to process selected text with AI using streaming
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

      // Get API settings from user configuration
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
      let apiConfig = apiConfigs[0]
      if (selectedModelId) {
        const selectedConfig = apiConfigs.find((config) => config.id === selectedModelId)
        if (selectedConfig) {
          apiConfig = selectedConfig
        }
      }

      // Get rewrite prompt from settings or use default
      let prompt = ''
      const aiPrompts = (settings.aiPrompts as Record<string, string>) || {}

      if (
        aiPrompts &&
        typeof aiPrompts === 'object' &&
        'rewrite' in aiPrompts &&
        aiPrompts.rewrite.trim() !== ''
      ) {
        // Replace placeholder with actual content
        prompt = aiPrompts.rewrite.replace('${content}', selectedText.trim())
      } else {
        // Default prompt for content rewriting
        prompt = `Rewrite the following content, keeping the original meaning but improving the expression, making it more fluent and clear:\n\n${selectedText.trim()}`
      }

      // 使用流式API
      const result = await window.api.openai.streamGenerateContent(
        {
          apiKey: apiConfig.apiKey,
          apiUrl: apiConfig.apiUrl,
          modelName: apiConfig.modelName,
          prompt: prompt,
          maxTokens: parseInt(apiConfig.maxTokens || '2000')
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

  // Function to apply AI response to editor
  const applyAIResponse = (): void => {
    const responseToApply = aiResponse || streamingResponse
    if (!responseToApply) return

    const selection = editor.getSelection()
    if (!selection) return

    // Check if we're dealing with a text selection within editor
    const domSelection = window.getSelection()
    if (domSelection && !domSelection.isCollapsed) {
      // Simple replacement for text selection
      const cleanResponse = responseToApply.trim()

      try {
        // For partial text selection, insert the rewritten text directly
        document.execCommand('insertText', false, cleanResponse)
        // Close popover
        setAiResponse('')
        setStreamingResponse('')
        return
      } catch (err) {
        console.error('Error using execCommand:', err)
        // Fallback to BlockNote replacement if execCommand fails
      }
    }

    // Fallback to BlockNote block replacement
    try {
      editor.tryParseMarkdownToBlocks(responseToApply).then((blocks) => {
        if (blocks && blocks.length > 0) {
          editor.replaceBlocks(selection.blocks, blocks)
        } else {
          // Fallback if parsing fails
          editor.replaceBlocks(selection.blocks, [
            {
              type: 'paragraph',
              content: responseToApply
            }
          ])
        }
      })
    } catch (err) {
      console.error('Error replacing blocks:', err)
    }

    // Close popover by clearing response
    setAiResponse('')
    setStreamingResponse('')
  }

  // Render popover content based on state
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
        <div style={{ padding: '12px', maxWidth: '300px', width: '100%', boxSizing: 'border-box' }}>
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
            <Button size="small" type="tertiary" onClick={() => setAiResponse('')}>
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
      <div style={{ padding: '12px', width: '250px' }}>
        <Typography.Text style={{ display: 'block', marginBottom: '12px' }}>
          使用AI改写选中的内容，保持原意但改进表达
        </Typography.Text>
        <Button size="small" type="primary" onClick={processWithAI}>
          开始改写
        </Button>
      </div>
    )
  }

  // Use custom styled button
  return (
    <Popover content={renderPopoverContent()} trigger="click" position="bottomLeft">
      <div
        className="bn-formatting-toolbar-button"
        title="AI改写"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: '4px 8px'
        }}
      >
        <IconRotationStroked style={{ color: isDarkMode ? '#dedede' : undefined }} />
      </div>
    </Popover>
  )
}
