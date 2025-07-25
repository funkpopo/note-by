import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      watch: {}
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      watch: {}
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    server: {
      cors: true,
      strictPort: false,
      port: 5173,
      hmr: {
        overlay: true,
        port: 5174
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
    plugins: [
      react()
    ]
  }
})
