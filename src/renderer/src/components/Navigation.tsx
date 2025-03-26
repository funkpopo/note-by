import React, { useState, useEffect, useRef } from 'react'
import { Nav, Input, Typography, Tree, Toast } from '@douyinfe/semi-ui'
import {
  IconFolder,
  IconSetting,
  IconSearch,
  IconDelete,
  IconFile,
  IconEdit,
  IconPlus
} from '@douyinfe/semi-icons'
import { TreeNodeData } from '@douyinfe/semi-ui/lib/es/tree'
import ConfirmDialog from './ConfirmDialog'
import RenameDialog from './RenameDialog'
import CreateDialog from './CreateDialog'

// 定义导航项类型
interface NavItem {
  itemKey: string
  text: string
  icon?: React.ReactNode
  items?: NavItem[]
  isFolder?: boolean
}

interface NavigationProps {
  onNavChange: (key: string) => void
  onFileSelect?: (folder: string, file: string) => void
}

const Navigation: React.FC<NavigationProps> = ({ onNavChange, onFileSelect }) => {
  const [collapsed, setCollapsed] = useState(false)
  const [showSecondaryNav, setShowSecondaryNav] = useState(false)
  const [secondaryNavWidth, setSecondaryNavWidth] = useState(200)
  const [selectedKeys, setSelectedKeys] = useState<string[]>(['Editor'])
  const [searchValue, setSearchValue] = useState('')
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean
    x: number
    y: number
    itemKey: string
    isFolder: boolean
    isEmpty: boolean
  }>({
    visible: false,
    x: 0,
    y: 0,
    itemKey: '',
    isFolder: false,
    isEmpty: false
  })
  const [navItems, setNavItems] = useState<NavItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean
    title: string
    content: string
    onConfirm: () => void
    type: 'warning' | 'danger' | 'info' | 'success'
  }>({
    visible: false,
    title: '',
    content: '',
    onConfirm: () => {},
    type: 'warning'
  })
  const [renameDialogConfig, setRenameDialogConfig] = useState<{
    visible: boolean
    title: string
    initialValue: string
    type: 'folder' | 'file'
    itemKey: string
  }>({
    visible: false,
    title: '',
    initialValue: '',
    type: 'folder',
    itemKey: ''
  })
  const [createDialogConfig, setCreateDialogConfig] = useState<{
    visible: boolean
    title: string
    type: 'folder' | 'note'
    targetFolder?: string
  }>({
    visible: false,
    title: '',
    type: 'folder'
  })

  const navWidth = '180px' // 定义固定宽度常量
  const secondaryNavRef = useRef<HTMLDivElement>(null)

  // 加载markdown文件夹和文件
  const loadMarkdownFolders = async (): Promise<void> => {
    setIsLoading(true)
    try {
      // 获取文件夹列表
      const foldersResult = await window.api.markdown.getFolders()

      if (foldersResult.success && foldersResult.folders) {
        const folderItems: NavItem[] = []

        // 处理每个文件夹
        for (const folder of foldersResult.folders) {
          // 获取文件夹中的文件
          const filesResult = await window.api.markdown.getFiles(folder)

          const folderItem: NavItem = {
            itemKey: `folder:${folder}`,
            text: folder,
            icon: <IconFolder />,
            isFolder: true,
            items: []
          }

          // 如果有文件，添加到文件夹的子项中
          if (filesResult.success && filesResult.files && filesResult.files.length > 0) {
            folderItem.items = filesResult.files.map((file) => ({
              itemKey: `file:${folder}:${file}`,
              text: file.replace('.md', ''),
              icon: <IconFile />,
              isFolder: false
            }))
          }

          folderItems.push(folderItem)
        }

        setNavItems(folderItems)
      }
    } catch (error) {
      console.error('加载Markdown文件夹失败:', error)
      Toast.error('加载文件列表失败')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // 组件挂载时加载文件夹和文件
    if (showSecondaryNav) {
      loadMarkdownFolders()
    }
  }, [showSecondaryNav])

  const handleCollapseChange = (status: boolean): void => {
    setCollapsed(status)
  }

  const toggleSecondaryNav = (): void => {
    const newShowState = !showSecondaryNav
    setShowSecondaryNav(newShowState)

    // 如果二级导航栏展开，则自动折叠一级导航栏
    if (newShowState) {
      setCollapsed(true)
    }
  }

  // 处理右键菜单事件
  const handleContextMenu = (e: React.MouseEvent, itemKey: string, isFolder: boolean): void => {
    e.preventDefault()
    e.stopPropagation()

    // 设置右键菜单位置和信息
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      itemKey,
      isFolder,
      isEmpty: false
    })
  }

  // 处理空白区域右键菜单
  const handleEmptyAreaContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault()

    // 确保点击的是空白区域，而非Tree中的节点
    const target = e.target as HTMLElement
    if (
      secondaryNavRef.current &&
      (target === secondaryNavRef.current || target.classList.contains('empty-area'))
    ) {
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        itemKey: '',
        isFolder: false,
        isEmpty: true
      })
    }
  }

  // 隐藏右键菜单
  const hideContextMenu = (): void => {
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }

  // 删除项目
  const handleDelete = async (): Promise<void> => {
    const { itemKey, isFolder } = contextMenu

    try {
      // 获取路径信息
      let path = ''
      if (isFolder) {
        // 格式: folder:文件夹名
        const parts = itemKey.split(':')
        if (parts.length === 2) {
          path = parts[1]
          // 调用删除文件夹API
          const result = await window.api.markdown.deleteFolder(path)
          if (result.success) {
            Toast.success('文件夹已删除')
            // 刷新列表
            loadMarkdownFolders()
          } else {
            Toast.error(`删除失败: ${result.error}`)
          }
        }
      } else {
        // 格式: file:文件夹:文件名
        const parts = itemKey.split(':')
        if (parts.length === 3) {
          const folder = parts[1]
          const file = parts[2]
          path = `${folder}/${file}`
          // 调用删除文件API
          const result = await window.api.markdown.deleteFile(path)
          if (result.success) {
            Toast.success('文件已删除')
            // 刷新列表
            loadMarkdownFolders()
          } else {
            Toast.error(`删除失败: ${result.error}`)
          }
        }
      }
    } catch (error) {
      Toast.error('删除操作失败')
      console.error('删除操作失败:', error)
    }

    hideContextMenu()
  }

  // 打开重命名对话框
  const openRenameDialog = (
    title: string,
    initialValue: string,
    type: 'folder' | 'file',
    itemKey: string
  ): void => {
    // 先关闭可能存在的对话框，确保状态重置
    setRenameDialogConfig((prev) => ({
      ...prev,
      visible: false
    }))

    // 使用setTimeout确保先完成关闭动作，再重新打开对话框
    setTimeout(() => {
      setRenameDialogConfig({
        visible: true,
        title,
        initialValue,
        type,
        itemKey
      })
    }, 50)
  }

  // 关闭重命名对话框
  const closeRenameDialog = (): void => {
    setRenameDialogConfig((prev) => ({ ...prev, visible: false }))
  }

  // 处理重命名确认
  const handleRenameConfirm = async (newName: string): Promise<void> => {
    const { type, itemKey } = renameDialogConfig

    try {
      if (type === 'folder') {
        // 从itemKey中提取文件夹名
        if (itemKey.startsWith('folder:')) {
          const folderName = itemKey.split(':')[1]

          // 调用重命名文件夹API
          const result = await window.api.markdown.renameFolder(folderName, newName)
          if (result.success) {
            Toast.success('文件夹已重命名')
            // 刷新列表
            loadMarkdownFolders()
          } else {
            Toast.error(`重命名失败: ${result.error}`)
          }
        }
      } else {
        // 从itemKey中提取文件信息
        if (itemKey.startsWith('file:')) {
          const parts = itemKey.split(':')
          if (parts.length === 3) {
            const folder = parts[1]
            const file = parts[2]

            // 调用重命名文件API
            const result = await window.api.markdown.renameFile(
              `${folder}/${file}`,
              `${folder}/${newName}.md`
            )
            if (result.success) {
              Toast.success('笔记已重命名')
              // 刷新列表
              loadMarkdownFolders()
            } else {
              Toast.error(`重命名失败: ${result.error}`)
            }
          }
        }
      }
    } catch (error) {
      Toast.error('重命名操作失败')
      console.error('重命名失败:', error)
    }

    closeRenameDialog()
  }

  // 编辑文件夹名称
  const handleRenameFolder = (): void => {
    const { itemKey } = contextMenu

    // 从itemKey中提取文件夹名
    if (itemKey.startsWith('folder:')) {
      const folderName = itemKey.split(':')[1]
      openRenameDialog('重命名文件夹', folderName, 'folder', itemKey)
    }

    hideContextMenu()
  }

  // 重命名文件
  const handleRenameFile = (): void => {
    const { itemKey } = contextMenu

    // 从itemKey中提取文件信息
    if (itemKey.startsWith('file:')) {
      const parts = itemKey.split(':')
      if (parts.length === 3) {
        const file = parts[2]
        const fileName = file.replace('.md', '')
        openRenameDialog('重命名笔记', fileName, 'file', itemKey)
      }
    }

    hideContextMenu()
  }

  // 打开创建对话框
  const openCreateDialog = (
    title: string,
    type: 'folder' | 'note',
    targetFolder?: string
  ): void => {
    // 先关闭可能存在的对话框，确保状态重置
    setCreateDialogConfig((prev) => ({
      ...prev,
      visible: false
    }))

    // 使用setTimeout确保先完成关闭动作，再重新打开对话框
    setTimeout(() => {
      setCreateDialogConfig({
        visible: true,
        title,
        type,
        targetFolder
      })
    }, 50)
  }

  // 关闭创建对话框
  const closeCreateDialog = (): void => {
    setCreateDialogConfig((prev) => ({ ...prev, visible: false }))
  }

  // 处理创建确认
  const handleCreateConfirm = async (name: string, folder?: string): Promise<void> => {
    const { type, targetFolder } = createDialogConfig
    const finalFolder = folder || targetFolder

    try {
      if (type === 'folder') {
        // 创建文件夹
        console.log('开始创建文件夹:', name)

        // 检查API是否存在
        if (!window.api.markdown.createFolder) {
          console.error('createFolder API不存在')
          Toast.error('创建文件夹API不存在，请检查应用实现')
          return
        }

        const result = await window.api.markdown.createFolder(name)
        console.log('创建文件夹结果:', result)

        if (result.success) {
          Toast.success('文件夹已创建')
          // 刷新列表
          loadMarkdownFolders()
        } else {
          Toast.error(`创建失败: ${result.error}`)
          console.error('创建文件夹失败:', result.error)
        }
      } else {
        // 创建笔记
        if (!finalFolder) {
          Toast.error('未指定文件夹')
          return
        }

        console.log('开始创建笔记:', name, '在文件夹:', finalFolder)

        // 检查API是否存在
        if (!window.api.markdown.createNote) {
          console.error('createNote API不存在')
          Toast.error('创建笔记API不存在，请检查应用实现')
          return
        }

        const result = await window.api.markdown.createNote(finalFolder, `${name}.md`, '')
        console.log('创建笔记结果:', result)

        if (result.success) {
          Toast.success('笔记已创建')
          // 刷新列表
          loadMarkdownFolders()
          // 可选：打开新创建的笔记
          if (onFileSelect) {
            onFileSelect(finalFolder, `${name}.md`)
          }
        } else {
          Toast.error(`创建失败: ${result.error}`)
          console.error('创建笔记失败:', result.error)
        }
      }

      // 创建测试文件夹来验证权限
      try {
        const testResult = await window.api.markdown.createFolder('_test_folder_' + Date.now())
        console.log('测试文件夹创建结果:', testResult)
      } catch (error) {
        console.error('测试文件夹创建失败:', error)
      }
    } catch (error) {
      Toast.error(`创建${type === 'folder' ? '文件夹' : '笔记'}失败`)
      console.error('创建失败详细信息:', error)
    }

    closeCreateDialog()
  }

  // 诊断系统
  const handleDiagnose = async (): Promise<void> => {
    try {
      // 获取系统诊断信息
      // @ts-ignore - API类型定义问题
      const result = await window.api.system.diagnoseEnvironment()

      if (result.success && result.info) {
        // 显示诊断信息
        const info = result.info
        const message = `
应用路径: ${info.appPath}
用户数据: ${info.userData}
可执行文件: ${info.exePath}
平台: ${info.platform}
Markdown路径: ${info.markdownPath || '未知'}
Markdown目录存在: ${info.markdownExists ? '是' : '否'}
Markdown目录内容: ${
          info.markdownDirectories && info.markdownDirectories.length > 0
            ? info.markdownDirectories.join(', ')
            : '空'
        }
        `

        Toast.info({
          content: '诊断信息已记录到控制台',
          duration: 3
        })

        console.log('系统诊断信息:')
        console.log(message)
        console.log('完整诊断对象:', info)

        // 创建测试文件夹来验证权限
        try {
          const testResult = await window.api.markdown.createFolder('_test_folder_' + Date.now())
          console.log('测试文件夹创建结果:', testResult)
        } catch (error) {
          console.error('测试文件夹创建失败:', error)
        }
      } else {
        Toast.error('获取诊断信息失败: ' + (result.error || '未知错误'))
      }
    } catch (error) {
      console.error('执行诊断失败:', error)
      Toast.error('执行诊断失败')
    }
  }

  // 新建文件夹
  const handleCreateFolder = (): void => {
    openCreateDialog('新建文件夹', 'folder')
    hideContextMenu()
  }

  // 新建笔记
  const handleCreateNote = (folder?: string): void => {
    openCreateDialog('新建笔记', 'note', folder)
    hideContextMenu()
  }

  // 在特定文件夹下创建笔记
  const handleCreateNoteInFolder = (): void => {
    const { itemKey } = contextMenu

    // 从itemKey中提取文件夹名
    if (itemKey.startsWith('folder:')) {
      const folderName = itemKey.split(':')[1]
      handleCreateNote(folderName)
    }
  }

  // 将NavItem数组转换为Tree需要的数据格式
  const convertNavItemsToTreeData = (items: NavItem[]): TreeNodeData[] => {
    return items.map((item) => ({
      key: item.itemKey,
      label: item.text,
      icon: item.icon,
      children: item.items ? convertNavItemsToTreeData(item.items) : undefined
    }))
  }

  // 处理树节点点击事件
  const handleTreeSelect = (selectedKey: string): void => {
    // 检查是否为文件项
    if (selectedKey.startsWith('file:')) {
      // 解析文件路径: file:文件夹:文件名
      const parts = selectedKey.split(':')
      if (parts.length === 3) {
        const folder = parts[1]
        const file = parts[2]

        // 通知父组件选中了文件
        if (onFileSelect) {
          onFileSelect(folder, file)
        }
      }
    }
  }

  // 过滤树数据
  const getFilteredTreeData = (): TreeNodeData[] => {
    if (!searchValue) {
      return convertNavItemsToTreeData(navItems)
    }

    // 递归过滤函数
    const filterItems = (items: NavItem[]): NavItem[] => {
      const result: NavItem[] = []

      for (const item of items) {
        // 检查当前项是否匹配
        const matches = item.text.toLowerCase().includes(searchValue.toLowerCase())

        // 过滤子项
        const filteredChildren = item.items ? filterItems(item.items) : undefined

        // 如果当前项匹配或有匹配的子项，则保留
        if (matches || (filteredChildren && filteredChildren.length > 0)) {
          result.push({
            ...item,
            items: filteredChildren
          })
        }
      }

      return result
    }

    // 应用过滤并转换为Tree数据
    return convertNavItemsToTreeData(filterItems(navItems))
  }

  // 打开确认对话框
  const openConfirmDialog = (
    title: string,
    content: string,
    onConfirm: () => void,
    type: 'warning' | 'danger' | 'info' | 'success' = 'warning'
  ): void => {
    setDialogConfig({
      visible: true,
      title,
      content,
      onConfirm,
      type
    })
  }

  // 关闭确认对话框
  const closeConfirmDialog = (): void => {
    setDialogConfig((prev) => ({ ...prev, visible: false }))
  }

  return (
    <>
      {/* 主导航栏 */}
      <Nav
        style={{
          height: '100%',
          background: 'var(--semi-color-bg-1)',
          width: collapsed ? '64px' : navWidth,
          transition: 'width 0.2s ease',
          flex: 'none' // 防止导航栏被挤压
        }}
        selectedKeys={selectedKeys}
        collapsed={collapsed}
        onCollapseChange={handleCollapseChange}
        isCollapsed={collapsed}
        items={[
          {
            itemKey: 'Editor',
            text: '笔记',
            icon: <IconFolder />,
            onClick: (): void => {
              toggleSecondaryNav()
              onNavChange('Editor')
              setSelectedKeys(['Editor'])
            }
          },
          {
            itemKey: 'Settings',
            text: '设置',
            icon: <IconSetting />,
            onClick: (): void => {
              setShowSecondaryNav(false)
              onNavChange('Settings')
              setSelectedKeys(['Settings'])
            }
          }
        ]}
        footer={{
          collapseButton: true
        }}
      />

      {/* 二级导航栏 */}
      {showSecondaryNav && (
        <div
          className="secondary-nav"
          style={{
            width: `${secondaryNavWidth}px`,
            height: '100%',
            position: 'relative',
            background: 'var(--semi-color-bg-2)',
            borderRight: '1px solid var(--semi-color-border)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
          ref={secondaryNavRef}
          onContextMenu={handleEmptyAreaContextMenu}
        >
          {/* 搜索框 */}
          <div style={{ padding: '8px', borderBottom: '1px solid var(--semi-color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Input
                prefix={<IconSearch />}
                placeholder="搜索笔记..."
                value={searchValue}
                onChange={(value) => setSearchValue(value)}
                style={{ flex: 1 }}
              />
              <Typography.Text
                link
                style={{ marginLeft: '8px', fontSize: '12px' }}
                onClick={handleDiagnose}
              >
                诊断
              </Typography.Text>
            </div>
          </div>

          <div
            className="empty-area"
            style={{
              padding: '8px',
              overflow: 'auto',
              width: '100%',
              height: '100%'
            }}
            onClick={hideContextMenu} // 点击空白处隐藏右键菜单
          >
            <Tree
              treeData={getFilteredTreeData()}
              onSelect={handleTreeSelect}
              onContextMenu={(e, node): void => {
                // 通过节点的key判断是文件夹还是文件
                const nodeKey = node.key?.toString() || ''
                const isFolder = nodeKey.startsWith('folder:')
                // 先转换成unknown再转成React.MouseEvent类型
                const mouseEvent = e.nativeEvent as unknown as React.MouseEvent
                handleContextMenu(mouseEvent, nodeKey, isFolder)
              }}
              emptyContent={
                isLoading ? (
                  <Typography.Text>加载中...</Typography.Text>
                ) : (
                  <Typography.Text type="tertiary" className="empty-area">
                    {searchValue ? '没有找到匹配的项目' : '暂无笔记'}
                  </Typography.Text>
                )
              }
              style={{
                width: '100%',
                borderRadius: '3px'
              }}
              expandAll
            />
          </div>

          {/* 右键菜单 - 使用绝对定位 */}
          {contextMenu.visible && (
            <div
              className="context-menu"
              style={{
                position: 'fixed',
                top: contextMenu.y,
                left: contextMenu.x,
                zIndex: 1000,
                background: 'var(--semi-color-bg-2)',
                boxShadow: 'var(--semi-shadow-elevated)',
                borderRadius: '4px',
                padding: '4px 0',
                minWidth: '180px',
                border: '1px solid var(--semi-color-border)'
              }}
            >
              {contextMenu.isFolder && (
                <>
                  <div
                    className="context-menu-item"
                    style={{
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'background 0.3s'
                    }}
                    onClick={handleCreateNoteInFolder}
                  >
                    <IconPlus style={{ marginRight: '8px', color: 'var(--semi-color-primary)' }} />
                    <Typography.Text>新建笔记</Typography.Text>
                  </div>
                  <div className="context-menu-divider" />
                  <div
                    className="context-menu-item"
                    style={{
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'background 0.3s'
                    }}
                    onClick={handleRenameFolder}
                  >
                    <IconEdit style={{ marginRight: '8px', color: 'var(--semi-color-tertiary)' }} />
                    <Typography.Text>重命名文件夹</Typography.Text>
                  </div>
                  <div className="context-menu-divider" />
                  <div
                    className="context-menu-item context-menu-item-danger"
                    style={{
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'background 0.3s'
                    }}
                    onClick={(): void => {
                      openConfirmDialog(
                        '删除文件夹',
                        '确定要删除此文件夹吗？文件夹中的所有笔记都将被删除。',
                        handleDelete,
                        'danger'
                      )
                      hideContextMenu()
                    }}
                  >
                    <IconDelete style={{ marginRight: '8px', color: 'var(--semi-color-danger)' }} />
                    <Typography.Text style={{ color: 'var(--semi-color-danger)' }}>
                      删除文件夹
                    </Typography.Text>
                  </div>
                </>
              )}

              {!contextMenu.isFolder && !contextMenu.isEmpty && (
                <>
                  <div
                    className="context-menu-item"
                    style={{
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'background 0.3s'
                    }}
                    onClick={handleRenameFile}
                  >
                    <IconEdit style={{ marginRight: '8px', color: 'var(--semi-color-tertiary)' }} />
                    <Typography.Text>重命名笔记</Typography.Text>
                  </div>
                  <div className="context-menu-divider" />
                  <div
                    className="context-menu-item context-menu-item-danger"
                    style={{
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'background 0.3s'
                    }}
                    onClick={(): void => {
                      openConfirmDialog('删除笔记', '确定要删除此笔记吗？', handleDelete, 'danger')
                      hideContextMenu()
                    }}
                  >
                    <IconDelete style={{ marginRight: '8px', color: 'var(--semi-color-danger)' }} />
                    <Typography.Text style={{ color: 'var(--semi-color-danger)' }}>
                      删除笔记
                    </Typography.Text>
                  </div>
                </>
              )}

              {contextMenu.isEmpty && (
                <>
                  <div
                    className="context-menu-item"
                    style={{
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'background 0.3s'
                    }}
                    onClick={handleCreateFolder}
                  >
                    <IconFolder style={{ marginRight: '8px', color: 'var(--semi-color-info)' }} />
                    <Typography.Text>新建文件夹</Typography.Text>
                  </div>
                  <div className="context-menu-divider" />
                  <div
                    className="context-menu-item"
                    style={{
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'background 0.3s'
                    }}
                    onClick={() => handleCreateNote()}
                  >
                    <IconFile style={{ marginRight: '8px', color: 'var(--semi-color-primary)' }} />
                    <Typography.Text>新建笔记</Typography.Text>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 点击其他区域关闭右键菜单 */}
          {contextMenu.visible && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 999
              }}
              onClick={hideContextMenu}
            />
          )}

          <div
            className="resize-handle"
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: '5px',
              height: '100%',
              cursor: 'col-resize',
              background: 'transparent',
              zIndex: 10
            }}
            onMouseDown={(e): void => {
              e.preventDefault()
              const startX = e.clientX
              const startWidth = secondaryNavWidth

              const onMouseMove = (moveEvent: MouseEvent): void => {
                const newWidth = startWidth + moveEvent.clientX - startX
                if (newWidth >= 150 && newWidth <= 400) {
                  setSecondaryNavWidth(newWidth)
                }
              }

              const onMouseUp = (): void => {
                document.removeEventListener('mousemove', onMouseMove)
                document.removeEventListener('mouseup', onMouseUp)
              }

              document.addEventListener('mousemove', onMouseMove)
              document.addEventListener('mouseup', onMouseUp)
            }}
          />
        </div>
      )}

      {/* 确认对话框 */}
      <ConfirmDialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        content={dialogConfig.content}
        onConfirm={(): void => {
          dialogConfig.onConfirm()
          closeConfirmDialog()
        }}
        onCancel={closeConfirmDialog}
        type={dialogConfig.type}
      />

      {/* 重命名对话框 */}
      <RenameDialog
        visible={renameDialogConfig.visible}
        title={renameDialogConfig.title}
        initialValue={renameDialogConfig.initialValue}
        onConfirm={handleRenameConfirm}
        onCancel={closeRenameDialog}
        type={renameDialogConfig.type}
      />

      {/* 创建对话框 */}
      <CreateDialog
        visible={createDialogConfig.visible}
        title={createDialogConfig.title}
        type={createDialogConfig.type}
        folders={navItems.map((item) => item.text)}
        onConfirm={handleCreateConfirm}
        onCancel={closeCreateDialog}
        placeholder={createDialogConfig.type === 'folder' ? '请输入文件夹名称' : '请输入笔记名称'}
      />
    </>
  )
}

export default Navigation
