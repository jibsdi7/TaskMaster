// Dashboard.tsx — IBMTaskWeaver main dashboard page
import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, IconButton, Tooltip, MenuItem, Select,
  FormControl, Tabs, Tab, Alert,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SummaryCards from '../components/dashboard/SummaryCards';
import ExecutionTrendChart from '../components/dashboard/ExecutionTrendChart';
import ExecutionStatusDonut from '../components/dashboard/ExecutionStatusDonut';
import WorkflowDistributionBar from '../components/dashboard/WorkflowDistributionBar';
import RecentExecutionsTable from '../components/dashboard/RecentExecutionsTable';
import WorkflowCards from '../components/dashboard/WorkflowCards';
import ReusableBlocksWidget from '../components/dashboard/ReusableBlocksWidget';
import RightPanel from '../components/dashboard/RightPanel';

import { authHeaders, BASE_URL } from '../api/client';
const API = `${BASE_URL}/api`;

export interface DashboardData {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successfulRuns: number;
  failedRuns: number;
  successRate: number;
  reusableBlocks: number;
  periodDays:  number;
  periodHours: number;
  executionTrend: { date: string; count: number }[];
  statusBreakdown: Record<string, number>;
  workflowDistribution: { name: string; runs: number }[];
  recentExecutions: {
    run_id: string;
    workflow_name: string;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    duration_seconds: number | null;
    triggered_by: string;
  }[];
  recentWorkflowsCreated: { name: string; created_at: string | null }[];
  recentBlocksCreated:    { name: string; created_at: string | null }[];
  recentScheduledJobs: {
    id: number;
    name: string;
    workflow_names: string;
    schedule_type: string;
    run_at: string | null;
    cron_expression: string | null;
    is_enabled: boolean;
    last_run_at: string | null;
    last_run_status: string | null;
    run_count: number;
    created_at: string | null;
  }[];
}

// period values: positive = days, negative = hours (−1 = last 1 h, −24 = last 24 h)
const DATE_RANGES = [
  { label: 'Last 1 Hour',  period: -1  },
  { label: 'Last 24 Hours', period: -24 },
  { label: 'Last 7 Days',  period: 7   },
  { label: 'Last 30 Days', period: 30  },
  { label: 'Last 90 Days', period: 90  },
];

