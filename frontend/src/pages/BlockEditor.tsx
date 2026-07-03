import { useEffect, useState, useCallback, useRef } from 'react';
import { authHeaders, BASE_URL } from '../api/client';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Background, Controls, MiniMap, ReactFlowProvider,
  useReactFlow, addEdge, applyNodeChanges, applyEdgeChanges,
  Node, Edge, Connection, NodeChange, EdgeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Box, Typography, Button, TextField, IconButton, Tooltip,
  CircularProgress, Alert, Chip, Select, MenuItem, InputLabel, FormControl, Divider,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import StopIcon from '@mui/icons-material/Stop';
import {
  Mouse as ClickIcon, Keyboard as TypeIcon, CheckBox as SelectIcon,
  TouchApp as HoverIcon, Upload as UploadIcon, ArrowForward as NavigateIcon,
  ArrowBack as BackIcon, Refresh as RefreshIcon, Schedule as DelayIcon,
  CallSplit as ConditionIcon, Loop as LoopIcon, Storage as VariableIcon,
  Api as ApiIcon, Delete as DeleteIcon,
} from '@mui/icons-material';
import { Handle, Position } from 'reactflow';
import { toast } from 'react-toastify';
import axios from 'axios';
import AddNodeButton from '../components/workflow/AddNodeButton';
import { NODE_COLORS } from '../components/workflow/nodeTemplates';

// ── Palette node templates ──────────────────────────────────────────────────
const PALETTE_NODES = [
  { type: 'CLICK',       label: 'Click',        icon: ClickIcon,    description: 'Click an element' },
  { type: 'TYPE',        label: 'Type',         icon: TypeIcon,     description: 'Type text into input' },
  { type: 'SELECT',      label: 'Select',       icon: SelectIcon,   description: 'Select dropdown option' },
  { type: 'HOVER',       label: 'Hover',        icon: HoverIcon,    description: 'Hover over element' },
  { type: 'UPLOAD_FILE', label: 'Upload File',  icon: UploadIcon,   description: 'Upload a file' },
  { type: 'OPEN_URL',    label: 'Open URL',     icon: NavigateIcon, description: 'Navigate to URL' },
  { type: 'BACK',        label: 'Back',         icon: BackIcon,     description: 'Go back' },
  { type: 'REFRESH',     label: 'Refresh',      icon: RefreshIcon,  description: 'Refresh page' },
  { type: 'DELAY',       label: 'Delay',        icon: DelayIcon,    description: 'Wait for duration' },
  { type: 'IF_CONDITION',label: 'If Condition', icon: ConditionIcon,description: 'Conditional branch' },
  { type: 'LOOP',        label: 'Loop',         icon: LoopIcon,     description: 'Repeat actions' },
  { type: 'VARIABLE',    label: 'Variable',     icon: VariableIcon, description: 'Store/retrieve data' },
  { type: 'API_REQUEST', label: 'API Request',  icon: ApiIcon,      description: 'Make HTTP request' },
];

// ── Edge types for the block canvas ─────────────────────────────────────────
const blockEdgeTypes = { addable: AddNodeButton };

// ── Compact canvas node ─────────────────────────────────────────────────────
const BlockCanvasNode = ({ id, data }: any) => {
  const color = NODE_COLORS[data.nodeType] || '#A0A0B4';
  const IconComp = PALETTE_NODES.find(n => n.type === data.nodeType)?.icon ?? ClickIcon;
  return (
    <Box sx={{ minWidth: 160, backgroundColor: '#1e1e1e', border: `2px solid ${color}`, borderRadius: 2 }}>
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1, p: 1,
        backgroundColor: color, borderTopLeftRadius: 6, borderTopRightRadius: 6,
      }}>
        <IconComp sx={{ fontSize: 16, color: 'white' }} />
        <Typography variant="caption" sx={{ flex: 1, color: 'white', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {data.label}
        </Typography>
        <IconButton size="small" onClick={() => data.onDelete?.(id)} sx={{ color: 'white', p: 0.25 }}>
          <DeleteIcon sx={{ fontSize: 13 }} />
        </IconButton>
      </Box>
      <Box sx={{ px: 1, py: 0.75 }}>
        <Chip label={data.nodeType} size="small" sx={{ fontSize: 9, height: 16, backgroundColor: `${color}22`, color }} />
        {data.config?.selector && (
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {data.config.selector}
          </Typography>
        )}
        {data.config?.url && (
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {data.config.url}
          </Typography>
        )}
      </Box>
      <Handle type="target" position={Position.Top} style={{ background: color, width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: color, width: 8, height: 8 }} />
    </Box>
  );
};

