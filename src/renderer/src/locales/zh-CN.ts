import { Dictionary } from '@blocknote/core'

export const zhCN: Dictionary = {
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
    quote: {
      title: '引用',
      subtext: '引用或摘录',
      aliases: ['quotation', 'blockquote', 'bq', '引用'],
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
    default: "输入文本或键入'/'显示命令",
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
    no_items_title: '未找到项目',
    loading: '加载中…'
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
  }
}

export default zhCN
