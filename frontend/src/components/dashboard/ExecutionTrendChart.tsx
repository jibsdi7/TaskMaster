// ExecutionTrendChart.tsx — full-width SVG, axes fill card, zero-filled daily series
import { useMemo, useRef, useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { DashboardData } from '../../pages/Dashboard';

interface Props { data: DashboardData | null; loading: boolean; onPeriodChange: (d: number) => void; period: number; }

const PERIODS = [
  { label: '7D',  days: 7  },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
];

function buildPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cpx = (pts[i - 1].x + pts[i].x) / 2;
    d += ` C ${cpx} ${pts[i - 1].y} ${cpx} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
  }
  return d;
}

export default function ExecutionTrendChart({ data, loading, onPeriodChange, period }: Props) {
  // Dynamic width — measure the container so axes truly fill the card
  const containerRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => setW(entry.contentRect.width));
    obs.observe(el);
    setW(el.offsetWidth || 600);
    return () => obs.disconnect();
  }, []);

  // Fixed logical dimensions — axes will scale with W via viewBox
  const H     = 200;
  const PAD   = { top: 20, right: 18, bottom: 38, left: 42 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top  - PAD.bottom;

  const [hovered, setHovered] = useState<number | null>(null);

  const trend = data?.executionTrend ?? [];

  const { points, maxCount, yTicks } = useMemo(() => {
    if (trend.length === 0) return { points: [], maxCount: 0, yTicks: [] };
    const max  = Math.max(...trend.map((t) => t.count), 1);
    const nice = max <= 5 ? max : max <= 10 ? 10 : max <= 20 ? 20 : Math.ceil(max / 5) * 5;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * nice));
    const n     = trend.length;
    const pts   = trend.map((t, i) => ({
      x: PAD.left + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2),
      y: PAD.top  + chartH - (t.count / nice) * chartH,
      count: t.count,
      date:  t.date,
    }));
    return { points: pts, maxCount: nice, yTicks: ticks };
  }, [trend, W]);   // re-compute when width changes

  const linePath  = buildPath(points);
  const areaPath  = points.length > 1
    ? `${linePath} L ${points[points.length - 1].x} ${PAD.top + chartH} L ${points[0].x} ${PAD.top + chartH} Z`
    : '';

  // X-axis: show up to 8 evenly spaced labels
  const xLabelIdx = useMemo(() => {
    if (points.length === 0) return [];
    if (points.length <= 8)  return points.map((_, i) => i);
    const step = Math.ceil((points.length - 1) / 7);
    const idx: number[] = [];
    for (let i = 0; i < points.length; i += step) idx.push(i);
    if (idx[idx.length - 1] !== points.length - 1) idx.push(points.length - 1);
    return idx;
  }, [points]);

  const hovPt = hovered !== null ? points[hovered] : null;
  const totalRuns = trend.reduce((s, t) => s + t.count, 0);

  return (
    <Card elevation={0} sx={{
      background: 'linear-gradient(135deg, rgba(22,22,38,0.97) 0%, rgba(14,14,24,0.99) 100%)',
      border: '1px solid rgba(91,124,246,0.18)',
      borderRadius: '14px',
      transition: 'box-shadow 0.2s',
      '&:hover': { boxShadow: '0 8px 40px rgba(91,124,246,0.13)' },
    }}>
      <CardContent sx={{ p: '20px !important' }}>

        {/* ── Header ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShowChartIcon sx={{ fontSize: 18, color: '#7B96F9' }} />
            <Typography sx={{ color: '#E8E8F8', fontWeight: 700, fontSize: '0.95rem' }}>
              Execution Trend
            </Typography>
            {totalRuns > 0 && (
              <Typography variant="caption" sx={{ color: '#555', ml: 0.5 }}>
                · {totalRuns} run{totalRuns !== 1 ? 's' : ''} in period
              </Typography>
            )}
          </Box>
          <ToggleButtonGroup value={period} exclusive onChange={(_, v) => v && onPeriodChange(v)} size="small">
            {PERIODS.map((p) => (
              <ToggleButton key={p.days} value={p.days} sx={{
                color: '#555', borderColor: '#252535', fontSize: '0.72rem', py: 0.3, px: 1.5, fontWeight: 600,
                '&.Mui-selected': { color: '#7B96F9', backgroundColor: 'rgba(91,124,246,0.15)', borderColor: 'rgba(91,124,246,0.4)' },
                '&:hover': { color: '#B0B8FF', backgroundColor: 'rgba(91,124,246,0.08)' },
              }}>
                {p.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {/* ── Chart container — measured for dynamic width ── */}
        <Box ref={containerRef} sx={{ width: '100%' }}>
          {loading ? (
            <Box sx={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body2" sx={{ color: '#555' }}>Loading…</Typography>
            </Box>
          ) : trend.length === 0 || totalRuns === 0 && trend.every(t => t.count === 0) ? (
            <Box sx={{ height: H, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <ShowChartIcon sx={{ fontSize: 32, color: '#252535' }} />
              <Typography variant="body2" sx={{ color: '#444' }}>No runs in this period</Typography>
            </Box>
          ) : (
            <svg
              viewBox={`0 0 ${W} ${H}`}
              width="100%"
              height={H}
              style={{ display: 'block', overflow: 'visible' }}
              onMouseLeave={() => setHovered(null)}
            >
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#5B7CF6" stopOpacity="0.6"  />
                  <stop offset="55%"  stopColor="#5B7CF6" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#5B7CF6" stopOpacity="0"    />
                </linearGradient>
                <filter id="glow" x="-30%" y="-80%" width="160%" height="300%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* ── Y-axis grid + labels ── */}
              {yTicks.map((val) => {
                const gy = PAD.top + chartH - (maxCount > 0 ? (val / maxCount) * chartH : 0);
                return (
                  <g key={val}>
                    <line
                      x1={PAD.left} y1={gy} x2={W - PAD.right} y2={gy}
                      stroke={val === 0 ? '#2e2e48' : '#202030'}
                      strokeWidth={val === 0 ? 1.5 : 1}
                      strokeDasharray={val === 0 ? undefined : '5 5'}
                    />
                    <text
                      x={PAD.left - 6} y={gy + 4}
                      textAnchor="end" fill="#4a4a6a"
                      fontSize={Math.max(8, Math.min(11, W / 60))}
                      fontWeight={600}
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* ── X-axis baseline ── */}
              <line
                x1={PAD.left} y1={PAD.top + chartH}
                x2={W - PAD.right} y2={PAD.top + chartH}
                stroke="#2e2e48" strokeWidth={1.5}
              />

              {/* ── Area fill ── */}
              {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}

              {/* ── Line glow (blurred wider copy) ── */}
              <path d={linePath} fill="none" stroke="#7B96F9" strokeWidth={6} opacity={0.18} strokeLinecap="round" />

              {/* ── Main line ── */}
              <path
                d={linePath} fill="none"
                stroke="#7B96F9" strokeWidth={2.5}
                strokeLinecap="round" strokeLinejoin="round"
                filter="url(#glow)"
              />

              {/* ── Hover crosshair ── */}
              {hovPt && (
                <line
                  x1={hovPt.x} y1={PAD.top}
                  x2={hovPt.x} y2={PAD.top + chartH}
                  stroke="rgba(123,150,249,0.3)" strokeWidth={1} strokeDasharray="4 3"
                />
              )}

              {/* ── Data points with wide invisible hit targets ── */}
              {points.map((p, i) => {
                const prevX = i > 0 ? (points[i - 1].x + p.x) / 2 : PAD.left;
                const nextX = i < points.length - 1 ? (p.x + points[i + 1].x) / 2 : W - PAD.right;
                return (
                  <g key={i} onMouseEnter={() => setHovered(i)}>
                    <rect
                      x={prevX} y={PAD.top}
                      width={nextX - prevX} height={chartH}
                      fill="transparent" style={{ cursor: 'crosshair' }}
                    />
                    {(p.count > 0 || hovered === i) && (
                      <circle
                        cx={p.x} cy={p.y}
                        r={hovered === i ? 5.5 : 3.5}
                        fill={hovered === i ? '#fff' : '#7B96F9'}
                        stroke={hovered === i ? '#7B96F9' : '#16162a'}
                        strokeWidth={2}
                        style={{ transition: 'r 0.1s ease' }}
                      />
                    )}
                  </g>
                );
              })}

              {/* ── X-axis date labels ── */}
              {xLabelIdx.map((i) => (
                <text
                  key={i}
                  x={points[i].x} y={H - 6}
                  textAnchor="middle"
                  fill="#4a4a6a"
                  fontSize={Math.max(8, Math.min(10, W / 65))}
                  fontWeight={500}
                >
                  {points[i].date.slice(5)}
                </text>
              ))}

              {/* ── Hover tooltip ── */}
              {hovPt && (() => {
                const tipW = 82, tipH = 38;
                const tipX = hovPt.x + (hovPt.x > W - tipW - 20 ? -(tipW + 8) : 10);
                const tipY = Math.max(PAD.top + 2, hovPt.y - tipH - 4);
                return (
                  <g pointerEvents="none">
                    <rect x={tipX} y={tipY} width={tipW} height={tipH} rx={7}
                      fill="#12121e" stroke="rgba(91,124,246,0.55)" strokeWidth={1} />
                    <text x={tipX + 8} y={tipY + 13} fill="#7B96F9" fontSize={9} fontWeight={700}>
                      {hovPt.date.slice(5)}
                    </text>
                    <text x={tipX + 8} y={tipY + 28} fill="#FFFFFF" fontSize={12} fontWeight={700}>
                      {hovPt.count} run{hovPt.count !== 1 ? 's' : ''}
                    </text>
                  </g>
                );
              })()}
            </svg>
          )}
        </Box>

      </CardContent>
    </Card>
  );
}

// Made with Bob
