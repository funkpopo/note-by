import React, { useState } from 'react'
import { Nav, Input, Typography, Tree } from '@douyinfe/semi-ui'
import { IconFolder, IconSetting, IconSearch, IconDelete } from '@douyinfe/semi-icons'
import { TreeNodeData } from '@douyinfe/semi-ui/lib/es/tree'

// 定义导航项类型
interface NavItem {
  itemKey: string
  text: string
  icon?: React.ReactNode
  items?: NavItem[]
}

interface NavigationProps {
  onNavChange: (key: string) => void
}

const Navigation: React.FC<NavigationProps> = ({ onNavChange }) => {
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
  }>({
    visible: false,
    x: 0,
    y: 0,
    itemKey: '',
    isFolder: false
  })
  const [navItems, setNavItems] = useState<NavItem[]>([
    {
      itemKey: 'group1',
      text: '个人笔记',
      icon: <IconFolder />,
      items: [
        { itemKey: 'note1', text: '日常记录' },
        { itemKey: 'note2', text: '学习笔记' }
      ]
    },
    {
      itemKey: 'group2',
      text: '工作文档',
      icon: <IconFolder />,
      items: [
        { itemKey: 'doc1', text: '项目计划' },
        { itemKey: 'doc2', text: '会议纪要' }
      ]
    },
    {
      itemKey: 'group3',
      text: '收藏夹',
      icon: <IconFolder />,
      items: [
        { itemKey: 'fav1', text: '重要资料' },
        { itemKey: 'fav2', text: '参考链接' }
      ]
    }
  ])
  const navWidth = '180px' // 定义固定宽度常量

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
      isFolder
    })
  }

  // 隐藏右键菜单
  const hideContextMenu = (): void => {
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }

  // 删除项目
  const handleDelete = (): void => {
    const { itemKey } = contextMenu

    // 递归函数，用于从树形结构中删除项目
    const removeItem = (items: NavItem[]): NavItem[] => {
      return items.filter((item) => {
        if (item.itemKey === itemKey) {
          return false
        }

        if (item.items) {
          item.items = removeItem(item.items)
        }

        return true
      })
    }

    setNavItems(removeItem([...navItems]))
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

  // 处理点击事件
  const handleTreeSelect = (selectedKey: string): void => {
    console.log('Selected item:', selectedKey)
    // 可以在这里添加选中项的处理逻辑
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
        >
          {/* 搜索框 */}
          <div style={{ padding: '8px', borderBottom: '1px solid var(--semi-color-border)' }}>
            <Input
              prefix={<IconSearch />}
              placeholder="搜索笔记..."
              value={searchValue}
              onChange={(value) => setSearchValue(value)}
              style={{ width: '100%' }}
            />
          </div>

          <div
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
              directory
              defaultExpandAll={false}
              blockNode
              onSelect={(selectedKeys): void => {
                if (selectedKeys.length > 0) {
                  handleTreeSelect(selectedKeys[0] as string)
                }
              }}
              onContextMenu={(e, node): void => {
                // node包含了被右键点击的节点信息
                const isFolder = Boolean(node.children && node.children.length > 0)
                // 先转换成unknown再转成React.MouseEvent类型
                const mouseEvent = e.nativeEvent as unknown as React.MouseEvent
                handleContextMenu(mouseEvent, node.key as string, isFolder)
              }}
            />
          </div>

          {/* 右键菜单 - 使用绝对定位 */}
          {contextMenu.visible && (
            <div
              style={{
                position: 'fixed',
                top: contextMenu.y,
                left: contextMenu.x,
                zIndex: 1000,
                background: 'var(--semi-color-bg-2)',
                boxShadow: 'var(--semi-shadow-elevated)',
                borderRadius: '4px',
                padding: '4px 0'
              }}
            >
              <div
                style={{
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  color: 'var(--semi-color-danger)',
                  transition: 'background 0.3s'
                }}
                className="context-menu-item"
                onClick={(): void => {
                  handleDelete()
                }}
              >
                <IconDelete style={{ marginRight: '8px' }} />
                <Typography.Text>删除{contextMenu.isFolder ? '文件夹' : '文档'}</Typography.Text>
              </div>
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
  )
}

export default Navigation
