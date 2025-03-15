"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const chokidar = __importStar(require("chokidar"));
const electron_serve_1 = __importDefault(require("electron-serve"));
// 添加启动日志
console.log('=== Electron main process starting ===');
console.log('Current working directory:', process.cwd());
console.log('NODE_ENV:', process.env.NODE_ENV);
const loadURL = (0, electron_serve_1.default)({ directory: '.next' });
let mainWindow;
let fsWatcher = null;
const isDev = process.env.NODE_ENV === 'development';
const port = process.env.PORT || 3000;
const devUrl = `http://localhost:${port}`;
// 获取markdown文件夹路径
function getMarkdownDir() {
    if (isDev) {
        // 开发环境：项目根目录下的/markdown文件夹
        return path.join(process.cwd(), 'markdown');
    }
    else {
        // 生产环境：exe同级路径下的/markdown文件夹
        return path.join(path.dirname(electron_1.app.getPath('exe')), 'markdown');
    }
}
// 确保markdown文件夹存在
function ensureMarkdownDir() {
    const markdownDir = getMarkdownDir();
    console.log(`[MAIN] 确保markdown目录存在: ${markdownDir}`);
    if (!fs.existsSync(markdownDir)) {
        console.log(`[MAIN] 创建markdown目录: ${markdownDir}`);
        fs.mkdirSync(markdownDir, { recursive: true });
        console.log(`[MAIN] markdown目录创建成功`);
    }
    else {
        console.log(`[MAIN] markdown目录已存在`);
        // 检查目录中的文件
        try {
            const files = fs.readdirSync(markdownDir);
            console.log(`[MAIN] 在markdown目录中找到 ${files.length} 个文件`);
            files.forEach(file => {
                const filePath = path.join(markdownDir, file);
                const stats = fs.statSync(filePath);
                console.log(`[MAIN] - ${file} (${stats.isDirectory() ? '目录' : '文件'}, ${stats.size} 字节)`);
            });
        }
        catch (error) {
            console.error(`[MAIN] 读取markdown目录时出错: ${error}`);
        }
    }
    return markdownDir;
}
// 监听文件系统变化
function watchFileSystem() {
    if (fsWatcher) {
        fsWatcher.close();
    }
    const markdownDir = getMarkdownDir();
    console.log(`[MAIN] 开始监听文件系统变化: ${markdownDir}`);
    // 使用chokidar监听文件系统变化
    fsWatcher = chokidar.watch(markdownDir, {
        ignored: /(^|[\/\\])\../, // 忽略以点开头的文件
        persistent: true,
        ignoreInitial: true
    });
    // 监听文件添加事件
    fsWatcher.on('add', (path) => notifyFileSystemChange('add', path));
    // 监听文件修改事件
    fsWatcher.on('change', (path) => notifyFileSystemChange('change', path));
    // 监听文件删除事件
    fsWatcher.on('unlink', (path) => notifyFileSystemChange('unlink', path));
    // 监听目录添加事件
    fsWatcher.on('addDir', (path) => notifyFileSystemChange('addDir', path));
    // 监听目录删除事件
    fsWatcher.on('unlinkDir', (path) => notifyFileSystemChange('unlinkDir', path));
    // 监听就绪事件
    fsWatcher.on('ready', () => console.log('[MAIN] 文件监听器已就绪'));
    // 监听错误事件
    fsWatcher.on('error', (err) => {
        console.error(`[MAIN] 文件监听错误: ${err}`);
    });
}
// 通知渲染进程文件系统变化
function notifyFileSystemChange(eventType, path) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        const relativePath = path.replace(getMarkdownDir(), '').replace(/\\/g, '/');
        mainWindow.webContents.send('file-system-change', {
            type: eventType,
            path: relativePath.startsWith('/') ? relativePath.substring(1) : relativePath,
            fullPath: path
        });
    }
}
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            sandbox: false,
            webSecurity: true,
        },
        icon: path.join(process.resourcesPath, 'icon.png'),
    });
    if (isDev) {
        mainWindow.loadURL(devUrl);
        // Open DevTools in development mode
        mainWindow.webContents.openDevTools();
        // 在开发模式下，监听页面加载完成事件
        mainWindow.webContents.on('did-finish-load', () => {
            console.log('Page loaded, checking preload script...');
            // 通知渲染进程加载笔记
            mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.webContents.send('load-notes');
        });
    }
    else {
        loadURL(mainWindow);
        // 在生产环境中，监听页面加载完成事件
        mainWindow.webContents.on('did-finish-load', () => {
            console.log('Page loaded in production mode');
            // 通知渲染进程加载笔记
            mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.webContents.send('load-notes');
        });
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    createMenu();
}
function createMenu() {
    const isMac = process.platform === 'darwin';
    const template = [
        ...(isMac ? [{
                label: electron_1.app.name,
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'services' },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideOthers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    { role: 'quit' }
                ]
            }] : []),
        {
            label: '文件',
            submenu: [
                {
                    label: '新建笔记',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.webContents.send('menu-new-note');
                    }
                },
                { type: 'separator' },
                isMac ? { role: 'close' } : { role: 'quit' }
            ]
        },
        {
            label: '编辑',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                ...(isMac ? [
                    { role: 'pasteAndMatchStyle' },
                    { role: 'delete' },
                    { role: 'selectAll' },
                    { type: 'separator' },
                    {
                        label: 'Speech',
                        submenu: [
                            { role: 'startSpeaking' },
                            { role: 'stopSpeaking' }
                        ]
                    }
                ] : [
                    { role: 'delete' },
                    { type: 'separator' },
                    { role: 'selectAll' }
                ])
            ]
        },
        {
            label: '视图',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            role: 'help',
            submenu: [
                {
                    label: '了解更多',
                    click: async () => {
                        await electron_1.shell.openExternal('https://github.com/yourusername/Note-By');
                    }
                }
            ]
        }
    ];
    // @ts-expect-error - Menu.buildFromTemplate类型问题
    const menu = electron_1.Menu.buildFromTemplate(template);
    electron_1.Menu.setApplicationMenu(menu);
}
// 设置IPC处理器
electron_1.ipcMain.handle('get-app-version', () => {
    return electron_1.app.getVersion();
});
// 添加一个测试IPC处理器
electron_1.ipcMain.handle('test-ipc', () => {
    console.log('Test IPC handler called');
    return { success: true, message: 'IPC is working!' };
});
// 递归读取目录中的所有文件夹
function readAllFolders(dir) {
    const folders = [];
    function readDir(currentDir, relativeDir = '') {
        const items = fs.readdirSync(currentDir);
        for (const item of items) {
            const itemPath = path.join(currentDir, item);
            const stats = fs.statSync(itemPath);
            if (stats.isDirectory()) {
                // 如果是目录，添加到结果中并递归读取
                const newRelativeDir = path.join(relativeDir, item);
                folders.push(newRelativeDir);
                readDir(itemPath, newRelativeDir);
            }
        }
    }
    readDir(dir);
    return folders;
}
// 递归读取目录中的所有markdown文件
function readMarkdownFilesRecursively(dir) {
    const markdownFiles = [];
    function readDir(currentDir, relativeDir = '') {
        const items = fs.readdirSync(currentDir);
        for (const item of items) {
            const itemPath = path.join(currentDir, item);
            const stats = fs.statSync(itemPath);
            if (stats.isDirectory()) {
                // 如果是目录，递归读取
                const newRelativeDir = path.join(relativeDir, item);
                readDir(itemPath, newRelativeDir);
            }
            else if (item.endsWith('.md')) {
                // 如果是markdown文件，添加到结果中
                const relativePath = path.join(relativeDir, item);
                markdownFiles.push({
                    path: itemPath,
                    relativePath: relativePath
                });
            }
        }
    }
    readDir(dir);
    return markdownFiles;
}
// 保存markdown文件
electron_1.ipcMain.handle('save-markdown', async (_, id, title, content, folder = '') => {
    try {
        if (!id) {
            console.error('保存markdown文件失败: ID不能为空');
            return { success: false, error: 'ID不能为空' };
        }
        const markdownDir = ensureMarkdownDir();
        console.log(`保存markdown文件到目录: ${markdownDir}`);
        // 如果指定了文件夹，确保文件夹存在
        let targetDir = markdownDir;
        if (folder && folder.trim() !== '') {
            targetDir = path.join(markdownDir, folder);
            // 递归创建文件夹
            fs.mkdirSync(targetDir, { recursive: true });
            console.log(`创建目标文件夹: ${targetDir}`);
        }
        const filePath = path.join(targetDir, `${id}.md`);
        console.log(`文件完整路径: ${filePath}`);
        // 创建文件内容（可以添加元数据头部）
        const fileContent = `---
title: ${title}
id: ${id}
date: ${new Date().toISOString()}
---

${content}`;
        // 写入文件
        fs.writeFileSync(filePath, fileContent, 'utf-8');
        console.log(`成功保存文件: ${filePath}`);
        // 计算相对路径用于返回
        const relativePath = folder ? path.join(folder, `${id}.md`) : `${id}.md`;
        return { success: true, filePath, relativePath };
    }
    catch (error) {
        console.error('保存markdown文件失败:', error);
        return {
            success: false,
            error: error.message,
            details: {
                id,
                path: getMarkdownDir(),
                errorName: error.name,
                errorStack: error.stack
            }
        };
    }
});
// 加载所有markdown文件
electron_1.ipcMain.handle('load-all-markdown', async () => {
    try {
        const markdownDir = ensureMarkdownDir();
        console.log(`[IPC] 从目录加载markdown文件: ${markdownDir}`);
        // 检查目录是否存在
        if (!fs.existsSync(markdownDir)) {
            console.error(`[IPC] Markdown目录不存在: ${markdownDir}`);
            return { success: false, error: `Markdown目录不存在: ${markdownDir}` };
        }
        // 递归读取所有文件夹
        const allFolders = readAllFolders(markdownDir);
        console.log(`[IPC] 找到 ${allFolders.length} 个文件夹`);
        // 递归读取所有markdown文件
        const markdownFiles = readMarkdownFilesRecursively(markdownDir);
        console.log(`[IPC] 找到 ${markdownFiles.length} 个markdown文件`);
        const notes = [];
        for (const file of markdownFiles) {
            try {
                console.log(`[IPC] 读取文件: ${file.path}`);
                const content = fs.readFileSync(file.path, 'utf-8');
                console.log(`[IPC] 文件内容长度: ${content.length} 字节`);
                // 解析文件内容，提取元数据和正文
                const metaMatch = content.match(/^---\s*([\s\S]*?)\s*---\s*([\s\S]*)$/);
                if (metaMatch) {
                    const metaContent = metaMatch[1];
                    const markdownContent = metaMatch[2];
                    // 解析元数据
                    const titleMatch = metaContent.match(/title:\s*(.*)/);
                    const idMatch = metaContent.match(/id:\s*(.*)/);
                    const dateMatch = metaContent.match(/date:\s*(.*)/);
                    if (titleMatch && idMatch) {
                        // 从相对路径中提取文件夹路径
                        const folderPath = path.dirname(file.relativePath);
                        const folderName = folderPath === '.' ? '' : folderPath;
                        const note = {
                            id: idMatch[1],
                            title: titleMatch[1],
                            content: markdownContent,
                            date: dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString(),
                            folder: folderName, // 添加文件夹信息
                            path: file.relativePath // 添加相对路径信息
                        };
                        console.log(`[IPC] 成功解析笔记: ID=${note.id}, 标题=${note.title}, 日期=${note.date}, 文件夹=${note.folder}`);
                        notes.push(note);
                    }
                    else {
                        console.warn(`[IPC] 文件 ${file.path} 缺少必要的元数据 (title 或 id)`);
                    }
                }
                else {
                    console.warn(`[IPC] 文件 ${file.path} 格式不正确，无法解析元数据`);
                }
            }
            catch (fileError) {
                console.error(`[IPC] 处理文件 ${file.path} 时出错:`, fileError);
                // 继续处理其他文件
            }
        }
        console.log(`[IPC] 成功加载 ${notes.length} 个笔记`);
        return { success: true, notes, folders: allFolders };
    }
    catch (error) {
        console.error('[IPC] 加载markdown文件失败:', error);
        return {
            success: false,
            error: error.message,
            details: {
                path: getMarkdownDir(),
                errorName: error.name,
                errorStack: error.stack
            }
        };
    }
});
// 删除markdown文件
electron_1.ipcMain.handle('delete-markdown', async (_, id, filePath = '') => {
    try {
        if (!id) {
            console.error('删除markdown文件失败: ID不能为空');
            return { success: false, error: 'ID不能为空' };
        }
        const markdownDir = ensureMarkdownDir();
        console.log(`从目录删除markdown文件: ${markdownDir}`);
        let targetPath;
        // 如果提供了文件路径，使用它
        if (filePath && filePath.trim() !== '') {
            targetPath = path.join(markdownDir, filePath);
        }
        else {
            // 否则使用默认路径（根目录下的ID.md）
            targetPath = path.join(markdownDir, `${id}.md`);
        }
        console.log(`要删除的文件路径: ${targetPath}`);
        if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
            console.log(`成功删除文件: ${targetPath}`);
            // 检查并清理空文件夹
            const dirPath = path.dirname(targetPath);
            if (dirPath !== markdownDir) { // 不是根目录
                try {
                    const dirContents = fs.readdirSync(dirPath);
                    if (dirContents.length === 0) {
                        // 文件夹为空，可以删除
                        fs.rmdirSync(dirPath);
                        console.log(`删除空文件夹: ${dirPath}`);
                    }
                }
                catch (dirError) {
                    console.error(`检查/删除文件夹时出错: ${dirError}`);
                    // 继续执行，不影响主流程
                }
            }
            return { success: true };
        }
        else {
            console.warn(`文件不存在: ${targetPath}`);
            return { success: false, error: '文件不存在' };
        }
    }
    catch (error) {
        console.error('删除markdown文件失败:', error);
        return {
            success: false,
            error: error.message,
            details: {
                id,
                path: getMarkdownDir(),
                errorName: error.name,
                errorStack: error.stack
            }
        };
    }
});
// 获取markdown文件夹路径
electron_1.ipcMain.handle('get-markdown-dir', () => {
    try {
        const markdownDir = ensureMarkdownDir();
        return { success: true, path: markdownDir };
    }
    catch (error) {
        console.error('获取markdown文件夹路径失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
});
// 打开markdown文件夹
electron_1.ipcMain.handle('open-markdown-dir', async () => {
    try {
        const markdownDir = ensureMarkdownDir();
        console.log(`打开markdown文件夹: ${markdownDir}`);
        // 使用shell.openPath打开文件夹
        await electron_1.shell.openPath(markdownDir);
        return { success: true };
    }
    catch (error) {
        console.error('打开markdown文件夹失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
});
// 创建文件夹
electron_1.ipcMain.handle('create-folder', async (_, folderPath) => {
    try {
        if (!folderPath) {
            console.error('创建文件夹失败: 路径不能为空');
            return { success: false, error: '路径不能为空' };
        }
        const markdownDir = ensureMarkdownDir();
        const targetDir = path.join(markdownDir, folderPath);
        console.log(`创建文件夹: ${targetDir}`);
        // 递归创建文件夹
        fs.mkdirSync(targetDir, { recursive: true });
        return { success: true, path: folderPath };
    }
    catch (error) {
        console.error('创建文件夹失败:', error);
        return {
            success: false,
            error: error.message,
            details: {
                path: getMarkdownDir(),
                errorName: error.name,
                errorStack: error.stack
            }
        };
    }
});
// 移动文件或文件夹
electron_1.ipcMain.handle('move-item', async (_, sourcePath, targetFolder, isFolder) => {
    try {
        if (!sourcePath) {
            console.error('移动项目失败: 源路径不能为空');
            return { success: false, error: '源路径不能为空' };
        }
        const markdownDir = ensureMarkdownDir();
        const sourceFullPath = path.join(markdownDir, sourcePath);
        // 检查源路径是否存在
        if (!fs.existsSync(sourceFullPath)) {
            console.error(`移动项目失败: 源路径不存在 ${sourceFullPath}`);
            return { success: false, error: '源路径不存在' };
        }
        // 确保目标文件夹存在
        let targetDir = markdownDir;
        if (targetFolder && targetFolder.trim() !== '') {
            targetDir = path.join(markdownDir, targetFolder);
            // 递归创建文件夹
            fs.mkdirSync(targetDir, { recursive: true });
            console.log(`确保目标文件夹存在: ${targetDir}`);
        }
        // 获取源文件/文件夹名称
        const sourceName = path.basename(sourcePath);
        const targetPath = path.join(targetDir, sourceName);
        // 检查目标路径是否已存在
        if (fs.existsSync(targetPath)) {
            console.error(`移动项目失败: 目标路径已存在 ${targetPath}`);
            return { success: false, error: '目标路径已存在同名文件或文件夹' };
        }
        if (isFolder) {
            // 移动文件夹
            console.log(`移动文件夹: ${sourceFullPath} -> ${targetPath}`);
            // 递归复制文件夹内容
            const copyFolderRecursive = (src, dest) => {
                // 创建目标文件夹
                fs.mkdirSync(dest, { recursive: true });
                // 读取源文件夹内容
                const entries = fs.readdirSync(src, { withFileTypes: true });
                for (const entry of entries) {
                    const srcPath = path.join(src, entry.name);
                    const destPath = path.join(dest, entry.name);
                    if (entry.isDirectory()) {
                        // 递归复制子文件夹
                        copyFolderRecursive(srcPath, destPath);
                    }
                    else {
                        // 复制文件
                        fs.copyFileSync(srcPath, destPath);
                    }
                }
            };
            // 复制文件夹内容
            copyFolderRecursive(sourceFullPath, targetPath);
            // 删除源文件夹
            const deleteFolderRecursive = (folderPath) => {
                if (fs.existsSync(folderPath)) {
                    fs.readdirSync(folderPath).forEach((file) => {
                        const curPath = path.join(folderPath, file);
                        if (fs.lstatSync(curPath).isDirectory()) {
                            // 递归删除子文件夹
                            deleteFolderRecursive(curPath);
                        }
                        else {
                            // 删除文件
                            fs.unlinkSync(curPath);
                        }
                    });
                    // 删除空文件夹 - 删除所有文件夹，包括顶层文件夹
                    fs.rmdirSync(folderPath);
                }
            };
            deleteFolderRecursive(sourceFullPath);
            // 计算相对路径
            const relativeTargetPath = targetFolder ? path.join(targetFolder, sourceName) : sourceName;
            return {
                success: true,
                sourcePath: sourcePath,
                targetPath: relativeTargetPath,
                isFolder: true
            };
        }
        else {
            // 移动文件
            console.log(`移动文件: ${sourceFullPath} -> ${targetPath}`);
            // 读取源文件内容
            const fileContent = fs.readFileSync(sourceFullPath, 'utf-8');
            // 写入目标文件
            fs.writeFileSync(targetPath, fileContent, 'utf-8');
            // 删除源文件
            fs.unlinkSync(sourceFullPath);
            // 计算相对路径
            const relativeTargetPath = targetFolder ? path.join(targetFolder, sourceName) : sourceName;
            return {
                success: true,
                sourcePath: sourcePath,
                targetPath: relativeTargetPath,
                isFolder: false
            };
        }
    }
    catch (error) {
        console.error('移动项目失败:', error);
        return {
            success: false,
            error: error.message,
            details: {
                path: getMarkdownDir(),
                errorName: error.name,
                errorStack: error.stack
            }
        };
    }
});
// 删除文件夹
electron_1.ipcMain.handle('delete-folder', async (_, folderPath) => {
    try {
        if (!folderPath) {
            console.error('删除文件夹失败: 路径不能为空');
            return { success: false, error: '路径不能为空' };
        }
        const markdownDir = ensureMarkdownDir();
        const targetDir = path.join(markdownDir, folderPath);
        // 检查文件夹是否存在
        if (!fs.existsSync(targetDir)) {
            console.error(`删除文件夹失败: 文件夹不存在 ${targetDir}`);
            return { success: false, error: '文件夹不存在' };
        }
        // 检查是否是文件夹
        const stats = fs.statSync(targetDir);
        if (!stats.isDirectory()) {
            console.error(`删除文件夹失败: 路径不是文件夹 ${targetDir}`);
            return { success: false, error: '路径不是文件夹' };
        }
        console.log(`删除文件夹: ${targetDir}`);
        // 递归删除文件夹
        const deleteFolderRecursive = (folderPath) => {
            if (fs.existsSync(folderPath)) {
                fs.readdirSync(folderPath).forEach((file) => {
                    const curPath = path.join(folderPath, file);
                    if (fs.lstatSync(curPath).isDirectory()) {
                        // 递归删除子文件夹
                        deleteFolderRecursive(curPath);
                    }
                    else {
                        // 删除文件
                        fs.unlinkSync(curPath);
                    }
                });
                // 删除空文件夹
                fs.rmdirSync(folderPath);
            }
        };
        // 执行删除
        deleteFolderRecursive(targetDir);
        return { success: true, path: folderPath };
    }
    catch (error) {
        console.error('删除文件夹失败:', error);
        return {
            success: false,
            error: error.message,
            details: {
                path: folderPath,
                errorName: error.name,
                errorStack: error.stack
            }
        };
    }
});
// 在app.whenReady()中添加启动文件系统监听
electron_1.app.whenReady().then(() => {
    ensureMarkdownDir();
    createWindow();
    watchFileSystem(); // 启动文件系统监听
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
// 在应用退出前停止文件系统监听
electron_1.app.on('before-quit', () => {
    if (fsWatcher) {
        console.log('[MAIN] 停止文件系统监听');
        fsWatcher.close();
        fsWatcher = null;
    }
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
