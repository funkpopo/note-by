"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Font family options
const fontOptions = [
  { label: "系统默认", value: "system-ui, sans-serif" },
  { label: "思源黑体", value: "'Source Han Sans SC', sans-serif" },
  { label: "微软雅黑", value: "'Microsoft YaHei', sans-serif" },
  { label: "等线", value: "'DengXian', sans-serif" },
  { label: "宋体", value: "'SimSun', serif" },
  { label: "黑体", value: "'SimHei', sans-serif" },
  { label: "Arial", value: "'Arial', sans-serif" },
  { label: "Helvetica", value: "'Helvetica Neue', Helvetica, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
];

// Font size options
const fontSizeOptions = [
  { label: "小", value: "14px" },
  { label: "中", value: "16px" },
  { label: "大", value: "18px" },
  { label: "超大", value: "20px" },
];

export default function AppearanceSettings() {
  const [font, setFont] = useState("system-ui, sans-serif");
  const [fontSize, setFontSize] = useState("16px");
  const [customFont, setCustomFont] = useState("");
  const [customFontSize, setCustomFontSize] = useState("");
  const [previewText, setPreviewText] = useState("这是预览文本。The quick brown fox jumps over the lazy dog.");
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Load saved settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        // 使用Electron API获取设置
        if (window.electron) {
          const savedSettings = await window.electron.getAppearanceSettings();
          
          if (savedSettings) {
            const { fontFamily, fontSize: savedFontSize } = savedSettings;
            
            // Check if font is in our predefined list
            const matchedFont = fontOptions.find(option => option.value === fontFamily);
            if (matchedFont) {
              setFont(fontFamily);
            } else {
              setCustomFont(fontFamily);
            }
            
            // Check if font size is in our predefined list
            const matchedFontSize = fontSizeOptions.find(option => option.value === savedFontSize);
            if (matchedFontSize) {
              setFontSize(savedFontSize);
            } else {
              setCustomFontSize(savedFontSize);
            }
          }
        } else {
          // 回退到localStorage (用于开发时在浏览器中直接预览)
          const localSettings = localStorage.getItem("appearance-settings");
          if (localSettings) {
            const { fontFamily, fontSize: savedFontSize } = JSON.parse(localSettings);
            
            // Check if font is in our predefined list
            const matchedFont = fontOptions.find(option => option.value === fontFamily);
            if (matchedFont) {
              setFont(fontFamily);
            } else {
              setCustomFont(fontFamily);
            }
            
            // Check if font size is in our predefined list
            const matchedFontSize = fontSizeOptions.find(option => option.value === savedFontSize);
            if (matchedFontSize) {
              setFontSize(savedFontSize);
            } else {
              setCustomFontSize(savedFontSize);
            }
          }
        }
      } catch (error) {
        console.error("Error loading appearance settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  // Apply font settings to document and save when they change
  useEffect(() => {
    if (isLoading) return;
    
    const saveSettings = async () => {
      const body = document.body;
      
      // Apply font family
      body.style.fontFamily = customFont || font;
      
      // Apply font size
      body.style.fontSize = customFontSize || fontSize;
      
      // Save settings
      const settings = {
        fontFamily: customFont || font,
        fontSize: customFontSize || fontSize,
      };
      
      try {
        // 使用Electron API保存设置
        if (window.electron) {
          const result = await window.electron.saveAppearanceSettings(settings);
          if (result.success) {
            setSaveStatus("已保存");
            // 清除保存状态提示
            setTimeout(() => setSaveStatus(null), 2000);
          } else {
            setSaveStatus("保存失败");
            // 清除保存状态提示
            setTimeout(() => setSaveStatus(null), 2000);
          }
        } else {
          // 回退到localStorage (用于开发时在浏览器中直接预览)
          localStorage.setItem("appearance-settings", JSON.stringify(settings));
          setSaveStatus("已保存");
          // 清除保存状态提示
          setTimeout(() => setSaveStatus(null), 2000);
        }
      } catch (error) {
        console.error("Error saving appearance settings:", error);
        setSaveStatus("保存失败");
        // 清除保存状态提示
        setTimeout(() => setSaveStatus(null), 2000);
      }
    };
    
    // 使用防抖保存设置，避免频繁写入
    const debounceTimer = setTimeout(() => {
      saveSettings();
    }, 500);
    
    return () => {
      clearTimeout(debounceTimer);
    };
  }, [font, fontSize, customFont, customFontSize, isLoading]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-medium mb-4">界面设置</h2>
        {saveStatus && (
          <div className="text-sm px-2 py-1 rounded-md bg-primary/10 text-primary">
            {saveStatus}
          </div>
        )}
      </div>
      <p className="text-muted-foreground mb-6">
        自定义应用程序的外观，包括字体和文本大小等设置。
      </p>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="font-family">字体</Label>
          <Select 
            value={font} 
            onValueChange={(value: string) => {
              setFont(value);
              setCustomFont(""); // Clear custom font when selecting a preset
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择字体" />
            </SelectTrigger>
            <SelectContent>
              {fontOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="custom-font">自定义字体</Label>
          <Input
            id="custom-font"
            placeholder="输入自定义字体，例如: 'Custom Font', sans-serif"
            value={customFont}
            onChange={(e) => setCustomFont(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            输入自定义字体的CSS字体名称，多个字体用逗号分隔作为备选
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="font-size">字体大小</Label>
          <Select 
            value={fontSize} 
            onValueChange={(value: string) => {
              setFontSize(value);
              setCustomFontSize(""); // Clear custom size when selecting a preset
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择字体大小" />
            </SelectTrigger>
            <SelectContent>
              {fontSizeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label} ({option.value})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="custom-font-size">自定义字体大小</Label>
          <Input
            id="custom-font-size"
            placeholder="输入自定义字体大小，例如: 17px"
            value={customFontSize}
            onChange={(e) => setCustomFontSize(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            输入CSS字体大小，例如: 17px, 1.2rem, 等
          </p>
        </div>
      </div>
      
      <div className="mt-6 p-4 border rounded-md">
        <h3 className="text-sm font-medium mb-2">预览</h3>
        <div 
          className="p-3 border rounded-md"
          style={{ 
            fontFamily: customFont || font,
            fontSize: customFontSize || fontSize
          }}
        >
          <p>{previewText}</p>
        </div>
        <div className="mt-2">
          <Input
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="输入文本以预览字体效果"
          />
        </div>
      </div>
    </div>
  );
} 