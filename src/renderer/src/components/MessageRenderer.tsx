import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github.css'

interface MessageRendererProps {
  content: string
  className?: string
  style?: React.CSSProperties
}

const MessageRenderer: React.FC<MessageRendererProps> = ({ content, className, style }) => {
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
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          // 自定义代码块样式
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            return !inline && match ? (
              <pre
                style={{
                  backgroundColor: '#f6f8fa',
                  padding: '12px',
                  borderRadius: '6px',
                  overflow: 'auto',
                  fontSize: '14px',
                  margin: '12px 0'
                }}
              >
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code
                style={{
                  backgroundColor: '#f6f8fa',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  fontSize: '0.9em'
                }}
                className={className}
                {...props}
              >
                {children}
              </code>
            )
          },
          // 自定义表格样式
          table({ children }) {
            return (
              <div style={{ overflow: 'auto', margin: '12px 0' }}>
                <table
                  style={{
                    borderCollapse: 'collapse',
                    width: '100%',
                    border: '1px solid #d0d7de'
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
                  backgroundColor: '#f6f8fa',
                  border: '1px solid #d0d7de',
                  fontWeight: 'bold',
                  textAlign: 'left'
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
                  border: '1px solid #d0d7de'
                }}
              >
                {children}
              </td>
            )
          },
          // 自定义引用块样式
          blockquote({ children }) {
            return (
              <blockquote
                style={{
                  borderLeft: '4px solid #0969da',
                  paddingLeft: '16px',
                  margin: '12px 0',
                  color: '#656d76',
                  fontStyle: 'italic'
                }}
              >
                {children}
              </blockquote>
            )
          },
          // 自定义链接样式
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#0969da',
                  textDecoration: 'none'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.textDecoration = 'underline'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.textDecoration = 'none'
                }}
              >
                {children}
              </a>
            )
          },
          // 自定义标题样式
          h1({ children }) {
            return (
              <h1
                style={{
                  fontSize: '2em',
                  fontWeight: 'bold',
                  margin: '16px 0 12px 0',
                  borderBottom: '1px solid #d0d7de',
                  paddingBottom: '8px'
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
                  borderBottom: '1px solid #d0d7de',
                  paddingBottom: '6px'
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
                  margin: '16px 0 8px 0'
                }}
              >
                {children}
              </h3>
            )
          },
          // 自定义列表样式
          ul({ children }) {
            return (
              <ul
                style={{
                  paddingLeft: '20px',
                  margin: '8px 0'
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
                  margin: '8px 0'
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
          // 自定义段落样式
          p({ children }) {
            return (
              <p
                style={{
                  margin: '8px 0',
                  lineHeight: '1.6'
                }}
              >
                {children}
              </p>
            )
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default MessageRenderer