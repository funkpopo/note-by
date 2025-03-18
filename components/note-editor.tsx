"use client";

import * as React from "react";
import { useState } from "react";
import Cherry from "cherry-markdown";
import { Button } from "@/components/ui/button";
import { Bookmark, CheckCircle, Info, Loader2, Save } from "lucide-react";
import { useTheme } from "next-themes";
import { Note } from "@/types/note";

interface NoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave: () => void;
  note?: Note | null;
}

export function NoteEditor({ content, onChange, onSave, note }: NoteEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const cherryRef = React.useRef<Cherry | null>(null);
  const { theme } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  
  // 获取当前主题模式
  const currentTheme = theme === "dark" ? "dark" : "light";

  // 初始化编辑器
  React.useEffect(() => {
    if (!editorRef.current) return;

    // 为editorRef.current添加id属性
    editorRef.current.id = "cherry-markdown-editor";
    
    // 初始化Cherry编辑器
    const cherry = new Cherry({
      id: "cherry-markdown-editor",
      value: content,
      // 添加命名空间以便应用主题
      nameSpace: "note-by",
      // 配置主题
      themeSettings: {
        // 主题列表
        themeList: [
          { className: "dark", label: "深色" },
          { className: "light", label: "浅色" }
        ],
        // 应用当前系统主题
        mainTheme: currentTheme,
        // 设置代码块主题，dark模式下使用one-dark主题
        codeBlockTheme: currentTheme === "dark" ? "one-dark" : "default",
        // 内联代码主题颜色
        inlineCodeTheme: currentTheme === "dark" ? "red" : "black",
        // 工具栏主题
        toolbarTheme: currentTheme as "dark" | "light"
      },
      editor: {
        height: "100%",
        defaultModel: "edit&preview",
      },
      callback: {
        afterChange: (value: string) => {
          onChange(value);
        },
      },
    });

    cherryRef.current = cherry;

    // 清理函数
    return () => {
      if (cherryRef.current) {
        cherryRef.current.destroy();
        cherryRef.current = null;
      }
    };
  }, [content, onChange, currentTheme]);

  // 当主题变化时，尝试使用setTheme API更新主题
  React.useEffect(() => {
    if (!cherryRef.current) return;
    
    try {
      // 使用setTheme API更新主题
      if (typeof cherryRef.current.setTheme === 'function') {
        cherryRef.current.setTheme(currentTheme);
      }
      
      // 更新代码块主题
      if (typeof cherryRef.current.setCodeBlockTheme === 'function') {
        cherryRef.current.setCodeBlockTheme(currentTheme === "dark" ? "one-dark" : "default");
      }
    } catch (error) {
      console.error("更新Cherry主题失败", error);
    }
  }, [currentTheme]);

  // 当内容从外部更新时，更新编辑器内容
  React.useEffect(() => {
    if (cherryRef.current && cherryRef.current.getValue() !== content) {
      cherryRef.current.setValue(content);
    }
  }, [content]);

  // 处理保存动作
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage("");
    
    try {
      await onSave();
      setSaveMessage("保存成功");
      
      // 3秒后清除消息
      setTimeout(() => {
        setSaveMessage("");
      }, 3000);
    } catch (err) {
      console.error("保存失败:", err);
      setSaveMessage("保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-2 flex justify-between items-center bg-card shadow-sm">
        <div className="flex items-center">
          {note && (
            <div className="flex items-center mr-4">
              <Bookmark className="h-4 w-4 mr-1 text-primary icon-button" />
              <span className="text-sm font-medium">{note.name.replace(/\.md$/, "")}</span>
              {note.group && note.group !== "default" && (
                <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                  {note.group}
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {saveMessage && (
            <div className="flex items-center text-sm bg-card/80 px-3 py-1 rounded-md shadow-sm border border-border/50">
              {saveMessage === "保存成功" ? (
                <CheckCircle className="h-4 w-4 mr-1.5 text-green-500 icon-button" />
              ) : (
                <Info className="h-4 w-4 mr-1.5 text-red-500 icon-button" />
              )}
              <span className={saveMessage === "保存成功" ? "text-green-500" : "text-red-500"}>
                {saveMessage}
              </span>
            </div>
          )}
          
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="px-4">
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin icon-button" />
            ) : (
              <Save className="h-4 w-4 mr-1.5 icon-button" />
            )}
            保存
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto h-full">
        <div ref={editorRef} className="h-full w-full" />
      </div>
    </div>
  );
} 