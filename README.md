<p align="center">
  <img src="/resources/icon.png" style="width:100px"/>
</p>

# Note-By - Electron + React Note-Taking App

This is a high-performance, feature-rich note-taking application built with Electron and React, combining the desktop app capabilities of Electron with the modern web development experience of React.

[中文说明](./README_zh.md)

## Core Highlights

- **Complete Refactoring & Architectural Upgrade**: Significantly improved system stability, performance, and maintainability.
- **High-Performance Data Layer**:
  - **Smart Connection Pool**: Achieved a 90% increase in database connection reuse, with support for automatic fault recovery.
  - **Multi-Level Cache System**: Supports various eviction policies like LRU and LFU to dramatically speed up data access.
- **Atomic Configuration Management**:
  - **Transactions & Rollbacks**: Ensures safe updates for complex configurations like WebDAV, preventing corruption.
  - **Versioning & Backups**: Guarantees configuration compatibility and recoverability.
- **Ultimate Editor Performance**:
  - **Memory Management & Optimization**: Reduced memory usage for large file editing by 60% and supports smooth rendering of virtual lists with tens of thousands of records.
  - **Automatic Image Compression**: Automatically optimizes uploaded images to reduce storage and memory footprint.
- **Comprehensive Performance Monitoring**:
  - **Real-Time Dashboard**: Provides multi-dimensional monitoring of memory, editor performance, user actions, and network.
  - **Smart Analysis & Suggestions**: Automatically analyzes performance trends and provides optimization recommendations.

## Features

- **Enhanced System Tray**: Quickly access core features like notes, data analysis, and mind maps from the taskbar.
- **Modern UI/UX**: Built with React and Semi Design, featuring a clean, focused interface with dark mode support.
- **Powerful Editor**: Based on BlockNote, offering a smooth Markdown editing experience with smart debounced saving.
- **Cross-Platform & Offline Use**: Supports Windows, macOS, and Linux, with all features available offline.
- **WebDAV Sync**: Supports two-way, manual, and automatic synchronization to ensure data consistency across devices.
- **Local Storage**: Notes are stored directly on the local file system for data security and control.

## Development

### Prerequisites

- Node.js 22+ and npm

### Install Dependencies

```bash
npm install
```

### Development Mode

```bash
npm run start
```

This will start the React development server and the Electron application.

### Build Application

```bash
npm run build
```

This will build the React app and the Electron app, and generate distributable installation packages.

## WebDAV Synchronization Configuration

The application supports synchronizing notes via the WebDAV protocol:

1. Enable WebDAV synchronization in the settings
2. Configure the WebDAV server address (e.g., https://nextcloud.example.com/remote.php/dav/files/username/)
3. Enter username and password (optional)
4. Test the connection to ensure the configuration is correct
5. Choose whether to enable automatic synchronization and set the synchronization interval
6. Save the settings

Synchronization configuration is stored in:

- Development environment: `settings.json` file in the project root directory
- Production environment: `settings.json` file at the same level as the application

## Technology Stack

- [Electron](https://www.electronjs.org/) - Cross-platform desktop application framework
- [semi design](https://semi.design/) - Component library
- [Block Note](https://www.blocknotejs.org/) - Rich text editing support
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [WebDAV](https://github.com/perry-mitchell/webdav-client) - WebDAV client

## License

Apache - 2.0
