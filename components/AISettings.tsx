'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, Save, AlertCircle, CheckCircle, Zap, X, Brain, Pencil, Plus, ArrowRight, Edit, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIProvider, getAIProviders, saveAIProviders, callAI, getAIPrompts, saveAIPrompts, AIPrompt, AIPrompts, defaultPrompts } from '@/lib/ai-utils';

interface AISettingsProps {
  onBack?: () => void;
}

// 测试结果模态框组件
interface TestResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: { success: boolean; message: string; content?: string } | null;
  providerName: string;
}

function TestResultModal({ isOpen, onClose, result, providerName }: TestResultModalProps) {
  if (!isOpen || !result) return null;
  
  const handleCopyToClipboard = () => {
    if (result.content) {
      navigator.clipboard.writeText(result.content)
        .then(() => {
          alert('已复制到剪贴板');
        })
        .catch(err => {
          console.error('复制失败:', err);
        });
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card border rounded-lg shadow-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            {result.success ? (
              <CheckCircle className="text-green-500" size={20} />
            ) : (
              <AlertCircle className="text-red-500" size={20} />
            )}
            {providerName} 测试结果
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X size={18} />
          </Button>
        </div>
        
        <div className={cn(
          "p-4 rounded-md mb-4",
          result.success 
            ? "bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800" 
            : "bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800"
        )}>
          <p className={cn(
            "text-sm",
            result.success ? "text-green-800 dark:text-green-400" : "text-red-800 dark:text-red-400"
          )}>
            {result.message}
          </p>
        </div>
        
        {result.success && result.content && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium">完整回复</h4>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={handleCopyToClipboard}
              >
                复制
              </Button>
            </div>
            <div className="bg-muted/50 rounded-md p-3 text-xs max-h-40 overflow-y-auto">
              {result.content}
            </div>
          </div>
        )}
        
        <div className="flex justify-end">
          <Button onClick={onClose}>关闭</Button>
        </div>
      </div>
    </div>
  );
}

// 确认对话框组件
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

function ConfirmDialog({ isOpen, onClose, onConfirm, title, message }: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card border rounded-lg shadow-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button variant="destructive" onClick={onConfirm}>确认删除</Button>
        </div>
      </div>
    </div>
  );
}

// 简单的通知组件
interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <div className={cn(
      "fixed bottom-4 right-4 p-4 rounded-lg shadow-lg flex items-center gap-2 z-50 max-w-md animate-in slide-in-from-right",
      type === 'success' 
        ? "bg-green-100 text-green-800 dark:bg-green-900/80 dark:text-green-300 border border-green-200 dark:border-green-800" 
        : "bg-red-100 text-red-800 dark:bg-red-900/80 dark:text-red-300 border border-red-200 dark:border-red-800"
    )}>
      {type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
      <span className="text-sm">{message}</span>
      <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6 ml-2">
        <X size={14} />
      </Button>
    </div>
  );
}

