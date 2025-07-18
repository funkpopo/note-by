import { Dictionary } from '@blocknote/core'

// 扩展字典接口以包含自定义模块
export interface ExtendedDictionary extends Dictionary {
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
  settings?: {
    title: string
    tabs: {
      basic: string
      history: string
      memory: string
      webdav: string
      performance: string
    }
    basic: {
      autoUpdate: {
        title: string
        description: string
      }
      manualUpdate: {
        title: string
        description: string
        button: string
      }
      updateResult: {
        checking: string
        hasUpdate: string
        noUpdate: string
        error: string
        goToDownload: string
        currentVersion: string
        latestVersion: string
        checkFailed: string
        networkTip: string
        checkFailedWithError: string
        hasUpdatePrefix: string
        noUpdatePrefix: string
        networkCheckFailed: string
        errorInfo: string
        canDownload: string
      }
      apiConfig: {
        title: string
        addButton: string
        noConfigs: string
        noConfigsDesc: string
        testConnection: string
        edit: string
        delete: string
        types: {
          llm: string
          embedding: string
        }
        fields: {
          name: string
          namePlaceholder: string
          apiKey: string
          apiKeyPlaceholder: string
          apiUrl: string
          apiUrlPlaceholder: string
          modelName: string
          modelNamePlaceholder: string
          temperature: string
          temperatureDesc: string
          maxTokens: string
          maxTokensDesc: string
        }
        modal: {
          addTitle: string
          editTitle: string
          cancel: string
          save: string
        }
        toast: {
          saved: string
          updated: string
          deleted: string
          saveFailed: string
          deleteFailed: string
          testSuccess: string
          testFailed: string
          testError: string
          nameRequired: string
        }
        testResult: {
          success: string
          failed: string
        }
      }
    }
    history: {
      title: string
      saveButton: string
      type: {
        label: string
        byCount: string
        byTime: string
      }
      maxCount: {
        label: string
      }
      maxDays: {
        label: string
        unit: string
      }
      description: {
        byCount: string
        byTime: string
      }
    }
    memory: {
      title: string
      enable: {
        label: string
        description: string
      }
      llmConfig: {
        label: string
        placeholder: string
        tip: string
      }
      embeddingConfig: {
        label: string
        placeholder: string
        tip: string
      }
      description: {
        title: string
        line1: string
        line2: string
        line3: string
        line4: string
      }
    }
    performance: {
      title: string
      refresh: string
      export: string
      reset: string
      loading: string
      memory: {
        title: string
        used: string
        total: string
        usage: string
      }
      editor: {
        title: string
        loadTime: string
        saveTime: string
        renderTime: string
      }
      userActions: {
        title: string
        editorChanges: string
        saves: string
        loads: string
        searches: string
      }
      network: {
        title: string
        uploadSpeed: string
        downloadSpeed: string
        latency: string
        notRecorded: string
      }
      report: {
        title: string
        summary: {
          title: string
          averageMemory: string
          averageLoadTime: string
          averageSaveTime: string
          totalActions: string
        }
        trends: {
          title: string
          memory: {
            increasing: string
            decreasing: string
            stable: string
          }
          performance: {
            improving: string
            declining: string
            stable: string
          }
        }
        recommendations: {
          title: string
        }
      }
      exportSuccess: string
      exportFailed: string
      resetSuccess: string
      tip: string
    }
  }
  common?: {
    loading: string
    save: string
    cancel: string
    error: string
    success: string
    failed: string
    loadingFailed: string
    saveFailed: string
    memoryTrend: string
    performanceTrend: string
  }
}

