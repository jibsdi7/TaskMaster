import {
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
} from '@mui/icons-material';

export interface NodeTemplate {
  type: string;
  label: string;
  icon: any;
  category: string;
  description: string;
  blockId?: number;
}

export const STATIC_NODES: NodeTemplate[] = [
  // Browser Actions
  { type: 'CLICK',       label: 'Click',        icon: ClickIcon,     category: 'Browser Actions', description: 'Click an element' },
  { type: 'TYPE',        label: 'Type',          icon: TypeIcon,      category: 'Browser Actions', description: 'Type text into input' },
  { type: 'SELECT',      label: 'Select',        icon: SelectIcon,    category: 'Browser Actions', description: 'Select dropdown option' },
  { type: 'HOVER',       label: 'Hover',         icon: HoverIcon,     category: 'Browser Actions', description: 'Hover over element' },
  { type: 'UPLOAD_FILE', label: 'Upload File',   icon: UploadIcon,    category: 'Browser Actions', description: 'Upload file' },
  // Navigation
  { type: 'OPEN_URL',    label: 'Open URL',      icon: NavigateIcon,  category: 'Navigation',      description: 'Navigate to URL' },
  { type: 'BACK',        label: 'Back',          icon: BackIcon,      category: 'Navigation',      description: 'Go back' },
  { type: 'REFRESH',     label: 'Refresh',       icon: RefreshIcon,   category: 'Navigation',      description: 'Refresh page' },
  // Control Flow
  { type: 'DELAY',       label: 'Delay',         icon: DelayIcon,     category: 'Control Flow',    description: 'Wait for duration' },
  { type: 'IF_CONDITION',label: 'If Condition',  icon: ConditionIcon, category: 'Control Flow',    description: 'Conditional branch' },
  { type: 'LOOP',        label: 'Loop',          icon: LoopIcon,      category: 'Control Flow',    description: 'Repeat actions' },
  // Data
  { type: 'VARIABLE',    label: 'Variable',      icon: VariableIcon,  category: 'Data',            description: 'Store/retrieve data' },
  { type: 'API_REQUEST', label: 'API Request',   icon: ApiIcon,       category: 'Data',            description: 'Make HTTP request' },
];

export const NODE_COLORS: Record<string, string> = {
  CLICK: '#4CAF50',
  TYPE: '#2196F3',
  OPEN_URL: '#FF9800',
  DELAY: '#9C27B0',
  LOOP: '#F44336',
  IF_CONDITION: '#FFC107',
  VARIABLE: '#00BCD4',
  API_REQUEST: '#E91E63',
  BLOCK: '#607D8B',
  SELECT: '#26A69A',
  HOVER: '#8D6E63',
  UPLOAD_FILE: '#5C6BC0',
  BACK: '#78909C',
  REFRESH: '#42A5F5',
};

// Made with Bob