export default function AISettings({ onBack }: AISettingsProps) {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [newProvider, setNewProvider] = useState<AIProvider>({
    id: '',
    name: '',
    apiEndpoint: '',
    apiKey: '',
    model: '',
    isDefault: false
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; content?: string } | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [currentTestProvider, setCurrentTestProvider] = useState<AIProvider | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // AI 提示词设置相关状态
  const [prompts, setPrompts] = useState<AIPrompts | null>(null);
  const [activeTab, setActiveTab] = useState<'providers' | 'prompts'>('providers');
  const [expandedPromptType, setExpandedPromptType] = useState<keyof AIPrompts | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<{
    type: keyof AIPrompts;
    prompt: AIPrompt;
    isNew: boolean;
  } | null>(null);

  // 加载保存的AI提供商设置
  useEffect(() => {
    const loadProviders = () => {
      try {
        const savedProviders = getAIProviders();
        setProviders(savedProviders);
      } catch (error) {
        console.error('加载AI提供商设置失败:', error);
        setStatusMessage('加载设置失败');
        setSaveStatus('error');
      }
    };

    loadProviders();
  }, []);

  // 加载保存的 AI 提示词设置
  useEffect(() => {
    const loadPrompts = async () => {
      try {
        const savedPrompts = await getAIPrompts();
        setPrompts(savedPrompts);
      } catch (error) {
        console.error('加载AI提示词设置失败:', error);
        // 使用默认提示词
        setPrompts(defaultPrompts);
      }
    };

    loadPrompts();
  }, []);

  // 添加新的AI提供商
  const handleAddProvider = () => {
    if (!newProvider.name || !newProvider.apiEndpoint) {
      setSaveStatus('error');
      setStatusMessage('名称和API端点为必填项');
      return;
    }

    let updatedProviders: AIProvider[];
    
    if (editingProviderId) {
      // 更新现有提供商
      updatedProviders = providers.map(p => 
        p.id === editingProviderId 
          ? { ...newProvider, id: editingProviderId } 
          : (newProvider.isDefault ? { ...p, isDefault: false } : p)
      );
    } else {
      // 添加新提供商
      const updatedProvider = {
        ...newProvider,
        id: Date.now().toString(),
        isDefault: providers.length === 0 ? true : newProvider.isDefault
      };

      // 如果设置为默认，则将其他提供商设置为非默认
      let tempProviders = [...providers];
      if (updatedProvider.isDefault) {
        tempProviders = tempProviders.map(p => ({ ...p, isDefault: false }));
      }

      updatedProviders = [...tempProviders, updatedProvider];
    }
    
    setProviders(updatedProviders);
    setNewProvider({
      id: '',
      name: '',
      apiEndpoint: '',
      apiKey: '',
      model: '',
      isDefault: false
    });
    setIsEditing(false);
    setEditingProviderId(null);
    
    // 保存到本地存储
    setTimeout(() => {
      saveAIProviders(updatedProviders);
      setSaveStatus('success');
      setStatusMessage(editingProviderId ? '提供商已更新' : '提供商已添加');
      
      // 3秒后重置状态
      setTimeout(() => {
        setSaveStatus('idle');
        setStatusMessage('');
      }, 3000);
    }, 0);
  };

  // 编辑现有提供商
  const handleEditProvider = (id: string) => {
    const provider = providers.find(p => p.id === id);
    if (!provider) return;
    
    setNewProvider({ ...provider });
    setEditingProviderId(id);
    setIsEditing(true);
  };

  // 删除AI提供商
  const handleDeleteProvider = (id: string) => {
    const providerToDelete = providers.find(p => p.id === id);
    const updatedProviders = providers.filter(p => p.id !== id);
    
    // 如果删除的是默认提供商，则将第一个提供商设置为默认
    if (providerToDelete?.isDefault && updatedProviders.length > 0) {
      updatedProviders[0].isDefault = true;
    }
    
    setProviders(updatedProviders);
    
    // 保存到本地存储
    setTimeout(() => {
      saveAIProviders(updatedProviders);
      setSaveStatus('success');
      setStatusMessage('提供商已删除');
      
      // 3秒后重置状态
      setTimeout(() => {
        setSaveStatus('idle');
        setStatusMessage('');
      }, 3000);
    }, 0);
  };

  // 确认删除提供商
  const confirmDeleteProvider = (id: string) => {
    setProviderToDelete(id);
    setShowDeleteConfirm(true);
  };

  // 执行删除操作
  const executeDelete = () => {
    if (providerToDelete) {
      handleDeleteProvider(providerToDelete);
      setProviderToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  // 设置默认AI提供商
  const handleSetDefault = (id: string) => {
    const updatedProviders = providers.map(p => ({
      ...p,
      isDefault: p.id === id
    }));
    
    setProviders(updatedProviders);
    
    // 保存到本地存储
    setTimeout(() => {
      saveAIProviders(updatedProviders);
      setSaveStatus('success');
      setStatusMessage('设置已保存');
      
      // 3秒后重置状态
      setTimeout(() => {
        setSaveStatus('idle');
        setStatusMessage('');
      }, 3000);
    }, 0);
  };

  // 测试AI提供商
  const handleTestProvider = async (id: string) => {
    const provider = providers.find(p => p.id === id);
    if (!provider) return;
    
    setTestingProvider(id);
    setTestResult(null);
    setCurrentTestProvider(provider);
    
    try {
      // 发送一个简单的测试消息
      const testPrompt = "请回复一个简短的测试消息，确认API连接正常。";
      const result = await callAI(testPrompt, id);
      
      if (result.success && result.content) {
        setTestResult({
          success: true,
          message: `测试成功! 回复: "${result.content.substring(0, 100)}${result.content.length > 100 ? '...' : ''}"`,
          content: result.content
        });
        
        // 显示成功通知
        setToast({
          message: `${provider.name} 连接测试成功!`,
          type: 'success'
        });
        
        // 显示测试结果模态框
        setShowTestModal(true);
      } else {
        setTestResult({
          success: false,
          message: result.error || '测试失败，未收到有效回复'
        });
        
        // 显示错误通知
        setToast({
          message: `${provider.name} 连接测试失败: ${result.error || '未收到有效回复'}`,
          type: 'error'
        });
        
        setShowTestModal(true);
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `测试失败: ${error instanceof Error ? error.message : String(error)}`
      });
      
      // 显示错误通知
      setToast({
        message: `${provider.name} 连接测试失败: ${error instanceof Error ? error.message : String(error)}`,
        type: 'error'
      });
      
      setShowTestModal(true);
    } finally {
      setTestingProvider(null);
    }
  };

  // 快速添加OpenAI配置
  const handleQuickAddOpenAI = () => {
    setNewProvider({
      id: '',
      name: 'OpenAI',
      apiEndpoint: 'https://api.openai.com/v1/chat/completions',
      apiKey: '',
      model: 'gpt-3.5-turbo',
      isDefault: providers.length === 0
    });
    setIsEditing(true);
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
      understand: <Brain size={18} />,
      rewrite: <Pencil size={18} />,
      expand: <Plus size={18} />,
      continue: <ArrowRight size={18} />
    };
    
    return iconMap[type] || null;
  };

  // 添加新的提示词
  const handleAddPrompt = (type: keyof AIPrompts) => {
    setEditingPrompt({
      type,
      prompt: {
        id: `new-${Date.now()}`,
        name: '',
        prompt: '',
        isDefault: false
      },
      isNew: true
    });
  };

  // 编辑现有提示词
  const handleEditPrompt = (type: keyof AIPrompts, prompt: AIPrompt) => {
    setEditingPrompt({
      type,
      prompt: { ...prompt },
      isNew: false
    });
  };

  // 删除提示词
  const handleDeletePrompt = async (type: keyof AIPrompts, id: string) => {
    if (!prompts) return;

    // 创建新的提示词列表，排除要删除的提示词
    const updatedPromptList = prompts[type].filter(p => p.id !== id);
    
    // 如果删除的是默认提示词，则将第一个提示词设置为默认
    if (prompts[type].find(p => p.id === id)?.isDefault && updatedPromptList.length > 0) {
      updatedPromptList[0].isDefault = true;
    }
    
    // 更新提示词列表
    const updatedPrompts = {
      ...prompts,
      [type]: updatedPromptList
    };
    
    setPrompts(updatedPrompts);
    
    // 保存到设置
    try {
      await saveAIPrompts(updatedPrompts);
      setToast({
        message: '提示词已删除',
        type: 'success'
      });
    } catch (error) {
      console.error('删除提示词失败:', error);
      setToast({
        message: '删除提示词失败',
        type: 'error'
      });
    }
  };

  // 设置默认提示词
  const handleSetDefaultPrompt = async (type: keyof AIPrompts, id: string) => {
    if (!prompts) return;

    // 更新提示词列表，设置选中的提示词为默认
    const updatedPromptList = prompts[type].map(p => ({
      ...p,
      isDefault: p.id === id
    }));
    
    // 更新提示词列表
    const updatedPrompts = {
      ...prompts,
      [type]: updatedPromptList
    };
    
    setPrompts(updatedPrompts);
    
    // 保存到设置
    try {
      await saveAIPrompts(updatedPrompts);
      setToast({
        message: '默认提示词已设置',
        type: 'success'
      });
    } catch (error) {
      console.error('设置默认提示词失败:', error);
      setToast({
        message: '设置默认提示词失败',
        type: 'error'
      });
    }
  };

  // 保存编辑中的提示词
  const handleSavePrompt = async () => {
    if (!editingPrompt || !prompts) return;

    const { type, prompt, isNew } = editingPrompt;
    
    // 验证输入
    if (!prompt.name.trim() || !prompt.prompt.trim()) {
      setToast({
        message: '名称和提示词内容不能为空',
        type: 'error'
      });
      return;
    }

    let updatedPromptList: AIPrompt[];
    
    if (isNew) {
      // 添加新提示词
      updatedPromptList = [
        ...prompts[type],
        {
          ...prompt,
          id: `prompt-${Date.now()}`
        }
      ];
    } else {
      // 更新现有提示词
      updatedPromptList = prompts[type].map(p => 
        p.id === prompt.id ? prompt : (prompt.isDefault ? { ...p, isDefault: false } : p)
      );
    }
    
    // 如果只有一个提示词，确保它是默认的
    if (updatedPromptList.length === 1) {
      updatedPromptList[0].isDefault = true;
    }
    
    // 确保至少有一个默认提示词
    if (!updatedPromptList.some(p => p.isDefault)) {
      updatedPromptList[0].isDefault = true;
    }
    
    // 更新提示词列表
    const updatedPrompts = {
      ...prompts,
      [type]: updatedPromptList
    };
    
    setPrompts(updatedPrompts);
    setEditingPrompt(null);
    
    // 保存到设置
    try {
      await saveAIPrompts(updatedPrompts);
      setToast({
        message: isNew ? '提示词已添加' : '提示词已更新',
        type: 'success'
      });
    } catch (error) {
      console.error('保存提示词失败:', error);
      setToast({
        message: '保存提示词失败',
        type: 'error'
      });
    }
  };

  // 重置提示词为默认值
  const handleResetPrompts = async () => {
    if (window.confirm('确定要将所有提示词重置为默认值吗？此操作不可撤销。')) {
      setPrompts(defaultPrompts);
      
      // 保存到设置
      try {
        await saveAIPrompts(defaultPrompts);
        setToast({
          message: '提示词已重置为默认值',
          type: 'success'
        });
      } catch (error) {
        console.error('重置提示词失败:', error);
        setToast({
          message: '重置提示词失败',
          type: 'error'
        });
      }
    }
  };

  return (
    <div className="w-full h-screen flex flex-col">
      {/* 顶部导航栏 */}
      <div className="flex items-center p-4 border-b bg-card">
        <div className="flex-1">
          <h1 className="text-xl font-bold">AI 设置</h1>
          <p className="text-sm text-muted-foreground">配置AI提供商和提示词</p>
        </div>
        {onBack && (
          <Button onClick={onBack} variant="outline">
            返回
          </Button>
        )}
      </div>
      
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-6">
          {/* 状态消息 */}
          {saveStatus !== 'idle' && (
            <div className={cn(
              "mb-6 p-4 rounded-lg flex items-center gap-2",
              saveStatus === 'success' ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : 
              "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
            )}>
              {saveStatus === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span>{statusMessage}</span>
            </div>
          )}
          
          {/* 选项卡 */}
          <div className="border-b mb-6">
            <div className="flex">
              <button
                className={cn(
                  "px-4 py-2 font-medium text-sm border-b-2 -mb-px",
                  activeTab === 'providers' 
                    ? "border-primary text-primary" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActiveTab('providers')}
              >
                提供商设置
              </button>
              <button
                className={cn(
                  "px-4 py-2 font-medium text-sm border-b-2 -mb-px",
                  activeTab === 'prompts' 
                    ? "border-primary text-primary" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActiveTab('prompts')}
              >
                提示词设置
              </button>
            </div>
          </div>
          
          {activeTab === 'providers' ? (
            <>
              {/* 已配置的AI提供商列表（保持现有代码不变）*/}
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">已配置的AI提供商</h2>
                
                {providers.length === 0 ? (
                  <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed">
                    <p className="text-muted-foreground">尚未配置任何AI提供商</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {providers.map(provider => (
                      <div key={provider.id} className="bg-card border rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{provider.name}</h3>
                              {provider.isDefault && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                  默认
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">端点: {provider.apiEndpoint}</p>
                            {provider.model && (
                              <p className="text-sm text-muted-foreground">模型: {provider.model}</p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              API密钥: {provider.apiKey ? '••••••••' + provider.apiKey.slice(-4) : '未设置'}
                            </p>
                            
                            {/* 测试中状态显示 */}
                            {testingProvider === provider.id && (
                              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-primary"></div>
                                <span>测试中...</span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="gap-1"
                              onClick={() => handleTestProvider(provider.id)}
                              disabled={testingProvider !== null}
                            >
                              <Zap size={14} />
                              测试
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditProvider(provider.id)}
                            >
                              编辑
                            </Button>
                            {!provider.isDefault && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleSetDefault(provider.id)}
                              >
                                设为默认
                              </Button>
                            )}
                            <Button 
                              variant="destructive" 
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => confirmDeleteProvider(provider.id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* 添加新的AI提供商（保持现有代码不变）*/}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">添加新的AI提供商</h2>
                  {!isEditing && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-1"
                        onClick={handleQuickAddOpenAI}
                      >
                        <Zap size={14} />
                        快速添加 OpenAI
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-1"
                        onClick={() => setIsEditing(true)}
                      >
                        <PlusCircle size={16} />
                        自定义添加
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* 添加OpenAI API配置指南 */}
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-400 mb-2">OpenAI API 配置指南</h3>
                  <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc pl-4">
                    <li>API端点: <code className="bg-blue-100 dark:bg-blue-800/50 px-1 rounded">https://api.openai.com/v1/chat/completions</code></li>
                    <li>模型名称: <code className="bg-blue-100 dark:bg-blue-800/50 px-1 rounded">gpt-3.5-turbo</code> 或 <code className="bg-blue-100 dark:bg-blue-800/50 px-1 rounded">gpt-4</code></li>
                    <li>API密钥: 在 <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI平台</a> 获取</li>
                  </ul>
                </div>
                
                {isEditing && (
                  <div className="bg-card border rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-base font-medium">
                        {editingProviderId ? '编辑提供商' : '添加新提供商'}
                      </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">名称 *</label>
                        <input
                          type="text"
                          value={newProvider.name}
                          onChange={(e) => setNewProvider({...newProvider, name: e.target.value})}
                          placeholder="例如: OpenAI, Anthropic"
                          className="w-full px-3 py-2 border rounded-md bg-background"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">API端点 *</label>
                        <input
                          type="text"
                          value={newProvider.apiEndpoint}
                          onChange={(e) => setNewProvider({...newProvider, apiEndpoint: e.target.value})}
                          placeholder="例如: https://api.openai.com/v1/chat/completions"
                          className="w-full px-3 py-2 border rounded-md bg-background"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">API密钥</label>
                        <input
                          type="password"
                          value={newProvider.apiKey}
                          onChange={(e) => setNewProvider({...newProvider, apiKey: e.target.value})}
                          placeholder="输入API密钥"
                          className="w-full px-3 py-2 border rounded-md bg-background"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">模型名称</label>
                        <input
                          type="text"
                          value={newProvider.model}
                          onChange={(e) => setNewProvider({...newProvider, model: e.target.value})}
                          placeholder="例如: gpt-4, claude-3"
                          className="w-full px-3 py-2 border rounded-md bg-background"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center mb-4">
                      <input
                        type="checkbox"
                        id="isDefault"
                        checked={newProvider.isDefault}
                        onChange={(e) => setNewProvider({...newProvider, isDefault: e.target.checked})}
                        className="mr-2"
                      />
                      <label htmlFor="isDefault" className="text-sm">设为默认提供商</label>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsEditing(false);
                          setEditingProviderId(null);
                          setNewProvider({
                            id: '',
                            name: '',
                            apiEndpoint: '',
                            apiKey: '',
                            model: '',
                            isDefault: false
                          });
                        }}
                      >
                        取消
                      </Button>
                      <Button 
                        onClick={handleAddProvider}
                        className="gap-1"
                      >
                        <Save size={16} />
                        {editingProviderId ? '更新' : '保存'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            // 提示词设置选项卡
            <>
              {/* 头部和重置按钮 */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">AI 提示词设置</h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleResetPrompts}
                  className="gap-1"
                >
                  <Zap size={14} />
                  重置为默认值
                </Button>
              </div>
              
              {/* 提示词说明 */}
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-400 mb-2">使用提示词模板</h3>
                <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                  您可以在提示词中使用 <code className="bg-blue-100 dark:bg-blue-800/50 px-1 rounded">{'{{content}}'}</code> 作为占位符，它将在运行时被替换为用户选择的文本内容。
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  例如: &ldquo;请帮我分析以下文本：<code className="bg-blue-100 dark:bg-blue-800/50 px-1 rounded">{'{{content}}'}</code>&rdquo;
                </p>
              </div>
              
              {prompts ? (
                <div className="space-y-4">
                  {Object.keys(prompts).map((typeKey) => {
                    const type = typeKey as keyof AIPrompts;
                    const promptList = prompts[type];
                    const isExpanded = expandedPromptType === type;
                    
                    return (
                      <div key={type} className="border rounded-lg overflow-hidden">
                        {/* 提示词类型标题和切换按钮 */}
                        <div 
                          className="flex items-center justify-between p-4 bg-card cursor-pointer"
                          onClick={() => setExpandedPromptType(isExpanded ? null : type)}
                        >
                          <div className="flex items-center gap-2">
                            {getPromptTypeIcon(type)}
                            <h3 className="font-medium">{getPromptTypeName(type)}</h3>
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              {promptList.length} 个提示词
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddPrompt(type);
                              }}
                            >
                              <PlusCircle size={16} />
                            </Button>
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </div>
                        </div>
                        
                        {/* 提示词列表 */}
                        {isExpanded && (
                          <div className="border-t">
                            {promptList.length === 0 ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                没有自定义提示词。点击 + 按钮添加。
                              </div>
                            ) : (
                              <div className="divide-y">
                                {promptList.map(prompt => (
                                  <div key={prompt.id} className="p-4">
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <h4 className="font-medium">{prompt.name}</h4>
                                          {prompt.isDefault && (
                                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                              默认
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                                          {prompt.prompt.length > 100 
                                            ? `${prompt.prompt.substring(0, 100)}...` 
                                            : prompt.prompt}
                                        </p>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => handleEditPrompt(type, prompt)}
                                        >
                                          <Edit size={14} />
                                        </Button>
                                        {!prompt.isDefault && (
                                          <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => handleSetDefaultPrompt(type, prompt.id)}
                                          >
                                            设为默认
                                          </Button>
                                        )}
                                        <Button 
                                          variant="destructive" 
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => handleDeletePrompt(type, prompt.id)}
                                          // 禁用删除默认提示词，如果它是最后一个提示词
                                          disabled={promptList.length === 1}
                                        >
                                          <Trash2 size={14} />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                  <span className="ml-3">加载中...</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* 编辑提示词模态框 */}
      {editingPrompt && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-lg shadow-lg p-6 w-full max-w-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                {getPromptTypeIcon(editingPrompt.type)}
                {editingPrompt.isNew ? '添加新提示词' : '编辑提示词'}
                <span className="text-sm text-muted-foreground">
                  ({getPromptTypeName(editingPrompt.type)})
                </span>
              </h3>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setEditingPrompt(null)}
                className="h-8 w-8"
              >
                <X size={18} />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">提示词名称 *</label>
                <input
                  type="text"
                  value={editingPrompt.prompt.name}
                  onChange={(e) => setEditingPrompt({
                    ...editingPrompt,
                    prompt: { ...editingPrompt.prompt, name: e.target.value }
                  })}
                  placeholder="例如: 简洁解释, 详细改写"
                  className="w-full px-3 py-2 border rounded-md bg-background"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">提示词内容 *</label>
                <textarea
                  value={editingPrompt.prompt.prompt}
                  onChange={(e) => setEditingPrompt({
                    ...editingPrompt,
                    prompt: { ...editingPrompt.prompt, prompt: e.target.value }
                  })}
                  placeholder={`请在提示词中使用 {{content}} 作为占位符，例如:\n请帮我理解以下内容，解释其中的含义和关键点：\n\n{{content}}`}
                  className="w-full px-3 py-2 border rounded-md bg-background min-h-[200px]"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefaultPrompt"
                  checked={editingPrompt.prompt.isDefault || false}
                  onChange={(e) => setEditingPrompt({
                    ...editingPrompt,
                    prompt: { ...editingPrompt.prompt, isDefault: e.target.checked }
                  })}
                  className="mr-2"
                />
                <label htmlFor="isDefaultPrompt" className="text-sm">设为默认提示词</label>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setEditingPrompt(null)}
              >
                取消
              </Button>
              <Button 
                onClick={handleSavePrompt}
                className="gap-1"
              >
                <Save size={16} />
                保存
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* 测试结果模态框 */}
      <TestResultModal 
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        result={testResult}
        providerName={currentTestProvider?.name || ''}
      />
      
      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={executeDelete}
        title="删除提供商"
        message="确定要删除此AI提供商吗？此操作无法撤销。"
      />
      
      {/* 通知提示 */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
} 