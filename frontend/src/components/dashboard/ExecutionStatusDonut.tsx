// ExecutionStatusDonut.tsx — SVG donut chart for execution status breakdown
import { Box, Card, CardContent, Typography } from '@mui/material';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import { DashboardData } from '../../pages/Dashboard';

interface Props { data: DashboardData | null; loading: boolean; }

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  completed: { label: 'Completed', color: '#48BB78' },
  failed:    { label: 'Failed',    color: '#F56565' },
  active:    { label: 'Running',   color: '#5B7CF6' },
  draft:     { label: 'Queued',    color: '#F6AD55' },
};

function donutSegments(data: Record<string, number>) {
  const entries = Object.entries(data).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total === 0) return [];
  let startAngle = -90; // start at top
  const R = 44, CX = 56, CY = 56, stroke = 18;
  const circumference = 2 * Math.PI * R;
  return entries.map(([key, value]) => {
    const pct = value / total;
    const cfg = STATUS_CFG[key] ?? { label: key, color: '#888' };
    const seg = { key, label: cfg.label, color: cfg.color, value, pct, startAngle };
    startAngle += pct * 360;
    return seg;
  });
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = cy + r * Math.sin(toRad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

export default function ExecutionStatusDonut({ data, loading }: Props) {
  const breakdown = data?.statusBreakdown ?? {};
  const segments = donutSegments(breakdown);
  const total = segments.reduce((s, seg) => s + seg.value, 0);

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
          <DonutLargeIcon sx={{ fontSize: 18, color: '#7C5CF6' }} />
          <Typography variant="h6" sx={{ color: '#E0E0F0', fontWeight: 600, fontSize: '0.95rem' }}>
            Execution Status
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {/* Donut */}
          <Box sx={{ flexShrink: 0 }}>
            {loading || total === 0 ? (
              <svg width={112} height={112}>
                <circle cx={56} cy={56} r={44} fill="none" stroke="#222" strokeWidth={18} />
                <text x={56} y={60} textAnchor="middle" fill="#444" fontSize={12}>No data</text>
              </svg>
            ) : (
              <svg width={112} height={112}>
                {/* Background track */}
                <circle cx={56} cy={56} r={44} fill="none" stroke="#222" strokeWidth={18} />
                {segments.map((seg) => {
                  const endAngle = seg.startAngle + seg.pct * 360 - 0.5;
                  return (
                    <path
                      key={seg.key}
                      d={arcPath(56, 56, 44, seg.startAngle, endAngle)}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={18}
                      strokeLinecap="butt"
                    >
                      <title>{`${seg.label}: ${seg.value}`}</title>
                    </path>
                  );
                })}
                {/* Center label */}
                <text x={56} y={52} textAnchor="middle" fill="#E0E0F0" fontSize={18} fontWeight={700}>{total}</text>
                <text x={56} y={66} textAnchor="middle" fill="#666" fontSize={9}>Total</text>
              </svg>
            )}
          </Box>

          {/* Legend */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {Object.entries(STATUS_CFG).map(([key, cfg]) => {
              const val = breakdown[key] ?? 0;
              return (
                <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: cfg.color, flexShrink: 0 }} />
                  <Typography variant="caption" sx={{ color: '#999', minWidth: 70 }}>{cfg.label}</Typography>
                  <Typography variant="caption" sx={{ color: '#E0E0F0', fontWeight: 600 }}>{val}</Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// Made with Bob
