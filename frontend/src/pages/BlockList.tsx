import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Chip, CircularProgress, Alert,
  IconButton, Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import ViewModule from '@mui/icons-material/ViewModule';
import AddIcon from '@mui/icons-material/Add';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface BlockVersion {
  nodes: { node_id: string }[];
}

interface Block {
  id: number;
  name: string;
  description: string;
  category: string;
  current_version: number;
  is_public: boolean;
  is_active: boolean;
  creator_id: number;
  created_at: string;
  versions?: BlockVersion[];
}

const BlockList = () => {
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchBlocks = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/blocks', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error(`Failed to fetch blocks: ${response.statusText}`);
      setBlocks(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load blocks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBlocks(); }, []);

  const handleEdit = (blockId: number) => navigate(`/blocks/${blockId}/edit`);

  const handleDelete = async (blockId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this block? Workflows using it will lose the reference.')) return;
    setDeleting(blockId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8000/api/blocks/${blockId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to delete block');
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    } catch (err) {
      alert('Delete failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDeleting(null);
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
            Reusable Blocks
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mt: 0.25 }}>
            {blocks.length} block{blocks.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchBlocks} size="small" sx={{ color: '#666', '&:hover': { color: '#E0E0F0' } }}>
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/blocks/new')}
            size="small"
          >
            New Block
          </Button>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {blocks.length === 0 ? (
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
              <ViewModule sx={{ fontSize: 24, color: '#444' }} />
            </Box>
            <Typography variant="h6" sx={{ color: '#555', fontWeight: 500 }}>
              No blocks yet
            </Typography>
            <Typography variant="body2" sx={{ color: '#444', textAlign: 'center', maxWidth: 340 }}>
              Click <strong style={{ color: '#A0A0B4' }}>New Block</strong> to build one from scratch by dragging nodes,
              or use the <strong style={{ color: '#A0A0B4' }}>Record</strong> button inside the editor to capture real browser actions.
              Blocks appear in the node palette so you can import them into any workflow.
            </Typography>
            <Button
              variant="outlined" startIcon={<AddIcon />}
              onClick={() => navigate('/blocks/new')}
              size="small" sx={{ mt: 1 }}
            >
              Create First Block
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
            {blocks.map((block) => (
              <Box
                key={block.id}
                sx={{
                  backgroundColor: '#1c1c1c',
                  border: '1px solid #2a2a2a',
                  borderRadius: '10px',
                  p: 2.5,
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    borderColor: '#3a3a4a',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
                  },
                }}
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
                    <ViewModule sx={{ fontSize: 16, color: '#7B96F9' }} />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    {/* Node count badge */}
                    {(() => {
                      const nodeCount = block.versions?.[0]?.nodes?.length ?? null;
                      return nodeCount !== null ? (
                        <Chip
                          label={`${nodeCount} node${nodeCount !== 1 ? 's' : ''}`}
                          size="small"
                          sx={{ backgroundColor: '#1e1e1e', color: '#666', border: '1px solid #2a2a2a', fontSize: '0.7rem' }}
                        />
                      ) : null;
                    })()}
                    {block.is_public && (
                      <Chip
                        label="Public"
                        size="small"
                        sx={{ backgroundColor: 'rgba(72,187,120,0.12)', color: '#48BB78', border: '1px solid rgba(72,187,120,0.2)', fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                </Box>

                {/* Name */}
                <Typography
                  variant="h6"
                  sx={{
                    color: '#FFFFFF', fontWeight: 600, mb: 0.5,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {block.name}
                </Typography>

                {/* Description */}
                <Typography
                  variant="body2"
                  sx={{
                    color: '#666', mb: 2, flex: 1,
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}
                >
                  {block.description || 'No description'}
                </Typography>

                {/* Meta chips */}
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
                  {block.category && (
                    <Chip
                      label={block.category}
                      size="small"
                      sx={{ backgroundColor: '#242424', color: '#A0A0B4', border: '1px solid #333' }}
                    />
                  )}
                  <Chip
                    label={`v${block.current_version}`}
                    size="small"
                    sx={{ backgroundColor: '#242424', color: '#A0A0B4', border: '1px solid #333' }}
                  />
                </Box>

                <Typography variant="caption" sx={{ color: '#444', mb: 2 }}>
                  {new Date(
                    /[Z+\-]\d*$/.test(block.created_at) ? block.created_at : block.created_at + 'Z'
                  ).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Typography>

                {/* Actions */}
                <Box sx={{ display: 'flex', gap: 0.75, pt: 2, borderTop: '1px solid #242424', alignItems: 'center' }}>
                  <Tooltip title="Block ID">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 'auto' }}>
                      <InfoOutlinedIcon sx={{ fontSize: 13, color: '#444' }} />
                      <Typography variant="caption" sx={{ color: '#444', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                        #{block.id}
                      </Typography>
                    </Box>
                  </Tooltip>
                  <Tooltip title="Edit block">
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(block.id)}
                      sx={{
                        color: '#7B96F9', borderRadius: '7px',
                        '&:hover': { backgroundColor: 'rgba(91,124,246,0.1)', color: '#9BB2FF' },
                      }}
                    >
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={(e) => handleDelete(block.id, e)}
                      disabled={deleting === block.id}
                      sx={{
                        color: '#666', borderRadius: '7px',
                        '&:hover': { backgroundColor: 'rgba(245,101,101,0.1)', color: '#F56565' },
                      }}
                    >
                      {deleting === block.id
                        ? <CircularProgress size={14} />
                        : <DeleteIcon sx={{ fontSize: 16 }} />
                      }
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>

    </Box>
  );
};

export default BlockList;

// Made with Bob
