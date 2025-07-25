import React, { useState, useRef } from 'react'
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import { FiCopy, FiCheck, FiMoreHorizontal } from 'react-icons/fi'
import { Dropdown } from '@douyinfe/semi-ui'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    codeBlockComponent: {
      setCodeBlockComponent: (options: { language: string }) => ReturnType
    }
  }
}

interface CodeBlockComponentProps {
  node: {
    attrs: {
      language: string
    }
  }
  updateAttributes: (attrs: { language: string }) => void
  extension: any
}

const CodeBlockComponent: React.FC<CodeBlockComponentProps> = (props) => {
  const { node, updateAttributes } = props
  const [copied, setCopied] = useState(false)
  const [showLanguageSelector, setShowLanguageSelector] = useState(false)
  const codeRef = useRef<HTMLDivElement>(null)
  
  const languages = [
    { name: 'javascript', label: 'JavaScript' },
    { name: 'typescript', label: 'TypeScript' },
    { name: 'python', label: 'Python' },
    { name: 'java', label: 'Java' },
    { name: 'cpp', label: 'C++' },
    { name: 'csharp', label: 'C#' },
    { name: 'go', label: 'Go' },
    { name: 'rust', label: 'Rust' },
    { name: 'php', label: 'PHP' },
    { name: 'css', label: 'CSS' },
    { name: 'html', label: 'HTML' },
    { name: 'json', label: 'JSON' },
    { name: 'sql', label: 'SQL' },
    { name: 'bash', label: 'Bash' },
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
        <div className="language-info">
          {getCurrentLanguageLabel()}
        </div>
        <div className="code-block-actions">
          <button
            className="code-block-button copy-button"
            onClick={copyToClipboard}
          >
            {copied ? <FiCheck size={16} /> : <FiCopy size={16} />}
            <span>{copied ? '已复制' : '复制'}</span>
          </button>
          <Dropdown
            visible={showLanguageSelector}
            onVisibleChange={setShowLanguageSelector}
            render={
              <Dropdown.Menu>
                {languages.map((lang) => (
                  <Dropdown.Item 
                    key={lang.name} 
                    onClick={() => updateAttributes({ language: lang.name })}
                  >
                    {lang.label}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            }
            trigger="click"
            position="bottomRight"
          >
            <button className="code-block-button language-button">
              <FiMoreHorizontal size={16} />
            </button>
          </Dropdown>
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