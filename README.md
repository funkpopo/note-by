# Note-BY - Electron + Next.js 笔记应用

这是一个使用 Electron 和 Next.js 构建的笔记应用，结合了 Electron 的桌面应用能力和 Next.js 的现代 Web 开发体验。

## 特性

- 使用 Next.js 和 Tailwind CSS 构建的现代 UI
- 使用 shadcn/ui 组件库
- 支持暗黑模式
- 离线使用
- 跨平台支持 (Windows, macOS, Linux)
- 本地文件系统存储笔记
  - 开发环境：笔记保存在项目根目录的 `/markdown` 文件夹中
  - 生产环境：笔记保存在应用程序同级目录的 `/markdown` 文件夹中

## 开发

### 前提条件

- Node.js 18+ 和 npm

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run electron:dev
```

这将启动 Next.js 开发服务器和 Electron 应用。

### 构建应用

```bash
npm run electron:build
```

这将构建 Next.js 应用和 Electron 应用，并生成可分发的安装包。

## 技术栈

- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [Next.js](https://nextjs.org/) - React 框架
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [shadcn/ui](https://ui.shadcn.com/) - 组件库
- [TypeScript](https://www.typescriptlang.org/) - 类型安全的 JavaScript

## 许可证

MIT