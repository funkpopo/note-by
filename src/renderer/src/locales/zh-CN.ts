// 中文本地化配置
// 临时移除BlockNote相关的字典配置，等待Tiptap实现

export interface ExtendedDictionary {
  common?: {
    save: string
    cancel: string
    delete: string
    edit: string
    confirm: string
    create: string
    rename: string
    copy: string
    refresh: string
    export: string
    import: string
    search: string
    loading: string
    success: string
    failed: string
    error: string
    warning: string
    info: string
    test: string
    add: string
    remove: string
    update: string
    upload: string
    download: string
    sync: string
    settings: string
    close: string
    yes: string
    no: string
  }
  navigation?: {
    notes: string
    dataAnalysis: string
    mindMap: string
    chat: string
    settings: string
    themeToggle: string
    sync: string
    newNote: string
    newFolder: string
    newSubFolder: string
    renameFolder: string
    deleteFolder: string
    renameNote: string
    deleteNote: string
    copyDocName: string
    searchPlaceholder: string
    emptyNotes: string
    folderName: string
    noteName: string
    confirmDeleteFolder: string
    confirmDeleteNote: string
  }
  settings?: {
    title: string
    tabs: {
      basic: string
      history: string
      webdav: string
      performance: string
    }
    language: {
      title: string
      description: string
    }
    autoUpdate: {
      title: string
      description: string
      manual: string
      manualDescription: string
      checkNow: string
      newVersion: string
      currentLatest: string
      downloadNow: string
    }
    apiConfig: {
      title: string
      name: string
      apiUrl: string
      apiKey: string
      model: string
      temperature: string
      maxTokens: string
      thinkingModel: string
      testConnection: string
      namePlaceholder: string
      urlPlaceholder: string
      keyPlaceholder: string
      modelPlaceholder: string
    }
    history: {
      title: string
      retentionMode: string
      retentionByCount: string
      retentionByDays: string
      retentionCount: string
      retentionDays: string
    }
    encryption: {
      title: string
      useCustom: string
      setPassword: string
      changePassword: string
      closeEncryption: string
      enterPassword: string
      confirmPassword: string
      currentPassword: string
      newPassword: string
      passwordMismatch: string
      passwordTooShort: string
      incorrectPassword: string
    }
    performance: {
      title: string
      memory: string
      memoryUsed: string
      memoryTotal: string
      memoryUsage: string
      editorPerf: string
      loadTime: string
      saveTime: string
      renderTime: string
      operations: string
      editCount: string
      saveCount: string
      loadCount: string
      searchCount: string
      network: string
      uploadSpeed: string
      downloadSpeed: string
      latency: string
      report: string
      exportData: string
      resetStats: string
    }
  }
  webdav?: {
    title: string
    serverSettings: string
    serverUrl: string
    username: string
    password: string
    enable: string
    autoSync: string
    syncDirection: string
    uploadOnly: string
    downloadOnly: string
    bidirectional: string
    syncOptions: string
    encryptionSettings: string
    syncOperations: string
    clearCache: string
    uploadToCloud: string
    downloadFromCloud: string
    testConnection: string
    masterPassword: string
    inputMasterPassword: string
    setMasterPassword: string
    changeMasterPassword: string
    closeCustomEncryption: string
    syncProgress: {
      uploading: string
      downloading: string
      comparing: string
    }
  }
  mindmap?: {
    title: string
    helpText: string
    centerTopic: string
    newNode: string
    addNode: string
    undo: string
    redo: string
    save: string
    load: string
    exportHtml: string
    editNode: string
    deleteNode: string
    nodeContent: string
    nodeStyle: string
    fontSize: string
    addArrow: string
    deleteEdge: string
    openArrow: string
    closedArrow: string
    defaultStyle: string
    primaryStyle: string
    successStyle: string
    warningStyle: string
    dangerStyle: string
    contentPlaceholder: string
  }
  messages?: {
    success: {
      saved: string
      deleted: string
      created: string
      updated: string
      copied: string
      synced: string
      connected: string
      exported: string
      imported: string
      loaded: string
      cleared: string
      renamed: string
      passwordSet: string
      passwordChanged: string
      encryptionEnabled: string
      encryptionDisabled: string
    }
    error: {
      saveFailed: string
      deleteFailed: string
      createFailed: string
      updateFailed: string
      copyFailed: string
      syncFailed: string
      connectionFailed: string
      exportFailed: string
      importFailed: string
      loadFailed: string
      renameFailed: string
      notConfigured: string
      alreadySyncing: string
      invalidFormat: string
      parseError: string
      networkError: string
      permissionDenied: string
      fileNotFound: string
      operationFailed: string
    }
    info: {
      syncing: string
      cancelling: string
      loading: string
      processing: string
      empty: string
      noSelection: string
    }
  }
  dataAnalysis?: {
    title: string
    analysisButton: string
    reAnalysisButton: string
    selectModel: string
    analyzing: string
    loadingData: string
    noResults: string
    cachedResults: string
    retryButton: string
    resetCache: string
    errors: {
      networkError: string
      dataError: string
      apiError: string
      cacheError: string
      unknownError: string
      noModel: string
      noData: string
      parseError: string
      maxRetries: string
    }
    tabs: {
      habits: string
      content: string
      suggestions: string
      visualization: string
    }
    charts: {
      hourlyDistribution: string
      topNotes: string
      editTrend: string
      noteTrend: string
      activeHours: string
      topFolders: string
      topTags: string
      tagRelations: string
      tagGraph: string
    }
    status: {
      success: string
      failed: string
      retrying: string
    }
  }
  chat?: {
    actions: {
      send: string
      stop: string
      clear: string
      history: string
      copy: string
      retry: string
      delete: string
      newSession: string
    }
    notifications: {
      copied: string
      cleared: string
      stopped: string
      retrying: string
      deleted: string
      deleteFailed: string
      saveFailed: string
      loadFailed: string
      selectModel: string
      noMessage: string
      retryFailed: string
      noUserMessage: string
    }
    inputPlaceholder: string
    modelSelector: {
      placeholder: string
      thinkingBadge: string
      noModels: string
    }
    suggestions: string[]
    messages: {
      statusIndicator: {
        loading: string
        streaming: string
        incomplete: string
        error: string
      }
    }
    history: {
      title: string
      newChat: string
      empty: string
      searchPlaceholder: string
      deleteConfirm: string
      saveFailed: string
      loadFailed: string
      deleteFailed: string
      loading: string
      notFound: string
      titleUpdated: string
      titleUpdateFailed: string
    }
  }
  editor?: {
    actions: {
      save: string
      export: string
      exportPdf: string
      exportDocx: string
      exportHtml: string
      createFile: string
      createFolder: string
    }
    status: {
      saving: string
      autoSaving: string
      saved: string
      editing: string
      loaded: string
    }
    placeholder: {
      content: string
      title: string
    }
    notifications: {
      saveSuccess: string
      saveFailed: string
      exportSuccess: string
      exportFailed: string
      loadFailed: string
      noFileSelected: string
      createSuccess: string
      createFailed: string
      restoreSuccess: string
      restoreFailed: string
      conflictDetected: string
      memoryWarning: string
      memoryCritical: string
    }
    shortcuts: {
      save: string
      title: string
    }
    prompts: {
      noFile: string
      welcomeMessage: string
      imageUrl: string
      linkUrl: string
    }
    menu: {
      aiCommands: {
        improve: string
        simplify: string
        expand: string
        fixGrammar: string
        translateToEn: string
        translateToCn: string
        summarize: string
        continue: string
        processing: string
      }
      slashCommands: {
        heading1: string
        heading2: string
        heading3: string
        bold: string
        italic: string
        underline: string
        bulletList: string
        orderedList: string
        quote: string
        codeBlock: string
        image: string
        link: string
        noCommands: string
        placeholder: string
      }
      bubbleMenu: {
        unorderedList: string
        orderedList: string
        quote: string
        divider: string
        insertImage: string
        ai: string
      }
    }
    codeBlock: {
      copied: string
      copy: string
    }
    model: {
      loading: string
      select: string
      noModels: string
      manage: string
      thinking: string
    }
    errors: {
      apiNotConfigured: string
      modelNotFound: string
      incompleteConfig: string
      processingFailed: string
      noTextSelected: string
    }
  }
  placeholder?: {
    folderName: string
    noteName: string
    cloudServiceSelection: string
    remotePath: string
    localPath: string
    authCode: string
    linkUrl: string
    embedUrl: string
    imageUrl: string
    imageAlt: string
    selectApi: string
    language: string
    selectFolder: string
    enterPassword: string
    confirmPassword: string
    currentPassword: string
    newPassword: string
    webdavUrl: string
    webdavUsername: string
    webdavPassword: string
    googleClientId: string
    googleClientSecret: string
    googleRedirectUri: string
    dropboxAppKey: string
    dropboxAppSecret: string
    dropboxRedirectUri: string
    modelSelect: string
  }
}

