import { Box, Button, ButtonGroup, Chip, Divider, IconButton, Tooltip } from '@mui/material';
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
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  FitScreen as FitViewIcon,
  AutoFixHigh as AutoLayoutIcon,
  ViewModule as BlockIcon,
} from '@mui/icons-material';

interface WorkflowToolbarProps {
  workflowName: string;
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
}

const WorkflowToolbar = ({
  workflowName,
  status,
  isRecording,
  canUndo,
  canRedo,
  onNew,
  onSave,
  onDelete,
  onImport,
  onExport,
  onRecord,
  onStopRecording,
  onRun,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onFitView,
  onAutoLayout,
  onSaveAsBlock,
}: WorkflowToolbarProps) => {
  const getStatusColor = () => {
    switch (status) {
      case 'recording':
        return 'error';
      case 'running':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'recording':
        return 'Recording';
      case 'running':
        return 'Running';
      default:
        return 'Idle';
    }
  };

  return (
    <Box
      sx={{
        height: 64,
        backgroundColor: '#1e1e1e',
        borderBottom: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        px: 2,
        gap: 2,
      }}
    >
      {/* Workflow Name */}
      <Box sx={{ minWidth: 200 }}>
        <Chip
          label={workflowName || 'Untitled Workflow'}
          sx={{
            backgroundColor: '#2a2a2a',
            color: 'white',
            fontWeight: 600,
          }}
        />
      </Box>

      <Divider orientation="vertical" flexItem sx={{ borderColor: '#333' }} />

      {/* File Actions */}
      <ButtonGroup variant="outlined" size="small">
        <Tooltip title="New Workflow">
          <Button startIcon={<NewIcon />} onClick={onNew} sx={{ color: 'white', borderColor: '#444' }}>
            New
          </Button>
        </Tooltip>
        <Tooltip title="Save Workflow">
          <Button startIcon={<SaveIcon />} onClick={onSave} sx={{ color: 'white', borderColor: '#444' }}>
            Save
          </Button>
        </Tooltip>
        <Tooltip title="Save as Reusable Block">
          <Button startIcon={<BlockIcon />} onClick={onSaveAsBlock} sx={{ color: 'white', borderColor: '#444' }}>
            Save Block
          </Button>
        </Tooltip>
        <Tooltip title="Delete Workflow">
          <Button startIcon={<DeleteIcon />} onClick={onDelete} sx={{ color: 'white', borderColor: '#444' }}>
            Delete
          </Button>
        </Tooltip>
      </ButtonGroup>

      <Divider orientation="vertical" flexItem sx={{ borderColor: '#333' }} />

      {/* Import/Export */}
      <ButtonGroup variant="outlined" size="small">
        <Tooltip title="Import Workflow">
          <Button startIcon={<ImportIcon />} onClick={onImport} sx={{ color: 'white', borderColor: '#444' }}>
            Import
          </Button>
        </Tooltip>
        <Tooltip title="Export Workflow">
          <Button startIcon={<ExportIcon />} onClick={onExport} sx={{ color: 'white', borderColor: '#444' }}>
            Export
          </Button>
        </Tooltip>
      </ButtonGroup>

      <Divider orientation="vertical" flexItem sx={{ borderColor: '#333' }} />

      {/* Recording Controls */}
      {!isRecording ? (
        <Tooltip title="Start Recording">
          <Button
            variant="contained"
            color="error"
            startIcon={<RecordIcon />}
            onClick={onRecord}
            size="small"
          >
            Record
          </Button>
        </Tooltip>
      ) : (
        <Tooltip title="Stop Recording">
          <Button
            variant="contained"
            color="error"
            startIcon={<StopIcon />}
            onClick={onStopRecording}
            size="small"
            sx={{ animation: 'pulse 2s infinite' }}
          >
            Stop Recording
          </Button>
        </Tooltip>
      )}

      {/* Run Workflow */}
      <Tooltip title="Run Workflow">
        <Button
          variant="contained"
          color="success"
          startIcon={<RunIcon />}
          onClick={onRun}
          disabled={status === 'running'}
          size="small"
        >
          Run
        </Button>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ borderColor: '#333' }} />

      {/* Undo/Redo */}
      <ButtonGroup variant="outlined" size="small">
        <Tooltip title="Undo">
          <span>
            <IconButton onClick={onUndo} disabled={!canUndo} sx={{ color: 'white', borderColor: '#444' }}>
              <UndoIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Redo">
          <span>
            <IconButton onClick={onRedo} disabled={!canRedo} sx={{ color: 'white', borderColor: '#444' }}>
              <RedoIcon />
            </IconButton>
          </span>
        </Tooltip>
      </ButtonGroup>

      <Divider orientation="vertical" flexItem sx={{ borderColor: '#333' }} />

      {/* View Controls */}
      <ButtonGroup variant="outlined" size="small">
        <Tooltip title="Zoom In">
          <IconButton onClick={onZoomIn} sx={{ color: 'white', borderColor: '#444' }}>
            <ZoomInIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom Out">
          <IconButton onClick={onZoomOut} sx={{ color: 'white', borderColor: '#444' }}>
            <ZoomOutIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Fit View">
          <IconButton onClick={onFitView} sx={{ color: 'white', borderColor: '#444' }}>
            <FitViewIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Auto Layout">
          <IconButton onClick={onAutoLayout} sx={{ color: 'white', borderColor: '#444' }}>
            <AutoLayoutIcon />
          </IconButton>
        </Tooltip>
      </ButtonGroup>

      {/* Status Indicator */}
      <Box sx={{ ml: 'auto' }}>
        <Chip
          label={getStatusLabel()}
          color={getStatusColor()}
          size="small"
          icon={status === 'recording' ? <RecordIcon /> : status === 'running' ? <RunIcon /> : undefined}
          sx={{
            fontWeight: 600,
            animation: status !== 'idle' ? 'pulse 2s infinite' : 'none',
          }}
        />
      </Box>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}
      </style>
    </Box>
  );
};

export default WorkflowToolbar;

// Made with Bob
