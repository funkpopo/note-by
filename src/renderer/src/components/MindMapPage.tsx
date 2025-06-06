import React, { useCallback, useRef, useState, useEffect } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  ReactFlowProvider,
  useReactFlow,
  BackgroundVariant,
  Panel,
  useKeyPress,
  MarkerType
} from '@xyflow/react'
import { Button, Space, Toast, Input, Modal, Typography, Select, Slider } from '@douyinfe/semi-ui'
import {
  IconPlus,
  IconSave,
  IconUpload,
  IconDownload,
  IconUndo,
  IconRedo,
  IconEdit,
  IconDelete,
  IconArrowRight
} from '@douyinfe/semi-icons'
import '@xyflow/react/dist/style.css'
import { toPng } from 'html-to-image'

// 添加右键菜单样式
const contextMenuStyles = `
  .context-menu-item:hover {
    background: var(--semi-color-fill-0) !important;
  }
  
  .context-menu-item.context-menu-item-danger:hover {
    background: var(--semi-color-danger-light-default) !important;
  }
`

// 注入样式
if (typeof document !== 'undefined' && !document.getElementById('mindmap-context-menu-styles')) {
  const style = document.createElement('style')
  style.id = 'mindmap-context-menu-styles'
  style.textContent = contextMenuStyles
  document.head.appendChild(style)
}

const { Title } = Typography
const { Option } = Select

// 节点样式预设
const nodeStyles = {
  default: {
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: '6px',
    padding: '8px',
    fontSize: '14px'
  },
  primary: {
    background: '#1890ff',
    color: '#fff',
    border: '2px solid #1890ff',
    borderRadius: '8px',
    padding: '10px',
    fontSize: '16px',
    fontWeight: 'bold'
  },
  success: {
    background: '#52c41a',
    color: '#fff',
    border: '2px solid #52c41a',
    borderRadius: '8px',
    padding: '8px',
    fontSize: '14px'
  },
  warning: {
    background: '#faad14',
    color: '#fff',
    border: '2px solid #faad14',
    borderRadius: '8px',
    padding: '8px',
    fontSize: '14px'
  },
  danger: {
    background: '#ff4d4f',
    color: '#fff',
    border: '2px solid #ff4d4f',
    borderRadius: '8px',
    padding: '8px',
    fontSize: '14px'
  }
} as const

// 初始节点数据
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'default',
    position: { x: 400, y: 200 },
    data: {
      label: '中心主题',
      nodeType: 'primary'
    },
    style: nodeStyles.primary
  }
]

const initialEdges: Edge[] = []

