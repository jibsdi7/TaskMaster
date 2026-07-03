import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  CircularProgress,
  Switch,
  FormControlLabel,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Chip,
  Button,
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ContentCopy as CopyIcon,
  ChevronRight as CollapseIcon,
  ChevronLeft as ExpandIcon,
  CallSplit as DismantleIcon,
} from '@mui/icons-material';
import { useWorkflowStore } from '../../store/workflowStore';
import { toast } from 'react-toastify';

const PANEL_W = 300;
const TAB_W   = 32;

const nodeColors: Record<string, string> = {
  CLICK: '#48BB78',
  TYPE: '#5B7CF6',
  OPEN_URL: '#F6AD55',
  DELAY: '#A78BFA',
  LOOP: '#F56565',
  IF_CONDITION: '#F6C05C',
  SELECT: '#38BDF8',
  HOVER: '#34D399',
  VARIABLE: '#22D3EE',
  API_REQUEST: '#F472B6',
  BLOCK: '#94A3B8',
  UPLOAD_FILE: '#FB923C',
};

const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="caption" sx={{ color: '#666', mb: 0.5, display: 'block', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 10 }}>
      {label}
    </Typography>
    {children}
  </Box>
);

const inputSx = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#1a1a1a',
    fontSize: '0.83rem',
    '& fieldset': { borderColor: '#2a2a2a' },
    '&:hover fieldset': { borderColor: '#3a3a3a' },
    '&.Mui-focused fieldset': { borderColor: '#5B7CF6', borderWidth: 1.5 },
  },
  '& .MuiInputBase-input': { color: '#E0E0E0', py: '7px' },
  '& .MuiInputLabel-root': { color: '#555', fontSize: '0.83rem' },
  '& .MuiFormHelperText-root': { color: '#555', fontSize: '0.72rem' },
};

interface BlockSummary {
  id: number;
  name: string;
  description: string;
  current_version: number;
}

