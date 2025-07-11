<p align="center">
  <img src="/resources/icon.png" style="width:100px"/>
</p>

# Note-By - Electron + React 笔记应用

这是一个使用 Electron 和 React 构建的高性能、功能丰富的笔记应用，结合了 Electron 的桌面应用能力和 React 的现代 Web 开发体验。

## 核心亮点

- **全面重构与架构升级**: 显著提升了系统的稳定性、性能和可维护性。
- **高性能数据层**:
  - **智能连接池**: 数据库连接复用率提升90%，支持自动故障恢复。
  - **多级缓存系统**: 支持LRU、LFU等多种淘汰策略，大幅提升数据访问速度。
- **原子化配置管理**:
  - **事务与回滚**: 保证WebDAV等复杂配置的更新安全，防止配置损坏。
  - **版本控制与备份**: 确保配置的兼容性和可恢复性。
- **极致的编辑器性能**:
  - **内存管理与优化**: 大文件编辑内存占用降低60%，支持数万条记录的虚拟列表流畅渲染。
  - **图片自动压缩**: 上传图片时自动优化，降低存储和内存占用。
- **全方位性能监控**:
  - **实时数据面板**: 提供内存、编辑器、用户操作、网络等多维度监控。
  - **智能分析与建议**: 自动分析性能趋势并提供优化建议。

## 特性

- **增强的系统托盘**: 从任务栏快速访问笔记、数据分析、思维导图等核心功能。
- **现代UI/UX**: 使用 React 和 Semi Design 构建，支持暗黑模式，界面简洁、专注。
- **强大的编辑器**: 基于 BlockNote，提供流畅的 Markdown 编辑体验，支持智能防抖保存。
- **跨平台与离线使用**: 支持 Windows, macOS, Linux，所有功能均可离线使用。
- **WebDAV 同步**: 支持双向、手动及自动同步，保证数据多端一致。
- **本地存储**: 笔记直接保存在本地文件系统，确保数据安全可控。

## 开发

### 前提条件

- Node.js 22+ 和 npm

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run start
```

这将启动 React 开发服务器和 Electron 应用。

### 构建应用

```bash
npm run build
```

这将构建 React 应用和 Electron 应用，并生成可分发的安装包。

## WebDAV 同步配置

应用支持通过 WebDAV 协议同步笔记：

1. 在设置中启用 WebDAV 同步
2. 配置 WebDAV 服务器地址（例如：https://nextcloud.example.com/remote.php/dav/files/username/ ）
3. 输入用户名和密码（可选）
4. 测试连接以确保配置正确
5. 选择是否启用自动同步，并设置同步间隔
6. 保存设置

同步配置存储在：

- 开发环境：项目根目录的 `settings.json` 文件
- 生产环境：应用程序同级目录的 `settings.json` 文件

## 技术栈

- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [semi design](https://semi.design/) - 组件库
- [Block Note](https://www.blocknotejs.org/) - 富文本编辑支持
- [TypeScript](https://www.typescriptlang.org/) - 类型安全的 JavaScript
- [WebDAV](https://github.com/perry-mitchell/webdav-client) - WebDAV 客户端

## 许可证

Apache - 2.0
