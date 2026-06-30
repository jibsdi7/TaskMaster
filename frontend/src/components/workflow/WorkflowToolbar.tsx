import { Box, Button, Divider, IconButton, InputBase, Tooltip, Typography } from '@mui/material';
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
} from '@mui/icons-material';

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
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onAutoLayout: () => void;
  onSaveAsBlock: () => void;
  onImportBlock: () => void;
  onViewCode: () => void;
}

const Sep = () => (
  <Divider orientation="vertical" flexItem sx={{ borderColor: '#242424', mx: 0.5 }} />
);

const TB = ({ title, children, onClick, disabled = false }: any) => (
  <Tooltip title={title}>
    <span>
      <IconButton
        size="small"
        onClick={onClick}
        disabled={disabled}
        sx={{
          color: disabled ? '#333' : '#A0A0B4',
          borderRadius: '7px',
          width: 30,
          height: 30,
          '&:hover': { backgroundColor: '#242424', color: '#E0E0F0' },
          '&.Mui-disabled': { color: '#333' },
        }}
      >
        {children}
      </IconButton>
    </span>
  </Tooltip>
);

const WorkflowToolbar = ({
  workflowName, onRenameWorkflow, status, isRecording, canUndo, canRedo,
  onNew, onSave, onDelete, onImport, onExport,
  onRecord, onStopRecording, onRun, onUndo, onRedo,
  onZoomIn, onZoomOut, onFitView, onAutoLayout, onSaveAsBlock, onImportBlock, onViewCode,
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
        height: 52,
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
      <TB title="New" onClick={onNew}><NewIcon sx={{ fontSize: 16 }} /></TB>
      <TB title="Save" onClick={onSave}><SaveIcon sx={{ fontSize: 16 }} /></TB>
      <TB title="Save as Block" onClick={onSaveAsBlock}><BlockIcon sx={{ fontSize: 16 }} /></TB>
      <TB title="Import Block into canvas" onClick={onImportBlock}>
        <ImportBlockIcon sx={{ fontSize: 16 }} />
      </TB>
      <TB title="Delete" onClick={onDelete}><DeleteIcon sx={{ fontSize: 16 }} /></TB>

      <Sep />

      {/* Import / Export / Code */}
      <TB title="Import JSON" onClick={onImport}><ImportIcon sx={{ fontSize: 16 }} /></TB>
      <TB title="Export JSON" onClick={onExport}><ExportIcon sx={{ fontSize: 16 }} /></TB>
      <TB title="View Code" onClick={onViewCode}><CodeIcon sx={{ fontSize: 16 }} /></TB>

      <Sep />

      {/* Record */}
      {!isRecording ? (
        <Tooltip title="Start Recording">
          <Button
            variant="contained"
            color="error"
            startIcon={<RecordIcon sx={{ fontSize: 14 }} />}
            onClick={onRecord}
            size="small"
            sx={{
              height: 30, px: 1.5, fontSize: '0.78rem',
              background: 'rgba(245,101,101,0.15)',
              color: '#F56565',
              border: '1px solid rgba(245,101,101,0.3)',
              boxShadow: 'none',
              '&:hover': {
                background: 'rgba(245,101,101,0.25)',
                boxShadow: 'none',
                transform: 'none',
              },
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
              height: 30, px: 1.5, fontSize: '0.78rem',
              background: 'rgba(245,101,101,0.9)',
              boxShadow: '0 0 12px rgba(245,101,101,0.4)',
              animation: 'pulse 2s infinite',
              '&:hover': { transform: 'none' },
            }}
          >
            Stop
          </Button>
        </Tooltip>
      )}

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
              height: 30, px: 1.5, fontSize: '0.78rem',
              background: status === 'running'
                ? 'rgba(72,187,120,0.1)'
                : 'rgba(72,187,120,0.15)',
              color: status === 'running' ? '#2d6a47' : '#48BB78',
              border: `1px solid ${status === 'running' ? '#1d4a31' : 'rgba(72,187,120,0.3)'}`,
              boxShadow: 'none',
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
      <TB title="Undo (Ctrl+Z)" onClick={onUndo} disabled={!canUndo}>
        <UndoIcon sx={{ fontSize: 15 }} />
      </TB>
      <TB title="Redo (Ctrl+Y)" onClick={onRedo} disabled={!canRedo}>
        <RedoIcon sx={{ fontSize: 15 }} />
      </TB>

      <Sep />

      {/* View */}
      <TB title="Fit View" onClick={onFitView}><FitViewIcon sx={{ fontSize: 16 }} /></TB>
      <TB title="Auto Layout" onClick={onAutoLayout}><AutoLayoutIcon sx={{ fontSize: 16 }} /></TB>

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
