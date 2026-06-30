import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Grid, Chip, CircularProgress, Alert,
  IconButton, Tooltip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

interface Workflow {
  id: number;
  name: string;
  description: string;
  project_id: number;
  creator_id: number;
  version: number;
  is_active: boolean;
  metadata: any;
  nodes: any[];
  edges: any[];
  created_at: string;
  updated_at: string;
}

const WorkflowList = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchWorkflows(); }, []);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:8000/api/workflows/');
      if (!response.ok) throw new Error(`Failed to fetch workflows: ${response.statusText}`);
      setWorkflows(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const handleRun = async (workflowId: number) => {
    const url = prompt('Enter the URL to execute the workflow on:', 'https://example.com');
    if (!url) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) throw new Error('Failed to execute workflow');
      const data = await response.json();
      if (data.run_id) navigate(`/executions/${data.run_id}`);
    } catch (err) {
      alert('Failed to execute workflow: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDelete = async (workflowId: number) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/workflows/${workflowId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete workflow');
      fetchWorkflows();
    } catch (err) {
      alert('Failed to delete workflow: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
        <CircularProgress size={28} sx={{ color: '#5B7CF6' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Page header */}
      <Box
        sx={{
          px: 4, py: 2.5,
          borderBottom: '1px solid #2a2a2a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          backgroundColor: '#141414',
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
            Workflows
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mt: 0.25 }}>
            {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchWorkflows} size="small" sx={{ color: '#666', '&:hover': { color: '#E0E0F0' } }}>
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/workflows/new')}
            size="small"
          >
            New Workflow
          </Button>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        )}

        {workflows.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 300,
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 56, height: 56, borderRadius: '14px',
                backgroundColor: '#1c1c1c',
                border: '1px solid #2a2a2a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <AccountTreeIcon sx={{ fontSize: 24, color: '#444' }} />
            </Box>
            <Typography variant="h6" sx={{ color: '#555', fontWeight: 500 }}>
              No workflows yet
            </Typography>
            <Typography variant="body2" sx={{ color: '#444', textAlign: 'center', maxWidth: 300 }}>
              Record a browser session or build one manually to get started.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => navigate('/workflows/new')}
              size="small"
              sx={{ mt: 1 }}
            >
              Create Workflow
            </Button>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {workflows.map((workflow) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={workflow.id}>
                <Box
                  sx={{
                    backgroundColor: '#1c1c1c',
                    border: '1px solid #2a2a2a',
                    borderRadius: '10px',
                    p: 2.5,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: '#3a3a4a',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
                    },
                  }}
                  onClick={() => navigate(`/workflows/${workflow.id}`)}
                >
                  {/* Card header */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box
                      sx={{
                        width: 36, height: 36, borderRadius: '9px',
                        background: 'linear-gradient(135deg, rgba(91,124,246,0.2) 0%, rgba(124,92,246,0.2) 100%)',
                        border: '1px solid rgba(91,124,246,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}
                    >
                      <AccountTreeIcon sx={{ fontSize: 16, color: '#7B96F9' }} />
                    </Box>
                    {workflow.is_active && (
                      <Box
                        sx={{
                          width: 7, height: 7, borderRadius: '50%',
                          backgroundColor: '#48BB78',
                          boxShadow: '0 0 6px rgba(72,187,120,0.6)',
                          mt: 0.5,
                        }}
                      />
                    )}
                  </Box>

                  {/* Name & description */}
                  <Typography
                    variant="h6"
                    sx={{
                      color: '#FFFFFF', fontWeight: 600, mb: 0.5,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    {workflow.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#666', mb: 2, flex: 1,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}
                  >
                    {workflow.description || 'No description'}
                  </Typography>

                  {/* Meta chips */}
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
                    <Chip
                      label={`${workflow.nodes.length} nodes`}
                      size="small"
                      sx={{ backgroundColor: '#242424', color: '#A0A0B4', border: '1px solid #333' }}
                    />
                    <Chip
                      label={`v${workflow.version}`}
                      size="small"
                      sx={{ backgroundColor: '#242424', color: '#A0A0B4', border: '1px solid #333' }}
                    />
                  </Box>

                  <Typography variant="caption" sx={{ color: '#444', mb: 2 }}>
                    {new Date(workflow.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Typography>

                  {/* Actions */}
                  <Box
                    sx={{ display: 'flex', gap: 0.75, pt: 2, borderTop: '1px solid #242424' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Tooltip title="Run">
                      <IconButton
                        size="small"
                        onClick={() => handleRun(workflow.id)}
                        sx={{
                          color: '#48BB78', borderRadius: '7px',
                          '&:hover': { backgroundColor: 'rgba(72,187,120,0.1)' },
                        }}
                      >
                        <PlayArrowIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/workflows/${workflow.id}`)}
                        sx={{
                          color: '#7B96F9', borderRadius: '7px',
                          '&:hover': { backgroundColor: 'rgba(91,124,246,0.1)' },
                        }}
                      >
                        <EditIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(workflow.id)}
                        sx={{
                          color: '#666', borderRadius: '7px', ml: 'auto',
                          '&:hover': { backgroundColor: 'rgba(245,101,101,0.1)', color: '#F56565' },
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  );
};

export default WorkflowList;

// Made with Bob
