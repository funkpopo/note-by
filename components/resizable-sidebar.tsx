"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface ResizableSidebarProps {
  children: React.ReactNode;
  className?: string;
  minWidth?: number;
}

export function ResizableSidebar({
  children,
  className,
  minWidth = 150,
}: ResizableSidebarProps) {
  const [width, setWidth] = useState(288); // 默认宽度
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  // 加载保存的宽度
  useEffect(() => {
    const loadSavedWidth = async () => {
      try {
        if (window.electron) {
          const settings = await window.electron.getAppearanceSettings();
          if (settings && settings.sidebarWidth) {
            setWidth(Math.max(settings.sidebarWidth, minWidth));
          }
        }
      } catch (error) {
        console.error("Error loading sidebar width:", error);
      }
    };

    loadSavedWidth();
  }, [minWidth]);

  // 保存宽度设置
  const saveSidebarWidth = async (newWidth: number) => {
    try {
      if (window.electron) {
        const settings = await window.electron.getAppearanceSettings();
        await window.electron.saveAppearanceSettings({
          ...settings,
          sidebarWidth: newWidth,
        });
      }
    } catch (error) {
      console.error("Error saving sidebar width:", error);
    }
  };

  // 处理鼠标按下事件
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.pageX;
    startWidthRef.current = width;
  };

  // 处理鼠标移动事件
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const delta = e.pageX - startXRef.current;
      const newWidth = Math.max(startWidthRef.current + delta, minWidth);
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        // 保存新的宽度设置
        saveSidebarWidth(width);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, minWidth, width]);

  return (
    <div
      ref={sidebarRef}
      className={cn(
        "relative flex-shrink-0 border-r border-r-border bg-muted/30 overflow-y-auto",
        className
      )}
      style={{ width: `${width}px` }}
    >
      {children}
      <div
        className={cn(
          "absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors",
          isResizing && "bg-primary"
        )}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
} 