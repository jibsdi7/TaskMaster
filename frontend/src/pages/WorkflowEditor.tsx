import { useEffect, useCallback, useState } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button
} from '@mui/material';
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
      const response = await axios.get(`http://localhost:8000/api/workflows/${workflowId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const workflow = response.data;
      
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

      loadWorkflow({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        nodes: flowNodes,
        edges: flowEdges,
      });

      toast.success('Workflow loaded successfully');
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
      
      // Transform React Flow data to backend format
      const workflowData = {
        name: workflowName,
        description: 'Workflow created with TaskMaster',
        project_id: 1, // TODO: Get from context or selection
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
        // Update existing workflow
        response = await axios.put(
          `http://localhost:8000/api/workflows/${workflowId}`,
          workflowData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Workflow updated successfully');
      } else {
        // Create new workflow
        response = await axios.post(
          'http://localhost:8000/api/workflows',
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
      const response = await axios.post(
        'http://localhost:8000/api/recorder/stop',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setIsRecording(false);
      setStatus('idle');
      
      // Load recorded actions as nodes
      if (response.data.actions && response.data.actions.length > 0) {
        toast.success(`Recording stopped. ${response.data.actions.length} actions captured.`);
        // TODO: Convert actions to nodes and add to canvas
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
      toast.success('Workflow execution started');
      
      // Navigate to execution details
      if (response.data.run_id) {
        navigate(`/executions/${response.data.run_id}`);
      }
    } catch (error: any) {
      console.error('Failed to run workflow:', error);
      toast.error(error.response?.data?.detail || 'Failed to run workflow');
      setStatus('idle');
    }
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#1a1a1a' }}>
      <WorkflowToolbar
        workflowName={workflowName}
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
    </Box>
  );
};

export default WorkflowEditor;

// Made with Bob
