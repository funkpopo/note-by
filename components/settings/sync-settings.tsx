"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SyncSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-medium mb-4">文件同步</h2>
        <p className="text-muted-foreground mb-6">
          配置文件同步选项，与其他设备共享您的笔记。
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>功能开发中</CardTitle>
          <CardDescription>
            这个功能正在开发中，敬请期待。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>笔记同步功能将允许您：</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>在多个设备之间同步笔记</li>
            <li>通过云存储备份您的笔记</li>
            <li>设置自动同步间隔</li>
            <li>选择要同步的文件夹</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
} 