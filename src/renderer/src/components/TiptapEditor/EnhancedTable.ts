import { Table as BaseTable } from '@tiptap/extension-table'
import { TableNodeViewRenderer } from './TableNodeView'

export const EnhancedTable = BaseTable.extend({
  addNodeView() {
    return TableNodeViewRenderer
  }
})

export default EnhancedTable