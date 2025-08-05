import { StarterKit } from '@tiptap/starter-kit'
import { Heading } from '@tiptap/extension-heading'
import { CustomLink } from './CustomLink'
import { Image } from '@tiptap/extension-image'
import { TextAlign } from '@tiptap/extension-text-align'
import { Underline } from '@tiptap/extension-underline'
import { TextStyle, Color, FontFamily, FontSize, BackgroundColor } from '@tiptap/extension-text-style'
import { Highlight } from '@tiptap/extension-highlight'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { Blockquote } from '@tiptap/extension-blockquote'
import { HorizontalRule } from '@tiptap/extension-horizontal-rule'
import { BulletList } from '@tiptap/extension-list'
import { OrderedList } from '@tiptap/extension-list'
import { ListItem } from '@tiptap/extension-list'
import { Markdown } from 'tiptap-markdown'
import { createLowlight } from 'lowlight'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import php from 'highlight.js/lib/languages/php'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import json from 'highlight.js/lib/languages/json'
import sql from 'highlight.js/lib/languages/sql'
import bash from 'highlight.js/lib/languages/bash'
import markdown from 'highlight.js/lib/languages/markdown'
import yaml from 'highlight.js/lib/languages/yaml'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import plaintext from 'highlight.js/lib/languages/plaintext'
// 添加更多语言支持
import ruby from 'highlight.js/lib/languages/ruby'
import swift from 'highlight.js/lib/languages/swift'
import kotlin from 'highlight.js/lib/languages/kotlin'
import scala from 'highlight.js/lib/languages/scala'
import dart from 'highlight.js/lib/languages/dart'
import lua from 'highlight.js/lib/languages/lua'
import r from 'highlight.js/lib/languages/r'
import matlab from 'highlight.js/lib/languages/matlab'
import perl from 'highlight.js/lib/languages/perl'
import shell from 'highlight.js/lib/languages/shell'
import powershell from 'highlight.js/lib/languages/powershell'
import ini from 'highlight.js/lib/languages/ini'
import toml from 'highlight.js/lib/languages/ini' // TOML uses ini parser
import groovy from 'highlight.js/lib/languages/groovy'
import vim from 'highlight.js/lib/languages/vim'
import AiPlaceholder from './AiPlaceholder'
import CodeBlockComponent from './CodeBlockComponent'
import { ReactNodeViewRenderer } from '@tiptap/react'
import TableColumnResize from './TableColumnResize'
import SlashCommand from './SlashCommand'
import { LineBreakDetector } from './LineBreakDetector'

// 创建lowlight实例
const lowlight = createLowlight()

// 注册核心语言
lowlight.register('javascript', javascript)
lowlight.register('js', javascript)
lowlight.register('jsx', javascript)
lowlight.register('typescript', typescript)
lowlight.register('ts', typescript)
lowlight.register('tsx', typescript)
lowlight.register('python', python)
lowlight.register('py', python)
lowlight.register('java', java)
lowlight.register('cpp', cpp)
lowlight.register('c++', cpp)
lowlight.register('c', cpp)
lowlight.register('csharp', csharp)
lowlight.register('cs', csharp)
lowlight.register('go', go)
lowlight.register('rust', rust)
lowlight.register('rs', rust)
lowlight.register('php', php)
lowlight.register('css', css)
lowlight.register('scss', css)
lowlight.register('sass', css)
lowlight.register('less', css)
lowlight.register('html', xml)
lowlight.register('xml', xml)
lowlight.register('svg', xml)
lowlight.register('json', json)
lowlight.register('sql', sql)
lowlight.register('mysql', sql)
lowlight.register('postgresql', sql)
lowlight.register('bash', bash)
lowlight.register('sh', bash)
lowlight.register('zsh', bash)
lowlight.register('shell', shell)
lowlight.register('md', markdown)
lowlight.register('yaml', yaml)
lowlight.register('yml', yaml)
lowlight.register('dockerfile', dockerfile)
lowlight.register('docker', dockerfile)
lowlight.register('plaintext', plaintext)
lowlight.register('text', plaintext)
lowlight.register('txt', plaintext)

