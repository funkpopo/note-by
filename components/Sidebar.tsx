'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import ThemeToggle from './ThemeToggle';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (view: 'all' | 'recent' | 'tags' | 'ai-settings') => void;
  currentView?: 'all' | 'recent' | 'tags' | 'ai-settings';
}

export default function Sidebar({ isOpen, onClose, onNavigate, currentView = 'all' }: SidebarProps) {
  // 防止水合不匹配
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      {/* 遮罩层 - 点击关闭侧边栏 */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}
      
      {/* 侧边栏 */}
      <div 
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-sidebar border-r border-sidebar-border shadow-lg z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          <h2 className="text-lg font-semibold">菜单</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X size={18} />
          </Button>
        </div>
        
        <div className="p-4 flex-1">
          <nav className="space-y-2">
            <button 
              onClick={() => {
                if (onNavigate) onNavigate('all');
                onClose();
              }}
              className={cn(
                "block w-full text-left px-3 py-2 rounded-md hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors",
                currentView === 'all' && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              )}
            >
              所有笔记
            </button>
            <button 
              onClick={() => {
                if (onNavigate) onNavigate('recent');
                onClose();
              }}
              className={cn(
                "block w-full text-left px-3 py-2 rounded-md hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors",
                currentView === 'recent' && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              )}
            >
              最近编辑
            </button>
            <button 
              onClick={() => {
                if (onNavigate) onNavigate('tags');
                onClose();
              }}
              className={cn(
                "block w-full text-left px-3 py-2 rounded-md hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors",
                currentView === 'tags' && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              )}
            >
              标签管理
            </button>
            <button 
              onClick={() => {
                if (onNavigate) onNavigate('ai-settings');
                onClose();
              }}
              className={cn(
                "block w-full text-left px-3 py-2 rounded-md hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors",
                currentView === 'ai-settings' && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              )}
            >
              AI 设置
            </button>
          </nav>
        </div>
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">主题切换</span>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </>
  );
} 