import { useEffect, useCallback, useState, useRef } from 'react';
import { authHeaders, BASE_URL } from '../api/client';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Tab,
  Tabs,
  IconButton,
  Tooltip,
  Typography,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Snackbar,
  Switch,
  FormControlLabel,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import CheckIcon from '@mui/icons-material/Check';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactFlow } from 'reactflow';
import WorkflowToolbar, { ReplaySpeed, SPEED_DELAY_MS } from '../components/workflow/WorkflowToolbar';
import NodePalette from '../components/workflow/NodePalette';
import WorkflowCanvas from '../components/workflow/WorkflowCanvas';
import NodeInspector from '../components/workflow/NodeInspector';
import { useWorkflowStore } from '../store/workflowStore';
import { toast } from 'react-toastify';
import axios from 'axios';

const WorkflowEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const {
    workflowId,
    workflowName,
    status,
    isRecording,
    canUndo,
    canRedo,
    setWorkflowId,
    setWorkflowName,
    clearWorkflow,
    loadWorkflow,
    undo,
    redo,
    autoLayout,
    setIsRecording,
    setStatus,
    nodes,
    edges,
    replaceSelectionWithBlock,
  } = useWorkflowStore();

  // Count currently selected nodes (ReactFlow marks them with selected: true)
  const selectedNodeCount = nodes.filter((n) => n.selected).length;

  // State for workflow name dialog
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [tempWorkflowName, setTempWorkflowName] = useState('');
  const [saveBlockDialogOpen, setSaveBlockDialogOpen] = useState(false);
  const [blockName, setBlockName] = useState('');
  const [blockDescription, setBlockDescription] = useState('');

  // Selection-to-block state
  const [selectionBlockDialogOpen, setSelectionBlockDialogOpen] = useState(false);
  const [selBlockName, setSelBlockName] = useState('');
  const [selBlockDescription, setSelBlockDescription] = useState('');
  const [selBlockCategory, setSelBlockCategory] = useState('General');
  const [selBlockIsPublic, setSelBlockIsPublic] = useState(false);
  const [selBlockSaving, setSelBlockSaving] = useState(false);
  // After-save snackbar
  const [savedBlockSnackbar, setSavedBlockSnackbar] = useState(false);
  const [savedBlockId, setSavedBlockId] = useState<number | null>(null);
  const [, setSavedBlockNodeId] = useState<string | null>(null);
  const dismantleSnapshot = useRef<{ nodes: any[]; edges: any[] } | null>(null);

  // Replay speed state
  const [replaySpeed, setReplaySpeed] = useState<ReplaySpeed>('normal');

  // State for Import Script dialog
  const [importScriptOpen, setImportScriptOpen] = useState(false);
  const [importScriptText, setImportScriptText] = useState('');
  const [importScriptName, setImportScriptName] = useState('');
  const [importScriptLoading, setImportScriptLoading] = useState(false);

  // State for execution result dialog
  const [execResultOpen, setExecResultOpen] = useState(false);
  const [execResult, setExecResult] = useState<{ runId: string; status: string; duration: number | null } | null>(null);

  // State for Import Block dialog
  const [importBlockOpen, setImportBlockOpen] = useState(false);
  const [importBlocks, setImportBlocks] = useState<{ id: number; name: string; description: string; current_version: number }[]>([]);
  const [importBlocksLoading, setImportBlocksLoading] = useState(false);

  // State for code viewer dialog
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState<'python' | 'javascript' | 'typescript'>('python');
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Load workflow if ID is provided
  useEffect(() => {
    if (id && id !== 'new') {
      loadWorkflowFromServer(id);
    } else {
      clearWorkflow();
    }
  }, [id]);

  const loadWorkflowFromServer = async (workflowId: string) => {
    try {
      console.log('Loading workflow:', workflowId);
      const response = await axios.get(`${BASE_URL}/api/workflows/${workflowId}`, {
        headers: authHeaders(),
      });

      const workflow = response.data;
      console.log('Workflow data received:', workflow);
      console.log('Nodes count:', workflow.nodes?.length);
      console.log('Edges count:', workflow.edges?.length);
      
      // Transform backend data to React Flow format
      const flowNodes = workflow.nodes.map((node: any) => ({
        id: node.node_id,
        type: 'custom',
        position: { x: node.position_x, y: node.position_y },
        data: {
          label: node.label,
          nodeType: node.node_type,
          config: node.config,
          status: 'idle',
        },
      }));

      const flowEdges = workflow.edges.map((edge: any) => ({
        id: edge.edge_id,
        source: edge.source_node_id,
        target: edge.target_node_id,
        type: 'smoothstep',
        animated: true,
      }));

      console.log('Transformed nodes:', flowNodes);
      console.log('Transformed edges:', flowEdges);

      loadWorkflow({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        nodes: flowNodes,
        edges: flowEdges,
      });

      console.log('Workflow loaded into store');
      toast.success(`Workflow loaded: ${flowNodes.length} nodes, ${flowEdges.length} edges`);
    } catch (error: any) {
      console.error('Failed to load workflow:', error);
      toast.error(error.response?.data?.detail || 'Failed to load workflow');
      navigate('/workflows');
    }
  };

  const handleNew = () => {
    if (nodes.length > 0) {
      if (window.confirm('Create new workflow? Unsaved changes will be lost.')) {
        clearWorkflow();
        setTempWorkflowName('');
        setNameDialogOpen(true);
      }
    } else {
      clearWorkflow();
      setTempWorkflowName('');
      setNameDialogOpen(true);
    }
  };

  const handleNameDialogConfirm = () => {
    if (tempWorkflowName.trim()) {
      setWorkflowName(tempWorkflowName.trim());
      setNameDialogOpen(false);
      navigate('/workflows/new');
      toast.success('New workflow created');
    } else {
      toast.error('Please enter a workflow name');
    }
  };

  const handleNameDialogCancel = () => {
    setNameDialogOpen(false);
    setTempWorkflowName('');
  };

  const handleSave = async () => {
    try {
      // Resolve project_id — only needed for new workflows
      let resolvedProjectId: number | undefined;
      if (!workflowId) {
        // GET /api/projects/default auto-creates "Default Project" if it doesn't exist
        const projRes = await axios.get(`${BASE_URL}/api/projects/default`, {
          headers: authHeaders(),
        });
        resolvedProjectId = projRes.data.id;
      }

      // Transform React Flow data to backend format
      const workflowData: any = {
        name: workflowName,
        description: 'Workflow created with FlowWeaver',
        nodes: nodes.map((node) => ({
          node_id: node.id,
          node_type: node.data.nodeType,
          label: node.data.label,
          position_x: node.position.x,
          position_y: node.position.y,
          config: node.data.config || {},
          metadata: {},
        })),
        edges: edges.map((edge) => ({
          edge_id: edge.id,
          source_node_id: edge.source,
          target_node_id: edge.target,
          source_handle: edge.sourceHandle,
          target_handle: edge.targetHandle,
          config: {},
          metadata: {},
        })),
      };

      let response;
      if (workflowId) {
        // Update existing workflow — no project_id needed
        response = await axios.put(
          `${BASE_URL}/api/workflows/${workflowId}`,
          workflowData,
          { headers: authHeaders() }
        );
        toast.success('Workflow updated successfully');
        // Re-fetch code if the dialog is currently open so it shows updated nodes
        if (codeDialogOpen) {
          await fetchCode(codeLanguage);
        }
      } else {
        // Create new workflow
        workflowData.project_id = resolvedProjectId;
        response = await axios.post(
          `${BASE_URL}/api/workflows/`,
          workflowData,
          { headers: authHeaders() }
        );
        setWorkflowId(response.data.id);
        navigate(`/workflows/${response.data.id}`);
        toast.success('Workflow created successfully');
      }
    } catch (error: any) {
      console.error('Failed to save workflow:', error);
      toast.error(error.response?.data?.detail || 'Failed to save workflow');
    }
  };

  const handleDelete = async () => {
    if (!workflowId) {
      toast.error('No workflow to delete');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this workflow?')) {
      return;
    }

    try {
      await axios.delete(`${BASE_URL}/api/workflows/${workflowId}`, {
        headers: authHeaders(),
      });
      toast.success('Workflow deleted successfully');
      navigate('/workflows');
    } catch (error: any) {
      console.error('Failed to delete workflow:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete workflow');
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          loadWorkflow(data);
          toast.success('Workflow imported successfully');
        } catch (error) {
          toast.error('Failed to import workflow');
        }
      }
    };
    input.click();
  };

  const handleExport = () => {
    const data = {
      id: workflowId,
      name: workflowName,
      description: 'Exported from FlowWeaver',
      nodes,
      edges,
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowName.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Workflow exported successfully');
  };

  const handleRecord = async () => {
    try {
      const url = prompt('Enter URL to record:');
      if (!url) return;

      console.log('Starting recording with URL:', url);

      const response = await axios.post(
        `${BASE_URL}/api/recorder/start`,
        { url },
        { headers: authHeaders() }
      );

      console.log('Recording started:', response.data);

      setIsRecording(true);
      setStatus('recording');
      toast.success('Recording started. Perform actions in the browser.');
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      console.error('Error details:', error.response?.data);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to start recording';
      toast.error(errorMessage);
    }
  };

  const handleStopRecording = async () => {
    try {
      // Ask user if they want to save as workflow
      const saveAsWorkflow = window.confirm('Save recording as a workflow?');
      
      // Prepare query parameters based on whether we're saving as workflow
      let params: any = {};
      
      if (saveAsWorkflow) {
        const workflowNameInput = prompt('Enter workflow name:');
        if (!workflowNameInput || !workflowNameInput.trim()) {
          toast.error('Workflow name is required to save');
          return;
        }
        
        params = {
          save_as_workflow: true,
          workflow_name: workflowNameInput.trim(),
          // omit project_id → backend auto-creates "Default Project"
        };
      }
      
      const response = await axios.post(
        `${BASE_URL}/api/recorder/stop`,
        {},
        { headers: authHeaders(), params: params }
      );

      setIsRecording(false);
      setStatus('idle');
      
      // Check if workflow was created
      if (response.data.workflow_id) {
        toast.success(`Recording saved as workflow! ${response.data.actions_count} actions captured.`);
        // Navigate to the created workflow
        navigate(`/workflows/${response.data.workflow_id}`);
      } else if (response.data.actions && response.data.actions.length > 0) {
        toast.success(`Recording stopped. ${response.data.actions_count} actions captured.`);
      } else {
        toast.info('Recording stopped. No actions captured.');
      }
    } catch (error: any) {
      console.error('Failed to stop recording:', error);
      toast.error(error.response?.data?.detail || 'Failed to stop recording');
      setIsRecording(false);
      setStatus('idle');
    }
  };

  const handleRun = async () => {
    if (!workflowId) {
      toast.error('Please save the workflow before running');
      return;
    }

    try {
      setStatus('running');
      const response = await axios.post(
        `${BASE_URL}/api/workflows/${workflowId}/execute`,
        { step_delay_ms: SPEED_DELAY_MS[replaySpeed] },
        { headers: authHeaders() }
      );

      setStatus('idle');

      const runId    = response.data.run_id;
      const statusMsg = response.data.status;
      const duration  = response.data.duration_seconds;

      // Show stylised execution result dialog
      setExecResult({ runId, status: statusMsg, duration });
      setExecResultOpen(true);
    } catch (error: any) {
      console.error('Failed to run workflow:', error);
      toast.error(error.response?.data?.detail || 'Failed to run workflow');
      setStatus('idle');
    }
  };

  const fetchCode = async (lang: 'python' | 'javascript' | 'typescript') => {
    if (!workflowId) {
      toast.error('Save the workflow first before viewing code');
      return;
    }
    try {
      setCodeLoading(true);
      const response = await axios.get(
        `${BASE_URL}/api/workflows/${workflowId}/export-script`,
        {
          params: { language: lang, include_comments: true },
          headers: authHeaders(),
          responseType: 'text',
        }
      );
      setGeneratedCode(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to generate code');
      setGeneratedCode('');
    } finally {
      setCodeLoading(false);
    }
  };

  const handleViewCode = async () => {
    setCodeDialogOpen(true);
    setCodeCopied(false);
    await fetchCode(codeLanguage);
  };

  const handleCodeLanguageChange = async (_: any, newLang: 'python' | 'javascript' | 'typescript') => {
    setCodeLanguage(newLang);
    setCodeCopied(false);
    await fetchCode(newLang);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  const handleDownloadCode = () => {
    const ext = codeLanguage === 'python' ? 'py' : codeLanguage === 'javascript' ? 'js' : 'ts';
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowName.replace(/\s+/g, '_')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleZoomIn = () => {
    // Implemented via React Flow Controls
  };

  const handleZoomOut = () => {
    // Implemented via React Flow Controls
  };

  const handleFitView = () => {
    // Implemented via React Flow Controls
  };

  const handleSaveAsBlock = () => {
    if (nodes.length === 0) {
      toast.error('No nodes to save as block');
      return;
    }
    setBlockName('');
    setBlockDescription('');
    setSaveBlockDialogOpen(true);
  };

  const handleSaveBlockConfirm = async () => {
    if (!blockName.trim()) {
      toast.error('Please enter a block name');
      return;
    }

    try {
      const blockData = {
        name: blockName.trim(),
        description: blockDescription.trim() || 'Block created from workflow',
        block_type: 'custom',
        version: '1.0.0',
        nodes: nodes.map((node) => ({
          node_id: node.id,
          node_type: node.data.nodeType,
          label: node.data.label,
          position_x: node.position.x,
          position_y: node.position.y,
          config: node.data.config || {},
          metadata: {},
        })),
        edges: edges.map((edge) => ({
          edge_id: edge.id,
          source_node_id: edge.source,
          target_node_id: edge.target,
          source_handle: edge.sourceHandle,
          target_handle: edge.targetHandle,
          config: {},
          metadata: {},
        })),
        metadata: {
          created_from_workflow: workflowId,
          node_count: nodes.length,
          edge_count: edges.length,
        },
      };

      await axios.post(
        `${BASE_URL}/api/blocks`,
        blockData,
        { headers: authHeaders() }
      );

      setSaveBlockDialogOpen(false);
      setBlockName('');
      setBlockDescription('');
      toast.success('Block saved successfully');
    } catch (error: any) {
      console.error('Failed to save block:', error);
      toast.error(error.response?.data?.detail || 'Failed to save block');
    }
  };

  const handleSaveBlockCancel = () => {
    setSaveBlockDialogOpen(false);
    setBlockName('');
    setBlockDescription('');
  };

  // ── Selection-to-Block ───────────────────────────────────────────────────
  const handleSaveSelectionAsBlock = () => {
    const count = nodes.filter((n) => n.selected).length;
    if (count < 2) {
      toast.error('Select at least 2 nodes first (shift-click or lasso)');
      return;
    }
    setSelBlockName('');
    setSelBlockDescription('');
    setSelBlockCategory('General');
    setSelBlockIsPublic(false);
    setSelectionBlockDialogOpen(true);
  };

  const handleSelectionBlockConfirm = async () => {
    if (!selBlockName.trim()) {
      toast.error('Block name is required');
      return;
    }
    const selectedNodeIds = nodes.filter((n) => n.selected).map((n) => n.id);
    if (selectedNodeIds.length < 2) {
      toast.error('No nodes selected');
      return;
    }
    setSelBlockSaving(true);
    try {
      const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id));
      const selectedEdges = edges.filter(
        (e) => selectedNodeIds.includes(e.source) && selectedNodeIds.includes(e.target)
      );

      const res = await axios.post(
        `${BASE_URL}/api/blocks`,
        {
          name: selBlockName.trim(),
          description: selBlockDescription.trim() || null,
          category: selBlockCategory.trim() || 'General',
          is_public: selBlockIsPublic,
          nodes: selectedNodes.map((n) => ({
            node_id: n.id,
            node_type: n.data.nodeType,
            label: n.data.label,
            position_x: Math.round(n.position.x),
            position_y: Math.round(n.position.y),
            config: n.data.config || {},
            metadata: {},
          })),
          edges: selectedEdges.map((e) => ({
            edge_id: e.id,
            source_node_id: e.source,
            target_node_id: e.target,
            source_handle: e.sourceHandle,
            target_handle: e.targetHandle,
            config: {},
            metadata: {},
          })),
          inputs: [],
          outputs: [],
          metadata: { created_from_selection: true },
        },
        { headers: authHeaders() }
      );

      const created = res.data;
      setSelectionBlockDialogOpen(false);

      // Replace selection with BLOCK node inline
      const result = replaceSelectionWithBlock(selectedNodeIds, created.id, created.name);
      if (result) {
        dismantleSnapshot.current = result.snapshot;
        setSavedBlockId(created.id);
        setSavedBlockNodeId(result.blockNodeId);
        setSavedBlockSnackbar(true);
      }

      toast.success(`"${created.name}" saved as reusable block`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save block');
    } finally {
      setSelBlockSaving(false);
    }
  };

  const handleDismantle = () => {
    if (!dismantleSnapshot.current) return;
    useWorkflowStore.setState({
      nodes: dismantleSnapshot.current.nodes,
      edges: dismantleSnapshot.current.edges,
    });
    dismantleSnapshot.current = null;
    setSavedBlockSnackbar(false);
    setSavedBlockId(null);
    setSavedBlockNodeId(null);
    toast.info('Block dismantled — original nodes restored');
  };

  // ── Import Playwright Script ─────────────────────────────────────────────
  const handleImportScript = () => {
    setImportScriptText('');
    setImportScriptName('');
    setImportScriptOpen(true);
  };

  const handleImportScriptConfirm = async () => {
    if (!importScriptName.trim()) {
      toast.error('Please enter a workflow name');
      return;
    }
    if (!importScriptText.trim()) {
      toast.error('Please paste a Playwright script');
      return;
    }
    try {
      setImportScriptLoading(true);
      const response = await axios.post(
        `${BASE_URL}/api/recorder/import-script`,
        {
          playwright_script: importScriptText.trim(),
          workflow_name: importScriptName.trim(),
        },
        { headers: authHeaders() }
      );
      setImportScriptOpen(false);
      toast.success(`Imported "${response.data.workflow_name}" — ${response.data.nodes_count} nodes`);
      navigate(`/workflows/${response.data.workflow_id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to import script');
    } finally {
      setImportScriptLoading(false);
    }
  };

  // ── Import Block ────────────────────────────────────────────────────────
  const handleImportBlock = async () => {
    setImportBlockOpen(true);
    setImportBlocksLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/blocks`, {
        headers: authHeaders(),
      });
      if (res.ok) setImportBlocks(await res.json());
    } catch {
      setImportBlocks([]);
    } finally {
      setImportBlocksLoading(false);
    }
  };

  const handleImportBlockConfirm = (blockId: number, blockName: string) => {
    // Place the BLOCK node offset from existing nodes so it doesn't overlap
    const existingCount = nodes.length;
    const x = 80 + (existingCount % 4) * 300;
    const y = 80 + Math.floor(existingCount / 4) * 200;

    const newNode = {
      id: `block_${blockId}_${Date.now()}`,
      type: 'custom' as const,
      position: { x, y },
      data: {
        label: blockName,
        nodeType: 'BLOCK',
        config: { block_id: blockId },
        status: 'idle' as const,
      },
    };

    useWorkflowStore.getState().addNode(newNode);
    toast.success(`"${blockName}" added — select it and open the inspector to dismantle`);
    setImportBlockOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#1a1a1a' }}>
      <WorkflowToolbar
        workflowName={workflowName}
        onRenameWorkflow={setWorkflowName}
        status={status}
        isRecording={isRecording}
        canUndo={canUndo()}
        canRedo={canRedo()}
        onNew={handleNew}
        onSave={handleSave}
        onDelete={handleDelete}
        onImport={handleImport}
        onExport={handleExport}
        onRecord={handleRecord}
        onStopRecording={handleStopRecording}
        onRun={handleRun}
        onUndo={undo}
        onRedo={redo}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        onAutoLayout={autoLayout}
        onSaveAsBlock={handleSaveAsBlock}
        onSaveSelectionAsBlock={handleSaveSelectionAsBlock}
        selectedNodeCount={selectedNodeCount}
        onImportBlock={handleImportBlock}
        onViewCode={handleViewCode}
        onImportScript={handleImportScript}
        replaySpeed={replaySpeed}
        onReplaySpeedChange={setReplaySpeed}
      />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <NodePalette />
        <Box sx={{ flex: 1 }}>
          <WorkflowCanvas />
        </Box>
        <NodeInspector />
      </Box>

      {/* Workflow Name Dialog */}
      <Dialog open={nameDialogOpen} onClose={handleNameDialogCancel}>
        <DialogTitle>Create New Workflow</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Workflow Name"
            type="text"
            fullWidth
            variant="outlined"
            value={tempWorkflowName}
            onChange={(e) => setTempWorkflowName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleNameDialogConfirm();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleNameDialogCancel}>Cancel</Button>
          <Button onClick={handleNameDialogConfirm} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Code Viewer Dialog */}
      <Dialog
        open={codeDialogOpen}
        onClose={() => setCodeDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { backgroundColor: '#1e1e1e', color: 'white', minHeight: 500 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 0 }}>
          <Typography variant="h6">Playwright Code</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title={codeCopied ? 'Copied!' : 'Copy to clipboard'}>
              <IconButton onClick={handleCopyCode} disabled={!generatedCode} sx={{ color: codeCopied ? '#4CAF50' : 'white' }}>
                {codeCopied ? <CheckIcon /> : <ContentCopyIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Download file">
              <IconButton onClick={handleDownloadCode} disabled={!generatedCode} sx={{ color: 'white' }}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </DialogTitle>

        {/* Language tabs */}
        <Tabs
          value={codeLanguage}
          onChange={handleCodeLanguageChange}
          sx={{
            px: 3,
            '& .MuiTab-root': { color: '#aaa', textTransform: 'none' },
            '& .Mui-selected': { color: 'white' },
            '& .MuiTabs-indicator': { backgroundColor: '#1976d2' },
          }}
        >
          <Tab label="Python" value="python" />
          <Tab label="JavaScript" value="javascript" />
          <Tab label="TypeScript" value="typescript" />
        </Tabs>

        <DialogContent sx={{ p: 0 }}>
          {codeLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 3,
                backgroundColor: '#0d0d0d',
                color: '#f8f8f2',
                fontFamily: '"Fira Code", "Consolas", monospace',
                fontSize: 13,
                lineHeight: 1.6,
                overflowX: 'auto',
                overflowY: 'auto',
                maxHeight: 500,
                whiteSpace: 'pre',
                borderTop: '1px solid #333',
              }}
            >
              {generatedCode || '# No code generated yet'}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ borderTop: '1px solid #333', px: 3 }}>
          <Button onClick={() => setCodeDialogOpen(false)} sx={{ color: '#aaa' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Block Dialog */}
      <Dialog
        open={importBlockOpen}
        onClose={() => setImportBlockOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { backgroundColor: '#1c1c1c', border: '1px solid #2a2a2a' } }}
      >
        <DialogTitle sx={{ color: '#FFFFFF', borderBottom: '1px solid #2a2a2a', pb: 1.5 }}>
          Import Block into Canvas
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {importBlocksLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} sx={{ color: '#5B7CF6' }} />
            </Box>
          ) : importBlocks.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: '#666' }}>
                No blocks available. Create one in the Blocks section first.
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {importBlocks.map((b, i) => (
                <ListItemButton
                  key={b.id}
                  onClick={() => handleImportBlockConfirm(b.id, b.name)}
                  sx={{
                    borderBottom: i < importBlocks.length - 1 ? '1px solid #222' : 'none',
                    py: 1.25, px: 2,
                    '&:hover': { backgroundColor: '#242424' },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 500 }}>
                          {b.name}
                        </Typography>
                        <Chip label={`v${b.current_version}`} size="small"
                          sx={{ height: 16, fontSize: 10, backgroundColor: 'rgba(91,124,246,0.2)', color: '#7B96F9' }} />
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" sx={{ color: '#666' }}>
                        {b.description || 'No description'}
                      </Typography>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #2a2a2a', px: 2, py: 1.5 }}>
          <Button onClick={() => setImportBlockOpen(false)} sx={{ color: '#666' }}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Save as Block Dialog */}
      <Dialog open={saveBlockDialogOpen} onClose={handleSaveBlockCancel}>
        <DialogTitle>Save as Reusable Block</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Block Name"
            type="text"
            fullWidth
            variant="outlined"
            value={blockName}
            onChange={(e) => setBlockName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (optional)"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={blockDescription}
            onChange={(e) => setBlockDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSaveBlockCancel}>Cancel</Button>
          <Button onClick={handleSaveBlockConfirm} variant="contained" color="primary">
            Save Block
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Selection-to-Block Dialog ───────────────────────────────────── */}
      <Dialog
        open={selectionBlockDialogOpen}
        onClose={() => !selBlockSaving && setSelectionBlockDialogOpen(false)}
        PaperProps={{ sx: { backgroundColor: '#1c1c1c', border: '1px solid #2a2a2a', minWidth: 380 } }}
      >
        <DialogTitle sx={{ color: '#FFFFFF', borderBottom: '1px solid #2a2a2a', pb: 2 }}>
          Save Selection as Reusable Block
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5, display: 'flex', flexDirection: 'column', gap: 0 }}>
          <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 2 }}>
            {`${nodes.filter((n) => n.selected).length} selected nodes will be packaged into a reusable block and replaced with a single BLOCK node.`}
          </Typography>
          {[
            { label: 'Block Name *', value: selBlockName, setter: setSelBlockName },
            { label: 'Category', value: selBlockCategory, setter: setSelBlockCategory },
            { label: 'Description', value: selBlockDescription, setter: setSelBlockDescription },
          ].map(({ label, value, setter }) => (
            <TextField
              key={label}
              fullWidth size="small" label={label} value={value}
              onChange={(e) => setter(e.target.value)}
              autoFocus={label.startsWith('Block')}
              multiline={label === 'Description'} rows={label === 'Description' ? 2 : 1}
              sx={{
                mb: 1.5,
                '& .MuiOutlinedInput-root': { backgroundColor: '#242424', '& fieldset': { borderColor: '#3a3a3a' }, '&.Mui-focused fieldset': { borderColor: '#5B7CF6' } },
                '& .MuiInputBase-input': { color: '#FFFFFF' },
                '& .MuiInputLabel-root': { color: '#666' },
              }}
            />
          ))}
          <FormControlLabel
            control={
              <Switch
                checked={selBlockIsPublic}
                onChange={(e) => setSelBlockIsPublic(e.target.checked)}
                size="small"
                sx={{ '& .MuiSwitch-thumb': { backgroundColor: selBlockIsPublic ? '#5B7CF6' : '#555' } }}
              />
            }
            label={<Typography variant="caption" sx={{ color: '#888' }}>Make public</Typography>}
          />
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #2a2a2a', px: 3, py: 2 }}>
          <Button onClick={() => setSelectionBlockDialogOpen(false)} disabled={selBlockSaving} sx={{ color: '#666' }}>
            Cancel
          </Button>
          <Button
            variant="contained" color="primary"
            disabled={!selBlockName.trim() || selBlockSaving}
            onClick={handleSelectionBlockConfirm}
            startIcon={selBlockSaving ? <CircularProgress size={13} color="inherit" /> : undefined}
          >
            {selBlockSaving ? 'Saving…' : 'Save as Block'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Post-save Snackbar: Open in Editor / Dismantle ──────────────── */}
      <Snackbar
        open={savedBlockSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: 32 }}
      >
        <Box
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            backgroundColor: '#1c1c1c', border: '1px solid #2a2a2a',
            borderRadius: 2, px: 2.5, py: 1.5,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#48BB78', flexShrink: 0 }} />
          <Typography variant="body2" sx={{ color: '#E0E0F0', flex: 1 }}>
            Block saved. What would you like to do?
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={() => window.open(`/blocks/${savedBlockId}/edit`, '_blank')}
            sx={{ color: '#7B96F9', borderColor: '#7B96F9', fontSize: '0.75rem', py: 0.4, px: 1.2, textTransform: 'none' }}
          >
            Open in Editor
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={handleDismantle}
            sx={{ fontSize: '0.75rem', py: 0.4, px: 1.2, textTransform: 'none' }}
          >
            Dismantle
          </Button>
          <IconButton
            size="small"
            onClick={() => setSavedBlockSnackbar(false)}
            sx={{ color: '#555', ml: 0.5 }}
          >
            <CheckIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      </Snackbar>

      {/* Import Playwright Script Dialog */}
      <Dialog
        open={importScriptOpen}
        onClose={() => !importScriptLoading && setImportScriptOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { backgroundColor: '#1c1c1c', border: '1px solid #2a2a2a' } }}
      >
        <DialogTitle sx={{ color: '#FFFFFF', borderBottom: '1px solid #2a2a2a', pb: 1.5 }}>
          Import Playwright Script
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Workflow Name"
            type="text"
            fullWidth
            variant="outlined"
            value={importScriptName}
            onChange={(e) => setImportScriptName(e.target.value)}
            placeholder="e.g. BlazeDemo Purchase Flow"
            sx={{ mb: 2 }}
            InputLabelProps={{ sx: { color: '#888' } }}
            inputProps={{ style: { color: '#E0E0E0' } }}
          />
          <TextField
            label="Playwright Script"
            multiline
            rows={16}
            fullWidth
            variant="outlined"
            value={importScriptText}
            onChange={(e) => setImportScriptText(e.target.value)}
            placeholder={`Paste your Playwright Python script here, e.g.:\n\npage.goto("https://blazedemo.com/index.php")\npage.locator('select[name="fromPort"]').select_option("Portland")\npage.get_by_placeholder("First Last").fill("John")\npage.get_by_role("button", name="Find Flights").click()`}
            sx={{ fontFamily: '"Fira Code", monospace' }}
            InputLabelProps={{ sx: { color: '#888' } }}
            inputProps={{ style: { color: '#E0E0E0', fontFamily: '"Fira Code", "Consolas", monospace', fontSize: 13 } }}
          />
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #2a2a2a', px: 2, py: 1.5 }}>
          <Button
            onClick={() => setImportScriptOpen(false)}
            disabled={importScriptLoading}
            sx={{ color: '#666' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImportScriptConfirm}
            variant="contained"
            color="primary"
            disabled={importScriptLoading}
            startIcon={importScriptLoading ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            {importScriptLoading ? 'Importing…' : 'Import'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Execution Result Dialog ─────────────────────────────────── */}
      <Dialog
        open={execResultOpen}
        onClose={() => setExecResultOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#1c1c1c',
            border: '1px solid #2a2a2a',
            borderRadius: '12px',
            overflow: 'hidden',
          },
        }}
      >
        {/* Coloured header band */}
        <Box
          sx={{
            px: 3, py: 2.5,
            backgroundColor: execResult?.status === 'completed'
              ? 'rgba(72,187,120,0.12)'
              : execResult?.status === 'failed'
              ? 'rgba(245,101,101,0.12)'
              : 'rgba(91,124,246,0.12)',
            borderBottom: '1px solid',
            borderColor: execResult?.status === 'completed'
              ? 'rgba(72,187,120,0.25)'
              : execResult?.status === 'failed'
              ? 'rgba(245,101,101,0.25)'
              : 'rgba(91,124,246,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          {/* Status dot */}
          <Box
            sx={{
              width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
              backgroundColor: execResult?.status === 'completed'
                ? '#48BB78'
                : execResult?.status === 'failed'
                ? '#F56565'
                : '#5B7CF6',
            }}
          />
          <Typography variant="body1" sx={{ fontWeight: 700, color: '#E0E0F0', fontSize: '0.95rem' }}>
            {execResult?.status === 'completed'
              ? 'Workflow Completed'
              : execResult?.status === 'failed'
              ? 'Workflow Failed'
              : 'Execution Finished'}
          </Typography>
        </Box>

        <DialogContent sx={{ px: 3, pt: 2.5, pb: 1 }}>
          {/* Duration */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10 }}>
              Duration
            </Typography>
            <Typography variant="body2" sx={{ color: '#E0E0E0', fontWeight: 600, fontFamily: '"Fira Code", monospace' }}>
              {execResult?.duration != null ? `${execResult.duration.toFixed(2)}s` : '—'}
            </Typography>
          </Box>

          {/* Run ID */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
            <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10 }}>
              Run ID
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: '#555',
                fontFamily: '"Fira Code", monospace',
                fontSize: 11,
                maxWidth: 180,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {execResult?.runId ?? '—'}
            </Typography>
          </Box>

          {/* Failed message hint */}
          {execResult?.status === 'failed' && (
            <Box
              sx={{
                p: 1.5, borderRadius: '7px',
                backgroundColor: 'rgba(245,101,101,0.08)',
                border: '1px solid rgba(245,101,101,0.2)',
                mb: 2,
              }}
            >
              <Typography variant="caption" sx={{ color: '#F56565' }}>
                Execution failed. Check the backend logs for details.
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 0, gap: 1 }}>
          <Button
            onClick={() => setExecResultOpen(false)}
            size="small"
            sx={{
              color: '#666', textTransform: 'none', fontSize: '0.82rem',
              '&:hover': { color: '#A0A0B4', backgroundColor: 'transparent' },
            }}
          >
            Dismiss
          </Button>
          <Button
            variant="contained"
            size="small"
            disabled={!execResult?.runId}
            onClick={() => {
              setExecResultOpen(false);
              navigate(`/executions/${execResult!.runId}`);
            }}
            sx={{
              textTransform: 'none',
              fontSize: '0.82rem',
              backgroundColor: '#5B7CF6',
              '&:hover': { backgroundColor: '#4a6be0' },
              '&.Mui-disabled': { backgroundColor: '#242424', color: '#333' },
            }}
          >
            View Execution Details →
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkflowEditor;

// Made with Bob
