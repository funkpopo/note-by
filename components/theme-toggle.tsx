"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const prevThemeRef = useRef<string | null>(null);

  // 当主题发生变化时保存到本地设置
  useEffect(() => {
    const saveTheme = async () => {
      // 只有当主题值存在且与上次保存的不同时才保存
      if (theme && theme !== prevThemeRef.current && window.electron) {
        try {
          const settings = await window.electron.getAppearanceSettings();
          if (settings) {
            await window.electron.saveAppearanceSettings({
              ...settings,
              theme: theme
            });
            
            // 更新已保存的主题引用
            prevThemeRef.current = theme;
            console.log(`主题已更新为 ${theme} 并保存到配置文件`);
          }
        } catch (error) {
          console.error("保存主题设置失败:", error);
        }
      }
    };
    
    // 等待theme初始化后再尝试保存
    if (theme) {
      saveTheme();
    }
  }, [theme]);

  // 切换主题并立即保存到配置文件
  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    
    // 立即保存到配置文件，不依赖useEffect中的状态更新
    if (window.electron) {
      try {
        const settings = await window.electron.getAppearanceSettings();
        if (settings) {
          await window.electron.saveAppearanceSettings({
            ...settings,
            theme: newTheme
          });
          console.log(`主题已切换为 ${newTheme} 并立即保存到配置文件`);
        }
      } catch (error) {
        console.error("切换并保存主题失败:", error);
      }
    }
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="relative"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
} 