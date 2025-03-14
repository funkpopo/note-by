import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import serve from 'electron-serve';

// 添加启动日志
console.log('=== Electron main process starting ===');
console.log('Current working directory:', process.cwd());
console.log('NODE_ENV:', process.env.NODE_ENV);

const loadURL = serve({ directory: '.next' });

let mainWindow: BrowserWindow | null;

const isDev = process.env.NODE_ENV === 'development';
const port = process.env.PORT || 3000;
const devUrl = `http://localhost:${port}`;

// 获取markdown文件夹路径
function getMarkdownDir() {
  if (isDev) {
    // 开发环境：项目根目录下的/markdown文件夹
    return path.join(process.cwd(), 'markdown');
  } else {
    // 生产环境：exe同级路径下的/markdown文件夹
    return path.join(path.dirname(app.getPath('exe')), 'markdown');
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
  } else {
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
    } catch (error) {
      console.error(`[MAIN] 读取markdown目录时出错: ${error}`);
    }
  }
  
  return markdownDir;
}

function createWindow() {
  mainWindow = new BrowserWindow({
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
      mainWindow?.webContents.send('load-notes');
    });
  } else {
    loadURL(mainWindow);
    // 在生产环境中，监听页面加载完成事件
    mainWindow.webContents.on('did-finish-load', () => {
      console.log('Page loaded in production mode');
      // 通知渲染进程加载笔记
      mainWindow?.webContents.send('load-notes');
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
      label: app.name,
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
            mainWindow?.webContents.send('menu-new-note');
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
            await shell.openExternal('https://github.com/yourusername/note-by');
          }
        }
      ]
    }
  ];

  // @ts-expect-error - Menu.buildFromTemplate类型问题
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 设置IPC处理器
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// 添加一个测试IPC处理器
ipcMain.handle('test-ipc', () => {
  console.log('Test IPC handler called');
  return { success: true, message: 'IPC is working!' };
});

// 保存markdown文件
ipcMain.handle('save-markdown', async (_, id: string, title: string, content: string) => {
  try {
    if (!id) {
      console.error('保存markdown文件失败: ID不能为空');
      return { success: false, error: 'ID不能为空' };
    }
    
    const markdownDir = ensureMarkdownDir();
    console.log(`保存markdown文件到目录: ${markdownDir}`);
    
    const filePath = path.join(markdownDir, `${id}.md`);
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
    
    return { success: true, filePath };
  } catch (error) {
    console.error('保存markdown文件失败:', error);
    return { 
      success: false, 
      error: (error as Error).message,
      details: {
        id,
        path: getMarkdownDir(),
        errorName: (error as Error).name,
        errorStack: (error as Error).stack
      }
    };
  }
});

// 加载所有markdown文件
ipcMain.handle('load-all-markdown', async () => {
  try {
    const markdownDir = ensureMarkdownDir();
    console.log(`[IPC] 从目录加载markdown文件: ${markdownDir}`);
    
    // 检查目录是否存在
    if (!fs.existsSync(markdownDir)) {
      console.error(`[IPC] Markdown目录不存在: ${markdownDir}`);
      return { success: false, error: `Markdown目录不存在: ${markdownDir}` };
    }
    
    // 列出目录内容
    console.log(`[IPC] 目录 ${markdownDir} 的内容:`);
    const dirContents = fs.readdirSync(markdownDir);
    dirContents.forEach(item => {
      const itemPath = path.join(markdownDir, item);
      const stats = fs.statSync(itemPath);
      console.log(`[IPC] - ${item} (${stats.isDirectory() ? '目录' : '文件'}, ${stats.size} 字节)`);
    });
    
    const files = dirContents.filter(file => file.endsWith('.md'));
    console.log(`[IPC] 找到 ${files.length} 个markdown文件`);
    
    const notes = [];
    for (const file of files) {
      try {
        const filePath = path.join(markdownDir, file);
        console.log(`[IPC] 读取文件: ${filePath}`);
        const content = fs.readFileSync(filePath, 'utf-8');
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
            const note = {
              id: idMatch[1],
              title: titleMatch[1],
              content: markdownContent,
              date: dateMatch ? new Date(dateMatch[1]).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
            };
            console.log(`[IPC] 成功解析笔记: ID=${note.id}, 标题=${note.title}, 日期=${note.date}`);
            notes.push(note);
          } else {
            console.warn(`[IPC] 文件 ${file} 缺少必要的元数据 (title 或 id)`);
          }
        } else {
          console.warn(`[IPC] 文件 ${file} 格式不正确，无法解析元数据`);
        }
      } catch (fileError) {
        console.error(`[IPC] 处理文件 ${file} 时出错:`, fileError);
        // 继续处理其他文件
      }
    }
    
    console.log(`[IPC] 成功加载 ${notes.length} 个笔记`);
    return { success: true, notes };
  } catch (error) {
    console.error('[IPC] 加载markdown文件失败:', error);
    return { 
      success: false, 
      error: (error as Error).message,
      details: {
        path: getMarkdownDir(),
        errorName: (error as Error).name,
        errorStack: (error as Error).stack
      }
    };
  }
});

// 删除markdown文件
ipcMain.handle('delete-markdown', async (_, id: string) => {
  try {
    if (!id) {
      console.error('删除markdown文件失败: ID不能为空');
      return { success: false, error: 'ID不能为空' };
    }
    
    const markdownDir = ensureMarkdownDir();
    console.log(`从目录删除markdown文件: ${markdownDir}`);
    
    const filePath = path.join(markdownDir, `${id}.md`);
    console.log(`要删除的文件路径: ${filePath}`);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`成功删除文件: ${filePath}`);
      return { success: true };
    } else {
      console.warn(`文件不存在: ${filePath}`);
      return { success: false, error: '文件不存在' };
    }
  } catch (error) {
    console.error('删除markdown文件失败:', error);
    return { 
      success: false, 
      error: (error as Error).message,
      details: {
        id,
        path: getMarkdownDir(),
        errorName: (error as Error).name,
        errorStack: (error as Error).stack
      }
    };
  }
});

// 获取markdown文件夹路径
ipcMain.handle('get-markdown-dir', () => {
  try {
    const markdownDir = ensureMarkdownDir();
    return { success: true, path: markdownDir };
  } catch (error) {
    console.error('获取markdown文件夹路径失败:', error);
    return { 
      success: false, 
      error: (error as Error).message 
    };
  }
});

// 打开markdown文件夹
ipcMain.handle('open-markdown-dir', async () => {
  try {
    const markdownDir = ensureMarkdownDir();
    console.log(`打开markdown文件夹: ${markdownDir}`);
    
    // 使用shell.openPath打开文件夹
    await shell.openPath(markdownDir);
    return { success: true };
  } catch (error) {
    console.error('打开markdown文件夹失败:', error);
    return { 
      success: false, 
      error: (error as Error).message 
    };
  }
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.removeAllListeners('closed');
    mainWindow.close();
  }
});

if (isDev) {
  app.on('quit', () => {
    process.exit(0);
  });
} 