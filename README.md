<p align="center">
  <img src="/resources/icon.png" style="width:100px"/>
</p>

# Note-By - Modern Note-Taking Application

[![Version](https://img.shields.io/badge/version-0.1.7-blue.svg)](https://github.com/funkpopo/note-by/releases)
[![License](https://img.shields.io/badge/license-Apache%202.0-green.svg)](./LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/funkpopo/note-by)

A high-performance, feature-rich note-taking application built with Electron and React, combining powerful desktop capabilities with modern web technologies.

[中文说明](./README_zh.md) | [English](./README.md)

## ✨ Core Features

### 🚀 Performance & Architecture

- **High-Performance Database Layer**: SQLite with smart connection pooling (90% connection reuse rate) and multi-level caching (LRU/LFU)
- **Optimized Editor**: Tiptap v3 with virtual scrolling, 60% memory reduction for large files, and automatic image compression
- **Atomic Configuration**: Transaction-based settings management with automatic backup and versioning
- **Real-Time Monitoring**: Built-in performance dashboard tracking memory, editor performance, and network operations

### 📝 Rich Editing Experience

- **Advanced Editor**: Based on Tiptap with full Markdown support, tables, code blocks, and math formulas (KaTeX)
- **AI Integration**: Built-in support for OpenAI, Claude, and custom AI endpoints for content generation
- **Multiple Export Formats**: Export to PDF, DOCX, Markdown, HTML, and Notion format
- **Version History**: Automatic note versioning with diff viewer and restore capabilities

### 🔄 Synchronization & Storage

- **WebDAV Sync**: Bidirectional, manual, and automatic synchronization with conflict resolution
- **Cloud Storage**: Support for Dropbox and Google Drive integration
- **Local-First**: All data stored locally with SQLite for offline access and data ownership
- **Encrypted Storage**: Master password protection for sensitive configurations

### 🎨 User Interface

- **Modern Design**: Clean interface built with Semi Design components
- **Dark Mode**: Full dark theme support with smooth transitions
- **Mind Maps**: Interactive mind map creation with React Flow
- **Data Analytics**: Built-in charts and visualizations with ECharts
- **Multi-Language**: Internationalization support (English/Chinese)

## 🚀 Quick Start

### Prerequisites

- Node.js 22.0+
- npm 10.0+
- Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)

### Installation

```bash
# Clone the repository
git clone https://github.com/funkpopo/note-by.git
cd note-by

# Install dependencies (includes native module rebuild)
npm install

# Start development mode
npm run dev
```

### Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run build:win    # Build for Windows
npm run build:mac    # Build for macOS
npm run build:linux  # Build for Linux
npm run lint         # Run ESLint
npm run typecheck    # Type checking for both Node and Web
npm run format       # Format code with Prettier
```

## 🔧 Configuration

### WebDAV Synchronization

1. Open Settings → Sync & Backup
2. Enable WebDAV synchronization
3. Configure server details:
   - Server URL: `https://your-server.com/remote.php/dav/files/username/`
   - Username and password
   - Sync interval (for automatic sync)
4. Test connection and save

### AI Integration

1. Open Settings → AI Configuration
2. Choose your provider:
   - OpenAI (GPT-3.5/GPT-4)
   - Claude (via API)
   - Custom endpoint
3. Enter API key and endpoint
4. Configure model parameters

### Data Storage

- **Development**: `./settings.json` in project root
- **Production**:
  - Windows: `%APPDATA%/note-by/`
  - macOS: `~/Library/Application Support/note-by/`
  - Linux: `~/.config/note-by/`

## 🛠️ Technology Stack

### Core Technologies

- **[Electron](https://www.electronjs.org/)** v36 - Desktop application framework
- **[React](https://react.dev/)** v18 - UI framework
- **[TypeScript](https://www.typescriptlang.org/)** v5 - Type safety
- **[Vite](https://vitejs.dev/)** v6 - Build tool
- **[electron-vite](https://electron-vite.org/)** - Electron + Vite integration

### UI & Styling

- **[Semi Design](https://semi.design/)** v2 - Component library
- **[Tiptap](https://tiptap.dev/)** v3 - Rich text editor
- **[React Flow](https://reactflow.dev/)** - Mind map visualization
- **[ECharts](https://echarts.apache.org/)** - Data visualization
- **[Sass](https://sass-lang.com/)** - CSS preprocessing

### Data & State

- **[SQLite3](https://www.sqlite.org/)** - Local database (via better-sqlite3)
- **[Zustand](https://zustand-demo.pmnd.rs/)** v5 - State management
- **[LRU Cache](https://github.com/isaacs/node-lru-cache)** - Caching layer

### Integration & APIs

- **[WebDAV](https://github.com/perry-mitchell/webdav-client)** - File synchronization
- **[OpenAI SDK](https://github.com/openai/openai-node)** - AI integration
- **[Dropbox SDK](https://github.com/dropbox/dropbox-sdk-js)** - Cloud storage
- **[Google APIs](https://github.com/googleapis/google-api-nodejs-client)** - Google Drive

## 📁 Project Structure

```
note-by/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── index.ts          # Main entry point
│   │   ├── database.ts       # SQLite operations
│   │   ├── settings.ts       # Configuration management
│   │   ├── webdav.ts         # WebDAV sync logic
│   │   └── utils/            # Utilities (memory, errors, etc.)
│   ├── preload/              # Preload scripts
│   ├── renderer/             # React application
│   │   ├── components/       # UI components
│   │   ├── context/          # React contexts
│   │   ├── store/            # Zustand stores
│   │   └── utils/            # Frontend utilities
│   └── shared/               # Shared types and constants
├── resources/                # Application assets
├── dist/                     # Build output
└── out/                      # Electron build output
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Electron](https://www.electronjs.org/) for the desktop framework
- [React](https://react.dev/) for the UI framework
- [Semi Design](https://semi.design/) for the beautiful components
- [Tiptap](https://tiptap.dev/) for the amazing editor
- All other open source projects that made this possible

## 📧 Contact

- GitHub: [@funkpopo](https://github.com/funkpopo)
- Project Link: [https://github.com/funkpopo/note-by](https://github.com/funkpopo/note-by)
