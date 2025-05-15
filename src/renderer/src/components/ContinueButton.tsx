import React, { useState, useRef, useEffect } from 'react'
import { Button, Popover, Spin, Typography } from '@douyinfe/semi-ui'
import { IconEditStroked } from '@douyinfe/semi-icons'
import { useBlockNoteEditor } from '@blocknote/react'
import { useTheme } from '../context/theme/useTheme'

// 定义Popover的位置类型
type PopoverPosition =
  | 'left'
  | 'right'
  | 'bottomLeft'
  | 'top'
  | 'bottom'
  | 'topLeft'
  | 'topRight'
  | 'leftTop'
  | 'leftBottom'
  | 'rightTop'
  | 'rightBottom'
  | 'bottomRight'
  | 'leftTopOver'
  | 'rightTopOver'
  | 'leftBottomOver'
  | 'rightBottomOver'

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
  const buttonRef = useRef<HTMLDivElement>(null)
  const [popoverVisible, setPopoverVisible] = useState(false)
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition>('bottomLeft')

  // Add resize event listener to handle window size changes
  useEffect(() => {
    const handleResize = (): void => {
      updatePopoverPosition()
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [popoverVisible])

  // Update popover position based on button position and window size
  const updatePopoverPosition = (): void => {
    if (!buttonRef.current || !popoverVisible) return

    const buttonRect = buttonRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Calculate available space in different directions
    const spaceBelow = viewportHeight - buttonRect.bottom
    const spaceAbove = buttonRect.top
    const spaceRight = viewportWidth - buttonRect.left
    const spaceLeft = buttonRect.right

    // Determine best position based on available space
    // Need at least 300px for content width and some height for the popover
    if (spaceBelow >= 350) {
      // If there's enough space below, prefer bottom positions
      if (spaceRight >= 300) {
        setPopoverPosition('bottomLeft')
      } else if (spaceLeft >= 300) {
        setPopoverPosition('bottomRight')
      } else {
        setPopoverPosition('bottom')
      }
    } else if (spaceAbove >= 350) {
      // If there's enough space above, use top positions
      if (spaceRight >= 300) {
        setPopoverPosition('topLeft')
      } else if (spaceLeft >= 300) {
        setPopoverPosition('topRight')
      } else {
        setPopoverPosition('top')
      }
    } else if (spaceRight >= 300) {
      // If there's enough space to the right
      setPopoverPosition('rightTop')
    } else if (spaceLeft >= 300) {
      // If there's enough space to the left
      setPopoverPosition('leftTop')
    } else {
      // Default fallback
      setPopoverPosition('bottom')
    }
  }

  // Handle popover visibility change
  const handlePopoverVisibleChange = (visible: boolean): void => {
    setPopoverVisible(visible)
    if (visible) {
      // Update position when popover becomes visible
      setTimeout(updatePopoverPosition, 0)
    }
  }

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
      const AiApiConfigs =
        (settings.AiApiConfigs as Array<{
          id: string
          name: string
          apiKey: string
          apiUrl: string
          modelName: string
          temperature?: string
          maxTokens?: string
        }>) || []

      if (AiApiConfigs.length === 0) {
        setError('未配置AI模型，请先在设置中配置AI模型')
        setLoading(false)
        setIsStreaming(false)
        return
      }

      // 获取从localStorage中存储的选中模型ID
      const selectedModelId = window.localStorage.getItem('selectedModelId')

      // 根据选中的模型ID获取API配置，如果未找到则使用第一个
      let AiApiConfig = AiApiConfigs[0]
      if (selectedModelId) {
        const selectedConfig = AiApiConfigs.find((config) => config.id === selectedModelId)
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
            // Recalculate position after content is loaded
            updatePopoverPosition()
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
        setPopoverVisible(false)
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
    setPopoverVisible(false)
  }

  // Render popover content based on state
  const renderPopoverContent = (): React.ReactNode => {
    if (loading) {
      return (
        <div
          className="ai-popover-content"
          style={{ padding: '12px', minWidth: '300px', maxWidth: '300px' }}
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
                  setPopoverVisible(false)
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
        <div className="ai-popover-content" style={{ padding: '12px', minWidth: '300px' }}>
          <Typography.Text type="danger">{error}</Typography.Text>
          <div style={{ marginTop: '12px', textAlign: 'right' }}>
            <Button
              size="small"
              type="primary"
              onClick={() => {
                setError(null)
                setPopoverVisible(false)
              }}
            >
              关闭
            </Button>
          </div>
        </div>
      )
    }

    if (aiResponse) {
      return (
        <div
          className="ai-popover-content"
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
            <Button
              size="small"
              type="tertiary"
              onClick={() => {
                setAiResponse('')
                setPopoverVisible(false)
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
        </div>
      )
    }

    return (
      <div className="ai-popover-content" style={{ padding: '12px', minWidth: '200px' }}>
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
    <Popover
      content={renderPopoverContent()}
      trigger="click"
      position={popoverPosition}
      visible={popoverVisible}
      onVisibleChange={handlePopoverVisibleChange}
      zIndex={1030}
      getPopupContainer={() => document.querySelector('.bn-container') || document.body}
      className="ai-response-popover"
    >
      <div ref={buttonRef} style={{ display: 'inline-block' }}>
        <Button
          theme="borderless"
          type="tertiary"
          title="AI续写"
          icon={<IconEditStroked />}
          style={{
            margin: '0 4px'
          }}
          onClick={() => setPopoverVisible(!popoverVisible)}
        />
      </div>
    </Popover>
  )
}
