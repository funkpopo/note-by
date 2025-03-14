'use client';

import dynamic from 'next/dynamic';

// 动态导入组件
const ElectronInfo = dynamic(() => import('@/components/ElectronInfo'), {
  ssr: false,
});

const NoteList = dynamic(() => import('@/components/NoteList'), {
  ssr: false,
});

export default function HomeClient() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 主要内容 */}
      <main className="h-screen">
        <NoteList />
      </main>
      
      {/* 添加Electron信息组件 */}
      <ElectronInfo />
    </div>
  );
} 