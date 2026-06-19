import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';

import Layout from './components/Layout';
import WorkflowEditor from './pages/WorkflowEditor';
import WorkflowList from './pages/WorkflowList';
import ExecutionList from './pages/ExecutionList';
import ExecutionDetails from './pages/ExecutionDetails';
import BlockList from './pages/BlockList';
import Login from './pages/Login';
import Register from './pages/Register';
import { useAuthStore } from './store/authStore';

function App() {
  const { isAuthenticated, isDevelopmentMode } = useAuthStore();

  return (
    <Box sx={{ width: '100%', height: '100vh' }}>
      <Routes>
        {/* In development mode, skip login/register pages */}
        {!isDevelopmentMode && (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </>
        )}
        
        {isAuthenticated ? (
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/workflows" replace />} />
            <Route path="workflows" element={<WorkflowList />} />
            <Route path="workflows/:id" element={<WorkflowEditor />} />
            <Route path="workflows/new" element={<WorkflowEditor />} />
            <Route path="executions" element={<ExecutionList />} />
            <Route path="executions/:id" element={<ExecutionDetails />} />
            <Route path="blocks" element={<BlockList />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </Box>
  );
}

export default App;

// Made with Bob
