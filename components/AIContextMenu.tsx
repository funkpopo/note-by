'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Brain, 
  Pencil, 
  Plus, 
  ArrowRight, 
  X, 
  AlertCircle, 
  Loader2, 
  Check 
} from 'lucide-react';
import { callAIWithPrompt, getAIPrompts, AIPrompts } from '@/lib/ai-utils';
import { cn } from '@/lib/utils';

interface AIContextMenuProps {
  x: number;
  y: number;
  selectedText: string;
  onClose: () => void;
  onInsertText: (text: string) => void;
}

export default function AIContextMenu({ 
  x, 
  y, 
  selectedText, 
  onClose, 
  onInsertText 
}: AIContextMenuProps) {
  const [prompts, setPrompts] = useState<AIPrompts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [activePromptType, setActivePromptType] = useState<keyof AIPrompts | null>(null);
  
  const menuRef = useRef<HTMLDivElement>(null);
  
  // 加载提示词
  useEffect(() => {
    const loadPrompts = async () => {
      try {
        const promptsData = await getAIPrompts();
        setPrompts(promptsData);
      } catch (err) {
        console.error('加载AI提示词失败:', err);
      }
    };
    
    loadPrompts();
  }, []);
  
  // 处理点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);
  
  // 调用AI处理选定文本
  const handleAIProcess = async (promptType: keyof AIPrompts) => {
    if (!prompts || !selectedText.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    setActivePromptType(promptType);
    
    try {
      // 查找默认提示词
      const promptList = prompts[promptType];
      const defaultPrompt = promptList.find(p => p.isDefault) || promptList[0];
      
      if (!defaultPrompt) {
        setError(`找不到有效的${getPromptTypeName(promptType)}提示词`);
        setLoading(false);
        return;
      }
      
      // 调用AI处理
      const response = await callAIWithPrompt(promptType, defaultPrompt.id, selectedText);
      
      if (response.success && response.content) {
        setResult(response.content);
      } else {
        setError(response.error || 'AI处理失败');
      }
    } catch (err) {
      setError(`AI处理失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };
  
  // 处理插入处理结果
  const handleInsert = () => {
    if (result) {
      onInsertText(result);
      onClose();
    }
  };
  
  // 获取提示词类型的显示名称
  const getPromptTypeName = (type: keyof AIPrompts): string => {
    const nameMap: Record<keyof AIPrompts, string> = {
      understand: '理解内容',
      rewrite: '改写内容',
      expand: '扩展写作',
      continue: '继续写作'
    };
    
    return nameMap[type] || type;
  };
  
  // 获取提示词类型的图标
  const getPromptTypeIcon = (type: keyof AIPrompts) => {
    const iconMap: Record<keyof AIPrompts, React.ReactNode> = {
      understand: <Brain size={14} />,
      rewrite: <Pencil size={14} />,
      expand: <Plus size={14} />,
      continue: <ArrowRight size={14} />
    };
    
    return iconMap[type] || null;
  };
  
  // 计算菜单位置，确保在视口内
  const calculatePosition = () => {
    if (!menuRef.current) return { left: x, top: y };
    
    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left = x;
    let top = y;
    
    // 确保菜单不超出右侧边界
    if (left + menuRect.width > viewportWidth) {
      left = viewportWidth - menuRect.width - 10;
    }
    
    // 确保菜单不超出底部边界
    if (top + menuRect.height > viewportHeight) {
      top = viewportHeight - menuRect.height - 10;
    }
    
    return { left, top };
  };
  
  const position = calculatePosition();
  
  if (!prompts) {
    return null; // 等待加载提示词
  }
  
  return (
    <div 
      ref={menuRef}
      className="fixed z-50 bg-card border rounded-md shadow-md min-w-[220px]"
      style={{ 
        left: `${position.left}px`, 
        top: `${position.top}px`
      }}
    >
      {activePromptType ? (
        <div className="p-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium flex items-center gap-1.5">
              {getPromptTypeIcon(activePromptType)}
              {getPromptTypeName(activePromptType)}
            </h3>
            <button 
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
              aria-label="关闭"
            >
              <X size={14} />
            </button>
          </div>
          
          {loading ? (
            <div className="py-4 flex flex-col items-center">
              <Loader2 size={20} className="animate-spin text-primary" />
              <p className="mt-2 text-xs text-muted-foreground">正在处理中...</p>
            </div>
          ) : error ? (
            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-md mb-2 flex items-start gap-1.5">
              <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : result ? (
            <>
              <div className="bg-muted rounded-md p-2 my-2 text-xs max-h-[200px] overflow-y-auto">
                {result}
              </div>
              <button
                onClick={handleInsert}
                className="w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-md text-xs"
              >
                <Check size={14} />
                插入到编辑器
              </button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground py-2">
              正在准备处理...
            </p>
          )}
        </div>
      ) : (
        <div className="py-1">
          <div className="px-2 py-1 text-xs text-muted-foreground">
            AI 助手
          </div>
          
          {Object.keys(prompts).map((promptType) => (
            <button
              key={promptType}
              onClick={() => handleAIProcess(promptType as keyof AIPrompts)}
              className={cn(
                "w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-accent rounded-sm"
              )}
            >
              {getPromptTypeIcon(promptType as keyof AIPrompts)}
              {getPromptTypeName(promptType as keyof AIPrompts)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 