import { create } from 'zustand';
import { Node, Edge, Connection, addEdge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from 'reactflow';

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
      edges: addEdge(connection, state.edges),
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
