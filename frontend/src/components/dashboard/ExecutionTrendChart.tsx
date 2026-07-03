// ExecutionTrendChart.tsx — SVG line chart (no external chart library needed)
import { useState, useMemo } from 'react';
import { Box, Card, CardContent, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { DashboardData } from '../../pages/Dashboard';

interface Props { data: DashboardData | null; loading: boolean; onPeriodChange: (d: number) => void; period: number; }

const PERIODS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
];

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  return points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cpx = (prev.x + p.x) / 2;
    return `${acc} C ${cpx} ${prev.y} ${cpx} ${p.y} ${p.x} ${p.y}`;
  }, '');
}

export default function ExecutionTrendChart({ data, loading, onPeriodChange, period }: Props) {
  const W = 480, H = 140, PAD = { top: 12, right: 12, bottom: 28, left: 36 };

  const trend = data?.executionTrend ?? [];

  const points = useMemo(() => {
    if (trend.length === 0) return [];
    const maxCount = Math.max(...trend.map((t) => t.count), 1);
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;
    return trend.map((t, i) => ({
      x: PAD.left + (i / Math.max(trend.length - 1, 1)) * chartW,
      y: PAD.top + chartH - (t.count / maxCount) * chartH,
      count: t.count,
      date: t.date,
    }));
  }, [trend]);

  const linePath = buildPath(points);
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${H - PAD.bottom} L ${points[0].x} ${H - PAD.bottom} Z`
    : '';

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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShowChartIcon sx={{ fontSize: 18, color: '#5B7CF6' }} />
            <Typography variant="h6" sx={{ color: '#E0E0F0', fontWeight: 600, fontSize: '0.95rem' }}>
              Execution Trend
            </Typography>
          </Box>
          <ToggleButtonGroup
            value={period}
            exclusive
            onChange={(_, v) => v && onPeriodChange(v)}
            size="small"
          >
            {PERIODS.map((p) => (
              <ToggleButton key={p.days} value={p.days} sx={{
                color: '#666', borderColor: '#2a2a2a', fontSize: '0.7rem', py: 0.25, px: 1.25,
                '&.Mui-selected': { color: '#7B96F9', backgroundColor: 'rgba(91,124,246,0.12)', borderColor: 'rgba(91,124,246,0.3)' },
              }}>
                {p.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ width: '100%', overflow: 'hidden' }}>
          {loading || trend.length === 0 ? (
            <Box sx={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body2" sx={{ color: '#444' }}>
                {loading ? 'Loading…' : 'No data for this period'}
              </Typography>
            </Box>
          ) : (
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5B7CF6" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#5B7CF6" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Y-axis guide lines */}
              {[0.25, 0.5, 0.75, 1].map((f) => (
                <line key={f}
                  x1={PAD.left} y1={PAD.top + (H - PAD.top - PAD.bottom) * (1 - f)}
                  x2={W - PAD.right} y2={PAD.top + (H - PAD.top - PAD.bottom) * (1 - f)}
                  stroke="#222" strokeWidth={1}
                />
              ))}
              {/* Area fill */}
              <path d={areaPath} fill="url(#trendGrad)" />
              {/* Line */}
              <path d={linePath} fill="none" stroke="#5B7CF6" strokeWidth={2} strokeLinecap="round" />
              {/* Data dots */}
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={3} fill="#5B7CF6" stroke="#141414" strokeWidth={1.5}>
                  <title>{`${p.date}: ${p.count} run${p.count !== 1 ? 's' : ''}`}</title>
                </circle>
              ))}
              {/* X-axis labels — first, middle, last */}
              {points.length > 0 && [0, Math.floor(points.length / 2), points.length - 1]
                .filter((i, idx, arr) => arr.indexOf(i) === idx)
                .map((i) => (
                  <text key={i} x={points[i].x} y={H - 4} textAnchor="middle" fill="#555" fontSize={9}>
                    {points[i].date.slice(5)}
                  </text>
                ))}
            </svg>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

// Made with Bob
