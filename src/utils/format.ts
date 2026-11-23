export function getTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export const todayISO = getTodayISO;

export function getDaysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

const MONTH_NAME_MAP: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  mei: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  agt: '08',
  agu: '08',
  sep: '09',
  oct: '10',
  okt: '10',
  nov: '11',
  dec: '12',
  des: '12',
};

/**
 * Normalizes any date value (YYYY-MM-DD, ISO timestamp, DD/MM/YYYY, or JS/Apps Script
 * Date strings like "Tue Nov 17 2026 00:00:00 GMT+0700 (Waktu Indonesia Barat)")
 * into canonical "YYYY-MM-DD" without UTC timezone day-shift bugs.
 */
export function normalizeDateISO(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, '0')}-${String(
      raw.getDate(),
    ).padStart(2, '0')}`;
  }

  const s = String(raw).trim();
  if (!s) return '';

  // 1. YYYY-MM-DD or YYYY-MM-DDTHH:mm...
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  // 2. JS/Apps Script Date string: "Tue Nov 17 2026 00:00:00 GMT+0700 (...)"
  const gmtMatch = s.match(/\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (gmtMatch) {
    const monKey = gmtMatch[1].slice(0, 3).toLowerCase();
    const mm = MONTH_NAME_MAP[monKey];
    if (mm) {
      return `${gmtMatch[3]}-${mm}-${gmtMatch[2].padStart(2, '0')}`;
    }
  }

  // 3. "17 Nov 2026"
  const dmyTextMatch = s.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
  if (dmyTextMatch) {
    const monKey = dmyTextMatch[2].slice(0, 3).toLowerCase();
    const mm = MONTH_NAME_MAP[monKey];
    if (mm) {
      return `${dmyTextMatch[3]}-${mm}-${dmyTextMatch[1].padStart(2, '0')}`;
    }
  }

  // 4. DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }

  // 5. Fallback Date parse
  const cleaned = s.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(
      parsed.getDate(),
    ).padStart(2, '0')}`;
  }

  return s;
}

export function formatDateShortID(raw: unknown): string {
  const iso = normalizeDateISO(raw);
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso || '-';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;
const BULAN_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

/**
 * Formats any date into formal Bahasa Indonesia with day name, e.g.:
 * "Selasa, 17 November 2026" — immune to UTC timezone shifts.
 */
export function formatDateFullID(raw: unknown): string {
  const iso = normalizeDateISO(raw);
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso || '-';
  const year = Number(m[1]);
  const monthIdx = Number(m[2]) - 1;
  const day = Number(m[3]);
  const localDate = new Date(year, monthIdx, day);
  if (isNaN(localDate.getTime()) || monthIdx < 0 || monthIdx > 11) {
    return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const hari = HARI_ID[localDate.getDay()];
  const bulan = BULAN_ID[monthIdx];
  return `${hari}, ${day} ${bulan} ${year}`;
}

export function formatRupiah(num: number | string | undefined | null): string {
  const n = typeof num === 'number' ? num : cleanRupiahToNumber(num);
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n || 0));
}

export function formatJuta(num: number | undefined | null): string {
  const val = num || 0;
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}Rp ${(abs / 1_000_000).toFixed(1).replace('.', ',')} jt`;
  }
  return formatRupiah(val);
}

export function formatNumberWithDots(n: number | string | undefined | null): string {
  if (n === null || n === undefined || n === '') return '0';
  return new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
}

export function cleanRupiahToNumber(val: number | string | undefined | null): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = val
    .toString()
    .replace(/Rp/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatCurrencyInput(value: string): string {
  const raw = value.replace(/\D/g, '');
  return raw ? new Intl.NumberFormat('id-ID').format(Number(raw)) : '';
}

export function formatTon(kg: number | undefined | null, decimals = 1): string {
  return `${((kg || 0) / 1000).toFixed(decimals).replace('.', ',')} ton`;
}

export function isAdminRole(role?: string | null): boolean {
  const r = (role || '').toString().toLowerCase();
  return r.includes('admin') || r.includes('hr');
}

export function getInitials(name: string): string {
  const parts = String(name || 'US')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (parts[0] || 'US').slice(0, 2).toUpperCase();
}

export function formatDateRangeLabel(startISO: string, endISO: string): string {
  if (!startISO || !endISO) return '';
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agt',
    'Sep',
    'Okt',
    'Nov',
    'Des',
  ];
  const sd = new Date(`${startISO}T00:00:00`);
  const ed = new Date(`${endISO}T00:00:00`);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(sd.getDate())} ${months[sd.getMonth()]} - ${pad(ed.getDate())} ${
    months[ed.getMonth()]
  } ${ed.getFullYear()}`;
}

export function escapeHTML(str: unknown): string {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Normalizes any invoice/nota code into the canonical slash-separated INV format,
 * e.g. "TRX-1117-007", "INV-1117-007", or "TRX/1117/007" -> "INV/1117/007".
 */
export function normalizeInvoiceCode(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (/^(TRX|INV)[-/]/i.test(s)) {
    return s.replace(/^(TRX|INV)[-/]/i, 'INV/').replace(/-/g, '/');
  }
  return s.replace(/-/g, '/');
}
