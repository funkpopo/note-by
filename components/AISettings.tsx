'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, Save, AlertCircle, CheckCircle, Zap, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIProvider, getAIProviders, saveAIProviders, callAI } from '@/lib/ai-utils';

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

  return (
    <div className="w-full h-screen flex flex-col">
      {/* 顶部导航栏 */}
      <div className="flex items-center p-4 border-b bg-card">
        <div className="flex-1">
          <h1 className="text-xl font-bold">AI 设置</h1>
          <p className="text-sm text-muted-foreground">配置AI提供商和API密钥</p>
        </div>
        {onBack && (
          <Button onClick={onBack} variant="outline">
            返回
          </Button>
        )}
      </div>
      
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
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
          
          {/* 已配置的AI提供商列表 */}
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
          
          {/* 添加新的AI提供商 */}
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
        </div>
      </div>
      
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