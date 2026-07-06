import { Box, Typography, TextField, Accordion, AccordionSummary, AccordionDetails, Chip, CircularProgress } from '@mui/material';
import { authHeaders, BASE_URL } from '../../api/client';
import { ExpandMore as ExpandMoreIcon, ViewModule as BlockIcon } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { STATIC_NODES, NodeTemplate } from './nodeTemplates';

interface Block {
  id: number;
  name: string;
  description: string;
  category: string;
  current_version: number;
}

const NodePalette = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    'Browser Actions',
    'Navigation',
    'Control Flow',
  ]);

  // Fetch saved blocks
  useEffect(() => {
    const fetchBlocks = async () => {
      setBlocksLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/api/blocks`, {
          headers: authHeaders(),
        });
        if (res.ok) setBlocks(await res.json());
      } catch {
        // silently fail — blocks section just stays empty
      } finally {
        setBlocksLoading(false);
      }
    };
    fetchBlocks();
  }, []);

  // Merge static nodes + live blocks into unified template list
  const blockNodes: NodeTemplate[] = blocks.map((b) => ({
    type: 'BLOCK',
    label: b.name,
    icon: BlockIcon,
    category: 'Reusable Blocks',
    description: b.description || 'Saved block',
    blockId: b.id,
  }));

  const allNodes: NodeTemplate[] = [...STATIC_NODES, ...blockNodes];

  const filteredNodes = allNodes.filter(
    (node) =>
      node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = Array.from(new Set(filteredNodes.map((n) => n.category)));

  const handleCategoryToggle = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const onDragStart = (event: React.DragEvent, node: NodeTemplate) => {
    event.dataTransfer.setData(
      'application/reactflow',
      JSON.stringify({
        nodeType: node.type,
        label: node.label,
        blockId: node.blockId ?? null,
      })
    );
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <Box
      sx={{
        width: 280,
        height: '100%',
        backgroundColor: '#1e1e1e',
        borderRight: '1px solid #333',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid #333' }}>
        <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>
          Nodes
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#2a2a2a',
              color: 'white',
              '& fieldset': { borderColor: '#444' },
              '&:hover fieldset': { borderColor: '#666' },
              '&.Mui-focused fieldset': { borderColor: '#5B7CF6' },
            },
            '& .MuiInputBase-input': { color: 'white' },
          }}
        />
      </Box>

      {/* Node Categories */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
        {categories.map((category) => {
          const categoryNodes = filteredNodes.filter((node) => node.category === category);
          const isExpanded = expandedCategories.includes(category);
          const isBlocksCategory = category === 'Reusable Blocks';

          return (
            <Accordion
              key={category}
              expanded={isExpanded}
              onChange={() => handleCategoryToggle(category)}
              sx={{
                backgroundColor: '#252525',
                color: 'white',
                mb: 1,
                '&:before': { display: 'none' },
                boxShadow: 'none',
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}
                sx={{ minHeight: 48, '& .MuiAccordionSummary-content': { my: 1 } }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2">{category}</Typography>
                  {isBlocksCategory && blocksLoading ? (
                    <CircularProgress size={12} sx={{ color: '#5B7CF6' }} />
                  ) : (
                    <Chip
                      label={categoryNodes.length}
                      size="small"
                      sx={{
                        height: 20, fontSize: 11,
                        backgroundColor: isBlocksCategory ? 'rgba(91,124,246,0.25)' : '#1976d2',
                        color: 'white',
                      }}
                    />
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 1 }}>
                {isBlocksCategory && !blocksLoading && categoryNodes.length === 0 ? (
                  <Typography variant="caption" sx={{ color: '#555', display: 'block', px: 1, py: 0.5 }}>
                    No blocks yet. Save a workflow as a block to see it here.
                  </Typography>
                ) : (
                  categoryNodes.map((node) => {
                    const Icon = node.icon;
                    return (
                      <Box
                        key={node.type + (node.blockId ?? '')}
                        draggable
                        onDragStart={(e) => onDragStart(e, node)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          p: 1.5,
                          mb: 1,
                          backgroundColor: '#2a2a2a',
                          borderRadius: 1,
                          cursor: 'grab',
                          transition: 'all 0.2s',
                          border: isBlocksCategory ? '1px solid rgba(91,124,246,0.2)' : '1px solid transparent',
                          '&:hover': {
                            backgroundColor: '#333',
                            transform: 'translateX(4px)',
                          },
                          '&:active': { cursor: 'grabbing' },
                        }}
                      >
                        <Icon sx={{ fontSize: 20, color: isBlocksCategory ? '#7B96F9' : '#1976d2', flexShrink: 0 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 500,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}
                          >
                            {node.label}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#888',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
                            }}
                          >
                            {node.description}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })
                )}
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>
    </Box>
  );
};

export default NodePalette;

// Made with Bob
