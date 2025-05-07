import React, { useState, useRef } from 'react'
import { Button, Popover, Spin, Typography } from '@douyinfe/semi-ui'
import { IconEditStroked } from '@douyinfe/semi-icons'
import { useBlockNoteEditor } from '@blocknote/react'
import { useTheme } from '../context/theme/useTheme'

// ContinueButton component for BlockNote formatting toolbar
export const ContinueButton: React.FC = () => {
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
      let AiApiConfig = apiConfigs[0]
      if (selectedModelId) {
        const selectedConfig = apiConfigs.find((config) => config.id === selectedModelId)
        if (selectedConfig) {
          AiApiConfig = selectedConfig
        }
      }

      // Get continuation prompt from settings or use default
      let prompt = ''
      const aiPrompts = (settings.aiPrompts as Record<string, string>) || {}

      if (
        aiPrompts &&
        typeof aiPrompts === 'object' &&
        'continue' in aiPrompts &&
        aiPrompts.continue.trim() !== ''
      ) {
        // Replace placeholder with actual content
        prompt = aiPrompts.continue.replace('${content}', selectedText.trim())
      } else {
        // Default prompt for content continuation
        prompt = `Continue the following content, keeping the style and logic consistent:\n\n${selectedText.trim()}`
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

  // Function to apply AI response to editor
  const applyAIResponse = (): void => {
    const responseToApply = aiResponse || streamingResponse
    if (!responseToApply) return

    const selection = editor.getSelection()
    if (!selection) return

    // Check if we're dealing with a text selection within editor
    const domSelection = window.getSelection()
    if (domSelection && !domSelection.isCollapsed) {
      // For content continuation, we want to append, not replace
      try {
        // Get current selection
        const range = domSelection.getRangeAt(0)
        // Move selection to end
        range.collapse(false)
        // Insert text at cursor position
        document.execCommand('insertText', false, responseToApply.trim())
        // Close popover
        setAiResponse('')
        setStreamingResponse('')
        return
      } catch (err) {
        console.error('Error using execCommand:', err)
        // Fallback to BlockNote replacement if execCommand fails
      }
    }

    // Fallback to BlockNote block addition
    try {
      // Try to parse AI response as markdown
      editor.tryParseMarkdownToBlocks(responseToApply).then((blocks) => {
        if (blocks && blocks.length > 0) {
          // Add the new blocks after the current selection
          const lastSelectedBlockIndex = editor.document.findIndex(
            (block) => block.id === selection.blocks[selection.blocks.length - 1].id
          )

          if (lastSelectedBlockIndex !== -1) {
            // Insert the new blocks after the last selected block
            const newDocument = [
              ...editor.document.slice(0, lastSelectedBlockIndex + 1),
              ...blocks,
              ...editor.document.slice(lastSelectedBlockIndex + 1)
            ]
            editor.replaceBlocks(editor.document, newDocument)
          } else {
            // Fallback: just append to the end
            editor.insertBlocks(blocks, editor.document[editor.document.length - 1], 'after')
          }
        } else {
          // Fallback if parsing fails
          editor.insertBlocks(
            [
              {
                type: 'paragraph',
                content: responseToApply
              }
            ],
            selection.blocks[selection.blocks.length - 1],
            'after'
          )
        }
      })
    } catch (err) {
      console.error('Error appending blocks:', err)
    }

    // Close popover by clearing response
    setAiResponse('')
    setStreamingResponse('')
  }

  // Render popover content based on state
  const renderPopoverContent = (): React.ReactNode => {
    if (loading) {
      return (
        <div style={{ padding: '12px', minWidth: '300px', maxWidth: '300px' }}>
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
        <div style={{ padding: '12px', minWidth: '300px' }}>
          <Typography.Text type="danger">{error}</Typography.Text>
          <div style={{ marginTop: '12px', textAlign: 'right' }}>
            <Button size="small" type="primary" onClick={() => setError(null)}>
              关闭
            </Button>
          </div>
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
      <div style={{ padding: '12px', minWidth: '200px' }}>
        <Typography.Paragraph>
          使用AI继续生成选中文本的后续内容。
          <br />
          请先选择一段文本，然后点击这个按钮。
        </Typography.Paragraph>
        <div style={{ textAlign: 'right' }}>
          <Button size="small" type="primary" onClick={processWithAI}>
            开始生成
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Popover content={renderPopoverContent()} trigger="click" position="bottomLeft" showArrow>
      <Button
        theme="borderless"
        type="tertiary"
        icon={<IconEditStroked />}
        aria-label="AI继续写作"
        style={{
          margin: '0 4px'
        }}
      />
    </Popover>
  )
}
