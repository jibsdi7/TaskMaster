import { useEffect, useCallback, useState } from 'react';
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
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import CheckIcon from '@mui/icons-material/Check';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactFlow } from 'reactflow';
import WorkflowToolbar from '../components/workflow/WorkflowToolbar';
import NodePalette from '../components/workflow/NodePalette';
import WorkflowCanvas from '../components/workflow/WorkflowCanvas';
import NodeInspector from '../components/workflow/NodeInspector';
import { useWorkflowStore } from '../store/workflowStore';
import { toast } from 'react-toastify';
import axios from 'axios';

// Test mode: Create a mock token for development
const TEST_MODE = true;
if (TEST_MODE && !localStorage.getItem('token')) {
  // This is a mock token for testing - in production, get real token from login
  localStorage.setItem('token', 'test-token-for-development');
}

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
  } = useWorkflowStore();

  // State for workflow name dialog
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [tempWorkflowName, setTempWorkflowName] = useState('');
  const [saveBlockDialogOpen, setSaveBlockDialogOpen] = useState(false);
  const [blockName, setBlockName] = useState('');
  const [blockDescription, setBlockDescription] = useState('');

  // State for Import Script dialog
  const [importScriptOpen, setImportScriptOpen] = useState(false);
  const [importScriptText, setImportScriptText] = useState('');
  const [importScriptName, setImportScriptName] = useState('');
  const [importScriptLoading, setImportScriptLoading] = useState(false);

  // State for Import Block dialog
  const [importBlockOpen, setImportBlockOpen] = useState(false);
  const [importBlocks, setImportBlocks] = useState<{ id: number; name: string; description: string; current_version: number }[]>([]);
  const [importBlocksLoading, setImportBlocksLoading] = useState(false);
  const [importingBlockId, setImportingBlockId] = useState<number | null>(null);

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
      const token = localStorage.getItem('token');
      console.log('Loading workflow:', workflowId);
      const response = await axios.get(`http://localhost:8000/api/workflows/${workflowId}`, {
        headers: { Authorization: `Bearer ${token}` },
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
      const token = localStorage.getItem('token');

      // Resolve project_id — only needed for new workflows
      let resolvedProjectId: number | undefined;
      if (!workflowId) {
        // GET /api/projects/default auto-creates "Default Project" if it doesn't exist
        const projRes = await axios.get('http://localhost:8000/api/projects/default', {
          headers: { Authorization: `Bearer ${token}` },
        });
        resolvedProjectId = projRes.data.id;
      }

      // Transform React Flow data to backend format
      const workflowData: any = {
        name: workflowName,
        description: 'Workflow created with TaskMaster',
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
          `http://localhost:8000/api/workflows/${workflowId}`,
          workflowData,
          { headers: { Authorization: `Bearer ${token}` } }
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
          'http://localhost:8000/api/workflows/',
          workflowData,
          { headers: { Authorization: `Bearer ${token}` } }
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
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:8000/api/workflows/${workflowId}`, {
        headers: { Authorization: `Bearer ${token}` },
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
      description: 'Exported workflow',
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
      // Ensure test token exists
      let token = localStorage.getItem('token');
      if (!token && TEST_MODE) {
        token = 'test-token-for-development';
        localStorage.setItem('token', token);
      }
      
      const url = prompt('Enter URL to record:');
      if (!url) return;

      console.log('Starting recording with URL:', url);
      console.log('Using token:', token ? 'Token present' : 'No token');

      const response = await axios.post(
        'http://localhost:8000/api/recorder/start',
        { url },
        { headers: { Authorization: `Bearer ${token}` } }
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
      const token = localStorage.getItem('token');
      
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
        'http://localhost:8000/api/recorder/stop',
        {}, // Empty body - backend expects query params
        {
          headers: { Authorization: `Bearer ${token}` },
          params: params
        }
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
      const token = localStorage.getItem('token');
      setStatus('running');
      
      const response = await axios.post(
        `http://localhost:8000/api/workflows/${workflowId}/execute`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setStatus('idle');
      
      // Show success message with execution details
      const runId = response.data.run_id;
      const statusMsg = response.data.status;
      const duration = response.data.duration_seconds;
      
      if (statusMsg === 'completed') {
        toast.success(`Workflow executed successfully! Duration: ${duration?.toFixed(2) || 0}s`);
      } else if (statusMsg === 'failed') {
        toast.warning(`Workflow execution failed. Check backend logs for details.`);
      } else {
        toast.success('Workflow execution started. Check browser window for automation.');
      }
      
      // Try to navigate to execution details (will work if database is connected)
      if (runId) {
        // Don't navigate immediately - give user option
        setTimeout(() => {
          if (window.confirm('View execution details? (Requires database connection)')) {
            navigate(`/executions/${runId}`);
          }
        }, 1000);
      }
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
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:8000/api/workflows/${workflowId}/export-script`,
        {
          params: { language: lang, include_comments: true },
          headers: { Authorization: `Bearer ${token}` },
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
      const token = localStorage.getItem('token');
      
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
        'http://localhost:8000/api/blocks',
        blockData,
        { headers: { Authorization: `Bearer ${token}` } }
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
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:8000/api/recorder/import-script',
        {
          playwright_script: importScriptText.trim(),
          workflow_name: importScriptName.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
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
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/blocks', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setImportBlocks(await res.json());
    } catch {
      setImportBlocks([]);
    } finally {
      setImportBlocksLoading(false);
    }
  };

  const handleImportBlockConfirm = async (blockId: number) => {
    setImportingBlockId(blockId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8000/api/blocks/${blockId}/definition`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to load block definition');
      const def = await res.json();

      // Calculate offset so pasted nodes don't overlap existing ones
      const existingCount = nodes.length;
      const offsetX = 80 + (existingCount % 4) * 280;
      const offsetY = 80 + Math.floor(existingCount / 4) * 160;

      // Build unique ID prefix to avoid collisions with existing nodes
      const prefix = `imp_${blockId}_${Date.now()}_`;

      const newNodes = (def.nodes || []).map((n: any) => ({
        id: prefix + n.node_id,
        type: 'custom',
        position: {
          x: (n.position_x ?? 0) + offsetX,
          y: (n.position_y ?? 0) + offsetY,
        },
        data: {
          label: n.label,
          nodeType: n.node_type,
          config: n.config || {},
          status: 'idle' as const,
        },
      }));

      const newEdges = (def.edges || []).map((e: any) => ({
        id: prefix + e.edge_id,
        source: prefix + e.source_node_id,
        target: prefix + e.target_node_id,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#1976d2', strokeWidth: 2 },
      }));

      // Merge into the current canvas
      useWorkflowStore.setState(state => ({
        nodes: [...state.nodes, ...newNodes],
        edges: [...state.edges, ...newEdges],
      }));

      toast.success(`Imported "${def.block_name}" — ${newNodes.length} nodes added`);
      setImportBlockOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to import block');
    } finally {
      setImportingBlockId(null);
    }
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
        onImportBlock={handleImportBlock}
        onViewCode={handleViewCode}
        onImportScript={handleImportScript}
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
                  onClick={() => handleImportBlockConfirm(b.id)}
                  disabled={importingBlockId === b.id}
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
                  {importingBlockId === b.id && (
                    <CircularProgress size={16} sx={{ color: '#5B7CF6', ml: 1 }} />
                  )}
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
    </Box>
  );
};

export default WorkflowEditor;

// Made with Bob
