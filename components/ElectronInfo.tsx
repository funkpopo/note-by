'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Folder } from 'lucide-react';

// 定义Electron API类型
interface ElectronAPI {
  getMarkdownDir: () => Promise<{ success: boolean; path?: string; error?: string }>;
  openMarkdownDir: () => Promise<{ success: boolean; error?: string }>;
}

export default function ElectronInfo() {
  const [isElectron, setIsElectron] = useState(false);
  const [markdownPath, setMarkdownPath] = useState<string | null>(null);

  useEffect(() => {
    // 检查是否在Electron环境中运行
    const isRunningInElectron = typeof window !== 'undefined' && 'electron' in window;
    setIsElectron(isRunningInElectron);

    // 如果在Electron环境中，获取markdown路径
    if (isRunningInElectron) {
      const electron = (window as Window & typeof globalThis & { electron: ElectronAPI }).electron;
      if (electron && typeof electron.getMarkdownDir === 'function') {
        electron.getMarkdownDir()
          .then((result) => {
            if (result.success && result.path) {
              setMarkdownPath(result.path);
            }
          })
          .catch((error: Error) => {
            console.error('获取markdown目录路径失败:', error);
          });
      }
    }
  }, []);

  const handleOpenFolder = () => {
    if (isElectron) {
      const electron = (window as Window & typeof globalThis & { electron: ElectronAPI }).electron;
      if (electron && typeof electron.openMarkdownDir === 'function') {
        electron.openMarkdownDir()
          .catch((error: Error) => {
            console.error('打开markdown目录失败:', error);
          });
      }
    }
  };

  if (!isElectron) {
    return null; // 在浏览器环境中不显示
  }

  return (
    <div className="fixed bottom-0 right-0 p-4 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm rounded-tl-lg border-t border-l">
      <div className="flex items-center gap-2">
        <div>笔记存储位置: {markdownPath || '加载中...'}</div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6" 
          onClick={handleOpenFolder}
          title="打开笔记文件夹"
        >
          <Folder size={14} />
        </Button>
      </div>
    </div>
  );
} 