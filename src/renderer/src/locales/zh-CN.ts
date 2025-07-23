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
  }
}

export default zhCN
