import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export', // 静态导出，用于Electron
  distDir: '.next',
  images: {
    unoptimized: true, // 在Electron中不需要Next.js的图像优化
  },
};

export default nextConfig;
