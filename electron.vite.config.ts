import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    server: {
      cors: true,
      strictPort: true,
      headers: {
        'Content-Security-Policy':
          "default-src 'self'; img-src 'self' data: file: https: http:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-eval'; connect-src * 'unsafe-inline';"
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: undefined // 暂时禁用代码分割，先确保应用正常运行
        }
      },
      // 增加chunk大小警告阈值
      chunkSizeWarningLimit: 2000
    },
    plugins: [react()]
  }
})
