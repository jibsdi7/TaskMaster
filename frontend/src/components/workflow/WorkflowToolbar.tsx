import { Box, Button, Divider, IconButton, InputBase, MenuItem, Select, Tooltip, Typography } from '@mui/material';
import { useRef, useState } from 'react';
import {
  Add as NewIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  FileUpload as ImportIcon,
  FileDownload as ExportIcon,
  FiberManualRecord as RecordIcon,
  Stop as StopIcon,
  PlayArrow as RunIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  FitScreen as FitViewIcon,
  AutoFixHigh as AutoLayoutIcon,
  ViewModule as BlockIcon,
  Download as ImportBlockIcon,
  Code as CodeIcon,
  EditOutlined as EditIcon,
  ContentPaste as ImportScriptIcon,
} from '@mui/icons-material';

export type ReplaySpeed = 'very_slow' | 'slow' | 'normal' | 'fast' | 'instant';

export const SPEED_DELAY_MS: Record<ReplaySpeed, number> = {
  very_slow: 3000,
  slow:      1500,
  normal:    500,
  fast:      150,
  instant:   0,
};

interface WorkflowToolbarProps {
  workflowName: string;
  onRenameWorkflow: (name: string) => void;
  status: 'idle' | 'recording' | 'running';
  isRecording: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onNew: () => void;
  onSave: () => void;
  onDelete: () => void;
  onImport: () => void;
  onExport: () => void;
  onRecord: () => void;
  onStopRecording: () => void;
  onRun: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView: () => void;
  onAutoLayout: () => void;
  onSaveAsBlock: () => void;
  onSaveSelectionAsBlock: () => void;
  selectedNodeCount: number;
  onImportBlock: () => void;
  onViewCode: () => void;
  onImportScript: () => void;
  replaySpeed: ReplaySpeed;
  onReplaySpeedChange: (speed: ReplaySpeed) => void;
}

const Sep = () => (
  <Divider orientation="vertical" flexItem sx={{ borderColor: '#242424', mx: 0.5, my: 0.75 }} />
);

// Labeled toolbar button: icon on top, label underneath
const TB = ({ title, label, children, onClick, disabled = false }: any) => (
  <Tooltip title={title}>
    <span>
      <IconButton
        size="small"
        onClick={onClick}
        disabled={disabled}
        sx={{
          color: disabled ? '#333' : '#A0A0B4',
          borderRadius: '7px',
          width: 44,
          height: 44,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
          '&:hover': { backgroundColor: '#242424', color: '#E0E0F0' },
          '&.Mui-disabled': { color: '#333' },
        }}
      >
        {children}
        <Typography sx={{
          fontSize: '0.6rem', lineHeight: 1, color: 'inherit',
          whiteSpace: 'nowrap', fontWeight: 500, letterSpacing: '0.01em',
        }}>
          {label}
        </Typography>
      </IconButton>
    </span>
  </Tooltip>
);

