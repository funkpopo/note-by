// 中文本地化配置
// 临时移除BlockNote相关的字典配置，等待Tiptap实现

export interface ExtendedDictionary {
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
}

export const zhCN: ExtendedDictionary = {
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
  }
}

export default zhCN