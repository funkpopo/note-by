<p align="center">
  <img src="/resources/icon.png" style="width:100px"/>
</p>

# Note-By - 现代化笔记应用

[![版本](https://img.shields.io/badge/版本-0.1.7-blue.svg)](https://github.com/funkpopo/note-by/releases)
[![许可证](https://img.shields.io/badge/许可证-Apache%202.0-green.svg)](./LICENSE)
[![平台](https://img.shields.io/badge/平台-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/funkpopo/note-by)

一款使用 Electron 和 React 构建的高性能、功能丰富的笔记应用，结合了强大的桌面应用能力和现代化的 Web 技术。

[English](./README.md) | [中文说明](./README_zh.md)

## ✨ 核心特性

### 🚀 性能与架构
- **高性能数据层**：SQLite 数据库，智能连接池（90% 连接复用率），多级缓存（LRU/LFU）
- **优化的编辑器**：Tiptap v3 编辑器，虚拟滚动，大文件内存占用降低 60%，自动图片压缩
- **原子化配置**：基于事务的设置管理，自动备份和版本控制
- **实时监控**：内置性能监控面板，跟踪内存、编辑器性能和网络操作

### 📝 丰富的编辑体验
- **高级编辑器**：基于 Tiptap，完整 Markdown 支持，表格、代码块、数学公式（KaTeX）
- **AI 集成**：内置支持 OpenAI、Claude 和自定义 AI 端点的内容生成
- **多格式导出**：支持导出为 PDF、DOCX、Markdown、HTML 和 Notion 格式
- **版本历史**：自动笔记版本控制，支持差异查看和恢复

### 🔄 同步与存储
- **WebDAV 同步**：双向、手动和自动同步，智能冲突解决
- **云存储**：支持 Dropbox 和 Google Drive 集成
- **本地优先**：所有数据使用 SQLite 本地存储，支持离线访问和数据所有权
- **加密存储**：主密码保护敏感配置

### 🎨 用户界面
- **现代设计**：使用 Semi Design 组件构建的简洁界面
- **暗黑模式**：完整的暗色主题支持，平滑过渡
- **思维导图**：使用 React Flow 创建交互式思维导图
- **数据分析**：内置 ECharts 图表和可视化
- **多语言支持**：国际化支持（中文/英文）

## 🚀 快速开始

### 系统要求

- Node.js 22.0+ 
- npm 10.0+
- Windows 10+、macOS 10.15+ 或 Linux (Ubuntu 20.04+)

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/funkpopo/note-by.git
cd note-by

# 安装依赖（包括原生模块重建）
npm install

# 启动开发模式
npm run dev
```

### 可用脚本

```bash
npm run dev          # 启动开发服务器，支持热重载
npm run build        # 构建生产版本
npm run build:win    # 构建 Windows 版本
npm run build:mac    # 构建 macOS 版本
npm run build:linux  # 构建 Linux 版本
npm run lint         # 运行 ESLint 检查
npm run typecheck    # 运行 Node 和 Web 类型检查
npm run format       # 使用 Prettier 格式化代码
```

## 🔧 配置说明

### WebDAV 同步配置

1. 打开 设置 → 同步与备份
2. 启用 WebDAV 同步
3. 配置服务器详情：
   - 服务器 URL：`https://your-server.com/remote.php/dav/files/username/`
   - 用户名和密码
   - 同步间隔（自动同步）
4. 测试连接并保存

### AI 集成配置

1. 打开 设置 → AI 配置
2. 选择提供商：
   - OpenAI (GPT-3.5/GPT-4)
   - Claude (通过 API)
   - 自定义端点
3. 输入 API 密钥和端点
4. 配置模型参数

### 数据存储位置

- **开发环境**：项目根目录的 `./settings.json`
- **生产环境**：
  - Windows：`%APPDATA%/note-by/`
  - macOS：`~/Library/Application Support/note-by/`
  - Linux：`~/.config/note-by/`

## 🛠️ 技术栈

### 核心技术
- **[Electron](https://www.electronjs.org/)** v36 - 桌面应用框架
- **[React](https://react.dev/)** v18 - UI 框架
- **[TypeScript](https://www.typescriptlang.org/)** v5 - 类型安全
- **[Vite](https://vitejs.dev/)** v6 - 构建工具
- **[electron-vite](https://electron-vite.org/)** - Electron + Vite 集成

### UI 与样式
- **[Semi Design](https://semi.design/)** v2 - 组件库
- **[Tiptap](https://tiptap.dev/)** v3 - 富文本编辑器
- **[React Flow](https://reactflow.dev/)** - 思维导图可视化
- **[ECharts](https://echarts.apache.org/)** - 数据可视化
- **[Sass](https://sass-lang.com/)** - CSS 预处理器

### 数据与状态
- **[SQLite3](https://www.sqlite.org/)** - 本地数据库（通过 better-sqlite3）
- **[Zustand](https://zustand-demo.pmnd.rs/)** v5 - 状态管理
- **[LRU Cache](https://github.com/isaacs/node-lru-cache)** - 缓存层

### 集成与 API
- **[WebDAV](https://github.com/perry-mitchell/webdav-client)** - 文件同步
- **[OpenAI SDK](https://github.com/openai/openai-node)** - AI 集成
- **[Dropbox SDK](https://github.com/dropbox/dropbox-sdk-js)** - 云存储
- **[Google APIs](https://github.com/googleapis/google-api-nodejs-client)** - Google Drive

## 📁 项目结构

```
note-by/
├── src/
│   ├── main/                 # Electron 主进程
│   │   ├── index.ts          # 主入口点
│   │   ├── database.ts       # SQLite 操作
│   │   ├── settings.ts       # 配置管理
│   │   ├── webdav.ts         # WebDAV 同步逻辑
│   │   └── utils/            # 工具类（内存、错误等）
│   ├── preload/              # 预加载脚本
│   ├── renderer/             # React 应用
│   │   ├── components/       # UI 组件
│   │   ├── context/          # React 上下文
│   │   ├── store/            # Zustand 存储
│   │   └── utils/            # 前端工具类
│   └── shared/               # 共享类型和常量
├── resources/                # 应用资源
├── dist/                     # 构建输出
└── out/                      # Electron 构建输出
```

## 🤝 贡献指南

欢迎贡献！请随时提交 Pull Request。

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 Apache License 2.0 许可证 - 详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- [Electron](https://www.electronjs.org/) 提供桌面框架
- [React](https://react.dev/) 提供 UI 框架
- [Semi Design](https://semi.design/) 提供精美组件
- [Tiptap](https://tiptap.dev/) 提供强大的编辑器
- 所有让这个项目成为可能的开源项目

## 📧 联系方式

- GitHub：[@funkpopo](https://github.com/funkpopo)
- 项目地址：[https://github.com/funkpopo/note-by](https://github.com/funkpopo/note-by)