const NodeInspector = () => {
  const { nodes, selectedNodeId, updateNode, setSelectedNodeId, expandBlockNode } = useWorkflowStore();
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  // Keep a ref to always read the latest store state inside callbacks
  const storeRef = useWorkflowStore;

  const [localData, setLocalData] = useState<any>({});
  const [collapsed, setCollapsed] = useState(false);
  const [availableBlocks, setAvailableBlocks] = useState<BlockSummary[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [dismantling, setDismantling] = useState(false);

  // Open panel whenever a node is selected
  useEffect(() => {
    if (selectedNode) {
      setCollapsed(false);
      setLocalData({
        label:           selectedNode.data.label || '',
        nodeType:        selectedNode.data.nodeType || '',
        selector:        selectedNode.data.config?.selector || '',
        value:           selectedNode.data.config?.value || '',
        url:             selectedNode.data.config?.url || '',
        duration:        selectedNode.data.config?.duration ?? 1000,
        timeout:         selectedNode.data.config?.timeout || 30000,
        retryCount:      selectedNode.data.config?.retryCount || 3,
        waitForSelector: selectedNode.data.config?.waitForSelector ?? true,
        screenshot:      selectedNode.data.config?.screenshot || false,
        description:     selectedNode.data.config?.description || '',
        block_id:        selectedNode.data.config?.block_id ?? '',
      });
    }
  }, [selectedNode?.id]);

  // Fetch available blocks when a BLOCK node is selected
  useEffect(() => {
    if (selectedNode?.data.nodeType !== 'BLOCK') return;
    setBlocksLoading(true);
    const token = localStorage.getItem('token');
    fetch('http://localhost:8000/api/blocks', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : []))
      .then(setAvailableBlocks)
      .catch(() => setAvailableBlocks([]))
      .finally(() => setBlocksLoading(false));
  }, [selectedNode?.id, selectedNode?.data.nodeType]);

  // Dismantle: fetch block definition then expand the BLOCK node inline
  const handleDismantle = async () => {
    if (!selectedNodeId || !selectedNode) return;
    const blockId = selectedNode.data.config?.block_id;
    if (!blockId) {
      toast.error('This block has no block_id — cannot dismantle');
      return;
    }
    setDismantling(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8000/api/blocks/${blockId}/definition`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Failed to load block definition (${res.status})`);
      const def = await res.json();
      if (!def.nodes?.length) {
        toast.warning('Block has no nodes to expand');
        return;
      }
      expandBlockNode(selectedNodeId, def.nodes, def.edges ?? []);
      toast.success(`"${def.block_name}" dismantled — nodes restored`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to dismantle block');
    } finally {
      setDismantling(false);
    }
  };

  const handleUpdate = (field: string, value: any) => {
    setLocalData((prev: any) => ({ ...prev, [field]: value }));
    if (field === 'label') {
      updateNode(selectedNodeId!, { label: value });
    } else if (field === 'nodeType') {
      updateNode(selectedNodeId!, { nodeType: value });
    } else {
      // Always read from the live store state to avoid stale-closure overwrites
      const liveNode = storeRef.getState().nodes.find((n) => n.id === selectedNodeId);
      const updatedConfig = { ...(liveNode?.data.config ?? selectedNode!.data.config) };
      updatedConfig[field] = value;
      updateNode(selectedNodeId!, { config: updatedConfig });
    }
  };

  const generateCode = () => {
    if (!selectedNode) return '';
    const { nodeType } = selectedNode.data;
    const { selector, value, url, duration } = localData;
    switch (nodeType) {
      case 'CLICK':       return `await page.click('${selector}');`;
      case 'TYPE':        return `await page.fill('${selector}', '${value}');`;
      case 'OPEN_URL':    return `await page.goto('${url}');`;
      case 'SELECT':      return `await page.selectOption('${selector}', '${value}');`;
      case 'HOVER':       return `await page.hover('${selector}');`;
      case 'DELAY':       return `await page.waitForTimeout(${duration});`;
      default:            return `// ${nodeType} action`;
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generateCode());
    toast.success('Code copied');
  };

  // Nothing selected — render nothing (zero width)
  if (!selectedNodeId || !selectedNode) return null;

  const color = nodeColors[selectedNode.data.nodeType] || '#A0A0B4';
  const currentWidth = collapsed ? TAB_W : PANEL_W;

  return (
    <Box
      sx={{
        width: currentWidth,
        minWidth: currentWidth,
        height: '100%',
        backgroundColor: '#141414',
        borderLeft: '1px solid #2a2a2a',
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {/* Collapsed tab — shown when minimised */}
      {collapsed && (
        <Box
          sx={{
            width: TAB_W,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pt: 1.5,
            gap: 1,
          }}
        >
          {/* Expand button */}
          <Tooltip title="Expand inspector" placement="left">
            <IconButton
              size="small"
              onClick={() => setCollapsed(false)}
              sx={{
                color: '#666',
                width: 24, height: 24,
                '&:hover': { color: '#E0E0F0', backgroundColor: '#242424' },
              }}
            >
              <ExpandIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>

          {/* Rotated node type label */}
          <Box
            sx={{
              mt: 1,
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              transform: 'rotate(180deg)',
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
            }}
          >
            <Box
              sx={{
                width: 5, height: 5, borderRadius: '50%',
                backgroundColor: color, flexShrink: 0,
              }}
            />
            <Typography
              variant="caption"
              sx={{ color: '#555', fontWeight: 500, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >
              {selectedNode.data.nodeType}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Full panel — shown when expanded */}
      {!collapsed && (
        <Box
          sx={{
            width: PANEL_W,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              px: 2, py: 1.5,
              borderBottom: '1px solid #242424',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexShrink: 0,
            }}
          >
            {/* Node type colour badge */}
            <Box
              sx={{
                width: 8, height: 8, borderRadius: '50%',
                backgroundColor: color, flexShrink: 0,
              }}
            />
            <Typography variant="body2" sx={{ color: '#E0E0F0', fontWeight: 600, flex: 1, fontSize: '0.83rem' }}>
              {selectedNode.data.label || selectedNode.data.nodeType}
            </Typography>

            {/* Minimise */}
            <Tooltip title="Minimise panel">
              <IconButton
                size="small"
                onClick={() => setCollapsed(true)}
                sx={{ color: '#555', width: 24, height: 24, '&:hover': { color: '#E0E0F0', backgroundColor: '#242424' } }}
              >
                <CollapseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>

            {/* Close / deselect */}
            <Tooltip title="Close">
              <IconButton
                size="small"
                onClick={() => setSelectedNodeId(null)}
                sx={{ color: '#555', width: 24, height: 24, '&:hover': { color: '#F56565', backgroundColor: 'rgba(245,101,101,0.08)' } }}
              >
                <CloseIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Scrollable content */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>

            {/* Node type selector */}
            <FieldRow label="Node Type">
              <FormControl fullWidth size="small">
                <Select
                  value={localData.nodeType}
                  onChange={(e) => handleUpdate('nodeType', e.target.value)}
                  sx={{
                    backgroundColor: '#1a1a1a',
                    fontSize: '0.83rem',
                    color: '#E0E0E0',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#2a2a2a' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#3a3a3a' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#5B7CF6', borderWidth: 1.5 },
                    '& .MuiSvgIcon-root': { color: '#666' },
                  }}
                >
                  {['CLICK','TYPE','SELECT','HOVER','UPLOAD_FILE','OPEN_URL','DELAY','BLOCK'].map((t) => (
                    <MenuItem key={t} value={t} sx={{ fontSize: '0.83rem' }}>{t}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FieldRow>

            {/* Label */}
            <FieldRow label="Label">
              <TextField fullWidth size="small" value={localData.label} onChange={(e) => handleUpdate('label', e.target.value)} sx={inputSx} />
            </FieldRow>

            {/* ── BLOCK node: block picker ── */}
            {selectedNode.data.nodeType === 'BLOCK' && (
              <>
                <FieldRow label="Select Block">
                  {blocksLoading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={14} sx={{ color: '#5B7CF6' }} />
                      <Typography variant="caption" sx={{ color: '#666' }}>Loading blocks…</Typography>
                    </Box>
                  ) : availableBlocks.length === 0 ? (
                    <Typography variant="caption" sx={{ color: '#F56565' }}>
                      No blocks available. Save a workflow as a block first.
                    </Typography>
                  ) : (
                    <FormControl fullWidth size="small">
                      <Select
                        value={localData.block_id || ''}
                        onChange={(e) => handleUpdate('block_id', e.target.value ? Number(e.target.value) : '')}
                        displayEmpty
                        sx={{
                          backgroundColor: '#1a1a1a',
                          fontSize: '0.83rem',
                          color: localData.block_id ? '#E0E0E0' : '#555',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#2a2a2a' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#3a3a3a' },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#5B7CF6', borderWidth: 1.5 },
                          '& .MuiSvgIcon-root': { color: '#666' },
                        }}
                      >
                        <MenuItem value="" sx={{ fontSize: '0.83rem', color: '#555' }}>
                          — choose a block —
                        </MenuItem>
                        {availableBlocks.map((b) => (
                          <MenuItem key={b.id} value={b.id} sx={{ fontSize: '0.83rem' }}>
                            {b.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </FieldRow>

                {/* Show selected block details */}
                {localData.block_id && (() => {
                  const blk = availableBlocks.find((b) => b.id === Number(localData.block_id));
                  return blk ? (
                    <Box
                      sx={{
                        mb: 2, p: 1.5, borderRadius: '7px',
                        backgroundColor: 'rgba(91,124,246,0.08)',
                        border: '1px solid rgba(91,124,246,0.2)',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: '#7B96F9', fontWeight: 600, flex: 1 }}>
                          {blk.name}
                        </Typography>
                        <Chip
                          label={`v${blk.current_version}`}
                          size="small"
                          sx={{ height: 16, fontSize: 10, backgroundColor: 'rgba(91,124,246,0.2)', color: '#7B96F9' }}
                        />
                      </Box>
                      {blk.description && (
                        <Typography variant="caption" sx={{ color: '#666' }}>
                          {blk.description}
                        </Typography>
                      )}
                    </Box>
                  ) : null;
                })()}

                {/* Dismantle button — always visible for any BLOCK node with a block_id */}
                {localData.block_id && (
                  <Box sx={{ mb: 2 }}>
                    <Button
                      fullWidth
                      size="small"
                      variant="outlined"
                      color="warning"
                      disabled={dismantling}
                      onClick={handleDismantle}
                      startIcon={dismantling
                        ? <CircularProgress size={14} sx={{ color: 'inherit' }} />
                        : <DismantleIcon sx={{ fontSize: 16 }} />}
                      sx={{
                        fontSize: '0.78rem',
                        borderColor: 'rgba(246,173,85,0.4)',
                        color: '#F6AD55',
                        textTransform: 'none',
                        '&:hover': {
                          borderColor: '#F6AD55',
                          backgroundColor: 'rgba(246,173,85,0.08)',
                        },
                        '&.Mui-disabled': { opacity: 0.5 },
                      }}
                    >
                      {dismantling ? 'Dismantling…' : 'Dismantle Block'}
                    </Button>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: '#555', lineHeight: 1.4 }}>
                      Replaces this block node with its individual steps inline.
                    </Typography>
                  </Box>
                )}
              </>
            )}

            {/* ── Regular node fields ── */}
            {/* Selector */}
            {['CLICK','TYPE','SELECT','HOVER','UPLOAD_FILE'].includes(selectedNode.data.nodeType) && (
              <FieldRow label="CSS Selector">
                <TextField
                  fullWidth size="small"
                  value={localData.selector}
                  onChange={(e) => handleUpdate('selector', e.target.value)}
                  placeholder="#btn, .class, role=button"
                  sx={inputSx}
                />
              </FieldRow>
            )}

            {/* Value */}
            {['TYPE','SELECT'].includes(selectedNode.data.nodeType) && (
              <FieldRow label="Value">
                <TextField fullWidth size="small" value={localData.value} onChange={(e) => handleUpdate('value', e.target.value)} sx={inputSx} />
              </FieldRow>
            )}

            {/* URL */}
            {selectedNode.data.nodeType === 'OPEN_URL' && (
              <FieldRow label="URL">
                <TextField fullWidth size="small" value={localData.url} onChange={(e) => handleUpdate('url', e.target.value)} placeholder="https://example.com" sx={inputSx} />
              </FieldRow>
            )}

            {/* Duration (DELAY) */}
            {selectedNode.data.nodeType === 'DELAY' && (
              <FieldRow label="Duration (ms)">
                <TextField
                  fullWidth size="small" type="number"
                  value={localData.duration}
                  onChange={(e) => handleUpdate('duration', parseInt(e.target.value) || 0)}
                  inputProps={{ min: 0, step: 500 }}
                  helperText="1000 ms = 1 second"
                  sx={inputSx}
                />
              </FieldRow>
            )}

            {/* Timeout — not shown for BLOCK or DELAY nodes */}
            {!['DELAY', 'BLOCK'].includes(selectedNode.data.nodeType) && (
              <FieldRow label="Timeout (ms)">
                <TextField fullWidth size="small" type="number" value={localData.timeout} onChange={(e) => handleUpdate('timeout', parseInt(e.target.value))} sx={inputSx} />
              </FieldRow>
            )}

            {/* Description */}
            <FieldRow label="Description">
              <TextField fullWidth size="small" multiline rows={2} value={localData.description} onChange={(e) => handleUpdate('description', e.target.value)} sx={inputSx} />
            </FieldRow>

            {/* Advanced */}
            <Accordion
              disableGutters
              sx={{
                backgroundColor: 'transparent', boxShadow: 'none', mb: 1.5,
                '&:before': { display: 'none' },
                border: '1px solid #242424', borderRadius: '7px !important',
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ fontSize: 16, color: '#555' }} />}
                sx={{ minHeight: 36, px: 1.5, '& .MuiAccordionSummary-content': { my: 0 } }}
              >
                <Typography variant="caption" sx={{ color: '#666', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: 10 }}>
                  Advanced
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 1.5, pb: 1.5 }}>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={localData.waitForSelector}
                      onChange={(e) => handleUpdate('waitForSelector', e.target.checked)}
                      sx={{ '& .MuiSwitch-thumb': { backgroundColor: '#5B7CF6' }, '& .Mui-checked + .MuiSwitch-track': { backgroundColor: '#5B7CF6' } }}
                    />
                  }
                  label={<Typography variant="caption" sx={{ color: '#888' }}>Wait for selector</Typography>}
                  sx={{ mb: 0.5 }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={localData.screenshot}
                      onChange={(e) => handleUpdate('screenshot', e.target.checked)}
                      sx={{ '& .MuiSwitch-thumb': { backgroundColor: '#5B7CF6' }, '& .Mui-checked + .MuiSwitch-track': { backgroundColor: '#5B7CF6' } }}
                    />
                  }
                  label={<Typography variant="caption" sx={{ color: '#888' }}>Capture screenshot</Typography>}
                />
              </AccordionDetails>
            </Accordion>

            {/* Inline code snippet */}
            <Box
              sx={{
                backgroundColor: '#0d0d0d',
                border: '1px solid #242424',
                borderRadius: '7px',
                p: 1.5,
                position: 'relative',
                mb: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#555', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: 10 }}>
                  Code
                </Typography>
                <Tooltip title="Copy">
                  <IconButton size="small" onClick={handleCopyCode} sx={{ color: '#555', width: 20, height: 20, '&:hover': { color: '#E0E0F0' } }}>
                    <CopyIcon sx={{ fontSize: 13 }} />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box
                component="pre"
                sx={{
                  margin: 0, fontSize: 11.5, lineHeight: 1.6,
                  color: '#7B96F9',
                  fontFamily: '"Fira Code", "Consolas", monospace',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                  overflowX: 'hidden',
                }}
              >
                {generateCode()}
              </Box>
            </Box>

            {/* Meta */}
            <Box sx={{ borderTop: '1px solid #1e1e1e', pt: 1.5 }}>
              <Typography variant="caption" sx={{ color: '#383838', display: 'block', fontFamily: 'monospace', fontSize: 10 }}>
                id: {selectedNode.id}
              </Typography>
              <Typography variant="caption" sx={{ color: '#383838', display: 'block', fontFamily: 'monospace', fontSize: 10 }}>
                x: {Math.round(selectedNode.position.x)}, y: {Math.round(selectedNode.position.y)}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default NodeInspector;

// Made with Bob
