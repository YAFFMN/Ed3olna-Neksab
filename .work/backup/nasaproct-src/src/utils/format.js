export function num(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const str = String(value).trim();
  const cleaned = str.replace(/^s(?=\d)/i, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function fixed(value, digits = 2, fallback = '—') {
  const parsed = num(value);
  return parsed === null ? fallback : parsed.toFixed(digits);
}

export function radiationStatus(value) {
  const rate = num(value);
  if (rate === null) return 'unknown';
  if (rate >= 1000) return 'critical';
  if (rate >= 250) return 'warning';
  return 'nominal';
}

export function doseStatus(dose, limit) {
  const amount = num(dose);
  const safeLimit = num(limit);
  if (amount === null || safeLimit === null || safeLimit <= 0) return 'unknown';
  const ratio = amount / safeLimit;
  if (ratio > 0.9) return 'critical';
  if (ratio >= 0.6) return 'warning';
  return 'nominal';
}

export function heartStatus(value) {
  const bpm = num(value);
  if (bpm === null) return 'unknown';
  if (bpm >= 120 || bpm < 45) return 'critical';
  if (bpm >= 100 || bpm < 55) return 'warning';
  return 'nominal';
}

export function fluxStatus(sScale) {
  const scale = num(sScale);
  if (scale === null) return 'unknown';
  if (scale >= 4) return 'critical';
  if (scale >= 2) return 'warning';
  return 'nominal';
}

export function statusTone(status) {
  const tones = {
    nominal: {
      text: 'text-[#35d08a]',
      border: 'border-[#35d08a]/30',
      bg: 'bg-[#35d08a]/10',
      glow: 'shadow-[0_0_20px_rgba(53,208,138,0.12)]',
      badge: 'badge-nominal',
      label: 'NOMINAL',
    },
    warning: {
      text: 'text-[#ffb224]',
      border: 'border-[#ffb224]/35',
      bg: 'bg-[#ffb224]/10',
      glow: 'shadow-[0_0_20px_rgba(255,178,36,0.14)]',
      badge: 'badge-warn',
      label: 'ELEVATED',
    },
    critical: {
      text: 'text-[#ff5d4d]',
      border: 'border-[#ff5d4d]/40',
      bg: 'bg-[#ff5d4d]/15',
      glow: 'shadow-[0_0_24px_rgba(255,93,77,0.22)]',
      badge: 'badge-bad',
      label: 'CRITICAL',
    },
    unknown: {
      text: 'text-[#8fa0b4]',
      border: 'border-[#1d2836]',
      bg: 'bg-[#0a0f16]/60',
      glow: '',
      badge: 'bg-white/5 text-slate-400 border-white/10',
      label: 'NO SIGNAL',
    },
  };
  return tones[status] || tones.unknown;
}

export function sScaleColor(value) {
  const scale = num(value);
  if (scale === null) return { text: 'text-slate-400', border: 'border-[#1d2836]', bg: 'bg-[#0a0f16]', label: 'AWAITING' };
  if (scale >= 4) return { text: 'text-[#ff5d4d]', border: 'border-[#ff5d4d]/40', bg: 'bg-[#ff5d4d]/10', label: 'EXTREME' };
  if (scale >= 2) return { text: 'text-[#ffb224]', border: 'border-[#ffb224]/40', bg: 'bg-[#ffb224]/10', label: 'ELEVATED' };
  return { text: 'text-[#35d08a]', border: 'border-[#35d08a]/30', bg: 'bg-[#35d08a]/10', label: scale === 0 ? 'QUIET' : 'MINOR' };
}

export function formatUtcTime(value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
    hour12: false,
  }).format(date);
}

export function formatUtcDateTime(value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
    hour12: false,
  }).format(date) + ' UTC';
}

export function formatChartTime(value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
    hour12: false,
  }).format(date);
}

export function timeAgo(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function parseActionSteps(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((s) => String(s).trim()).filter(Boolean);
  }
  const str = String(value).trim();
  if (str.startsWith('[') && str.endsWith(']')) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parsed.map((s) => String(s).trim()).filter(Boolean);
      }
    } catch {
      // not JSON array, continue to regular parsing
    }
  }
  return str
    .split(/\r?\n|(?=\s+\d+[.)]\s*)/)
    .map((line) => line.replace(/^\s*\d+[.)-]?\s*/, '').trim())
    .filter(Boolean);
}
