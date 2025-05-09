import { createReactInlineContentSpec } from '@blocknote/react'

/**
 * 自定义标签组件，使用@符号触发
 * 允许在笔记中插入标签，便于后续构建知识图谱
 */
export const Tag = createReactInlineContentSpec(
  {
    type: 'tag',
    propSchema: {
      name: {
        default: ''
      }
    },
    content: 'none'
  } as const,
  {
    render: (props) => {
      const { inlineContent } = props
      const tagName = inlineContent.props.name

      return (
        <span
          className="bn-tag"
          data-tag={tagName}
          contentEditable={false}
          style={{
            backgroundColor: 'var(--semi-color-primary-light-default)',
            color: 'var(--semi-color-primary)',
            borderRadius: '4px',
            padding: '0 6px',
            margin: '0 2px',
            fontWeight: 'bold',
            userSelect: 'none',
            cursor: 'pointer'
          }}
        >
          @{tagName}
        </span>
      )
    }
  }
)

export default Tag
