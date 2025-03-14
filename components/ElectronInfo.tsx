'use client';

import { useEffect, useState } from 'react';

export default function ElectronInfo() {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // 检查是否在Electron环境中运行
    const isRunningInElectron = typeof window !== 'undefined' && 'electron' in window;
    setIsElectron(isRunningInElectron);
  }, []);

  if (!isElectron) {
    return null; // 在浏览器环境中不显示
  }
} 