const blockNodeTypes = { blockNode: BlockCanvasNode };

// ── Expanded Node config panel ───────────────────────────────────────────────
const NodeConfigPanel = ({ node, onUpdate, onClose }: {
  node: Node; onUpdate: (id: string, config: any, label: string) => void; onClose: () => void;
}) => {
  const [label, setLabel]       = useState(node.data.label || '');
  const [selector, setSelector] = useState(node.data.config?.selector || '');
  const [value, setValue]       = useState(node.data.config?.value || '');
  const [url, setUrl]           = useState(node.data.config?.url || '');
  const [duration, setDuration] = useState(node.data.config?.duration ?? 1000);
  const [count, setCount]       = useState(node.data.config?.count ?? 1);
  const [condition, setCondition] = useState(node.data.config?.condition || '');
  const [varName, setVarName]   = useState(node.data.config?.variable_name || '');
  const [varValue, setVarValue] = useState(node.data.config?.variable_value || '');
  const [method, setMethod]     = useState(node.data.config?.method || 'GET');
  const [body, setBody]         = useState(node.data.config?.body || '');

  const type = node.data.nodeType;

  const commit = () => {
    const cfg: any = {};
    if (['CLICK','TYPE','SELECT','HOVER','UPLOAD_FILE'].includes(type) && selector) cfg.selector = selector;
    if (['TYPE','SELECT'].includes(type) && value) cfg.value = value;
    if (type === 'OPEN_URL' && url) cfg.url = url;
    if (type === 'DELAY') cfg.duration = duration;
    if (type === 'LOOP') cfg.count = count;
    if (type === 'IF_CONDITION' && condition) cfg.condition = condition;
    if (type === 'VARIABLE') { cfg.variable_name = varName; cfg.variable_value = varValue; }
    if (type === 'API_REQUEST') { cfg.url = url; cfg.method = method; if (body) cfg.body = body; }
    onUpdate(node.id, cfg, label);
    onClose();
  };

  const inp = {
    size: 'small' as const, fullWidth: true,
    sx: {
      mb: 1.5,
      '& .MuiOutlinedInput-root': { backgroundColor: '#1a1a1a', '& fieldset': { borderColor: '#333' }, '&.Mui-focused fieldset': { borderColor: '#5B7CF6' } },
      '& .MuiInputBase-input': { color: '#E0E0E0', fontSize: '0.8rem' },
      '& .MuiInputLabel-root': { color: '#555', fontSize: '0.8rem' },
    },
  };

  const noConfig = ['BACK', 'REFRESH'].includes(type);

  return (
    <Box sx={{ width: 270, backgroundColor: '#141414', borderLeft: '1px solid #2a2a2a', p: 2, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: NODE_COLORS[type] || '#A0A0B4', mr: 1 }} />
        <Typography variant="body2" sx={{ color: '#E0E0F0', fontWeight: 600, flex: 1, fontSize: '0.83rem' }}>{type}</Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: '#555', '&:hover': { color: '#F56565' } }}>
          <DeleteIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Box>

      <TextField {...inp} label="Label" value={label} onChange={e => setLabel(e.target.value)} />

      {noConfig && (
        <Typography variant="caption" sx={{ color: '#555', display: 'block', mb: 1 }}>
          No configuration required for this action.
        </Typography>
      )}

      {/* Selector-based actions */}
      {['CLICK','TYPE','SELECT','HOVER','UPLOAD_FILE'].includes(type) && (
        <TextField {...inp} label="Selector" value={selector} onChange={e => setSelector(e.target.value)} placeholder="#id, .class, role=button" />
      )}
      {['TYPE','SELECT'].includes(type) && (
        <TextField {...inp} label="Value" value={value} onChange={e => setValue(e.target.value)} />
      )}

      {/* Navigation */}
      {type === 'OPEN_URL' && (
        <TextField {...inp} label="URL" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" />
      )}

      {/* Control flow */}
      {type === 'DELAY' && (
        <TextField {...inp} label="Duration (ms)" type="number" value={duration}
          onChange={e => setDuration(parseInt(e.target.value) || 0)} inputProps={{ min: 0, step: 500 }} />
      )}
      {type === 'LOOP' && (
        <TextField {...inp} label="Repeat count" type="number" value={count}
          onChange={e => setCount(parseInt(e.target.value) || 1)} inputProps={{ min: 1 }} />
      )}
      {type === 'IF_CONDITION' && (
        <TextField {...inp} label="Condition expression" value={condition}
          onChange={e => setCondition(e.target.value)} placeholder="e.g. {{var}} === 'value'" />
      )}

      {/* Data */}
      {type === 'VARIABLE' && (
        <>
          <TextField {...inp} label="Variable name" value={varName} onChange={e => setVarName(e.target.value)} placeholder="myVar" />
          <TextField {...inp} label="Value / expression" value={varValue} onChange={e => setVarValue(e.target.value)} />
        </>
      )}
      {type === 'API_REQUEST' && (
        <>
          <TextField {...inp} label="URL" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://api.example.com/endpoint" />
          <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
            <InputLabel sx={{ color: '#555', fontSize: '0.8rem' }}>Method</InputLabel>
            <Select
              value={method} onChange={e => setMethod(e.target.value)} label="Method"
              sx={{ backgroundColor: '#1a1a1a', color: '#E0E0E0', fontSize: '0.8rem', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' } }}
            >
              {['GET','POST','PUT','PATCH','DELETE'].map(m => (
                <MenuItem key={m} value={m}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {['POST','PUT','PATCH'].includes(method) && (
            <TextField {...inp} label="Request body (JSON)" value={body} onChange={e => setBody(e.target.value)}
              multiline rows={3} placeholder='{"key": "value"}' />
          )}
        </>
      )}

      <Button variant="contained" size="small" onClick={commit} sx={{ mt: 'auto', pt: 0.75 }}>Apply</Button>
    </Box>
  );
};

// ── Inner canvas (needs ReactFlowProvider context) ──────────────────────────
const BlockCanvasInner = ({
  nodes, edges, onNodesChange, onEdgesChange, onConnect,
  onNodeDelete, onNodeConfigApply, selectedNodeId, onSelectNode, onDeselectNode,
  onInsertNodeOnEdge, onFitViewReady,
}: {
  nodes: Node[]; edges: Edge[];
  onNodesChange: (c: NodeChange[]) => void;
  onEdgesChange: (c: EdgeChange[]) => void;
  onConnect: (c: Connection) => void;
  onNodeDelete: (id: string) => void;
  onNodeConfigApply: (id: string, config: any, label: string) => void;
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  onDeselectNode: () => void;
  onInsertNodeOnEdge: (edgeId: string, nodeType: string, label: string) => void;
  onFitViewReady: (fn: () => void) => void;
}) => {
  const { screenToFlowPosition, fitView } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Expose fitView to parent toolbar
  useEffect(() => {
    onFitViewReady(() => fitView({ duration: 400 }));
  }, [fitView, onFitViewReady]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/blockpalette');
    if (!raw) return;
    const { nodeType, label } = JSON.parse(raw);
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const id = `bn_${Date.now()}`;
    onNodesChange([{
      type: 'add',
      item: {
        id, type: 'blockNode', position: pos,
        data: { label, nodeType, config: {}, onDelete: onNodeDelete, onSettings: onSelectNode },
      },
    }]);
  }, [screenToFlowPosition, onNodesChange, onNodeDelete, onSelectNode]);

  // Inject callbacks + edge insertNodeOnEdge handler into every edge's data
  const nodesWithCbs = nodes.map(n => ({
    ...n,
    data: { ...n.data, onDelete: onNodeDelete, onSettings: onSelectNode },
  }));

  const edgesWithHandler = edges.map(e => ({
    ...e,
    type: 'addable',
    data: {
      ...(e.data ?? {}),
      // Pass the local handler so AddNodeButton bypasses the Zustand store
      onInsertNodeOnEdge,
    },
  }));

  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null;

  return (
    <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <Box ref={wrapperRef} sx={{ flex: 1, height: '100%' }}>
        <ReactFlow
          nodes={nodesWithCbs} edges={edgesWithHandler}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
          onDrop={onDrop} onDragOver={onDragOver}
          onNodeClick={(_, n) => onSelectNode(n.id)}
          onPaneClick={onDeselectNode}
          nodeTypes={blockNodeTypes}
          edgeTypes={blockEdgeTypes}
          fitView deleteKeyCode="Delete"
          defaultEdgeOptions={{ type: 'addable', animated: true, style: { stroke: '#5B7CF6', strokeWidth: 2 } }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#333" gap={16} size={1} style={{ backgroundColor: '#1a1a1a' }} />
          <Controls style={{ backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: 8 }} />
          <MiniMap
            nodeColor={n => NODE_COLORS[n.data?.nodeType] || '#757575'}
            style={{ backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: 8 }}
            maskColor="rgba(0,0,0,0.6)"
          />
        </ReactFlow>
      </Box>

      {/* Config panel */}
      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onUpdate={onNodeConfigApply}
          onClose={onDeselectNode}
        />
      )}
    </Box>
  );
};

// ── Main BlockEditor page ───────────────────────────────────────────────────
const BlockEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  // Block metadata
  const [blockName, setBlockName]           = useState('');
  const [blockDescription, setBlockDescription] = useState('');
  const [blockCategory, setBlockCategory]   = useState('');
  const [blockVersion, setBlockVersion]     = useState(1);

  // Canvas state
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Page state
  const [loading, setLoading]   = useState(!isNew);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);

  // New block dialog
  const [nameDialogOpen, setNameDialogOpen] = useState(isNew);
  const [tempName, setTempName]   = useState('');
  const [tempDesc, setTempDesc]   = useState('');
  const [tempCat, setTempCat]     = useState('');

  // fitView ref: populated by BlockCanvasInner once ReactFlow is mounted
  const fitViewFnRef = useRef<(() => void) | null>(null);
  const handleFitViewReady = useCallback((fn: () => void) => {
    fitViewFnRef.current = fn;
  }, []);

  // ── Load existing block ───────────────────────────────────────────────────
  useEffect(() => {
    if (isNew) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${BASE_URL}/api/blocks/${id}`, {
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error('Block not found');
        const block = await res.json();
        setBlockName(block.name);
        setBlockDescription(block.description || '');
        setBlockCategory(block.category || '');
        setBlockVersion(block.current_version);

        // Load current version nodes/edges
        const defRes = await fetch(`${BASE_URL}/api/blocks/${id}/definition`, {
          headers: authHeaders(),
        });
        if (defRes.ok) {
          const def = await defRes.json();
          const flowNodes: Node[] = (def.nodes || []).map((n: any) => ({
            id: n.node_id,
            type: 'blockNode',
            position: { x: n.position_x ?? 0, y: n.position_y ?? 0 },
            data: { label: n.label, nodeType: n.node_type, config: n.config || {} },
          }));
          const flowEdges: Edge[] = (def.edges || []).map((e: any) => ({
            id: e.edge_id,
            source: e.source_node_id,
            target: e.target_node_id,
            type: 'addable',
            animated: true,
            style: { stroke: '#5B7CF6', strokeWidth: 2 },
          }));
          setNodes(flowNodes);
          setEdges(flowEdges);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isNew]);

  // ── Canvas handlers ───────────────────────────────────────────────────────
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes(ns => applyNodeChanges(changes, ns)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges(es => applyEdgeChanges(changes, es)),
    []
  );
  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges(es => addEdge({ ...connection, type: 'addable', animated: true, style: { stroke: '#5B7CF6', strokeWidth: 2 } }, es)),
    []
  );

  const handleNodeDelete = useCallback((nodeId: string) => {
    setNodes(ns => ns.filter(n => n.id !== nodeId));
    setEdges(es => es.filter(e => e.source !== nodeId && e.target !== nodeId));
    setSelectedNodeId(prev => (prev === nodeId ? null : prev));
  }, []);

  const handleNodeConfigApply = useCallback((nodeId: string, config: any, label: string) => {
    setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, data: { ...n.data, config, label } } : n));
    setSelectedNodeId(null);
  }, []);

  // ── Insert node on edge (local — doesn't use Zustand store) ──────────────
  const handleInsertNodeOnEdge = useCallback((edgeId: string, nodeType: string, label: string) => {
    setNodes(currentNodes => {
      setEdges(currentEdges => {
        const edge = currentEdges.find(e => e.id === edgeId);
        if (!edge) return currentEdges;

        const sourceNode = currentNodes.find(n => n.id === edge.source);
        const targetNode = currentNodes.find(n => n.id === edge.target);
        if (!sourceNode || !targetNode) return currentEdges;

        const newPosition = {
          x: (sourceNode.position.x + targetNode.position.x) / 2,
          y: (sourceNode.position.y + targetNode.position.y) / 2,
        };

        const newId = `bn_${Date.now()}`;
        const color = NODE_COLORS[nodeType] || '#5B7CF6';

        const newNode: Node = {
          id: newId,
          type: 'blockNode',
          position: newPosition,
          data: { label, nodeType, config: {} },
        };

        const edgeStyle = { stroke: color, strokeWidth: 2 };
        const newEdge1: Edge = { id: `e_${edge.source}_${newId}`, source: edge.source, target: newId, type: 'addable', animated: true, style: edgeStyle };
        const newEdge2: Edge = { id: `e_${newId}_${edge.target}`, source: newId, target: edge.target, type: 'addable', animated: true, style: edgeStyle };

        // Add the node (can't call setNodes here, so we queue it)
        setTimeout(() => setNodes(ns => [...ns, newNode]), 0);

        return [...currentEdges.filter(e => e.id !== edgeId), newEdge1, newEdge2];
      });
      return currentNodes;
    });
  }, []);

  // ── Recording ─────────────────────────────────────────────────────────────
  const handleRecord = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = prompt('Enter the URL to start recording:');
      if (!url) return;

      await axios.post(
        'http://localhost:8000/api/recorder/start',
        { url },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsRecording(true);
      toast.success('Recording started. Perform actions in the browser, then click Stop.');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to start recording');
    }
  };

  const handleStopRecording = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:8000/api/recorder/stop',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsRecording(false);

      const actions = response.data.actions || [];
      if (actions.length === 0) {
        toast.info('Recording stopped. No actions captured.');
        return;
      }

      // Calculate Y offset so new nodes appear below all existing ones
      const maxY = nodes.reduce((m, n) => Math.max(m, n.position.y + 120), 0);
      const yOffset = nodes.length > 0 ? maxY + 60 : 60;

      const prefix = `rec_${Date.now()}_`;
      const newNodes: Node[] = actions.map((a: any, i: number) => ({
        id: `${prefix}${i}`,
        type: 'blockNode',
        position: { x: 60 + (i % 4) * 240, y: yOffset + Math.floor(i / 4) * 140 },
        data: {
          label: a.label || a.action_type || 'Action',
          nodeType: a.action_type || a.node_type || 'CLICK',
          config: a.config || { selector: a.selector, value: a.value, url: a.url },
        },
      }));

      // Sequential edges connecting recorded nodes
      const newEdges: Edge[] = newNodes.slice(1).map((n, i) => ({
        id: `${prefix}e_${i}`,
        source: newNodes[i].id,
        target: n.id,
        type: 'addable',
        animated: true,
        style: { stroke: '#5B7CF6', strokeWidth: 2 },
      }));

      // Append below existing content
      setNodes(ns => [...ns, ...newNodes]);
      setEdges(es => [...es, ...newEdges]);

      toast.success(`${actions.length} recorded actions added to canvas`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to stop recording');
      setIsRecording(false);
    }
  };

  // ── Serialise canvas → backend format ────────────────────────────────────
  const serialiseNodes = () =>
    nodes.map(n => ({
      node_id: n.id,
      node_type: n.data.nodeType,
      label: n.data.label,
      position_x: Math.round(n.position.x),
      position_y: Math.round(n.position.y),
      config: n.data.config || {},
      metadata: {},
    }));

  const serialiseEdges = () =>
    edges.map(e => ({
      edge_id: e.id,
      source_node_id: e.source,
      target_node_id: e.target,
    }));

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!blockName.trim()) { toast.error('Block name is required'); return; }
    setSaving(true);
    try {
      const headers = { ...authHeaders(), 'Content-Type': 'application/json' };
      const nodesPayload = serialiseNodes();
      const edgesPayload = serialiseEdges();

      if (isNew) {
        const res = await fetch(`${BASE_URL}/api/blocks`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: blockName.trim(),
            description: blockDescription.trim() || null,
            category: blockCategory.trim() || 'General',
            is_public: false,
            nodes: nodesPayload,
            edges: edgesPayload,
            inputs: [], outputs: [], metadata: {},
          }),
        });
        if (!res.ok) throw new Error('Failed to create block');
        const created = await res.json();
        toast.success(`Block "${created.name}" created`);
        navigate(`/blocks/${created.id}/edit`, { replace: true });
      } else {
        const res = await fetch(`${BASE_URL}/api/blocks/${id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            name: blockName.trim(),
            description: blockDescription.trim() || null,
            category: blockCategory.trim() || 'General',
            nodes: nodesPayload,
            edges: edgesPayload,
            inputs: [], outputs: [],
          }),
        });
        if (!res.ok) throw new Error('Failed to save block');
        const updated = await res.json();
        setBlockVersion(updated.current_version);
        toast.success(`Block saved (v${updated.current_version})`);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleNameDialogConfirm = () => {
    if (!tempName.trim()) return;
    setBlockName(tempName.trim());
    setBlockDescription(tempDesc.trim());
    setBlockCategory(tempCat.trim() || 'General');
    setNameDialogOpen(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
        <CircularProgress size={28} sx={{ color: '#5B7CF6' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#1a1a1a' }}>

      {/* ── Toolbar ── */}
      <Box sx={{
        height: 52, backgroundColor: '#141414', borderBottom: '1px solid #242424',
        display: 'flex', alignItems: 'center', px: 2, flexShrink: 0,
      }}>

        {/* ── LEFT zone: back + name + view tools ── */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
          <Tooltip title="Back to Blocks">
            <IconButton size="small" onClick={() => navigate('/blocks')}
              sx={{ color: '#A0A0B4', flexShrink: 0, '&:hover': { color: '#E0E0F0', backgroundColor: '#242424' } }}>
              <ArrowBackIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ borderColor: '#2a2a2a', mx: 0.5 }} />

          {/* Block name pill */}
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.75,
            px: 1.25, py: 0.4, backgroundColor: '#1c1c1c',
            border: '1px solid #2a2a2a', borderRadius: '7px',
            flexShrink: 1, minWidth: 0, maxWidth: { xs: 100, sm: 160, md: 200 },
          }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#7B96F9', flexShrink: 0 }} />
            <Typography noWrap sx={{ color: '#E0E0F0', fontWeight: 500, fontSize: '0.82rem', minWidth: 0 }}>
              {blockName || 'Untitled Block'}
            </Typography>
            {!isNew && (
              <Chip label={`v${blockVersion}`} size="small"
                sx={{ height: 16, fontSize: 10, backgroundColor: 'rgba(91,124,246,0.2)', color: '#7B96F9', flexShrink: 0 }} />
            )}
          </Box>

          <Divider orientation="vertical" flexItem sx={{ borderColor: '#2a2a2a', mx: 0.5 }} />

          <Tooltip title="Fit view">
            <IconButton size="small" onClick={() => fitViewFnRef.current?.()}
              sx={{ color: '#A0A0B4', flexShrink: 0, '&:hover': { color: '#E0E0F0', backgroundColor: '#242424' } }}>
              <FitScreenIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Auto layout">
            <IconButton
              size="small"
              onClick={() => {
                const COLS = 4, COL_W = 260, ROW_H = 140;
                setNodes(ns => ns.map((n, i) => ({
                  ...n, position: { x: (i % COLS) * COL_W + 40, y: Math.floor(i / COLS) * ROW_H + 40 },
                })));
              }}
              sx={{ color: '#A0A0B4', flexShrink: 0, '&:hover': { color: '#E0E0F0', backgroundColor: '#242424' } }}
            >
              <AutoFixHighIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* ── CENTER zone: Record / Stop ── */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {!isRecording ? (
            <Tooltip title="Record actions into this block">
              <Button
                variant="contained" size="small"
                startIcon={<FiberManualRecordIcon sx={{ fontSize: 13 }} />}
                onClick={handleRecord}
                sx={{
                  height: 30, px: 1.5, fontSize: '0.78rem', whiteSpace: 'nowrap',
                  background: 'rgba(245,101,101,0.15)', color: '#F56565',
                  border: '1px solid rgba(245,101,101,0.3)', boxShadow: 'none',
                  '&:hover': { background: 'rgba(245,101,101,0.25)', boxShadow: 'none' },
                }}
              >
                Record
              </Button>
            </Tooltip>
          ) : (
            <Tooltip title="Stop recording">
              <Button
                variant="contained" size="small"
                startIcon={<StopIcon sx={{ fontSize: 13 }} />}
                onClick={handleStopRecording}
                sx={{
                  height: 30, px: 1.5, fontSize: '0.78rem', whiteSpace: 'nowrap',
                  background: 'rgba(245,101,101,0.9)',
                  boxShadow: '0 0 12px rgba(245,101,101,0.4)',
                  animation: 'pulse 2s infinite',
                  '&:hover': { transform: 'none' },
                }}
              >
                Stop
              </Button>
            </Tooltip>
          )}
        </Box>

        {/* ── RIGHT zone: Create / Save Block ── */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <Button
            variant="contained" color="primary" size="small"
            startIcon={saving ? <CircularProgress size={12} sx={{ color: 'white' }} /> : <SaveIcon sx={{ fontSize: 14 }} />}
            disabled={saving}
            onClick={handleSave}
            sx={{ height: 30, px: 1.5, fontSize: '0.78rem', whiteSpace: 'nowrap' }}
          >
            {isNew ? 'Create Block' : 'Save Block'}
          </Button>
        </Box>

      </Box>

      {error && <Alert severity="error" sx={{ mx: 3, mt: 2 }}>{error}</Alert>}

      {/* ── Main area: palette + canvas ── */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left palette */}
        <Box sx={{
          width: 220, backgroundColor: '#1e1e1e', borderRight: '1px solid #2a2a2a',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
        }}>
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #2a2a2a' }}>
            <Typography variant="caption" sx={{ color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10 }}>
              Drag nodes onto canvas
            </Typography>
          </Box>
          <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
            {PALETTE_NODES.map(({ type, label, icon: Icon, description }) => (
              <Box
                key={type} draggable
                onDragStart={e => {
                  e.dataTransfer.setData('application/blockpalette', JSON.stringify({ nodeType: type, label }));
                  e.dataTransfer.effectAllowed = 'move';
                }}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  p: 1.25, mb: 0.75, backgroundColor: '#2a2a2a', borderRadius: '7px',
                  cursor: 'grab', border: '1px solid transparent', transition: 'all 0.15s',
                  '&:hover': { backgroundColor: '#333', borderColor: `${NODE_COLORS[type] || '#444'}44`, transform: 'translateX(3px)' },
                  '&:active': { cursor: 'grabbing' },
                }}
              >
                <Box sx={{
                  width: 24, height: 24, borderRadius: '6px', flexShrink: 0,
                  backgroundColor: `${NODE_COLORS[type] || '#A0A0B4'}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon sx={{ fontSize: 14, color: NODE_COLORS[type] || '#A0A0B4' }} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ color: '#E0E0F0', fontWeight: 500, fontSize: '0.8rem' }}>{label}</Typography>
                  <Typography variant="caption" sx={{ color: '#555', fontSize: '0.7rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {description}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

          {/* Block metadata fields */}
          <Box sx={{ p: 1.5, borderTop: '1px solid #2a2a2a', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="caption" sx={{ color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>
              Block details
            </Typography>
            {[
              { label: 'Name', value: blockName, setter: setBlockName },
              { label: 'Category', value: blockCategory, setter: setBlockCategory },
              { label: 'Description', value: blockDescription, setter: setBlockDescription },
            ].map(({ label, value, setter }) => (
              <TextField
                key={label} size="small" label={label} value={value}
                onChange={e => setter(e.target.value)}
                multiline={label === 'Description'} rows={label === 'Description' ? 2 : 1}
                sx={{
                  '& .MuiOutlinedInput-root': { backgroundColor: '#1a1a1a', fontSize: '0.78rem', '& fieldset': { borderColor: '#2a2a2a' }, '&.Mui-focused fieldset': { borderColor: '#5B7CF6' } },
                  '& .MuiInputBase-input': { color: '#E0E0E0', py: '5px' },
                  '& .MuiInputLabel-root': { color: '#555', fontSize: '0.78rem' },
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Canvas */}
        <ReactFlowProvider>
          <BlockCanvasInner
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
            onNodeDelete={handleNodeDelete}
            onNodeConfigApply={handleNodeConfigApply}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onDeselectNode={() => setSelectedNodeId(null)}
            onInsertNodeOnEdge={handleInsertNodeOnEdge}
            onFitViewReady={handleFitViewReady}
          />
        </ReactFlowProvider>
      </Box>

      {/* New block name dialog */}
      <dialog
        open={nameDialogOpen ? true : undefined}
        style={{ display: nameDialogOpen ? 'block' : 'none' }}
      >
        {/* Using MUI Dialog instead */}
      </dialog>
      {nameDialogOpen && (
        <Box
          sx={{
            position: 'fixed', inset: 0, zIndex: 1300,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Box sx={{ backgroundColor: '#1c1c1c', border: '1px solid #2a2a2a', borderRadius: 2, p: 3, minWidth: 360, maxWidth: 440 }}>
            <Typography variant="h6" sx={{ color: '#FFFFFF', mb: 0.5 }}>New Reusable Block</Typography>
            <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 2.5 }}>
              Give your block a name, then drag nodes from the palette or click Record to capture browser actions.
            </Typography>
            {[
              { label: 'Block Name *', value: tempName, setter: setTempName, placeholder: 'e.g. Login Flow' },
              { label: 'Category', value: tempCat, setter: setTempCat, placeholder: 'e.g. Authentication' },
              { label: 'Description', value: tempDesc, setter: setTempDesc, placeholder: '' },
            ].map(({ label, value, setter, placeholder }) => (
              <TextField
                key={label} autoFocus={label.startsWith('Block')}
                fullWidth size="small" label={label} value={value}
                onChange={e => setter(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && label.startsWith('Block') && handleNameDialogConfirm()}
                placeholder={placeholder} sx={{ mb: 1.5,
                  '& .MuiOutlinedInput-root': { backgroundColor: '#242424', '& fieldset': { borderColor: '#3a3a3a' }, '&.Mui-focused fieldset': { borderColor: '#5B7CF6' } },
                  '& .MuiInputBase-input': { color: '#FFFFFF' },
                  '& .MuiInputLabel-root': { color: '#666' },
                }}
              />
            ))}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
              <Button onClick={() => navigate('/blocks')} sx={{ color: '#666' }}>Cancel</Button>
              <Button variant="contained" color="primary" disabled={!tempName.trim()} onClick={handleNameDialogConfirm}>
                Start Building
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.65} }`}</style>
    </Box>
  );
};

export default BlockEditor;

// Made with Bob