// 思维导图内容组件
const MindMapFlow: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [nodeId, setNodeId] = useState(2)
  const [isLoading, setIsLoading] = useState(false)
  const [editingNode, setEditingNode] = useState<{
    id: string
    label: string
    nodeType: string
    fontSize?: number
  } | null>(null)
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean
    x: number
    y: number
    type: 'node' | 'edge' | 'pane'
    nodeId?: string
    edgeId?: string
  }>({
    visible: false,
    x: 0,
    y: 0,
    type: 'pane'
  })
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { getViewport, setViewport, getNodes, getEdges, deleteElements, screenToFlowPosition } =
    useReactFlow()

  // 键盘快捷键
  const deletePressed = useKeyPress('Delete')
  const ctrlSPressed = useKeyPress(['Meta+s', 'Control+s'])
  const ctrlOPressed = useKeyPress(['Meta+o', 'Control+o'])
  const ctrlNPressed = useKeyPress(['Meta+n', 'Control+n'])
  const ctrlZPressed = useKeyPress(['Meta+z', 'Control+z'])
  const ctrlYPressed = useKeyPress(['Meta+y', 'Control+y'])

  // 保存历史状态
  const saveToHistory = useCallback(() => {
    const currentState = { nodes: getNodes(), edges: getEdges() }
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(currentState)
      return newHistory.slice(-20) // 保留最近20个状态
    })
    setHistoryIndex((prev) => Math.min(prev + 1, 19))
  }, [getNodes, getEdges, historyIndex])

  // 撤销
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1]
      setNodes(prevState.nodes)
      setEdges(prevState.edges)
      setHistoryIndex((prev) => prev - 1)
      Toast.success('已撤销')
    }
  }, [history, historyIndex, setNodes, setEdges])

  // 隐藏右键菜单
  const hideContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }, [])

  // 计算菜单位置
  const calculateMenuPosition = useCallback((x: number, y: number) => {
    const menuWidth = 200
    const menuHeight = 150
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let menuX = x
    let menuY = y

    if (x + menuWidth > viewportWidth) {
      menuX = x - menuWidth
    }
    if (y + menuHeight > viewportHeight) {
      menuY = y - menuHeight
    }

    return { x: Math.max(0, menuX), y: Math.max(0, menuY) }
  }, [])

  // 重做
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      setNodes(nextState.nodes)
      setEdges(nextState.edges)
      setHistoryIndex((prev) => prev + 1)
      Toast.success('已重做')
    }
  }, [history, historyIndex, setNodes, setEdges])

  // 连接节点
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds))
      saveToHistory()
    },
    [setEdges, saveToHistory]
  )

  // 添加新节点
  const addNode = useCallback(() => {
    const newNode: Node = {
      id: nodeId.toString(),
      type: 'default',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {
        label: `新节点 ${nodeId}`,
        nodeType: 'default'
      },
      style: nodeStyles.default
    }
    setNodes((nds) => nds.concat(newNode))
    setNodeId((id) => id + 1)
    saveToHistory()
    Toast.success('节点添加成功')
  }, [nodeId, setNodes, saveToHistory])

  // 在连接线拖拽结束时添加节点
  const handleConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, connectionState: any) => {
      if (!connectionState.isValid && connectionState.fromNode) {
        const targetIsPane = (event.target as HTMLElement).classList.contains('react-flow__pane')
        if (targetIsPane) {
          const newNodeIdStr = nodeId.toString()
          const { clientX, clientY } = 'changedTouches' in event ? event.changedTouches[0] : event

          const position = screenToFlowPosition({
            x: clientX,
            y: clientY
          })

          const newNode: Node = {
            id: newNodeIdStr,
            type: 'default',
            position,
            data: {
              label: `新节点 ${newNodeIdStr}`,
              nodeType: 'default'
            },
            style: nodeStyles.default,
            origin: [0.5, 0.0]
          }

          const newEdge: Edge = {
            id: `e${connectionState.fromNode.id}-${newNodeIdStr}`,
            source: connectionState.fromNode.id,
            target: newNodeIdStr
          }

          setNodes((nds) => nds.concat(newNode))
          setEdges((eds) => eds.concat(newEdge))
          setNodeId((id) => id + 1)
          saveToHistory()
          Toast.success('通过拖拽添加节点成功')
        }
      }
    },
    [screenToFlowPosition, nodeId, setNodes, setEdges, setNodeId, saveToHistory]
  )

  // 删除选中的节点和边
  const deleteSelected = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected)
    const selectedEdges = edges.filter((edge) => edge.selected)

    // 只有真正有选中元素时才执行删除操作
    if (selectedNodes.length > 0 || selectedEdges.length > 0) {
      deleteElements({ nodes: selectedNodes, edges: selectedEdges })
      saveToHistory()
      Toast.success(`已删除 ${selectedNodes.length} 个节点和 ${selectedEdges.length} 条连线`)
    }
  }, [nodes, edges, deleteElements, saveToHistory])

  // 节点双击编辑
  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    let nodeTypeToEdit = (node.data.nodeType as string) || 'default'
    if (nodeTypeToEdit === 'custom') {
      nodeTypeToEdit = 'default'
    }
    setEditingNode({
      id: node.id,
      label: String(node.data.label),
      nodeType: nodeTypeToEdit,
      fontSize: (node.data.fontSize as number) || 14
    })
  }, [])

  // 节点右键菜单
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault()
      const { x, y } = calculateMenuPosition(event.clientX, event.clientY)
      setContextMenu({
        visible: true,
        x,
        y,
        type: 'node',
        nodeId: node.id
      })
    },
    [calculateMenuPosition]
  )

  // 边右键菜单
  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault()
      const { x, y } = calculateMenuPosition(event.clientX, event.clientY)
      setContextMenu({
        visible: true,
        x,
        y,
        type: 'edge',
        edgeId: edge.id
      })
    },
    [calculateMenuPosition]
  )

  // 空白区域右键菜单
  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault()
      const { x, y } = calculateMenuPosition(event.clientX, event.clientY)
      setContextMenu({
        visible: true,
        x,
        y,
        type: 'pane'
      })
    },
    [calculateMenuPosition]
  )

  // 保存节点编辑
  const saveNodeEdit = useCallback(() => {
    if (!editingNode) return

    const effectiveNodeType = (
      editingNode.nodeType === 'custom' ? 'default' : editingNode.nodeType
    ) as keyof typeof nodeStyles
    const style = {
      ...nodeStyles[effectiveNodeType],
      fontSize: `${editingNode.fontSize}px`
    }

    setNodes((nds) =>
      nds.map((node) =>
        node.id === editingNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                label: editingNode.label,
                nodeType: effectiveNodeType,
                fontSize: editingNode.fontSize
              },
              style
            }
          : node
      )
    )
    setEditingNode(null)
    saveToHistory()
    Toast.success('节点内容已更新')
  }, [editingNode, setNodes, saveToHistory])

  // 右键菜单功能 - 编辑节点
  const handleEditNode = useCallback(() => {
    if (contextMenu.nodeId) {
      const node = nodes.find((n) => n.id === contextMenu.nodeId)
      if (node) {
        let nodeTypeToEdit = (node.data.nodeType as string) || 'default'
        if (nodeTypeToEdit === 'custom') {
          nodeTypeToEdit = 'default'
        }
        setEditingNode({
          id: node.id,
          label: String(node.data.label),
          nodeType: nodeTypeToEdit,
          fontSize: (node.data.fontSize as number) || 14
        })
      }
    }
    hideContextMenu()
  }, [contextMenu.nodeId, nodes, hideContextMenu])

  // 右键菜单功能 - 删除节点
  const handleDeleteNode = useCallback(() => {
    if (contextMenu.nodeId) {
      const nodeToDelete = nodes.find((n) => n.id === contextMenu.nodeId)
      const edgesToDelete = edges.filter(
        (e) => e.source === contextMenu.nodeId || e.target === contextMenu.nodeId
      )

      if (nodeToDelete) {
        deleteElements({ nodes: [nodeToDelete], edges: edgesToDelete })
        saveToHistory()
        Toast.success(`已删除节点和 ${edgesToDelete.length} 条连线`)
      }
    }
    hideContextMenu()
  }, [contextMenu.nodeId, nodes, edges, deleteElements, saveToHistory, hideContextMenu])

  // 右键菜单功能 - 添加节点（空白区域）
  const handleAddNodeAtPosition = useCallback(() => {
    if (reactFlowWrapper.current) {
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
      const position = screenToFlowPosition({
        x: contextMenu.x - reactFlowBounds.left,
        y: contextMenu.y - reactFlowBounds.top
      })

      const newNode: Node = {
        id: nodeId.toString(),
        type: 'default',
        position,
        data: {
          label: `新节点 ${nodeId}`,
          nodeType: 'default'
        },
        style: nodeStyles.default
      }
      setNodes((nds) => nds.concat(newNode))
      setNodeId((id) => id + 1)
      saveToHistory()
      Toast.success('节点添加成功')
    }
    hideContextMenu()
  }, [
    contextMenu.x,
    contextMenu.y,
    nodeId,
    setNodes,
    setNodeId,
    saveToHistory,
    hideContextMenu,
    screenToFlowPosition
  ])

  // 右键菜单功能 - 添加箭头标记
  const handleAddEdgeMarker = useCallback(
    (markerType: 'arrow' | 'arrowclosed') => {
      if (contextMenu.edgeId) {
        setEdges((eds) =>
          eds.map((edge) =>
            edge.id === contextMenu.edgeId
              ? {
                  ...edge,
                  markerEnd: {
                    type: markerType === 'arrow' ? MarkerType.Arrow : MarkerType.ArrowClosed,
                    color: '#666'
                  }
                }
              : edge
          )
        )
        saveToHistory()
        Toast.success('已添加箭头标记')
      }
      hideContextMenu()
    },
    [contextMenu.edgeId, setEdges, saveToHistory, hideContextMenu]
  )

  // 右键菜单功能 - 删除边
  const handleDeleteEdge = useCallback(() => {
    if (contextMenu.edgeId) {
      const edgeToDelete = edges.find((e) => e.id === contextMenu.edgeId)
      if (edgeToDelete) {
        deleteElements({ nodes: [], edges: [edgeToDelete] })
        saveToHistory()
        Toast.success('已删除连线')
      }
    }
    hideContextMenu()
  }, [contextMenu.edgeId, edges, deleteElements, saveToHistory, hideContextMenu])

  // MiniMap节点颜色映射
  const nodeColor = useCallback((node: Node): string => {
    const nodeType = (node.data.nodeType as string) || 'default'

    switch (nodeType) {
      case 'primary':
        return '#1890ff'
      case 'success':
        return '#52c41a'
      case 'warning':
        return '#faad14'
      case 'danger':
        return '#ff4d4f'
      default:
        return '#ddd'
    }
  }, [])

  // 保存思维导图
  const saveMindMap = useCallback(async () => {
    try {
      setIsLoading(true)
      const flowData = {
        nodes: getNodes(),
        edges: getEdges(),
        viewport: getViewport()
      }

      if (flowData.nodes.length === 0) {
        Toast.warning('思维导图为空，无法保存')
        return
      }

      // 调用主进程保存文件
      const result = await window.api.mindmap.save(JSON.stringify(flowData, null, 2))
      if (result.success) {
        Toast.success(`思维导图保存成功: ${result.path}`)
      } else {
        Toast.error(`保存失败: ${result.error}`)
      }
    } catch (error) {
      Toast.error('保存失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }, [getNodes, getEdges, getViewport])

  // 加载思维导图
  const loadMindMap = useCallback(async () => {
    try {
      setIsLoading(true)
      const result = await window.api.mindmap.load()
      if (result.success && result.data) {
        try {
          const flowData = JSON.parse(result.data)
          if (flowData.nodes && Array.isArray(flowData.nodes)) {
            setNodes(flowData.nodes)
            setEdges(flowData.edges || [])
            if (flowData.viewport) {
              setViewport(flowData.viewport)
            }
            // 更新节点ID计数器
            const maxId = Math.max(...flowData.nodes.map((n: Node) => parseInt(n.id) || 0))
            setNodeId(maxId + 1)
            // 清空历史记录并保存当前状态
            setHistory([{ nodes: flowData.nodes, edges: flowData.edges || [] }])
            setHistoryIndex(0)
            Toast.success('思维导图加载成功')
          } else {
            Toast.error('文件格式不正确')
          }
        } catch (parseError) {
          Toast.error('文件内容解析失败，请检查文件格式')
        }
      } else if (result.cancelled) {
        // 用户取消了文件选择
      } else {
        Toast.error(`加载失败: ${result.error}`)
      }
    } catch (error) {
      Toast.error('加载失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }, [setNodes, setEdges, setViewport])

  // 导出为HTML
  const exportToHTML = useCallback(async () => {
    try {
      setIsLoading(true)
      if (reactFlowWrapper.current) {
        if (nodes.length === 0) {
          Toast.warning('思维导图为空，无法导出')
          return
        }

        // 生成图片
        const dataUrl = await toPng(reactFlowWrapper.current, {
          backgroundColor: '#ffffff',
          width: reactFlowWrapper.current.offsetWidth,
          height: reactFlowWrapper.current.offsetHeight,
          quality: 1.0
        })

        // 调用主进程导出HTML
        const result = await window.api.mindmap.exportHtml(dataUrl)
        if (result.success) {
          Toast.success(`HTML导出成功: ${result.path}`)
        } else {
          Toast.error(`导出失败: ${result.error}`)
        }
      }
    } catch (error) {
      Toast.error('导出失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }, [nodes])

  // 键盘快捷键处理
  useEffect(() => {
    if (deletePressed) {
      deleteSelected()
    }
  }, [deletePressed, deleteSelected])

  useEffect(() => {
    if (ctrlSPressed) {
      saveMindMap()
    }
  }, [ctrlSPressed, saveMindMap])

  useEffect(() => {
    if (ctrlOPressed) {
      loadMindMap()
    }
  }, [ctrlOPressed, loadMindMap])

  useEffect(() => {
    if (ctrlNPressed) {
      addNode()
    }
  }, [ctrlNPressed, addNode])

  useEffect(() => {
    if (ctrlZPressed) {
      undo()
    }
  }, [ctrlZPressed, undo])

  useEffect(() => {
    if (ctrlYPressed) {
      redo()
    }
  }, [ctrlYPressed, redo])

  // 点击空白处隐藏右键菜单
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        hideContextMenu()
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenu.visible, hideContextMenu])

  // 初始化历史记录
  useEffect(() => {
    if (history.length === 0) {
      setHistory([{ nodes: initialNodes, edges: initialEdges }])
      setHistoryIndex(0)
    }
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectEnd={handleConnectEnd}
          onNodeDoubleClick={onNodeDoubleClick}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          fitView
          multiSelectionKeyCode="Shift"
          deleteKeyCode="Delete"
          proOptions={{ hideAttribution: true }}
        >
          <Controls />
          <MiniMap
            nodeColor={nodeColor}
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />

          {/* 工具栏 */}
          <Panel position="top-left">
            <Space>
              <Button icon={<IconPlus />} onClick={addNode} type="primary" size="small">
                添加节点
              </Button>
              <Button icon={<IconUndo />} onClick={undo} size="small" disabled={historyIndex <= 0}>
                撤销
              </Button>
              <Button
                icon={<IconRedo />}
                onClick={redo}
                size="small"
                disabled={historyIndex >= history.length - 1}
              >
                重做
              </Button>
              <Button icon={<IconSave />} onClick={saveMindMap} loading={isLoading} size="small">
                保存
              </Button>
              <Button icon={<IconUpload />} onClick={loadMindMap} loading={isLoading} size="small">
                加载
              </Button>
              <Button
                icon={<IconDownload />}
                onClick={exportToHTML}
                loading={isLoading}
                size="small"
              >
                导出HTML
              </Button>
            </Space>
          </Panel>
        </ReactFlow>
      </div>

      {/* 右键菜单 */}
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
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'node' && (
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
                onClick={handleEditNode}
              >
                <IconEdit style={{ marginRight: '8px', color: 'var(--semi-color-primary)' }} />
                <Typography.Text>编辑节点</Typography.Text>
              </div>
              <div
                style={{
                  height: '1px',
                  background: 'var(--semi-color-border)',
                  margin: '4px 0'
                }}
              />
              <div
                className="context-menu-item context-menu-item-danger"
                style={{
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.3s'
                }}
                onClick={handleDeleteNode}
              >
                <IconDelete style={{ marginRight: '8px', color: 'var(--semi-color-danger)' }} />
                <Typography.Text style={{ color: 'var(--semi-color-danger)' }}>
                  删除节点
                </Typography.Text>
              </div>
            </>
          )}

          {contextMenu.type === 'edge' && (
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
                onClick={() => handleAddEdgeMarker('arrow')}
              >
                <IconArrowRight
                  style={{ marginRight: '8px', color: 'var(--semi-color-primary)' }}
                />
                <Typography.Text>添加开放箭头</Typography.Text>
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
                onClick={() => handleAddEdgeMarker('arrowclosed')}
              >
                <IconArrowRight style={{ marginRight: '8px', color: 'var(--semi-color-info)' }} />
                <Typography.Text>添加封闭箭头</Typography.Text>
              </div>
              <div
                style={{
                  height: '1px',
                  background: 'var(--semi-color-border)',
                  margin: '4px 0'
                }}
              />
              <div
                className="context-menu-item context-menu-item-danger"
                style={{
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.3s'
                }}
                onClick={handleDeleteEdge}
              >
                <IconDelete style={{ marginRight: '8px', color: 'var(--semi-color-danger)' }} />
                <Typography.Text style={{ color: 'var(--semi-color-danger)' }}>
                  删除连线
                </Typography.Text>
              </div>
            </>
          )}

          {contextMenu.type === 'pane' && (
            <div
              className="context-menu-item"
              style={{
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'background 0.3s'
              }}
              onClick={handleAddNodeAtPosition}
            >
              <IconPlus style={{ marginRight: '8px', color: 'var(--semi-color-primary)' }} />
              <Typography.Text>新增节点</Typography.Text>
            </div>
          )}
        </div>
      )}

      {/* 增强的节点编辑对话框 */}
      <Modal
        title="编辑节点"
        visible={!!editingNode}
        onOk={saveNodeEdit}
        onCancel={() => setEditingNode(null)}
        okText="保存"
        cancelText="取消"
        width={500}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              节点内容
            </label>
            <Input
              value={editingNode?.label || ''}
              onChange={(value) =>
                setEditingNode((prev) => (prev ? { ...prev, label: value } : null))
              }
              placeholder="请输入节点内容"
              autoFocus
              onEnterPress={saveNodeEdit}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              节点样式
            </label>
            <Select
              value={editingNode?.nodeType || 'default'}
              onChange={(value) =>
                setEditingNode((prev) => (prev ? { ...prev, nodeType: value as string } : null))
              }
              style={{ width: '100%' }}
            >
              <Option value="default">默认</Option>
              <Option value="primary">主要</Option>
              <Option value="success">成功</Option>
              <Option value="warning">警告</Option>
              <Option value="danger">危险</Option>
            </Select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              字体大小: {editingNode?.fontSize || 14}px
            </label>
            <Slider
              value={editingNode?.fontSize || 14}
              onChange={(value) =>
                setEditingNode((prev) => (prev ? { ...prev, fontSize: value as number } : null))
              }
              min={10}
              max={24}
              step={1}
              tooltipVisible={false}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

// 主组件
const MindMapPage: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 0', borderBottom: '1px solid #e8e8e8' }}>
        <Title heading={3} style={{ margin: 0 }}>
          思维导图
        </Title>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
          双击节点编辑内容 | 拖拽连接节点 | 支持多选和快捷键操作
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ReactFlowProvider>
          <MindMapFlow />
        </ReactFlowProvider>
      </div>
    </div>
  )
}

export default MindMapPage
