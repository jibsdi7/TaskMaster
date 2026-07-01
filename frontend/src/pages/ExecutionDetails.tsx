import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import axios from 'axios';

interface WorkflowLog {
  level: string;
  message: string;
  node_id: string | null;
  timestamp: string;
  // enriched fields added by executor
  node_type?: string;
  node_label?: string;
  duration_ms?: number;
  node_status?: 'passed' | 'failed';
}

interface ExecutionRun {
  id: number;
  workflow_id: number;
  run_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  error_message: string | null;
  logs: WorkflowLog[];
  result: any;
}

/** Timestamps from the backend are UTC but lack a timezone suffix — normalise */
function toUTC(iso: string): string {
  return /[Z+\-]\d*$/.test(iso) ? iso : iso + 'Z';
}

/** Derive one summary row per node from the log stream.
 *  We look for the "passed" or "failed" result log that carries duration_ms.
 */
interface NodeStat {
  node_id: string;
  node_label: string;
  node_type: string;
  duration_ms: number;
  status: 'passed' | 'failed';
}

function buildNodeStats(logs: WorkflowLog[]): NodeStat[] {
  const seen = new Set<string>();
  const stats: NodeStat[] = [];
  for (const log of logs) {
    if (
      log.node_id &&
      log.duration_ms !== undefined &&
      log.node_status &&
      !seen.has(log.node_id)
    ) {
      seen.add(log.node_id);
      stats.push({
        node_id: log.node_id,
        node_label: log.node_label || log.node_id,
        node_type: log.node_type || '',
        duration_ms: log.duration_ms,
        status: log.node_status,
      });
    }
  }
  return stats;
}

// ─────────────────────────────────────────────────────────────────────────────
// Horizontal bar chart — pure SVG, no external library
// DELAY nodes are excluded from the chart per requirements.
// ─────────────────────────────────────────────────────────────────────────────
const BAR_H = 20;
const BAR_GAP = 10;
const LABEL_W = 160;
const VALUE_W = 58;
const CHART_PADDING = 16;

