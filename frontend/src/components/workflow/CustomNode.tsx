import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Typography, IconButton, Chip } from '@mui/material';
import {
  Mouse as ClickIcon,
  Keyboard as TypeIcon,
  ArrowForward as NavigateIcon,
  Schedule as DelayIcon,
  Loop as LoopIcon,
  CallSplit as ConditionIcon,
  Storage as VariableIcon,
  Api as ApiIcon,
  ViewModule as BlockIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

export interface CustomNodeData {
  label: string;
  nodeType: string;
  config?: Record<string, any>;
  status?: 'idle' | 'running' | 'success' | 'error';
  onDelete?: (id: string) => void;
  onSettings?: (id: string) => void;
}

const nodeIcons: Record<string, any> = {
  CLICK: ClickIcon,
  TYPE: TypeIcon,
  OPEN_URL: NavigateIcon,
  DELAY: DelayIcon,
  LOOP: LoopIcon,
  IF_CONDITION: ConditionIcon,
  VARIABLE: VariableIcon,
  API_REQUEST: ApiIcon,
  BLOCK: BlockIcon,
};

const nodeColors: Record<string, string> = {
  CLICK: '#4CAF50',
  TYPE: '#2196F3',
  OPEN_URL: '#FF9800',
  DELAY: '#9C27B0',
  LOOP: '#F44336',
  IF_CONDITION: '#FFC107',
  VARIABLE: '#00BCD4',
  API_REQUEST: '#E91E63',
  BLOCK: '#607D8B',
};

const statusColors: Record<string, string> = {
  idle: '#757575',
  running: '#2196F3',
  success: '#4CAF50',
  error: '#F44336',
};

const CustomNode = memo(({ id, data }: NodeProps<CustomNodeData>) => {
  const Icon = nodeIcons[data.nodeType] || ClickIcon;
  const color = nodeColors[data.nodeType] || '#757575';
  const statusColor = statusColors[data.status || 'idle'];

  return (
    <Box
      sx={{
        minWidth: 200,
        backgroundColor: '#1e1e1e',
        border: `2px solid ${color}`,
        borderRadius: 2,
        boxShadow: 3,
        position: 'relative',
        '&:hover': {
          boxShadow: 6,
          borderColor: statusColor,
        },
      }}
    >
      {/* Status Indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: -8,
          right: -8,
          width: 16,
          height: 16,
          borderRadius: '50%',
          backgroundColor: statusColor,
          border: '2px solid #1e1e1e',
        }}
      />

      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1.5,
          backgroundColor: color,
          borderTopLeftRadius: 6,
          borderTopRightRadius: 6,
        }}
      >
        <Icon sx={{ fontSize: 20, color: 'white' }} />
        <Typography
          variant="body2"
          sx={{
            flex: 1,
            fontWeight: 600,
            color: 'white',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {data.label}
        </Typography>
        <IconButton
          size="small"
          onClick={() => data.onSettings?.(id)}
          sx={{ color: 'white', p: 0.5 }}
        >
          <SettingsIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => data.onDelete?.(id)}
          sx={{ color: 'white', p: 0.5 }}
        >
          <DeleteIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {/* Body */}
      <Box sx={{ p: 1.5 }}>
        <Chip
          label={data.nodeType}
          size="small"
          sx={{
            fontSize: 10,
            height: 20,
            backgroundColor: `${color}20`,
            color: color,
          }}
        />
        {data.config?.selector && (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 1,
              color: '#aaa',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {data.config.selector}
          </Typography>
        )}
        {data.config?.value && (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 0.5,
              color: '#888',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            Value: {data.config.value}
          </Typography>
        )}
      </Box>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: color,
          width: 10,
          height: 10,
          border: '2px solid #1e1e1e',
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: color,
          width: 10,
          height: 10,
          border: '2px solid #1e1e1e',
        }}
      />
    </Box>
  );
});

CustomNode.displayName = 'CustomNode';

export default CustomNode;

// Made with Bob
