import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CodeIcon from '@mui/icons-material/Code';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface Block {
  id: number;
  name: string;
  description: string;
  category: string;
  version: number;
  is_public: boolean;
  creator_id: number;
  created_at: string;
  updated_at: string;
}

const BlockList = () => {
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:8000/api/blocks/');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch blocks: ${response.statusText}`);
      }
      
      const data = await response.json();
      setBlocks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load blocks');
      console.error('Error fetching blocks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (blockId: number) => {
    navigate(`/blocks/${blockId}/edit`);
  };

  const handleView = (blockId: number) => {
    navigate(`/blocks/${blockId}`);
  };

  const handleDelete = async (blockId: number) => {
    if (!confirm('Are you sure you want to delete this block?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/blocks/${blockId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete block');
      }

      // Refresh the list
      fetchBlocks();
    } catch (err) {
      alert('Failed to delete block: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Reusable Blocks</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/blocks/new')}
        >
          Create New Block
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {blocks.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" align="center">
              No reusable blocks found. Create your first block to reuse common workflow patterns!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {blocks.map((block) => (
            <Grid item xs={12} sm={6} md={4} key={block.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {block.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {block.description || 'No description'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    <Chip
                      label={block.category}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={`v${block.version}`}
                      size="small"
                      variant="outlined"
                    />
                    {block.is_public && (
                      <Chip
                        label="Public"
                        size="small"
                        color="success"
                      />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Created: {new Date(block.created_at).toLocaleDateString()}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<CodeIcon />}
                    onClick={() => handleView(block.id)}
                  >
                    View
                  </Button>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => handleEdit(block.id)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDelete(block.id)}
                  >
                    Delete
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default BlockList;

// Made with Bob