function NodeTimingChart({ stats }: { stats: NodeStat[] }) {
  const chartStats = stats.filter((s) => s.node_type !== 'DELAY');
  if (chartStats.length === 0) return null;

  const maxMs = Math.max(...chartStats.map((s) => s.duration_ms), 1);
  const BAR_AREA = 320;
  const svgW = LABEL_W + BAR_AREA + VALUE_W + CHART_PADDING * 2;
  const svgH = chartStats.length * (BAR_H + BAR_GAP) + BAR_GAP + 24; // +24 for x-axis label row

  // x-axis tick values
  const ticks = [0, Math.round(maxMs * 0.25), Math.round(maxMs * 0.5), Math.round(maxMs * 0.75), maxMs];

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <svg
        width={svgW}
        height={svgH}
        style={{ display: 'block', fontFamily: 'inherit' }}
      >
        {/* Grid lines + tick labels */}
        {ticks.map((t) => {
          const x = CHART_PADDING + LABEL_W + (t / maxMs) * BAR_AREA;
          return (
            <g key={t}>
              <line
                x1={x} y1={BAR_GAP / 2}
                x2={x} y2={svgH - 24}
                stroke="#2a2a3a"
                strokeWidth={1}
                strokeDasharray={t === 0 ? undefined : '3 3'}
              />
              <text
                x={x}
                y={svgH - 6}
                textAnchor="middle"
                fontSize={10}
                fill="#666"
              >
                {t >= 1000 ? `${(t / 1000).toFixed(1)}s` : `${t}ms`}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {chartStats.map((s, i) => {
          const y = BAR_GAP / 2 + i * (BAR_H + BAR_GAP);
          const barW = Math.max(2, (s.duration_ms / maxMs) * BAR_AREA);
          const barColor = s.status === 'failed' ? '#f56565' : '#5B7CF6';
          const labelX = CHART_PADDING + LABEL_W - 6;
          const barX = CHART_PADDING + LABEL_W;
          const valX = barX + BAR_AREA + 6;

          // truncate long labels
          const label =
            s.node_label.length > 20 ? s.node_label.slice(0, 18) + '…' : s.node_label;

          return (
            <g key={s.node_id}>
              {/* node label */}
              <text
                x={labelX}
                y={y + BAR_H / 2 + 4}
                textAnchor="end"
                fontSize={11}
                fill="#c0c0d0"
              >
                {label}
              </text>

              {/* bar background */}
              <rect
                x={barX}
                y={y}
                width={BAR_AREA}
                height={BAR_H}
                rx={3}
                fill="#1a1a2e"
              />

              {/* bar fill */}
              <rect
                x={barX}
                y={y}
                width={barW}
                height={BAR_H}
                rx={3}
                fill={barColor}
                opacity={0.85}
              />

              {/* duration value */}
              <text
                x={valX}
                y={y + BAR_H / 2 + 4}
                fontSize={11}
                fill="#aaa"
              >
                {s.duration_ms >= 1000
                  ? `${(s.duration_ms / 1000).toFixed(2)}s`
                  : `${s.duration_ms}ms`}
              </text>
            </g>
          );
        })}
      </svg>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status helpers
// ─────────────────────────────────────────────────────────────────────────────
function getStatusColor(status: string): 'success' | 'error' | 'info' | 'warning' | 'default' {
  switch (status) {
    case 'COMPLETED': return 'success';
    case 'FAILED':    return 'error';
    case 'RUNNING':   return 'info';
    case 'DRAFT':     return 'warning';
    default:          return 'default';
  }
}

function getLogLevelColor(level: string): 'error' | 'warning' | 'info' | 'default' {
  switch (level) {
    case 'ERROR':   return 'error';
    case 'WARNING': return 'warning';
    case 'INFO':    return 'info';
    default:        return 'default';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
const ExecutionDetails = () => {
  const { id: runId } = useParams<{ id: string }>();
  const [execution, setExecution] = useState<ExecutionRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);

  const fetchExecution = async () => {
    try {
      const response = await axios.get(`http://localhost:8000/api/executions/${runId}`);
      setExecution(response.data);
      if (response.data.status === 'COMPLETED' || response.data.status === 'FAILED') {
        setPolling(false);
      }
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch execution details');
      setPolling(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExecution(); }, [runId]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(fetchExecution, 2000);
    return () => clearInterval(interval);
  }, [polling, runId]);

  if (loading && !execution) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error && !execution) {
    return <Box sx={{ p: 3 }}><Alert severity="error">{error}</Alert></Box>;
  }
  if (!execution) {
    return <Box sx={{ p: 3 }}><Alert severity="warning">Execution not found</Alert></Box>;
  }

  const nodeStats = buildNodeStats(execution.logs || []);
  const passCount = nodeStats.filter((s) => s.status === 'passed').length;
  const failCount = nodeStats.filter((s) => s.status === 'failed').length;
  const totalActionMs = nodeStats
    .filter((s) => s.node_type !== 'DELAY')
    .reduce((sum, s) => sum + s.duration_ms, 0);

  const paperSx = {
    p: 3,
    mb: 3,
    bgcolor: '#141420',
    border: '1px solid #2a2a3a',
    borderRadius: 2,
  };
  const labelSx = { color: '#666', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em' };
  const valueSx = { color: '#e0e0f0', fontSize: '0.95rem', mt: 0.3 };

  return (
    <Box sx={{ p: 3, bgcolor: '#0d0d1a', minHeight: '100vh' }}>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ color: '#e0e0f0', fontWeight: 700 }}>
          Execution Details
        </Typography>
        <Chip
          label={execution.status}
          color={getStatusColor(execution.status)}
          sx={{ fontWeight: 700, fontSize: '0.82rem' }}
        />
      </Box>

      {polling && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={18} />
            <Typography variant="body2">Execution in progress… auto-refreshing every 2 s</Typography>
          </Box>
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Summary info */}
      <Paper sx={paperSx}>
        <Typography variant="subtitle1" sx={{ color: '#a0a0c0', fontWeight: 700, mb: 2 }}>
          Execution Information
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 2 }}>
          {[
            { label: 'Run ID',        value: <Typography sx={{ ...valueSx, fontFamily: 'monospace', fontSize: '0.78rem', wordBreak: 'break-all' }}>{execution.run_id}</Typography> },
            { label: 'Workflow ID',   value: <Typography sx={valueSx}>{execution.workflow_id}</Typography> },
            { label: 'Started At',    value: <Typography sx={valueSx}>{new Date(toUTC(execution.started_at)).toLocaleString()}</Typography> },
            { label: 'Completed At',  value: <Typography sx={valueSx}>{execution.completed_at ? new Date(toUTC(execution.completed_at)).toLocaleString() : '—'}</Typography> },
            { label: 'Total Duration',value: <Typography sx={valueSx}>{execution.duration_seconds != null ? `${execution.duration_seconds.toFixed(2)} s` : '—'}</Typography> },
            { label: 'Actions (excl. Delay)', value: <Typography sx={valueSx}>{totalActionMs >= 1000 ? `${(totalActionMs / 1000).toFixed(2)} s` : `${totalActionMs} ms`}</Typography> },
            { label: 'Passed', value: <Typography sx={{ ...valueSx, color: '#68d391' }}>{passCount}</Typography> },
            { label: 'Failed', value: <Typography sx={{ ...valueSx, color: '#fc8181' }}>{failCount}</Typography> },
          ].map(({ label, value }) => (
            <Box key={label}>
              <Typography sx={labelSx}>{label}</Typography>
              {value}
            </Box>
          ))}
        </Box>
        {execution.error_message && (
          <Alert severity="error" sx={{ mt: 2 }}>{execution.error_message}</Alert>
        )}
      </Paper>

      {/* Per-node timing table */}
      {nodeStats.length > 0 && (
        <Paper sx={paperSx}>
          <Typography variant="subtitle1" sx={{ color: '#a0a0c0', fontWeight: 700, mb: 2 }}>
            Node Execution Times
          </Typography>

          {/* Table header */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 110px 80px 90px',
            gap: 1,
            px: 1.5,
            pb: 1,
            borderBottom: '1px solid #2a2a3a',
          }}>
            {['Action', 'Type', 'Duration', 'Result'].map((h) => (
              <Typography key={h} sx={{ ...labelSx }}>{h}</Typography>
            ))}
          </Box>

          {/* Rows */}
          {nodeStats.map((s, i) => (
            <Box
              key={s.node_id}
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 110px 80px 90px',
                gap: 1,
                px: 1.5,
                py: 1,
                bgcolor: i % 2 === 0 ? 'transparent' : '#16162a',
                borderBottom: '1px solid #1e1e2e',
                alignItems: 'center',
              }}
            >
              <Typography sx={{ color: '#c8c8e0', fontSize: '0.87rem', wordBreak: 'break-word' }}>
                {s.node_label}
              </Typography>
              <Chip
                label={s.node_type || '—'}
                size="small"
                sx={{
                  fontSize: '0.7rem', height: 20,
                  bgcolor: '#1e1e3a', color: '#8888cc',
                  border: '1px solid #2a2a4a',
                }}
              />
              <Typography sx={{ color: s.node_type === 'DELAY' ? '#666' : '#e0e0a0', fontSize: '0.87rem', fontFamily: 'monospace' }}>
                {s.node_type === 'DELAY'
                  ? <span style={{ color: '#555', fontStyle: 'italic' }}>ignored</span>
                  : s.duration_ms >= 1000
                    ? `${(s.duration_ms / 1000).toFixed(2)} s`
                    : `${s.duration_ms} ms`
                }
              </Typography>
              <Chip
                label={s.status.toUpperCase()}
                size="small"
                sx={{
                  fontSize: '0.72rem', height: 22, fontWeight: 700,
                  bgcolor: s.status === 'passed' ? '#1a3a2a' : '#3a1a1a',
                  color:   s.status === 'passed' ? '#68d391'  : '#fc8181',
                  border: `1px solid ${s.status === 'passed' ? '#2a5a3a' : '#5a2a2a'}`,
                }}
              />
            </Box>
          ))}
        </Paper>
      )}

      {/* SVG Bar Chart */}
      {nodeStats.filter((s) => s.node_type !== 'DELAY').length > 0 && (
        <Paper sx={{ ...paperSx }}>
          <Typography variant="subtitle1" sx={{ color: '#a0a0c0', fontWeight: 700, mb: 2 }}>
            Timing Chart — Actions Only (DELAY excluded)
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: '#5B7CF6' }} />
              <Typography sx={{ color: '#888', fontSize: '0.78rem' }}>Passed</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: '#f56565' }} />
              <Typography sx={{ color: '#888', fontSize: '0.78rem' }}>Failed</Typography>
            </Box>
          </Box>
          <NodeTimingChart stats={nodeStats} />
        </Paper>
      )}

      {/* Raw logs */}
      <Paper sx={paperSx}>
        <Typography variant="subtitle1" sx={{ color: '#a0a0c0', fontWeight: 700, mb: 2 }}>
          Execution Logs
        </Typography>
        {execution.logs && execution.logs.length > 0 ? (
          <List sx={{ maxHeight: 420, overflow: 'auto', bgcolor: '#0d0d1a', borderRadius: 1, border: '1px solid #1e1e2e' }}>
            {execution.logs.map((log, index) => (
              <Box key={index}>
                <ListItem sx={{ py: 0.5 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={log.level}
                          size="small"
                          color={getLogLevelColor(log.level)}
                          sx={{ height: 18, fontSize: '0.68rem' }}
                        />
                        {log.node_id && (
                          <Chip
                            label={log.node_label || log.node_id}
                            size="small"
                            variant="outlined"
                            sx={{ height: 18, fontSize: '0.68rem', color: '#888', borderColor: '#2a2a3a' }}
                          />
                        )}
                        {log.node_status && (
                          <Chip
                            label={log.node_status.toUpperCase()}
                            size="small"
                            sx={{
                              height: 18, fontSize: '0.68rem', fontWeight: 700,
                              bgcolor: log.node_status === 'passed' ? '#1a3a2a' : '#3a1a1a',
                              color:   log.node_status === 'passed' ? '#68d391'  : '#fc8181',
                            }}
                          />
                        )}
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#c0c0d0', fontSize: '0.8rem' }}>
                          {log.message}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" sx={{ color: '#555', fontFamily: 'monospace' }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                        {log.duration_ms !== undefined && log.node_type !== 'DELAY'
                          ? `  ·  ${log.duration_ms >= 1000
                              ? `${(log.duration_ms / 1000).toFixed(2)} s`
                              : `${log.duration_ms} ms`}`
                          : ''}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < execution.logs.length - 1 && (
                  <Divider sx={{ borderColor: '#1a1a2a' }} />
                )}
              </Box>
            ))}
          </List>
        ) : (
          <Alert severity="info">No logs available yet</Alert>
        )}
      </Paper>

      {/* Raw result */}
      {execution.result && Object.keys(execution.result).length > 0 && (
        <Paper sx={paperSx}>
          <Typography variant="subtitle1" sx={{ color: '#a0a0c0', fontWeight: 700, mb: 2 }}>
            Execution Result
          </Typography>
          <Box sx={{ bgcolor: '#0d0d1a', p: 2, borderRadius: 1, fontFamily: 'monospace', fontSize: '0.82rem', overflow: 'auto', border: '1px solid #1e1e2e', color: '#a0c0a0' }}>
            <pre style={{ margin: 0 }}>{JSON.stringify(execution.result, null, 2)}</pre>
          </Box>
        </Paper>
      )}

    </Box>
  );
};

export default ExecutionDetails;

// Made with Bob
