import { Box, Typography, TextField, Accordion, AccordionSummary, AccordionDetails, Chip } from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Mouse as ClickIcon,
  Keyboard as TypeIcon,
  CheckBox as SelectIcon,
  TouchApp as HoverIcon,
  Upload as UploadIcon,
  ArrowForward as NavigateIcon,
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  Schedule as DelayIcon,
  CallSplit as ConditionIcon,
  Loop as LoopIcon,
  Storage as VariableIcon,
  Api as ApiIcon,
  ViewModule as BlockIcon,
} from '@mui/icons-material';
import { useState } from 'react';

interface NodeTemplate {
  type: string;
  label: string;
  icon: any;
  category: string;
  description: string;
}

const nodeTemplates: NodeTemplate[] = [
  // Browser Actions
  { type: 'CLICK', label: 'Click', icon: ClickIcon, category: 'Browser Actions', description: 'Click an element' },
  { type: 'TYPE', label: 'Type', icon: TypeIcon, category: 'Browser Actions', description: 'Type text into input' },
  { type: 'SELECT', label: 'Select', icon: SelectIcon, category: 'Browser Actions', description: 'Select dropdown option' },
  { type: 'HOVER', label: 'Hover', icon: HoverIcon, category: 'Browser Actions', description: 'Hover over element' },
  { type: 'UPLOAD_FILE', label: 'Upload File', icon: UploadIcon, category: 'Browser Actions', description: 'Upload file' },
  
  // Navigation
  { type: 'OPEN_URL', label: 'Open URL', icon: NavigateIcon, category: 'Navigation', description: 'Navigate to URL' },
  { type: 'BACK', label: 'Back', icon: BackIcon, category: 'Navigation', description: 'Go back' },
  { type: 'REFRESH', label: 'Refresh', icon: RefreshIcon, category: 'Navigation', description: 'Refresh page' },
  
  // Control Flow
  { type: 'DELAY', label: 'Delay', icon: DelayIcon, category: 'Control Flow', description: 'Wait for duration' },
  { type: 'IF_CONDITION', label: 'If Condition', icon: ConditionIcon, category: 'Control Flow', description: 'Conditional branch' },
  { type: 'LOOP', label: 'Loop', icon: LoopIcon, category: 'Control Flow', description: 'Repeat actions' },
  
  // Data
  { type: 'VARIABLE', label: 'Variable', icon: VariableIcon, category: 'Data', description: 'Store/retrieve data' },
  { type: 'API_REQUEST', label: 'API Request', icon: ApiIcon, category: 'Data', description: 'Make HTTP request' },
  
  // Reusable Blocks
  { type: 'BLOCK', label: 'Reusable Block', icon: BlockIcon, category: 'Reusable Blocks', description: 'Use saved workflow' },
];

const NodePalette = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    'Browser Actions',
    'Navigation',
    'Control Flow',
  ]);

  const filteredNodes = nodeTemplates.filter(
    (node) =>
      node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = Array.from(new Set(filteredNodes.map((node) => node.category)));

  const handleCategoryToggle = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ nodeType, label }));
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
              '&.Mui-focused fieldset': { borderColor: '#1976d2' },
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
                sx={{
                  minHeight: 48,
                  '& .MuiAccordionSummary-content': { my: 1 },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2">{category}</Typography>
                  <Chip
                    label={categoryNodes.length}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: 11,
                      backgroundColor: '#1976d2',
                      color: 'white',
                    }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 1 }}>
                {categoryNodes.map((node) => {
                  const Icon = node.icon;
                  return (
                    <Box
                      key={node.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, node.type, node.label)}
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
                        '&:hover': {
                          backgroundColor: '#333',
                          transform: 'translateX(4px)',
                        },
                        '&:active': {
                          cursor: 'grabbing',
                        },
                      }}
                    >
                      <Icon sx={{ fontSize: 20, color: '#1976d2' }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {node.label}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#888' }}>
                          {node.description}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
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
