"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Check, 
  AlertCircle, 
  Pencil, 
  Trash2, 
  Star,
  RefreshCw,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// AIConfig interface
interface AIConfig {
  id: string;
  name: string;
  apiKey: string;
  apiUrl: string;
  organizationId?: string;
  isDefault?: boolean;
  lastTested?: Date;
}

// Form validation schema
const apiFormSchema = z.object({
  name: z.string().min(1, "模型名称不能为空"),
  apiKey: z.string().min(1, "API Key不能为空"),
  apiUrl: z.string().url("必须是有效的URL").default("https://api.openai.com/v1"),
  organizationId: z.string().optional(),
  isDefault: z.boolean().default(false),
});

type ApiFormValues = z.infer<typeof apiFormSchema>;

export default function AISettings() {
  const [configs, setConfigs] = useState<AIConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AIConfig | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; timestamp: number }>>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<string | null>(null);

  // React Hook Form
  const form = useForm<ApiFormValues>({
    resolver: zodResolver(apiFormSchema),
    defaultValues: {
      name: "",
      apiKey: "",
      apiUrl: "https://api.openai.com/v1",
      organizationId: "",
      isDefault: false,
    },
  });

  // 加载AI配置
  const loadConfigs = async () => {
    try {
      setIsLoading(true);
      const loadedConfigs = await window.electron.getAIConfigs();
      setConfigs(loadedConfigs);
    } catch (error) {
      console.error("加载AI配置失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 组件挂载时加载配置
  useEffect(() => {
    loadConfigs();
  }, []);

  // 打开编辑对话框
  const openEditDialog = (config: AIConfig | null = null) => {
    if (config) {
      // 编辑现有配置
      form.reset({
        name: config.name,
        apiKey: config.apiKey,
        apiUrl: config.apiUrl || "https://api.openai.com/v1",
        organizationId: config.organizationId || "",
        isDefault: config.isDefault || false,
      });
      setEditingConfig(config);
    } else {
      // 新建配置
      form.reset({
        name: "",
        apiKey: "",
        apiUrl: "https://api.openai.com/v1",
        organizationId: "",
        isDefault: configs.length === 0, // 如果是第一个配置，默认设为默认
      });
      setEditingConfig(null);
    }
    setIsDialogOpen(true);
  };

  // 关闭对话框
  const closeDialog = () => {
    setIsDialogOpen(false);
    form.reset();
  };

  // 保存配置
  const saveConfig = async (values: ApiFormValues) => {
    try {
      if (editingConfig) {
        // 更新现有配置
        const result = await window.electron.updateAIConfig(editingConfig.id, {
          ...values,
          lastTested: editingConfig.lastTested,
        });
        
        if (result.success) {
          await loadConfigs();
          closeDialog();
        } else {
          console.error("更新配置失败:", result.error);
        }
      } else {
        // 创建新配置
        const newConfig: AIConfig = {
          id: Date.now().toString(),
          ...values,
        };
        
        const result = await window.electron.saveAIConfig(newConfig);
        
        if (result.success) {
          await loadConfigs();
          closeDialog();
        } else {
          console.error("保存配置失败:", result.error);
        }
      }
    } catch (error) {
      console.error("保存AI配置时出错:", error);
    }
  };

  // 删除配置
  const deleteConfig = async (id: string) => {
    try {
      const result = await window.electron.deleteAIConfig(id);
      
      if (result.success) {
        // 删除测试结果
        const updatedResults = { ...testResults };
        delete updatedResults[id];
        setTestResults(updatedResults);
        
        await loadConfigs();
      } else {
        console.error("删除配置失败:", result.error);
      }
    } catch (error) {
      console.error("删除AI配置时出错:", error);
    } finally {
      setDeleteConfirmOpen(null);
    }
  };

  // 设置为默认配置
  const setAsDefault = async (id: string) => {
    try {
      const result = await window.electron.updateAIConfig(id, {
        isDefault: true,
      });
      
      if (result.success) {
        await loadConfigs();
      } else {
        console.error("设置默认配置失败:", result.error);
      }
    } catch (error) {
      console.error("设置默认AI配置时出错:", error);
    }
  };

  // 测试API配置
  const testConfig = async (config: AIConfig) => {
    setTestingId(config.id);
    setTestResults(prev => ({
      ...prev,
      [config.id]: { ...prev[config.id], success: false, message: "测试中...", timestamp: Date.now() }
    }));
    
    try {
      const result = await window.electron.testAIConfig(config);
      
      // 更新测试结果
      setTestResults(prev => ({
        ...prev,
        [config.id]: {
          success: result.success,
          message: result.message,
          timestamp: Date.now()
        }
      }));
      
      if (result.success) {
        // 更新配置的lastTested时间
        await window.electron.updateAIConfig(config.id, {
          lastTested: new Date()
        });
        
        // 刷新配置列表
        await loadConfigs();
      }
    } catch (error) {
      console.error("API测试错误:", error);
      setTestResults(prev => ({
        ...prev,
        [config.id]: {
          success: false,
          message: `连接失败: ${error instanceof Error ? error.message : "未知错误"}`,
          timestamp: Date.now()
        }
      }));
    } finally {
      setTestingId(null);
    }
  };

  // 格式化上次测试时间
  const formatLastTested = (date?: Date) => {
    if (!date) return "从未测试";
    
    const lastTested = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - lastTested.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return "刚刚";
    if (diffMins < 60) return `${diffMins}分钟前`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}小时前`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}天前`;
    
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}个月前`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-medium mb-4">AI 模型设置</h2>
        <p className="text-muted-foreground mb-6">
          管理AI模型的API配置，为应用启用AI功能。
        </p>
      </div>

      {/* 添加新配置按钮 */}
      <div className="flex justify-end mb-6">
        <Button 
          onClick={() => openEditDialog()} 
          variant="outline" 
          size="sm"
          className="flex items-center gap-1"
        >
          <Pencil className="h-4 w-4" />
          添加模型配置
        </Button>
      </div>

      {/* 配置列表 */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">加载中...</span>
          </div>
        </div>
      ) : configs.length === 0 ? (
        <Card className="border-dashed hover:border-primary/50 transition-all">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-muted-foreground mb-4">
              尚未添加任何AI模型配置
            </p>
            <Button 
              onClick={() => openEditDialog()} 
              variant="outline" 
              size="sm"
              className="flex items-center gap-1"
            >
              <Pencil className="h-4 w-4" />
              添加第一个模型
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {configs.map((config) => (
            <Card 
              key={config.id} 
              className={`${config.isDefault ? "border-primary" : ""} relative hover:shadow-md transition-all duration-200`}
            >
              {config.isDefault && (
                <div className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3">
                  <div className="bg-primary rounded-full p-1">
                    <Star className="h-4 w-4 text-background" />
                  </div>
                </div>
              )}
              
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {config.name}
                  {config.isDefault && (
                    <span className="text-xs font-normal bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      默认
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {config.apiUrl && (
                    <>
                      <span className="inline-block mr-2">模型 · {config.apiUrl.replace(/^https?:\/\//, '').split('/')[0]}</span>
                      {config.organizationId && <span className="text-xs">已设置组织ID</span>}
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">API Key:</span>
                    <span className="text-sm text-muted-foreground font-mono">••••••••{config.apiKey.slice(-4)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">API URL:</span>
                    <span className="text-sm text-muted-foreground truncate max-w-[200px]">{config.apiUrl}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">上次测试:</span>
                    <span className="text-sm text-muted-foreground">{formatLastTested(config.lastTested)}</span>
                  </div>
                  
                  {testResults[config.id] && (
                    <div className={`mt-4 p-3 rounded-md ${
                      testResults[config.id].success 
                        ? 'bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-900' 
                        : 'bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900'
                    }`}>
                      <div className="flex items-center gap-2">
                        {testResults[config.id].success ? (
                          <Check className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                        <p className={`text-sm ${
                          testResults[config.id].success 
                            ? 'text-green-700 dark:text-green-300' 
                            : 'text-red-700 dark:text-red-300'
                        }`}>
                          {testResults[config.id].message}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col space-y-2">
                <div className="flex justify-between w-full">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => openEditDialog(config)}
                    className="flex items-center gap-1 w-24"
                  >
                    <Pencil className="h-4 w-4" />
                    编辑
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setDeleteConfirmOpen(config.id)}
                    className="flex items-center gap-1 w-24"
                  >
                    <Trash2 className="h-4 w-4" />
                    删除
                  </Button>
                </div>
                
                <div className="flex justify-between w-full">
                  {!config.isDefault ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setAsDefault(config.id)}
                      className="flex items-center gap-1 w-24 mr-2"
                    >
                      <Star className="h-4 w-4" />
                      设为默认
                    </Button>
                  ) : (
                    <div className="w-24 mr-2"></div>
                  )}
                  
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => testConfig(config)}
                    disabled={testingId === config.id}
                    className="flex items-center gap-1 w-24"
                  >
                    {testingId === config.id ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        测试中
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        测试
                      </>
                    )}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* 添加/编辑配置对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingConfig ? "编辑AI模型配置" : "添加新AI模型配置"}</DialogTitle>
            <DialogDescription>
              配置AI模型的API连接参数，设置后可测试连接并使用。
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(saveConfig)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">模型名称</Label>
              <Input
                id="name"
                placeholder="例如: claude-3-opus-20240229, deepseek-v3-241226"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                指定API使用的模型名称，测试时将使用此模型名称
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk-..."
                {...form.register("apiKey")}
              />
              {form.formState.errors.apiKey && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.apiKey.message}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="apiUrl">API URL</Label>
              <Input
                id="apiUrl"
                placeholder="https://api.openai.com/v1"
                {...form.register("apiUrl")}
              />
              {form.formState.errors.apiUrl && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.apiUrl.message}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                指定API服务端点URL
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="organizationId">组织ID (可选)</Label>
              <Input
                id="organizationId"
                placeholder="org-..."
                {...form.register("organizationId")}
              />
              <p className="text-sm text-muted-foreground">
                如果API密钥属于多个组织，请指定组织ID
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isDefault"
                className="rounded border-gray-300 text-primary focus:ring-primary"
                {...form.register("isDefault")}
              />
              <Label htmlFor="isDefault" className="text-sm font-normal">
                设为默认配置
              </Label>
            </div>
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={closeDialog}>
                取消
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {editingConfig ? "更新" : "添加"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* 删除确认对话框 */}
      <Dialog open={deleteConfirmOpen !== null} onOpenChange={() => setDeleteConfirmOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              您确定要删除此API配置吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(null)}>
              <XCircle className="h-4 w-4 mr-2" />
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirmOpen && deleteConfig(deleteConfirmOpen)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              确认删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <div className="mt-8 pt-6 border-t">
        <h3 className="text-sm font-medium mb-2">关于API配置</h3>
        <p className="text-sm text-muted-foreground">
          您可以在AI供应商平台上获取API密钥和模型名称。
          所有配置信息仅存储在您的本地设备上，不会发送到任何其他服务器。
          请确保使用正确的模型名称，这将在测试连接时使用。
        </p>
      </div>
    </div>
  );
} 