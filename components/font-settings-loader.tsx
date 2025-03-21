"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

export default function FontSettingsLoader() {
  const { setTheme } = useTheme();
  const settingsAppliedRef = useRef(false);
  const initialThemeAppliedRef = useRef(false);
  const [settings, setSettings] = useState<{
    fontFamily?: string;
    fontSize?: string;
    theme?: string;
  } | null>(null);

  // Initial load of settings
  useEffect(() => {
    const loadSettings = async () => {
      // 防止重复加载
      if (settingsAppliedRef.current) return;
      
      try {
        if (window.electron) {
          const settings = await window.electron.getAppearanceSettings();
          
          if (settings) {
            console.log("加载外观设置:", settings);
            setSettings(settings);
            
            const { fontFamily, fontSize, theme } = settings;
            
            // 应用到HTML根元素以确保全局继承
            document.documentElement.style.fontFamily = fontFamily;
            document.documentElement.style.fontSize = fontSize;
            
            // 保持对body的设置以确保兼容性
            document.body.style.fontFamily = fontFamily;
            document.body.style.fontSize = fontSize;
            
            // 如果有保存的主题设置且未应用过，应用它
            if (theme && !initialThemeAppliedRef.current) {
              console.log(`应用已保存的主题设置: ${theme}`);
              setTheme(theme);
              initialThemeAppliedRef.current = true;
            }
            
            // 标记设置已应用
            settingsAppliedRef.current = true;
          }
        }
      } catch (error) {
        console.error("加载外观设置失败:", error);
      }
    };

    loadSettings();
  }, [setTheme]);

  // Listen for settings changes and re-apply them
  useEffect(() => {
    if (!window.electron) return;

    // 设置监听器接收设置变更通知
    const cleanupSettingsListener = window.electron.onAppearanceSettingsChanged((updatedSettings) => {
      console.log("收到外观设置变更通知:", updatedSettings);
      setSettings(updatedSettings);
      
      // 应用新的字体设置到DOM
      document.documentElement.style.fontFamily = updatedSettings.fontFamily;
      document.documentElement.style.fontSize = updatedSettings.fontSize;
      document.body.style.fontFamily = updatedSettings.fontFamily;
      document.body.style.fontSize = updatedSettings.fontSize;
    });
    
    return () => {
      // 清理监听器
      cleanupSettingsListener();
    };
  }, []);

  // Apply settings when they change
  useEffect(() => {
    if (settings && settings.fontFamily && settings.fontSize) {
      // 应用到HTML根元素以确保全局继承
      document.documentElement.style.fontFamily = settings.fontFamily;
      document.documentElement.style.fontSize = settings.fontSize;
      
      // 保持对body的设置以确保兼容性
      document.body.style.fontFamily = settings.fontFamily;
      document.body.style.fontSize = settings.fontSize;
    }
  }, [settings]);

  return null; // This is a utility component that doesn't render anything
}