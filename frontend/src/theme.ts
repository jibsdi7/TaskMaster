import { createTheme, alpha } from '@mui/material/styles';

const SURFACE  = '#141414';
const SURFACE2 = '#1c1c1c';
const SURFACE3 = '#242424';
const BORDER   = '#2a2a2a';
const ACCENT   = '#5B7CF6';   // indigo-ish blue
const ACCENT2  = '#7C5CF6';   // violet accent

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary:    { main: ACCENT,  light: '#7B96F9', dark: '#3D5CD4' },
    secondary:  { main: ACCENT2, light: '#9C7CF9', dark: '#5A3CC4' },
    background: { default: SURFACE, paper: SURFACE2 },
    text:       { primary: '#FFFFFF', secondary: '#A0A0B4' },
    divider:    BORDER,
    error:      { main: '#F56565' },
    warning:    { main: '#F6AD55' },
    success:    { main: '#48BB78' },
    info:       { main: ACCENT },
  },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontSize: '2.25rem', fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontSize: '1.5rem',  fontWeight: 600, letterSpacing: '-0.01em' },
    h4: { fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.01em' },
    h5: { fontSize: '1.1rem',  fontWeight: 600 },
    h6: { fontSize: '0.95rem', fontWeight: 600 },
    body1: { fontSize: '0.9rem',  lineHeight: 1.6 },
    body2: { fontSize: '0.825rem', lineHeight: 1.6 },
    caption: { fontSize: '0.75rem', color: '#A0A0B4' },
    button: { fontSize: '0.825rem', fontWeight: 500, textTransform: 'none', letterSpacing: '0.01em' },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 7,
          fontWeight: 500,
          letterSpacing: '0.01em',
          transition: 'all 0.15s ease',
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT2} 100%)`,
          boxShadow: `0 1px 3px ${alpha(ACCENT, 0.35)}`,
          '&:hover': {
            background: `linear-gradient(135deg, #6B8CF9 0%, #8C6CF9 100%)`,
            boxShadow: `0 4px 12px ${alpha(ACCENT, 0.4)}`,
            transform: 'translateY(-1px)',
          },
        },
        containedError: {
          '&:hover': { transform: 'translateY(-1px)' },
        },
        containedSuccess: {
          '&:hover': { transform: 'translateY(-1px)' },
        },
        outlined: {
          borderColor: BORDER,
          color: '#D0D0E0',
          '&:hover': { borderColor: '#444', backgroundColor: SURFACE3, color: '#FFFFFF' },
        },
        sizeSmall: { padding: '4px 12px', fontSize: '0.8rem' },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 7,
          transition: 'all 0.15s ease',
          '&:hover': { backgroundColor: SURFACE3 },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: SURFACE2,
          border: `1px solid ${BORDER}`,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: SURFACE2,
          border: `1px solid ${BORDER}`,
          borderRadius: 10,
          transition: 'border-color 0.2s, box-shadow 0.2s',
          '&:hover': {
            borderColor: '#3a3a4a',
            boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 500, fontSize: '0.75rem' },
        outlined: { borderColor: BORDER },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: BORDER } },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: SURFACE3,
            '& fieldset': { borderColor: BORDER },
            '&:hover fieldset': { borderColor: '#3a3a4a' },
            '&.Mui-focused fieldset': { borderColor: ACCENT, borderWidth: 1.5 },
          },
          '& .MuiInputLabel-root': { color: '#A0A0B4' },
          '& .MuiInputLabel-root.Mui-focused': { color: ACCENT },
          '& .MuiInputBase-input': { color: '#FFFFFF' },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#0a0a0a',
          border: `1px solid ${BORDER}`,
          fontSize: '0.75rem',
          borderRadius: 6,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
  },
});

// Made with Bob
