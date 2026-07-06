// ExecutionStatusDonut.tsx — SVG pie chart for execution status breakdown
import { Box, Card, CardContent, Typography } from '@mui/material';
import PieChartIcon from '@mui/icons-material/PieChart';
import { DashboardData } from '../../pages/Dashboard';

interface Props { data: DashboardData | null; loading: boolean; }

// Keys must match WorkflowStatus enum values from the backend (e.g. "completed", "failed")
export const STATUS_CFG: Record<string, { label: string; color: string }> = {
  completed:             { label: 'Completed', color: '#48BB78' },
  failed:                { label: 'Failed',    color: '#F56565' },
  active:                { label: 'Running',   color: '#5B7CF6' },
  draft:                 { label: 'Queued',    color: '#F6AD55' },
  paused:                { label: 'Paused',    color: '#A0A0B4' },
  // Guard against old serialisation bug producing "workflowstatus.x" keys
  'workflowstatus.completed': { label: 'Completed', color: '#48BB78' },
  'workflowstatus.failed':    { label: 'Failed',    color: '#F56565' },
  'workflowstatus.active':    { label: 'Running',   color: '#5B7CF6' },
  'workflowstatus.draft':     { label: 'Queued',    color: '#F6AD55' },
};

const CX = 56, CY = 56, R = 44, INNER_R = 26;

function toRad(deg: number) { return (deg * Math.PI) / 180; }

function pieSlicePath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = cy + r * Math.sin(toRad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

function buildSegments(breakdown: Record<string, number>) {
  const entries = Object.entries(breakdown).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total === 0) return { segments: [], total: 0 };
  let startDeg = -90;
  const segments = entries.map(([key, value]) => {
    const cfg = STATUS_CFG[key] ?? { label: key, color: '#888' };
    const sweep = (value / total) * 360;
    const endDeg = startDeg + sweep;
    const seg = { key, label: cfg.label, color: cfg.color, value, startDeg, endDeg };
    startDeg = endDeg;
    return seg;
  });
  return { segments, total };
}

export default function ExecutionStatusDonut({ data, loading }: Props) {
  const breakdown = data?.statusBreakdown ?? {};
  const { segments, total } = buildSegments(breakdown);

  return (
    <Card elevation={0} sx={{
      background: 'linear-gradient(135deg, rgba(30,30,46,0.85) 0%, rgba(20,20,32,0.92) 100%)',
      backdropFilter: 'blur(14px)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '14px',
      transition: 'box-shadow 0.2s',
      '&:hover': { boxShadow: '0 8px 32px rgba(0,0,0,0.4)' },
    }}>
      <CardContent sx={{ p: '20px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <PieChartIcon sx={{ fontSize: 18, color: '#7C5CF6' }} />
          <Typography variant="h6" sx={{ color: '#E0E0F0', fontWeight: 600, fontSize: '0.95rem' }}>
            Execution Status
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {/* Pie chart */}
          <Box sx={{ flexShrink: 0 }}>
            {loading || total === 0 ? (
              <svg width={112} height={112}>
                <circle cx={CX} cy={CY} r={R} fill="#1e1e2e" stroke="#2a2a3a" strokeWidth={1} />
                <text x={CX} y={CY + 4} textAnchor="middle" fill="#444" fontSize={11}>No data</text>
              </svg>
            ) : (
              <svg width={112} height={112}>
                {/* Filled pie slices */}
                {segments.map((seg) => (
                  <path
                    key={seg.key}
                    d={pieSlicePath(CX, CY, R, seg.startDeg, seg.endDeg)}
                    fill={seg.color}
                    opacity={0.88}
                    stroke="#14141e"
                    strokeWidth={1.5}
                  >
                    <title>{`${seg.label}: ${seg.value}`}</title>
                  </path>
                ))}
                {/* Centre cutout to show total */}
                <circle cx={CX} cy={CY} r={INNER_R} fill="#14141e" />
                <text x={CX} y={CY - 4} textAnchor="middle" fill="#E0E0F0" fontSize={15} fontWeight={700}>{total}</text>
                <text x={CX} y={CY + 9} textAnchor="middle" fill="#666" fontSize={8}>Total</text>
              </svg>
            )}
          </Box>

          {/* Legend — only canonical keys (no workflowstatus.x fallback entries) */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {Object.entries(STATUS_CFG).filter(([key]) => !key.startsWith('workflowstatus.')).map(([key, cfg]) => {
              const val = (breakdown[key] ?? breakdown[`workflowstatus.${key}`]) ?? 0;
              return (
                <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '2px', backgroundColor: cfg.color, flexShrink: 0, opacity: 0.88 }} />
                  <Typography variant="caption" sx={{ color: '#999', minWidth: 70 }}>{cfg.label}</Typography>
                  <Typography variant="caption" sx={{ color: '#E0E0F0', fontWeight: 600 }}>{val}</Typography>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Proportional colour bar */}
        {total > 0 && !loading && (
          <Box sx={{ display: 'flex', borderRadius: '4px', overflow: 'hidden', height: '5px', mt: 2 }}>
            {segments.map((seg) => (
              <Box
                key={seg.key}
                sx={{ height: '100%', width: `${((seg.endDeg - seg.startDeg) / 360) * 100}%`, backgroundColor: seg.color, opacity: 0.85 }}
              />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// Made with Bob
