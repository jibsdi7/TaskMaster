import { useState, useMemo } from 'react';
import {
  Popover,
  Box,
  Typography,
  TextField,
  InputAdornment,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { STATIC_NODES, NODE_COLORS, NodeTemplate } from './nodeTemplates';

interface InsertNodePopupProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  /** Called when the user picks a node type to insert */
  onSelect: (nodeType: string, label: string, blockId?: number) => void;
  /** Extra block nodes fetched from server (optional) */
  extraNodes?: NodeTemplate[];
}

const InsertNodePopup = ({
  anchorEl,
  open,
  onClose,
  onSelect,
  extraNodes = [],
}: InsertNodePopupProps) => {
  const [query, setQuery] = useState('');

  const allNodes = useMemo(
    () => [...STATIC_NODES, ...extraNodes],
    [extraNodes]
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return q
      ? allNodes.filter(
          (n) =>
            n.label.toLowerCase().includes(q) ||
            n.description.toLowerCase().includes(q) ||
            n.category.toLowerCase().includes(q)
        )
      : allNodes;
  }, [allNodes, query]);

  const categories = useMemo(
    () => Array.from(new Set(filtered.map((n) => n.category))),
    [filtered]
  );

  const handleSelect = (node: NodeTemplate) => {
    onSelect(node.type, node.label, node.blockId);
    setQuery('');
    onClose();
  };

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      slotProps={{
        paper: {
          sx: {
            mt: 0.5,
            width: 280,
            maxHeight: 420,
            backgroundColor: '#1e1e1e',
            border: '1px solid #3a3a3a',
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* Header */}
      <Box sx={{ px: 1.5, pt: 1.5, pb: 1, borderBottom: '1px solid #2a2a2a', flexShrink: 0 }}>
        <Typography
          variant="caption"
          sx={{ color: '#888', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', mb: 1 }}
        >
          Insert node
        </Typography>
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder="Search actions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 16, color: '#666' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#2a2a2a',
              color: 'white',
              fontSize: 13,
              '& fieldset': { borderColor: '#3a3a3a' },
              '&:hover fieldset': { borderColor: '#555' },
              '&.Mui-focused fieldset': { borderColor: '#5B7CF6' },
            },
            '& .MuiInputBase-input': { color: 'white', py: 0.8 },
          }}
        />
      </Box>

      {/* Scrollable list */}
      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        {categories.length === 0 && (
          <Typography
            variant="body2"
            sx={{ color: '#555', textAlign: 'center', py: 3 }}
          >
            No actions found
          </Typography>
        )}

        {categories.map((category, catIdx) => {
          const nodes = filtered.filter((n) => n.category === category);
          return (
            <Box key={category}>
              {/* Category label */}
              <Box sx={{ px: 1.5, pt: catIdx === 0 ? 1.5 : 1, pb: 0.5 }}>
                <Typography
                  variant="caption"
                  sx={{ color: '#555', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}
                >
                  {category}
                </Typography>
              </Box>

              {/* Nodes in category */}
              {nodes.map((node) => {
                const Icon = node.icon;
                const color = NODE_COLORS[node.type] || '#757575';
                return (
                  <Box
                    key={node.type + (node.blockId ?? '')}
                    onClick={() => handleSelect(node)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      mx: 1,
                      mb: 0.5,
                      px: 1,
                      py: 0.8,
                      borderRadius: 1,
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      '&:hover': {
                        backgroundColor: '#2a2a2a',
                      },
                    }}
                  >
                    {/* Coloured icon badge — fall back to BlockIcon for server-fetched blocks */}
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 1,
                        backgroundColor: `${color}22`,
                        border: `1px solid ${color}55`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {Icon
                        ? <Icon sx={{ fontSize: 15, color }} />
                        : <ViewModuleIcon sx={{ fontSize: 15, color }} />}
                    </Box>

                    {/* Label + description */}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'white',
                          fontWeight: 500,
                          fontSize: 13,
                          lineHeight: 1.2,
                        }}
                      >
                        {node.label}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: '#666',
                          fontSize: 11,
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {node.description}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}

              {catIdx < categories.length - 1 && (
                <Divider sx={{ borderColor: '#2a2a2a', mx: 1, mt: 0.5 }} />
              )}
            </Box>
          );
        })}
      </Box>
    </Popover>
  );
};

export default InsertNodePopup;

// Made with Bob
