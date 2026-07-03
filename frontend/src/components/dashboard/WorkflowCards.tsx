// WorkflowCards.tsx — grid of workflow cards with Run/Edit/Duplicate/Delete buttons
import { Box, Card, CardContent, Typography, Chip, IconButton, Tooltip, CircularProgress } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { useNavigate } from 'react-router-dom';

interface WorkflowCardData {
  id: number;
  name: string;
  description: string;
  nodes: any[];
  edges: any[];
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  meta_data?: any;
}

interface Props { workflows: WorkflowCardData[]; loading: boolean; onRun: (id: number) => void; onDelete: (id: number) => void; }

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso + 'Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function WorkflowCards({ workflows, loading, onRun, onDelete }: Props) {
  const navigate = useNavigate();

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
      <CircularProgress size={28} sx={{ color: '#5B7CF6' }} />
    </Box>
  );

  if (workflows.length === 0) return (
    <Box sx={{ py: 4, textAlign: 'center' }}>
      <Typography variant="body2" sx={{ color: '#555' }}>No workflows yet.</Typography>
    </Box>
  );

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
      {workflows.map((wf) => (
        <Card key={wf.id} elevation={0} sx={{
          background: 'linear-gradient(135deg, rgba(30,30,46,0.85) 0%, rgba(20,20,32,0.92) 100%)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 10px 32px rgba(0,0,0,0.5)',
            borderColor: 'rgba(91,124,246,0.25)',
          },
        }}>
          <CardContent sx={{ p: '18px !important' }}>
            {/* Header row */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h6" sx={{ color: '#E0E0F0', fontWeight: 600, fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {wf.name}
                </Typography>
                {wf.description && (
                  <Typography variant="caption" sx={{ color: '#666', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mt: 0.25 }}>
                    {wf.description}
                  </Typography>
                )}
              </Box>
              <Chip
                size="small"
                label={wf.is_active ? 'Active' : 'Inactive'}
                sx={{
                  ml: 1, flexShrink: 0, fontSize: '0.68rem', fontWeight: 700, height: 20,
                  backgroundColor: wf.is_active ? 'rgba(72,187,120,0.12)' : 'rgba(160,160,180,0.12)',
                  color: wf.is_active ? '#48BB78' : '#A0A0B4',
                  border: `1px solid ${wf.is_active ? '#48BB78' : '#A0A0B4'}30`,
                }}
              />
            </Box>

            {/* Stats row */}
            <Box sx={{ display: 'flex', gap: 2, mb: 1.5, mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccountTreeIcon sx={{ fontSize: 13, color: '#5B7CF6' }} />
                <Typography variant="caption" sx={{ color: '#888', fontSize: '0.75rem' }}>{wf.nodes?.length ?? 0} nodes</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ViewModuleIcon sx={{ fontSize: 13, color: '#7C5CF6' }} />
                <Typography variant="caption" sx={{ color: '#888', fontSize: '0.75rem' }}>
                  {(wf.nodes ?? []).filter((n: any) => n.node_type === 'BLOCK').length} blocks
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#555', fontSize: '0.75rem' }}>v{wf.version}</Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
              <Typography variant="caption" sx={{ color: '#555', fontSize: '0.72rem' }}>Created {fmtDate(wf.created_at)}</Typography>
            </Box>

            {/* Action buttons */}
            <Box sx={{ display: 'flex', gap: 0.5, mt: 1, borderTop: '1px solid #1e1e2e', pt: 1.25 }}>
              <Tooltip title="Run">
                <IconButton size="small" onClick={() => onRun(wf.id)} sx={{ color: '#555', '&:hover': { color: '#48BB78', backgroundColor: 'rgba(72,187,120,0.1)' } }}>
                  <PlayArrowIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => navigate(`/workflows/${wf.id}`)} sx={{ color: '#555', '&:hover': { color: '#7B96F9', backgroundColor: 'rgba(91,124,246,0.1)' } }}>
                  <EditIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Duplicate">
                <IconButton size="small" sx={{ color: '#555', '&:hover': { color: '#F6AD55', backgroundColor: 'rgba(246,173,85,0.1)' } }}>
                  <ContentCopyIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton size="small" onClick={() => onDelete(wf.id)} sx={{ color: '#555', '&:hover': { color: '#F56565', backgroundColor: 'rgba(245,101,101,0.1)' } }}>
                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

// Made with Bob