export const zhCN: ExtendedDictionary = {
  slash_menu: {
    heading: {
      title: '标题 1',
      subtext: '顶级标题',
      aliases: ['h', 'heading1', 'h1', '标题1', '标题'],
      group: '标题'
    },
    heading_2: {
      title: '标题 2',
      subtext: '主要段落标题',
      aliases: ['h2', 'heading2', 'subheading', '标题2', '子标题'],
      group: '标题'
    },
    heading_3: {
      title: '标题 3',
      subtext: '子段落和组标题',
      aliases: ['h3', 'heading3', 'subheading', '标题3', '子标题'],
      group: '标题'
    },
    heading_4: {
      title: '标题 4',
      subtext: '小节标题',
      aliases: ['h4', 'heading4', '标题4'],
      group: '标题'
    },
    heading_5: {
      title: '标题 5',
      subtext: '子小节标题',
      aliases: ['h5', 'heading5', '标题5'],
      group: '标题'
    },
    heading_6: {
      title: '标题 6',
      subtext: '最小标题',
      aliases: ['h6', 'heading6', '标题6'],
      group: '标题'
    },
    toggle_heading: {
      title: '折叠标题 1',
      subtext: '可折叠的顶级标题',
      aliases: ['toggle', 'toggleheading', 'collapsible', '折叠标题', '可折叠标题'],
      group: '标题'
    },
    toggle_heading_2: {
      title: '折叠标题 2',
      subtext: '可折叠的主要段落标题',
      aliases: ['toggleh2', 'toggleheading2', 'collapsible2', '折叠标题2'],
      group: '标题'
    },
    toggle_heading_3: {
      title: '折叠标题 3',
      subtext: '可折叠的子段落标题',
      aliases: ['toggleh3', 'toggleheading3', 'collapsible3', '折叠标题3'],
      group: '标题'
    },
    quote: {
      title: '引用',
      subtext: '引用或摘录',
      aliases: ['quotation', 'blockquote', 'bq', '引用'],
      group: '基本块'
    },
    toggle_list: {
      title: '折叠列表',
      subtext: '可折叠的列表',
      aliases: ['togglelist', 'collapsiblelist', 'foldlist', '折叠列表', '可折叠列表'],
      group: '基本块'
    },
    numbered_list: {
      title: '有序列表',
      subtext: '有序项目列表',
      aliases: [
        'ol',
        'li',
        'list',
        'numberedlist',
        'numbered list',
        '列表',
        '有序列表',
        '数字列表'
      ],
      group: '基本块'
    },
    bullet_list: {
      title: '无序列表',
      subtext: '无序项目列表',
      aliases: ['ul', 'li', 'list', 'bulletlist', 'bullet list', '列表', '无序列表', '点列表'],
      group: '基本块'
    },
    check_list: {
      title: '检查列表',
      subtext: '带复选框的列表',
      aliases: [
        'ul',
        'li',
        'list',
        'checklist',
        'check list',
        'checked list',
        'checkbox',
        '列表',
        '待办列表',
        '复选框'
      ],
      group: '基本块'
    },
    paragraph: {
      title: '段落',
      subtext: '文档的主体',
      aliases: ['p', 'paragraph', '段落'],
      group: '基本块'
    },
    code_block: {
      title: '代码块',
      subtext: '带语法高亮的代码块',
      aliases: ['code', 'pre', '代码', '代码块'],
      group: '基本块'
    },
    page_break: {
      title: '分页符',
      subtext: '页面分隔符',
      aliases: ['page', 'break', 'separator', '分页', '分隔符'],
      group: '基本块'
    },
    table: {
      title: '表格',
      subtext: '带可编辑单元格的表格',
      aliases: ['table', '表格'],
      group: '高级'
    },
    image: {
      title: '图片',
      subtext: '带说明的可调整大小的图片',
      aliases: [
        'image',
        'imageUpload',
        'upload',
        'img',
        'picture',
        'media',
        'url',
        '图片',
        '图像',
        '上传'
      ],
      group: '媒体'
    },
    video: {
      title: '视频',
      subtext: '带说明的可调整大小的视频',
      aliases: [
        'video',
        'videoUpload',
        'upload',
        'mp4',
        'film',
        'media',
        'url',
        '视频',
        '影片',
        '上传'
      ],
      group: '媒体'
    },
    audio: {
      title: '音频',
      subtext: '带说明的嵌入式音频',
      aliases: [
        'audio',
        'audioUpload',
        'upload',
        'mp3',
        'sound',
        'media',
        'url',
        '音频',
        '声音',
        '上传'
      ],
      group: '媒体'
    },
    file: {
      title: '文件',
      subtext: '嵌入式文件',
      aliases: ['file', 'upload', 'embed', 'media', 'url', '文件', '上传', '嵌入'],
      group: '媒体'
    },
    emoji: {
      title: '表情符号',
      subtext: '搜索并插入表情符号',
      aliases: ['emoji', 'emote', 'emotion', 'face', '表情', '符号'],
      group: '其他'
    }
  },
  placeholders: {
    default: '',
    heading: '标题',
    bulletListItem: '列表',
    numberedListItem: '列表',
    checkListItem: '列表',
    new_comment: '写评论...',
    edit_comment: '编辑评论...',
    comment_reply: '添加评论...'
  },
  file_blocks: {
    image: {
      add_button_text: '添加图片'
    },
    video: {
      add_button_text: '添加视频'
    },
    audio: {
      add_button_text: '添加音频'
    },
    file: {
      add_button_text: '添加文件'
    }
  },
  side_menu: {
    add_block_label: '添加块',
    drag_handle_label: '打开块菜单'
  },
  drag_handle: {
    delete_menuitem: '删除',
    colors_menuitem: '颜色',
    header_row_menuitem: '标题行',
    header_column_menuitem: '标题列'
  },
  table_handle: {
    delete_column_menuitem: '删除列',
    delete_row_menuitem: '删除行',
    add_left_menuitem: '向左添加列',
    add_right_menuitem: '向右添加列',
    add_above_menuitem: '向上添加行',
    add_below_menuitem: '向下添加行',
    split_cell_menuitem: '分割单元格',
    merge_cells_menuitem: '合并单元格',
    background_color_menuitem: '背景颜色'
  },
  suggestion_menu: {
    no_items_title: '未找到项目'
  },
  color_picker: {
    text_title: '文本',
    background_title: '背景',
    colors: {
      default: '默认',
      gray: '灰色',
      brown: '棕色',
      red: '红色',
      orange: '橙色',
      yellow: '黄色',
      green: '绿色',
      blue: '蓝色',
      purple: '紫色',
      pink: '粉色'
    }
  },
  formatting_toolbar: {
    bold: {
      tooltip: '粗体',
      secondary_tooltip: 'Mod+B'
    },
    italic: {
      tooltip: '斜体',
      secondary_tooltip: 'Mod+I'
    },
    underline: {
      tooltip: '下划线',
      secondary_tooltip: 'Mod+U'
    },
    strike: {
      tooltip: '删除线',
      secondary_tooltip: 'Mod+Shift+S'
    },
    code: {
      tooltip: '代码',
      secondary_tooltip: ''
    },
    colors: {
      tooltip: '颜色'
    },
    link: {
      tooltip: '创建链接',
      secondary_tooltip: 'Mod+K'
    },
    file_caption: {
      tooltip: '编辑说明',
      input_placeholder: '编辑说明'
    },
    file_replace: {
      tooltip: {
        image: '替换图片',
        video: '替换视频',
        audio: '替换音频',
        file: '替换文件'
      }
    },
    file_rename: {
      tooltip: {
        image: '重命名图片',
        video: '重命名视频',
        audio: '重命名音频',
        file: '重命名文件'
      },
      input_placeholder: {
        image: '重命名图片',
        video: '重命名视频',
        audio: '重命名音频',
        file: '重命名文件'
      }
    },
    file_download: {
      tooltip: {
        image: '下载图片',
        video: '下载视频',
        audio: '下载音频',
        file: '下载文件'
      }
    },
    file_delete: {
      tooltip: {
        image: '删除图片',
        video: '删除视频',
        audio: '删除音频',
        file: '删除文件'
      }
    },
    file_preview_toggle: {
      tooltip: '切换预览'
    },
    nest: {
      tooltip: '增加缩进',
      secondary_tooltip: 'Tab'
    },
    unnest: {
      tooltip: '减少缩进',
      secondary_tooltip: 'Shift+Tab'
    },
    align_left: {
      tooltip: '左对齐'
    },
    align_center: {
      tooltip: '居中对齐'
    },
    align_right: {
      tooltip: '右对齐'
    },
    align_justify: {
      tooltip: '两端对齐'
    },
    table_cell_merge: {
      tooltip: '合并单元格'
    },
    comment: {
      tooltip: '添加评论'
    }
  },
  file_panel: {
    upload: {
      title: '上传',
      file_placeholder: {
        image: '上传图片',
        video: '上传视频',
        audio: '上传音频',
        file: '上传文件'
      },
      upload_error: '错误：上传失败'
    },
    embed: {
      title: '嵌入',
      embed_button: {
        image: '嵌入图片',
        video: '嵌入视频',
        audio: '嵌入音频',
        file: '嵌入文件'
      },
      url_placeholder: '输入URL'
    }
  },
  link_toolbar: {
    delete: {
      tooltip: '删除链接'
    },
    edit: {
      text: '编辑链接',
      tooltip: '编辑'
    },
    open: {
      tooltip: '在新标签页中打开'
    },
    form: {
      title_placeholder: '编辑标题',
      url_placeholder: '编辑URL'
    }
  },
  comments: {
    edited: '已编辑',
    save_button_text: '保存',
    cancel_button_text: '取消',
    actions: {
      add_reaction: '添加回应',
      resolve: '解决',
      edit_comment: '编辑评论',
      delete_comment: '删除评论',
      more_actions: '更多操作'
    },
    reactions: {
      reacted_by: '由 {users} 添加'
    },
    sidebar: {
      marked_as_resolved: '标记为已解决',
      more_replies: (count: number) => `还有 ${count} 条回复`
    }
  },
  generic: {
    ctrl_shortcut: 'Ctrl+'
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
  settings: {
    title: '设置',
    tabs: {
      basic: '基本设置',
      history: '历史记录管理',
      memory: '记忆功能',
      webdav: 'WebDAV同步',
      performance: '性能监控'
    },
    basic: {
      autoUpdate: {
        title: '自动检查更新',
        description: '应用启动时自动检查是否有新版本'
      },
      manualUpdate: {
        title: '手动检查更新',
        description: '检查GitHub上是否有新版本发布',
        button: '检查更新'
      },
      updateResult: {
        checking: '正在检查更新...',
        hasUpdate: '发现新版本',
        noUpdate: '当前已是最新版本',
        error: '检查更新失败',
        goToDownload: '前往下载',
        currentVersion: '当前版本',
        latestVersion: '最新版本',
        checkFailed: '检查更新失败',
        networkTip: '更新检查会连接GitHub查询最新版本信息，确保你可以访问GitHub',
        checkFailedWithError: '检查更新失败',
        hasUpdatePrefix: '发现新版本',
        noUpdatePrefix: '当前已是最新版本',
        networkCheckFailed: '检查更新失败，请检查网络连接',
        errorInfo: '错误信息',
        canDownload: '您当前的版本为 {currentVersion}，可以前往 GitHub 下载最新版本'
      },
      apiConfig: {
        title: 'AI API配置',
        addButton: '添加API配置',
        noConfigs: '暂无API配置',
        noConfigsDesc: '点击上方\'添加API配置\'按钮创建新的API配置',
        testConnection: '测试连接',
        edit: '编辑',
        delete: '删除',
        types: {
          llm: 'LLM',
          embedding: 'Text Embedding'
        },
        fields: {
          name: '配置名称',
          namePlaceholder: '请输入配置名称，如OpenAI、Claude等',
          apiKey: 'API Key',
          apiKeyPlaceholder: '请输入API Key',
          apiUrl: 'API URL',
          apiUrlPlaceholder: '请输入API URL，如https://api.openai.com',
          modelName: '模型名称',
          modelNamePlaceholder: '请输入模型名称，如gpt-3.5-turbo',
          temperature: '温度 (Temperature)',
          temperatureDesc: '较低的值使输出更确定，较高的值使输出更随机、创造性',
          maxTokens: '最大Token数 (Max Tokens)',
          maxTokensDesc: '限制模型生成的最大token数量'
        },
        modal: {
          addTitle: '添加API配置',
          editTitle: '编辑API配置',
          cancel: '取消',
          save: '保存'
        },
        toast: {
          saved: '配置已添加',
          updated: '配置已更新',
          deleted: '配置已删除',
          saveFailed: '保存配置失败',
          deleteFailed: '删除配置失败',
          testSuccess: '连接测试成功',
          testFailed: '连接测试失败',
          testError: '连接测试出错',
          nameRequired: '请输入配置名称'
        },
        testResult: {
          success: '连接成功',
          failed: '连接失败'
        }
      }
    },
    history: {
      title: '历史记录管理',
      saveButton: '保存',
      type: {
        label: '历史记录保留方式',
        byCount: '按数量保留',
        byTime: '按时间保留'
      },
      maxCount: {
        label: '保留最近的记录数量'
      },
      maxDays: {
        label: '保留天数',
        unit: '天'
      },
      description: {
        byCount: '系统将为每个文件保留最近的 {count} 条历史记录。超出的记录将被自动清理。',
        byTime: '系统将自动清理 {days} 天前的历史记录。'
      }
    },
    memory: {
      title: '记忆功能设置',
      enable: {
        label: '启用记忆功能',
        description: '开启后，AI将能够记住对话内容和笔记信息'
      },
      llmConfig: {
        label: '选择 LLM 配置',
        placeholder: '请选择已配置的 AI API',
        tip: '请在 "AI API设置" 页面先配置 LLM，然后在此选择'
      },
      embeddingConfig: {
        label: '选择嵌入模型 API',
        placeholder: '请选择已配置的嵌入模型 API',
        tip: '请在 "AI API设置" 页面先配置嵌入模型 API，然后在此选择'
      },
      description: {
        title: '记忆功能说明：',
        line1: '• 启用后，AI能够记住您的对话内容和偏好',
        line2: '• 记忆数据将保存在本地 /markdown/.assets/memories/ 目录',
        line3: '• 支持笔记内容自动记忆和智能关联',
        line4: '• 可通过搜索功能快速找到相关记忆'
      }
    },
    performance: {
      title: '性能统计',
      refresh: '刷新',
      export: '导出数据',
      reset: '重置统计',
      loading: '加载性能数据中...',
      memory: {
        title: '内存使用',
        used: '已使用',
        total: '总量',
        usage: '使用率'
      },
      editor: {
        title: '编辑器性能',
        loadTime: '加载时间',
        saveTime: '保存时间',
        renderTime: '渲染时间'
      },
      userActions: {
        title: '操作统计',
        editorChanges: '编辑次数',
        saves: '保存次数',
        loads: '加载次数',
        searches: '搜索次数'
      },
      network: {
        title: '网络性能',
        uploadSpeed: '上传速度',
        downloadSpeed: '下载速度',
        latency: '延迟',
        notRecorded: '未记录'
      },
      report: {
        title: '性能分析报告',
        summary: {
          title: '性能摘要',
          averageMemory: '平均内存使用',
          averageLoadTime: '平均加载时间',
          averageSaveTime: '平均保存时间',
          totalActions: '总操作次数'
        },
        trends: {
          title: '性能趋势',
          memory: {
            increasing: '上升',
            decreasing: '下降',
            stable: '稳定'
          },
          performance: {
            improving: '提升',
            declining: '下降',
            stable: '稳定'
          }
        },
        recommendations: {
          title: '优化建议'
        }
      },
      exportSuccess: '性能数据导出成功',
      exportFailed: '导出性能数据失败',
      resetSuccess: '性能统计已重置',
      tip: '性能数据每1分钟自动更新一次。导出的数据包含详细的历史记录和分析报告，可用于进一步分析和优化。'
    }
  },
  common: {
    loading: '加载中...',
    save: '保存',
    cancel: '取消',
    error: '错误',
    success: '成功',
    failed: '失败',
    loadingFailed: '加载失败',
    saveFailed: '保存失败',
    memoryTrend: '内存趋势',
    performanceTrend: '性能趋势'
  }
}

export default zhCN
