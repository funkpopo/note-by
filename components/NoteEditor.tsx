'use client';

import { useState, useEffect } from 'react';
import { MdEditor } from 'md-editor-rt';
import 'md-editor-rt/lib/style.css';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Menu } from 'lucide-react';

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
  onMenuClick?: () => void;
  folders?: string[];
  currentFolder?: string;
  onFolderChange?: (folder: string) => void;
  onCreateFolder?: (folderPath: string) => Promise<boolean>;
}

export default function NoteEditor({
  id,
  initialTitle,
  initialContent,
  onSave,
  onCancel,
  onMenuClick,
  folders = [],
  currentFolder = '',
  onFolderChange,
  onCreateFolder
}: NoteEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [editorId] = useState(`editor-${id}`);
  const [editorMode] = useState<'editable' | 'preview'>('editable');
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newSubfolderParent, setNewSubfolderParent] = useState('');
  
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

  // 处理创建新文件夹
  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !onCreateFolder) return;
    
    // 构建完整的文件夹路径
    const folderPath = newSubfolderParent 
      ? `${newSubfolderParent}/${newFolderName.trim()}`
      : newFolderName.trim();
    
    const success = await onCreateFolder(folderPath);
    
    if (success) {
      // 选择新创建的文件夹
      if (onFolderChange) {
        onFolderChange(folderPath);
      }
      
      // 重置状态
      setNewFolderName('');
      setNewSubfolderParent('');
      setShowNewFolderInput(false);
    }
  };
  
  // 获取文件夹显示名称
  const getFolderDisplayName = (folder: string) => {
    if (!folder) return '默认位置';
    const parts = folder.split('/');
    return parts[parts.length - 1];
  };
  
  return (
    <div className="w-full h-screen flex flex-col">
      <div className="flex items-center p-4 border-b">
        {onMenuClick && (
          <Button variant="ghost" onClick={onMenuClick} size="icon" className="mr-3 shrink-0">
            <Menu size={18} />
          </Button>
        )}
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
        
        {onFolderChange && (
          <div className="relative mx-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setShowFolderSelector(!showFolderSelector);
                setShowNewFolderInput(false);
              }}
              className="text-sm"
            >
              {currentFolder ? getFolderDisplayName(currentFolder) : '默认位置'}
            </Button>
            
            {showFolderSelector && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-card border rounded-md shadow-md z-10 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded-md scrollbar-track-transparent scrollbar-thumb-muted hover:scrollbar-thumb-primary/50 transition-colors">
                <div className="py-1">
                  <button
                    className={`w-full text-left px-3 py-2 text-sm ${
                      currentFolder === '' ? 'bg-primary/10' : 'hover:bg-accent/50'
                    }`}
                    onClick={() => {
                      onFolderChange('');
                      setShowFolderSelector(false);
                    }}
                  >
                    默认位置
                  </button>
                  
                  {folders.map(folder => (
                    <button
                      key={folder}
                      className={`w-full text-left px-3 py-2 text-sm truncate ${
                        currentFolder === folder ? 'bg-primary/10' : 'hover:bg-accent/50'
                      }`}
                      onClick={() => {
                        onFolderChange(folder);
                        setShowFolderSelector(false);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setNewSubfolderParent(folder);
                        setShowNewFolderInput(true);
                      }}
                    >
                      {/* 显示文件夹层次结构 */}
                      {folder.split('/').map((part, index, array) => (
                        <span key={index}>
                          {index > 0 && <span className="text-muted-foreground mx-1">/</span>}
                          <span className={index === array.length - 1 ? 'font-medium' : ''}>{part}</span>
                        </span>
                      ))}
                    </button>
                  ))}
                  
                  <div className="border-t my-1"></div>
                  
                  <button
                    className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-accent/50"
                    onClick={() => {
                      setShowNewFolderInput(true);
                      setNewSubfolderParent('');
                    }}
                  >
                    + 新建文件夹
                  </button>
                  
                  {showNewFolderInput && (
                    <div className="p-3 border-t">
                      {newSubfolderParent && (
                        <div className="text-xs text-muted-foreground mb-2">
                          在 <span className="font-medium">{newSubfolderParent}</span> 中创建子文件夹
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          placeholder="文件夹名称"
                          className="flex-1 px-2 py-1 text-sm border rounded"
                          autoFocus
                        />
                        <Button 
                          size="sm" 
                          className="h-7 text-xs"
                          onClick={handleCreateFolder}
                        >
                          创建
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
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