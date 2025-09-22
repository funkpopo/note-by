/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { BubbleMenu } from '@tiptap/react/menus'
import { Button, Space, Toast, Spin, Select } from '@douyinfe/semi-ui'
import {
  IconBold,
  IconItalic,
  IconUnderline,
  IconStrikeThrough,
  IconLink,
  IconDelete,
  IconH1,
  IconH2,
  IconList,
  IconOrderedList,
  IconGridStroked,
  IconCode,
  IconImage,
  IconPlay
} from '@douyinfe/semi-icons'
import {
  RiDeleteColumn,
  RiInsertColumnLeft,
  RiInsertColumnRight,
  RiInsertRowBottom,
  RiInsertRowTop,
  RiDeleteRow,
  RiMergeCellsHorizontal,
  RiSplitCellsHorizontal
} from 'react-icons/ri'
import HighlightColorPicker from './HighlightColorPicker'
import { smartDiff } from '../utils/diffUtils'
import CustomDropdown from './CustomDropdown'
import { IconChevronDown } from './Icons'
import { uploadImage } from './editorUtils'

// 表格专用 BubbleMenu 组件
export const TableBubbleMenu: React.FC<{
  editor: any
  currentFolder?: string
  currentFile?: string
}> = ({ editor }) => {
  if (!editor) return null

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ state }) => {
        const { selection } = state
        const { $from } = selection
        // 只在表格区域且不是图片和iframe时显示
        return (
          ($from.parent.type.name === 'tableCell' || $from.parent.type.name === 'tableHeader') &&
          !editor.isActive('image') &&
          !editor.isActive('iframe')
        ) // 当图片或iframe被选中时不显示菜单
      }}
    >
      <div className="bubble-menu table-bubble-menu">
        <div className="bubble-menu-label">
          <span>表格工具</span>
        </div>
        <Space>
          <Button
            icon={<IconBold />}
            size="small"
            type={editor.isActive('bold') ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="加粗"
          />
          <Button
            icon={<IconItalic />}
            size="small"
            type={editor.isActive('italic') ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="斜体"
          />
          <Button
            icon={<IconUnderline />}
            size="small"
            type={editor.isActive('underline') ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="下划线"
          />
          <Button
            icon={<IconStrikeThrough />}
            size="small"
            type={editor.isActive('strike') ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="删除线"
          />
          <HighlightColorPicker editor={editor} isActive={editor.isActive('highlight')} />
          <Button
            icon={<IconLink />}
            size="small"
            type={editor.isActive('link') ? 'primary' : 'tertiary'}
            onClick={() => {
              // Create a simple input dialog
              const modalContent = document.createElement('div')
              modalContent.innerHTML = `
                <div style="padding: 16px;">
                  <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500;">链接地址:</label>
                    <input 
                      id="table-link-url-input" 
                      type="url" 
                      placeholder="https://example.com" 
                      style="width: 100%; padding: 8px 12px; border: 1px solid var(--semi-color-border); border-radius: 4px; font-size: 14px;"
                    />
                  </div>
                  <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
                    <button id="table-link-cancel-btn" style="padding: 8px 16px; border: 1px solid var(--semi-color-border); background: var(--semi-color-bg-2); border-radius: 4px; cursor: pointer;">取消</button>
                    <button id="table-link-ok-btn" style="padding: 8px 16px; border: none; background: var(--semi-color-primary); color: white; border-radius: 4px; cursor: pointer;">确定</button>
                  </div>
                </div>
              `

              const overlay = document.createElement('div')
              overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
              `

              const modal = document.createElement('div')
              modal.style.cssText = `
                background: var(--semi-color-bg-0);
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                min-width: 400px;
                max-width: 500px;
              `

              modal.appendChild(modalContent)
              overlay.appendChild(modal)
              document.body.appendChild(overlay)

              const input = modal.querySelector('#table-link-url-input') as HTMLInputElement
              const okBtn = modal.querySelector('#table-link-ok-btn') as HTMLButtonElement
              const cancelBtn = modal.querySelector('#table-link-cancel-btn') as HTMLButtonElement

              setTimeout(() => {
                input.focus()
              }, 100)

              const cleanup = () => {
                document.body.removeChild(overlay)
              }

              const handleOk = () => {
                const url = input.value.trim()
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run()
                }
                cleanup()
              }

              okBtn.addEventListener('click', handleOk)
              cancelBtn.addEventListener('click', cleanup)
              overlay.addEventListener('click', (e) => {
                if (e.target === overlay) cleanup()
              })

              input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleOk()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  cleanup()
                }
              })
            }}
            title="链接"
          />
          <div className="bubble-menu-divider" />
          <Button
            icon={<RiInsertColumnLeft />}
            size="small"
            type="tertiary"
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            title="在前面添加列"
          />
          <Button
            icon={<RiInsertColumnRight />}
            size="small"
            type="tertiary"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            title="在后面添加列"
          />
          <Button
            icon={<RiInsertRowTop />}
            size="small"
            type="tertiary"
            onClick={() => editor.chain().focus().addRowBefore().run()}
            title="在上面添加行"
          />
          <Button
            icon={<RiInsertRowBottom />}
            size="small"
            type="tertiary"
            onClick={() => editor.chain().focus().addRowAfter().run()}
            title="在下面添加行"
          />
          <Button
            icon={<RiDeleteColumn />}
            size="small"
            type="tertiary"
            onClick={() => editor.chain().focus().deleteColumn().run()}
            title="删除列"
          />
          <Button
            icon={<RiDeleteRow />}
            size="small"
            type="tertiary"
            onClick={() => editor.chain().focus().deleteRow().run()}
            title="删除行"
          />
          <div className="bubble-menu-divider" />
          <Button
            icon={<RiMergeCellsHorizontal />}
            size="small"
            type="tertiary"
            onClick={() => editor.chain().focus().mergeCells().run()}
            title="合并单元格"
          />
          <Button
            icon={<RiSplitCellsHorizontal />}
            size="small"
            type="tertiary"
            onClick={() => editor.chain().focus().splitCell().run()}
            title="拆分单元格"
          />
          <Button
            icon={<IconDelete />}
            size="small"
            type="tertiary"
            onClick={() => editor.chain().focus().deleteTable().run()}
            title="删除表格"
          />
        </Space>
      </div>
    </BubbleMenu>
  )
}

// 纯文本专用 BubbleMenu 组件（内存优化版本）
export const TextBubbleMenu: React.FC<{
  editor: any
  currentFolder?: string
  currentFile?: string
}> = ({ editor, currentFolder, currentFile }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingFeature, setLoadingFeature] = useState<string | null>(null)
  const [apiConfigs, setApiConfigs] = useState<any[]>([])
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null)
  const [bubbleMenuPosition, setBubbleMenuPosition] = useState<{
    top: number
    left: number
  } | null>(null)
  const [preservedSelection, setPreservedSelection] = useState<{ from: number; to: number } | null>(
    null
  )

  // 内存优化：使用 useCallback 防止不必要的重新渲染
  const cleanupRef = useRef<(() => void) | null>(null)

  // 加载API配置 - 优化版本
  const loadApiConfigs = useCallback(async () => {
    try {
      const settings = await window.api.settings.getAll()
      if (settings.AiApiConfigs && Array.isArray(settings.AiApiConfigs)) {
        setApiConfigs(settings.AiApiConfigs)
        if (!selectedConfigId && settings.AiApiConfigs.length > 0) {
          setSelectedConfigId(settings.AiApiConfigs[0].id)
        }
      }
    } catch {
      console.error('Failed to load API configs:', Error)
    }
  }, [selectedConfigId])

  // 组件加载时获取API配置
  useEffect(() => {
    loadApiConfigs()
  }, [loadApiConfigs])

  // 管理AI处理时的编辑器样式类名 - 内存优化
  useEffect(() => {
    const editorElement = editor?.view?.dom?.closest('.tiptap-editor')
    if (!editorElement) return

    if (isLoading && loadingFeature) {
      editorElement.classList.add('ai-processing')

      // 防抖处理选中状态恢复
      const debounceSelection = () => {
        if (preservedSelection && editor) {
          try {
            const selection = editor.state.selection
            if (
              selection.empty ||
              selection.from !== preservedSelection.from ||
              selection.to !== preservedSelection.to
            ) {
              editor.commands.setTextSelection(preservedSelection)
            }
          } catch {
            // Failed to maintain selection during processing
          }
        }
      }

      const timeoutId = setTimeout(debounceSelection, 50)
      cleanupRef.current = () => clearTimeout(timeoutId)
    } else {
      editorElement.classList.remove('ai-processing')
      cleanupRef.current?.()
    }

    return () => {
      editorElement.classList.remove('ai-processing')
      cleanupRef.current?.()
    }
  }, [isLoading, loadingFeature, editor, preservedSelection])

  // 获取选中的文本 - 优化版本
  const getSelectedText = useCallback((): string => {
    if (!editor?.state) return ''
    const { from, to } = editor.state.selection
    return editor.state.doc.textBetween(from, to, ' ')
  }, [editor])

  // 获取当前选中的API配置 - 优化版本
  const getCurrentConfig = useCallback(() => {
    return apiConfigs.find((config) => config.id === selectedConfigId) || null
  }, [apiConfigs, selectedConfigId])

  // 调用AI API - 内存优化版本
  const callAI = useCallback(
    async (prompt: string, selectedText: string): Promise<string> => {
      const config = getCurrentConfig()
      if (!config) {
        throw new Error('请先在设置中配置AI API')
      }

      if (!config.apiKey || !config.apiUrl || !config.modelName) {
        throw new Error('API配置不完整，请检查设置')
      }

      try {
        // 确保这是一个await调用
        const result = await window.api.openai.generateContent({
          apiKey: config.apiKey,
          apiUrl: config.apiUrl,
          modelName: config.modelName,
          prompt: `${prompt}\n\n${selectedText}`,
          maxTokens: parseInt(config.maxTokens || '2000')
        })

        // 确保result是一个已解析的对象，而不是Promise
        if (!result || typeof result !== 'object') {
          throw new Error('API返回格式错误')
        }

        if (!result.success) {
          throw new Error(result.error || '生成失败')
        }

        return result.content || ''
      } catch (error) {
        // 确保错误是可序列化的
        if (error instanceof Error) {
          throw error
        } else if (typeof error === 'string') {
          throw new Error(error)
        } else {
          throw new Error('未知错误')
        }
      }
    },
    [getCurrentConfig]
  )

  // AI功能
  const AI_FEATURES = [
    {
      key: 'summarize',
      label: '总结',
      prompt:
        '请总结以下内容的主要要点，用简洁的语言概括核心信息。\n\n重要要求：\n- 直接输出总结内容，不要任何前缀、后缀或说明\n- 不要包含"总结如下"、"主要内容包括"等引导语\n- 不要添加任何解释、介绍或额外文字\n- 输出格式应该直接是总结的正文内容\n\n需要总结的内容：'
    },
    {
      key: 'expand',
      label: '扩写',
      prompt:
        '请对以下内容进行扩写，增加更多细节、例子或解释，使其更加丰富和详细。\n\n重要要求：\n- 直接输出扩写后的完整内容，替换原文\n- 不要包含"扩写如下"、"详细内容为"等引导语\n- 不要添加任何解释、介绍或额外说明\n- 输出格式应该直接是扩写后的正文内容\n\n需要扩写的内容：'
    },
    {
      key: 'continue',
      label: '续写',
      prompt:
        '请根据以下内容的语境和风格，自然地续写后续内容。\n\n重要要求：\n- 直接输出续写的部分，无缝衔接原文\n- 不要包含"续写如下"、"后续内容为"等引导语\n- 不要添加任何解释、介绍或额外说明\n- 输出格式应该直接是续写的正文内容\n\n需要续写的内容：'
    },
    {
      key: 'check',
      label: '检查',
      prompt:
        '请检查以下文本的语法、拼写、标点和表达错误，并直接输出修改后的正确版本。\n\n重要要求：\n- 直接输出修正后的完整内容，替换原文\n- 不要包含"修正如下"、"正确版本为"等引导语\n- 不要添加任何修改说明、错误列表或解释\n- 输出格式应该直接是修正后的正文内容\n\n需要检查的内容：'
    }
  ]

  // 翻译语言选项
  const TRANSLATION_LANGUAGES = [
    { key: 'translate_zh', label: '翻译为中文', targetLang: '中文' },
    { key: 'translate_en', label: '翻译为英文', targetLang: '英文' },
    { key: 'translate_ja', label: '翻译为日文', targetLang: '日文' },
    { key: 'translate_ko', label: '翻译为韩文', targetLang: '韩文' },
    { key: 'translate_fr', label: '翻译为法文', targetLang: '法文' },
    { key: 'translate_ru', label: '翻译为俄文', targetLang: '俄文' }
  ]

  // 捕获bubble menu位置
  const captureBubbleMenuPosition = useCallback(() => {
    try {
      // 获取当前bubble menu的位置
      const bubbleMenuElement = document.querySelector('.text-bubble-menu')
      if (bubbleMenuElement) {
        const rect = bubbleMenuElement.getBoundingClientRect()

        // 确保位置在视口范围内
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        const menuWidth = 200 // AI加载菜单的最大宽度
        const menuHeight = 50 // AI加载菜单的大概高度

        let adjustedTop = rect.top
        let adjustedLeft = rect.left

        // 防止菜单超出右边界
        if (adjustedLeft + menuWidth > viewportWidth) {
          adjustedLeft = viewportWidth - menuWidth - 10
        }

        // 防止菜单超出左边界
        if (adjustedLeft < 10) {
          adjustedLeft = 10
        }

        // 防止菜单超出上边界
        if (adjustedTop < 10) {
          adjustedTop = rect.bottom + 5
        }

        // 防止菜单超出下边界
        if (adjustedTop + menuHeight > viewportHeight) {
          adjustedTop = Math.max(10, rect.top - menuHeight - 5)
        }

        setBubbleMenuPosition({
          top: adjustedTop,
          left: adjustedLeft
        })

        // Captured bubble menu position
      } else {
        // Text bubble menu element not found
      }
    } catch {
      console.error('Error capturing bubble menu position:', Error)
      setBubbleMenuPosition(null)
    }
  }, [])

  // 处理翻译功能
  const handleTranslation = useCallback(
    async (targetLanguage: string) => {
      const selectedText = getSelectedText()
      if (!selectedText.trim()) {
        Toast.error('请先选择要处理的文本')
        return
      }

      if (apiConfigs.length === 0) {
        Toast.error('请先在设置中配置AI API')
        return
      }

      const config = getCurrentConfig()
      if (!config) {
        Toast.error('请先选择一个API配置')
        return
      }

      const finalPrompt = `请将以下内容翻译成${targetLanguage}。

重要要求：
- 直接输出翻译后的内容，不要任何前缀、后缀或说明
- 不要包含"翻译如下"、"翻译结果为"等引导语
- 不要添加任何解释、介绍或额外文字
- 输出格式应该直接是翻译后的正文内容
- 保持原文的格式和结构

需要翻译的内容：`

      // 在开始处理前保存当前bubble menu的位置和选中状态
      captureBubbleMenuPosition()
      const { from, to } = editor.state.selection
      setPreservedSelection({ from, to })
      setIsLoading(true)
      setLoadingFeature('translate')

      try {
        const result = await callAI(finalPrompt, selectedText)

        if (result.trim()) {
          // 计算diff
          const diffResult = smartDiff(selectedText, result.trim())

          // 在选中位置插入内联diff节点
          const { from, to } = editor.state.selection
          editor
            .chain()
            .focus()
            .setTextSelection({ from, to })
            .deleteSelection()
            .setInlineDiff({
              originalText: selectedText,
              newText: result.trim(),
              diffResult,
              feature: { key: 'translate', label: '翻译' }
            })
            .run()

          Toast.success('翻译完成')
        } else {
          Toast.error('AI返回了空结果')
        }
      } catch (error) {
        console.error('AI 翻译失败:', error)
        // 确保错误消息是字符串，而不是Promise或其他对象
        let errorMessage = '未知错误'
        if (error instanceof Error) {
          errorMessage = error.message
        } else if (typeof error === 'string') {
          errorMessage = error
        } else if (error && typeof error === 'object' && 'message' in error) {
          errorMessage = String(error.message)
        }
        Toast.error(`翻译失败: ${errorMessage}`)
      } finally {
        setIsLoading(false)
        setLoadingFeature(null)
        setBubbleMenuPosition(null)
        setPreservedSelection(null)
      }
    },
    [getSelectedText, apiConfigs, getCurrentConfig, callAI, editor, captureBubbleMenuPosition]
  )

  // 处理AI功能
  const handleAIFeature = useCallback(
    async (feature: any) => {
      const selectedText = getSelectedText()
      if (!selectedText.trim()) {
        Toast.error('请先选择要处理的文本')
        return
      }

      if (apiConfigs.length === 0) {
        Toast.error('请先在设置中配置AI API')
        return
      }

      const config = getCurrentConfig()
      if (!config) {
        Toast.error('请先选择一个API配置')
        return
      }

      // 在开始处理前保存当前bubble menu的位置和选中状态
      captureBubbleMenuPosition()
      const { from, to } = editor.state.selection
      setPreservedSelection({ from, to })
      setIsLoading(true)
      setLoadingFeature(feature.key)

      try {
        const result = await callAI(feature.prompt, selectedText)

        if (result.trim()) {
          // 计算diff
          const diffResult = smartDiff(selectedText, result.trim())

          // 在选中位置插入内联diff节点
          const { from, to } = editor.state.selection
          editor
            .chain()
            .focus()
            .setTextSelection({ from, to })
            .deleteSelection()
            .setInlineDiff({
              originalText: selectedText,
              newText: result.trim(),
              diffResult,
              feature
            })
            .run()

          Toast.success(`${feature.label}完成`)
        } else {
          Toast.error('AI返回了空结果')
        }
      } catch (error) {
        console.error(`AI ${feature.label} failed:`, error)
        // 确保错误消息是字符串，而不是Promise或其他对象
        let errorMessage = '未知错误'
        if (error instanceof Error) {
          errorMessage = error.message
        } else if (typeof error === 'string') {
          errorMessage = error
        } else if (error && typeof error === 'object' && 'message' in error) {
          errorMessage = String(error.message)
        }
        Toast.error(`${feature.label}失败: ${errorMessage}`)
      } finally {
        setIsLoading(false)
        setLoadingFeature(null)
        setBubbleMenuPosition(null)
        setPreservedSelection(null)
      }
    },
    [getSelectedText, apiConfigs, getCurrentConfig, callAI, editor, captureBubbleMenuPosition]
  )

  if (!editor) return null

  // 如果正在加载AI功能，显示加载状态
  if (isLoading && loadingFeature) {
    const currentFeature =
      AI_FEATURES.find((f) => f.key === loadingFeature) ||
      TRANSLATION_LANGUAGES.find(() => loadingFeature === 'translate')
    const featureLabel = loadingFeature === 'translate' ? '翻译' : currentFeature?.label

    return (
      <BubbleMenu
        editor={editor}
        shouldShow={() => {
          // 确保在加载期间保持显示，并尝试保持选中状态
          if (preservedSelection && editor) {
            try {
              const { from, to } = preservedSelection
              // 检查选择范围是否有效
              if (from <= editor.state.doc.content.size && to <= editor.state.doc.content.size) {
                editor.commands.setTextSelection({ from, to })
              }
            } catch {
              // Failed to restore selection
            }
          }
          return true
        }}
        updateDelay={0}
      >
        <div
          className="bubble-menu ai-bubble-menu ai-loading-menu"
          style={
            bubbleMenuPosition
              ? {
                  position: 'fixed',
                  top: bubbleMenuPosition.top,
                  left: bubbleMenuPosition.left,
                  zIndex: 10000
                }
              : undefined
          }
        >
          <div className="ai-loading-content">
            <div className="ai-loading-text">
              <Spin size="small" />
              AI正在{featureLabel}中
            </div>
            <Button
              size="small"
              type="danger"
              theme="borderless"
              onClick={() => {
                setIsLoading(false)
                setLoadingFeature(null)
                setBubbleMenuPosition(null)
                setPreservedSelection(null)
                // 恢复编辑器焦点
                editor.commands.focus()
              }}
            >
              停止
            </Button>
          </div>
        </div>
      </BubbleMenu>
    )
  }

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ state, from, to }) => {
        const { selection } = state
        const { $from } = selection
        // 只在非表格区域、非代码块区域、非图片区域、非iframe区域且有选中文本时显示
        return (
          from !== to &&
          $from.parent.type.name !== 'tableCell' &&
          $from.parent.type.name !== 'tableHeader' &&
          $from.parent.type.name !== 'codeBlock' &&
          $from.parent.type.name !== 'iframe' &&
          !editor.isActive('image') &&
          !editor.isActive('iframe')
        )
      }}
    >
      <div className="bubble-menu text-bubble-menu">
        <div className="bubble-menu-label">
          <span>文本工具</span>
        </div>
        <Space>
          {/* AI功能下拉菜单 - 第一个位置 */}
          <CustomDropdown
            trigger="click"
            position="bottomLeft"
            menu={[
              ...AI_FEATURES.map((feature) => ({
                node: 'item' as const,
                name: feature.label,
                onClick: () => handleAIFeature(feature),
                disabled: isLoading
              })),
              {
                node: 'divider' as const
              },
              {
                node: 'title' as const,
                name: '翻译功能'
              },
              ...TRANSLATION_LANGUAGES.map((lang) => ({
                node: 'item' as const,
                name: lang.label,
                onClick: () => handleTranslation(lang.targetLang),
                disabled: isLoading
              }))
            ]}
            disabled={isLoading}
            dropdownStyle={{
              maxHeight: '300px',
              overflowY: 'auto',
              zIndex: 9999
            }}
            className="ai-features-dropdown"
          >
            <Button
              rightIcon={<IconChevronDown />}
              size="small"
              type="primary"
              disabled={isLoading}
              style={{ marginRight: '8px' }}
            >
              AI助手
            </Button>
          </CustomDropdown>

          {/* API配置选择（如果有多个配置） */}
          {apiConfigs.length > 1 && (
            <Select
              value={selectedConfigId || undefined}
              onChange={(value) => setSelectedConfigId(value as string)}
              size="small"
              style={{ width: 120, marginRight: '8px' }}
              placeholder="选择API"
            >
              {apiConfigs.map((config) => (
                <Select.Option key={config.id} value={config.id}>
                  {config.name}
                </Select.Option>
              ))}
            </Select>
          )}

          <div className="bubble-menu-divider" />

          <Button
            icon={<IconBold />}
            size="small"
            type={editor.isActive('bold') ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="加粗"
          />
          <Button
            icon={<IconItalic />}
            size="small"
            type={editor.isActive('italic') ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="斜体"
          />
          <Button
            icon={<IconUnderline />}
            size="small"
            type={editor.isActive('underline') ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="下划线"
          />
          <Button
            icon={<IconStrikeThrough />}
            size="small"
            type={editor.isActive('strike') ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="删除线"
          />
          <HighlightColorPicker editor={editor} isActive={editor.isActive('highlight')} />
          <Button
            icon={<IconLink />}
            size="small"
            type={editor.isActive('link') ? 'primary' : 'tertiary'}
            onClick={() => {
              // Create a simple input dialog
              const modalContent = document.createElement('div')
              modalContent.innerHTML = `
                <div style="padding: 16px;">
                  <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500;">链接地址:</label>
                    <input 
                      id="text-link-url-input" 
                      type="url" 
                      placeholder="https://example.com" 
                      style="width: 100%; padding: 8px 12px; border: 1px solid var(--semi-color-border); border-radius: 4px; font-size: 14px;"
                    />
                  </div>
                  <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
                    <button id="text-link-cancel-btn" style="padding: 8px 16px; border: 1px solid var(--semi-color-border); background: var(--semi-color-bg-2); border-radius: 4px; cursor: pointer;">取消</button>
                    <button id="text-link-ok-btn" style="padding: 8px 16px; border: none; background: var(--semi-color-primary); color: white; border-radius: 4px; cursor: pointer;">确定</button>
                  </div>
                </div>
              `

              const overlay = document.createElement('div')
              overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
              `

              const modal = document.createElement('div')
              modal.style.cssText = `
                background: var(--semi-color-bg-0);
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                min-width: 400px;
                max-width: 500px;
              `

              modal.appendChild(modalContent)
              overlay.appendChild(modal)
              document.body.appendChild(overlay)

              const input = modal.querySelector('#text-link-url-input') as HTMLInputElement
              const okBtn = modal.querySelector('#text-link-ok-btn') as HTMLButtonElement
              const cancelBtn = modal.querySelector('#text-link-cancel-btn') as HTMLButtonElement

              setTimeout(() => {
                input.focus()
              }, 100)

              const cleanup = () => {
                document.body.removeChild(overlay)
              }

              const handleOk = () => {
                const url = input.value.trim()
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run()
                }
                cleanup()
              }

              okBtn.addEventListener('click', handleOk)
              cancelBtn.addEventListener('click', cleanup)
              overlay.addEventListener('click', (e) => {
                if (e.target === overlay) cleanup()
              })

              input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleOk()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  cleanup()
                }
              })
            }}
            title="链接"
          />
          <div className="bubble-menu-divider" />
          <Button
            icon={<IconH1 />}
            size="small"
            type={editor.isActive('heading', { level: 1 }) ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="标题1"
          />
          <Button
            icon={<IconH2 />}
            size="small"
            type={editor.isActive('heading', { level: 2 }) ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="标题2"
          />
          <Button
            icon={<IconList />}
            size="small"
            type={editor.isActive('bulletList') ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="无序列表"
          />
          <Button
            icon={<IconOrderedList />}
            size="small"
            type={editor.isActive('orderedList') ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="有序列表"
          />
          <Button
            icon={<IconGridStroked />}
            size="small"
            type={editor.isActive('table') ? 'primary' : 'tertiary'}
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
            title="插入表格"
            disabled={editor.isActive('table')}
          />
          <Button
            icon={<IconCode />}
            size="small"
            type={editor.isActive('codeBlock') ? 'primary' : 'tertiary'}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="代码块"
          />
          <Button
            icon={<IconImage />}
            size="small"
            type="tertiary"
            onClick={() => {
              if (!currentFolder || !currentFile) {
                Toast.error('请先选择或创建一个文档')
                return
              }

              const input = document.createElement('input')
              input.type = 'file'
              input.accept = 'image/*'
              input.onchange = async (e) => {
                const target = e.target as HTMLInputElement
                const file = target.files?.[0]
                if (file) {
                  try {
                    Toast.info('正在上传图片...')
                    const url = await uploadImage(file, currentFolder, currentFile)
                    editor.chain().focus().setImage({ src: url }).run()
                    Toast.success('图片上传成功')
                  } catch (error) {
                    Toast.error(error instanceof Error ? error.message : '图片上传失败')
                  }
                }
              }
              input.click()
            }}
            title="插入图片"
          />
          <Button
            icon={<IconPlay />}
            size="small"
            type="tertiary"
            onClick={() => {
              // Get selected text from editor
              const { from, to } = editor.state.selection
              const selectedText = editor.state.doc.textBetween(from, to, ' ').trim()

              // Create a more sophisticated modal dialog with Semi Design theme styling
              const modalContent = document.createElement('div')
              modalContent.innerHTML = `
                <div class="iframe-edit-form">
                  <div class="iframe-edit-header">
                    <span>插入嵌入内容</span>
                  </div>
                  <div class="iframe-edit-body">
                    <div style="margin-bottom: 12px;">
                      <label style="display: block; font-size: 12px; font-weight: 500; color: var(--semi-color-text-1); margin-bottom: 8px;">嵌入地址:</label>
                      <input 
                        id="iframe-url-input" 
                        type="url" 
                        placeholder="输入嵌入地址 (如: https://www.youtube.com/)" 
                        value="${selectedText || ''}"
                        style="width: 100%; padding: 8px 12px; border: 1px solid var(--semi-color-border); border-radius: 4px; font-size: 14px; background: var(--semi-color-bg-0); color: var(--semi-color-text-0); margin-top: 4px;"
                      />
                    </div>
                    <div style="display: flex; gap: 12px;">
                      <div style="flex: 1;">
                        <label style="display: block; font-size: 12px; font-weight: 500; color: var(--semi-color-text-1); margin-bottom: 4px;">宽度:</label>
                        <select 
                          id="iframe-width-select"
                          style="width: 100%; padding: 8px 12px; border: 1px solid var(--semi-color-border); border-radius: 4px; font-size: 14px; background: var(--semi-color-bg-0); color: var(--semi-color-text-0); margin-top: 4px;"
                        >
                          <option value="25%">25%</option>
                          <option value="50%">50%</option>
                          <option value="75%">75%</option>
                          <option value="100%" selected>100%</option>
                        </select>
                      </div>
                      <div style="flex: 1;">
                        <label style="display: block; font-size: 12px; font-weight: 500; color: var(--semi-color-text-1); margin-bottom: 4px;">高度:</label>
                        <select 
                          id="iframe-height-select"
                          style="width: 100%; padding: 8px 12px; border: 1px solid var(--semi-color-border); border-radius: 4px; font-size: 14px; background: var(--semi-color-bg-0); color: var(--semi-color-text-0); margin-top: 4px;"
                        >
                          <option value="200px">小（200px）</option>
                          <option value="300px" selected>中（300px）</option>
                          <option value="500px">大（500px）</option>
                          <option value="700px">特大（700px）</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div class="iframe-edit-footer">
                    <div style="display: flex; gap: 8px;">
                      <button 
                        id="iframe-cancel-btn" 
                        style="padding: 8px 16px; border: 1px solid var(--semi-color-border); background: var(--semi-color-bg-0); color: var(--semi-color-text-1); border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.2s ease;"
                      >
                        取消
                      </button>
                      <button 
                        id="iframe-ok-btn" 
                        style="padding: 8px 16px; border: none; background: var(--semi-color-primary); color: var(--semi-color-white); border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.2s ease;"
                      >
                        确定
                      </button>
                    </div>
                  </div>
                </div>
              `

              // Create modal overlay with consistent styling
              const overlay = document.createElement('div')
              overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(4px);
                animation: fadeIn 0.2s ease;
              `

              const modal = document.createElement('div')
              modal.style.cssText = `
                background: var(--semi-color-bg-0);
                border: 1px solid var(--semi-color-border);
                border-radius: 8px;
                box-shadow: var(--semi-shadow-elevated);
                min-width: 480px;
                max-width: 600px;
                max-height: 80vh;
                overflow: hidden;
                animation: slideIn 0.2s ease-out;
              `

              // Add animation styles
              const style = document.createElement('style')
              style.textContent = `
                @keyframes fadeIn {
                  from { opacity: 0; }
                  to { opacity: 1; }
                }
                @keyframes slideIn {
                  from { 
                    opacity: 0; 
                    transform: translateY(-20px) scale(0.95); 
                  }
                  to { 
                    opacity: 1; 
                    transform: translateY(0) scale(1); 
                  }
                }
              `
              document.head.appendChild(style)

              modal.appendChild(modalContent)
              overlay.appendChild(modal)
              document.body.appendChild(overlay)

              const input = modal.querySelector('#iframe-url-input') as HTMLInputElement
              const widthSelect = modal.querySelector('#iframe-width-select') as HTMLSelectElement
              const heightSelect = modal.querySelector('#iframe-height-select') as HTMLSelectElement
              const okBtn = modal.querySelector('#iframe-ok-btn') as HTMLButtonElement
              const cancelBtn = modal.querySelector('#iframe-cancel-btn') as HTMLButtonElement

              // Add hover effects
              okBtn.addEventListener('mouseenter', () => {
                okBtn.style.background = 'var(--semi-color-primary-hover)'
                okBtn.style.transform = 'translateY(-1px)'
                okBtn.style.boxShadow = '0 2px 8px rgba(var(--semi-blue-5), 0.3)'
              })

              okBtn.addEventListener('mouseleave', () => {
                okBtn.style.background = 'var(--semi-color-primary)'
                okBtn.style.transform = 'translateY(0)'
                okBtn.style.boxShadow = 'none'
              })

              cancelBtn.addEventListener('mouseenter', () => {
                cancelBtn.style.background = 'var(--semi-color-fill-0)'
                cancelBtn.style.borderColor = 'var(--semi-color-primary-light-default)'
              })

              cancelBtn.addEventListener('mouseleave', () => {
                cancelBtn.style.background = 'var(--semi-color-bg-0)'
                cancelBtn.style.borderColor = 'var(--semi-color-border)'
              })

              // Focus the input and select text if pre-filled
              setTimeout(() => {
                input.focus()
                if (selectedText) {
                  input.select() // Select all text if there was selected content
                }
              }, 100)

              const cleanup = () => {
                document.body.removeChild(overlay)
                document.head.removeChild(style)
              }

              const handleOk = () => {
                const url = input.value.trim()

                if (url) {
                  const width = widthSelect.value
                  const height = heightSelect.value

                  editor
                    .chain()
                    .focus()
                    .setIframe({
                      src: url,
                      width: width,
                      height: height
                    })
                    .run()
                  Toast.success('嵌入内容插入成功')
                } else {
                  Toast.error('请输入有效的嵌入地址')
                  return
                }
                cleanup()
              }

              okBtn.addEventListener('click', handleOk)
              cancelBtn.addEventListener('click', cleanup)
              overlay.addEventListener('click', (e) => {
                if (e.target === overlay) cleanup()
              })

              // Handle Enter key
              input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleOk()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  cleanup()
                }
              })
            }}
            title="插入嵌入内容"
          />
        </Space>
      </div>
    </BubbleMenu>
  )
}