const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState(7);   // matches DATE_RANGES[2] default
  const [tab, setTab] = useState(0);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [wfLoading, setWfLoading] = useState(true);

  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...authHeaders() };

  // period > 0 → days query param; period < 0 → hours query param (absolute value)
  const fetchDashboard = useCallback(async (p: number) => {
    try {
      setLoading(true);
      setError(null);
      const query = p < 0 ? `hours=${Math.abs(p)}` : `days=${p}`;
      const res = await fetch(`${API}/dashboard?${query}`, { headers });
      if (!res.ok) throw new Error(`Dashboard API: ${res.statusText}`);
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWorkflows = useCallback(async () => {
    try {
      setWfLoading(true);
      const res = await fetch(`${API}/workflows/`, { headers });
      if (res.ok) setWorkflows(await res.json());
    } catch { /* silent */ } finally { setWfLoading(false); }
  }, []);

  const fetchBlocks = useCallback(async () => {
    try {
      const res = await fetch(`${API}/blocks/`, { headers });
      if (res.ok) setBlocks(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchDashboard(period);
    fetchWorkflows();
    fetchBlocks();
  }, []);

  const handlePeriodChange = (p: number) => {
    setPeriod(p);
    fetchDashboard(p);
  };

  const handleRefresh = () => {
    fetchDashboard(period);
    fetchWorkflows();
    fetchBlocks();
  };

  const handleRunWorkflow = async (id: number) => {
    const url = prompt('Enter the URL to execute the workflow on:', 'https://example.com');
    if (!url) return;
    try {
      await fetch(`${API}/workflows/${id}/execute`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url }),
      });
      setTimeout(() => fetchDashboard(period), 1500);
    } catch { /* silent */ }
  };

  const handleDeleteWorkflow = async (id: number) => {
    if (!confirm('Delete this workflow?')) return;
    try {
      await fetch(`${API}/workflows/${id}`, { method: 'DELETE', headers });
      fetchWorkflows();
      fetchDashboard(period);
    } catch { /* silent */ }
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#0e0e16' }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <Box sx={{
        px: 4, py: 2.5,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        background: 'linear-gradient(180deg, rgba(20,20,30,0.95) 0%, rgba(14,14,22,0.95) 100%)',
        backdropFilter: 'blur(12px)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Logo */}
          <Box sx={{ width: 42, height: 42, flexShrink: 0 }}>
            <img src="/logo.png" alt="IBMTaskWeaver" style={{ width: 42, height: 42, borderRadius: 12, display: 'block', objectFit: 'contain' }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ color: '#FFFFFF', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.01em' }}>
              IBMTaskWeaver
            </Typography>
            <Typography variant="caption" sx={{ color: '#555', fontWeight: 500, letterSpacing: '0.04em', fontSize: '0.7rem' }}>
              Record · Automate · Orchestrate · Deliver
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Date range picker */}
          <FormControl size="small">
            <Select
              value={period}
              onChange={(e) => handlePeriodChange(Number(e.target.value))}
              sx={{
                color: '#C0C0D0', fontSize: '0.8rem', minWidth: 140,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#5B7CF6' },
                backgroundColor: 'rgba(255,255,255,0.04)',
              }}
            >
              {DATE_RANGES.map((r) => (
                <MenuItem key={r.period} value={r.period}>{r.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} size="small" sx={{ color: '#666', '&:hover': { color: '#E0E0F0', backgroundColor: 'rgba(255,255,255,0.06)' } }}>
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, sm: 3, md: 4 } }}>
        {error && (
          <Alert severity="warning" sx={{ mb: 3, backgroundColor: 'rgba(246,173,85,0.1)', color: '#F6AD55', border: '1px solid rgba(246,173,85,0.2)' }}>
            {error} — showing available data
          </Alert>
        )}

        {/* Main 3-column layout: content (flex) + right panel (300px) */}
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
          {/* Left + centre column */}
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>

            {/* Row 1 — Summary cards */}
            <SummaryCards data={data} loading={loading} />

            {/* Row 2 — Charts row */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 240px 1fr' }, gap: 2 }}>
              <ExecutionTrendChart data={data} loading={loading} onPeriodChange={handlePeriodChange} period={period} subDay={period < 0} />
              <ExecutionStatusDonut data={data} loading={loading} />
              <WorkflowDistributionBar data={data} loading={loading} />
            </Box>

            {/* Row 3 — Tabs: Executions / Workflows / Blocks */}
            <Box sx={{
              background: 'linear-gradient(135deg, rgba(30,30,46,0.85) 0%, rgba(20,20,32,0.92) 100%)',
              backdropFilter: 'blur(14px)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px',
              overflow: 'hidden',
            }}>
              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                sx={{
                  px: 2, borderBottom: '1px solid rgba(255,255,255,0.05)',
                  '& .MuiTab-root': { color: '#666', fontSize: '0.82rem', fontWeight: 500, minHeight: 44, textTransform: 'none' },
                  '& .Mui-selected': { color: '#7B96F9' },
                  '& .MuiTabs-indicator': { backgroundColor: '#5B7CF6' },
                }}
              >
                <Tab label="Recent Executions" />
                <Tab label="Workflows" />
                <Tab label="Reusable Blocks" />
              </Tabs>

              <Box sx={{ p: 2 }}>
                {tab === 0 && <RecentExecutionsTable data={data} loading={loading} />}
                {tab === 1 && <WorkflowCards workflows={workflows} loading={wfLoading} onRun={handleRunWorkflow} onDelete={handleDeleteWorkflow} />}
                {tab === 2 && <ReusableBlocksWidget blocks={blocks} loading={wfLoading} />}
              </Box>
            </Box>
          </Box>

          {/* Right panel — 260px fixed */}
          <Box sx={{ width: 260, flexShrink: 0, display: { xs: 'none', lg: 'block' } }}>
            <RightPanel activities={[
                // Execution runs → Workflow Executed / Execution Failed / Workflow Scheduled (if triggered by scheduler)
                ...(data?.recentExecutions ?? []).map((r) => ({
                  type:      r.status === 'completed' ? 'Execution Completed'
                           : r.status === 'failed'    ? 'Execution Failed'
                           : 'Workflow Executed',
                  label:     r.status === 'failed'              ? 'Execution Failed'
                           : r.triggered_by === 'scheduler'     ? 'Workflow Scheduled'
                           : r.status === 'completed'           ? 'Execution Completed'
                           : 'Execution Running',
                  timestamp: r.started_at ?? r.completed_at ?? new Date().toISOString(),
                  detail:    `${r.workflow_name} — ${r.triggered_by === 'scheduler' ? 'SCHEDULED' : r.status.toUpperCase()}`,
                })),
                // Scheduled jobs — use last_run_at when available, else created_at
                ...(data?.recentScheduledJobs ?? []).map((j) => ({
                  type:      'Workflow Scheduled',
                  label:     'Workflow Scheduled',
                  timestamp: j.last_run_at ?? j.created_at ?? new Date().toISOString(),
                  detail:    `${j.name} — ${j.workflow_names}`,
                })),
                // Workflows created
                ...(data?.recentWorkflowsCreated ?? []).map((w) => ({
                  type:      'Workflow Created',
                  label:     'Workflow Created',
                  timestamp: w.created_at ?? new Date().toISOString(),
                  detail:    `${w.name} — CREATED`,
                })),
                // Blocks created
                ...(data?.recentBlocksCreated ?? []).map((b) => ({
                  type:      'Block Created',
                  label:     'Block Created',
                  timestamp: b.created_at ?? new Date().toISOString(),
                  detail:    `${b.name} — CREATED`,
                })),
              ]} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;

// Made with Bob
