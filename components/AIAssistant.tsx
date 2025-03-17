'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Sparkles, AlertCircle, X } from 'lucide-react';
import { callAI, getDefaultAIProvider } from '@/lib/ai-utils';
import { cn } from '@/lib/utils';

interface AIAssistantProps {
  onInsertText: (text: string) => void;
  currentContent?: string;
}

export default function AIAssistant({ onInsertText, currentContent = '' }: AIAssistantProps) {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setError('');
    setResponse('');
    
    // 检查是否有默认AI提供商
    const defaultProvider = getDefaultAIProvider();
    if (!defaultProvider) {
      setError('未配置AI提供商。请先在AI设置中添加提供商。');
      setIsLoading(false);
      return;
    }
    
    // 构建完整的提示，包括当前内容作为上下文
    const fullPrompt = currentContent 
      ? `以下是我正在编写的笔记内容：\n\n${currentContent}\n\n${prompt}`
      : prompt;
    
    try {
      const result = await callAI(fullPrompt);
      
      if (result.success && result.content) {
        setResponse(result.content);
      } else {
        setError(result.error || '获取AI回复失败');
      }
    } catch (error) {
      console.error('AI请求失败:', error);
      setError(`AI请求失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsert = () => {
    if (response) {
      onInsertText(response);
      setResponse('');
      setPrompt('');
    }
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // 重置状态
      setPrompt('');
      setResponse('');
      setError('');
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={toggleOpen}
        title="AI助手"
      >
        <Sparkles size={16} className="text-primary" />
        AI助手
      </Button>
      
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-80 bg-card border rounded-lg shadow-lg p-3 z-10">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium flex items-center gap-1">
              <Sparkles size={14} className="text-primary" />
              AI助手
            </h3>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={toggleOpen}
            >
              <X size={14} />
            </Button>
          </div>
          
          <form onSubmit={handleSubmit} className="mb-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="输入提示..."
                className="flex-1 px-3 py-1 text-sm border rounded-md bg-background"
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                size="icon" 
                className="h-8 w-8"
                disabled={isLoading || !prompt.trim()}
              >
                <Send size={14} />
              </Button>
            </div>
          </form>
          
          {isLoading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary mx-auto"></div>
              <p className="text-xs text-muted-foreground mt-2">正在生成回复...</p>
            </div>
          )}
          
          {error && (
            <div className={cn(
              "p-2 rounded-md flex items-start gap-2 text-xs",
              "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
            )}>
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          {response && (
            <div className="mt-2">
              <div className="bg-muted/50 rounded-md p-2 text-xs max-h-40 overflow-y-auto">
                {response}
              </div>
              <div className="mt-2 flex justify-end">
                <Button 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={handleInsert}
                >
                  插入到笔记
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 