export const zhCN: ExtendedDictionary = {
  // 通用文本
  common: {
    save: '保存',
    cancel: '取消',
    delete: '删除',
    edit: '编辑',
    confirm: '确认',
    create: '创建',
    rename: '重命名',
    copy: '复制',
    refresh: '刷新',
    export: '导出',
    import: '导入',
    search: '搜索',
    loading: '加载中...',
    success: '成功',
    failed: '失败',
    error: '错误',
    warning: '警告',
    info: '信息',
    test: '测试',
    add: '添加',
    remove: '移除',
    update: '更新',
    upload: '上传',
    download: '下载',
    sync: '同步',
    settings: '设置',
    close: '关闭',
    yes: '是',
    no: '否'
  },
  // 导航栏
  navigation: {
    notes: '笔记',
    dataAnalysis: '数据分析',
    mindMap: '思维导图',
    chat: '对话',
    settings: '设置',
    themeToggle: '主题切换',
    sync: '同步',
    newNote: '新建笔记',
    newFolder: '新建文件夹',
    newSubFolder: '新建子文件夹',
    renameFolder: '重命名文件夹',
    deleteFolder: '删除文件夹',
    renameNote: '重命名笔记',
    deleteNote: '删除笔记',
    copyDocName: '复制文档名称',
    searchPlaceholder: '搜索笔记和文件夹...',
    emptyNotes: '暂无笔记',
    folderName: '请输入文件夹名称',
    noteName: '请输入笔记名称',
    confirmDeleteFolder: '确定要删除文件夹 "{name}" 吗？文件夹中的所有笔记都将被删除。',
    confirmDeleteNote: '确定要删除笔记 "{name}" 吗？'
  },
  // 设置页面
  settings: {
    title: '设置',
    tabs: {
      basic: '基本设置',
      history: '历史记录管理',
      webdav: 'WebDAV同步',
      performance: '性能监控'
    },
    language: {
      title: '界面语言',
      description: '选择应用程序的显示语言'
    },
    autoUpdate: {
      title: '自动检查更新',
      description: '应用启动时自动检查是否有新版本',
      manual: '手动检查更新',
      manualDescription: '检查GitHub上是否有新版本发布',
      checkNow: '检查更新',
      newVersion: '发现新版本:',
      currentLatest: '当前已是最新版本',
      downloadNow: '前往下载'
    },
    apiConfig: {
      title: 'AI API配置',
      name: '配置名称',
      apiUrl: 'API URL',
      apiKey: 'API Key',
      model: '模型',
      temperature: '温度 (Temperature)',
      maxTokens: '最大Token数 (Max Tokens)',
      thinkingModel: '思维模型',
      testConnection: '测试连接',
      namePlaceholder: '请输入配置名称，如OpenAI、Claude等',
      urlPlaceholder: '请输入API URL，如https://api.openai.com',
      keyPlaceholder: '请输入API Key',
      modelPlaceholder: '请输入模型名称，如gpt-3.5-turbo'
    },
    history: {
      title: '历史记录管理',
      retentionMode: '历史记录保留方式',
      retentionByCount: '按数量保留',
      retentionByDays: '按时间保留',
      retentionCount: '保留最近的记录数量',
      retentionDays: '保留天数'
    },
    encryption: {
      title: '加密设置',
      useCustom: '使用自定义加密',
      setPassword: '设置主密码',
      changePassword: '更改主密码',
      closeEncryption: '关闭自定义加密',
      enterPassword: '请输入主密码',
      confirmPassword: '确认密码',
      currentPassword: '当前密码',
      newPassword: '新密码',
      passwordMismatch: '两次输入的密码不一致',
      passwordTooShort: '密码长度至少为8个字符',
      incorrectPassword: '当前密码不正确'
    },
    performance: {
      title: '性能统计',
      memory: '内存使用',
      memoryUsed: '已使用',
      memoryTotal: '总量',
      memoryUsage: '使用率',
      editorPerf: '编辑器性能',
      loadTime: '加载时间',
      saveTime: '保存时间',
      renderTime: '渲染时间',
      operations: '操作统计',
      editCount: '编辑次数',
      saveCount: '保存次数',
      loadCount: '加载次数',
      searchCount: '搜索次数',
      network: '网络性能',
      uploadSpeed: '上传速度',
      downloadSpeed: '下载速度',
      latency: '延迟',
      report: '性能分析报告',
      exportData: '导出数据',
      resetStats: '重置统计'
    }
  },
  // WebDAV同步
  webdav: {
    title: 'WebDAV同步设置',
    serverSettings: 'WebDAV 服务器设置',
    serverUrl: 'WebDAV服务器地址',
    username: '用户名',
    password: '密码',
    enable: '启用WebDAV同步',
    autoSync: '应用启动时自动同步',
    syncDirection: '同步方向',
    uploadOnly: '本地 → 远程 (上传)',
    downloadOnly: '远程 → 本地 (下载)',
    bidirectional: '双向同步',
    syncOptions: '同步选项',
    encryptionSettings: '加密设置',
    syncOperations: '同步操作',
    clearCache: '清除同步缓存',
    uploadToCloud: '上传到云端',
    downloadFromCloud: '从云端下载',
    testConnection: '测试连接',
    masterPassword: '主密码',
    inputMasterPassword: '输入主密码',
    setMasterPassword: '设置主密码',
    changeMasterPassword: '更改主密码',
    closeCustomEncryption: '关闭自定义加密',
    syncProgress: {
      uploading: '正在上传文件...',
      downloading: '正在下载文件...',
      comparing: '正在比较文件内容...'
    }
  },
  // 思维导图
  mindmap: {
    title: '思维导图',
    helpText: '双击节点编辑内容 | 拖拽连接节点 | 支持多选和快捷键操作',
    centerTopic: '中心主题',
    newNode: '新节点',
    addNode: '添加节点',
    undo: '撤销',
    redo: '重做',
    save: '保存',
    load: '加载',
    exportHtml: '导出HTML',
    editNode: '编辑节点',
    deleteNode: '删除节点',
    nodeContent: '节点内容',
    nodeStyle: '节点样式',
    fontSize: '字体大小',
    addArrow: '添加箭头',
    deleteEdge: '删除连线',
    openArrow: '添加开放箭头',
    closedArrow: '添加封闭箭头',
    defaultStyle: '默认',
    primaryStyle: '主要',
    successStyle: '成功',
    warningStyle: '警告',
    dangerStyle: '危险',
    contentPlaceholder: '请输入节点内容'
  },
  // 消息提示
  messages: {
    success: {
      saved: '保存成功',
      deleted: '删除成功',
      created: '创建成功',
      updated: '更新成功',
      copied: '已复制到剪贴板',
      synced: '同步成功',
      connected: '连接成功',
      exported: '导出成功',
      imported: '导入成功',
      loaded: '加载成功',
      cleared: '清除成功',
      renamed: '重命名成功',
      passwordSet: '密码设置成功',
      passwordChanged: '密码更改成功',
      encryptionEnabled: '已启用加密',
      encryptionDisabled: '已关闭加密'
    },
    error: {
      saveFailed: '保存失败',
      deleteFailed: '删除失败',
      createFailed: '创建失败',
      updateFailed: '更新失败',
      copyFailed: '复制失败',
      syncFailed: '同步失败',
      connectionFailed: '连接失败',
      exportFailed: '导出失败',
      importFailed: '导入失败',
      loadFailed: '加载失败',
      renameFailed: '重命名失败',
      notConfigured: '请先配置相关设置',
      alreadySyncing: '正在同步中...',
      invalidFormat: '文件格式不正确',
      parseError: '解析失败',
      networkError: '网络错误',
      permissionDenied: '权限不足',
      fileNotFound: '文件未找到',
      operationFailed: '操作失败'
    },
    info: {
      syncing: '正在同步...',
      cancelling: '正在取消...',
      loading: '正在加载...',
      processing: '处理中...',
      empty: '暂无数据',
      noSelection: '请先选择项目'
    }
  },
  // 数据分析模块国际化
  dataAnalysis: {
    title: '笔记数据分析',
    analysisButton: '执行分析',
    reAnalysisButton: '重新分析',
    selectModel: '选择AI模型',
    analyzing: '正在分析您的笔记数据...',
    loadingData: '正在加载数据...',
    noResults: '暂无分析结果',
    cachedResults: '当前显示的是缓存的分析结果',
    retryButton: '重试分析',
    resetCache: '重置缓存',
    errors: {
      networkError: '网络连接错误，请检查网络后重试',
      dataError: '数据获取失败，请稍后重试',
      apiError: 'AI服务调用失败，请检查模型配置',
      cacheError: '缓存操作失败',
      unknownError: '未知错误，请重试',
      noModel: '请先选择AI模型',
      noData: '暂无笔记数据，请先创建和编辑一些笔记',
      parseError: '数据解析失败，请联系技术支持',
      maxRetries: '达到最大重试次数，请检查配置后手动重试'
    },
    tabs: {
      habits: '写作习惯',
      content: '内容分析',
      suggestions: '改进建议',
      visualization: '数据可视化'
    },
    charts: {
      hourlyDistribution: '每日时段编辑分布',
      topNotes: '最常编辑的笔记',
      editTrend: '每日编辑次数趋势',
      noteTrend: '每日活跃笔记数趋势',
      activeHours: '日内活跃时段分布',
      topFolders: '最常用的文件夹',
      topTags: '最常用的标签',
      tagRelations: '标签关联分析',
      tagGraph: '标签关联知识图谱'
    },
    status: {
      success: '分析完成',
      failed: '分析失败',
      retrying: '正在重试...'
    }
  },
  // 聊天界面国际化
  chat: {
    inputPlaceholder: '输入你的问题... (Shift+Enter换行，Enter发送)',
    modelSelector: {
      placeholder: '选择AI模型',
      noModels: '暂无AI配置',
      thinkingBadge: '思维'
    },
    messages: {
      statusIndicator: {
        loading: '正在思考中...',
        streaming: 'AI正在思考...',
        incomplete: '⚠️ 生成被中断',
        error: '❌ 生成出错'
      }
    },
    actions: {
      send: '发送',
      stop: '停止',
      clear: '清空对话',
      copy: '复制',
      retry: '重新生成',
      delete: '删除',
      history: '对话历史',
      newSession: '新建会话'
    },
    suggestions: [
      '📝 帮我写一篇文章，题材是: ',
      '🧮 需要解决下述的数学问题: ',
      '💡 给我一些建议，关于',
      '🔍 解释这个概念: '
    ],
    notifications: {
      copied: '已复制到剪贴板',
      stopped: '已停止生成',
      cleared: '会话已清空',
      deleted: '消息已删除',
      retrying: '正在重新生成回复...',
      selectModel: '请先选择AI模型',
      noMessage: '无法找到对应的用户消息，无法重新生成',
      retryFailed: '重新生成失败，请稍后重试',
      deleteFailed: '删除消息失败，请稍后重试',
      noUserMessage: '💡 请先在右上角选择AI模型再开始对话',
      saveFailed: '保存对话历史失败',
      loadFailed: '加载对话历史失败'
    },
    history: {
      title: '对话历史',
      empty: '暂无对话历史',
      newChat: '新对话',
      loadFailed: '加载对话历史失败',
      saveFailed: '保存对话历史失败',
      deleteFailed: '删除对话历史失败',
      deleteConfirm: '确定删除这个对话吗？',
      searchPlaceholder: '搜索对话...',
      loading: '加载中...',
      notFound: '未找到对话',
      titleUpdated: '标题已更新',
      titleUpdateFailed: '更新标题失败'
    }
  },
  // 编辑器界面国际化
  editor: {
    actions: {
      save: '保存',
      export: '导出',
      exportPdf: '导出PDF',
      exportDocx: '导出DOCX',
      exportHtml: '导出HTML',
      createFile: '创建文件',
      createFolder: '创建文件夹'
    },
    status: {
      saving: '保存中...',
      autoSaving: '自动保存...',
      saved: '已保存',
      editing: '编辑中',
      loaded: '已加载'
    },
    placeholder: {
      content: '开始输入内容...',
      title: '文件标题'
    },
    notifications: {
      saveSuccess: '文件保存成功',
      saveFailed: '保存失败',
      exportSuccess: '导出成功',
      exportFailed: '导出失败',
      loadFailed: '加载文件内容失败',
      noFileSelected: '没有选择文件',
      createSuccess: '创建文件成功',
      createFailed: '创建文件失败',
      restoreSuccess: '已恢复历史版本',
      restoreFailed: '恢复历史版本失败',
      conflictDetected: '检测到文件冲突',
      memoryWarning: '内存使用警告',
      memoryCritical: '内存使用严重！正在清理...'
    },
    shortcuts: {
      save: '使用 Ctrl+S 保存文件',
      title: '提示与快捷键:'
    },
    prompts: {
      noFile: '请从左侧边栏选择一个文件开始编辑，或者创建一个新的Markdown文件',
      welcomeMessage: '支持代码块高亮和Markdown格式化',
      imageUrl: '请输入图片链接',
      linkUrl: '请输入链接地址'
    },
    menu: {
      aiCommands: {
        improve: '改进写作',
        simplify: '简化内容',
        expand: '扩展内容',
        fixGrammar: '修正语法',
        translateToEn: '翻译成英文',
        translateToCn: '翻译成中文',
        summarize: '总结要点',
        continue: '续写内容',
        processing: '处理中'
      },
      slashCommands: {
        heading1: '大标题',
        heading2: '中标题',
        heading3: '小标题',
        bold: '粗体',
        italic: '斜体',
        underline: '下划线',
        bulletList: '无序列表',
        orderedList: '有序列表',
        quote: '引用',
        codeBlock: '代码块',
        image: '插入图片',
        link: '插入链接',
        noCommands: '未找到匹配的命令',
        placeholder: '输入命令...'
      },
      bubbleMenu: {
        unorderedList: '无序列表',
        orderedList: '有序列表',
        quote: '引用',
        divider: '分割线',
        insertImage: '插入图片',
        ai: 'AI'
      }
    },
    codeBlock: {
      copied: '已复制',
      copy: '复制'
    },
    model: {
      loading: '加载中...',
      select: '选择模型',
      noModels: '暂无可用模型',
      manage: '管理模型...',
      thinking: '思维模型'
    },
    errors: {
      apiNotConfigured: '请先在设置中配置AI API',
      modelNotFound: '未找到指定的AI模型配置',
      incompleteConfig: 'AI API配置不完整，请检查设置',
      processingFailed: 'AI处理失败',
      noTextSelected: '请先选择要处理的文本'
    }
  },
  // 全局占位符文本
  placeholder: {
    folderName: '请输入文件夹名称',
    noteName: '请输入笔记名称',
    cloudServiceSelection: '选择云存储服务',
    remotePath: '/notes',
    localPath: '本地笔记文件夹路径',
    authCode: '请输入授权码',
    linkUrl: 'https://example.com',
    embedUrl: '输入嵌入地址 (如: https://www.youtube.com/)',
    imageUrl: '输入图片地址',
    imageAlt: '图片的替代文本',
    selectApi: '选择API',
    language: '语言',
    selectFolder: '请选择文件夹',
    enterPassword: '请输入主密码',
    confirmPassword: '请再次输入主密码',
    currentPassword: '请输入当前主密码',
    newPassword: '请输入新主密码',
    webdavUrl: '例如: https://dav.example.com/remote.php/dav/files/username/',
    webdavUsername: 'WebDAV用户名',
    webdavPassword: 'WebDAV密码',
    googleClientId: '请输入Google Cloud客户端ID',
    googleClientSecret: '请输入Google Cloud客户端密钥',
    googleRedirectUri: 'http://localhost:3000/auth/callback',
    dropboxAppKey: '请输入Dropbox App Key',
    dropboxAppSecret: '请输入Dropbox App Secret',
    dropboxRedirectUri: 'http://localhost:3000/auth/callback',
    modelSelect: '选择AI模型'
  }
}

export default zhCN