const WorkflowToolbar = ({
  workflowName, onRenameWorkflow, status, isRecording, canUndo, canRedo,
  onNew, onSave, onDelete, onImport, onExport,
  onRecord, onStopRecording, onRun, onUndo, onRedo,
  onFitView, onAutoLayout, onSaveAsBlock, onSaveSelectionAsBlock,
  selectedNodeCount, onImportBlock, onViewCode, onImportScript,
  replaySpeed, onReplaySpeedChange,
}: WorkflowToolbarProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = () => {
    setDraft(workflowName);
    setEditing(true);
    // Focus after state update
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== workflowName) {
      onRenameWorkflow(trimmed);
    }
    setEditing(false);
  };

  const cancelEdit = () => setEditing(false);

  return (
    <Box
      sx={{
        height: 60,
        backgroundColor: '#141414',
        borderBottom: '1px solid #242424',
        display: 'flex',
        alignItems: 'center',
        px: 2,
        gap: 0.5,
        flexShrink: 0,
        overflowX: 'auto',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      {/* Workflow name — inline editable */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.25,
          py: 0.5,
          backgroundColor: editing ? '#1a1a1a' : '#1c1c1c',
          border: editing ? '1px solid #5B7CF6' : '1px solid #2a2a2a',
          borderRadius: '7px',
          minWidth: 0,
          flexShrink: 0,
          maxWidth: 220,
          transition: 'border-color 0.15s',
          cursor: editing ? 'text' : 'default',
        }}
      >
        {/* Status dot */}
        <Box
          sx={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            backgroundColor: status === 'recording' ? '#F56565'
              : status === 'running' ? '#F6AD55' : '#48BB78',
            boxShadow: status !== 'idle'
              ? `0 0 6px ${status === 'recording' ? 'rgba(245,101,101,0.7)' : 'rgba(246,173,85,0.7)'}` : 'none',
            animation: status !== 'idle' ? 'pulse 2s infinite' : 'none',
          }}
        />

        {editing ? (
          <InputBase
            inputRef={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
              if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
            }}
            autoFocus
            sx={{
              flex: 1,
              minWidth: 80,
              maxWidth: 160,
              '& .MuiInputBase-input': {
                color: '#FFFFFF',
                fontSize: '0.83rem',
                fontWeight: 500,
                p: 0,
                caretColor: '#5B7CF6',
              },
            }}
          />
        ) : (
          <Typography
            variant="body2"
            sx={{
              color: '#E0E0F0', fontWeight: 500,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              flex: 1, minWidth: 0,
            }}
          >
            {workflowName || 'Untitled Workflow'}
          </Typography>
        )}

        {/* Edit pencil — only visible when not editing */}
        {!editing && (
          <Tooltip title="Rename workflow">
            <IconButton
              size="small"
              onClick={startEditing}
              sx={{
                color: '#444', width: 18, height: 18, flexShrink: 0,
                '&:hover': { color: '#A0A0B4', backgroundColor: 'transparent' },
              }}
            >
              <EditIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Sep />

      {/* File actions */}
      <TB title="New workflow" label="New" onClick={onNew}><NewIcon sx={{ fontSize: 16 }} /></TB>
      <TB title="Save workflow" label="Save" onClick={onSave}><SaveIcon sx={{ fontSize: 16 }} /></TB>
      <TB title="Save whole workflow as a reusable Block" label="To Block" onClick={onSaveAsBlock}><BlockIcon sx={{ fontSize: 16 }} /></TB>
      <TB
        title={selectedNodeCount >= 2 ? `Save ${selectedNodeCount} selected nodes as Block` : 'Select ≥2 nodes to save as Block'}
        label="Selection"
        onClick={onSaveSelectionAsBlock}
        disabled={selectedNodeCount < 2}
      >
        <BlockIcon sx={{ fontSize: 16, color: selectedNodeCount >= 2 ? '#7B96F9' : undefined }} />
      </TB>
      <TB title="Import a Block onto the canvas" label="Block" onClick={onImportBlock}>
        <ImportBlockIcon sx={{ fontSize: 16 }} />
      </TB>
      <TB title="Delete workflow" label="Delete" onClick={onDelete}><DeleteIcon sx={{ fontSize: 16 }} /></TB>

      <Sep />

      {/* Import / Export / Code */}
      <TB title="Import workflow from JSON" label="Import" onClick={onImport}><ImportIcon sx={{ fontSize: 16 }} /></TB>
      <TB title="Export workflow to JSON" label="Export" onClick={onExport}><ExportIcon sx={{ fontSize: 16 }} /></TB>
      <TB title="Import a Playwright script" label="Script" onClick={onImportScript}>
        <ImportScriptIcon sx={{ fontSize: 16 }} />
      </TB>
      <TB title="View generated code" label="Code" onClick={onViewCode}><CodeIcon sx={{ fontSize: 16 }} /></TB>

      <Sep />

      {/* Record */}
      {!isRecording ? (
        <Tooltip title="Start Recording browser actions">
          <Button
            variant="contained"
            color="error"
            startIcon={<RecordIcon sx={{ fontSize: 14 }} />}
            onClick={onRecord}
            size="small"
            sx={{
              height: 44, px: 1.5, fontSize: '0.78rem', flexDirection: 'column',
              gap: '2px', lineHeight: 1,
              background: 'rgba(245,101,101,0.15)',
              color: '#F56565',
              border: '1px solid rgba(245,101,101,0.3)',
              boxShadow: 'none',
              '& .MuiButton-startIcon': { margin: 0 },
              '&:hover': { background: 'rgba(245,101,101,0.25)', boxShadow: 'none', transform: 'none' },
            }}
          >
            Record
          </Button>
        </Tooltip>
      ) : (
        <Tooltip title="Stop Recording">
          <Button
            variant="contained"
            color="error"
            startIcon={<StopIcon sx={{ fontSize: 14 }} />}
            onClick={onStopRecording}
            size="small"
            sx={{
              height: 44, px: 1.5, fontSize: '0.78rem', flexDirection: 'column',
              gap: '2px', lineHeight: 1,
              background: 'rgba(245,101,101,0.9)',
              boxShadow: '0 0 12px rgba(245,101,101,0.4)',
              animation: 'pulse 2s infinite',
              '& .MuiButton-startIcon': { margin: 0 },
              '&:hover': { transform: 'none' },
            }}
          >
            Stop
          </Button>
        </Tooltip>
      )}

      {/* Speed selector */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
        <Tooltip title="Replay speed — delay between each step">
          <Select
            value={replaySpeed}
            onChange={(e) => onReplaySpeedChange(e.target.value as ReplaySpeed)}
            disabled={status === 'running'}
            size="small"
            variant="outlined"
            sx={{
              height: 26,
              fontSize: '0.72rem',
              color: '#A0A0B4',
              backgroundColor: '#1a1a1a',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#2a2a2a' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#3a3a3a' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#48BB78' },
              '& .MuiSvgIcon-root': { color: '#555' },
              '& .MuiSelect-select': { py: '3px', pl: 1 },
            }}
          >
            <MenuItem value="very_slow" sx={{ fontSize: '0.78rem' }}>🐌 Very Slow</MenuItem>
            <MenuItem value="slow"      sx={{ fontSize: '0.78rem' }}>🐢 Slow</MenuItem>
            <MenuItem value="normal"    sx={{ fontSize: '0.78rem' }}>▶ Normal</MenuItem>
            <MenuItem value="fast"      sx={{ fontSize: '0.78rem' }}>⚡ Fast</MenuItem>
            <MenuItem value="instant"   sx={{ fontSize: '0.78rem' }}>⚡⚡ Instant</MenuItem>
          </Select>
        </Tooltip>
        <Typography sx={{ fontSize: '0.6rem', color: '#555', fontWeight: 500, lineHeight: 1 }}>Speed</Typography>
      </Box>

      {/* Run */}
      <Tooltip title="Run Workflow">
        <span>
          <Button
            variant="contained"
            color="success"
            startIcon={<RunIcon sx={{ fontSize: 14 }} />}
            onClick={onRun}
            disabled={status === 'running'}
            size="small"
            sx={{
              height: 44, px: 1.5, fontSize: '0.78rem', flexDirection: 'column',
              gap: '2px', lineHeight: 1,
              background: status === 'running' ? 'rgba(72,187,120,0.1)' : 'rgba(72,187,120,0.15)',
              color: status === 'running' ? '#2d6a47' : '#48BB78',
              border: `1px solid ${status === 'running' ? '#1d4a31' : 'rgba(72,187,120,0.3)'}`,
              boxShadow: 'none',
              '& .MuiButton-startIcon': { margin: 0 },
              '&:hover': { background: 'rgba(72,187,120,0.25)', boxShadow: 'none', transform: 'none' },
              '&.Mui-disabled': { color: '#2d6a47', borderColor: '#1d4a31' },
            }}
          >
            {status === 'running' ? 'Running…' : 'Run'}
          </Button>
        </span>
      </Tooltip>

      <Sep />

      {/* Undo / Redo */}
      <TB title="Undo (Ctrl+Z)" label="Undo" onClick={onUndo} disabled={!canUndo}>
        <UndoIcon sx={{ fontSize: 15 }} />
      </TB>
      <TB title="Redo (Ctrl+Y)" label="Redo" onClick={onRedo} disabled={!canRedo}>
        <RedoIcon sx={{ fontSize: 15 }} />
      </TB>

      <Sep />

      {/* View */}
      <TB title="Fit all nodes into view" label="Fit View" onClick={onFitView}><FitViewIcon sx={{ fontSize: 16 }} /></TB>
      <TB title="Auto arrange all nodes" label="Layout" onClick={onAutoLayout}><AutoLayoutIcon sx={{ fontSize: 16 }} /></TB>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.65; }
        }
      `}</style>
    </Box>
  );
};

export default WorkflowToolbar;

// Made with Bob
