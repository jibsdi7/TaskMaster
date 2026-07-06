// SummaryCards.tsx — four KPI cards (Total Workflows, Executions, Successful Runs, Reusable Blocks)
import { Box, Card, CardContent, Typography, Skeleton } from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { DashboardData } from '../../pages/Dashboard';

interface Props { data: DashboardData | null; loading: boolean; }

const glass = {
  background: 'linear-gradient(135deg, rgba(30,30,46,0.85) 0%, rgba(20,20,32,0.92) 100%)',
  backdropFilter: 'blur(14px)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '14px',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
  cursor: 'default',
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: '0 12px 36px rgba(0,0,0,0.55)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
};

const cards = [
  {
    key: 'workflows',
    label: 'Total Workflows',
    subtitle: (d: DashboardData) => `${d.activeWorkflows} active workflows`,
    value: (d: DashboardData) => d.totalWorkflows,
    Icon: AccountTreeIcon,
    accent: '#5B7CF6',
    glow: 'rgba(91,124,246,0.25)',
  },
  {
    key: 'executions',
    label: 'Total Executions',
    subtitle: (_d: DashboardData) => `Runs in selected period`,
    value: (d: DashboardData) => d.totalExecutions,
    Icon: PlayCircleOutlineIcon,
    accent: '#3B82F6',
    glow: 'rgba(59,130,246,0.25)',
  },
  {
    key: 'successful',
    label: 'Successful Runs',
    subtitle: (d: DashboardData) => `${d.successRate}% success rate`,
    value: (d: DashboardData) => d.successfulRuns,
    Icon: CheckCircleOutlineIcon,
    accent: '#48BB78',
    glow: 'rgba(72,187,120,0.25)',
  },
  {
    key: 'blocks',
    label: 'Reusable Blocks',
    subtitle: () => 'Blocks available in library',
    value: (d: DashboardData) => d.reusableBlocks,
    Icon: ViewModuleIcon,
    accent: '#7C5CF6',
    glow: 'rgba(124,92,246,0.25)',
  },
];

export default function SummaryCards({ data, loading }: Props) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
      {cards.map((c) => (
        <Card key={c.key} elevation={0} sx={glass}>
          <CardContent sx={{ p: '20px !important' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#777', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: '0.7rem' }}>
                  {c.label}
                </Typography>
                {loading || !data ? (
                  <Skeleton variant="text" width={80} height={44} sx={{ bgcolor: '#1e1e2e' }} />
                ) : (
                  <Typography variant="h3" sx={{ color: '#FFFFFF', fontWeight: 700, lineHeight: 1.1, mt: 0.5, fontSize: '2.1rem' }}>
                    {c.value(data).toLocaleString()}
                  </Typography>
                )}
                {loading || !data ? (
                  <Skeleton variant="text" width={120} sx={{ bgcolor: '#1e1e2e', mt: 0.5 }} />
                ) : (
                  <Typography variant="body2" sx={{ color: '#777', mt: 0.5, fontSize: '0.78rem' }}>
                    {c.key === 'successful' ? (
                      <Box component="span" sx={{ color: '#48BB78', fontWeight: 600 }}>
                        {c.subtitle(data)}
                      </Box>
                    ) : (
                      c.subtitle(data)
                    )}
                  </Typography>
                )}
              </Box>
              <Box sx={{
                width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
                background: `radial-gradient(circle at 60% 40%, ${c.glow}, transparent 70%)`,
                backgroundColor: `${c.accent}18`,
                border: `1px solid ${c.accent}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <c.Icon sx={{ fontSize: 22, color: c.accent }} />
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

// Made with Bob
