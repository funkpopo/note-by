import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // 静态导出
  distDir: '.next', // 输出目录
  images: {
    unoptimized: true, // 为了静态导出禁用图像优化
  },
};

export default nextConfig;
