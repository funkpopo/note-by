'use client';

import { useState, useEffect, useRef } from 'react';
import { MdEditor } from 'md-editor-rt';
import 'md-editor-rt/lib/style.css';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Menu, Sparkles, X } from 'lucide-react';
import AIContextMenu from './AIContextMenu';

// 添加自定义样式，增大编辑器图标尺寸并调整高度
const customStyle = `
.md-editor-toolbar {
  padding: 8px !important;
  height: auto !important;
  overflow-x: auto !important;
  white-space: nowrap !important;
  scrollbar-width: thin !important;
  -ms-overflow-style: none !important;
  display: flex !important;
  flex-wrap: nowrap !important;
  min-height: 52px !important;
  scroll-behavior: smooth !important;
}
.md-editor-toolbar::-webkit-scrollbar {
  height: 3px !important;
  width: auto !important;
}
.md-editor-toolbar::-webkit-scrollbar-track {
  background-color: transparent !important;
  border-radius: 10px !important;
  margin: 0 10px !important;
}
.md-editor-toolbar::-webkit-scrollbar-thumb {
  background-color: var(--muted-foreground) !important;
  border-radius: 10px !important;
  opacity: 0.4 !important;
  transition: all 0.2s ease !important;
}
.md-editor-toolbar::-webkit-scrollbar-thumb:hover {
  background-color: var(--accent-foreground) !important;
}
.light .md-editor-toolbar::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2) !important;
}
.light .md-editor-toolbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.4) !important;
}
.dark .md-editor-toolbar::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2) !important;
}
.dark .md-editor-toolbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.4) !important;
}
.md-editor-toolbar > ul {
  display: flex !important;
  flex-wrap: nowrap !important;
  padding-bottom: 2px !important;
}
.md-editor-toolbar-item {
  font-size: 1.25rem !important;
  padding: 0.2rem !important;
  margin: 0 1px !important;
  flex-shrink: 0 !important;
}
.md-editor-toolbar-item svg {
  width: 1.4rem !important;
  height: 1.4rem !important;
}
.md-editor-toolbar-divider {
  height: 1.8rem !important;
  margin: 0 6px !important;
}

/* AI助手按钮样式 */
.ai-assistant-btn {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  width: 38px !important;
  height: 38px !important;
  font-size: 1.25rem !important;
  border-radius: 6px !important;
  margin: 0 2px !important;
  color: var(--foreground) !important;
  transition: background-color 0.2s ease-in-out !important;
}
.ai-assistant-btn:hover {
  background-color: var(--accent) !important;
  color: var(--accent-foreground) !important;
}
.ai-assistant-btn svg {
  width: 1.4rem !important;
  height: 1.4rem !important;
}

/* AI对话框样式 */
.ai-modal-backdrop {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  background-color: rgba(0, 0, 0, 0.5) !important;
  z-index: 100 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
.ai-modal {
  width: 90% !important;
  max-width: 500px !important;
  background-color: var(--background) !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15) !important;
  padding: 1.5rem !important;
  max-height: 90vh !important;
  display: flex !important;
  flex-direction: column !important;
}
.ai-modal-header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  margin-bottom: 1rem !important;
}
.ai-modal-title {
  font-size: 1.25rem !important;
  font-weight: 600 !important;
  display: flex !important;
  align-items: center !important;
  gap: 0.5rem !important;
}
.ai-modal-close {
  cursor: pointer !important;
  opacity: 0.6 !important;
  transition: opacity 0.2s ease !important;
  padding: 0.5rem !important;
}
.ai-modal-close:hover {
  opacity: 1 !important;
}
.ai-modal-body {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 1rem !important;
  overflow-y: auto !important;
}
.ai-modal-footer {
  display: flex !important;
  justify-content: flex-end !important;
  gap: 0.5rem !important;
  margin-top: 1.5rem !important;
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
  onMove?: (id: string, newFolder: string) => Promise<void>;
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
  onCreateFolder,
  onMove
}: NoteEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [editorId] = useState(`editor-${id}`);
  const [editorMode] = useState<'editable' | 'preview'>('editable');
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newSubfolderParent, setNewSubfolderParent] = useState('');
  
  // AI右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    selectedText: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    selectedText: ''
  });
  
  // AI助手对话框状态
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  
  // 检测是否在暗黑模式下
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // 编辑器容器引用
  const editorContainerRef = useRef<HTMLDivElement>(null);
  
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
    
    // 强制应用滚动条样式（解决优先级问题）
    const applyScrollbarStyles = () => {
      const toolbars = document.querySelectorAll('.md-editor-toolbar');
      if (toolbars.length > 0) {
        toolbars.forEach(toolbar => {
          // 直接设置样式到元素上
          const toolbarEl = toolbar as HTMLElement;
          toolbarEl.style.overflowX = 'auto';
          toolbarEl.style.whiteSpace = 'nowrap';
          toolbarEl.style.scrollBehavior = 'smooth';
          toolbarEl.style.display = 'flex';
          toolbarEl.style.flexWrap = 'nowrap';
          
          // 移除旧样式（如果存在）
          const oldStyle = document.querySelector(`style[data-for="${editorId}-scrollbar"]`);
          if (oldStyle) {
            document.head.removeChild(oldStyle);
          }
          
          // 创建特定样式表解决滚动条样式问题
          const scrollbarStyle = document.createElement('style');
          scrollbarStyle.setAttribute('data-for', `${editorId}-scrollbar`);
          const isDark = document.documentElement.classList.contains('dark');
          scrollbarStyle.textContent = `
            /* 确保更高的CSS优先级 */
            html body #${editorId} .md-editor-toolbar::-webkit-scrollbar {
              height: 4px !important;
              width: auto !important;
            }
            
            html body #${editorId} .md-editor-toolbar::-webkit-scrollbar-track {
              background-color: transparent !important;
              border-radius: 10px !important;
              margin: 0 10px !important;
            }
            
            html body #${editorId} .md-editor-toolbar::-webkit-scrollbar-thumb {
              background-color: ${isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)'} !important;
              border-radius: 10px !important;
              transition: all 0.2s ease !important;
            }
            
            html body #${editorId} .md-editor-toolbar::-webkit-scrollbar-thumb:hover {
              background-color: ${isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'} !important;
            }
            
            /* Firefox 滚动条支持 */
            html body #${editorId} .md-editor-toolbar {
              scrollbar-width: thin !important;
              scrollbar-color: ${isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)'} transparent !important;
            }
          `;
          document.head.appendChild(scrollbarStyle);
        });
      }
    };
    
    // 初始应用
    setTimeout(applyScrollbarStyles, 100);
    
    // 在编辑器完全加载后再次应用
    setTimeout(applyScrollbarStyles, 500);
    
    // 窗口调整大小时再次应用
    const handleResize = () => {
      applyScrollbarStyles();
    };
    window.addEventListener('resize', handleResize);
    
    // 添加鼠标滚轮横向滚动支持
    const handleToolbarWheel = (e: WheelEvent) => {
      if (e.target instanceof Node) {
        const toolbar = document.querySelector('.md-editor-toolbar');
        if (toolbar && (toolbar.contains(e.target) || toolbar === e.target)) {
          // 阻止垂直滚动
          e.preventDefault();
          
          // 计算滚动量，使滚动更平滑
          const scrollAmount = e.deltaMode === 1 ? e.deltaY * 20 : e.deltaY;
          
          // 使用更平滑的滚动
          const currentScroll = toolbar.scrollLeft;
          const targetScroll = currentScroll + (scrollAmount * 0.6);
          
          // 使用平滑滚动
          toolbar.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
          });
        }
      }
    };
    
    // 监听滚轮事件
    document.addEventListener('wheel', handleToolbarWheel, { passive: false });
    
    // 添加AI按钮到工具栏
    const addAIButtonToToolbar = () => {
      const toolbar = document.querySelector('.md-editor-toolbar > ul');
      if (toolbar) {
        // 检查是否已经添加过AI按钮
        if (!document.querySelector('.md-editor-toolbar .ai-assistant-toolbar-btn')) {
          // 创建一个分隔符
          const divider = document.createElement('li');
          divider.className = 'md-editor-toolbar-divider';
          toolbar.appendChild(divider);
          
          // 使用mark按钮图标创建AI按钮
          const aiButton = document.createElement('li');
          aiButton.className = 'md-editor-toolbar-item ai-assistant-toolbar-btn';
          aiButton.title = 'AI助手 (使用AI生成内容)';
          aiButton.onclick = () => {
            handleAIClick();
          };
          
          // 复制mark按钮的SVG图标
          const markButton = document.querySelector('.md-editor-toolbar [title*="标记"]');
          if (markButton) {
            const markSvg = markButton.querySelector('svg');
            if (markSvg) {
              aiButton.innerHTML = `<span class="md-editor-toolbar-icon">${markSvg.outerHTML}</span>`;
              
              // 修改图标颜色为主题色
              const svgInAiButton = aiButton.querySelector('svg');
              if (svgInAiButton) {
                svgInAiButton.style.fill = 'var(--primary)';
              }
            }
          } else {
            // 如果没有找到mark按钮，使用自定义图标
            aiButton.innerHTML = `
              <span class="md-editor-toolbar-icon">
                <svg viewBox="0 0 1024 1024">
                  <path d="M704 64H320c-38.4 0-64 25.6-64 64v768c0 38.4 25.6 64 64 64h384c38.4 0 64-25.6 64-64V128c0-38.4-25.6-64-64-64z m0 800c0 6.4-6.4 12.8-12.8 12.8H332.8c-6.4 0-12.8-6.4-12.8-12.8V160c0-6.4 6.4-12.8 12.8-12.8h358.4c6.4 0 12.8 6.4 12.8 12.8v704z"></path>
                  <path d="M435.2 435.2h160v102.4h-160z"></path>
                </svg>
              </span>
            `;
          }
          
          toolbar.appendChild(aiButton);
        }
      }
    };
    
    // 监视DOM变化，确保AI按钮始终存在于工具栏中
    const observeToolbar = () => {
      // 创建一个MutationObserver实例
      const observer = new MutationObserver(() => {
        // 检查工具栏是否已加载
        if (document.querySelector('.md-editor-toolbar > ul')) {
          addAIButtonToToolbar();
        }
      });
      
      // 观察整个文档的变化
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      return observer;
    };
    
    // 初始尝试添加按钮
    setTimeout(addAIButtonToToolbar, 300);
    
    // 开始观察DOM变化
    const toolbarObserver = observeToolbar();
    
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
      // 移除滚动条样式（如果存在）
      const scrollbarStyles = document.querySelectorAll(`style[data-for="${editorId}-scrollbar"]`);
      scrollbarStyles.forEach(style => {
        if (style && style.parentNode) {
          style.parentNode.removeChild(style);
        }
      });
      // 移除AI工具栏按钮观察器
      if (toolbarObserver) {
        toolbarObserver.disconnect();
      }
      // 移除事件监听
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('wheel', handleToolbarWheel);
      // 移除窗口调整大小事件监听
      window.removeEventListener('resize', handleResize);
    };
  }, [id, title, content, onSave, editorId]);
  
  // 处理编辑器容器右键事件
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // 检查事件是否来自编辑器内部
      if (editorContainerRef.current && editorContainerRef.current.contains(e.target as Node)) {
        // 检查更具体的编辑器元素
        const editorInput = document.querySelector(`#${editorId} .md-editor-input`);
        const editorTextarea = document.querySelector(`#${editorId} .md-editor-input textarea`);
        
        if ((editorInput && editorInput.contains(e.target as Node)) || 
            (editorTextarea && editorTextarea.contains(e.target as Node))) {
          // 获取选中的文本
          const selection = window.getSelection();
          const selectedText = selection?.toString() || '';
          
          // 只在有文本选中时显示AI菜单
          if (selectedText.trim()) {
            e.preventDefault(); // 阻止默认右键菜单
            
            setContextMenu({
              visible: true,
              x: e.clientX,
              y: e.clientY,
              selectedText
            });
          }
          // 如果没有选中文本，则使用默认右键菜单
        }
      } else if (contextMenu.visible) {
        // 如果点击在编辑器外部，关闭上下文菜单
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };
    
    // 添加右键菜单事件监听
    document.addEventListener('contextmenu', handleContextMenu);
    
    // 添加点击事件监听，点击其他区域时关闭上下文菜单
    const handleDocumentClick = () => {
      if (contextMenu.visible) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };
    
    document.addEventListener('click', handleDocumentClick);
    
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [editorId, contextMenu.visible]);
  
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

  // 处理AI助手插入文本
  const handleInsertAIText = (text: string) => {
    // 尝试在当前光标位置插入文本
    try {
      const editorTextarea = document.querySelector(`#${editorId} .md-editor-input textarea`);
      
      if (editorTextarea instanceof HTMLTextAreaElement) {
        const startPos = editorTextarea.selectionStart;
        const endPos = editorTextarea.selectionEnd;
        
        // 获取当前内容
        const beforeText = content.substring(0, startPos);
        const afterText = content.substring(endPos);
        
        // 更新内容，在光标位置插入
        setContent(beforeText + text + afterText);
        
        // 尝试在插入后设置光标位置（在下一个渲染周期）
        setTimeout(() => {
          const newPosition = startPos + text.length;
          editorTextarea.focus();
          editorTextarea.setSelectionRange(newPosition, newPosition);
        }, 10);
      } else {
        // 如果找不到文本区域，退回到简单追加
        setContent((prevContent) => prevContent + '\n\n' + text);
      }
    } catch (err) {
      console.error('插入AI文本时出错:', err);
      // 出错时退回到简单追加
      setContent((prevContent) => prevContent + '\n\n' + text);
    }
  };
  
  // 关闭AI上下文菜单
  const handleCloseContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  // 处理文件夹变更
  const handleFolderChange = async (newFolder: string) => {
    if (onFolderChange) {
      onFolderChange(newFolder);
    }
    
    // 如果是移动文档
    if (onMove && newFolder !== currentFolder) {
      await onMove(id, newFolder);
    }
    
    setShowFolderSelector(false);
  };

  // 处理AI助手功能
  const handleAIClick = () => {
    // 获取当前选中的文本
    const selection = window.getSelection();
    const selectedText = selection?.toString() || '';
    
    if (selectedText) {
      setAiPrompt(selectedText);
    }
    
    setShowAIModal(true);
  };
  
  // 处理AI文本插入
  const handleAITextGenerate = (prompt: string) => {
    // 这里可以连接到实际的AI后端
    // 现在我们简单模拟一个响应
    // TODO: 实现真实AI后端连接
    setTimeout(() => {
      const generatedText = `🤖 AI助手: 基于你的请求 "${prompt}"，以下是生成的内容：\n\n这里是AI生成的内容示例。在实际实现中，这里会显示真实的AI生成结果。`;
      handleInsertAIText(generatedText);
      setShowAIModal(false);
    }, 1000);
  };

  return (
    <div className="w-full h-screen flex flex-col">
      <div className="flex items-center p-4 border-b bg-card">
        {onMenuClick && (
          <Button variant="ghost" onClick={onMenuClick} size="icon" className="mr-3 shrink-0">
            <Menu size={18} />
          </Button>
        )}
        <Button variant="ghost" onClick={onCancel} size="icon" className="mr-3 shrink-0">
          <ArrowLeft size={18} />
        </Button>
        <div className="flex-1">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="笔记标题"
            className="w-full text-xl font-bold bg-transparent border-none outline-none focus:ring-0"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowFolderSelector(!showFolderSelector)}
              className="gap-1"
            >
              {currentFolder ? getFolderDisplayName(currentFolder) : '选择文件夹'}
            </Button>
            
            {showFolderSelector && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-card border rounded-lg shadow-lg p-2 z-10">
                <div className="max-h-60 overflow-y-auto">
                  <div 
                    className={`px-3 py-1.5 rounded-md cursor-pointer hover:bg-accent ${currentFolder === '' ? 'bg-accent' : ''}`}
                    onClick={() => handleFolderChange('')}
                  >
                    根目录
                  </div>
                  
                  {folders.map(folder => (
                    <div 
                      key={folder}
                      className={`px-3 py-1.5 rounded-md cursor-pointer hover:bg-accent ${currentFolder === folder ? 'bg-accent' : ''}`}
                      onClick={() => handleFolderChange(folder)}
                    >
                      {getFolderDisplayName(folder)}
                    </div>
                  ))}
                </div>
                
                <div className="mt-2 pt-2 border-t">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start text-sm"
                    onClick={() => setShowNewFolderInput(!showNewFolderInput)}
                  >
                    + 新建文件夹
                  </Button>
                  
                  {showNewFolderInput && (
                    <div className="mt-2 p-2 bg-muted/50 rounded-md">
                      <div className="mb-2">
                        <label className="block text-xs mb-1">父文件夹</label>
                        <select 
                          className="w-full px-2 py-1 text-sm border rounded"
                          value={newSubfolderParent}
                          onChange={(e) => setNewSubfolderParent(e.target.value)}
                        >
                          <option value="">根目录</option>
                          {folders.map(folder => (
                            <option key={folder} value={folder}>
                              {getFolderDisplayName(folder)}
                            </option>
                          ))}
                        </select>
                      </div>
                      
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
          
          <Button onClick={handleSave} className="gap-2 ml-2 shrink-0">
            <Save size={16} />
            保存
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden" ref={editorContainerRef}>
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
      
      {/* AI上下文菜单 */}
      {contextMenu.visible && (
        <AIContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          selectedText={contextMenu.selectedText}
          onClose={handleCloseContextMenu}
          onInsertText={handleInsertAIText}
        />
      )}
      
      {/* AI对话框 */}
      {showAIModal && (
        <div className="ai-modal-backdrop" onClick={() => setShowAIModal(false)}>
          <div className="ai-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ai-modal-header">
              <div className="ai-modal-title">
                <Sparkles size={18} className="text-primary" />
                <span>AI助手</span>
              </div>
              <div className="ai-modal-close" onClick={() => setShowAIModal(false)}>
                <X size={18} />
              </div>
            </div>
            <div className="ai-modal-body">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="w-full h-32 p-3 border rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="输入你的问题或提示..."
              />
            </div>
            <div className="ai-modal-footer">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAIModal(false)}
              >
                取消
              </Button>
              <Button 
                size="sm" 
                onClick={() => handleAITextGenerate(aiPrompt)}
                disabled={!aiPrompt.trim()}
              >
                生成
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 