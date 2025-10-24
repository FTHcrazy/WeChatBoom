import { useCallback, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  Position,
  ConnectionMode

} from '@xyflow/react';
import type { Connection, Edge, Node } from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import './App.css';

type MindMapNodeData = {
  label: string;
  parentId?: string;
};

const initialNodes: Node<MindMapNodeData>[] = [
  {
    id: 'horizontal-1',
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    type: 'input',
    data: { label: 'Input' },
    position: { x: 0, y: 80 },
  },
  {
    id: 'horizontal-2',
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: { label: 'A Node' },
    position: { x: 250, y: 0 },
  },
  {
    id: 'horizontal-3',
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: { label: 'Node 3' },
    position: { x: 250, y: 160 },
  },
  {
    id: 'horizontal-4',
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: { label: 'Node 4' },
    position: { x: 500, y: 0 },
  },
  {
    id: 'horizontal-5',
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: { label: 'Node 5' },
    position: { x: 500, y: 100 },
  },
  {
    id: 'horizontal-6',
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: { label: 'Node 6' },
    position: { x: 500, y: 230 },
  },
  {
    id: 'horizontal-7',
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: { label: 'Node 7' },
    position: { x: 750, y: 50 },
  },
  {
    id: 'horizontal-8',
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: { label: 'Node 8' },
    position: { x: 750, y: 300 },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'horizontal-e1-2',
    source: 'horizontal-1',
    type: 'smoothstep',
    target: 'horizontal-2',
    animated: true,
  },
  {
    id: 'horizontal-e1-3',
    source: 'horizontal-1',
    type: 'smoothstep',
    target: 'horizontal-3',
    animated: true,
  },
  {
    id: 'horizontal-e1-4',
    source: 'horizontal-2',
    type: 'smoothstep',
    target: 'horizontal-4',
    label: 'edge label',
  },
  {
    id: 'horizontal-e3-5',
    source: 'horizontal-3',
    type: 'smoothstep',
    target: 'horizontal-5',
    animated: true,
  },
  {
    id: 'horizontal-e3-6',
    source: 'horizontal-3',
    type: 'smoothstep',
    target: 'horizontal-6',
    animated: true,
  },
  {
    id: 'horizontal-e5-7',
    source: 'horizontal-5',
    type: 'smoothstep',
    target: 'horizontal-7',
    animated: true,
  },
  {
    id: 'horizontal-e6-8',
    source: 'horizontal-6',
    type: 'smoothstep',
    target: 'horizontal-8',
    animated: true,
  },
];

// const initialNodes: Node<MindMapNodeData>[] = [
//   {
//     id: 'root',
//     position: { x: 0, y: 0 },
//     data: { label: '主题', parentId: undefined },
//     style: { width: 160 }
//   },
//   {
//     id: 'idea-1',
//     position: { x: 220, y: -120 },
//     data: { label: '分支 1', parentId: 'root' }
//   },
//   {
//     id: 'idea-2',
//     position: { x: 220, y: 40 },
//     data: { label: '分支 2', parentId: 'root' }
//   }
// ];

// const initialEdges: Edge[] = [
//   { id: 'root-idea-1', source: 'root', target: 'idea-1', animated: true },
//   { id: 'root-idea-2', source: 'root', target: 'idea-2', animated: true }
// ];

const nodeSpacing = { x: 220, y: 140 };

