import { useEffect, useState, useCallback } from 'react';
import { fmtDateTime } from '../utils/dateUtils';
import { authHeaders, BASE_URL } from '../api/client';
import {
  Box, Typography, Chip, CircularProgress, Alert,
  IconButton, Tooltip, Select, MenuItem, FormControl, InputLabel,
  SelectChangeEvent,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';

interface Execution {
  id: number;
  workflow_id: number;
  run_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  error_message: string | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  completed: { bg: 'rgba(72,187,120,0.12)', text: '#48BB78', dot: '#48BB78' },
  failed:    { bg: 'rgba(245,101,101,0.12)', text: '#F56565', dot: '#F56565' },
  active:    { bg: 'rgba(91,124,246,0.12)', text: '#7B96F9', dot: '#7B96F9' },
  draft:     { bg: 'rgba(246,173,85,0.12)', text: '#F6AD55', dot: '#F6AD55' },
  paused:    { bg: 'rgba(138,138,154,0.12)', text: '#A0A0B4', dot: '#A0A0B4' },
};

function statusStyle(status: string) {
  return STATUS_COLORS[status.toLowerCase()] ?? STATUS_COLORS.draft;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

const formatDate = fmtDateTime;

const ExecutionList = () => {
  const navigate = useNavigate();
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchExecutions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = statusFilter ? `?status_filter=${statusFilter}` : '';
      const response = await fetch(`${BASE_URL}/api/executions${params}`, {
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error(`Failed to fetch executions: ${response.statusText}`);
      setExecutions(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load executions');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchExecutions(); }, [fetchExecutions]);

  const handleDelete = async (runId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this execution run?')) return;
    setDeleting(runId);
    try {
      const response = await fetch(`${BASE_URL}/api/executions/${runId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error('Failed to delete execution');
      setExecutions((prev) => prev.filter((ex) => ex.run_id !== runId));
    } catch (err) {
      alert('Failed to delete: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDeleting(null);
    }
  };

  const handleStatusFilter = (e: SelectChangeEvent) => {
    setStatusFilter(e.target.value);
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <Box
        sx={{
          px: 4, py: 2.5,
          borderBottom: '1px solid #2a2a2a',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
          backgroundColor: '#141414',
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
            Executions
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mt: 0.25 }}>
            {loading ? 'Loading…' : `${executions.length} run${executions.length !== 1 ? 's' : ''}`}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          {/* Status filter */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel sx={{ color: '#666', fontSize: '0.825rem' }}>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={handleStatusFilter}
              label="Status"
              sx={{
                color: '#E0E0F0', fontSize: '0.825rem',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#2a2a2a' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#3a3a4a' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#5B7CF6' },
                backgroundColor: '#1c1c1c',
              }}
            >
              <MenuItem value="">All statuses</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="active">Running</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="paused">Paused</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Refresh">
            <IconButton
              onClick={fetchExecutions}
              size="small"
              sx={{ color: '#666', '&:hover': { color: '#E0E0F0' } }}
            >
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
            <CircularProgress size={28} sx={{ color: '#5B7CF6' }} />
          </Box>
        ) : executions.length === 0 ? (
          <Box
            sx={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', minHeight: 300, gap: 2,
            }}
          >
            <Box
              sx={{
                width: 56, height: 56, borderRadius: '14px',
                backgroundColor: '#1c1c1c', border: '1px solid #2a2a2a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <PlayCircleOutlineIcon sx={{ fontSize: 24, color: '#444' }} />
            </Box>
            <Typography variant="h6" sx={{ color: '#555', fontWeight: 500 }}>
              No executions yet
            </Typography>
            <Typography variant="body2" sx={{ color: '#444', textAlign: 'center', maxWidth: 300 }}>
              Run a workflow from the Workflows page to see execution history here.
            </Typography>
          </Box>
        ) : (
          /* Table */
          <Box
            sx={{
              backgroundColor: '#1c1c1c',
              border: '1px solid #2a2a2a',
              borderRadius: '10px',
              overflow: 'hidden',
            }}
          >
            {/* Table header */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1.5fr 1.5fr 1fr 80px',
                px: 3, py: 1.5,
                borderBottom: '1px solid #2a2a2a',
                backgroundColor: '#161616',
              }}
            >
              {['Run ID', 'Status', 'Started', 'Completed', 'Duration', ''].map((h) => (
                <Typography key={h} variant="caption" sx={{ color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {h}
                </Typography>
              ))}
            </Box>

            {/* Rows */}
            {executions.map((ex, idx) => {
              const style = statusStyle(ex.status);
              const isLast = idx === executions.length - 1;
              return (
                <Box
                  key={ex.run_id}
                  onClick={() => navigate(`/executions/${ex.run_id}`)}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1.5fr 1.5fr 1fr 80px',
                    px: 3, py: 2,
                    borderBottom: isLast ? 'none' : '1px solid #222',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                    '&:hover': { backgroundColor: '#222' },
                  }}
                >
                  {/* Run ID */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                        backgroundColor: style.dot,
                        boxShadow: `0 0 5px ${style.dot}`,
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace', fontSize: '0.78rem', color: '#E0E0F0',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                    >
                      {ex.run_id}
                    </Typography>
                  </Box>

                  {/* Status */}
                  <Box>
                    <Chip
                      label={ex.status.charAt(0).toUpperCase() + ex.status.slice(1).toLowerCase()}
                      size="small"
                      sx={{
                        backgroundColor: style.bg,
                        color: style.text,
                        border: `1px solid ${style.text}30`,
                        fontWeight: 600, fontSize: '0.72rem',
                      }}
                    />
                  </Box>

                  {/* Started */}
                  <Typography variant="body2" sx={{ color: '#A0A0B4', fontSize: '0.8rem' }}>
                    {formatDate(ex.started_at)}
                  </Typography>

                  {/* Completed */}
                  <Typography variant="body2" sx={{ color: '#A0A0B4', fontSize: '0.8rem' }}>
                    {ex.completed_at ? formatDate(ex.completed_at) : (
                      ex.status.toLowerCase() === 'active' ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <CircularProgress size={10} sx={{ color: '#7B96F9' }} />
                          <span style={{ color: '#7B96F9' }}>Running</span>
                        </Box>
                      ) : '—'
                    )}
                  </Typography>

                  {/* Duration */}
                  <Typography variant="body2" sx={{ color: '#A0A0B4', fontSize: '0.8rem' }}>
                    {formatDuration(ex.duration_seconds)}
                  </Typography>

                  {/* Actions */}
                  <Box
                    sx={{ display: 'flex', gap: 0.25, justifyContent: 'flex-end' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Tooltip title="View details">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/executions/${ex.run_id}`)}
                        sx={{
                          color: '#555', borderRadius: '6px',
                          '&:hover': { color: '#7B96F9', backgroundColor: 'rgba(91,124,246,0.1)' },
                        }}
                      >
                        <OpenInNewIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={(e) => handleDelete(ex.run_id, e)}
                        disabled={deleting === ex.run_id}
                        sx={{
                          color: '#555', borderRadius: '6px',
                          '&:hover': { color: '#F56565', backgroundColor: 'rgba(245,101,101,0.1)' },
                        }}
                      >
                        {deleting === ex.run_id
                          ? <CircularProgress size={12} />
                          : <DeleteIcon sx={{ fontSize: 14 }} />
                        }
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ExecutionList;

// Made with Bob
