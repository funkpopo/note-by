import React, { useRef, useState, useEffect } from 'react'
import { Select, Button } from '@douyinfe/semi-ui'
import './TranslateSubMenu.css'
import { detectLanguage } from '../utils/languageDetection'

// 可用的语言选项
const languageOptions = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: '英文' },
  { value: 'ja', label: '日语' },
  { value: 'fr', label: '法语' }
]

interface TranslateSubMenuProps {
  visible: boolean
  position?: { x: number; y: number }
  textToTranslate?: string // 添加待翻译的文本属性
  onConfirm: (sourceLanguage: string, targetLanguage: string) => void
  onClose: () => void
}

const TranslateSubMenu: React.FC<TranslateSubMenuProps> = ({
  visible,
  position,
  textToTranslate = '', // 默认为空字符串
  onConfirm,
  onClose
}) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  // 语言选择状态
  const [sourceLanguage, setSourceLanguage] = useState('en')
  const [targetLanguage, setTargetLanguage] = useState('zh')
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null)

  // 初始位置设置
  useEffect(() => {
    if (position) {
      setMenuPosition(position)
    }
  }, [position])

  // 语言检测
  useEffect(() => {
    if (textToTranslate && textToTranslate.trim().length > 0) {
      // 检测源语言
      const detected = detectLanguage(textToTranslate)
      setDetectedLanguage(detected)

      // 自动设置检测到的语言为源语言
      setSourceLanguage(detected)

      // 如果目标语言与检测到的源语言相同，则自动选择一个不同的目标语言
      if (detected === targetLanguage) {
        // 默认目标语言设置为中文，如果源语言是中文则设置为英文
        const newTargetLang = detected === 'zh' ? 'en' : 'zh'
        setTargetLanguage(newTargetLang)
      }
    }
  }, [textToTranslate, visible])

  // 拖拽开始
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>): void => {
    e.preventDefault()
    setIsDragging(true)
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }

  // 拖拽过程
  const handleDrag = (e: MouseEvent): void => {
    if (isDragging) {
      setMenuPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      })
    }
  }

  // 拖拽结束
  const handleDragEnd = (): void => {
    setIsDragging(false)
  }

  // 添加和移除拖拽事件监听器
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag)
      document.addEventListener('mouseup', handleDragEnd)
    }

    return (): void => {
      document.removeEventListener('mousemove', handleDrag)
      document.removeEventListener('mouseup', handleDragEnd)
    }
  }, [isDragging])

  // 处理翻译确认
  const handleConfirmTranslation = (): void => {
    onConfirm(sourceLanguage, targetLanguage)
  }

  // 防止语言互换时选择相同语言
  useEffect(() => {
    if (sourceLanguage === targetLanguage) {
      // 如果源语言和目标语言相同，则将目标语言设置为不同的语言
      const differentLanguage = languageOptions.find((option) => option.value !== sourceLanguage)
      if (differentLanguage) {
        setTargetLanguage(differentLanguage.value)
      }
    }
  }, [sourceLanguage, targetLanguage])

  if (!visible) return null

  // 获取语言选项的显示标签
  const getLanguageOptionLabel = (value: string): string => {
    const option = languageOptions.find((opt) => opt.value === value)
    return option ? option.label : value
  }

  return (
    <div
      ref={menuRef}
      className={`translate-submenu ${isDragging ? 'dragging' : ''}`}
      style={{
        position: 'fixed',
        left: `${menuPosition.x}px`,
        top: `${menuPosition.y}px`,
        zIndex: 1001
      }}
    >
      <div className="translate-submenu-header" onMouseDown={handleDragStart}>
        <span>选择翻译语言</span>
        <span className="translate-submenu-close" onClick={onClose}>
          ×
        </span>
      </div>

      <div className="translate-submenu-content">
        <div className="language-selectors">
          <div className="language-selector">
            <label>
              原语言:
              {detectedLanguage && (
                <span className="detected-language-tag">
                  (已检测为{getLanguageOptionLabel(detectedLanguage)})
                </span>
              )}
            </label>
            <Select
              value={sourceLanguage}
              onChange={(value) => {
                if (typeof value === 'string') {
                  setSourceLanguage(value)
                }
              }}
              optionList={languageOptions}
              style={{ width: '100%' }}
            />
          </div>

          <div className="language-selector">
            <label>目标语言:</label>
            <Select
              value={targetLanguage}
              onChange={(value) => {
                if (typeof value === 'string') {
                  setTargetLanguage(value)
                }
              }}
              optionList={languageOptions}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div className="translate-actions">
          <Button type="primary" onClick={handleConfirmTranslation} block>
            开始翻译
          </Button>
        </div>
      </div>
    </div>
  )
}

export default TranslateSubMenu
