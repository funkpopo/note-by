"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import Cherry from "cherry-markdown";
import { Button } from "@/components/ui/button";
import { Bookmark, CheckCircle, Edit2, Info, Loader2, Save } from "lucide-react";
import { useTheme } from "next-themes";
import { Note } from "@/types/note";
import { RenameDialog } from "@/components/rename-dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

// 增强Cherry类型定义
type EnhancedCherry = Cherry & {
  getSelectedText?(): string;
  replaceSelectedText?(text: string): boolean;
};

declare module 'cherry-markdown' {
  interface Cherry {
    getValue(): string;
    setValue(text: string): void;
    setTheme?(theme: string): void;
    setCodeBlockTheme?(theme: string): void;
    destroy(): void;
    getSelection?(): string;
    replaceSelection?(text: string): void;
    editor?: {
      editor?: {
        getSelection?(): string;
        replaceSelection?(text: string): void;
      }
    };
  }
}

// 定义AI配置接口
interface AIConfigType {
  id: string;
  name: string;
  apiKey: string;
  apiUrl: string;
  organizationId?: string;
  isDefault?: boolean;
  lastTested?: Date;
}

// 在文件的适当位置定义ActionType类型
const LANGUAGE_OPTIONS = [
  { code: 'en', name: '英语' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日语' },
  { code: 'ko', name: '韩语' },
  { code: 'fr', name: '法语' },
  { code: 'de', name: '德语' },
  { code: 'es', name: '西班牙语' },
  { code: 'ru', name: '俄语' }
];

type ActionType = 'style' | 'continue' | 'check' | 'translate';

interface NoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave: () => void;
  note?: Note | null;
  onRename?: (note: Note, newName: string) => Promise<boolean>;
}

// 在文件开头ActionType定义后添加字符串转ActionType的辅助函数
function asActionType(action: string): ActionType {
  if (action === 'style' || action === 'continue' || action === 'check' || action === 'translate') {
    return action;
  }
  // 默认返回一个有效值
  return 'style';
}

