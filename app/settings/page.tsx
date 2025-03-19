"use client";

import { useState } from "react";
import { ArrowLeft, Settings as SettingsIcon, Palette, Bot, Cloud } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import AppearanceSettings from "@/components/settings/appearance-settings";
import SyncSettings from "@/components/settings/sync-settings";
import AISettings from "@/components/settings/ai-settings";

// Settings page tabs
type SettingsTab = "appearance" | "sync" | "ai";

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");

  return (
    <div className="flex flex-col h-screen">
      <header className="flex justify-between items-center px-4 py-2 border-b shadow-sm bg-card">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back to notes</span>
            </Button>
          </Link>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            设置
          </h1>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Settings Sidebar */}
        <aside className="w-64 border-r border-r-border bg-muted/30 overflow-y-auto p-4 settings-sidebar">
          <nav className="space-y-1">
            <Button 
              variant={activeTab === "appearance" ? "secondary" : "ghost"} 
              className="w-full justify-start gap-2 h-10"
              onClick={() => setActiveTab("appearance")}
              data-active={activeTab === "appearance"}
            >
              <Palette className="h-4 w-4" />
              界面设置
            </Button>
            
            <Button 
              variant={activeTab === "sync" ? "secondary" : "ghost"} 
              className="w-full justify-start gap-2 h-10"
              onClick={() => setActiveTab("sync")}
              data-active={activeTab === "sync"}
            >
              <Cloud className="h-4 w-4" />
              文件同步
            </Button>
            
            <Button 
              variant={activeTab === "ai" ? "secondary" : "ghost"} 
              className="w-full justify-start gap-2 h-10"
              onClick={() => setActiveTab("ai")}
              data-active={activeTab === "ai"}
            >
              <Bot className="h-4 w-4" />
              AI 设置
            </Button>
          </nav>
        </aside>

        {/* Settings Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === "appearance" && <AppearanceSettings />}
          {activeTab === "sync" && <SyncSettings />}
          {activeTab === "ai" && <AISettings />}
        </main>
      </div>
    </div>
  );
} 