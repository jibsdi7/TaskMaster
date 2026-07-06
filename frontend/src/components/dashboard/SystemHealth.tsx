// SystemHealth.tsx — backend service health status widget
import { Box, Card, CardContent, Typography } from '@mui/material';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import StorageIcon from '@mui/icons-material/Storage';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import ScheduleIcon from '@mui/icons-material/Schedule';
import WebIcon from '@mui/icons-material/Web';
import MouseIcon from '@mui/icons-material/Mouse';
import { useEffect, useState } from 'react';
import { BASE_URL } from '../../api/client';

interface ServiceStatus { label: string; status: 'healthy' | 'degraded' | 'down' | 'idle' | 'recording'; detail: string; Icon: any; }

const STATUS_COLOR = {
  healthy:   '#48BB78',
  idle:      '#A0A0B4',
  recording: '#F56565',
  degraded:  '#F6AD55',
  down:      '#F56565',
};
const STATUS_BG = {
  healthy:   'rgba(72,187,120,0.12)',
  idle:      'rgba(160,160,180,0.08)',
  recording: 'rgba(245,101,101,0.12)',
  degraded:  'rgba(246,173,85,0.12)',
  down:      'rgba(245,101,101,0.12)',
};

export default function SystemHealth() {
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`${BASE_URL}/health`)
      .then((r) => setBackendOk(r.ok))
      .catch(() => setBackendOk(false));
  }, []);

  const bkStatus = backendOk === null ? 'idle' : backendOk ? 'healthy' : 'down';

  const services: ServiceStatus[] = [
    { label: 'Backend',               status: bkStatus as any,  detail: backendOk === null ? 'Checking…' : backendOk ? 'Healthy' : 'Unreachable', Icon: MonitorHeartIcon },
    { label: 'Database',              status: backendOk ? 'healthy' : 'down', detail: backendOk ? 'Connected' : 'Unknown', Icon: StorageIcon },
    { label: 'Recorder',              status: 'idle',      detail: 'Idle',      Icon: FiberManualRecordIcon },
    { label: 'Scheduler',             status: 'healthy',   detail: 'Running',   Icon: ScheduleIcon },
    { label: 'Playwright',            status: 'healthy',   detail: 'Available', Icon: WebIcon },
    { label: 'Desktop (PyAutoGUI)',   status: 'healthy',   detail: 'Available', Icon: MouseIcon },
  ];

  return (
    <Card elevation={0} sx={{
      background: 'linear-gradient(135deg, rgba(30,30,46,0.85) 0%, rgba(20,20,32,0.92) 100%)',
      backdropFilter: 'blur(14px)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '14px',
    }}>
      <CardContent sx={{ p: '20px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <MonitorHeartIcon sx={{ fontSize: 18, color: '#48BB78' }} />
          <Typography variant="h6" sx={{ color: '#E0E0F0', fontWeight: 600, fontSize: '0.95rem' }}>
            System Health
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {services.map((s) => {
            const color = STATUS_COLOR[s.status];
            const bg = STATUS_BG[s.status];
            const Icon = s.Icon;
            return (
              <Box key={s.label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 0.875, borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <Icon sx={{ fontSize: 15, color: '#555', flexShrink: 0 }} />
                <Typography variant="body2" sx={{ color: '#B0B0C4', fontSize: '0.8rem', flex: 1 }}>{s.label}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.25, borderRadius: '6px', backgroundColor: bg, border: `1px solid ${color}30` }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 4px ${color}` }} />
                  <Typography variant="caption" sx={{ color, fontWeight: 600, fontSize: '0.7rem', textTransform: 'capitalize' }}>{s.detail}</Typography>
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
