import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import { Typography } from '@douyinfe/semi-ui'
import { IconChevronDown, IconChevronRight } from '@douyinfe/semi-icons'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github.css'
import { processThinkingContent } from '../utils/filterThinking'

const { Text } = Typography

export interface MessageRendererProps {
  content: string
  className?: string
  style?: React.CSSProperties
}

const MessageRenderer: React.FC<MessageRendererProps> = ({ content, className, style }) => {
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false)
  const { hasThinking, displayText, thinkingContent } = processThinkingContent(content)

  const renderMarkdown = (text: string, customStyle?: React.CSSProperties) => (
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[rehypeKatex, rehypeHighlight]}
      components={{
        // 自定义代码块样式 - 支持主题适配
        code({ node, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '')
          const isInline =
            !node?.position?.start || node.position.start.line === node.position.end?.line
          return !isInline && match ? (
            <pre
              style={{
                backgroundColor: 'var(--semi-color-fill-0)',
                color: 'var(--semi-color-text-0)',
                border: '1px solid var(--semi-color-border)',
                padding: '12px',
                borderRadius: '8px',
                overflow: 'auto',
                fontSize: '14px',
                margin: '12px 0',
                fontFamily:
                  '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                ...customStyle
              }}
            >
              <code className={className} {...props}>
                {children}
              </code>
            </pre>
          ) : (
            <code
              style={{
                backgroundColor: 'var(--semi-color-fill-1)',
                color: 'var(--semi-color-text-0)',
                border: '1px solid var(--semi-color-border)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.9em',
                fontFamily:
                  '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                ...customStyle
              }}
              className={className}
              {...props}
            >
              {children}
            </code>
          )
        },
        // 自定义表格样式 - 主题适配
        table({ children }) {
          return (
            <div style={{ overflow: 'auto', margin: '12px 0' }}>
              <table
                style={{
                  borderCollapse: 'collapse',
                  width: '100%',
                  border: '1px solid var(--semi-color-border)'
                }}
              >
                {children}
              </table>
            </div>
          )
        },
        th({ children }) {
          return (
            <th
              style={{
                padding: '8px 12px',
                backgroundColor: 'var(--semi-color-fill-0)',
                border: '1px solid var(--semi-color-border)',
                fontWeight: 'bold',
                textAlign: 'left',
                color: 'var(--semi-color-text-0)'
              }}
            >
              {children}
            </th>
          )
        },
        td({ children }) {
          return (
            <td
              style={{
                padding: '8px 12px',
                border: '1px solid var(--semi-color-border)',
                color: 'var(--semi-color-text-0)'
              }}
            >
              {children}
            </td>
          )
        },
        // 自定义引用块样式 - 主题适配
        blockquote({ children }) {
          return (
            <blockquote
              style={{
                borderLeft: '4px solid var(--semi-color-primary)',
                paddingLeft: '16px',
                margin: '12px 0',
                color: 'var(--semi-color-text-1)',
                fontStyle: 'italic',
                backgroundColor: 'var(--semi-color-fill-0)',
                padding: '12px 16px',
                borderRadius: '6px'
              }}
            >
              {children}
            </blockquote>
          )
        },
        // 自定义链接样式 - 主题适配
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--semi-color-primary)',
                textDecoration: 'none',
                borderBottom: '1px solid transparent',
                transition: 'border-color 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderBottomColor = 'var(--semi-color-primary)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderBottomColor = 'transparent'
              }}
            >
              {children}
            </a>
          )
        },
        // 自定义标题样式 - 主题适配
        h1({ children }) {
          return (
            <h1
              style={{
                fontSize: '2em',
                fontWeight: 'bold',
                margin: '16px 0 12px 0',
                borderBottom: '2px solid var(--semi-color-border)',
                paddingBottom: '8px',
                color: 'var(--semi-color-text-0)'
              }}
            >
              {children}
            </h1>
          )
        },
        h2({ children }) {
          return (
            <h2
              style={{
                fontSize: '1.5em',
                fontWeight: 'bold',
                margin: '16px 0 12px 0',
                borderBottom: '1px solid var(--semi-color-border)',
                paddingBottom: '6px',
                color: 'var(--semi-color-text-0)'
              }}
            >
              {children}
            </h2>
          )
        },
        h3({ children }) {
          return (
            <h3
              style={{
                fontSize: '1.25em',
                fontWeight: 'bold',
                margin: '16px 0 8px 0',
                color: 'var(--semi-color-text-0)'
              }}
            >
              {children}
            </h3>
          )
        },
        // 自定义列表样式 - 主题适配
        ul({ children }) {
          return (
            <ul
              style={{
                paddingLeft: '20px',
                margin: '8px 0',
                color: 'var(--semi-color-text-0)'
              }}
            >
              {children}
            </ul>
          )
        },
        ol({ children }) {
          return (
            <ol
              style={{
                paddingLeft: '20px',
                margin: '8px 0',
                color: 'var(--semi-color-text-0)'
              }}
            >
              {children}
            </ol>
          )
        },
        li({ children }) {
          return (
            <li
              style={{
                margin: '4px 0',
                lineHeight: '1.5'
              }}
            >
              {children}
            </li>
          )
        },
        // 自定义段落样式 - 主题适配
        p({ children }) {
          return (
            <p
              style={{
                margin: '8px 0',
                lineHeight: '1.6',
                color: 'var(--semi-color-text-0)'
              }}
            >
              {children}
            </p>
          )
        }
      }}
    >
      {text}
    </ReactMarkdown>
  )

  return (
    <div
      className={className}
      style={{
        wordBreak: 'break-word',
        overflow: 'hidden',
        maxWidth: '100%',
        lineHeight: '1.6',
        ...style
      }}
    >
      {hasThinking && thinkingContent && (
        <div style={{ marginBottom: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              padding: '8px 12px',
              backgroundColor: 'var(--semi-color-fill-0)',
              border: '1px solid var(--semi-color-border)',
              borderRadius: '8px',
              transition: 'all 0.2s'
            }}
            onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
          >
            {isThinkingExpanded ? (
              <IconChevronDown style={{ color: 'var(--semi-color-text-2)' }} />
            ) : (
              <IconChevronRight style={{ color: 'var(--semi-color-text-2)' }} />
            )}
            <Text type="tertiary" size="small" style={{ fontSize: '13px', fontWeight: '500' }}>
              💭 思维过程
            </Text>
          </div>

          {isThinkingExpanded && (
            <div
              style={{
                marginTop: '8px',
                padding: '12px',
                backgroundColor: 'var(--semi-color-fill-0)',
                border: '1px solid var(--semi-color-border)',
                borderRadius: '8px',
                borderTop: 'none',
                borderTopLeftRadius: '0',
                borderTopRightRadius: '0'
              }}
            >
              {renderMarkdown(thinkingContent, {
                fontSize: '13px',
                color: 'var(--semi-color-text-1)'
              })}
            </div>
          )}
        </div>
      )}

      {displayText && renderMarkdown(displayText)}
    </div>
  )
}

export default MessageRenderer
