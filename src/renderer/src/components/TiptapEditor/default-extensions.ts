import { StarterKit } from '@tiptap/starter-kit'
import { Heading } from '@tiptap/extension-heading'
import { Link } from '@tiptap/extension-link'
import { Image } from '@tiptap/extension-image'
import { TextAlign } from '@tiptap/extension-text-align'
import { Underline } from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
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
import AiPlaceholder from './AiPlaceholder'
import CodeBlockComponent from './CodeBlockComponent'
import { Node, ReactNodeViewRenderer } from '@tiptap/react'
import SlashCommand from './SlashCommand'

// 创建lowlight实例
const lowlight = createLowlight()

// 注册语言
lowlight.register('javascript', javascript)
lowlight.register('js', javascript)
lowlight.register('typescript', typescript)
lowlight.register('ts', typescript)
lowlight.register('python', python)
lowlight.register('py', python)
lowlight.register('java', java)
lowlight.register('cpp', cpp)
lowlight.register('c++', cpp)
lowlight.register('csharp', csharp)
lowlight.register('cs', csharp)
lowlight.register('go', go)
lowlight.register('rust', rust)
lowlight.register('rs', rust)
lowlight.register('php', php)
lowlight.register('css', css)
lowlight.register('html', xml)
lowlight.register('xml', xml)
lowlight.register('json', json)
lowlight.register('sql', sql)
lowlight.register('bash', bash)
lowlight.register('sh', bash)
lowlight.register('shell', bash)

// 自定义代码块节点
const CustomCodeBlock = Node.create({
  name: 'codeBlockComponent',
  group: 'block',
  content: 'text*',
  marks: '',
  code: true,
  defining: true,
  isolating: true,
  addAttributes() {
    return {
      language: {
        default: 'javascript',
        parseHTML: element => {
          const { language } = element.dataset
          return language
        },
        rendered: false,
      },
    }
  },
  parseHTML() {
    return [
      {
        tag: 'pre',
        preserveWhitespace: 'full',
      },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return ['pre', HTMLAttributes, ['code', { class: `language-${HTMLAttributes.language}` }, 0]]
  },
  addNodeView() {
    return () => {
      return ReactNodeViewRenderer(CodeBlockComponent)
    }
  },
})

export const defaultExtensions = [
  StarterKit.configure({
    codeBlock: false, // 禁用默认的代码块，使用自定义实现
    heading: false, // 禁用默认的标题，使用自定义配置
    bulletList: false, // 禁用默认的无序列表，使用自定义配置
    orderedList: false, // 禁用默认的有序列表，使用自定义配置
    listItem: false, // 禁用默认的列表项，使用自定义配置
  }),
  
  Heading.configure({
    levels: [1, 2, 3, 4, 5, 6],
  }),

  Link.configure({
    openOnClick: false,
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

  CodeBlockLowlight.configure({
    lowlight,
    defaultLanguage: 'javascript',
    HTMLAttributes: {
      class: 'code-block',
    },
  }),

  Table.configure({
    resizable: true,
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
  
  CustomCodeBlock,
  
  SlashCommand,
]