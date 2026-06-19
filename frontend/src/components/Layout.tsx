import { Outlet } from 'react-router-dom';
import { Box, Chip, AppBar, Toolbar, Typography } from '@mui/material';
import { useAuthStore } from '../store/authStore';

const Layout = () => {
  const { isDevelopmentMode, user } = useAuthStore();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {isDevelopmentMode && (
        <AppBar position="static" color="warning" sx={{ zIndex: 1300 }}>
          <Toolbar variant="dense" sx={{ minHeight: 40 }}>
            <Chip
              label="🔧 DEVELOPMENT MODE"
              color="error"
              size="small"
              sx={{ mr: 2, fontWeight: 'bold' }}
            />
            <Typography variant="body2" sx={{ flexGrow: 1 }}>
              User: {user?.username} | Role: {user?.role}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Authentication Bypass Enabled
            </Typography>
          </Toolbar>
        </AppBar>
      )}
      <Outlet />
    </Box>
  );
};

export default Layout;

// Made with Bob
