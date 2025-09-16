import React, { useState } from 'react'
import { Button, Dropdown } from '@douyinfe/semi-ui'
import { IconChevronDown } from '@douyinfe/semi-icons'
import { Editor } from '@tiptap/react'
import './HighlightColorPicker.css'

export interface HighlightColorPickerProps {
  editor: Editor
  isActive?: boolean
}

const HighlightColorPicker: React.FC<HighlightColorPickerProps> = ({ editor, isActive }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [customColor, setCustomColor] = useState('#d4f2d4')

  const presetColors = [
    '#ffeb3b', // 黄色
    '#4caf50', // 绿色
    '#2196f3', // 蓝色
    '#ff9800', // 橙色
    '#f44336', // 红色
    '#9c27b0' // 紫色
  ]

  const handlePresetColorClick = (color: string) => {
    editor.chain().focus().setHighlight({ color }).run()
    // Set CSS custom property for dynamic styling
    document.documentElement.style.setProperty('--highlight-color', color)
    setIsOpen(false)
  }

  const handleColorSelect = (isClear?: boolean) => {
    if (isClear) {
      editor.chain().focus().unsetHighlight().run()
      // Remove CSS custom property
      document.documentElement.style.removeProperty('--highlight-color')
    }
    setIsOpen(false)
  }

  const handleCustomColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const color = event.target.value
    setCustomColor(color)
    editor.chain().focus().setHighlight({ color }).run()
    // Set CSS custom property for dynamic styling
    document.documentElement.style.setProperty('--highlight-color', color)
  }

  const handleCustomColorClick = () => {
    editor.chain().focus().setHighlight({ color: customColor }).run()
    // Set CSS custom property for dynamic styling
    document.documentElement.style.setProperty('--highlight-color', customColor)
    setIsOpen(false)
  }

  const colorMenu = (
    <div className="highlight-color-picker">
      <div className="custom-color-section">
        <div className="custom-color-label">选择高亮颜色</div>
        <div className="custom-color-input" onClick={handleCustomColorClick}>
          <input
            type="color"
            value={customColor}
            onChange={handleCustomColorChange}
            className="color-input"
          />
          <span className="custom-color-value">{customColor}</span>
        </div>

        <div className="preset-colors">
          {presetColors.map((color, index) => (
            <button
              key={index}
              className="preset-color-button"
              style={{ backgroundColor: color }}
              onClick={() => handlePresetColorClick(color)}
              title={color}
            />
          ))}
        </div>
      </div>

      <div className="clear-highlight-section">
        <div className="clear-highlight-button" onClick={() => handleColorSelect(true)}>
          <span>清除高亮</span>
        </div>
      </div>
    </div>
  )

  return (
    <Dropdown
      trigger="click"
      position="bottomLeft"
      content={colorMenu}
      visible={isOpen}
      onVisibleChange={setIsOpen}
      spacing={4}
    >
      <Button
        size="small"
        type={isActive ? 'primary' : 'tertiary'}
        icon={<span>H</span>}
        iconPosition="left"
        style={{
          minWidth: '32px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
        title="高亮颜色"
      >
        <IconChevronDown size="extra-small" />
      </Button>
    </Dropdown>
  )
}

export default HighlightColorPicker
