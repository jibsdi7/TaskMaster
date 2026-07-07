import { useEffect, useState } from 'react';
import { authHeaders, BASE_URL } from '../../api/client';
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
  // Desktop
  DESKTOP_CLICK: '#F59E0B',
  DESKTOP_TYPE: '#FBBF24',
  DESKTOP_HOTKEY: '#D97706',
  DESKTOP_MOVE: '#92400E',
  DESKTOP_DRAG: '#B45309',
  DESKTOP_SCROLL: '#78350F',
  DESKTOP_SCREENSHOT: '#10B981',
  DESKTOP_FIND_IMAGE: '#059669',
  DESKTOP_LAUNCH_APP: '#6366F1',
  DESKTOP_CLOSE_APP: '#EF4444',
  DESKTOP_SWITCH_WINDOW: '#8B5CF6',
};

const DESKTOP_NODE_TYPES = [
  'DESKTOP_CLICK', 'DESKTOP_TYPE', 'DESKTOP_HOTKEY', 'DESKTOP_MOVE',
  'DESKTOP_DRAG', 'DESKTOP_SCROLL', 'DESKTOP_SCREENSHOT', 'DESKTOP_FIND_IMAGE',
  'DESKTOP_LAUNCH_APP', 'DESKTOP_CLOSE_APP', 'DESKTOP_SWITCH_WINDOW',
];

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

  const [localData, setLocalData] = useState<any>({
    // desktop fields
    x: 0, y: 0, button: 'left', clicks: 1,
    text: '', keys: '',
    from_x: 0, from_y: 0, to_x: 0, to_y: 0,
    dy: -3, direction: 'down',
    image_path: '', confidence: 0.9,
    app_path: '', window_title: '',
    path: '',
  });
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
        // desktop-specific
        x:               selectedNode.data.config?.x ?? 0,
        y:               selectedNode.data.config?.y ?? 0,
        button:          selectedNode.data.config?.button ?? 'left',
        clicks:          selectedNode.data.config?.clicks ?? 1,
        text:            selectedNode.data.config?.text ?? '',
        keys:            selectedNode.data.config?.keys ?? '',
        from_x:          selectedNode.data.config?.from_x ?? 0,
        from_y:          selectedNode.data.config?.from_y ?? 0,
        to_x:            selectedNode.data.config?.to_x ?? 0,
        to_y:            selectedNode.data.config?.to_y ?? 0,
        dy:              selectedNode.data.config?.dy ?? -3,
        direction:       selectedNode.data.config?.direction ?? 'down',
        image_path:      selectedNode.data.config?.image_path ?? '',
        confidence:      selectedNode.data.config?.confidence ?? 0.9,
        app_path:        selectedNode.data.config?.app_path ?? '',
        window_title:    selectedNode.data.config?.window_title ?? '',
        path:            selectedNode.data.config?.path ?? '',
      });
    }
  }, [selectedNode?.id]);

  // Fetch available blocks when a BLOCK node is selected
  useEffect(() => {
    if (selectedNode?.data.nodeType !== 'BLOCK') return;
    setBlocksLoading(true);
    fetch(`${BASE_URL}/api/blocks`, {
      headers: authHeaders(),
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
      const res = await fetch(`${BASE_URL}/api/blocks/${blockId}/definition`, {
        headers: authHeaders(),
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
    const { selector, value, url, duration, x, y, button, clicks, text, keys,
            to_x, to_y, dy, image_path, app_path, window_title, path } = localData;
    switch (nodeType) {
      // Web
      case 'CLICK':       return `await page.click('${selector}');`;
      case 'TYPE':        return `await page.fill('${selector}', '${value}');`;
      case 'OPEN_URL':    return `await page.goto('${url}');`;
      case 'SELECT':      return `await page.selectOption('${selector}', '${value}');`;
      case 'HOVER':       return `await page.hover('${selector}');`;
      case 'DELAY':       return `await page.waitForTimeout(${duration});`;
      // Desktop
      case 'DESKTOP_CLICK':
        return clicks === 2
          ? `pyautogui.doubleClick(${x}, ${y})`
          : `pyautogui.click(${x}, ${y}${button !== 'left' ? `, button='${button}'` : ''})`;
      case 'DESKTOP_TYPE':   return `pyautogui.typewrite('${text}', interval=0.05)`;
      case 'DESKTOP_HOTKEY':
        return `pyautogui.hotkey(${keys.split('+').map((k: string) => `'${k.trim()}'`).join(', ')})`;
      case 'DESKTOP_MOVE':   return `pyautogui.moveTo(${x}, ${y}, duration=0.25)`;
      case 'DESKTOP_DRAG':   return `pyautogui.dragTo(${to_x}, ${to_y}, duration=0.5, button='left')`;
      case 'DESKTOP_SCROLL': return `pyautogui.scroll(${dy})`;
      case 'DESKTOP_SCREENSHOT': return `pyautogui.screenshot('${path || 'screenshot.png'}')`;
      case 'DESKTOP_FIND_IMAGE': return `loc = pyautogui.locateOnScreen('${image_path}', confidence=0.9)\nif loc: pyautogui.click(pyautogui.center(loc))`;
      case 'DESKTOP_LAUNCH_APP': return `subprocess.Popen(r'${app_path}')`;
      case 'DESKTOP_CLOSE_APP':  return `pyautogui.hotkey('alt', 'f4')  # or win32gui.FindWindow`;
      case 'DESKTOP_SWITCH_WINDOW': return `win32gui.SetForegroundWindow(win32gui.FindWindow(None, '${window_title}'))`;
      default:            return `# ${nodeType}`;
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
                  {[
                    // Web
                    'CLICK','TYPE','SELECT','HOVER','UPLOAD_FILE','OPEN_URL','DELAY','BLOCK',
                    // Desktop
                    ...DESKTOP_NODE_TYPES,
                  ].map((t) => (
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

            {/* ── Web node fields ── */}
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

            {/* Timeout — not shown for BLOCK, DELAY, or desktop nodes */}
            {!['DELAY', 'BLOCK', ...DESKTOP_NODE_TYPES].includes(selectedNode.data.nodeType) && (
              <FieldRow label="Timeout (ms)">
                <TextField fullWidth size="small" type="number" value={localData.timeout} onChange={(e) => handleUpdate('timeout', parseInt(e.target.value))} sx={inputSx} />
              </FieldRow>
            )}

            {/* ── Desktop node fields ── */}
            {/* X / Y coordinates */}
            {['DESKTOP_CLICK','DESKTOP_MOVE','DESKTOP_SCROLL'].includes(selectedNode.data.nodeType) && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <FieldRow label="X">
                  <TextField fullWidth size="small" type="number" value={localData.x}
                    onChange={(e) => handleUpdate('x', parseInt(e.target.value) || 0)} sx={inputSx} />
                </FieldRow>
                <FieldRow label="Y">
                  <TextField fullWidth size="small" type="number" value={localData.y}
                    onChange={(e) => handleUpdate('y', parseInt(e.target.value) || 0)} sx={inputSx} />
                </FieldRow>
              </Box>
            )}

            {/* Click button + clicks */}
            {selectedNode.data.nodeType === 'DESKTOP_CLICK' && (
              <>
                <FieldRow label="Button">
                  <FormControl fullWidth size="small">
                    <Select value={localData.button} onChange={(e) => handleUpdate('button', e.target.value)}
                      sx={{ backgroundColor: '#1a1a1a', color: '#E0E0E0', fontSize: '0.83rem',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#2a2a2a' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#F59E0B', borderWidth: 1.5 },
                        '& .MuiSvgIcon-root': { color: '#666' } }}>
                      <MenuItem value="left"   sx={{ fontSize: '0.83rem' }}>Left</MenuItem>
                      <MenuItem value="right"  sx={{ fontSize: '0.83rem' }}>Right</MenuItem>
                      <MenuItem value="middle" sx={{ fontSize: '0.83rem' }}>Middle</MenuItem>
                    </Select>
                  </FormControl>
                </FieldRow>
                <FieldRow label="Clicks">
                  <FormControl fullWidth size="small">
                    <Select value={localData.clicks} onChange={(e) => handleUpdate('clicks', Number(e.target.value))}
                      sx={{ backgroundColor: '#1a1a1a', color: '#E0E0E0', fontSize: '0.83rem',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#2a2a2a' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#F59E0B', borderWidth: 1.5 },
                        '& .MuiSvgIcon-root': { color: '#666' } }}>
                      <MenuItem value={1} sx={{ fontSize: '0.83rem' }}>Single</MenuItem>
                      <MenuItem value={2} sx={{ fontSize: '0.83rem' }}>Double</MenuItem>
                    </Select>
                  </FormControl>
                </FieldRow>
              </>
            )}

            {/* Text to type */}
            {selectedNode.data.nodeType === 'DESKTOP_TYPE' && (
              <FieldRow label="Text">
                <TextField fullWidth size="small" multiline rows={3} value={localData.text}
                  onChange={(e) => handleUpdate('text', e.target.value)}
                  placeholder="Hello World"
                  sx={inputSx} />
              </FieldRow>
            )}

            {/* Hotkey */}
            {selectedNode.data.nodeType === 'DESKTOP_HOTKEY' && (
              <FieldRow label="Key Combination">
                <TextField fullWidth size="small" value={localData.keys}
                  onChange={(e) => handleUpdate('keys', e.target.value)}
                  placeholder="ctrl+c  or  alt+f4  or  enter"
                  helperText="Separate keys with +"
                  sx={inputSx} />
              </FieldRow>
            )}

            {/* Drag: from/to */}
            {selectedNode.data.nodeType === 'DESKTOP_DRAG' && (
              <>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <FieldRow label="From X">
                    <TextField fullWidth size="small" type="number" value={localData.from_x}
                      onChange={(e) => handleUpdate('from_x', parseInt(e.target.value) || 0)} sx={inputSx} />
                  </FieldRow>
                  <FieldRow label="From Y">
                    <TextField fullWidth size="small" type="number" value={localData.from_y}
                      onChange={(e) => handleUpdate('from_y', parseInt(e.target.value) || 0)} sx={inputSx} />
                  </FieldRow>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <FieldRow label="To X">
                    <TextField fullWidth size="small" type="number" value={localData.to_x}
                      onChange={(e) => handleUpdate('to_x', parseInt(e.target.value) || 0)} sx={inputSx} />
                  </FieldRow>
                  <FieldRow label="To Y">
                    <TextField fullWidth size="small" type="number" value={localData.to_y}
                      onChange={(e) => handleUpdate('to_y', parseInt(e.target.value) || 0)} sx={inputSx} />
                  </FieldRow>
                </Box>
              </>
            )}

            {/* Scroll amount */}
            {selectedNode.data.nodeType === 'DESKTOP_SCROLL' && (
              <FieldRow label="Scroll Amount (negative = down)">
                <TextField fullWidth size="small" type="number" value={localData.dy}
                  onChange={(e) => handleUpdate('dy', parseInt(e.target.value) || 0)}
                  inputProps={{ step: 1 }}
                  helperText="-3 = down 3 clicks, +3 = up 3 clicks"
                  sx={inputSx} />
              </FieldRow>
            )}

            {/* Screenshot path */}
            {selectedNode.data.nodeType === 'DESKTOP_SCREENSHOT' && (
              <FieldRow label="Save Path">
                <TextField fullWidth size="small" value={localData.path}
                  onChange={(e) => handleUpdate('path', e.target.value)}
                  placeholder="screenshot.png"
                  sx={inputSx} />
              </FieldRow>
            )}

            {/* Find image */}
            {selectedNode.data.nodeType === 'DESKTOP_FIND_IMAGE' && (
              <>
                <FieldRow label="Image File Path">
                  <TextField fullWidth size="small" value={localData.image_path}
                    onChange={(e) => handleUpdate('image_path', e.target.value)}
                    placeholder="C:/images/button.png"
                    sx={inputSx} />
                </FieldRow>
                <FieldRow label="Confidence (0–1)">
                  <TextField fullWidth size="small" type="number" value={localData.confidence}
                    onChange={(e) => handleUpdate('confidence', parseFloat(e.target.value) || 0.9)}
                    inputProps={{ min: 0.5, max: 1, step: 0.05 }}
                    sx={inputSx} />
                </FieldRow>
              </>
            )}

            {/* Launch app */}
            {selectedNode.data.nodeType === 'DESKTOP_LAUNCH_APP' && (
              <FieldRow label="Application Path">
                <TextField fullWidth size="small" value={localData.app_path}
                  onChange={(e) => handleUpdate('app_path', e.target.value)}
                  placeholder="C:/Windows/notepad.exe  or  notepad"
                  sx={inputSx} />
              </FieldRow>
            )}

            {/* Close / switch window */}
            {['DESKTOP_CLOSE_APP','DESKTOP_SWITCH_WINDOW'].includes(selectedNode.data.nodeType) && (
              <FieldRow label="Window Title">
                <TextField fullWidth size="small" value={localData.window_title}
                  onChange={(e) => handleUpdate('window_title', e.target.value)}
                  placeholder="Notepad — exact window title"
                  sx={inputSx} />
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
