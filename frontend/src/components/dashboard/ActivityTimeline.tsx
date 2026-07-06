// ActivityTimeline.tsx — activity feed grouped by status label
import { Box, Card, CardContent, Typography } from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EventIcon from '@mui/icons-material/Event';
import ViewModuleIcon from '@mui/icons-material/ViewModule';

interface Activity {
  type: string;
  label: string;
  timestamp: string;
  detail?: string; // format: "<workflow name> — <STATUS>"
}

// The 5 status groups to display, in a fixed display order
const STATUS_GROUPS = [
  'Workflow Executed',
  'Workflow Created',
  'Block Created',
  'Workflow Scheduled',
  'Execution Failed',
] as const;

type StatusGroup = typeof STATUS_GROUPS[number];

interface GroupedActivity {
  statusLabel: StatusGroup;
  latestTimestamp: string;
  latestWorkflowName: string; // workflow name from the most-recent entry in this group
  count: number;
}

interface Props { activities: Activity[]; }

const GROUP_CFG: Record<StatusGroup, { color: string; Icon: any }> = {
  'Workflow Executed':  { color: '#48BB78', Icon: PlayCircleFilledIcon },
  'Workflow Created':   { color: '#5B7CF6', Icon: AddCircleIcon },
  'Block Created':      { color: '#7C5CF6', Icon: ViewModuleIcon },
  'Workflow Scheduled': { color: '#3B82F6', Icon: EventIcon },
  'Execution Failed':   { color: '#F56565', Icon: ErrorIcon },
};

// Map raw activity labels → one of the 5 canonical groups
const LABEL_TO_GROUP: Record<string, StatusGroup> = {
  'Execution Completed': 'Workflow Executed',
  'Execution Running':   'Workflow Executed',
  'Workflow Executed':   'Workflow Executed',
  'Workflow Created':    'Workflow Created',
  'Block Created':       'Block Created',
  'Workflow Scheduled':  'Workflow Scheduled',
  'Execution Failed':    'Execution Failed',
};

function fmtRelative(iso: string): string {
  if (!iso) return '—';
  // Treat bare ISO strings (no Z / offset) as UTC to match backend storage
  const normalised = /[Z+\-]\d*$/.test(iso) ? iso : iso + 'Z';
  const diff = Date.now() - new Date(normalised).getTime();
  if (!isFinite(diff) || diff < 0) return 'just now';
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Extract the display name from "Name — DETAIL"
// For scheduled jobs the detail is "ScheduleName → WorkflowNames — cron/date"
// We want to show everything before the last " — " separator.
function extractName(detail?: string): string {
  if (!detail) return 'Unknown';
  const idx = detail.lastIndexOf(' — ');
  return idx !== -1 ? detail.slice(0, idx).trim() : detail.trim();
}

// Group activities by status label, always return all 5 groups (count 0 when no data)
function groupByStatus(activities: Activity[]): GroupedActivity[] {
  const map = new Map<StatusGroup, GroupedActivity>();

  // Seed every group so all 5 always appear
  for (const s of STATUS_GROUPS) {
    map.set(s, { statusLabel: s, latestTimestamp: '', latestWorkflowName: '', count: 0 });
  }

  for (const a of activities) {
    const group = LABEL_TO_GROUP[a.label];
    if (!group) continue; // ignore unmapped labels
    const wfName = extractName(a.detail);
    const existing = map.get(group)!;
    existing.count += 1;
    if (!existing.latestTimestamp || new Date(a.timestamp) > new Date(existing.latestTimestamp)) {
      existing.latestTimestamp = a.timestamp;
      existing.latestWorkflowName = wfName;
    }
  }

  // Return in fixed display order
  return STATUS_GROUPS.map((s) => map.get(s)!);
}

export default function ActivityTimeline({ activities }: Props) {
  const grouped = groupByStatus(activities);

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
          {/* Vertical connector line */}
          <Box sx={{ position: 'absolute', left: '7px', top: 0, bottom: 0, width: 1, backgroundColor: '#1e1e2e' }} />

          {grouped.map((g, i) => {
            const cfg = GROUP_CFG[g.statusLabel];
            const Icon = cfg.Icon;
            const isEmpty = g.count === 0;
            return (
              <Box key={g.statusLabel} sx={{ display: 'flex', gap: 1.5, mb: i < grouped.length - 1 ? 2 : 0, position: 'relative' }}>
                {/* Status icon dot — dimmed when no data */}
                <Box sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: isEmpty ? 'rgba(255,255,255,0.03)' : `${cfg.color}20`, border: `1.5px solid ${isEmpty ? '#333' : cfg.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1, mt: '2px' }}>
                  <Icon sx={{ fontSize: 9, color: isEmpty ? '#444' : cfg.color }} />
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {/* Top line: status label + count badge + relative time */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, overflow: 'hidden' }}>
                      <Typography variant="body2" sx={{ color: isEmpty ? '#444' : cfg.color, fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {g.statusLabel}
                      </Typography>
                      {g.count > 1 && (
                        <Typography variant="caption" sx={{ color: '#555', fontSize: '0.66rem', whiteSpace: 'nowrap' }}>
                          ·{g.count}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="caption" sx={{ color: '#555', fontSize: '0.68rem', flexShrink: 0, ml: 1 }}>
                      {isEmpty ? '—' : fmtRelative(g.latestTimestamp)}
                    </Typography>
                  </Box>

                  {/* Bottom line: latest workflow/block/schedule name — truncated, or "No activity" */}
                  <Typography
                    variant="caption"
                    title={isEmpty ? undefined : g.latestWorkflowName}
                    sx={{ color: isEmpty ? '#333' : '#666', fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', fontStyle: isEmpty ? 'italic' : 'normal' }}
                  >
                    {isEmpty ? 'No activity' : g.latestWorkflowName}
                  </Typography>
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
