import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Chip, CircularProgress, Alert,
  IconButton, Tooltip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ScheduleDialog from '../components/ScheduleDialog';
import { authHeaders, BASE_URL } from '../api/client';
import { fmtDateTime } from '../utils/dateUtils';

export interface ScheduledJob {
  id: number;
  name: string;
  workflow_id: number | null;
  workflow_ids: number[];
  workflow_names: string[];
  schedule_type: 'one_time' | 'cron';
  run_at: string | null;
  cron_expression: string | null;
  is_enabled: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
  run_count: number;
  created_at: string;
}


const cellSx = { color: '#CCC', borderBottom: '1px solid #2a2a2a', py: 1.5 };
const headSx = { color: '#888', borderBottom: '1px solid #333', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: '0.05em', py: 1.5 };

const POLL_INTERVAL_MS = 8000; // refresh every 8 s to catch completed runs

const SchedulerList = () => {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Initial load
  useEffect(() => { fetchJobs(); }, []);

  // Auto-refresh polling — keeps the page live without a manual refresh
  useEffect(() => {
    const id = setInterval(() => {
      fetchJobs(false); // silent refresh (no spinner)
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const fetchJobs = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const res = await fetch(`${BASE_URL}/api/scheduler/`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`Failed to fetch schedules: ${res.statusText}`);
      setJobs(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedules');
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const handleToggle = async (job: ScheduledJob) => {
    try {
      const res = await fetch(`${BASE_URL}/api/scheduler/${job.id}/toggle`, {
        method: 'PATCH',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to toggle schedule');
      const updated: ScheduledJob = await res.json();
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDelete = async (jobId: number) => {
    if (!confirm('Delete this schedule? This cannot be undone.')) return;
    try {
      const res = await fetch(`${BASE_URL}/api/scheduler/${jobId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete schedule');
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleCreated = (job: ScheduledJob) => {
    setJobs((prev) => [job, ...prev]);
    setDialogOpen(false);
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
      {/* Header */}
      <Box
        sx={{
          px: 4, py: 2.5,
          borderBottom: '1px solid #2a2a2a',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, backgroundColor: '#141414',
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
            Scheduler
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mt: 0.25 }}>
            {jobs.length} schedule{jobs.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title="Refresh">
            <IconButton onClick={() => fetchJobs()} size="small" sx={{ color: '#666', '&:hover': { color: '#E0E0F0' } }}>
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
            size="small"
          >
            New Schedule
          </Button>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {jobs.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 2 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: '14px', backgroundColor: '#1c1c1c', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ScheduleIcon sx={{ fontSize: 24, color: '#444' }} />
            </Box>
            <Typography variant="h6" sx={{ color: '#555', fontWeight: 500 }}>No schedules yet</Typography>
            <Typography variant="body2" sx={{ color: '#444', textAlign: 'center', maxWidth: 320 }}>
              Create a schedule to run a workflow automatically at a specific time or on a recurring basis.
            </Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)} size="small" sx={{ mt: 1 }}>
              Create Schedule
            </Button>
          </Box>
        ) : (
          <TableContainer sx={{ backgroundColor: '#1c1c1c', borderRadius: '10px', border: '1px solid #2a2a2a' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={headSx}>Name</TableCell>
                  <TableCell sx={headSx}>Workflow</TableCell>
                  <TableCell sx={headSx}>Schedule</TableCell>
                  <TableCell sx={headSx}>Next / Trigger</TableCell>
                  <TableCell sx={headSx}>Last Run</TableCell>
                  <TableCell sx={headSx}>Runs</TableCell>
                  <TableCell sx={headSx}>Status</TableCell>
                  <TableCell sx={{ ...headSx, textAlign: 'right' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jobs.map((job) => {
                  const isOnce = job.schedule_type === 'one_time';
                  const fired = isOnce && !job.is_enabled && job.run_count > 0;
                  return (
                    <TableRow key={job.id} sx={{ '&:hover': { backgroundColor: '#242424' } }}>
                      <TableCell sx={cellSx}>
                        <Typography variant="body2" sx={{ color: '#E0E0F0', fontWeight: 500 }}>{job.name}</Typography>
                      </TableCell>
                      <TableCell sx={cellSx}>
                        {job.workflow_names && job.workflow_names.length > 0 ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                            {job.workflow_names.map((name, i) => (
                              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography variant="caption" sx={{ color: '#555', fontFamily: 'monospace', minWidth: 14 }}>{i + 1}.</Typography>
                                <Typography variant="body2" sx={{ color: '#AAB' }}>{name}</Typography>
                              </Box>
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" sx={{ color: '#AAB' }}>{`#${job.workflow_id}`}</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={cellSx}>
                        <Chip
                          label={isOnce ? 'One-time' : 'Cron'}
                          size="small"
                          sx={{
                            backgroundColor: isOnce ? 'rgba(246,173,85,0.12)' : 'rgba(91,124,246,0.12)',
                            color: isOnce ? '#F6AD55' : '#7B96F9',
                            border: `1px solid ${isOnce ? 'rgba(246,173,85,0.3)' : 'rgba(91,124,246,0.3)'}`,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={cellSx}>
                        <Typography variant="body2" sx={{ color: '#888', fontFamily: 'monospace', fontSize: 12 }}>
                          {isOnce ? fmtDateTime(job.run_at) : (job.cron_expression ?? '—')}
                        </Typography>
                      </TableCell>
                      <TableCell sx={cellSx}>
                        <Box>
                          <Typography variant="body2" sx={{ color: '#888', fontSize: 12 }}>{fmtDateTime(job.last_run_at)}</Typography>
                          {job.last_run_status && (
                            <Chip
                              label={job.last_run_status}
                              size="small"
                              sx={{
                                mt: 0.5, height: 16, fontSize: 10,
                                backgroundColor:
                                  job.last_run_status === 'success' ? 'rgba(72,187,120,0.12)' :
                                  job.last_run_status === 'partial' ? 'rgba(246,173,85,0.12)' :
                                  'rgba(245,101,101,0.12)',
                                color:
                                  job.last_run_status === 'success' ? '#48BB78' :
                                  job.last_run_status === 'partial' ? '#F6AD55' :
                                  '#F56565',
                              }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell sx={cellSx}>
                        <Typography variant="body2" sx={{ color: '#888' }}>{job.run_count}</Typography>
                      </TableCell>
                      <TableCell sx={cellSx}>
                        {fired ? (
                          <Chip label="Done" size="small" sx={{ backgroundColor: 'rgba(160,160,180,0.1)', color: '#888', border: '1px solid #333' }} />
                        ) : job.is_enabled ? (
                          <Chip label="Enabled" size="small" sx={{ backgroundColor: 'rgba(72,187,120,0.12)', color: '#48BB78', border: '1px solid rgba(72,187,120,0.3)' }} />
                        ) : (
                          <Chip label="Disabled" size="small" sx={{ backgroundColor: 'rgba(160,160,180,0.08)', color: '#666', border: '1px solid #333' }} />
                        )}
                      </TableCell>
                      {/* last_run_status chip: also show "partial" */}
                      <TableCell sx={{ ...cellSx, textAlign: 'right' }}>
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                          {!fired && (
                            <Tooltip title={job.is_enabled ? 'Disable' : 'Enable'}>
                              <IconButton
                                size="small"
                                onClick={() => handleToggle(job)}
                                sx={{
                                  color: job.is_enabled ? '#48BB78' : '#555',
                                  borderRadius: '7px',
                                  '&:hover': { backgroundColor: 'rgba(91,124,246,0.1)', color: '#7B96F9' },
                                }}
                              >
                                {job.is_enabled ? <ToggleOnIcon sx={{ fontSize: 20 }} /> : <ToggleOffIcon sx={{ fontSize: 20 }} />}
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(job.id)}
                              sx={{ color: '#555', borderRadius: '7px', '&:hover': { backgroundColor: 'rgba(245,101,101,0.1)', color: '#F56565' } }}
                            >
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <ScheduleDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={handleCreated} />
    </Box>
  );
};

export default SchedulerList;

// Made with Bob
