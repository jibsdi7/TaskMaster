import { useEffect, useState, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Box, Typography, Alert,
  ToggleButtonGroup, ToggleButton, CircularProgress, Popover, IconButton,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { authHeaders, BASE_URL } from '../api/client';
import type { ScheduledJob } from '../pages/SchedulerList';

interface Workflow {
  id: number;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (job: ScheduledJob) => void;
}

// ---------------------------------------------------------------------------
// IST helpers  (UTC+5:30 = +330 min)
// ---------------------------------------------------------------------------
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Current date/time in IST */
function nowIST(): Date {
  return new Date(Date.now() + IST_OFFSET_MS);
}

/** Convert an IST {year,month(0-based),day,hour,minute} to a UTC ISO string */
function istPartsToUtcIso(year: number, month: number, day: number, hour: number, minute: number): string {
  // Build a UTC timestamp that represents this IST wall-clock time
  const utcMs = Date.UTC(year, month, day, hour, minute) - IST_OFFSET_MS;
  return new Date(utcMs).toISOString();
}

/** Format for display: "15 Jul 2025, 09:30 IST" */
function fmtDisplay(year: number, month: number, day: number, hour: number, minute: number): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${String(day).padStart(2, '0')} ${months[month]} ${year}, ${pad(hour)}:${pad(minute)} IST`;
}

// ---------------------------------------------------------------------------
// Cron helpers
// ---------------------------------------------------------------------------
function describeCron(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return '';
  const [min, hour, dom, month, dow] = parts;
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const pad = (n: number) => String(n).padStart(2, '0');

  if (min === '*' && hour === '*' && dom === '*' && month === '*' && dow === '*') return 'Every minute';
  if (dom === '*' && month === '*' && dow === '*') {
    const h = parseInt(hour), m = parseInt(min);
    if (!isNaN(h) && !isNaN(m)) return `Daily at ${pad(h)}:${pad(m)} IST`;
  }
  if (dom === '*' && month === '*' && dow !== '*') {
    const d = parseInt(dow), h = parseInt(hour), m = parseInt(min);
    if (!isNaN(d) && !isNaN(h) && !isNaN(m))
      return `Every ${days[d] ?? 'day'} at ${pad(h)}:${pad(m)} IST`;
  }
  if (dow === '*' && month === '*') {
    const d = parseInt(dom), h = parseInt(hour), m = parseInt(min);
    if (!isNaN(d) && !isNaN(h) && !isNaN(m))
      return `Monthly on day ${d} at ${pad(h)}:${pad(m)} IST`;
  }
  if (dow === '*') {
    const mo = parseInt(month), d = parseInt(dom), h = parseInt(hour), m = parseInt(min);
    if (!isNaN(mo) && !isNaN(d) && !isNaN(h) && !isNaN(m))
      return `Yearly on ${months[mo - 1] ?? ''} ${d} at ${pad(h)}:${pad(m)} IST`;
  }
  return 'Custom cron schedule (IST)';
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------
const inputSx = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#1c1c1c',
    color: '#E0E0F0',
    '& fieldset': { borderColor: '#333' },
    '&:hover fieldset': { borderColor: '#555' },
    '&.Mui-focused fieldset': { borderColor: '#5B7CF6' },
  },
  '& .MuiInputLabel-root': { color: '#888' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#7B96F9' },
  '& .MuiSelect-icon': { color: '#888' },
};

const CRON_PRESETS = [
  { label: 'Every minute',         value: '* * * * *' },
  { label: 'Every hour',           value: '0 * * * *' },
  { label: 'Daily at 09:00 IST',   value: '0 9 * * *' },
  { label: 'Every Monday 09:00 IST', value: '0 9 * * 1' },
  { label: 'First of month 09:00 IST', value: '0 9 1 * *' },
  { label: 'Custom…',              value: '__custom__' },
];

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS  = ['Su','Mo','Tu','We','Th','Fr','Sa'];

// ---------------------------------------------------------------------------
// Calendar sub-component
// ---------------------------------------------------------------------------
interface CalendarProps {
  selectedYear: number;
  selectedMonth: number;
  selectedDay: number | null;
  onSelect: (year: number, month: number, day: number) => void;
}

function CalendarPicker({ selectedYear, selectedMonth, selectedDay, onSelect }: CalendarProps) {
  const [viewYear,  setViewYear]  = useState(selectedYear);
  const [viewMonth, setViewMonth] = useState(selectedMonth);

  const todayIST   = nowIST();
  const todayY     = todayIST.getUTCFullYear();
  const todayM     = todayIST.getUTCMonth();
  const todayD     = todayIST.getUTCDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // Days array: null = empty cell, number = day of month
  const firstDow = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const isPast = (d: number) => {
    if (viewYear < todayY) return true;
    if (viewYear === todayY && viewMonth < todayM) return true;
    if (viewYear === todayY && viewMonth === todayM && d < todayD) return true;
    return false;
  };
  const isSelected = (d: number) =>
    selectedDay === d && selectedYear === viewYear && selectedMonth === viewMonth;
  const isToday = (d: number) => viewYear === todayY && viewMonth === todayM && d === todayD;

  return (
    <Box sx={{ p: 2, width: 280 }}>
      {/* Month/year header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <IconButton size="small" onClick={prevMonth} sx={{ color: '#888', '&:hover': { color: '#E0E0F0' } }}>
          <ChevronLeftIcon sx={{ fontSize: 18 }} />
        </IconButton>
        <Typography variant="body2" sx={{ color: '#E0E0F0', fontWeight: 600 }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Typography>
        <IconButton size="small" onClick={nextMonth} sx={{ color: '#888', '&:hover': { color: '#E0E0F0' } }}>
          <ChevronRightIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* Day-of-week headers */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.5 }}>
        {DAY_LABELS.map((d) => (
          <Box key={d} sx={{ textAlign: 'center', py: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#555', fontSize: 11, fontWeight: 600 }}>{d}</Typography>
          </Box>
        ))}
      </Box>

      {/* Day cells */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {cells.map((day, i) => {
          if (day === null) return <Box key={`e${i}`} />;
          const past = isPast(day);
          const sel  = isSelected(day);
          const tod  = isToday(day);
          return (
            <Box
              key={day}
              onClick={() => !past && onSelect(viewYear, viewMonth, day)}
              sx={{
                height: 32, borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: past ? 'not-allowed' : 'pointer',
                backgroundColor: sel ? '#5B7CF6' : 'transparent',
                border: tod && !sel ? '1px solid #5B7CF6' : '1px solid transparent',
                transition: 'background-color 0.15s',
                '&:hover': !past ? { backgroundColor: sel ? '#5B7CF6' : '#2a2a3a' } : {},
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontSize: 13,
                  color: past ? '#444' : sel ? '#fff' : tod ? '#7B96F9' : '#CCC',
                  fontWeight: sel ? 700 : 400,
                  userSelect: 'none',
                }}
              >
                {day}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Clock sub-component  (24-hour, two steps: hour → minute)
// ---------------------------------------------------------------------------
interface ClockProps {
  hour: number;
  minute: number;
  step: 'hour' | 'minute';
  onSelect: (value: number) => void;
}

function ClockFace({ hour, minute, step, onSelect }: ClockProps) {
  const cx = 110; // SVG centre x
  const cy = 110; // SVG centre y
  const R  = 88;  // tick radius

  // Hours 0-23 arranged as two rings: outer 0-11, inner 12-23
  const hourItems = Array.from({ length: 24 }, (_, i) => {
    const outer  = i < 12;
    const angle  = (i % 12) * 30 - 90; // degrees
    const r      = outer ? R : R * 0.65;
    const rad    = (angle * Math.PI) / 180;
    return { value: i, x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad), outer };
  });

  // Minutes 0-59 in steps of 5 for the face; remaining via input nudge
  const minuteItems = Array.from({ length: 12 }, (_, i) => {
    const angle = i * 30 - 90;
    const rad   = (angle * Math.PI) / 180;
    return { value: i * 5, x: cx + R * Math.cos(rad), y: cy + R * Math.sin(rad) };
  });

  // Hand endpoint
  const handAngle = step === 'hour'
    ? ((hour % 12) * 30 - 90) * (Math.PI / 180)
    : ((minute / 60) * 360 - 90) * (Math.PI / 180);
  const handR = step === 'hour' ? (hour < 12 ? R : R * 0.65) : R;
  const handX = cx + handR * Math.cos(handAngle);
  const handY = cy + handR * Math.sin(handAngle);

  const items = step === 'hour' ? hourItems : minuteItems;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
      {/* Digital readout */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
        <Typography
          variant="h4"
          sx={{
            color: step === 'hour' ? '#5B7CF6' : '#888',
            fontWeight: 700, fontFamily: 'monospace', cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          {String(hour).padStart(2, '0')}
        </Typography>
        <Typography variant="h4" sx={{ color: '#555', fontWeight: 700, lineHeight: 1 }}>:</Typography>
        <Typography
          variant="h4"
          sx={{
            color: step === 'minute' ? '#5B7CF6' : '#888',
            fontWeight: 700, fontFamily: 'monospace', cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          {String(minute).padStart(2, '0')}
        </Typography>
        <Typography variant="caption" sx={{ color: '#666', ml: 0.5, alignSelf: 'flex-end', mb: 0.5 }}>IST</Typography>
      </Box>

      {/* Step label */}
      <Typography variant="caption" sx={{ color: '#666', mb: 1.5 }}>
        {step === 'hour' ? 'Select hour' : 'Select minute'}
      </Typography>

      {/* SVG clock face */}
      <svg width={220} height={220} style={{ display: 'block' }}>
        {/* Clock disc */}
        <circle cx={cx} cy={cy} r={105} fill="#1c1c1c" stroke="#333" strokeWidth={1} />

        {/* Hand */}
        <line x1={cx} y1={cy} x2={handX} y2={handY} stroke="#5B7CF6" strokeWidth={2} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={4} fill="#5B7CF6" />
        <circle cx={handX} cy={handY} r={16} fill="#5B7CF6" fillOpacity={0.25} />

        {/* Tick labels */}
        {items.map((item) => {
          const isActive = step === 'hour' ? item.value === hour : item.value === minute;
          return (
            <g
              key={item.value}
              onClick={() => onSelect(item.value)}
              style={{ cursor: 'pointer' }}
            >
              <circle cx={item.x} cy={item.y} r={15} fill={isActive ? '#5B7CF6' : 'transparent'} />
              <text
                x={item.x}
                y={item.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={step === 'hour' && item.value >= 12 ? 11 : 13}
                fontFamily="monospace"
                fill={isActive ? '#fff' : '#AAA'}
                fontWeight={isActive ? 700 : 400}
              >
                {step === 'hour' ? String(item.value).padStart(2, '0') : String(item.value).padStart(2, '0')}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Fine-tune minute input when not a multiple of 5 */}
      {step === 'minute' && (
        <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ color: '#666' }}>Fine-tune minute:</Typography>
          <Box
            component="input"
            type="number"
            min={0}
            max={59}
            value={minute}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const v = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
              onSelect(v);
            }}
            sx={{
              width: 52, backgroundColor: '#1c1c1c', border: '1px solid #444',
              borderRadius: '6px', color: '#E0E0F0', textAlign: 'center',
              fontSize: 13, fontFamily: 'monospace', py: '4px',
              '&:focus': { outline: 'none', borderColor: '#5B7CF6' },
            }}
          />
        </Box>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Date-time picker field  (calendar → clock, IST)
// ---------------------------------------------------------------------------
interface DateTimePickerProps {
  value: { year: number; month: number; day: number; hour: number; minute: number } | null;
  onChange: (v: { year: number; month: number; day: number; hour: number; minute: number }) => void;
}

function ISTDateTimePicker({ value, onChange }: DateTimePickerProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pickerStep, setPickerStep] = useState<'calendar' | 'hour' | 'minute'>('calendar');

  // Internal picker state (drafting)
  const todayIST = nowIST();
  const [draftYear,   setDraftYear]   = useState(value?.year   ?? todayIST.getUTCFullYear());
  const [draftMonth,  setDraftMonth]  = useState(value?.month  ?? todayIST.getUTCMonth());
  const [draftDay,    setDraftDay]    = useState<number | null>(value?.day ?? null);
  const [draftHour,   setDraftHour]   = useState(value?.hour   ?? 9);
  const [draftMinute, setDraftMinute] = useState(value?.minute ?? 0);

  const displayText = value
    ? fmtDisplay(value.year, value.month, value.day, value.hour, value.minute)
    : '';

  const handleOpen = () => {
    // Reset draft to current value (or today)
    setDraftYear(value?.year   ?? todayIST.getUTCFullYear());
    setDraftMonth(value?.month ?? todayIST.getUTCMonth());
    setDraftDay(value?.day     ?? null);
    setDraftHour(value?.hour   ?? 9);
    setDraftMinute(value?.minute ?? 0);
    setPickerStep('calendar');
    setPopoverOpen(true);
  };

  const handleDateSelect = (year: number, month: number, day: number) => {
    setDraftYear(year);
    setDraftMonth(month);
    setDraftDay(day);
    setPickerStep('hour');
  };

  const handleHourSelect = (h: number) => {
    setDraftHour(h);
    setPickerStep('minute');
  };

  const handleMinuteSelect = (m: number) => {
    setDraftMinute(m);
  };

  const handleConfirm = () => {
    if (draftDay === null) return;
    onChange({ year: draftYear, month: draftMonth, day: draftDay, hour: draftHour, minute: draftMinute });
    setPopoverOpen(false);
  };

  const handleClear = () => {
    setPopoverOpen(false);
  };

  return (
    <>
      {/* Trigger field */}
      <Box
        ref={anchorRef}
        onClick={handleOpen}
        sx={{
          display: 'flex', alignItems: 'center',
          backgroundColor: '#1c1c1c', border: '1px solid #333',
          borderRadius: '4px', px: 1.5, py: '8.5px',
          cursor: 'pointer', gap: 1,
          '&:hover': { borderColor: '#555' },
          transition: 'border-color 0.15s',
        }}
      >
        <CalendarMonthIcon sx={{ fontSize: 18, color: '#666', flexShrink: 0 }} />
        <Typography
          variant="body2"
          sx={{ color: displayText ? '#E0E0F0' : '#555', flex: 1, userSelect: 'none' }}
        >
          {displayText || 'Select date & time (IST)'}
        </Typography>
      </Box>

      {/* Popover */}
      <Popover
        open={popoverOpen}
        anchorEl={anchorRef.current}
        onClose={handleClear}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{
          sx: {
            backgroundColor: '#181818', border: '1px solid #2a2a2a',
            borderRadius: '10px', mt: 0.5, minWidth: 280,
          },
        }}
      >
        {/* Step tabs */}
        <Box sx={{ display: 'flex', borderBottom: '1px solid #2a2a2a' }}>
          {(['calendar', 'hour', 'minute'] as const).map((s) => (
            <Box
              key={s}
              onClick={() => draftDay !== null || s === 'calendar' ? setPickerStep(s) : undefined}
              sx={{
                flex: 1, py: 1, textAlign: 'center', cursor: 'pointer',
                borderBottom: pickerStep === s ? '2px solid #5B7CF6' : '2px solid transparent',
                color: pickerStep === s ? '#7B96F9' : '#555',
                '&:hover': { color: '#AAA' },
                transition: 'color 0.15s',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {s === 'calendar' ? 'Date' : s === 'hour' ? 'Hour' : 'Minute'}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Calendar panel */}
        {pickerStep === 'calendar' && (
          <CalendarPicker
            selectedYear={draftYear}
            selectedMonth={draftMonth}
            selectedDay={draftDay}
            onSelect={handleDateSelect}
          />
        )}

        {/* Hour panel */}
        {pickerStep === 'hour' && (
          <ClockFace
            hour={draftHour}
            minute={draftMinute}
            step="hour"
            onSelect={handleHourSelect}
          />
        )}

        {/* Minute panel */}
        {pickerStep === 'minute' && (
          <ClockFace
            hour={draftHour}
            minute={draftMinute}
            step="minute"
            onSelect={handleMinuteSelect}
          />
        )}

        {/* Footer actions */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, px: 2, py: 1.5, borderTop: '1px solid #2a2a2a' }}>
          <Button size="small" onClick={handleClear} sx={{ color: '#666' }}>Cancel</Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleConfirm}
            disabled={draftDay === null}
          >
            OK
          </Button>
        </Box>
      </Popover>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main ScheduleDialog
// ---------------------------------------------------------------------------
type ISTDateTime = { year: number; month: number; day: number; hour: number; minute: number };

const ScheduleDialog = ({ open, onClose, onCreated }: Props) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loadingWf, setLoadingWf] = useState(false);

  const [name,         setName]         = useState('');
  const [workflowId,   setWorkflowId]   = useState<number | ''>('');
  const [scheduleType, setScheduleType] = useState<'one_time' | 'cron'>('one_time');
  const [runAt,        setRunAt]        = useState<ISTDateTime | null>(null);
  const [cronPreset,   setCronPreset]   = useState('0 9 * * *');
  const [cronCustom,   setCronCustom]   = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [apiError,     setApiError]     = useState<string | null>(null);

  const cronValue = cronPreset === '__custom__' ? cronCustom : cronPreset;

  useEffect(() => {
    if (!open) return;
    setLoadingWf(true);
    fetch(`${BASE_URL}/api/workflows/`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => setWorkflows(Array.isArray(data) ? data : []))
      .catch(() => setWorkflows([]))
      .finally(() => setLoadingWf(false));
    setName('');
    setWorkflowId('');
    setScheduleType('one_time');
    setRunAt(null);
    setCronPreset('0 9 * * *');
    setCronCustom('');
    setApiError(null);
  }, [open]);

  const handleSubmit = async () => {
    setApiError(null);
    if (!name.trim())    { setApiError('Name is required'); return; }
    if (!workflowId)     { setApiError('Workflow is required'); return; }
    if (scheduleType === 'one_time' && !runAt)         { setApiError('Date & time is required'); return; }
    if (scheduleType === 'cron' && !cronValue.trim())  { setApiError('Cron expression is required'); return; }

    const body: Record<string, unknown> = {
      name: name.trim(),
      workflow_id: workflowId,
      schedule_type: scheduleType,
    };
    if (scheduleType === 'one_time' && runAt) {
      body.run_at = istPartsToUtcIso(runAt.year, runAt.month, runAt.day, runAt.hour, runAt.minute);
    } else {
      body.cron_expression = cronValue.trim();
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/scheduler/`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? 'Failed to create schedule');
      }
      const job: ScheduledJob = await res.json();
      onCreated(job);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px' } }}
    >
      <DialogTitle sx={{ color: '#E0E0F0', borderBottom: '1px solid #2a2a2a', pb: 2 }}>
        New Schedule
      </DialogTitle>

      <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {apiError && <Alert severity="error" sx={{ borderRadius: '8px' }}>{apiError}</Alert>}

        {/* Name */}
        <TextField
          label="Schedule name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth size="small"
          placeholder="e.g. Daily login check"
          sx={inputSx}
        />

        {/* Workflow picker */}
        <TextField
          select label="Workflow"
          value={workflowId}
          onChange={(e) => setWorkflowId(Number(e.target.value))}
          fullWidth size="small" sx={inputSx}
          SelectProps={{ MenuProps: { PaperProps: { sx: { backgroundColor: '#1c1c1c', border: '1px solid #333' } } } }}
        >
          {loadingWf ? (
            <MenuItem disabled><CircularProgress size={14} sx={{ mr: 1 }} />Loading workflows…</MenuItem>
          ) : workflows.length === 0 ? (
            <MenuItem disabled>No workflows found</MenuItem>
          ) : (
            workflows.map((wf) => (
              <MenuItem key={wf.id} value={wf.id} sx={{ color: '#CCC', '&:hover': { backgroundColor: '#242424' } }}>
                {wf.name}
              </MenuItem>
            ))
          )}
        </TextField>

        {/* Schedule type toggle */}
        <Box>
          <Typography variant="caption" sx={{ color: '#888', mb: 1, display: 'block' }}>Schedule type</Typography>
          <ToggleButtonGroup
            value={scheduleType} exclusive
            onChange={(_e, val) => val && setScheduleType(val)}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                color: '#666', border: '1px solid #333', px: 3,
                '&.Mui-selected': { backgroundColor: 'rgba(91,124,246,0.15)', color: '#7B96F9', border: '1px solid rgba(91,124,246,0.4)' },
              },
            }}
          >
            <ToggleButton value="one_time">One-time</ToggleButton>
            <ToggleButton value="cron">Recurring (Cron)</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* One-time: IST date+time picker */}
        {scheduleType === 'one_time' && (
          <Box>
            <Typography variant="caption" sx={{ color: '#888', mb: 0.75, display: 'block' }}>
              Run at <Typography component="span" variant="caption" sx={{ color: '#5B7CF6' }}>(IST — India Standard Time)</Typography>
            </Typography>
            <ISTDateTimePicker value={runAt} onChange={setRunAt} />
          </Box>
        )}

        {/* Cron: preset + custom */}
        {scheduleType === 'cron' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField
              select label="Preset"
              value={cronPreset}
              onChange={(e) => setCronPreset(e.target.value)}
              fullWidth size="small" sx={inputSx}
              SelectProps={{ MenuProps: { PaperProps: { sx: { backgroundColor: '#1c1c1c', border: '1px solid #333' } } } }}
            >
              {CRON_PRESETS.map((p) => (
                <MenuItem key={p.value} value={p.value} sx={{ color: '#CCC', '&:hover': { backgroundColor: '#242424' } }}>
                  {p.label}
                  {p.value !== '__custom__' && (
                    <Typography component="span" sx={{ ml: 1, color: '#555', fontFamily: 'monospace', fontSize: 12 }}>
                      ({p.value})
                    </Typography>
                  )}
                </MenuItem>
              ))}
            </TextField>

            {cronPreset === '__custom__' && (
              <TextField
                label="Cron expression"
                value={cronCustom}
                onChange={(e) => setCronCustom(e.target.value)}
                fullWidth size="small"
                placeholder="0 9 * * 1"
                sx={inputSx}
                inputProps={{ style: { fontFamily: 'monospace' } }}
              />
            )}

            {cronValue && cronValue !== '__custom__' && (
              <Box sx={{ px: 1.5, py: 1, backgroundColor: 'rgba(91,124,246,0.07)', borderRadius: '7px', border: '1px solid rgba(91,124,246,0.15)' }}>
                <Typography variant="caption" sx={{ color: '#7B96F9' }}>
                  {describeCron(cronValue) || 'Custom schedule'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#555', ml: 1, fontFamily: 'monospace' }}>
                  ({cronValue})
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, borderTop: '1px solid #2a2a2a', pt: 2, gap: 1 }}>
        <Button onClick={onClose} size="small" sx={{ color: '#888' }}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
          size="small"
          startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : undefined}
        >
          {submitting ? 'Creating…' : 'Create Schedule'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScheduleDialog;

// Made with Bob