export function NoteEditor({ content, onChange, onSave, note, onRename }: NoteEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const cherryRef = React.useRef<EnhancedCherry | null>(null);
  const { theme } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const isInitializedRef = useRef(false);
  const isUserEditingRef = useRef(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameStatus, setRenameStatus] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [aiConfigs, setAiConfigs] = useState<AIConfigType[]>([]);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  
  // 新增：AI响应对话框相关状态
  const [showAIResponseDialog, setShowAIResponseDialog] = useState(false);
  const [aiResponse, setAIResponse] = useState("");
  const [aiResponseAction, setAIResponseAction] = useState<ActionType | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [isResponseStreaming, setIsResponseStreaming] = useState(false);
  const [aiResponsePosition, setAIResponsePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const responseWindowRef = useRef<HTMLDivElement>(null);
  const cancelStreamingRef = useRef<(() => void) | null>(null);
  
  // 新增：窗口大小调整相关状态
  const [responseWindowSize, setResponseWindowSize] = useState({ width: 250, height: 300 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const resizeStartPosition = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef({ width: 0, height: 0 });
  
  // 获取当前主题模式
  const currentTheme = theme === "dark" ? "dark" : "light";

  // 加载AI配置
  useEffect(() => {
    const loadAIConfigs = async () => {
      try {
        const configs = await window.electron.getAIConfigs();
        setAiConfigs(configs);
        console.log("已加载AI配置:", configs);
      } catch (error) {
        console.error("加载AI配置失败:", error);
      }
    };
    
    loadAIConfigs();
  }, []);

  // 获取默认AI配置
  const getDefaultAIConfig = () => {
    const defaultConfig = aiConfigs.find(config => config.isDefault) || aiConfigs[0];
    console.log("使用默认AI配置:", defaultConfig);
    return defaultConfig;
  };

  // 处理AI助手功能
  const handleAIAssistant = async (action: ActionType, targetLang?: string) => {
    if (!cherryRef.current) return;
    
    // 获取选中的文本或整个文档
    let text = '';
    
    // 对于翻译，只使用选中的文本
    if (action === 'translate' || action === 'style' || action === 'check') {
      // 使用安全的方法获取选中文本
      text = safeGetSelectedText();
      
      // 如果没有选中文本且不是继续写作，则警告并返回
    if (!text.trim()) {
        toast.error("请先选择文本");
      return;
      }
    } else {
      // 继续写作使用整个文档
      text = cherryRef.current.getValue();
      if (!text.trim()) {
        toast.error("文档为空");
        return;
      }
    }
    
    // 保存选中的文本，以便后续替换
    setSelectedText(text);
    
    // 计算弹窗位置 - 基于当前选区
    let posX = 0;
    let posY = 0;
    
    // 尝试获取选区的位置信息
    try {
      // 获取编辑器元素位置
      const editorRect = editorRef.current?.getBoundingClientRect() || {
        left: 0, right: window.innerWidth,
        top: 0, bottom: window.innerHeight,
        width: window.innerWidth, height: window.innerHeight
      };
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // 确保窗口在编辑器范围内
        posX = Math.min(Math.max(rect.right + 10, editorRect.left + 10), editorRect.right - responseWindowSize.width - 10);
        posY = Math.min(Math.max(rect.top, editorRect.top + 10), editorRect.bottom - 100);
        
        // 如果窗口会超出编辑器底部，则调整位置
        if (posY + responseWindowSize.height > editorRect.bottom) {
          posY = Math.max(editorRect.top + 10, editorRect.bottom - responseWindowSize.height - 10);
        }
      } else {
        // 如果无法获取选区位置，则在编辑器中居中显示
        posX = editorRect.left + (editorRect.width - responseWindowSize.width) / 2;
        posY = editorRect.top + (editorRect.height - Math.min(responseWindowSize.height, editorRect.height - 20)) / 2;
      }
    } catch {
      // 出错时在编辑器中居中显示
      const editorRect = editorRef.current?.getBoundingClientRect() || {
        left: 0, right: window.innerWidth,
        top: 0, bottom: window.innerHeight,
        width: window.innerWidth, height: window.innerHeight
      };
      
      posX = editorRect.left + (editorRect.width - responseWindowSize.width) / 2;
      posY = editorRect.top + (editorRect.height - Math.min(responseWindowSize.height, editorRect.height - 20)) / 2;
    }
    
    // 设置窗口位置
    setAIResponsePosition({ x: posX, y: posY });
    
    // 获取最新的AI配置
    let config = getDefaultAIConfig();
    if (!config) {
      toast.error("未找到可用的AI配置，请先在设置中配置AI");
      return;
    }
    
    // 确保API URL是有效的
    if (!config.apiUrl) {
      config = {
        ...config,
        apiUrl: "https://api.openai.com/v1"
      };
    }
    
    // 调试日志
    console.log("AI请求配置:", {
      model: config.name,
      apiUrl: config.apiUrl,
      apiKey: config.apiKey ? "已设置" : "未设置",
      organizationId: config.organizationId || "无"
    });
    
    setIsProcessingAI(true);
    setAiMessage("处理中...");
    
    // 设置响应对话框状态
    setAIResponseAction(action);
    setShowAIResponseDialog(true);
    setAIResponse(""); // 清空之前的响应
    setIsResponseStreaming(true);
    
    try {
      // 根据选择的功能构建不同的提示词
      let systemPrompt = "你是一个文本助手，能够提供专业的写作帮助。";
      let userPrompt = "";
      
      switch (action) {
        case 'style':
          systemPrompt += "你能够改进文本的风格，使其更加专业、流畅和有吸引力。不提供任何建议，仅输出改写之后的结果";
          userPrompt = `请改写以下文本，提升其风格和表达质量，但保持原意不变，不提供任何建议，仅输出改写之后的结果:\n\n${text}`;
          break;
        case 'continue':
          systemPrompt += "你能够根据已有文本的风格和内容，提供连贯的延续内容。不提供任何建议，仅输出续写的内容";
          userPrompt = `请根据以下文本，继续写作至少100字，至多500字，保持内容风格一致，不提供任何建议，仅输出续写的内容:\n\n${text}`;
          break;
        case 'check':
          systemPrompt += "你能够检查文本中的语法、表述和逻辑问题，并进行修改，不提供任何修改建议，仅输出修改之后的结果。";
          userPrompt = `请检查以下文本中的语法和表述问题，并进行修改，不要提供任何修改建议，仅输出修改之后的结果:\n\n${text}`;
          break;
        case 'translate':
          systemPrompt += "你是一个精通多语言的翻译专家，能够保持原文的风格和语气，并正确地翻译专业术语。不提供任何建议，仅输出翻译之后的结果。";
          userPrompt = `请将以下文本翻译成${targetLang === 'zh' ? '中文' : 
                                          targetLang === 'en' ? '英文' : 
                                          targetLang === 'ja' ? '日语' : 
                                          targetLang === 'ko' ? '韩语' : 
                                          targetLang === 'fr' ? '法语' : 
                                          targetLang === 'de' ? '德语' : 
                                          targetLang === 'es' ? '西班牙语' : 
                                          targetLang === 'ru' ? '俄语' : '中文'}:\n\n${text}`;
          break;
      }
      
      try {
        // 使用非流式API调用，然后用打字机效果模拟流式输出
        const response = await window.electron.callAIAssistant({
          config: config,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        });
        
        if (response.success && response.content) {
          // 模拟打字机效果
          let i = 0;
          const fullText = response.content;
          const typeSpeed = 10; // 打字速度（毫秒/字符）
          
          // 保存用于取消的timeoutId
          const typewriterIntervalId = setInterval(() => {
            if (i < fullText.length) {
              setAIResponse(fullText.substring(0, i + 1));
              i++;
            } else {
              clearInterval(typewriterIntervalId);
              setIsResponseStreaming(false);
              setAiMessage("处理完成");
              setIsProcessingAI(false);
              setTimeout(() => setAiMessage(""), 3000);
            }
          }, typeSpeed);
          
          // 保存取消函数
          cancelStreamingRef.current = () => {
            clearInterval(typewriterIntervalId);
            setAIResponse(fullText); // 取消时显示完整文本
          };
        } else {
          setAIResponse(`AI处理失败: ${response.error || '未知错误'}`);
          setAiMessage(`AI处理失败: ${response.error || '未知错误'}`);
          setIsResponseStreaming(false);
          setIsProcessingAI(false);
          // 3秒后清除消息
          setTimeout(() => setAiMessage(""), 3000);
        }
      } catch (error) {
        console.error("AI处理错误:", error);
        setAIResponse(`处理失败: ${error instanceof Error ? error.message : "未知错误"}`);
        setAiMessage(`处理失败: ${error instanceof Error ? error.message : "未知错误"}`);
        setIsProcessingAI(false);
        setIsResponseStreaming(false);
      }
    } catch (error) {
      console.error("AI处理错误:", error);
      setAIResponse(`处理失败: ${error instanceof Error ? error.message : "未知错误"}`);
      setAiMessage(`处理失败: ${error instanceof Error ? error.message : "未知错误"}`);
      setIsProcessingAI(false);
      setIsResponseStreaming(false);
    }
  };

  // 初始化编辑器
  React.useEffect(() => {
    if (!editorRef.current) return;

    // 为editorRef.current添加id属性
    editorRef.current.id = "cherry-markdown-editor";
    
    // 读取/创建AI工具栏图标
    const aiIconSvg = `<svg fill="#6a57ff" viewBox="0 0 24.00 24.00" xmlns="http://www.w3.org/2000/svg"><path d="M19.864 8.465a3.505 3.505 0 0 0-3.03-4.449A3.005 3.005 0 0 0 14 2a2.98 2.98 0 0 0-2 .78A2.98 2.98 0 0 0 10 2c-1.301 0-2.41.831-2.825 2.015a3.505 3.505 0 0 0-3.039 4.45A4.028 4.028 0 0 0 2 12c0 1.075.428 2.086 1.172 2.832A4.067 4.067 0 0 0 3 16c0 1.957 1.412 3.59 3.306 3.934A3.515 3.515 0 0 0 9.5 22c.979 0 1.864-.407 2.5-1.059A3.484 3.484 0 0 0 14.5 22a3.51 3.51 0 0 0 3.19-2.06 4.006 4.006 0 0 0 3.138-5.108A4.003 4.003 0 0 0 22 12a4.028 4.028 0 0 0-2.136-3.535zM9.5 20c-.711 0-1.33-.504-1.47-1.198L7.818 18H7c-1.103 0-2-.897-2-2 0-.352.085-.682.253-.981l.456-.816-.784-.51A2.019 2.019 0 0 1 4 12c0-.977.723-1.824 1.682-1.972l1.693-.26-1.059-1.346a1.502 1.502 0 0 1 1.498-2.39L9 6.207V5a1 1 0 0 1 2 0v13.5c0 .827-.673 1.5-1.5 1.5zm9.575-6.308-.784.51.456.816c.168.3.253.63.253.982 0 1.103-.897 2-2.05 2h-.818l-.162.802A1.502 1.502 0 0 1 14.5 20c-.827 0-1.5-.673-1.5-1.5V5c0-.552.448-1 1-1s1 .448 1 1.05v1.207l1.186-.225a1.502 1.502 0 0 1 1.498 2.39l-1.059 1.347 1.693.26A2.002 2.002 0 0 1 20 12c0 .683-.346 1.315-.925 1.692z"/></svg>`;
    
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
      toolbars: {
        toolbar: ['bold', 'italic', 'underline', 'strikethrough', 'size', 'color', '|', 'header', 'ruby', 'list', 'checklist', 'justify', 'panel', '|', 'quote', 'hr', 'code', 'table', 'graph', '|', 'link', 'image', 'file', '|', 'undo', 'redo', '|', 'export'],
        bubble: ['bold', 'italic', 'underline', 'strikethrough', 'size', 'color', 'quote', 'code', 'link'],
        float: ['h1', 'h2', 'h3', '|', 'checklist', 'quote', 'table', 'code']
      },
      callback: {
        afterChange: (value: string) => {
          isUserEditingRef.current = true;
          onChange(value);
        },
        afterInit: () => {
          // 实现获取选中文本的方法
          const enhancedCherry = cherry as EnhancedCherry;
          if (!enhancedCherry.getSelectedText) {
            enhancedCherry.getSelectedText = function() {
              // 获取编辑器实例
              const editor = this.editor?.editor;
              if (editor && editor.getSelection) {
                return editor.getSelection() || '';
              }
              return '';
            };
          }
          
          // 实现替换选中文本的方法
          if (!enhancedCherry.replaceSelectedText) {
            enhancedCherry.replaceSelectedText = function(text: string) {
              // 获取编辑器实例
              const editor = this.editor?.editor;
              if (editor && editor.replaceSelection) {
                editor.replaceSelection(text);
                return true;
              }
              return false;
            };
          }
          
          // 编辑器初始化完成后，我们可以添加自定义的AI按钮
          try {
            // 在这里可以通过DOM操作添加自定义按钮到工具栏
            const toolbars = document.querySelectorAll('.cherry-toolbar');
            if (toolbars.length > 0) {
              toolbars.forEach(toolbar => {
                // 检查是否已经存在AI按钮
                if (!toolbar.querySelector('.ai-assistant-btn')) {
                  // 创建AI助手按钮
                  const aiButton = document.createElement('div');
                  aiButton.className = 'cherry-toolbar-button ai-assistant-btn';
                  aiButton.title = 'AI助手';
                  aiButton.innerHTML = aiIconSvg;
                  aiButton.style.width = '24px';
                  aiButton.style.height = '24px';
                  aiButton.style.margin = '0 4px';
                  aiButton.style.cursor = 'pointer';
                  
                  // 添加点击事件
                  aiButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // 创建下拉菜单
                    let menu: HTMLDivElement | null = document.querySelector('.ai-assistant-menu');
                    if (!menu) {
                      menu = document.createElement('div');
                      menu.className = 'ai-assistant-menu';
                      const menuEl = menu as HTMLDivElement;
                      menuEl.style.position = 'absolute';
                      menuEl.style.zIndex = '1000';
                      menuEl.style.backgroundColor = 'var(--background)';
                      menuEl.style.border = '1px solid var(--border)';
                      menuEl.style.borderRadius = '4px';
                      menuEl.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
                      menuEl.style.padding = '4px 0';
                      menuEl.style.minWidth = '160px';
                      
                      // 添加菜单项
                      const menuItems = [
                        { text: '风格改写', action: 'style' },
                        { text: '继续写作', action: 'continue' },
                        { text: '检查表述/语法', action: 'check' },
                        { text: '翻译', action: 'translate', hasSubmenu: true }
                      ];
                      
                      menuItems.forEach(item => {
                        const menuItem = document.createElement('div');
                        menuItem.className = 'ai-assistant-menu-item';
                        menuItem.style.padding = '6px 8px';
                        menuItem.style.cursor = 'pointer';
                        menuItem.style.display = 'flex';
                        menuItem.style.alignItems = 'center';
                        menuItem.style.justifyContent = 'space-between';
                        menuItem.style.transition = 'background-color 0.2s';
                        menuItem.textContent = item.text;
                        
                        if (item.hasSubmenu && item.action === 'translate') {
                          const arrowIcon = document.createElement('div');
                          arrowIcon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
                          arrowIcon.style.marginLeft = '8px';
                          menuItem.appendChild(arrowIcon);
                          
                          // 创建语言选择子菜单
                          const submenu = document.createElement('div') as HTMLDivElement;
                          submenu.className = 'translation-submenu';
                          submenu.style.position = 'absolute';
                          submenu.style.left = '100%';
                          submenu.style.top = '0';
                          submenu.style.backgroundColor = 'var(--background)';
                          submenu.style.border = '1px solid var(--border)';
                          submenu.style.borderRadius = '4px';
                          submenu.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
                          submenu.style.padding = '4px 0';
                          submenu.style.minWidth = '120px';
                          submenu.style.display = 'none';
                          submenu.style.zIndex = '1001';
                          
                          const languages = LANGUAGE_OPTIONS;
                          
                          languages.forEach(lang => {
                            const langItem = document.createElement('div');
                            langItem.className = 'translation-language-item';
                            langItem.style.padding = '6px 8px';
                            langItem.style.cursor = 'pointer';
                            langItem.style.transition = 'background-color 0.2s';
                            langItem.textContent = lang.name;
                            
                            langItem.addEventListener('mouseover', () => {
                              langItem.style.backgroundColor = 'var(--accent)';
                            });
                            
                            langItem.addEventListener('mouseout', () => {
                              langItem.style.backgroundColor = '';
                            });
                            
                            langItem.addEventListener('click', (e) => {
                              e.stopPropagation();
                              const selectedText = safeGetSelectedText();
                              
                              if (selectedText) {
                                handleAIAssistant('translate', lang.code);
                              } else {
                                toast.error("请先选择要翻译的文本");
                              }
                              // 关闭菜单
                              if (menu && document.body.contains(menu)) {
                                document.body.removeChild(menu);
                              }
                            });
                            
                            submenu.appendChild(langItem);
                          });
                          
                          menuItem.appendChild(submenu);
                          
                          // 显示/隐藏子菜单
                          menuItem.addEventListener('mouseover', () => {
                            submenu.style.display = 'block';
                            menuItem.style.backgroundColor = 'var(--accent)';
                          });
                          
                          menuItem.addEventListener('mouseout', (e) => {
                            const relatedTarget = e.relatedTarget as Node;
                            if (!submenu.contains(relatedTarget) && relatedTarget !== submenu) {
                              submenu.style.display = 'none';
                              menuItem.style.backgroundColor = '';
                            }
                          });
                          
                          submenu.addEventListener('mouseover', () => {
                            submenu.style.display = 'block';
                            menuItem.style.backgroundColor = 'var(--accent)';
                          });
                          
                          submenu.addEventListener('mouseout', (e) => {
                            const relatedTarget = e.relatedTarget as Node;
                            if (!menuItem.contains(relatedTarget) && relatedTarget !== menuItem) {
                              submenu.style.display = 'none';
                              menuItem.style.backgroundColor = '';
                            }
                          });
                        } else {
                          // 非翻译选项的普通菜单项
                        menuItem.addEventListener('mouseover', () => {
                          menuItem.style.backgroundColor = 'var(--accent)';
                        });
                        
                        menuItem.addEventListener('mouseout', () => {
                            menuItem.style.backgroundColor = '';
                        });
                        
                        menuItem.addEventListener('click', () => {
                            const selectedText = safeGetSelectedText();
                            
                            if (item.action !== 'continue' && !selectedText) {
                              // 显示提示：请先选择文本
                              toast.error('请先选择文本');
                            } else {
                              handleAIAssistant(asActionType(item.action));
                            }
                            // 关闭菜单
                            if (menu && document.body.contains(menu)) {
                              document.body.removeChild(menu);
                            }
                          });
                        }
                        
                        if (menu) {
                          menu.appendChild(menuItem);
                        }
                      });
                      
                      if (menu) {
                        document.body.appendChild(menu);
                      }
                      
                      // 点击外部关闭菜单
                      const closeMenu = (e: MouseEvent) => {
                        if (!menu?.contains(e.target as Node) && !aiButton?.contains?.(e.target as Node)) {
                          if (menu && document.body.contains(menu)) {
                            document.body.removeChild(menu);
                          }
                          document.removeEventListener('click', closeMenu);
                        }
                      };
                      
                      setTimeout(() => {
                        document.addEventListener('click', closeMenu);
                      }, 0);
                    }
                    
                    // 设置菜单位置
                    if (menu) {
                      const rect = aiButton.getBoundingClientRect();
                      const menuElement = menu as HTMLElement;
                      menuElement.style.top = `${rect.bottom + 5}px`;
                      menuElement.style.left = `${rect.left}px`;
                    }
                  });
                  
                  // 添加到工具栏
                  toolbar.appendChild(aiButton);
                }
              });
            }
          } catch (error) {
            console.error("添加AI助手按钮失败:", error);
          }
        }
      },
    });

    cherryRef.current = cherry;
    isInitializedRef.current = true;

    // 清理函数
    return () => {
      if (cherryRef.current) {
        cherryRef.current.destroy();
        cherryRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, []);

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

  // 只有在笔记切换时或初次加载时才更新编辑器内容
  React.useEffect(() => {
    if (!cherryRef.current || !isInitializedRef.current) return;
    
    // 当笔记切换时，强制更新编辑器内容
    if (content !== cherryRef.current.getValue()) {
      cherryRef.current.setValue(content);
    }
    
    // 重置用户编辑状态标志
    isUserEditingRef.current = false;
  }, [content, note?.path]);

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

  // 处理重命名
  const handleRename = async (newName: string) => {
    if (!note || !onRename) return;
    
    try {
      const success = await onRename(note, newName);
      
      if (success) {
        setRenameStatus({
          message: "重命名成功",
          type: 'success'
        });
        
        // 3秒后清除消息
        setTimeout(() => {
          setRenameStatus(null);
        }, 3000);
      } else {
        setRenameStatus({
          message: "重命名失败",
          type: 'error'
        });
      }
    } catch (error) {
      console.error("重命名出错:", error);
      setRenameStatus({
        message: "重命名出错",
        type: 'error'
      });
    } finally {
      setIsRenameOpen(false);
    }
  };

  // 简单的toast通知对象，用于显示错误消息
  const toast = {
    error: (message: string) => {
      setAiMessage(message);
      setTimeout(() => setAiMessage(""), 3000);
    }
  };
  
  // 安全地获取选中的文本
  const safeGetSelectedText = () => {
    // 首先尝试使用window.getSelection()
    if (window.getSelection) {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        return selection.toString();
      }
    }
    
    // 如果Cherry实例存在，尝试使用它
    if (cherryRef.current) {
      try {
        // 尝试使用getSelectedText方法
        const cherry = cherryRef.current as EnhancedCherry;
        if (typeof cherry.getSelectedText === 'function') {
          const selectedText = cherry.getSelectedText();
          if (selectedText && selectedText.trim()) {
            return selectedText;
          }
        }
        
        // 尝试通过编辑器实例获取
        if (cherry.editor && 
            cherry.editor.editor && 
            typeof cherry.editor.editor.getSelection === 'function') {
          const selectedText = cherry.editor.editor.getSelection();
          if (selectedText && selectedText.trim()) {
            return selectedText;
          }
        }
      } catch (e) {
        console.error('Error getting selected text from Cherry:', e);
      }
    }
    
    return '';
  };
  
  // 安全地替换选中的文本
  const safeReplaceSelectedText = (text: string) => {
    if (!cherryRef.current) return false;
    
    try {
      // 使用类型断言来避免TypeScript错误
      const cherry = cherryRef.current as EnhancedCherry;
      
      // 尝试直接使用replaceSelectedText方法
      if (typeof cherry.replaceSelectedText === 'function') {
        cherry.replaceSelectedText(text);
        return true;
      }
      
      // 尝试通过编辑器实例替换
      if (cherry.editor && 
          cherry.editor.editor && 
          typeof cherry.editor.editor.replaceSelection === 'function') {
        cherry.editor.editor.replaceSelection(text);
        return true;
      }
    } catch (e) {
      console.error('Error replacing selected text in Cherry:', e);
    }
    
    return false;
  };
  
  // 处理AI响应的应用
  const handleApplyAIResponse = () => {
    if (!cherryRef.current || !aiResponse) return;
    
    if (aiResponseAction === 'continue') {
      // 对于继续写作，我们将响应追加到文档末尾
      const currentText = cherryRef.current.getValue();
      cherryRef.current.setValue(currentText + "\n\n" + aiResponse);
    } else if (selectedText && (aiResponseAction === 'translate' || aiResponseAction === 'style' || aiResponseAction === 'check')) {
      // 对于翻译和风格改写，我们替换选中的文本
      safeReplaceSelectedText(aiResponse);
    }
    
    // 关闭对话框
    setShowAIResponseDialog(false);
    setAIResponse("");
    setAIResponseAction(null);
    setSelectedText("");
    setIsProcessingAI(false);
  };
  
  // 关闭AI响应对话框
  const closeAIResponseDialog = () => {
    // 如果正在流式传输，取消请求
    if (isResponseStreaming && cancelStreamingRef.current) {
      cancelStreamingRef.current();
    }
    
    setShowAIResponseDialog(false);
    setAIResponse("");
    setAIResponseAction(null);
    setSelectedText("");
    cancelStreamingRef.current = null;
    setIsProcessingAI(false);
  };

  // 取消当前正在进行的打字机效果
  const handleCancelStreaming = () => {
    if (cancelStreamingRef.current) {
      cancelStreamingRef.current();
      cancelStreamingRef.current = null;
    }
    setIsResponseStreaming(false);
    setIsProcessingAI(false);
    setAiMessage("已取消请求");
    setTimeout(() => setAiMessage(""), 3000);
  };

  // 处理窗口拖动开始
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (!responseWindowRef.current) return;
    
    // 获取当前窗口位置
    const rect = responseWindowRef.current.getBoundingClientRect();
    
    // 计算鼠标在窗口内的偏移
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    
    setIsDragging(true);
    
    // 添加全局事件处理
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };
  
  // 处理窗口拖动中
  const handleDragMove = (e: MouseEvent) => {
    if (!isDragging || !responseWindowRef.current || !editorRef.current) return;
    
    // 获取编辑器范围以限制窗口位置
    const editorRect = editorRef.current.getBoundingClientRect();
    
    // 计算新位置
    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;
    
    // 限制窗口位置在编辑器区域内
    newX = Math.max(editorRect.left, Math.min(newX, editorRect.right - responseWindowSize.width));
    newY = Math.max(editorRect.top, Math.min(newY, editorRect.bottom - 80)); // 留出底部操作按钮的空间
    
    // 更新窗口位置
    setAIResponsePosition({ x: newX, y: newY });
  };
  
  // 处理拖动结束
  const handleDragEnd = () => {
    setIsDragging(false);
  };
  
  // 添加和移除全局鼠标事件监听
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging, dragOffset]);

  // 添加和移除调整大小的事件监听
  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!isResizing || !resizeDirection) return;
      
      e.preventDefault();
      
      const deltaX = e.clientX - resizeStartPosition.current.x;
      const deltaY = e.clientY - resizeStartPosition.current.y;
      let newWidth = resizeStartSize.current.width;
      let newHeight = resizeStartSize.current.height;
      
      // 根据调整方向修改尺寸
      if (resizeDirection.includes('e')) {
        newWidth = Math.max(300, resizeStartSize.current.width + deltaX);
      }
      if (resizeDirection.includes('s')) {
        newHeight = Math.max(200, resizeStartSize.current.height + deltaY);
      }
      if (resizeDirection.includes('w')) {
        const widthDelta = -deltaX;
        newWidth = Math.max(300, resizeStartSize.current.width + widthDelta);
        // 同时为西侧调整位置
        setAIResponsePosition(prev => ({
          x: Math.min(prev.x - widthDelta, window.innerWidth - 300),
          y: prev.y
        }));
      }
      if (resizeDirection.includes('n')) {
        const heightDelta = -deltaY;
        newHeight = Math.max(200, resizeStartSize.current.height + heightDelta);
        // 同时为北侧调整位置
        setAIResponsePosition(prev => ({
          x: prev.x,
          y: Math.min(prev.y - heightDelta, window.innerHeight - 200)
        }));
      }
      
      // 应用新尺寸
      setResponseWindowSize({ width: newWidth, height: newHeight });
    };
    
    const handleResizeEnd = () => {
      setIsResizing(false);
      setResizeDirection(null);
    };
    
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing, resizeDirection]);

  // 处理调整大小开始
  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeDirection(direction);
    
    // 存储初始鼠标位置
    resizeStartPosition.current = { x: e.clientX, y: e.clientY };
    // 存储初始窗口大小
    resizeStartSize.current = { ...responseWindowSize };
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-2 flex justify-between items-center bg-card shadow-sm">
        <div className="flex items-center">
          {note && (
            <div className="flex items-center mr-4">
              <Bookmark className="h-4 w-4 mr-1 text-primary" />
              <span className="text-sm font-medium">{note.name.replace(/\.md$/, "")}</span>
              {note.group && note.group !== "default" && (
                <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                  {note.group}
                </span>
              )}
              {onRename && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="ml-1 h-6 w-6" 
                  onClick={(e) => { e.stopPropagation(); setIsRenameOpen(true); }}
                  title="重命名文档"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {saveMessage && (
            <div className="flex items-center text-sm bg-card/80 px-3 py-1 rounded-md shadow-sm border border-border/50">
              {saveMessage === "保存成功" ? (
                <CheckCircle className="h-4 w-4 mr-1.5 text-green-500" />
              ) : (
                <Info className="h-4 w-4 mr-1.5 text-red-500" />
              )}
              <span className={saveMessage === "保存成功" ? "text-green-500" : "text-red-500"}>
                {saveMessage}
              </span>
            </div>
          )}
          
          {renameStatus && (
            <div className="flex items-center text-sm bg-card/80 px-3 py-1 rounded-md shadow-sm border border-border/50">
              {renameStatus.type === 'success' ? (
                <CheckCircle className="h-4 w-4 mr-1.5 text-green-500" />
              ) : (
                <Info className="h-4 w-4 mr-1.5 text-red-500" />
              )}
              <span className={renameStatus.type === 'success' ? "text-green-500" : "text-red-500"}>
                {renameStatus.message}
              </span>
            </div>
          )}
          
          {aiMessage && (
            <div className="flex items-center text-sm bg-card/80 px-3 py-1 rounded-md shadow-sm border border-border/50">
              {isProcessingAI ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin text-primary" />
              ) : (
                <Info className="h-4 w-4 mr-1.5 text-primary" />
              )}
              <span className="text-primary">{aiMessage}</span>
            </div>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2" disabled={isProcessingAI}>
                <img src="/brain.svg" alt="AI" className="w-4 h-4" />
                AI助手
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleAIAssistant('style')}>
                风格改写
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAIAssistant('continue')}>
                继续写作
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAIAssistant('check')}>
                检查表述/语法
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>翻译</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => {
                        const selectedText = safeGetSelectedText();
                        if (selectedText.trim()) {
                          handleAIAssistant('translate', lang.code);
                        } else {
                          toast.error("请先选择要翻译的文本");
                        }
                      }}
                    >
                      {lang.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            variant="secondary"
            size="sm" 
            onClick={handleSave} 
            disabled={isSaving} 
            className="px-4"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            保存
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto h-full">
        <div ref={editorRef} className="h-full w-full" />
      </div>
      
      {note && (
        <RenameDialog
          isOpen={isRenameOpen}
          onClose={() => setIsRenameOpen(false)}
          onRename={handleRename}
          currentName={note.name}
        />
      )}
      
      {/* AI处理消息 */}
      {aiMessage && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-background border border-border rounded-md px-4 py-2 shadow-md z-50 flex items-center">
          {isProcessingAI && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <span>{aiMessage}</span>
        </div>
      )}
      
      {/* AI响应对话框 */}
      {showAIResponseDialog && (
        <div 
          ref={responseWindowRef}
          className="absolute z-50 shadow-xl" 
          style={{
            width: `${responseWindowSize.width}px`,
            maxHeight: '70vh',
            backgroundColor: 'var(--background)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            overflow: 'hidden',
            top: `${aiResponsePosition.y}px`,
            left: `${aiResponsePosition.x}px`,
            position: 'absolute',
          }}
        >
          {/* 顶部栏 - 仅包含关闭按钮和拖动区域 */}
          <div 
            className="h-8 w-full flex items-center justify-end border-b bg-muted/30 cursor-move px-2"
            onMouseDown={handleDragStart}
          >
            {isResponseStreaming && <Loader2 className="h-3.5 w-3.5 animate-spin absolute left-3" />}
            <div className="flex items-center gap-1">
              <button 
                onClick={closeAIResponseDialog}
                className="text-muted-foreground hover:text-foreground rounded p-1 hover:bg-muted"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* 添加调整大小的手柄 */}
          <div className="absolute top-0 right-0 w-2 h-2 cursor-ne-resize" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
          <div className="absolute bottom-0 right-0 w-2 h-2 cursor-se-resize" onMouseDown={(e) => handleResizeStart(e, 'se')} />
          <div className="absolute bottom-0 left-0 w-2 h-2 cursor-sw-resize" onMouseDown={(e) => handleResizeStart(e, 'sw')} />
          <div className="absolute top-0 left-0 w-2 h-2 cursor-nw-resize" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
          <div className="absolute top-0 left-2 right-2 h-1 cursor-n-resize" onMouseDown={(e) => handleResizeStart(e, 'n')} />
          <div className="absolute bottom-0 left-2 right-2 h-1 cursor-s-resize" onMouseDown={(e) => handleResizeStart(e, 's')} />
          <div className="absolute left-0 top-2 bottom-2 w-1 cursor-w-resize" onMouseDown={(e) => handleResizeStart(e, 'w')} />
          <div className="absolute right-0 top-2 bottom-2 w-1 cursor-e-resize" onMouseDown={(e) => handleResizeStart(e, 'e')} />
          
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 78px)' }}>
            <div className="p-3">
              <div className="whitespace-pre-wrap break-words text-sm">{aiResponse}</div>
            </div>
          </div>
          
          <div className="p-2 border-t flex justify-end gap-2 bg-muted/30 w-full">
            {isResponseStreaming ? (
              <Button variant="destructive" size="sm" onClick={handleCancelStreaming} className="h-7 text-xs">
                取消生成
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={closeAIResponseDialog} className="h-7 text-xs">
                  取消
                </Button>
                <Button size="sm" onClick={handleApplyAIResponse} disabled={isResponseStreaming || !aiResponse} className="h-7 text-xs">
                  应用到文档
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 