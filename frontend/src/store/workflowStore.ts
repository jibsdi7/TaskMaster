import { create } from 'zustand';
import { Node, Edge, Connection, addEdge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from 'reactflow';
import { NODE_COLORS } from '../components/workflow/nodeTemplates';

interface WorkflowState {
  // Workflow metadata
  workflowId: string | null;
  workflowName: string;
  workflowDescription: string;
  
  // Canvas state
  nodes: Node[];
  edges: Edge[];
  
  // UI state
  selectedNodeId: string | null;
  status: 'idle' | 'recording' | 'running';
  isRecording: boolean;
  
  // History for undo/redo
  history: { nodes: Node[]; edges: Edge[] }[];
  historyIndex: number;
  
  // Actions
  setWorkflowId: (id: string | null) => void;
  setWorkflowName: (name: string) => void;
  setWorkflowDescription: (description: string) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: Node) => void;
  deleteNode: (nodeId: string) => void;
  updateNode: (nodeId: string, data: any) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  setStatus: (status: 'idle' | 'recording' | 'running') => void;
  setIsRecording: (isRecording: boolean) => void;
  
  // History actions
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Inline insert
  insertNodeOnEdge: (edgeId: string, nodeType: string, label: string, blockId?: number) => void;

  // Selection-to-block
  replaceSelectionWithBlock: (
    selectedNodeIds: string[],
    blockId: number,
    blockName: string
  ) => { snapshot: { nodes: Node[]; edges: Edge[] }; blockNodeId: string } | null;

  // Workflow actions
  clearWorkflow: () => void;
  loadWorkflow: (workflow: { id: string; name: string; description: string; nodes: Node[]; edges: Edge[] }) => void;
  autoLayout: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  // Initial state
  workflowId: null,
  workflowName: 'Untitled Workflow',
  workflowDescription: '',
  nodes: [],
  edges: [],
  selectedNodeId: null,
  status: 'idle',
  isRecording: false,
  history: [],
  historyIndex: -1,

  // Setters
  setWorkflowId: (id) => set({ workflowId: id }),
  setWorkflowName: (name) => set({ workflowName: name }),
  setWorkflowDescription: (description) => set({ workflowDescription: description }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  
  // React Flow handlers
  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    }));
  },
  
  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }));
  },
  
  onConnect: (connection) => {
    set((state) => ({
      edges: addEdge(
        { ...connection, type: 'addable', animated: true, style: { stroke: '#1976d2', strokeWidth: 2 } },
        state.edges
      ),
    }));
    get().saveToHistory();
  },
  
  // Node operations
  addNode: (node) => {
    set((state) => ({
      nodes: [...state.nodes, node],
    }));
    get().saveToHistory();
  },
  
  deleteNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
    }));
    get().saveToHistory();
  },
  
  updateNode: (nodeId, data) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      ),
    }));
  },
  
  setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),
  setStatus: (status) => set({ status }),
  setIsRecording: (isRecording) => set({ isRecording }),
  
  // History management
  saveToHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes: [...nodes], edges: [...edges] });
    
    // Limit history to 50 entries
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },
  
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      set({
        nodes: prevState.nodes,
        edges: prevState.edges,
        historyIndex: historyIndex - 1,
      });
    }
  },
  
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      set({
        nodes: nextState.nodes,
        edges: nextState.edges,
        historyIndex: historyIndex + 1,
      });
    }
  },
  
  canUndo: () => {
    const { historyIndex } = get();
    return historyIndex > 0;
  },
  
  canRedo: () => {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
  },
  
  // Workflow operations
  clearWorkflow: () => {
    set({
      workflowId: null,
      workflowName: 'Untitled Workflow',
      workflowDescription: '',
      nodes: [],
      edges: [],
      selectedNodeId: null,
      history: [],
      historyIndex: -1,
    });
  },
  
  loadWorkflow: (workflow) => {
    set({
      workflowId: workflow.id,
      workflowName: workflow.name,
      workflowDescription: workflow.description,
      nodes: workflow.nodes,
      edges: workflow.edges,
      selectedNodeId: null,
      history: [{ nodes: workflow.nodes, edges: workflow.edges }],
      historyIndex: 0,
    });
  },
  
  insertNodeOnEdge: (edgeId, nodeType, label, blockId) => {
    const { nodes, edges } = get();
    const edge = edges.find((e) => e.id === edgeId);
    if (!edge) return;

    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);
    if (!sourceNode || !targetNode) return;

    // Place new node at the geometric midpoint between source and target
    const newPosition = {
      x: (sourceNode.position.x + targetNode.position.x) / 2,
      y: (sourceNode.position.y + targetNode.position.y) / 2,
    };

    const newId = `node_${Date.now()}`;
    const color = NODE_COLORS[nodeType] || '#757575';

    const newNode: Node = {
      id: newId,
      type: 'custom',
      position: newPosition,
      data: {
        label,
        nodeType,
        config: blockId != null ? { block_id: blockId } : {},
        status: 'idle' as const,
        // onDelete / onSettings injected by WorkflowCanvas like all other nodes
      },
    };

    const edgeBase = {
      type: 'addable',
      animated: true,
      style: { stroke: color, strokeWidth: 2 },
    };

    const edgeToNew: Edge = {
      ...edgeBase,
      id: `e_${edge.source}_${newId}`,
      source: edge.source,
      target: newId,
      sourceHandle: edge.sourceHandle ?? undefined,
    };

    const edgeFromNew: Edge = {
      ...edgeBase,
      id: `e_${newId}_${edge.target}`,
      source: newId,
      target: edge.target,
      targetHandle: edge.targetHandle ?? undefined,
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
      edges: [
        ...state.edges.filter((e) => e.id !== edgeId),
        edgeToNew,
        edgeFromNew,
      ],
    }));
    get().saveToHistory();
  },

  replaceSelectionWithBlock: (selectedNodeIds, blockId, blockName) => {
    const { nodes, edges } = get();
    const selectedSet = new Set(selectedNodeIds);

    // Snapshot current state for potential dismantle
    const snapshot = { nodes: [...nodes], edges: [...edges] };

    const selectedNodes = nodes.filter((n) => selectedSet.has(n.id));
    if (selectedNodes.length === 0) return null;

    // Centroid of selected nodes
    const cx = selectedNodes.reduce((s, n) => s + n.position.x, 0) / selectedNodes.length;
    const cy = selectedNodes.reduce((s, n) => s + n.position.y, 0) / selectedNodes.length;

    const blockNodeId = `block_${blockId}_${Date.now()}`;

    const blockNode: Node = {
      id: blockNodeId,
      type: 'custom',
      position: { x: cx, y: cy },
      data: {
        label: blockName,
        nodeType: 'BLOCK',
        config: { block_id: blockId },
        status: 'idle' as const,
      },
    };

    // Edges that cross the selection boundary need to be re-wired to the BLOCK node
    const internalEdgeIds = new Set(
      edges
        .filter((e) => selectedSet.has(e.source) && selectedSet.has(e.target))
        .map((e) => e.id)
    );

    const rewiredEdges: Edge[] = edges
      .filter((e) => !internalEdgeIds.has(e.id))
      .map((e) => {
        const srcInside = selectedSet.has(e.source);
        const tgtInside = selectedSet.has(e.target);
        if (srcInside && !tgtInside) {
          return { ...e, id: `${e.id}_rw`, source: blockNodeId };
        }
        if (!srcInside && tgtInside) {
          return { ...e, id: `${e.id}_rw`, target: blockNodeId };
        }
        return e;
      });

    set({
      nodes: [...nodes.filter((n) => !selectedSet.has(n.id)), blockNode],
      edges: rewiredEdges,
    });
    get().saveToHistory();
    return { snapshot, blockNodeId };
  },

  autoLayout: () => {
    const { nodes } = get();
    const COLUMN_WIDTH = 300;
    const ROW_HEIGHT = 150;
    const NODES_PER_COLUMN = 8;
    
    const layoutedNodes = nodes.map((node, index) => {
      const column = Math.floor(index / NODES_PER_COLUMN);
      const row = index % NODES_PER_COLUMN;
      
      return {
        ...node,
        position: {
          x: column * COLUMN_WIDTH + 50,
          y: row * ROW_HEIGHT + 50,
        },
      };
    });
    
    set({ nodes: layoutedNodes });
    get().saveToHistory();
  },
}));

// Made with Bob
