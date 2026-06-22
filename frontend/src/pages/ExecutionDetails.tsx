import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import axios from 'axios';

interface WorkflowLog {
  level: string;
  message: string;
  node_id: string | null;
  timestamp: string;
}

interface ExecutionRun {
  id: number;
  workflow_id: number;
  run_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  error_message: string | null;
  logs: WorkflowLog[];
  result: any;
}

const ExecutionDetails = () => {
  const { runId } = useParams<{ runId: string }>();
  const [execution, setExecution] = useState<ExecutionRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);

  const fetchExecution = async () => {
    try {
      const response = await axios.get(`http://localhost:8000/api/executions/${runId}`);
      setExecution(response.data);
      
      // Stop polling if execution is completed or failed
      if (response.data.status === 'COMPLETED' || response.data.status === 'FAILED') {
        setPolling(false);
      }
      
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch execution details');
      setPolling(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExecution();
  }, [runId]);

  // Poll for updates every 2 seconds while execution is running
  useEffect(() => {
    if (!polling) return;

    const interval = setInterval(() => {
      fetchExecution();
    }, 2000);

    return () => clearInterval(interval);
  }, [polling, runId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'FAILED':
        return 'error';
      case 'RUNNING':
        return 'info';
      case 'DRAFT':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'error';
      case 'WARNING':
        return 'warning';
      case 'INFO':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading && !execution) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !execution) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!execution) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Execution not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Execution Details</Typography>
        <Chip
          label={execution.status}
          color={getStatusColor(execution.status) as any}
          sx={{ fontWeight: 'bold' }}
        />
      </Box>

      {polling && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={20} />
            <Typography>Execution in progress... Auto-refreshing every 2 seconds</Typography>
          </Box>
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Execution Information
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Run ID
            </Typography>
            <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
              {execution.run_id}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Workflow ID
            </Typography>
            <Typography variant="body1">{execution.workflow_id}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Started At
            </Typography>
            <Typography variant="body1">
              {new Date(execution.started_at).toLocaleString()}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Completed At
            </Typography>
            <Typography variant="body1">
              {execution.completed_at
                ? new Date(execution.completed_at).toLocaleString()
                : 'In Progress'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Duration
            </Typography>
            <Typography variant="body1">
              {execution.duration_seconds
                ? `${execution.duration_seconds.toFixed(2)}s`
                : 'N/A'}
            </Typography>
          </Box>
        </Box>

        {execution.error_message && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Error Message
            </Typography>
            <Alert severity="error" sx={{ mt: 1 }}>
              {execution.error_message}
            </Alert>
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Real-time Execution Logs
        </Typography>
        {execution.logs && execution.logs.length > 0 ? (
          <List sx={{ maxHeight: '500px', overflow: 'auto', bgcolor: '#f5f5f5', borderRadius: 1 }}>
            {execution.logs.map((log, index) => (
              <Box key={index}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={log.level}
                          size="small"
                          color={getLogLevelColor(log.level) as any}
                        />
                        {log.node_id && (
                          <Chip label={`Node: ${log.node_id}`} size="small" variant="outlined" />
                        )}
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {log.message}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < execution.logs.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        ) : (
          <Alert severity="info">No logs available yet</Alert>
        )}
      </Paper>

      {execution.result && Object.keys(execution.result).length > 0 && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Execution Result
          </Typography>
          <Box
            sx={{
              bgcolor: '#f5f5f5',
              p: 2,
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              overflow: 'auto',
            }}
          >
            <pre>{JSON.stringify(execution.result, null, 2)}</pre>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default ExecutionDetails;

// Made with Bob