// 注册扩展语言
lowlight.register('ruby', ruby)
lowlight.register('rb', ruby)
lowlight.register('swift', swift)
lowlight.register('kotlin', kotlin)
lowlight.register('kt', kotlin)
lowlight.register('scala', scala)
lowlight.register('dart', dart)
lowlight.register('lua', lua)
lowlight.register('r', r)
lowlight.register('matlab', matlab)
lowlight.register('m', matlab)
lowlight.register('perl', perl)
lowlight.register('pl', perl)
lowlight.register('powershell', powershell)
lowlight.register('ps1', powershell)
lowlight.register('ini', ini)
lowlight.register('toml', toml)
lowlight.register('conf', ini)
lowlight.register('config', ini)
lowlight.register('groovy', groovy)
lowlight.register('gradle', groovy)
lowlight.register('vim', vim)
lowlight.register('vimscript', vim)

// 自定义代码块节点
const CustomCodeBlock = CodeBlockLowlight.extend({
  name: 'codeBlockComponent',
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent as any)
  },
})

export const defaultExtensions = [
  StarterKit.configure({
    codeBlock: false, // 禁用默认的代码块，使用自定义实现
    heading: false, // 禁用默认的标题，使用自定义配置
    bulletList: false, // 禁用默认的无序列表，使用自定义配置
    orderedList: false, // 禁用默认的有序列表，使用自定义配置
    listItem: false, // 禁用默认的列表项，使用自定义配置
    link: false, // 禁用默认的链接，使用自定义实现
    blockquote: false, // 禁用默认的引用，使用自定义配置
    horizontalRule: false, // 禁用默认的水平线，使用自定义配置
  }),
  
  Heading.configure({
    levels: [1, 2, 3, 4, 5, 6],
  }),

  CustomLink.configure({
    openOnClick: false,
    autolink: true,
    linkOnPaste: true,
    defaultProtocol: 'https',
    protocols: ['http', 'https', 'ftp', 'mailto'],
    HTMLAttributes: {
      class: 'link',
      rel: 'noopener noreferrer',
      target: '_blank',
    },
  }),

  Image.configure({
    HTMLAttributes: {
      class: 'image',
    },
  }),

  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),

  Underline,

  TextStyle,

  Color.configure({
    types: ['textStyle'],
  }),

  FontFamily.configure({
    types: ['textStyle'],
  }),

  FontSize.configure({
    types: ['textStyle'],
  }),

  BackgroundColor.configure({
    types: ['textStyle'],
  }),

  Highlight.configure({
    multicolor: true,
  }),

  CustomCodeBlock.configure({
    lowlight,
    defaultLanguage: 'javascript',
    HTMLAttributes: {
      class: 'code-block-component',
    },
  }),

  Table.configure({
    resizable: true,
    allowTableNodeSelection: true,
    HTMLAttributes: {
      class: 'table',
    },
  }),

  TableRow,

  TableHeader,

  TableCell,

  Blockquote,

  HorizontalRule,
  
  BulletList,
  OrderedList,
  ListItem,

  Markdown.configure({
    html: true,
    tightLists: true,
    tightListClass: 'tight',
    bulletListMarker: '-',
    linkify: false,
    breaks: false,
    transformPastedText: true,
    transformCopiedText: true,
  }),
  
  AiPlaceholder,
  
  TableColumnResize,
  
  SlashCommand,
  
  LineBreakDetector.configure({
    enabled: true,
    styleContentNodes: [
      'image',
      'table',
      'codeBlock',
      'blockquote',
      'horizontalRule',
      'bulletList',
      'orderedList',
      'aiPlaceholder',
      'codeBlockComponent'
    ],
    textNodes: [
      'paragraph',
      'heading',
      'text'
    ],
  }),
]