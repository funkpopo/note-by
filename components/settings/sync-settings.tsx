"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// WebDAV配置表单验证schema
const webdavFormSchema = z.object({
  enabled: z.boolean().default(false),
  serverUrl: z.string().url({ message: "请输入有效的URL地址" }).or(z.string().length(0)),
  username: z.string().optional(),
  password: z.string().optional(),
  syncInterval: z.number().min(1).max(1440).default(60), // 分钟，默认1小时
  autoSync: z.boolean().default(false),
});

// 表单值类型
type WebDAVFormValues = z.infer<typeof webdavFormSchema>;

export default function SyncSettings() {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // 创建表单
  const form = useForm<WebDAVFormValues>({
    resolver: zodResolver(webdavFormSchema),
    defaultValues: {
      enabled: false,
      serverUrl: '',
      username: '',
      password: '',
      syncInterval: 60,
      autoSync: false,
    },
  });

  // 加载已保存的配置
  useEffect(() => {
    const loadSyncConfig = async () => {
      if (window.electron) {
        try {
          const config = await window.electron.getSyncConfig();
          if (config) {
            // 将配置加载到表单
            form.reset({
              enabled: config.enabled || false,
              serverUrl: config.serverUrl || '',
              username: config.username || '',
              password: config.password || '',
              syncInterval: config.syncInterval || 60,
              autoSync: config.autoSync || false,
            });
          }
        } catch (error) {
          console.error("加载同步配置失败:", error);
        }
      }
    };

    loadSyncConfig();
  }, [form]);

  // 保存配置
  const saveConfig = async (values: WebDAVFormValues) => {
    if (!window.electron) return;
    
    setIsSaving(true);
    setSaveStatus('idle');
    
    try {
      console.log('提交表单数据:', JSON.stringify({ 
        ...values, 
        password: values.password ? '******' : '' 
      }));
      
      const result = await window.electron.saveSyncConfig(values);
      if (result.success) {
        setSaveStatus('success');
        // 保存成功后重置表单的脏状态，但保留当前值
        form.reset(values);
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
        console.error("保存同步配置失败:", result.error);
      }
    } catch (error) {
      setSaveStatus('error');
      console.error("保存同步配置错误:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // 测试WebDAV连接
  const testConnection = async () => {
    const values = form.getValues();
    if (!window.electron || !values.serverUrl) return;
    
    setIsTesting(true);
    setTestStatus('idle');
    setTestMessage('');
    
    try {
      const result = await window.electron.testWebDAVConnection({
        serverUrl: values.serverUrl,
        username: values.username,
        password: values.password,
      });
      
      if (result.success) {
        setTestStatus('success');
        setTestMessage('连接成功！WebDAV服务器可访问。');
      } else {
        setTestStatus('error');
        setTestMessage(`连接失败: ${result.error}`);
      }
    } catch (error) {
      setTestStatus('error');
      setTestMessage('连接测试发生错误，请检查控制台日志');
      console.error("WebDAV连接测试错误:", error);
    } finally {
      setIsTesting(false);
    }
  };

  // 手动触发同步
  const triggerSync = async () => {
    if (!window.electron) return;
    
    setIsSaving(true);
    setSaveStatus('idle');
    
    try {
      const result = await window.electron.syncNotes();
      if (result.success) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
        console.error("手动同步失败:", result.error);
      }
    } catch (error) {
      setSaveStatus('error');
      console.error("手动同步错误:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-medium mb-4">文件同步</h2>
        <p className="text-muted-foreground mb-6">
          配置文件同步选项，与其他设备共享您的笔记。
        </p>
      </div>
      
      <form onSubmit={form.handleSubmit(saveConfig)} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>WebDAV 同步</CardTitle>
                <CardDescription>
                  使用 WebDAV 服务器同步您的笔记
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="sync-enabled"
                  checked={form.watch("enabled")}
                  onCheckedChange={(checked: boolean) => form.setValue("enabled", checked)}
                />
                <Label htmlFor="sync-enabled">启用</Label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="server-url">服务器地址</Label>
              <Input
                id="server-url"
                placeholder="https://example.com/webdav/"
                {...form.register("serverUrl")}
                disabled={!form.watch("enabled")}
              />
              {form.formState.errors.serverUrl && (
                <p className="text-sm text-red-500">{form.formState.errors.serverUrl.message}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  placeholder="用户名（可选）"
                  {...form.register("username")}
                  disabled={!form.watch("enabled")}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="密码（可选）"
                  {...form.register("password")}
                  disabled={!form.watch("enabled")}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={testConnection}
                disabled={isTesting || !form.watch("enabled") || !form.watch("serverUrl")}
              >
                {isTesting ? "测试中..." : "测试连接"}
              </Button>
              
              {testStatus === 'success' && (
                <p className="text-sm text-green-500">{testMessage}</p>
              )}
              
              {testStatus === 'error' && (
                <p className="text-sm text-red-500">{testMessage}</p>
              )}
            </div>
            
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium">自动同步设置</h4>
                  <p className="text-sm text-muted-foreground">配置笔记自动同步的设置</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="auto-sync"
                    checked={form.watch("autoSync")}
                    onCheckedChange={(checked: boolean) => form.setValue("autoSync", checked)}
                    disabled={!form.watch("enabled")}
                  />
                  <Label htmlFor="auto-sync">自动同步</Label>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sync-interval">同步间隔（分钟）</Label>
                <Input
                  id="sync-interval"
                  type="number"
                  min="1"
                  max="1440"
                  {...form.register("syncInterval", { valueAsNumber: true })}
                  disabled={!form.watch("enabled") || !form.watch("autoSync")}
                />
                {form.formState.errors.syncInterval && (
                  <p className="text-sm text-red-500">{form.formState.errors.syncInterval.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-between">
          <Button 
            type="button" 
            variant="outline"
            onClick={triggerSync}
            disabled={!form.watch("enabled") || !form.watch("serverUrl") || isSaving}
          >
            立即同步
          </Button>
          
          <div className="flex gap-2 items-center">
            {saveStatus === 'success' && (
              <p className="text-sm text-green-500">保存成功</p>
            )}
            {saveStatus === 'error' && (
              <p className="text-sm text-red-500">保存失败</p>
            )}
            
            <Button 
              type="submit" 
              disabled={isSaving}
            >
              {isSaving ? "保存中..." : "保存设置"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
} 