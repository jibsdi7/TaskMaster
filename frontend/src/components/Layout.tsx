import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Tooltip,
} from '@mui/material';
import {
  AccountTree as WorkflowIcon,
  PlayCircleOutline as ExecutionsIcon,
  ViewModule as BlocksIcon,
  Circle as DotIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';

const NAV_W = 56;

const navItems = [
  { label: 'Workflows',  icon: WorkflowIcon,   path: '/workflows' },
  { label: 'Executions', icon: ExecutionsIcon, path: '/executions' },
  { label: 'Blocks',     icon: BlocksIcon,     path: '/blocks' },
  { label: 'Scheduler',  icon: ScheduleIcon,   path: '/scheduler' },
];

const Layout = () => {
  const { isDevelopmentMode, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#141414' }}>
      {/* Dev mode banner */}
      {isDevelopmentMode && (
        <Box
          sx={{
            height: 32,
            backgroundColor: '#1a1200',
            borderBottom: '1px solid #3a2800',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            flexShrink: 0,
          }}
        >
          <DotIcon sx={{ fontSize: 8, color: '#F6AD55' }} />
          <Typography variant="caption" sx={{ color: '#F6AD55', fontWeight: 500, letterSpacing: '0.05em' }}>
            DEVELOPMENT MODE — authentication bypass active — {user?.username}
          </Typography>
          <DotIcon sx={{ fontSize: 8, color: '#F6AD55' }} />
        </Box>
      )}

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <Box
          sx={{
            width: NAV_W,
            backgroundColor: '#141414',
            borderRight: '1px solid #2a2a2a',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 2,
            gap: 1,
            flexShrink: 0,
          }}
        >
          {/* Logo mark — navigates to Dashboard */}
          <Tooltip title="Dashboard" placement="right">
            <Box
              onClick={() => navigate('/dashboard')}
              sx={{
                width: 28,
                height: 28,
                borderRadius: '7px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
                cursor: 'pointer',
                flexShrink: 0,
                overflow: 'hidden',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                outline: location.pathname.startsWith('/dashboard')
                  ? '2px solid rgba(91,124,246,0.6)'
                  : '2px solid transparent',
                outlineOffset: '2px',
                '&:hover': {
                  transform: 'scale(1.07)',
                  boxShadow: '0 4px 16px rgba(91,124,246,0.45)',
                },
              }}
            >
              <img
                src="/logo.svg"
                alt="TaskMaster"
                style={{ width: 38, height: 38, borderRadius: 11, display: 'block' }}
              />
            </Box>
          </Tooltip>

          {/* Nav items */}
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.path);
            return (
              <Tooltip key={item.path} title={item.label} placement="right">
                <Box
                  onClick={() => navigate(item.path)}
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '9px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    backgroundColor: active ? 'rgba(91,124,246,0.15)' : 'transparent',
                    border: active ? '1px solid rgba(91,124,246,0.3)' : '1px solid transparent',
                    color: active ? '#7B96F9' : '#666',
                    '&:hover': {
                      backgroundColor: '#242424',
                      color: '#E0E0F0',
                      border: '1px solid #2a2a2a',
                    },
                  }}
                >
                  <Icon sx={{ fontSize: 18 }} />
                </Box>
              </Tooltip>
            );
          })}
        </Box>

        {/* Page content */}
        <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;

// Made with Bob
