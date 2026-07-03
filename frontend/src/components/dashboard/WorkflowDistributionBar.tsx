// WorkflowDistributionBar.tsx — horizontal bar chart of executions per workflow
import { Box, Card, CardContent, Typography } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import { DashboardData } from '../../pages/Dashboard';

interface Props { data: DashboardData | null; loading: boolean; }

export default function WorkflowDistributionBar({ data, loading }: Props) {
  const dist = data?.workflowDistribution ?? [];
  const maxRuns = dist.length > 0 ? Math.max(...dist.map((d) => d.runs), 1) : 1;

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
          <BarChartIcon sx={{ fontSize: 18, color: '#3B82F6' }} />
          <Typography variant="h6" sx={{ color: '#E0E0F0', fontWeight: 600, fontSize: '0.95rem' }}>
            Workflow Distribution
          </Typography>
        </Box>

        {loading ? (
          <Typography variant="body2" sx={{ color: '#444', py: 2 }}>Loading…</Typography>
        ) : dist.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#444', py: 2 }}>No execution data yet</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {dist.map((d, i) => {
              const pct = (d.runs / maxRuns) * 100;
              const colors = ['#5B7CF6', '#48BB78', '#F6AD55', '#F56565', '#7C5CF6', '#3B82F6', '#48BB78', '#F6AD55', '#F56565', '#7C5CF6'];
              const color = colors[i % colors.length];
              return (
                <Box key={d.name}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                    <Typography variant="caption" sx={{ color: '#B0B0C4', fontSize: '0.78rem', maxWidth: '75%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: color, fontWeight: 700, fontSize: '0.78rem' }}>
                      {d.runs}
                    </Typography>
                  </Box>
                  <Box sx={{ height: 6, borderRadius: 3, backgroundColor: '#1e1e2e', overflow: 'hidden' }}>
                    <Box sx={{
                      height: '100%',
                      width: `${pct}%`,
                      borderRadius: 3,
                      background: `linear-gradient(90deg, ${color}cc, ${color})`,
                      transition: 'width 0.6s ease',
                    }} />
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// Made with Bob
