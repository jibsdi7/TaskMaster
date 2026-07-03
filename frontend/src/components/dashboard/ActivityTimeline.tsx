// ActivityTimeline.tsx — recent activity feed
import { Box, Card, CardContent, Typography } from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EventIcon from '@mui/icons-material/Event';

interface Activity {
  type: string;
  label: string;
  timestamp: string;
  detail?: string;
}

interface Props { activities: Activity[]; }

const TYPE_CFG: Record<string, { color: string; Icon: any }> = {
  'Workflow Created':     { color: '#5B7CF6', Icon: AddCircleIcon },
  'Workflow Executed':    { color: '#48BB78', Icon: PlayCircleFilledIcon },
  'Recording Started':    { color: '#F6AD55', Icon: FiberManualRecordIcon },
  'Recording Completed':  { color: '#48BB78', Icon: StopCircleIcon },
  'Block Created':        { color: '#7C5CF6', Icon: AddCircleIcon },
  'Workflow Scheduled':   { color: '#3B82F6', Icon: EventIcon },
  'Execution Failed':     { color: '#F56565', Icon: ErrorIcon },
  'Execution Completed':  { color: '#48BB78', Icon: CheckCircleIcon },
};

// Generate mock activities if none provided
function mockActivities(): Activity[] {
  const now = Date.now();
  return [
    { type: 'Execution Completed', label: 'Workflow Executed', timestamp: new Date(now - 120000).toISOString(), detail: 'Test14 — COMPLETED' },
    { type: 'Workflow Created',    label: 'Workflow Created',  timestamp: new Date(now - 600000).toISOString(), detail: 'New workflow added' },
    { type: 'Recording Completed', label: 'Recording Completed', timestamp: new Date(now - 1800000).toISOString(), detail: 'Session recorded' },
    { type: 'Block Created',       label: 'Block Created',     timestamp: new Date(now - 3600000).toISOString(), detail: 'Login Block saved' },
    { type: 'Workflow Scheduled',  label: 'Workflow Scheduled', timestamp: new Date(now - 7200000).toISOString(), detail: 'Scheduled daily' },
    { type: 'Execution Failed',    label: 'Execution Failed',  timestamp: new Date(now - 14400000).toISOString(), detail: 'Selector not found' },
  ];
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ActivityTimeline({ activities }: Props) {
  const items = activities.length > 0 ? activities : mockActivities();

  return (
    <Card elevation={0} sx={{
      background: 'linear-gradient(135deg, rgba(30,30,46,0.85) 0%, rgba(20,20,32,0.92) 100%)',
      backdropFilter: 'blur(14px)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '14px',
    }}>
      <CardContent sx={{ p: '20px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <TimelineIcon sx={{ fontSize: 18, color: '#5B7CF6' }} />
          <Typography variant="h6" sx={{ color: '#E0E0F0', fontWeight: 600, fontSize: '0.95rem' }}>
            Activity Timeline
          </Typography>
        </Box>

        <Box sx={{ position: 'relative', pl: 2 }}>
          {/* Vertical line */}
          <Box sx={{ position: 'absolute', left: '7px', top: 0, bottom: 0, width: 1, backgroundColor: '#1e1e2e' }} />

          {items.map((a, i) => {
            const cfg = TYPE_CFG[a.type] ?? { color: '#666', Icon: EventIcon };
            const Icon = cfg.Icon;
            return (
              <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: i < items.length - 1 ? 2 : 0, position: 'relative' }}>
                <Box sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: `${cfg.color}20`, border: `1.5px solid ${cfg.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1, mt: '1px' }}>
                  <Icon sx={{ fontSize: 9, color: cfg.color }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Typography variant="body2" sx={{ color: '#C0C0D0', fontSize: '0.8rem', fontWeight: 500 }}>{a.label}</Typography>
                    <Typography variant="caption" sx={{ color: '#555', fontSize: '0.68rem', flexShrink: 0, ml: 1 }}>{fmtRelative(a.timestamp)}</Typography>
                  </Box>
                  {a.detail && (
                    <Typography variant="caption" sx={{ color: '#666', fontSize: '0.72rem' }}>{a.detail}</Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
}

// Made with Bob
