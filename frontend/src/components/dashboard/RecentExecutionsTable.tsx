// RecentExecutionsTable.tsx — recent executions with status colours and action buttons
import { Box, Card, CardContent, Typography, Chip, IconButton, Tooltip, TextField, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ListAltIcon from '@mui/icons-material/ListAlt';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { DashboardData } from '../../pages/Dashboard';

interface Props { data: DashboardData | null; loading: boolean; }

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  completed: { bg: 'rgba(72,187,120,0.12)', text: '#48BB78' },
  failed:    { bg: 'rgba(245,101,101,0.12)', text: '#F56565' },
  active:    { bg: 'rgba(91,124,246,0.12)', text: '#7B96F9' },
  draft:     { bg: 'rgba(246,173,85,0.12)', text: '#F6AD55' },
  paused:    { bg: 'rgba(160,160,180,0.12)', text: '#A0A0B4' },
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const s = /[Z+\-]\d*$/.test(iso) ? iso : iso + 'Z';
  return new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDur(sec: number | null) {
  if (sec == null) return '—';
  if (sec < 60) return `${sec.toFixed(1)}s`;
  return `${Math.floor(sec / 60)}m ${Math.round(sec % 60)}s`;
}

const COLS = ['Run ID', 'Workflow', 'Status', 'Started', 'Completed', 'Duration', 'Triggered By', 'Actions'];
const GRID = '2fr 1.5fr 1fr 1.5fr 1.5fr 0.8fr 1fr 120px';

export default function RecentExecutionsTable({ data, loading }: Props) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [wfFilter, setWfFilter] = useState('');

  const rows = data?.recentExecutions ?? [];
  const wfNames = [...new Set(rows.map((r) => r.workflow_name))];

  const filtered = rows.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (wfFilter && r.workflow_name !== wfFilter) return false;
    if (search && !r.run_id.includes(search) && !r.workflow_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const inputSx = {
    color: '#E0E0F0', fontSize: '0.8rem',
    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#2a2a2a' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#3a3a4a' },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#5B7CF6' },
    backgroundColor: '#161620',
  };

  return (
    <Card elevation={0} sx={{
      background: 'linear-gradient(135deg, rgba(30,30,46,0.85) 0%, rgba(20,20,32,0.92) 100%)',
      backdropFilter: 'blur(14px)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '14px',
    }}>
      <CardContent sx={{ p: '20px !important' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ListAltIcon sx={{ fontSize: 18, color: '#5B7CF6' }} />
            <Typography variant="h6" sx={{ color: '#E0E0F0', fontWeight: 600, fontSize: '0.95rem' }}>
              Recent Executions
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField size="small" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)}
              sx={{ '& .MuiInputBase-input': { color: '#E0E0F0', fontSize: '0.8rem' }, '& .MuiOutlinedInput-root': { backgroundColor: '#161620', '& fieldset': { borderColor: '#2a2a2a' } } }} />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel sx={{ color: '#666', fontSize: '0.8rem' }}>Status</InputLabel>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status" sx={inputSx}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
                <MenuItem value="active">Running</MenuItem>
                <MenuItem value="draft">Queued</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel sx={{ color: '#666', fontSize: '0.8rem' }}>Workflow</InputLabel>
              <Select value={wfFilter} onChange={(e) => setWfFilter(e.target.value)} label="Workflow" sx={inputSx}>
                <MenuItem value="">All</MenuItem>
                {wfNames.map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Table */}
        <Box sx={{ overflowX: 'auto' }}>
          {/* Header row */}
          <Box sx={{ display: 'grid', gridTemplateColumns: GRID, px: 2, py: 1, borderBottom: '1px solid #1e1e2e', minWidth: 900 }}>
            {COLS.map((c) => (
              <Typography key={c} variant="caption" sx={{ color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.68rem' }}>{c}</Typography>
            ))}
          </Box>

          {loading ? (
            <Typography variant="body2" sx={{ color: '#444', p: 3 }}>Loading…</Typography>
          ) : filtered.length === 0 ? (
            <Typography variant="body2" sx={{ color: '#444', p: 3 }}>No executions match your filters.</Typography>
          ) : (
            filtered.map((r, idx) => {
              const style = STATUS_STYLE[r.status] ?? STATUS_STYLE.draft;
              const isLast = idx === filtered.length - 1;
              return (
                <Box key={r.run_id} sx={{
                  display: 'grid', gridTemplateColumns: GRID, px: 2, py: 1.5, minWidth: 900,
                  borderBottom: isLast ? 'none' : '1px solid #1a1a28',
                  alignItems: 'center',
                  transition: 'background 0.15s',
                  '&:hover': { background: 'rgba(255,255,255,0.03)' },
                }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#7B96F9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.run_id.slice(0, 16)}…
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#C0C0D0', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.workflow_name}
                  </Typography>
                  <Chip label={r.status} size="small" sx={{ backgroundColor: style.bg, color: style.text, fontWeight: 600, fontSize: '0.7rem', border: `1px solid ${style.text}30` }} />
                  <Typography variant="body2" sx={{ color: '#A0A0B4', fontSize: '0.78rem' }}>{fmtDate(r.started_at)}</Typography>
                  <Typography variant="body2" sx={{ color: '#A0A0B4', fontSize: '0.78rem' }}>{fmtDate(r.completed_at)}</Typography>
                  <Typography variant="body2" sx={{ color: '#A0A0B4', fontSize: '0.78rem' }}>{fmtDur(r.duration_seconds)}</Typography>
                  <Typography variant="body2" sx={{ color: '#A0A0B4', fontSize: '0.78rem' }}>{r.triggered_by}</Typography>
                  <Box sx={{ display: 'flex', gap: 0.25 }}>
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => navigate(`/executions/${r.run_id}`)} sx={{ color: '#555', '&:hover': { color: '#7B96F9', backgroundColor: 'rgba(91,124,246,0.1)' } }}>
                        <OpenInNewIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View Logs">
                      <IconButton size="small" onClick={() => navigate(`/executions/${r.run_id}`)} sx={{ color: '#555', '&:hover': { color: '#F6AD55', backgroundColor: 'rgba(246,173,85,0.1)' } }}>
                        <ListAltIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Replay">
                      <IconButton size="small" sx={{ color: '#555', '&:hover': { color: '#48BB78', backgroundColor: 'rgba(72,187,120,0.1)' } }}>
                        <PlayArrowIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" sx={{ color: '#555', '&:hover': { color: '#F56565', backgroundColor: 'rgba(245,101,101,0.1)' } }}>
                        <DeleteOutlineIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              );
            })
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

// Made with Bob
