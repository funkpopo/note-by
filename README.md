<p align="center">
  <img src="/resources/icon.png" style="width:100px"/>
</p>

# Note-By - Electron + React 笔记应用

这是一个使用 Electron 和 React 构建的笔记应用，结合了 Electron 的桌面应用能力和 React 的现代 Web 开发体验。

## 特性

- 使用 React 和 semi design UI 组件库
- 支持暗黑模式
- 离线使用
- 跨平台支持 (Windows, macOS, Linux)
- 使用BlockNote实现Markdown文档的阅览和编辑功能
- 本地文件系统存储笔记
  - 开发环境：笔记保存在项目根目录的 `markdown` 文件夹中
  - 生产环境：笔记保存在应用程序同级目录的 `markdown` 文件夹中
- WebDAV 同步支持
  - 可配置服务器地址、用户名和密码
  - 支持手动同步和自动定时同步
  - 双向同步（本地到远程，远程到本地）

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
