import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import chokidar from 'chokidar';
import isDev from 'electron-is-dev';
import { OpenAI } from 'openai';
import { createClient } from 'webdav';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow;
let watcher = null;

// 获取笔记存储路径
const getMarkdownDir = () => {
  if (isDev) {
    // 开发环境：笔记保存在项目根目录的 markdown 文件夹中
    return path.join(dirname(__dirname), 'markdown');
  } else {
    // 生产环境：笔记保存在应用程序同级目录的 markdown 文件夹中
    return path.join(path.dirname(app.getPath('exe')), 'markdown');
  }
};

// 确保markdown目录存在
const ensureMarkdownDirExists = () => {
  const dir = getMarkdownDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

// 确保组目录存在
const ensureGroupDirExists = (groupName) => {
  if (!groupName || groupName === 'default') {
    return ensureMarkdownDirExists();
  }
  
  const baseDir = getMarkdownDir();
  
  // 处理嵌套分组路径（例如 "分组A/子分组B"）
  const groupParts = groupName.split('/');
  let currentPath = baseDir;
  
  // 递归创建每一级目录
  for (const part of groupParts) {
    currentPath = path.join(currentPath, part);
    if (!fs.existsSync(currentPath)) {
      fs.mkdirSync(currentPath, { recursive: true });
    }
  }
  
  return currentPath;
};

// 设置文件监控
const setupWatcher = () => {
  const markdownDir = getMarkdownDir();
  
  // 确保目录存在
  if (!fs.existsSync(markdownDir)) {
    fs.mkdirSync(markdownDir, { recursive: true });
  }
  
  // 如果已有监视器，先关闭它
  if (watcher) {
    watcher.close();
  }
  
  // 创建新的监视器
  watcher = chokidar.watch(markdownDir, {
    persistent: true,
    ignoreInitial: false,
    depth: 99,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  });
  
  // 监听文件变化事件
  watcher
    .on('add', (path) => {
      console.log(`File added: ${path}`);
      notifyClientOfChange();
    })
    .on('change', (path) => {
      console.log(`File changed: ${path}`);
      notifyClientOfChange();
    })
    .on('unlink', (path) => {
      console.log(`File removed: ${path}`);
      notifyClientOfChange();
    })
    .on('addDir', (path) => {
      console.log(`Directory added: ${path}`);
      notifyClientOfChange();
    })
    .on('unlinkDir', (path) => {
      console.log(`Directory removed: ${path}`);
      notifyClientOfChange();
    })
    .on('ready', () => {
      console.log('Initial scan complete. Watching for changes...');
    });
    
  console.log(`Watching for changes in ${markdownDir}`);
};

// 通知客户端文件有变化
const notifyClientOfChange = () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('notes-changed');
  }
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: fileURLToPath(new URL('./preload.js', import.meta.url))
    },
  });
  
  // 移除菜单栏
  mainWindow.setMenu(null);

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '..', '.next', 'server', 'app', 'index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // 设置文件监控
  setupWatcher();
}

app.whenReady().then(() => {
  // 确保markdown目录存在
  ensureMarkdownDirExists();
  
  // 迁移旧的配置文件
  migrateOldConfigs();
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  setupAIConfigHandlers();
  setupAppearanceConfigHandlers();
  setupWebDAVHandlers();
  
  // 加载初始配置并设置定时器
  const syncConfig = readSyncConfig();
  if (syncConfig.enabled && syncConfig.autoSync) {
    setupSyncTimer(syncConfig);
  }
});

// 当所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  // 关闭文件监控
  if (watcher) {
    watcher.close();
  }
  
  app.quit();
});