const App = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<MindMapNodeData>>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('root');
  const [title, setTitle] = useState('我的思维导图');

  const selectedNode = useMemo(() => nodes.find((node: Node<MindMapNodeData>) => node.id === selectedNodeId), [nodes, selectedNodeId]);

  const handleConnect = useCallback((params: Connection) => {
    setEdges((eds: Edge[]) => {
      const exists = eds.some((edge) => edge.source === params.source && edge.target === params.target);
      if (exists || !params.source || !params.target) {
        return eds;
      }

      return addEdge({ ...params, animated: true, type: 'smoothstep' }, eds);
    });
  }, [setEdges]);

  const handleNodeClick = useCallback((_: unknown, node: Node<MindMapNodeData>) => {
    setSelectedNodeId(node.id);
  }, []);

  const handleAddChild = useCallback(() => {
    if (!selectedNode) {
      return;
    }

    const newId = `node-${Date.now().toString(36)}`;
    const siblings = nodes.filter((node: Node<MindMapNodeData>) => node.data.parentId === selectedNode.id);
    const newPosition = {
      x: selectedNode.position.x + nodeSpacing.x,
      y: selectedNode.position.y + (siblings.length - 0.5) * nodeSpacing.y
    };

    const newNode: Node<MindMapNodeData> = {
      id: newId,
      position: newPosition,
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      data: { label: `${selectedNode.data.label} - 子节点 ${siblings.length + 1}`, parentId: selectedNode.id }
    };

    setNodes((nds: Node<MindMapNodeData>[]) => [...nds, newNode]);
    setEdges((eds: Edge[]) => [
      ...eds,
      {
        id: `${selectedNode.id}-${newId}`,
        source: selectedNode.id,
        target: newId,
        type: 'smoothstep',
        animated: true
      }
    ]);
    setSelectedNodeId(newId);
  }, [selectedNode, nodes, setNodes, setEdges]);

  const handleDeleteNode = useCallback(() => {
    if (!selectedNode || selectedNode.id === 'root') {
      return;
    }

    setNodes((nds: Node<MindMapNodeData>[]) => nds.filter((node) => node.id !== selectedNode.id));
    setEdges((eds: Edge[]) => eds.filter((edge: Edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
    setSelectedNodeId(selectedNode.data.parentId ?? 'root');
  }, [selectedNode, setEdges, setNodes]);

  const handleLabelChange = useCallback((value: string) => {
    setNodes((nds: Node<MindMapNodeData>[]) => nds.map((node) => (node.id === selectedNodeId ? { ...node, data: { ...node.data, label: value } } : node)));
  }, [selectedNodeId, setNodes]);

  const canDelete = selectedNode && selectedNode.id !== 'root';

  return (
    <ReactFlowProvider>
      <div className="xmind-app">
        <aside className="xmind-sidebar">
          <div className="xmind-title">
            <label htmlFor="mindmap-title">思维导图标题</label>
            <input
              id="mindmap-title"
              className="xmind-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="xmind-panel">
            <h2>节点属性</h2>
            <label htmlFor="node-label" className="xmind-field-label">节点内容</label>
            <textarea
              id="node-label"
              className="xmind-textarea"
              value={selectedNode?.data.label ?? ''}
              onChange={(event) => handleLabelChange(event.target.value)}
              placeholder="输入节点内容"
              rows={3}
            />

            <div className="xmind-actions">
              <button type="button" className="xmind-button" onClick={handleAddChild} disabled={!selectedNode}>
                添加子节点
              </button>
              <button type="button" className="xmind-button danger" onClick={handleDeleteNode} disabled={!canDelete}>
                删除节点
              </button>
            </div>
          </div>

          <div className="xmind-hint">
            <p>提示：</p>
            <ul>
              <li>点击画布中的节点即可编辑内容。</li>
              <li>使用鼠标滚轮缩放，拖拽空白区域移动视图。</li>
              <li>支持通过 Control 面板快速定位与缩放。</li>
            </ul>
          </div>
        </aside>

        <main className="xmind-canvas">
          <header className="xmind-header">{title}</header>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onNodeClick={handleNodeClick}
            fitView
            fitViewOptions={{ padding: 0.2, minZoom: 0.2, maxZoom: 1.5 }}
            panOnScroll
            attributionPosition="bottom-left"
            selectionOnDrag
            connectionMode={ConnectionMode.Loose}
            connectOnClick
            defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
          >
            <Background color="#eaeaea" gap={24} />
            <MiniMap pannable zoomable />
            <Controls position="bottom-right" />
          </ReactFlow>
        </main>
      </div>
    </ReactFlowProvider>
  );
};

export default App;
