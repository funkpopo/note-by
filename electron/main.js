const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');
const isDev = require('electron-is-dev');
const { OpenAI } = require('openai');

let mainWindow;
let watcher = null;

// 获取笔记存储路径
const getMarkdownDir = () => {
  if (isDev) {
    // 开发环境：笔记保存在项目根目录的 markdown 文件夹中
    return path.join(__dirname, '..', 'markdown');
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
      watcher.options.ignoreInitial = true;
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
      preload: path.join(__dirname, 'preload.js'),
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
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  setupAIConfigHandlers();
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
    
    console.log("Empty groups:", emptyGroups); // 添加日志
    
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

// 获取AI配置文件路径
const getAIConfigPath = () => {
  if (isDev) {
    // 开发环境：配置保存在项目根目录
    return path.join(__dirname, '..', 'aiconfig.json');
  } else {
    // 生产环境：配置保存在应用程序同级目录
    return path.join(path.dirname(app.getPath('exe')), 'aiconfig.json');
  }
};

// 读取AI配置文件
const readAIConfigs = () => {
  const configPath = getAIConfigPath();
  
  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    }
  } catch (error) {
    console.error('Error reading AI config file:', error);
  }
  
  // 如果文件不存在或读取出错，返回空数组
  return [];
};

// 保存AI配置到文件
const saveAIConfigsToFile = (configs) => {
  const configPath = getAIConfigPath();
  
  try {
    fs.writeFileSync(configPath, JSON.stringify(configs, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving AI config file:', error);
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
        } catch (_) {
          // 解析错误时出错，使用原始错误信息
        }
      }
      
      return {
        success: false,
        message: `连接失败: ${errorMessage}`
      };
    }
  });
}; 