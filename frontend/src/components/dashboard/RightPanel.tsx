// RightPanel.tsx — action buttons + activity timeline + system health
import { Box, Button, Divider, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { useNavigate } from 'react-router-dom';
import ActivityTimeline from './ActivityTimeline';
import SystemHealth from './SystemHealth';

const btnSx = {
  justifyContent: 'flex-start', px: 1.5, py: 0.875, borderRadius: '9px',
  color: '#C0C0D0', fontWeight: 500, fontSize: '0.82rem',
  backgroundColor: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
  transition: 'all 0.15s ease',
  '&:hover': { backgroundColor: 'rgba(91,124,246,0.1)', borderColor: 'rgba(91,124,246,0.3)', color: '#FFFFFF' },
};

interface Props { activities?: any[]; }

export default function RightPanel({ activities = [] }: Props) {
  const navigate = useNavigate();

  const actions = [
    { label: 'New Workflow',         Icon: AddIcon,                  onClick: () => navigate('/workflows/new') },
    { label: 'Start Recording',      Icon: FiberManualRecordIcon,    onClick: () => navigate('/workflows/new') },
    { label: 'Import Workflow',      Icon: FileUploadIcon,           onClick: () => {} },
    { label: 'Export Workflow',      Icon: FileDownloadIcon,         onClick: () => {} },
    { label: 'Run Workflow',         Icon: PlayArrowIcon,            onClick: () => navigate('/workflows') },
    { label: 'Create Reusable Block', Icon: ViewModuleIcon,          onClick: () => navigate('/blocks/new') },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Quick actions card */}
      <Box sx={{
        background: 'linear-gradient(135deg, rgba(30,30,46,0.85) 0%, rgba(20,20,32,0.92) 100%)',
        backdropFilter: 'blur(14px)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '14px',
        p: 2,
      }}>
        <Typography variant="caption" sx={{ color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: '0.68rem', display: 'block', mb: 1.5 }}>
          Quick Actions
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {actions.map((a) => {
            const Icon = a.Icon;
            return (
              <Button key={a.label} startIcon={<Icon sx={{ fontSize: '15px !important' }} />} fullWidth onClick={a.onClick} sx={btnSx}>
                {a.label}
              </Button>
            );
          })}
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'transparent' }} />
      <ActivityTimeline activities={activities} />
      <SystemHealth />
    </Box>
  );
}

// Made with Bob
