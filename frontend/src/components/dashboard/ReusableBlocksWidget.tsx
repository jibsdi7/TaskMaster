// ReusableBlocksWidget.tsx — list of reusable blocks with drag indicator
import { Box, Card, CardContent, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';

interface Block { id: number; name: string; description?: string; version?: string; meta_data?: any; }
interface Props { blocks: Block[]; loading: boolean; }

const BLOCK_COLORS = ['#5B7CF6', '#48BB78', '#F6AD55', '#7C5CF6', '#F56565', '#3B82F6'];

export default function ReusableBlocksWidget({ blocks, loading }: Props) {
  const navigate = useNavigate();

  return (
    <Card elevation={0} sx={{
      background: 'linear-gradient(135deg, rgba(30,30,46,0.85) 0%, rgba(20,20,32,0.92) 100%)',
      backdropFilter: 'blur(14px)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '14px',
      transition: 'box-shadow 0.2s',
      '&:hover': { boxShadow: '0 8px 32px rgba(0,0,0,0.4)' },
    }}>
      <CardContent sx={{ p: '20px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <ViewModuleIcon sx={{ fontSize: 18, color: '#7C5CF6' }} />
          <Typography variant="h6" sx={{ color: '#E0E0F0', fontWeight: 600, fontSize: '0.95rem' }}>
            Reusable Blocks
          </Typography>
          <Chip size="small" label={`${blocks.length}`} sx={{ ml: 'auto', backgroundColor: 'rgba(124,92,246,0.15)', color: '#9C7CF9', fontSize: '0.7rem', height: 20, border: '1px solid rgba(124,92,246,0.3)' }} />
        </Box>

        {loading ? (
          <Typography variant="body2" sx={{ color: '#444' }}>Loading…</Typography>
        ) : blocks.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#555', py: 1 }}>No blocks in library yet.</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {blocks.map((b, i) => {
              const color = BLOCK_COLORS[i % BLOCK_COLORS.length];
              const usageCount = b.meta_data?.usage_count ?? 0;
              return (
                <Box key={b.id} sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1,
                  borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  transition: 'background 0.15s, border-color 0.15s',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.055)', borderColor: `${color}30` },
                  cursor: 'grab',
                }}>
                  <DragIndicatorIcon sx={{ fontSize: 14, color: '#444', flexShrink: 0 }} />
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ color: '#D0D0E0', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#555', fontSize: '0.7rem' }}>
                      v{b.version ?? '1.0.0'} · {usageCount} use{usageCount !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                  <Tooltip title="Edit block">
                    <IconButton size="small" onClick={() => navigate(`/blocks/${b.id}/edit`)} sx={{ color: '#444', '&:hover': { color: '#7C5CF6', backgroundColor: 'rgba(124,92,246,0.1)' } }}>
                      <EditIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              );
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// Made with Bob
