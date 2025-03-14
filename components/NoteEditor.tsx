'use client';

import { useState, useEffect } from 'react';
import { MdEditor } from 'md-editor-rt';
import 'md-editor-rt/lib/style.css';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

// 添加自定义样式，增大编辑器图标尺寸并调整高度
const customStyle = `
.md-editor-toolbar {
  padding: 8px !important;
  height: auto !important;
}
.md-editor-toolbar-item {
  font-size: 1.25rem !important;
  padding: 0.2rem !important;
  margin: 0 1px !important;
}
.md-editor-toolbar-item svg {
  width: 1.4rem !important;
  height: 1.4rem !important;
}
.md-editor-toolbar-divider {
  height: 1.8rem !important;
  margin: 0 6px !important;
}
.md-editor {
  --md-bk-color: var(--background) !important;
  --md-color: var(--foreground) !important;
  --md-border-color: var(--border) !important;
  height: 100% !important;
  border: none !important;
  display: flex !important;
  flex-direction: column !important;
}
.md-editor-dark {
  --md-bk-color: var(--background) !important;
  --md-color: var(--foreground) !important;
  --md-border-color: var(--border) !important;
}
.md-editor-content {
  height: calc(100% - 60px) !important;
  flex: 1 !important;
  overflow: hidden !important;
}
.md-editor-input {
  height: 100% !important;
  min-height: 100% !important;
  font-size: 1.05rem !important;
  overflow: auto !important;
}
.md-editor-preview {
  height: 100% !important;
  min-height: 100% !important;
  font-size: 1.05rem !important;
  overflow: auto !important;
}
.md-preview-wrapper {
  height: 100% !important;
  overflow-y: auto !important;
  padding: 0 1rem !important;
}
.md-editor-footer {
  padding: 6px 12px !important;
  font-size: 0.9rem !important;
  display: flex !important;
  align-items: center !important;
  border-top: 1px solid var(--border) !important;
  background-color: var(--background) !important;
  color: var(--muted-foreground) !important;
  height: 36px !important;
  flex-shrink: 0 !important;
  opacity: 1 !important;
  visibility: visible !important;
}
`;

interface NoteEditorProps {
  id: string;
  initialTitle: string;
  initialContent: string;
  onSave: (id: string, title: string, content: string) => void;
  onCancel: () => void;
}

export default function NoteEditor({
  id,
  initialTitle,
  initialContent,
  onSave,
  onCancel
}: NoteEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [editorId] = useState(`editor-${id}`);
  const [editorMode] = useState<'editable' | 'preview'>('editable');
  
  // 检测是否在暗黑模式下
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  useEffect(() => {
    // 检查当前主题
    const isDarkMode = document.documentElement.classList.contains('dark');
    setTheme(isDarkMode ? 'dark' : 'light');
    
    // 监听主题变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class'
        ) {
          const isDark = document.documentElement.classList.contains('dark');
          setTheme(isDark ? 'dark' : 'light');
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    
    // 添加自定义样式
    const styleElement = document.createElement('style');
    styleElement.textContent = customStyle;
    document.head.appendChild(styleElement);
    
    // 添加快捷键支持
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S 或 Command+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave(id, title, content);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      observer.disconnect();
      // 移除自定义样式
      document.head.removeChild(styleElement);
      // 移除事件监听
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [id, title, content, onSave]);
  
  const handleSave = () => {
    onSave(id, title, content);
  };
  
  return (
    <div className="w-full h-screen flex flex-col">
      <div className="flex items-center p-4 border-b">
        <Button variant="ghost" onClick={onCancel} size="icon" className="mr-3 shrink-0">
          <ArrowLeft size={18} />
        </Button>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-xl font-bold bg-transparent border-b border-border px-2 py-1 focus:outline-none focus:border-primary flex-1"
          placeholder="笔记标题"
        />
        <ThemeToggle className="mr-2" />
        <Button onClick={handleSave} className="gap-2 ml-2 shrink-0">
          <Save size={16} />
          保存
        </Button>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <MdEditor
          modelValue={content}
          onChange={setContent}
          id={editorId}
          theme={theme}
          previewTheme="github"
          language="zh-CN"
          toolbarsExclude={["save", "github"]}
          codeStyleReverse={true}
          noMermaid={false}
          noKatex={false}
          noPrettier={false}
          tabWidth={2}
          showCodeRowNumber={true}
          style={{ height: '100%' }}
          footers={['markdownTotal']}
          scrollAuto={false}
          preview={editorMode === 'preview'}
        />
      </div>
    </div>
  );
} 