import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { useWorkflowStore } from '../../store/workflowStore';
import { toast } from 'react-toastify';

const NodeInspector = () => {
  const { nodes, selectedNodeId, updateNode, setSelectedNodeId } = useWorkflowStore();
  
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  
  const [localData, setLocalData] = useState<any>({});

  useEffect(() => {
    if (selectedNode) {
      setLocalData({
        label: selectedNode.data.label || '',
        nodeType: selectedNode.data.nodeType || '',
        selector: selectedNode.data.config?.selector || '',
        value: selectedNode.data.config?.value || '',
        url: selectedNode.data.config?.url || '',
        timeout: selectedNode.data.config?.timeout || 30000,
        retryCount: selectedNode.data.config?.retryCount || 3,
        waitForSelector: selectedNode.data.config?.waitForSelector || true,
        screenshot: selectedNode.data.config?.screenshot || false,
        description: selectedNode.data.config?.description || '',
      });
    }
  }, [selectedNode]);

  if (!selectedNode) {
    return (
      <Box
        sx={{
          width: 320,
          height: '100%',
          backgroundColor: '#1e1e1e',
          borderLeft: '1px solid #333',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
        }}
      >
        <Typography variant="body2" sx={{ color: '#888', textAlign: 'center' }}>
          Select a node to view and edit its properties
        </Typography>
      </Box>
    );
  }

  const handleUpdate = (field: string, value: any) => {
    setLocalData((prev: any) => ({ ...prev, [field]: value }));
    
    // Update the node in the store
    if (field === 'label') {
      updateNode(selectedNodeId!, { label: value });
    } else if (field === 'nodeType') {
      // Update node type
      updateNode(selectedNodeId!, { nodeType: value });
    } else {
      // Update config fields
      const updatedConfig = { ...selectedNode.data.config };
      updatedConfig[field] = value;
      updateNode(selectedNodeId!, { config: updatedConfig });
    }
  };

  const handleClose = () => {
    setSelectedNodeId(null);
  };

  const generatePlaywrightCode = () => {
    const { nodeType } = selectedNode.data;
    const { selector, value, url } = localData;

    let code = '';
    switch (nodeType) {
      case 'CLICK':
        code = `await page.click('${selector}');`;
        break;
      case 'TYPE':
        code = `await page.fill('${selector}', '${value}');`;
        break;
      case 'OPEN_URL':
        code = `await page.goto('${url}');`;
        break;
      case 'SELECT':
        code = `await page.selectOption('${selector}', '${value}');`;
        break;
      case 'HOVER':
        code = `await page.hover('${selector}');`;
        break;
      case 'DELAY':
        code = `await page.waitForTimeout(${localData.timeout});`;
        break;
      default:
        code = `// ${nodeType} action`;
    }
    return code;
  };

  const handleCopyCode = () => {
    const code = generatePlaywrightCode();
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  return (
    <Box
      sx={{
        width: 320,
        height: '100%',
        backgroundColor: '#1e1e1e',
        borderLeft: '1px solid #333',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid #333',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h6" sx={{ color: 'white' }}>
          Node Inspector
        </Typography>
        <IconButton size="small" onClick={handleClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {/* Node Type Selector */}
        <Box sx={{ mb: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel sx={{ color: '#aaa' }}>Node Type</InputLabel>
            <Select
              value={localData.nodeType}
              onChange={(e) => handleUpdate('nodeType', e.target.value)}
              label="Node Type"
              sx={{
                backgroundColor: '#2a2a2a',
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#666' },
                '& .MuiSvgIcon-root': { color: 'white' },
              }}
            >
              <MenuItem value="CLICK">Click</MenuItem>
              <MenuItem value="TYPE">Type</MenuItem>
              <MenuItem value="SELECT">Select</MenuItem>
              <MenuItem value="HOVER">Hover</MenuItem>
              <MenuItem value="UPLOAD_FILE">Upload File</MenuItem>
              <MenuItem value="OPEN_URL">Open URL</MenuItem>
              <MenuItem value="DELAY">Delay</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Basic Properties */}
        <Accordion defaultExpanded sx={{ backgroundColor: '#252525', color: 'white', mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
            <Typography variant="subtitle2">Basic Properties</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Node Name"
                value={localData.label}
                onChange={(e) => handleUpdate('label', e.target.value)}
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#2a2a2a',
                    color: 'white',
                  },
                  '& .MuiInputLabel-root': { color: '#aaa' },
                }}
              />

              <TextField
                fullWidth
                label="Description"
                value={localData.description}
                onChange={(e) => handleUpdate('description', e.target.value)}
                multiline
                rows={2}
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#2a2a2a',
                    color: 'white',
                  },
                  '& .MuiInputLabel-root': { color: '#aaa' },
                }}
              />
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Action Configuration */}
        <Accordion defaultExpanded sx={{ backgroundColor: '#252525', color: 'white', mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
            <Typography variant="subtitle2">Action Configuration</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Selector (for browser actions) */}
              {['CLICK', 'TYPE', 'SELECT', 'HOVER', 'UPLOAD_FILE'].includes(
                selectedNode.data.nodeType
              ) && (
                <TextField
                  fullWidth
                  label="CSS Selector"
                  value={localData.selector}
                  onChange={(e) => handleUpdate('selector', e.target.value)}
                  placeholder="#button, .class, [data-test='id']"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#2a2a2a',
                      color: 'white',
                    },
                    '& .MuiInputLabel-root': { color: '#aaa' },
                  }}
                />
              )}

              {/* Value (for TYPE, SELECT) */}
              {['TYPE', 'SELECT'].includes(selectedNode.data.nodeType) && (
                <TextField
                  fullWidth
                  label="Value"
                  value={localData.value}
                  onChange={(e) => handleUpdate('value', e.target.value)}
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#2a2a2a',
                      color: 'white',
                    },
                    '& .MuiInputLabel-root': { color: '#aaa' },
                  }}
                />
              )}

              {/* URL (for OPEN_URL) */}
              {selectedNode.data.nodeType === 'OPEN_URL' && (
                <TextField
                  fullWidth
                  label="URL"
                  value={localData.url}
                  onChange={(e) => handleUpdate('url', e.target.value)}
                  placeholder="https://example.com"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#2a2a2a',
                      color: 'white',
                    },
                    '& .MuiInputLabel-root': { color: '#aaa' },
                  }}
                />
              )}

              {/* Timeout */}
              <TextField
                fullWidth
                label="Timeout (ms)"
                type="number"
                value={localData.timeout}
                onChange={(e) => handleUpdate('timeout', parseInt(e.target.value))}
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#2a2a2a',
                    color: 'white',
                  },
                  '& .MuiInputLabel-root': { color: '#aaa' },
                }}
              />

              {/* Retry Count */}
              <TextField
                fullWidth
                label="Retry Count"
                type="number"
                value={localData.retryCount}
                onChange={(e) => handleUpdate('retryCount', parseInt(e.target.value))}
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#2a2a2a',
                    color: 'white',
                  },
                  '& .MuiInputLabel-root': { color: '#aaa' },
                }}
              />
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Advanced Options */}
        <Accordion sx={{ backgroundColor: '#252525', color: 'white', mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
            <Typography variant="subtitle2">Advanced Options</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localData.waitForSelector}
                    onChange={(e) => handleUpdate('waitForSelector', e.target.checked)}
                    sx={{ color: 'white' }}
                  />
                }
                label="Wait for Selector"
                sx={{ color: 'white' }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={localData.screenshot}
                    onChange={(e) => handleUpdate('screenshot', e.target.checked)}
                    sx={{ color: 'white' }}
                  />
                }
                label="Capture Screenshot"
                sx={{ color: 'white' }}
              />
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Playwright Code */}
        <Accordion sx={{ backgroundColor: '#252525', color: 'white' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
            <Typography variant="subtitle2">Playwright Code</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              <Box
                sx={{
                  backgroundColor: '#1a1a1a',
                  p: 2,
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: '#4CAF50',
                  mb: 1,
                  position: 'relative',
                }}
              >
                <IconButton
                  size="small"
                  onClick={handleCopyCode}
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    color: 'white',
                  }}
                >
                  <CopyIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {generatePlaywrightCode()}
                </pre>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Metadata */}
        <Box sx={{ mt: 2, p: 2, backgroundColor: '#252525', borderRadius: 1 }}>
          <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 0.5 }}>
            Node ID: {selectedNode.id}
          </Typography>
          <Typography variant="caption" sx={{ color: '#888', display: 'block' }}>
            Position: ({Math.round(selectedNode.position.x)}, {Math.round(selectedNode.position.y)})
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default NodeInspector;

// Made with Bob
