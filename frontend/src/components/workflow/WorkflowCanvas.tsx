import { useCallback, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box } from '@mui/material';
import CustomNode from './CustomNode';
import { useWorkflowStore } from '../../store/workflowStore';

const nodeTypes = {
  custom: CustomNode,
};

const WorkflowCanvasInner = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    deleteNode,
    setSelectedNodeId,
    updateNode,
  } = useWorkflowStore();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const data = event.dataTransfer.getData('application/reactflow');
      if (!data) return;

      const { nodeType, label } = JSON.parse(data);
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: `node_${Date.now()}`,
        type: 'custom',
        position,
        data: {
          label,
          nodeType,
          config: {},
          status: 'idle' as const,
          onDelete: deleteNode,
          onSettings: (id: string) => setSelectedNodeId(id),
        },
      };

      addNode(newNode);
    },
    [screenToFlowPosition, addNode, deleteNode, setSelectedNodeId]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: any) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  // Update node data with callbacks
  const nodesWithCallbacks = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onDelete: deleteNode,
      onSettings: (id: string) => setSelectedNodeId(id),
    },
  }));

  return (
    <Box
      ref={reactFlowWrapper}
      sx={{
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1a1a',
      }}
    >
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#1976d2', strokeWidth: 2 },
        }}
      >
        <Background
          color="#333"
          gap={16}
          size={1}
          style={{ backgroundColor: '#1a1a1a' }}
        />
        <Controls
          style={{
            backgroundColor: '#2a2a2a',
            border: '1px solid #444',
            borderRadius: 8,
          }}
        />
        <MiniMap
          nodeColor={(node) => {
            const nodeColors: Record<string, string> = {
              CLICK: '#4CAF50',
              TYPE: '#2196F3',
              OPEN_URL: '#FF9800',
              DELAY: '#9C27B0',
              LOOP: '#F44336',
              IF_CONDITION: '#FFC107',
              VARIABLE: '#00BCD4',
              API_REQUEST: '#E91E63',
              BLOCK: '#607D8B',
            };
            return nodeColors[node.data?.nodeType] || '#757575';
          }}
          style={{
            backgroundColor: '#2a2a2a',
            border: '1px solid #444',
            borderRadius: 8,
          }}
          maskColor="rgba(0, 0, 0, 0.6)"
        />
        <Panel position="top-left">
          <Box
            sx={{
              backgroundColor: '#2a2a2a',
              border: '1px solid #444',
              borderRadius: 1,
              p: 1,
              color: 'white',
              fontSize: 12,
            }}
          >
            Nodes: {nodes.length} | Edges: {edges.length}
          </Box>
        </Panel>
      </ReactFlow>
    </Box>
  );
};

const WorkflowCanvas = () => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner />
    </ReactFlowProvider>
  );
};

export default WorkflowCanvas;

// Made with Bob