// IPC事件处理
ipcMain.handle('get-notes', async () => {
  const baseDir = getMarkdownDir();
  const notes = [];
  const emptyGroups = [];
  
  try {
    // 扫描目录及子目录中的所有笔记和空分组
    const scanDirectory = (dir, groupPath = '') => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      
      // 获取当前目录中的所有markdown文件
      const markdownFiles = items
        .filter(item => !item.isDirectory() && item.name.endsWith('.md'))
        .map(item => {
          const filePath = path.join(dir, item.name);
          const stats = fs.statSync(filePath);
          return {
            name: item.name,
            path: filePath,
            lastModified: stats.mtime,
            group: groupPath || 'default'
          };
        });
      
      // 将笔记添加到结果中
      notes.push(...markdownFiles);
      
      // 获取当前目录中的所有子目录
      const subDirs = items
        .filter(item => item.isDirectory())
        .map(item => item.name);
      
      // 如果当前目录不是根目录，并且没有markdown文件，将其标记为空分组
      if (groupPath && markdownFiles.length === 0 && !emptyGroups.includes(groupPath)) {
        emptyGroups.push(groupPath);
      }
      
      // 遍历所有子目录
      for (const subDir of subDirs) {
        const subDirPath = path.join(dir, subDir);
        const subGroupPath = groupPath 
          ? `${groupPath}/${subDir}` 
          : subDir;
        
        // 先递归扫描子目录，以确保所有子目录内容都已处理
        scanDirectory(subDirPath, subGroupPath);
      }
    };
    
    // 开始从根目录扫描
    scanDirectory(baseDir);
    
    // 确保所有空目录都被正确检测到
    const dirContents = fs.readdirSync(baseDir, { withFileTypes: true });
    const topLevelDirs = dirContents
      .filter(item => item.isDirectory())
      .map(item => item.name);
    
    // 检查顶级目录是否为空目录
    topLevelDirs.forEach(dirName => {
      // 检查是否有任何markdown文件存在于这个目录或其子目录中
      const hasMarkdownInNotes = notes.some(note => 
        note.group === dirName || note.group.startsWith(`${dirName}/`)
      );
      
      // 如果在笔记列表中没有找到任何与此目录相关的笔记，并且其不是已知的空组，则添加它
      if (!hasMarkdownInNotes && !emptyGroups.includes(dirName)) {
        emptyGroups.push(dirName);
      }
    });
    
    console.log("Notes found:", notes.length);
    console.log("Empty groups:", emptyGroups);
    
    return { notes, emptyGroups };
  } catch (err) {
    console.error('Error reading notes directory:', err);
    return { notes: [], emptyGroups: [] };
  }
});

// 添加重命名笔记的处理函数
ipcMain.handle('rename-note', async (event, { oldPath, newName }) => {
  try {
    // 获取目录和文件名
    const dirName = path.dirname(oldPath);
    const newFileName = newName.endsWith('.md') ? newName : `${newName}.md`;
    const newPath = path.join(dirName, newFileName);
    
    // 检查新文件名是否已存在
    if (fs.existsSync(newPath) && oldPath !== newPath) {
      return {
        success: false,
        error: '该目录中已存在同名文件'
      };
    }
    
    // 重命名文件
    fs.renameSync(oldPath, newPath);
    
    return {
      success: true,
      newPath: newPath
    };
  } catch (err) {
    console.error('Error renaming note:', err);
    return {
      success: false,
      error: err.message
    };
  }
});

ipcMain.handle('get-note-content', async (event, notePath) => {
  try {
    const content = fs.readFileSync(notePath, 'utf8');
    return content;
  } catch (err) {
    console.error('Error reading note:', err);
    return '';
  }
});

ipcMain.handle('save-note', async (event, { notePath, content }) => {
  try {
    fs.writeFileSync(notePath, content);
    return true;
  } catch (err) {
    console.error('Error saving note:', err);
    return false;
  }
});

ipcMain.handle('create-note', async (event, { name, content, group }) => {
  // 确保组目录存在
  const dir = ensureGroupDirExists(group);
  const notePath = path.join(dir, name.endsWith('.md') ? name : `${name}.md`);
  
  try {
    fs.writeFileSync(notePath, content || '');
    return {
      success: true,
      path: notePath,
      group: group || 'default'
    };
  } catch (err) {
    console.error('Error creating note:', err);
    return {
      success: false,
      error: err.message
    };
  }
});

ipcMain.handle('create-group', async (event, { groupName }) => {
  try {
    const groupDir = ensureGroupDirExists(groupName);
    return {
      success: true,
      path: groupDir
    };
  } catch (err) {
    console.error('Error creating group:', err);
    return {
      success: false,
      error: err.message
    };
  }
});

ipcMain.handle('move-note', async (event, { notePath, targetGroup }) => {
  try {
    const fileName = path.basename(notePath);
    const targetDir = ensureGroupDirExists(targetGroup);
    const newPath = path.join(targetDir, fileName);
    
    // 检查目标文件是否已存在
    if (fs.existsSync(newPath) && notePath !== newPath) {
      return {
        success: false,
        error: '目标分组中已存在同名文件'
      };
    }
    
    // 读取笔记内容
    const content = fs.readFileSync(notePath, 'utf8');
    
    // 写入新位置
    fs.writeFileSync(newPath, content);
    
    // 如果源文件和目标文件不同，删除源文件
    if (notePath !== newPath) {
      fs.unlinkSync(notePath);
    }
    
    return {
      success: true,
      newPath: newPath
    };
  } catch (err) {
    console.error('Error moving note:', err);
    return {
      success: false,
      error: err.message
    };
  }
});

