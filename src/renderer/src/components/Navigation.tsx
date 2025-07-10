import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Nav, Typography, Tree, Toast, Input, Button, Spin, Space } from '@douyinfe/semi-ui'
import {
  IconFolder,
  IconFile,
  IconSetting,
  IconEdit,
  IconDelete,
  IconPlus,
  IconSync,
  IconSearch,
  IconSearchStroked,
  IconClose,
  IconMoreStroked,
  IconMoon,
  IconSun,
  IconComment
} from '@douyinfe/semi-icons'
import { TreeNodeData } from '@douyinfe/semi-ui/lib/es/tree'
import type { SearchRenderProps } from '@douyinfe/semi-ui/lib/es/tree'
import ConfirmDialog from './ConfirmDialog'
import RenameDialog from './RenameDialog'
import CreateDialog from './CreateDialog'
import { NavigationSkeleton } from './Skeleton'
import { useTheme } from '../context/theme/useTheme'
// 导入性能监控器
import { performanceMonitor } from '../utils/PerformanceMonitor'

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
  fileListVersion?: number
}

const Navigation: React.FC<NavigationProps> = ({ onNavChange, onFileSelect, fileListVersion }) => {
  const { isDarkMode, toggleTheme } = useTheme()
  const [collapsed, setCollapsed] = useState(true)
  const [showSecondaryNav, setShowSecondaryNav] = useState(false)
  const [secondaryNavWidth, setSecondaryNavWidth] = useState(200)
  const [selectedKeys, setSelectedKeys] = useState<string[]>(['Editor'])
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
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
    defaultFolder?: string
  }>({
    visible: false,
    title: '',
    type: 'folder'
  })
  const [searchText, setSearchText] = useState<string>('')
  const [showFilteredOnly] = useState<boolean>(true)
  const [filteredExpandedKeys, setFilteredExpandedKeys] = useState<string[]>([])

  const navWidth = '160px' // 定义固定宽度常量
  const secondaryNavRef = useRef<HTMLDivElement>(null)

  const toggleSecondaryNav = useCallback((): void => {
    const newShowState = !showSecondaryNav
    setShowSecondaryNav(newShowState)
    if (newShowState) {
      setCollapsed(true)
      setExpandedKeys([])
    }
  }, [showSecondaryNav])

  const processedNavItems = useMemo(() => {
    const mainNavDefinition = [
      {
        itemKey: 'Editor',
        text: '笔记',
        icon: <IconFolder />,
        onClick: (): void => {
          toggleSecondaryNav()
          onNavChange('Editor')
          setSelectedKeys(['Editor'])
        },
        style: { paddingBlock: '8px' }
      },
      {
        itemKey: 'DataAnalysis',
        text: '数据分析',
        icon: <IconSearchStroked />,
        onClick: (): void => {
          setShowSecondaryNav(false)
          onNavChange('DataAnalysis')
          setSelectedKeys(['DataAnalysis'])
        },
        style: { paddingBlock: '8px' }
      },
      {
        itemKey: 'MindMap',
        text: '思维导图',
        icon: <IconMoreStroked />,
        onClick: (): void => {
          setShowSecondaryNav(false)
          onNavChange('MindMap')
          setSelectedKeys(['MindMap'])
        },
        style: { paddingBlock: '8px' }
      },
      {
        itemKey: 'Chat',
        text: '对话',
        icon: <IconComment />,
        onClick: (): void => {
          setShowSecondaryNav(false)
          onNavChange('Chat')
          setSelectedKeys(['Chat'])
        },
        style: { paddingBlock: '8px' }
      },
      {
        itemKey: 'Settings',
        text: '设置',
        icon: <IconSetting />,
        onClick: (): void => {
          setShowSecondaryNav(false)
          onNavChange('Settings')
          setSelectedKeys(['Settings'])
        },
        style: { paddingBlock: '8px' }
      },
      {
        itemKey: 'ThemeToggle',
        text: '主题切换',
        icon: isDarkMode ? <IconMoon /> : <IconSun />,
        onClick: (): void => {
          toggleTheme()
        },
        style: { cursor: 'pointer', paddingBlock: '8px' }
      },
      {
        itemKey: 'Sync',
        text: '同步',
        icon: <IconSync />,
        onClick: async (): Promise<void> => {
          try {
            const settings = await window.api.settings.getAll()
            const webdavConfig = settings.webdav as
              | {
                  url: string
                  username: string
                  password: string
                  remotePath: string
                  enabled?: boolean
                  syncDirection?: string
                  localPath?: string
                }
              | undefined

            if (
              !webdavConfig ||
              !webdavConfig.enabled ||
              !webdavConfig.url ||
              !webdavConfig.username ||
              !webdavConfig.password
            ) {
              Toast.warning('请先在设置中配置并启用WebDAV同步')
              onNavChange('Settings')
              setSelectedKeys(['Settings'])
              return
            }
            const loadingToast = Toast.info({
              content: (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <Space>
                    <Spin />
                    <span>正在同步中...</span>
                  </Space>
                  <Button
                    type="danger"
                    theme="borderless"
                    icon={<IconClose />}
                    size="small"
                    onClick={async (): Promise<void> => {
                      try {
                        await (
                          window.api.webdav as unknown as {
                            cancelSync: () => Promise<{ success: boolean; message: string }>
                          }
                        ).cancelSync()
                        Toast.info('已发送取消同步请求，正在中断...')
                      } catch (error) {}
                    }}
                  >
                    取消
                  </Button>
                </div>
              ),
              duration: 0,
              id: 'webdav-sync-toast'
            })
            const result = await window.api.webdav.syncBidirectional({
              url: webdavConfig.url,
              username: webdavConfig.username,
              password: webdavConfig.password,
              remotePath: webdavConfig.remotePath || '/markdown-notes'
            })
            Toast.close(loadingToast)

            if (result.success) {
              Toast.success(result.message)
              fetchFileList()
            } else if ((result as { cancelled?: boolean }).cancelled) {
              Toast.warning('同步已被中断')
            } else {
              Toast.error(`同步失败: ${result.message}`)
            }
          } catch (error) {
            Toast.error(`同步失败: ${error instanceof Error ? error.message : String(error)}`)
          }
        },
        style: { paddingBlock: '8px' }
      }
    ]
    return mainNavDefinition.map((item) => {
      if (collapsed) {
        return {
          ...item
        }
      }
      return item
    })
  }, [collapsed, onNavChange, toggleSecondaryNav, isDarkMode, toggleTheme])

  const fetchFileList = useCallback(async () => {
    setIsLoading(true)
    try {
      const { success: foldersSuccess, folders, error: foldersError } =
        await window.api.markdown.getFolders()
      if (!foldersSuccess) {
        throw new Error(foldersError || 'Failed to get folders')
      }

      const newNavItems: NavItem[] = []
      if (folders) {
        const filteredFolders = folders.filter((folder) => !folder.includes('.assets'))
        for (const folder of filteredFolders) {
          const {
            success: filesSuccess,
            files,
            error: filesError
          } = await window.api.markdown.getFiles(folder)
          if (filesSuccess && files) {
            newNavItems.push({
              itemKey: `folder:${folder}`,
              text: folder,
              isFolder: true,
              icon: <IconFolder />,
              items: files.map((file) => ({
                itemKey: `file:${folder}:${file}`,
                text: file.replace(/\.md$/, ''),
                icon: <IconFile />,
                isFolder: false
              }))
            })
          } else {
            console.error(`Failed to get files for folder ${folder}:`, filesError)
          }
        }
      }
      setNavItems(newNavItems)
    } catch (error) {
      Toast.error(`Error loading file list: ${error instanceof Error ? error.message : String(error)}`)
      console.error('Error fetching file list:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // 组件挂载时加载文件夹和文件
    if (showSecondaryNav) {
      fetchFileList()
    }

    // 组件卸载时清理状态
    return (): void => {
      setExpandedKeys([])
    }
  }, [showSecondaryNav, fetchFileList])

  // 当fileListVersion变化时重新加载文件列表
  useEffect(() => {
    if (showSecondaryNav && fileListVersion !== undefined) {
      fetchFileList()
    }
  }, [showSecondaryNav, fileListVersion, fetchFileList])

  // 计算右键菜单位置，确保不超出窗口边界
  const calculateMenuPosition = (
    x: number,
    y: number,
    isFolder: boolean,
    isEmpty: boolean
  ): { x: number; y: number } => {
    // 获取窗口宽高
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    // 根据菜单类型估算高度 - 使用大致估算值
    let menuHeight = 0
    if (isFolder) {
      menuHeight = 220 // 文件夹菜单较高
    } else if (isEmpty) {
      menuHeight = 120 // 空白区域菜单
    } else {
      menuHeight = 120 // 文件菜单
    }

    // 菜单宽度固定
    const menuWidth = 180

    // 计算右侧和底部边界
    let finalX = x
    let finalY = y

    // 检查右侧边界
    if (x + menuWidth > windowWidth) {
      finalX = windowWidth - menuWidth - 10 // 10px的安全边距
    }

    // 检查底部边界
    if (y + menuHeight > windowHeight) {
      finalY = windowHeight - menuHeight - 10 // 10px的安全边距
    }

    // 确保不会超出左侧和顶部边界
    if (finalX < 0) finalX = 10
    if (finalY < 0) finalY = 10

    return { x: finalX, y: finalY }
  }

  // 隐藏右键菜单
  const hideContextMenu = (): void => {
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }

  // 处理右键菜单事件
  const handleContextMenu = (e: React.MouseEvent, itemKey: string, isFolder: boolean): void => {
    e.preventDefault()
    e.stopPropagation()

    // 确保itemKey存在
    if (!itemKey) {
      console.warn('右键菜单: itemKey为空')
      return
    }

    // 计算菜单位置，确保不超出窗口边界
    const { x, y } = calculateMenuPosition(e.clientX, e.clientY, isFolder, false)

    // 设置右键菜单位置和信息
    setContextMenu({
      visible: true,
      x,
      y,
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
      // 计算菜单位置，确保不超出窗口边界
      const { x, y } = calculateMenuPosition(e.clientX, e.clientY, false, true)

      setContextMenu({
        visible: true,
        x,
        y,
        itemKey: '',
        isFolder: false,
        isEmpty: true
      })
    }
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
            fetchFileList()
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
            fetchFileList()
          } else {
            Toast.error(`删除失败: ${result.error}`)
          }
        }
      }
    } catch (error) {
      Toast.error('删除操作失败')
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
            fetchFileList()
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
              fetchFileList()
            } else {
              Toast.error(`重命名失败: ${result.error}`)
            }
          }
        }
      }
    } catch (error) {
      Toast.error('重命名操作失败')
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
    targetFolder?: string,
    defaultFolder?: string
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
        targetFolder,
        defaultFolder
      })
    }, 50)
  }

  // 关闭创建对话框
  const closeCreateDialog = (): void => {
    setCreateDialogConfig((prev) => ({ ...prev, visible: false }))
  }

  // 处理创建确认
  const handleCreateConfirm = async (name: string, folder?: string): Promise<void> => {
    const { type, targetFolder, defaultFolder } = createDialogConfig
    const finalFolder = folder || targetFolder || defaultFolder

    try {
      if (type === 'folder') {
        // 创建文件夹

        // 检查API是否存在
        if (!window.api.markdown.createFolder) {
          Toast.error('创建文件夹API不存在，请检查应用实现')
          return
        }

        // 处理子文件夹情况：如果有父文件夹，则创建"父文件夹/新文件夹"格式的路径
        const folderPath = finalFolder ? `${finalFolder}/${name}` : name

        const result = await window.api.markdown.createFolder(folderPath)

        if (result.success) {
          Toast.success('文件夹已创建')
          // 刷新列表
          fetchFileList()
        } else {
          Toast.error(`创建失败: ${result.error}`)
        }
      } else {
        // 创建笔记
        if (!finalFolder) {
          Toast.error('未指定文件夹')
          return
        }

        // 检查API是否存在
        if (!window.api.markdown.createNote) {
          Toast.error('创建笔记API不存在，请检查应用实现')
          return
        }

        const result = await window.api.markdown.createNote(finalFolder, `${name}.md`, '')

        if (result.success) {
          Toast.success('笔记已创建')
          // 刷新列表
          fetchFileList()
          // 可选：打开新创建的笔记
          if (onFileSelect) {
            onFileSelect(finalFolder, `${name}.md`)
          }
        } else {
          Toast.error(`创建失败: ${result.error}`)
        }
      }
    } catch (error) {
      Toast.error(`创建${type === 'folder' ? '文件夹' : '笔记'}失败`)
    }

    closeCreateDialog()
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
    const folder = itemKey.split(':')[1]
    openCreateDialog('新建笔记', 'note', folder)
    setContextMenu({ visible: false, x: 0, y: 0, itemKey: '', isFolder: false, isEmpty: false })
  }

  // 在特定文件夹下创建子文件夹
  const handleCreateSubFolder = (): void => {
    const { itemKey } = contextMenu

    // 从itemKey中提取父文件夹名
    if (itemKey.startsWith('folder:')) {
      const parentFolder = itemKey.split(':')[1]
      openCreateDialog(`在 '${parentFolder}' 中新建子文件夹`, 'folder', parentFolder)
    }

    hideContextMenu()
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
    setSelectedKeys([selectedKey])
    // 检查selectedKey是否以 "file:" 开头，以确定是文件还是文件夹
    if (selectedKey.startsWith('file:')) {
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

  // 处理树节点展开/折叠事件
  const handleTreeExpand = (expandedKeys: string[]): void => {
    setExpandedKeys(expandedKeys)
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

  // 递归获取所有文件夹路径（包括子文件夹）
  const getAllFolderPaths = (items: NavItem[]): string[] => {
    const paths: string[] = []

    const traverse = (items: NavItem[]): void => {
      for (const item of items) {
        if (item.isFolder) {
          // 从itemKey中提取实际文件夹路径，格式为 folder:路径
          const folderPath = item.itemKey.split(':')[1]
          paths.push(folderPath)

          // 递归处理子文件夹
          if (item.items) {
            const subFolders = item.items.filter((subItem) => subItem.isFolder)
            if (subFolders.length > 0) {
              traverse(subFolders)
            }
          }
        }
      }
    }

    traverse(items)
    return paths
  }

  // 处理搜索结果及展开的节点
  const handleSearch = (_value: string, expandedKeys: string[]): void => {
    // 记录搜索操作
    performanceMonitor.recordUserAction('search')
    setFilteredExpandedKeys(expandedKeys)
  }

  // 自定义搜索框渲染
  const renderSearch = (searchProps: SearchRenderProps): React.ReactNode => {
    return (
      <Input
        {...searchProps}
        prefix={<IconSearch />}
        placeholder="搜索笔记和文件夹..."
        size="small"
        style={{ margin: '0px 2px 0px 2px' }}
        onChange={(value) => {
          setSearchText(value)
          if (searchProps.onChange) {
            searchProps.onChange(value)
          }
        }}
      />
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {isLoading ? (
        <NavigationSkeleton />
      ) : (
        <>
          {/* 主导航栏 */}
          <Nav
            style={{
              height: '100%',
              background: 'var(--semi-color-bg-1)',
              width: collapsed ? '64px' : navWidth,
              transition: 'width 0.2s ease',
              flex: 'none', // 防止导航栏被挤压
              position: 'relative',
              zIndex: 3 // 确保一级导航栏始终在最上层
            }}
            selectedKeys={selectedKeys}
            collapsed={collapsed}
            isCollapsed={collapsed}
            items={processedNavItems}
          />

          {/* 二级导航栏 */}
          {showSecondaryNav && (
            <div
              className="secondary-nav"
              style={{
                width: showSecondaryNav ? `${secondaryNavWidth}px` : 0,
                height: '100%',
                background: 'var(--semi-color-bg-2)',
                borderRight: '1px solid var(--semi-color-border)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.3s ease-in-out',
                flexShrink: 0
              }}
              ref={secondaryNavRef}
              onContextMenu={handleEmptyAreaContextMenu}
            >
              <div
                className="empty-area"
                style={{
                  padding: '8px 8px 8px 4px',
                  overflow: 'auto',
                  width: '100%',
                  height: '100%'
                }}
                onClick={hideContextMenu} // 点击空白处隐藏右键菜单
              >
                {showSecondaryNav && (
                  <div
                    style={{
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  ></div>
                )}

                {isLoading ? (
                  <NavigationSkeleton
                    style={{
                      padding: '0',
                      height: '100%'
                    }}
                    itemCount={10}
                  />
                ) : (
                  <div
                    className="secondary-nav-tree"
                    style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0px 0px 0px 0px' }}
                  >
                    <Tree
                      treeData={convertNavItemsToTreeData(navItems)}
                      value={selectedKeys}
                      onSelect={(val) => handleTreeSelect(val as string)}
                      onExpand={handleTreeExpand}
                      expandedKeys={searchText ? filteredExpandedKeys : expandedKeys}
                      onContextMenu={(e, node): void => {
                        e.preventDefault()
                        e.stopPropagation()
                        
                        // 直接从node获取数据，Semi Design的Tree组件node就是TreeNodeData
                        const nodeData = node as TreeNodeData & NavItem
                        const nodeKey = nodeData.key?.toString() || ''
                        
                        // 根据key的格式判断是文件夹还是文件
                        // folder:xxx 格式是文件夹，file:xxx:xxx 格式是文件
                        const isFolder = nodeKey.startsWith('folder:')
                        
                        handleContextMenu(e, nodeKey, isFolder)
                      }}
                      emptyContent={
                        <Typography.Text type="tertiary" className="empty-area">
                          暂无笔记
                        </Typography.Text>
                      }
                      style={{
                        width: '100%',
                        borderRadius: '3px'
                      }}
                      filterTreeNode={true}
                      showFilteredOnly={showFilteredOnly}
                      searchRender={renderSearch}
                      onSearch={handleSearch}
                      showLine={true}
                      motion={false}
                    />
                  </div>
                )}
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
                      <div
                        className="context-menu-item"
                        style={{
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer',
                          transition: 'background 0.3s'
                        }}
                        onClick={handleCreateSubFolder}
                      >
                        <IconFolder style={{ marginRight: '8px', color: 'var(--semi-color-info)' }} />
                        <Typography.Text>新建子文件夹</Typography.Text>
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
                          // 从itemKey中提取文件夹名称
                          const folderName = contextMenu.itemKey.split(':')[1]
                          openConfirmDialog(
                            `删除文件夹 "${folderName}"`,
                            `确定要删除文件夹 "${folderName}" 吗？文件夹中的所有笔记都将被删除。`,
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
                          // 从itemKey中提取笔记名称 (format: file:文件夹:文件名)
                          const parts = contextMenu.itemKey.split(':')
                          if (parts.length === 3) {
                            const fileName = parts[2].replace('.md', '')
                            openConfirmDialog(
                              `删除笔记 "${fileName}"`,
                              `确定要删除笔记 "${fileName}" 吗？`,
                              handleDelete,
                              'danger'
                            )
                          } else {
                            openConfirmDialog('删除笔记', '确定要删除此笔记吗？', handleDelete, 'danger')
                          }
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
        </>
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
        folders={getAllFolderPaths(navItems)}
        onConfirm={handleCreateConfirm}
        onCancel={closeCreateDialog}
        placeholder={createDialogConfig.type === 'folder' ? '请输入文件夹名称' : '请输入笔记名称'}
        defaultFolder={createDialogConfig.defaultFolder}
      />
    </div>
  )
}

export default Navigation
