/**
 * Date formatting utilities — all times displayed in IST (UTC+5:30).
 * Uses manual arithmetic so behaviour is identical across all browsers
 * regardless of the OS timezone setting.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Parse a UTC ISO string that may or may not carry a 'Z' suffix
 * (SQLAlchemy/Python serialises without 'Z' in some versions).
 */
function parseUTC(iso: string): Date {
  return new Date(/[Z+\-]\d*$/.test(iso) ? iso : iso + 'Z');
}

/**
 * toIST(iso)
 * Converts a UTC ISO string → IST Date object (hours/minutes via getUTC*).
 */
function toIST(iso: string): Date {
  return new Date(parseUTC(iso).getTime() + IST_OFFSET_MS);
}

/**
 * fmtDateTime — "02 Jul 2025, 13:58 IST"
 * Use for timestamps that carry a time component.
 */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = toIST(iso);
  return `${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} IST`;
}

/**
 * fmtDate — "02 Jul 2025"
 * Use for date-only display (e.g. created_at cards where time is not needed).
 */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = toIST(iso);
  return `${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * fmtTime — "13:58 IST"
 * Use for time-only display (e.g. log entry timestamps).
 */
export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = toIST(iso);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} IST`;
}

// Made with Bob