// 移动分组
ipcMain.handle('move-group', async (event, { sourceGroup, targetGroup }) => {
  // 分组不能移动到其子分组下或自己下
  if (targetGroup === sourceGroup || targetGroup.startsWith(sourceGroup + '/')) {
    return {
      success: false,
      error: '不能将分组移动到其自身或子分组下'
    };
  }
  
  try {
    const baseDir = getMarkdownDir();
    const sourceDir = path.join(baseDir, sourceGroup);
    
    // 确认源目录存在
    if (!fs.existsSync(sourceDir)) {
      return {
        success: false,
        error: `分组 "${sourceGroup}" 不存在`
      };
    }
    
    // 获取分组的名称（最后一部分）
    const groupName = sourceGroup.split('/').pop();
    
    // 确保目标目录存在
    const targetParentDir = targetGroup === 'default' 
      ? baseDir 
      : ensureGroupDirExists(targetGroup);
    
    // 新的分组完整路径
    const newGroupPath = targetGroup === 'default' 
      ? groupName 
      : `${targetGroup}/${groupName}`;
    
    // 新的物理路径
    const newDir = path.join(targetParentDir, groupName);
    
    // 检查目标路径是否已存在
    if (fs.existsSync(newDir)) {
      return {
        success: false,
        error: `目标位置已存在同名分组：${groupName}`
      };
    }
    
    // 移动目录，通过创建新目录、复制所有内容，然后删除原目录
    fs.mkdirSync(newDir, { recursive: true });
    
    // 递归复制所有文件和子目录
    const copyDir = (src, dest) => {
      // 获取源目录中的所有文件和文件夹
      const entries = fs.readdirSync(src, { withFileTypes: true });
      
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
          // 为子目录递归执行复制
          fs.mkdirSync(destPath, { recursive: true });
          copyDir(srcPath, destPath);
        } else {
          // 复制文件
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };
    
    // 执行复制
    copyDir(sourceDir, newDir);
    
    // 删除原目录
    const deleteDir = (dirPath) => {
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        
        for (const file of files) {
          const curPath = path.join(dirPath, file);
          
          if (fs.lstatSync(curPath).isDirectory()) {
            deleteDir(curPath);
          } else {
            fs.unlinkSync(curPath);
          }
        }
        
        fs.rmdirSync(dirPath);
      }
    };
    
    deleteDir(sourceDir);
    
    return {
      success: true,
      newGroupPath: newGroupPath
    };
  } catch (err) {
    console.error('Error moving group:', err);
    return {
      success: false,
      error: err.message
    };
  }
});

ipcMain.handle('delete-note', async (event, notePath) => {
  try {
    // 获取笔记所在分组
    const baseDir = getMarkdownDir();
    const relPath = path.relative(baseDir, notePath).replace(/\\/g, '/');
    const dirName = path.dirname(relPath);
    
    // 删除文件
    fs.unlinkSync(notePath);
    
    // 检查分组是否为空(不是default分组)
    if (dirName !== '.') {
      const dirPath = path.join(baseDir, dirName);
      
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        const hasMarkdownFile = files.some(file => file.endsWith('.md'));
        
        // 如果没有markdown文件但目录仍然存在，通知客户端刷新
        if (!hasMarkdownFile) {
          notifyClientOfChange();
        }
      }
    }
    
    return true;
  } catch (err) {
    console.error('Error deleting note:', err);
    return false;
  }
});

ipcMain.handle('delete-group', async (event, groupName) => {
  if (groupName === 'default') {
    return { success: false, error: '不能删除默认分组' };
  }
  
  try {
    const baseDir = getMarkdownDir();
    const groupDir = path.join(baseDir, groupName);
    
    if (fs.existsSync(groupDir)) {
      // 递归删除目录及其内容
      const deleteDir = (dirPath) => {
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          
          for (const file of files) {
            const curPath = path.join(dirPath, file);
            
            if (fs.lstatSync(curPath).isDirectory()) {
              // 递归删除子目录
              deleteDir(curPath);
            } else {
              // 删除文件
              fs.unlinkSync(curPath);
              console.log(`删除文件: ${curPath}`);
            }
          }
          
          // 删除目录本身
          fs.rmdirSync(dirPath);
          console.log(`删除目录: ${dirPath}`);
        }
      };
      
      // 执行递归删除
      deleteDir(groupDir);
      
      // 验证目录已被删除
      if (fs.existsSync(groupDir)) {
        return {
          success: false,
          error: '分组删除失败，请重试'
        };
      }
      
      return { success: true };
    } else {
      return { success: false, error: `分组 "${groupName}" 不存在` };
    }
  } catch (err) {
    console.error('Error deleting group:', err);
    return {
      success: false,
      error: `删除分组失败: ${err.message}`
    };
  }
});

// 获取设置文件路径
const getSettingsPath = () => {
  const isPackaged = !process.env.ELECTRON_DEV;
  if (isPackaged) {
    const appPath = path.dirname(app.getPath('exe'));
    return path.join(appPath, 'settings.json');
  } else {
    return path.join(__dirname, '..', 'settings.json');
  }
};

