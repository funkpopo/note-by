'use client';

import { useState, useEffect } from 'react';
import { MdPreview } from 'md-editor-rt';
import 'md-editor-rt/lib/preview.css';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Menu, Bookmark, BookmarkCheck, Share, Download, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';

// 添加自定义样式，确保与编辑器一致
const customStyle = `
.md-preview-wrapper {
  font-size: 1.05rem !important;
  padding: 1.2rem !important;
  height: 100% !important;
  min-height: 100% !important;
}
.md-preview-wrapper pre {
  margin: 1.2em 0 !important;
}
.md-preview-wrapper pre code {
  font-size: 0.95rem !important;
  padding: 1em !important;
}
.md-preview-wrapper h1 {
  font-size: 2rem !important;
  margin-top: 2rem !important;
  margin-bottom: 1.2rem !important;
}
.md-preview-wrapper h2 {
  font-size: 1.7rem !important;
  margin-top: 1.8rem !important;
  margin-bottom: 1rem !important;
}
.md-preview-wrapper h3 {
  font-size: 1.4rem !important;
  margin-top: 1.5rem !important;
  margin-bottom: 0.8rem !important;
}
.md-preview-wrapper p {
  margin: 1em 0 !important;
  line-height: 1.6 !important;
}
.md-preview-wrapper ul, .md-preview-wrapper ol {
  padding-left: 2em !important;
  margin: 1em 0 !important;
}
.md-preview-wrapper blockquote {
  padding: 0.8em 1em !important;
  margin: 1em 0 !important;
  border-left-width: 4px !important;
}
`;

interface NoteViewerProps {
  id: string;
  title: string;
  content: string;
  date: string;
  folder?: string;
  onBack: () => void;
  onEdit: (id: string) => void;
  onMenuClick?: () => void;
}

export default function NoteViewer({
  id,
  title,
  content,
  date,
  folder,
  onBack,
  onEdit,
  onMenuClick
}: NoteViewerProps) {
  const [previewId] = useState(`preview-${id}`);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isFavorite, setIsFavorite] = useState(false);
  
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
    
    return () => {
      observer.disconnect();
      // 移除自定义样式
      document.head.removeChild(styleElement);
    };
  }, []);

  // 提取标题和标签
  const extractTags = (content: string) => {
    const tagRegex = /#([a-zA-Z0-9_\u4e00-\u9fa5]+)/g;
    const matches = content.match(tagRegex) || [];
    return matches.map(tag => tag.substring(1));
  };

  const tags = extractTags(content);
  
  return (
    <div className="w-full h-screen flex flex-col">
      {/* 顶部导航栏 */}
      <div className="flex items-center p-4 border-b bg-card">
        {onMenuClick && (
          <Button variant="ghost" onClick={onMenuClick} size="icon" className="mr-3 shrink-0">
            <Menu size={18} />
          </Button>
        )}
        <Button variant="ghost" onClick={onBack} size="icon" className="mr-3 shrink-0">
          <ArrowLeft size={18} />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{title}</h1>
          <div className="flex items-center text-sm text-muted-foreground">
            <span>{new Date(date).toLocaleString()}</span>
            {folder && (
              <div className="flex items-center ml-2 text-primary/80">
                <Folder size={14} className="mr-1" />
                <span>
                  {folder.split('/').map((part, index) => (
                    <span key={index}>
                      {index > 0 && <span className="mx-1">/</span>}
                      <span>{part}</span>
                    </span>
                  ))}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9"
            onClick={() => setIsFavorite(!isFavorite)}
            title={isFavorite ? "取消收藏" : "收藏笔记"}
          >
            {isFavorite ? <BookmarkCheck size={18} className="text-primary" /> : <Bookmark size={18} />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9"
            title="分享笔记"
          >
            <Share size={18} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9"
            title="下载笔记"
          >
            <Download size={18} />
          </Button>
          <Button onClick={() => onEdit(id)} className="gap-2 shrink-0 ml-2">
            <Edit size={16} />
            编辑
          </Button>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* 主要内容区域 */}
        <div className="flex-1 overflow-auto p-4 sm:p-2 md:p-5 scrollbar-thin scrollbar-thumb-rounded-md scrollbar-track-transparent scrollbar-thumb-muted hover:scrollbar-thumb-primary/50 transition-colors" style={{ backgroundColor: theme === 'dark' ? '#000000' : '#ffffff' }}>
          <div className="h-full max-w-3xl mx-auto">
            {/* 标签显示 */}
            {tags.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <span 
                    key={index} 
                    className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            
            {/* Markdown 预览 */}
            <div className={cn(
              "rounded-xl shadow-sm h-full overflow-hidden",
              theme === 'dark' ? 'border border-border/30' : 'border'
            )}>
              <MdPreview
                modelValue={content}
                id={previewId}
                theme={theme}
                previewTheme="github"
                language="zh-CN"
                codeStyleReverse={true}
                showCodeRowNumber={true}
                style={{ height: 'calc(100% - 2px)' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 