import React, { useState, useRef } from 'react'
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import { FiCopy, FiCheck } from 'react-icons/fi'
import { Dropdown } from '@douyinfe/semi-ui'
import { IconChevronDown } from '@douyinfe/semi-icons'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    codeBlockComponent: {
      setCodeBlockComponent: (options: { language: string }) => ReturnType
    }
  }
}

import { Node as ProseMirrorNode } from '@tiptap/pm/model'

interface CodeBlockComponentProps {
  node: ProseMirrorNode & {
    attrs: {
      language: string
    }
  }
  updateAttributes: (attributes: Record<string, any>) => void
  extension: any
}

const CodeBlockComponent: React.FC<CodeBlockComponentProps> = (props) => {
  const { node, updateAttributes } = props
  const [copied, setCopied] = useState(false)
  const [showLanguageSelector, setShowLanguageSelector] = useState(false)
  const codeRef = useRef<HTMLDivElement>(null)
  
  const languages = [
    { name: 'plaintext', label: '纯文本' },
    // 前端技术
    { name: 'javascript', label: 'JavaScript' },
    { name: 'typescript', label: 'TypeScript' },
    { name: 'jsx', label: 'JSX' },
    { name: 'tsx', label: 'TSX' },
    { name: 'html', label: 'HTML' },
    { name: 'css', label: 'CSS' },
    { name: 'scss', label: 'SCSS' },
    { name: 'sass', label: 'Sass' },
    { name: 'less', label: 'Less' },
    // 后端语言
    { name: 'python', label: 'Python' },
    { name: 'java', label: 'Java' },
    { name: 'cpp', label: 'C++' },
    { name: 'c', label: 'C' },
    { name: 'csharp', label: 'C#' },
    { name: 'go', label: 'Go' },
    { name: 'rust', label: 'Rust' },
    { name: 'php', label: 'PHP' },
    { name: 'ruby', label: 'Ruby' },
    { name: 'swift', label: 'Swift' },
    { name: 'kotlin', label: 'Kotlin' },
    { name: 'scala', label: 'Scala' },
    { name: 'dart', label: 'Dart' },
    { name: 'lua', label: 'Lua' },
    { name: 'r', label: 'R' },
    { name: 'matlab', label: 'MATLAB' },
    { name: 'perl', label: 'Perl' },
    { name: 'groovy', label: 'Groovy' },
    // 数据格式
    { name: 'json', label: 'JSON' },
    { name: 'xml', label: 'XML' },
    { name: 'yaml', label: 'YAML' },
    { name: 'toml', label: 'TOML' },
    { name: 'ini', label: 'INI/Config' },
    { name: 'csv', label: 'CSV' },
    // Shell 脚本
    { name: 'bash', label: 'Bash' },
    { name: 'sh', label: 'Shell' },
    { name: 'zsh', label: 'Zsh' },
    { name: 'powershell', label: 'PowerShell' },
    // 数据库
    { name: 'sql', label: 'SQL' },
    { name: 'mysql', label: 'MySQL' },
    { name: 'postgresql', label: 'PostgreSQL' },
    // 其他
    { name: 'markdown', label: 'Markdown' },
    { name: 'docker', label: 'Dockerfile' },
    { name: 'vim', label: 'Vim Script' },
    { name: 'gradle', label: 'Gradle' },
  ]
  
  const copyToClipboard = () => {
    if (codeRef.current) {
      const text = codeRef.current.textContent || ''
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }
  
  // Get the display name for the current language
  const getCurrentLanguageLabel = () => {
    const lang = languages.find(l => l.name === node.attrs.language)
    return lang ? lang.label : node.attrs.language
  }
  
  return (
    <NodeViewWrapper className="code-block-component">
      <div className="code-block-header">
        <Dropdown
          visible={showLanguageSelector}
          onVisibleChange={setShowLanguageSelector}
          render={
            <Dropdown.Menu style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {languages.map((lang) => (
                <Dropdown.Item 
                  key={lang.name} 
                  onClick={() => {
                    updateAttributes({ language: lang.name })
                    setShowLanguageSelector(false)
                  }}
                  active={lang.name === node.attrs.language}
                >
                  {lang.label}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          }
          trigger="click"
          position="bottomLeft"
        >
          <button className="language-selector-button">
            <span className="language-label">{getCurrentLanguageLabel()}</span>
            <IconChevronDown size="small" />
          </button>
        </Dropdown>
        <div className="code-block-actions">
          <button
            className={`code-block-button copy-button ${copied ? 'copied' : ''}`}
            onClick={copyToClipboard}
          >
            {copied ? <FiCheck size={16} /> : <FiCopy size={16} />}
            <span>{copied ? '已复制' : '复制'}</span>
          </button>
        </div>
      </div>
      <pre>
        <code ref={codeRef} className={`language-${node.attrs.language}`}>
          <NodeViewContent />
        </code>
      </pre>
    </NodeViewWrapper>
  )
}

export default CodeBlockComponent