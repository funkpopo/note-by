'use client';

import { useState, useEffect } from 'react';
import { MdPreview } from 'md-editor-rt';
import 'md-editor-rt/lib/preview.css';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Menu } from 'lucide-react';

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
  
  return (
    <div className="w-full h-screen flex flex-col">
      <div className="flex items-center p-4 border-b">
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
              <>
                <span className="mx-2">•</span>
                <span className="text-primary/80">
                  {folder.split('/').map((part, index) => (
                    <span key={index}>
                      {index > 0 && <span className="mx-1">/</span>}
                      <span>{part}</span>
                    </span>
                  ))}
                </span>
              </>
            )}
          </div>
        </div>
        <Button onClick={() => onEdit(id)} className="gap-2 shrink-0 ml-2">
          <Edit size={16} />
          编辑
        </Button>
      </div>
      
      <div className="flex-1 overflow-auto p-4 sm:p-2 md:p-5" style={{ backgroundColor: theme === 'dark' ? '#000000' : '#ffffff' }}>
        <div className="h-full max-w-1xl mx-auto">
          <div className="rounded-xl shadow-sm h-full overflow-hidden">
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
  );
} 