// 读取整个设置文件
const readSettings = () => {
  const settingsPath = getSettingsPath();
  
  try {
    if (fs.existsSync(settingsPath)) {
      const settingsData = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(settingsData);
      
      // 如果存在同步配置的lastSync字段，转换为Date对象
      if (settings.sync?.lastSync) {
        settings.sync.lastSync = new Date(settings.sync.lastSync);
      }
      
      return settings;
    }
  } catch (error) {
    console.error('Error reading settings file:', error);
  }
  
  // 如果文件不存在或读取出错，返回默认设置
  return {
    ai: [],
    appearance: {
      fontFamily: "system-ui, sans-serif",
      fontSize: "16px",
      sidebarWidth: 288, // 默认宽度 72 * 4 = 288px
    },
    sync: {
      enabled: false,
      serverUrl: '',
      username: '',
      password: '',
      syncInterval: 60,
      autoSync: false
    }
  };
};

// 保存设置到文件
const saveSettings = (settings) => {
  const settingsPath = getSettingsPath();
  
  try {
    const settingsToSave = { ...settings };
    
    // 如果存在lastSync字段，确保它是ISO字符串格式
    if (settingsToSave.sync?.lastSync instanceof Date) {
      settingsToSave.sync.lastSync = settingsToSave.sync.lastSync.toISOString();
    }
    
    // 确保目录存在
    const configDir = path.dirname(settingsPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // 格式化JSON，确保易于阅读
    const jsonData = JSON.stringify(settingsToSave, null, 2);
    
    // 写入文件
    fs.writeFileSync(settingsPath, jsonData, 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving settings file:', error);
    return false;
  }
};

// 读取外观设置文件
const readAppearanceSettings = () => {
  const settings = readSettings();
  return settings.appearance || {
    fontFamily: "system-ui, sans-serif",
    fontSize: "16px",
    sidebarWidth: 288 // 默认宽度 72 * 4 = 288px
  };
};

// 保存外观设置到文件
const saveAppearanceSettingsToFile = (appearanceSettings) => {
  try {
    // 验证settings对象，确保数据格式正确
    const validSettings = {
      fontFamily: typeof appearanceSettings.fontFamily === 'string' ? appearanceSettings.fontFamily : "system-ui, sans-serif",
      fontSize: typeof appearanceSettings.fontSize === 'string' ? appearanceSettings.fontSize : "16px",
      sidebarWidth: typeof appearanceSettings.sidebarWidth === 'number' ? appearanceSettings.sidebarWidth : 288,
      theme: ['light', 'dark', 'system', undefined].includes(appearanceSettings.theme) ? appearanceSettings.theme : undefined
    };
    
    // 读取当前所有设置
    const settings = readSettings();
    
    // 更新外观设置部分
    settings.appearance = validSettings;
    
    // 保存整个设置文件
    const success = saveSettings(settings);
    
    if (success) {
      console.log('外观设置已保存');
      
      // 通知渲染进程设置已更改
      try {
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          if (appearanceSettings.theme) {
            mainWindow.webContents.send('theme-changed', appearanceSettings.theme);
          }
          
          // 发送所有外观设置变更事件
          mainWindow.webContents.send('appearance-settings-changed', validSettings);
        }
      } catch (err) {
        console.error('通知渲染进程设置变更失败:', err);
      }
    }
    
    return success;
  } catch (error) {
    console.error('保存外观设置失败:', error);
    return false;
  }
};

// 读取AI配置
const readAIConfigs = () => {
  const settings = readSettings();
  return settings.ai || [];
};

// 保存AI配置
const saveAIConfigsToFile = (configs) => {
  try {
    // 读取当前所有设置
    const settings = readSettings();
    
    // 更新AI配置部分
    settings.ai = configs;
    
    // 保存整个设置文件
    const success = saveSettings(settings);
    
    if (success) {
      console.log('AI配置已保存');
    }
    
    return success;
  } catch (error) {
    console.error('保存AI配置失败:', error);
    return false;
  }
};

// 添加AI配置相关的IPC处理程序
const setupAIConfigHandlers = () => {
  // 获取所有AI配置
  ipcMain.handle('get-ai-configs', async () => {
    return readAIConfigs();
  });
  
  // 保存新的AI配置
  ipcMain.handle('save-ai-config', async (event, config) => {
    try {
      const configs = readAIConfigs();
      
      // 如果设置为默认，先将其他配置设为非默认
      if (config.isDefault) {
        configs.forEach(c => {
          c.isDefault = false;
        });
      }
      
      // 如果没有配置，则此配置默认为默认
      if (configs.length === 0) {
        config.isDefault = true;
      }
      
      // 确保有唯一ID
      config.id = config.id || Date.now().toString();
      
      configs.push(config);
      const success = saveAIConfigsToFile(configs);
      
      return { success };
    } catch (error) {
      console.error('Error saving AI config:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 更新AI配置
  ipcMain.handle('update-ai-config', async (event, { id, config }) => {
    try {
      const configs = readAIConfigs();
      const index = configs.findIndex(c => c.id === id);
      
      if (index === -1) {
        return { success: false, error: '找不到指定的配置' };
      }
      
      // 如果设置为默认，先将其他配置设为非默认
      if (config.isDefault) {
        configs.forEach(c => {
          c.isDefault = false;
        });
      }
      
      // 更新配置
      configs[index] = { ...configs[index], ...config };
      
      const success = saveAIConfigsToFile(configs);
      return { success };
    } catch (error) {
      console.error('Error updating AI config:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 删除AI配置
  ipcMain.handle('delete-ai-config', async (event, id) => {
    try {
      let configs = readAIConfigs();
      const index = configs.findIndex(c => c.id === id);
      
      if (index === -1) {
        return { success: false, error: '找不到指定的配置' };
      }
      
      // 检查是否删除的是默认配置
      const wasDefault = configs[index].isDefault;
      
      // 删除配置
      configs.splice(index, 1);
      
      // 如果删除的是默认配置且还有其他配置，设置第一个为默认
      if (wasDefault && configs.length > 0) {
        configs[0].isDefault = true;
      }
      
      const success = saveAIConfigsToFile(configs);
      return { success };
    } catch (error) {
      console.error('Error deleting AI config:', error);
      return { success: false, error: error.message };
    }
  });

  // 测试AI配置
  ipcMain.handle('test-ai-config', async (event, config) => {
    try {
      // 创建OpenAI客户端实例
      const openai = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.apiUrl,
        organization: config.organizationId || undefined,
      });
      
      // 发送一个简单的测试消息，使用用户提供的模型名称
      const response = await openai.chat.completions.create({
        model: config.name, // 使用用户提供的模型名称
        messages: [
          { role: "system", content: "你是一个助手。" },
          { role: "user", content: "测试连接，请回复'连接成功'。" }
        ],
        max_tokens: 20 // 限制token数量以提高速度
      });
      
      // 如果能正常获得响应，则连接成功
      if (response && response.choices && response.choices.length > 0) {
        return {
          success: true,
          message: `连接成功！模型 ${config.name} 可用。`,
        };
      } else {
        return {
          success: false,
          message: "API返回了空响应"
        };
      }
    } catch (error) {
      console.error('测试AI配置时出错:', error);
      // 提取更有用的错误信息
      let errorMessage = error.message;
      if (error.response) {
        try {
          const errorData = error.response.data || {};
          errorMessage = errorData.error?.message || errorMessage;
        } catch {
          // 解析错误时出错，使用原始错误信息
        }
      }
      
      return {
        success: false,
        message: `连接失败: ${errorMessage}`
      };
    }
  });
  
  // 调用AI助手
  ipcMain.handle('call-ai-assistant', async (event, params) => {
    try {
      const { config, messages } = params;
      
      if (!config || !messages) {
        return {
          success: false,
          error: "缺少必要参数"
        };
      }
      
      // 创建OpenAI客户端实例
      const openai = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.apiUrl,
        organization: config.organizationId || undefined,
      });
      
      // 调用AI模型
      const response = await openai.chat.completions.create({
        model: config.name,
        messages: messages,
        temperature: config.temperature || 0.7,
        max_tokens: 1500
      });
      
      // 提取响应内容
      if (response && response.choices && response.choices.length > 0) {
        const content = response.choices[0].message.content;
        return {
          success: true,
          content: content
        };
      } else {
        return {
          success: false,
          error: "AI返回了空响应"
        };
      }
    } catch (error) {
      console.error('调用AI助手时出错:', error);
      // 提取更有用的错误信息
      let errorMessage = error.message;
      if (error.response) {
        try {
          const errorData = error.response.data || {};
          errorMessage = errorData.error?.message || errorMessage;
        } catch {
          // 解析错误时出错，使用原始错误信息
        }
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  });

  // 追踪当前活跃的流式请求
  let activeStreamingRequest = null;

  // 处理AI流式请求
  ipcMain.on('stream-ai-assistant', async (event, { config, messages }) => {
    try {
      const { apiKey, apiUrl, organizationId } = config;
      
      // 详细记录请求配置（不包含API密钥）
      console.log('准备AI流式请求:', {
        model: config.name,
        baseURL: config.apiUrl,
        hasApiKey: Boolean(apiKey),
        hasOrgId: Boolean(organizationId),
        messagesCount: messages.length
      });
      
      if (!apiKey) {
        const error = "API密钥未设置";
        console.error('AI流式请求错误:', error);
        event.sender.send('ai-stream-error', error);
        return;
      }

      if (!apiUrl) {
        const error = "API地址未设置";
        console.error('AI流式请求错误:', error);
        event.sender.send('ai-stream-error', error);
        return;
      }
      
      if (!config.name) {
        const error = "模型名称未设置";
        console.error('AI流式请求错误:', error);
        event.sender.send('ai-stream-error', error);
        return;
      }
      
      // 创建客户端，确保baseURL正确设置
      const openai = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.apiUrl,
        organization: config.organizationId,
        timeout: 15000, // 超时时间
        maxRetries: 3,  // 重试次数
        dangerouslyAllowBrowser: false
      });
      
      console.log(`开始流式请求，模型：${config.name}，API地址：${config.apiUrl}`);
      
      // 创建请求
      const streamingRequest = await openai.chat.completions.create({
        model: config.name,
        messages,
        temperature: config.temperature || 0.7,
        stream: true,
      });
      
      // 存储当前请求引用
      activeStreamingRequest = streamingRequest;
      
      try {
        // 处理流式响应
        for await (const chunk of streamingRequest) {
          if (chunk.choices[0]?.delta?.content) {
            event.sender.send('ai-stream-chunk', chunk.choices[0].delta.content);
          }
        }
        
        // 流式处理结束
        console.log('流式处理成功完成');
        activeStreamingRequest = null;
        event.sender.send('ai-stream-complete');
      } catch (streamingError) {
        console.error('流式处理过程中错误:', streamingError);
        
        // 构建详细的错误消息
        let errorMsg = streamingError.message || '未知错误';
        if (streamingError.cause) {
          errorMsg += ` (原因: ${streamingError.cause.code || streamingError.cause.message || '未知'})`;
        }
        
        event.sender.send('ai-stream-error', errorMsg);
        activeStreamingRequest = null;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        // 这是取消请求导致的错误，不需要发送错误消息
        console.log('流式请求被取消');
      } else {
        console.error('AI流式请求错误:', error);
        
        // 构建详细的错误消息
        let errorMsg = error.message || '未知错误';
        
        // 添加连接错误的详细信息
        if (error.cause) {
          const cause = error.cause;
          errorMsg += ` (原因: ${cause.code || cause.message || '未知'})`;
          
          // 网络连接问题的提示
          if (cause.code === 'ETIMEDOUT' || cause.code === 'ECONNREFUSED') {
            errorMsg += ` - 请检查API地址是否正确，以及网络连接是否正常`;
          }
        }
        
        event.sender.send('ai-stream-error', errorMsg);
      }
      
      activeStreamingRequest = null;
    }
  });

  // 处理取消流式请求
  ipcMain.on('cancel-ai-stream', () => {
    if (activeStreamingRequest) {
      if (typeof activeStreamingRequest.abort === 'function') {
        activeStreamingRequest.abort();
      } else if (typeof activeStreamingRequest.controller?.abort === 'function') {
        activeStreamingRequest.controller.abort();
      }
      
      activeStreamingRequest = null;
      console.log('流式请求已取消');
    }
  });
};

// 添加外观设置相关的IPC处理程序
const setupAppearanceConfigHandlers = () => {
  // 获取外观设置
  ipcMain.handle('get-appearance-settings', async () => {
    return readAppearanceSettings();
  });
  
  // 保存外观设置
  ipcMain.handle('save-appearance-settings', async (event, settings) => {
    try {
      const success = saveAppearanceSettingsToFile(settings);
      return { success };
    } catch (error) {
      console.error('Error saving appearance settings:', error);
      return { success: false, error: error.message };
    }
  });
};

// 读取同步配置
const readSyncConfig = () => {
  const settings = readSettings();
  return settings.sync || {
    enabled: false,
    serverUrl: '',
    username: '',
    password: '',
    syncInterval: 60,
    autoSync: false
  };
};

// 保存同步配置到文件
const saveSyncConfigToFile = (syncConfig) => {
  try {
    // 读取当前所有设置
    const settings = readSettings();
    
    // 更新同步配置部分
    settings.sync = syncConfig;
    
    // 保存整个设置文件
    const success = saveSettings(settings);
    
    if (success) {
      console.log('同步配置已保存');
    }
    
    return { success };
  } catch (error) {
    console.error('保存同步配置失败:', error);
    return { success: false, error: error.message };
  }
};

// 设置WebDAV同步处理器
const setupWebDAVHandlers = () => {
  // 获取同步配置
  ipcMain.handle('get-sync-config', async () => {
    return readSyncConfig();
  });
  
  // 保存同步配置
  ipcMain.handle('save-sync-config', async (event, config) => {
    const syncInterval = config.syncInterval;
    
    // 验证syncInterval是合理的值
    if (isNaN(syncInterval) || syncInterval < 1 || syncInterval > 1440) {
      return { 
        success: false, 
        error: '同步间隔必须是1到1440分钟之间的数字' 
      };
    }
    
    // 如果启用了自动同步，设置定时器
    if (config.enabled && config.autoSync) {
      setupSyncTimer(config);
    } else {
      clearSyncTimer();
    }
    
    return saveSyncConfigToFile(config);
  });
  
  // 测试WebDAV连接
  ipcMain.handle('test-webdav-connection', async (event, config) => {
    try {
      // 创建WebDAV客户端
      const client = createClient(config.serverUrl, {
        username: config.username || '',
        password: config.password || ''
      });
      
      // 检查连接是否可用 (获取根目录内容)
      await client.getDirectoryContents('/');
      
      return { success: true };
    } catch (error) {
      console.error('WebDAV connection test failed:', error);
      return { 
        success: false, 
        error: error.message || '无法连接到WebDAV服务器' 
      };
    }
  });
  
  // 手动触发同步
  ipcMain.handle('sync-notes', async () => {
    try {
      return await syncWithWebDAV();
    } catch (error) {
      console.error('Manual sync failed:', error);
      return { 
        success: false, 
        error: error.message || '同步失败' 
      };
    }
  });
};

// 设置自动同步定时器
let syncTimer = null;
const setupSyncTimer = (config) => {
  // 清除现有定时器
  clearSyncTimer();
  
  // 如果启用了自动同步，创建新的定时器
  if (config.enabled && config.autoSync) {
    const intervalMinutes = config.syncInterval || 60;
    const intervalMs = intervalMinutes * 60 * 1000;
    
    console.log(`Setting up automatic sync timer: ${intervalMinutes} minutes`);
    
    syncTimer = setInterval(async () => {
      console.log('Auto sync triggered');
      try {
        await syncWithWebDAV();
      } catch (error) {
        console.error('Auto sync failed:', error);
        // 通知前端同步失败
        if (mainWindow) {
          mainWindow.webContents.send('sync-status-changed', {
            syncing: false,
            lastError: error.message,
            message: '自动同步失败'
          });
        }
      }
    }, intervalMs);
  }
};

// 清除同步定时器
const clearSyncTimer = () => {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
};

// 与WebDAV同步
const syncWithWebDAV = async () => {
  const config = readSyncConfig();
  
  // 如果同步未启用，返回错误
  if (!config.enabled) {
    return { 
      success: false, 
      error: '同步未启用' 
    };
  }
  
  // 如果没有设置服务器URL，返回错误
  if (!config.serverUrl) {
    return { 
      success: false, 
      error: '未设置WebDAV服务器地址' 
    };
  }
  
  // 通知前端开始同步
  if (mainWindow) {
    mainWindow.webContents.send('sync-status-changed', {
      syncing: true,
      message: '正在同步...'
    });
  }
  
  try {
    // 创建WebDAV客户端
    const client = createClient(config.serverUrl, {
      username: config.username || '',
      password: config.password || ''
    });
    
    // 获取Markdown目录路径
    const markdownDir = getMarkdownDir();
    
    // 确保远程根目录存在
    const remoteDirExists = await client.exists('/note-by-sync');
    if (!remoteDirExists) {
      await client.createDirectory('/note-by-sync');
    }
    
    // 同步本地文件到远程
    await syncLocalToRemote(client, markdownDir, '/note-by-sync');
    
    // 同步远程文件到本地
    await syncRemoteToLocal(client, '/note-by-sync', markdownDir);
    
    // 更新上次同步时间
    config.lastSync = new Date();
    saveSyncConfigToFile(config);
    
    // 通知前端同步完成
    if (mainWindow) {
      mainWindow.webContents.send('sync-status-changed', {
        syncing: false,
        lastSync: new Date(),
        message: '同步完成'
      });
    }
    
    // 通知前端重新加载笔记列表
    notifyClientOfChange();
    
    return { success: true };
  } catch (error) {
    console.error('Sync failed:', error);
    
    // 通知前端同步失败
    if (mainWindow) {
      mainWindow.webContents.send('sync-status-changed', {
        syncing: false,
        lastError: error.message,
        message: '同步失败'
      });
    }
    
    return { 
      success: false, 
      error: error.message || '同步失败' 
    };
  }
};

// 同步本地文件到远程
const syncLocalToRemote = async (client, localDir, remoteDir) => {
  // 获取本地文件和目录
  const items = fs.readdirSync(localDir, { withFileTypes: true });
  
  for (const item of items) {
    const localPath = path.join(localDir, item.name);
    const remotePath = `${remoteDir}/${item.name}`;
    
    if (item.isDirectory()) {
      // 确保远程目录存在
      const remoteDirExists = await client.exists(remotePath);
      if (!remoteDirExists) {
        await client.createDirectory(remotePath);
      }
      
      // 递归同步子目录
      await syncLocalToRemote(client, localPath, remotePath);
    } else if (item.isFile()) {
      // 检查文件是否需要更新
      let needsUpdate = true;
      
      try {
        if (await client.exists(remotePath)) {
          const remoteStats = await client.stat(remotePath);
          const localStats = fs.statSync(localPath);
          
          // 比较修改时间，如果本地文件更新，则上传
          const remoteTime = new Date(remoteStats.lastmod).getTime();
          const localTime = new Date(localStats.mtime).getTime();
          
          needsUpdate = localTime > remoteTime;
        }
      } catch (error) {
        console.error(`Error checking remote file ${remotePath}:`, error);
        // 如果发生错误，尝试上传文件
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        // 上传文件
        const fileContent = fs.readFileSync(localPath);
        await client.putFileContents(remotePath, fileContent);
      }
    }
  }
};

// 同步远程文件到本地
const syncRemoteToLocal = async (client, remoteDir, localDir) => {
  // 获取远程目录内容
  const items = await client.getDirectoryContents(remoteDir);
  
  for (const item of items) {
    // 跳过当前目录和父目录
    if (item.basename === '.' || item.basename === '..') continue;
    
    const remotePath = item.filename;
    const localPath = path.join(localDir, path.basename(remotePath));
    
    if (item.type === 'directory') {
      // 确保本地目录存在
      if (!fs.existsSync(localPath)) {
        fs.mkdirSync(localPath, { recursive: true });
      }
      
      // 递归同步子目录
      await syncRemoteToLocal(client, remotePath, localPath);
    } else {
      // 检查文件是否需要更新
      let needsUpdate = true;
      
      if (fs.existsSync(localPath)) {
        const localStats = fs.statSync(localPath);
        
        // 比较修改时间，如果远程文件更新，则下载
        const remoteTime = new Date(item.lastmod).getTime();
        const localTime = new Date(localStats.mtime).getTime();
        
        needsUpdate = remoteTime > localTime;
      }
      
      if (needsUpdate) {
        // 下载文件
        const fileContent = await client.getFileContents(remotePath);
        fs.writeFileSync(localPath, fileContent);
        
        // 设置文件修改时间与远程一致
        const remoteTime = new Date(item.lastmod);
        fs.utimesSync(localPath, remoteTime, remoteTime);
      }
    }
  }
};

// 加载旧的配置并迁移到新的settings.json
const migrateOldConfigs = () => {
  const settings = readSettings();
  let migrated = false;
  
  // 检查并迁移AI配置
  const oldAIConfigPath = path.join(isDev ? path.dirname(__dirname) : path.dirname(app.getPath('exe')), 'ai-config.json');
  if (fs.existsSync(oldAIConfigPath)) {
    try {
      const aiData = fs.readFileSync(oldAIConfigPath, 'utf8');
      settings.ai = JSON.parse(aiData);
      migrated = true;
      console.log('已迁移AI配置');
    } catch (e) {
      console.error('迁移AI配置失败:', e);
    }
  }
  
  // 检查并迁移外观配置
  const oldAppearancePath = path.join(isDev ? path.dirname(__dirname) : path.dirname(app.getPath('exe')), 'appearanceconfig.json');
  if (fs.existsSync(oldAppearancePath)) {
    try {
      const appearanceData = fs.readFileSync(oldAppearancePath, 'utf8');
      settings.appearance = JSON.parse(appearanceData);
      migrated = true;
      console.log('已迁移外观配置');
    } catch (e) {
      console.error('迁移外观配置失败:', e);
    }
  }
  
  // 检查并迁移同步配置
  const oldSyncPath = path.join(isDev ? path.dirname(__dirname) : path.dirname(app.getPath('exe')), 'sync.json');
  if (fs.existsSync(oldSyncPath)) {
    try {
      const syncData = fs.readFileSync(oldSyncPath, 'utf8');
      const syncConfig = JSON.parse(syncData);
      
      // 如果存在lastSync字段，转换为Date对象
      if (syncConfig.lastSync) {
        syncConfig.lastSync = new Date(syncConfig.lastSync);
      }
      
      settings.sync = syncConfig;
      migrated = true;
      console.log('已迁移同步配置');
    } catch (e) {
      console.error('迁移同步配置失败:', e);
    }
  }
  
  // 如果有配置被迁移，保存新的配置文件
  if (migrated) {
    saveSettings(settings);
    console.log('配置迁移完成');
  }
  
  return settings;
}; 