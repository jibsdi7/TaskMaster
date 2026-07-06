import { useCallback, useRef, useEffect, useState } from 'react';
import { authHeaders, BASE_URL } from '../../api/client';
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
import AddNodeButton from './AddNodeButton';
import { useWorkflowStore } from '../../store/workflowStore';
import { NodeTemplate } from './nodeTemplates';

const nodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  addable: AddNodeButton,
};

const WorkflowCanvasInner = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();

  // Fetch live blocks so the insert popup can show them too
  const [blockNodes, setBlockNodes] = useState<NodeTemplate[]>([]);
  useEffect(() => {
    const fetchBlocks = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/blocks`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const blocks: { id: number; name: string; description: string }[] = await res.json();
          setBlockNodes(
            blocks.map((b) => ({
              type: 'BLOCK',
              label: b.name,
              icon: null, // icon resolved inside InsertNodePopup via nodeTemplates
              category: 'Reusable Blocks',
              description: b.description || 'Saved block',
              blockId: b.id,
            }))
          );
        }
      } catch {
        // silently ignore — blocks just won't appear in the insert popup
      }
    };
    fetchBlocks();
  }, []);

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    deleteNode,
    setSelectedNodeId,
    layoutVersion,
  } = useWorkflowStore();

  // Watch layoutVersion — when autoLayout fires, wait one frame for ReactFlow
  // to process the new positions, then fit the view with a smooth animation.
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    const timer = setTimeout(() => {
      fitView({ duration: 400, padding: 0.15 });
    }, 50);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutVersion]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const raw = event.dataTransfer.getData('application/reactflow');
      if (!raw) return;

      const { nodeType, label, blockId } = JSON.parse(raw);
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
          config: blockId != null ? { block_id: blockId } : {},
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

  // Inject callbacks into every node so CustomNode can call them
  const nodesWithCallbacks = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onDelete: deleteNode,
      onSettings: (id: string) => setSelectedNodeId(id),
    },
  }));

  // Force all edges to use the addable custom type and inject extraNodes for the insert popup
  const edgesWithData = edges.map((edge) => ({
    ...edge,
    type: 'addable',
    data: { ...(edge.data ?? {}), extraNodes: blockNodes },
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
        edges={edgesWithData}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: 'addable',
          animated: true,
          style: { stroke: '#1976d2', strokeWidth: 2 },
        }}
        deleteKeyCode="Delete"
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
