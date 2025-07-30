import { Link } from '@tiptap/extension-link'

export const CustomLink = Link.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-k': () => {
        // 触发链接对话框事件
        const event = new CustomEvent('openLinkDialog')
        document.dispatchEvent(event)
        return true
      },
      'Mod-Shift-k': () => {
        // 快速移除链接
        return this.editor.chain().focus().unsetLink().run()
      }
    }
  }
})