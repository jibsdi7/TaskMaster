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
  // Desktop icons
  DesktopWindows as DesktopClickIcon,
  SpaceBar as DesktopTypeIcon,
  Shortcut as HotkeyIcon,
  OpenWith as MoveIcon,
  DragIndicator as DragIcon,
  SwapVert as ScrollIcon,
  CameraAlt as ScreenshotIcon,
  Image as FindImageIcon,
  Launch as LaunchAppIcon,
  Close as CloseAppIcon,
  Tab as SwitchWindowIcon,
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
  // ── Web / Browser Actions (Playwright) ──────────────────────────────────
  { type: 'CLICK',       label: 'Click',        icon: ClickIcon,     category: 'Browser Actions', description: 'Click an element' },
  { type: 'TYPE',        label: 'Type',          icon: TypeIcon,      category: 'Browser Actions', description: 'Type text into input' },
  { type: 'SELECT',      label: 'Select',        icon: SelectIcon,    category: 'Browser Actions', description: 'Select dropdown option' },
  { type: 'HOVER',       label: 'Hover',         icon: HoverIcon,     category: 'Browser Actions', description: 'Hover over element' },
  { type: 'UPLOAD_FILE', label: 'Upload File',   icon: UploadIcon,    category: 'Browser Actions', description: 'Upload file' },

  // ── Navigation (Web) ────────────────────────────────────────────────────
  { type: 'OPEN_URL',    label: 'Open URL',      icon: NavigateIcon,  category: 'Navigation',      description: 'Navigate to URL' },
  { type: 'BACK',        label: 'Back',          icon: BackIcon,      category: 'Navigation',      description: 'Go back' },
  { type: 'REFRESH',     label: 'Refresh',       icon: RefreshIcon,   category: 'Navigation',      description: 'Refresh page' },

  // ── Control Flow ─────────────────────────────────────────────────────────
  { type: 'DELAY',       label: 'Delay',         icon: DelayIcon,     category: 'Control Flow',    description: 'Wait for duration' },
  { type: 'IF_CONDITION',label: 'If Condition',  icon: ConditionIcon, category: 'Control Flow',    description: 'Conditional branch' },
  { type: 'LOOP',        label: 'Loop',          icon: LoopIcon,      category: 'Control Flow',    description: 'Repeat actions' },

  // ── Data ─────────────────────────────────────────────────────────────────
  { type: 'VARIABLE',    label: 'Variable',      icon: VariableIcon,  category: 'Data',            description: 'Store/retrieve data' },
  { type: 'API_REQUEST', label: 'API Request',   icon: ApiIcon,       category: 'Data',            description: 'Make HTTP request' },

  // ── Desktop Actions (PyAutoGUI) ──────────────────────────────────────────
  {
    type: 'DESKTOP_CLICK',
    label: 'Desktop Click',
    icon: DesktopClickIcon,
    category: 'Desktop Actions',
    description: 'Click at screen coordinates',
  },
  {
    type: 'DESKTOP_TYPE',
    label: 'Desktop Type',
    icon: DesktopTypeIcon,
    category: 'Desktop Actions',
    description: 'Type text via keyboard',
  },
  {
    type: 'DESKTOP_HOTKEY',
    label: 'Hotkey',
    icon: HotkeyIcon,
    category: 'Desktop Actions',
    description: 'Press a key combination (Ctrl+C, Alt+F4…)',
  },
  {
    type: 'DESKTOP_MOVE',
    label: 'Move Mouse',
    icon: MoveIcon,
    category: 'Desktop Actions',
    description: 'Move mouse to screen coordinates',
  },
  {
    type: 'DESKTOP_DRAG',
    label: 'Drag & Drop',
    icon: DragIcon,
    category: 'Desktop Actions',
    description: 'Drag from one point to another',
  },
  {
    type: 'DESKTOP_SCROLL',
    label: 'Scroll',
    icon: ScrollIcon,
    category: 'Desktop Actions',
    description: 'Scroll the mouse wheel',
  },
  {
    type: 'DESKTOP_SCREENSHOT',
    label: 'Desktop Screenshot',
    icon: ScreenshotIcon,
    category: 'Desktop Actions',
    description: 'Capture a screenshot of the desktop',
  },
  {
    type: 'DESKTOP_FIND_IMAGE',
    label: 'Find Image',
    icon: FindImageIcon,
    category: 'Desktop Actions',
    description: 'Locate an image on screen and click it',
  },
  {
    type: 'DESKTOP_LAUNCH_APP',
    label: 'Launch App',
    icon: LaunchAppIcon,
    category: 'Desktop Actions',
    description: 'Launch a desktop application',
  },
  {
    type: 'DESKTOP_CLOSE_APP',
    label: 'Close App',
    icon: CloseAppIcon,
    category: 'Desktop Actions',
    description: 'Close a desktop application window',
  },
  {
    type: 'DESKTOP_SWITCH_WINDOW',
    label: 'Switch Window',
    icon: SwitchWindowIcon,
    category: 'Desktop Actions',
    description: 'Bring a window to the foreground',
  },
];

export const NODE_COLORS: Record<string, string> = {
  // Web
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
  // Desktop (amber / orange family to distinguish from web)
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

// Made with Bob
