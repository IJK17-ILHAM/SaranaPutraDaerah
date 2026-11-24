import * as XLSX from 'xlsx';
import { DEFAULT_PAYROLL_RATES } from '../config/constants';
import type { DivisionName, PayrollCycle, PayrollRecord } from '../types/payroll';
import { cleanRupiahToNumber, getTodayISO, normalizeDateISO } from './format';
import { calculateTHP, getSiklusDisplay } from './payrollCalc';

export type ImportSheetMode = 'payroll-rekap' | 'attendance-log';

export interface SolutionColumnMapping {
  idCol: string;
  namaCol: string;
  divisiCol: string;
  siklusCol: string;
  satuanCol: string;
  tanggalCol: string;
  jamMasukCol: string;
  jamPulangCol: string;
  hariKerjaCol: string;
  tripCol: string;
  upahPokokCol: string;
  upahHariCol: string;
  upahTripCol: string;
  lemburHariCol: string;
  upahLemburHariCol: string;
  lemburJamCol: string;
  upahLemburJamCol: string;
  inapCol: string;
  upahInapCol: string;
  kasbonCol: string;
  bpjsCol: string;
  namaBankCol: string;
  noRekeningCol: string;
  ketCol: string;
}

export interface ParsedExcelSheet {
  fileName: string;
  sheetName: string;
  availableSheets: string[];
  headers: string[];
  rows: Array<Record<string, unknown>>;
  suggestedMapping: SolutionColumnMapping;
  detectedMode: ImportSheetMode;
  minDate: string;
  maxDate: string;
}

export interface AttendancePreviewRow {
  fingerId: string;
  excelNama: string;
  matched: boolean;
  nik: string;
  nama: string;
  divisi: DivisionName;
  siklusGaji: PayrollCycle;
  isTrip: boolean;
  hadirDates: string[];
  hariFingerprint: number;
  hariKerjaInput: number;
  upahPerHari: number;
  tripInput: number;
  upahPerTrip: number;
  lemburHari: number;
  upahLemburHari: number;
  jamLembur: number;
  upahPerJam: number;
  inap: number;
  upahPerInap: number;
  kasbon: number;
  bpjs: number;
  namaBank: string;
  noRekening: string;
  keterangan: string;
  rateFromExcel: boolean;
  overtimeFromExcel: boolean;
  selected: boolean;
}

const ID_ALIASES = [
  'nik / id',
  'nik/id',
  'nik',
  'no / nik',
  'no/nik',
  'id',
  'no. id',
  'no id',
  'noid',
  'pin',
  'ac-no',
  'ac-no.',
  'ac no',
  'user id',
  'userid',
  'no. pegawai',
  'no pegawai',
  'id finger',
  'finger id',
  'badge',
  'no. akun',
  'emp no',
];

const NAMA_ALIASES = ['nama karyawan', 'nama', 'name', 'karyawan', 'pegawai', 'employee'];

const DIVISI_ALIASES = ['divisi', 'departemen', 'dept', 'bagian', 'skema', 'jabatan'];

const SIKLUS_ALIASES = ['siklus gaji', 'siklus', 'periode gaji', 'tipe gaji', 'sistem gaji'];

const SATUAN_ALIASES = ['satuan pokok', 'satuan', 'unit pokok', 'hitungan'];

const TANGGAL_ALIASES = [
  'tanggal',
  'tgl',
  'date',
  'date/time',
  'datetime',
  'waktu',
  'waktu scan',
  'tgl/waktu',
  'tanggal scan',
];

const JAM_MASUK_ALIASES = [
  'jam masuk',
  'scan masuk',
  'masuk',
  'clock in',
  'check in',
  'checkin',
  'scan 1',
  'jam 1',
  'c/in',
];

const JAM_PULANG_ALIASES = [
  'jam pulang',
  'scan pulang',
  'pulang',
  'clock out',
  'check out',
  'checkout',
  'scan 2',
  'jam 2',
  'c/out',
  'keluar',
];

const HARI_KERJA_ALIASES = [
  'hari kerja (hr)',
  'hari kerja',
  'jml hari',
  'jumlah hari',
  'hadir (hr)',
  'hadir',
  'hr',
  'hr/trip',
];

const TRIP_ALIASES = ['jumlah trip', 'jml trip', 'trip', 'total trip'];

const UPAH_HARI_ALIASES = [
  'upah per hari (rp)',
  'upah per hari',
  'upah/hari',
  'upah harian',
  'gaji harian',
  'tarif harian',
  'nominal gaji harian',
];

const UPAH_TRIP_ALIASES = [
  'upah per trip (rp)',
  'upah per trip',
  'upah/trip',
  'tarif trip',
  'gaji per trip',
];

const UPAH_POKOK_ALIASES = [
  'nominal upah pokok (rp)',
  'nominal upah pokok',
  'nominal gaji (rp)',
  'nominal gaji',
  'upah pokok (rp)',
  'upah pokok',
  'tarif pokok',
  'upah',
  'gaji pokok/unit',
];

const LEMBUR_HARI_ALIASES = [
  'lembur harian (hr)',
  'lembur harian (hari)',
  'lembur hari',
  'lembur harian',
  'jml lembur hari',
];

const UPAH_LEMBUR_HARI_ALIASES = [
  'upah lembur harian (rp)',
  'upah lembur harian',
  'upah lembur hari',
  'nominal lembur harian',
  'tarif lembur harian',
  'tarif lembur hari',
];

const LEMBUR_JAM_ALIASES = [
  'lembur jam (jam)',
  'lembur (jam)',
  'lembur jam',
  'jam lembur',
  'jml lembur jam',
  'overtime',
  'lembur',
];

const UPAH_LEMBUR_JAM_ALIASES = [
  'upah lembur jam (rp)',
  'upah lembur per jam (rp)',
  'upah lembur jam',
  'upah lembur per jam',
  'upah per jam',
  'upah/jam',
  'nominal lembur jam',
  'tarif lembur jam',
];

const INAP_ALIASES = ['lembur inap (inap)', 'lembur inap', 'jumlah inap', 'jml inap', 'inap', 'menginap'];

const UPAH_INAP_ALIASES = [
  'upah lembur inap (rp)',
  'upah inap (rp)',
  'upah lembur inap',
  'upah per inap',
  'upah inap',
  'upah/inap',
  'nominal inap',
  'tarif inap',
];

const KASBON_ALIASES = ['potongan kasbon (rp)', 'potongan kasbon', 'kasbon (rp)', 'kasbon', 'hutang'];

const BPJS_ALIASES = ['iuran bpjs (rp)', 'iuran bpjs', 'bpjs (rp)', 'bpjs'];

const BANK_ALIASES = ['nama bank', 'bank'];

const REKENING_ALIASES = [
  'no rekening',
  'no. rekening',
  'nomor rekening',
  'rekening',
  'no rek',
  'no. rek',
  'norek',
];

const KET_ALIASES = ['keterangan', 'ket', 'status', 'catatan', 'exception', 'note', 'remarks'];

const ABSENT_KEYWORDS = [
  'alpha',
  'alpa',
  'absen',
  'tidak hadir',
  'izin',
  'ijin',
  'sakit',
  'cuti',
  'off',
  'libur',
];

function normalizeHeader(h: unknown): string {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function findBestColumn(headers: string[], aliases: string[], exclude: string[] = []): string {
  const excluded = new Set(exclude.filter(Boolean));
  const candidates = headers.filter((h) => !excluded.has(h));

  for (const alias of aliases) {
    const exact = candidates.find((h) => normalizeHeader(h) === alias);
    if (exact) return exact;
  }
  for (const alias of aliases) {
    const partial = candidates.find((h) => normalizeHeader(h).includes(alias));
    if (partial) return partial;
  }
  return '';
}

function excelSerialToISO(serial: number): string {
  if (!Number.isFinite(serial) || serial < 20000 || serial > 90000) return '';
  const utcDays = Math.floor(serial - 25569);
  const utcMs = utcDays * 86400 * 1000;
  const d = new Date(utcMs);
  if (isNaN(d.getTime())) return '';
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function extractDateISOFromCell(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return '';
  if (typeof raw === 'number') {
    return excelSerialToISO(raw);
  }
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return normalizeDateISO(raw);
  }
  const s = String(raw).trim();
  if (!s) return '';

  const datePart = s.split(/\s+/)[0];
  const dmyMatch = datePart.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const mon = dmyMatch[2].padStart(2, '0');
    const yr = dmyMatch[3].length === 2 ? `20${dmyMatch[3]}` : dmyMatch[3];
    if (Number(mon) >= 1 && Number(mon) <= 12 && Number(day) >= 1 && Number(day) <= 31) {
      return `${yr}-${mon}-${day}`;
    }
  }

  const normalized = normalizeDateISO(s);
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  return '';
}

function hasClockScan(raw: unknown): boolean {
  if (raw === null || raw === undefined) return false;
  if (typeof raw === 'number') {
    return raw > 0;
  }
  const s = String(raw).trim();
  if (!s || s === '-' || s === '--' || s === '0' || s === '00:00' || s === '00:00:00') return false;
  return /\d/.test(s);
}

/**
 * Parses quantity values (e.g. Hari Kerja, Trip, Jam Lembur) preserving decimals like 1.5 or 1,5.
 */
function parseQtyCell(raw: unknown): number {
  if (raw === null || raw === undefined || raw === '') return 0;
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.max(0, raw) : 0;
  const cleaned = String(raw)
    .trim()
    .replace(/,/g, '.')
    .replace(/[^0-9.-]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/**
 * Parses Indonesian Rupiah currency cells (e.g. 125000, "125.000", "Rp 125.000", "125,000").
 */
function parseRupiahCell(raw: unknown): number {
  if (raw === null || raw === undefined || raw === '') return 0;
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0;
  const s = String(raw).trim();
  if (!s || s === '-') return 0;
  // Handle "125,000" (English thousands comma) vs "125.000" (Indonesian thousands dot)
  if (/^\d{1,3}(,\d{3})+$/.test(s.replace(/^rp\.?\s*/i, ''))) {
    return Math.max(0, parseInt(s.replace(/[^0-9]/g, ''), 10) || 0);
  }
  return Math.max(0, cleanRupiahToNumber(s));
}

function hasCellValue(raw: unknown): boolean {
  if (raw === null || raw === undefined) return false;
  if (typeof raw === 'number') return Number.isFinite(raw);
  const s = String(raw).trim();
  return s !== '' && s !== '-';
}

function parseDivisionCell(raw: unknown, fallback: DivisionName): DivisionName {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!s) return fallback;
  if (s.includes('spd')) return 'Supir SPD';
  if (s.includes('b3') || s.includes('supir')) return 'Supir B3';
  if (s.includes('limbah') || s.includes('karyawan') || s.includes('harian')) return 'Karyawan limbah';
  return fallback;
}

function parseSiklusCell(raw: unknown, fallback: PayrollCycle): PayrollCycle {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!s) return fallback;
  if (s.includes('bulan')) return 'Bulanan';
  if (s.includes('minggu')) return 'Mingguan';
  return fallback;
}

function parseSatuanIsTrip(raw: unknown, divisi: DivisionName, fallback: boolean): boolean {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (divisi === 'Supir B3') return true;
  if (divisi === 'Karyawan limbah') return false;
  if (s.includes('trip')) return true;
  if (s.includes('hari') || s === 'hr') return false;
  return fallback;
}

export function normalizeFingerKey(id: unknown): { exact: string; numeric: string } {
  const exact = String(id ?? '')
    .trim()
    .toUpperCase();
  const digits = exact.replace(/\D/g, '');
  const numeric = digits ? String(parseInt(digits, 10)) : '';
  return { exact, numeric };
}

function detectModeFromMapping(mapping: SolutionColumnMapping): ImportSheetMode {
  const hasPayrollCols = Boolean(
    mapping.hariKerjaCol ||
      mapping.tripCol ||
      mapping.upahPokokCol ||
      mapping.upahHariCol ||
      mapping.upahTripCol,
  );
  const hasDailyLogCols = Boolean(mapping.tanggalCol && (mapping.jamMasukCol || mapping.jamPulangCol));

  if (hasDailyLogCols) return 'attendance-log';
  if (hasPayrollCols && !mapping.tanggalCol) return 'payroll-rekap';
  if (mapping.tanggalCol) return 'attendance-log';
  return 'payroll-rekap';
}

export function pickDefaultSheetName(sheetNames: string[]): string {
  if (!sheetNames.length) return '';
  const nonGuide = sheetNames.filter((n) => !n.toLowerCase().includes('panduan'));
  const pool = nonGuide.length ? nonGuide : sheetNames;
  const preferred = pool.find(
    (n) =>
      n.toLowerCase().includes('import_gaji') ||
      n.toLowerCase().includes('rekap') ||
      n.toLowerCase().includes('gaji'),
  );
  return preferred || pool[0];
}

export async function parseSolutionAttendanceExcel(
  file: File,
  preferredSheetName?: string,
): Promise<ParsedExcelSheet> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
  const availableSheets = wb.SheetNames || [];
  if (!availableSheets.length) {
    throw new Error('File Excel tidak memiliki sheet yang dapat dibaca.');
  }

  const sheetName =
    preferredSheetName && availableSheets.includes(preferredSheetName)
      ? preferredSheetName
      : pickDefaultSheetName(availableSheets);

  const ws = wb.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!matrix.length) {
    throw new Error(`Sheet "${sheetName}" kosong.`);
  }

  // Detect header row within first 10 rows
  let headerRowIdx = 0;
  let bestScore = -1;
  const maxScan = Math.min(matrix.length, 10);

  for (let r = 0; r < maxScan; r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;
    const cells = row.map(normalizeHeader).filter(Boolean);
    if (cells.length < 2) continue;

    let score = 0;
    if (cells.some((c) => ID_ALIASES.some((a) => c === a || c.includes(a)))) score += 3;
    if (cells.some((c) => NAMA_ALIASES.some((a) => c === a || c.includes(a)))) score += 3;
    if (cells.some((c) => TANGGAL_ALIASES.some((a) => c === a || c.includes(a)))) score += 2;
    if (cells.some((c) => UPAH_POKOK_ALIASES.some((a) => c === a || c.includes(a)))) score += 3;
    if (cells.some((c) => HARI_KERJA_ALIASES.some((a) => c === a || c.includes(a)))) score += 2;
    if (cells.some((c) => JAM_MASUK_ALIASES.some((a) => c === a || c.includes(a)))) score += 2;
    if (cells.some((c) => LEMBUR_JAM_ALIASES.some((a) => c === a || c.includes(a)))) score += 2;

    if (score > bestScore) {
      bestScore = score;
      headerRowIdx = r;
    }
  }

  const rawHeaders = (matrix[headerRowIdx] || []) as unknown[];
  const usedHeaders = new Map<string, number>();
  const headers: string[] = rawHeaders.map((cell, idx) => {
    const base = String(cell ?? '').trim() || `Kolom_${idx + 1}`;
    const count = usedHeaders.get(base) || 0;
    usedHeaders.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });

  const rows: Array<Record<string, unknown>> = [];
  for (let r = headerRowIdx + 1; r < matrix.length; r++) {
    const arr = matrix[r];
    if (!Array.isArray(arr)) continue;
    const hasAnyVal = arr.some((v) => String(v ?? '').trim() !== '');
    if (!hasAnyVal) continue;
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      obj[h] = arr[idx] ?? '';
    });
    rows.push(obj);
  }

  const used: string[] = [];
  const pick = (aliases: string[]) => {
    const col = findBestColumn(headers, aliases, used);
    if (col) used.push(col);
    return col;
  };

  // Match specific multi-word columns BEFORE broad columns (e.g. "Upah Lembur Harian" before "Lembur Harian")
  const idCol = pick(ID_ALIASES);
  const namaCol = pick(NAMA_ALIASES);
  const divisiCol = pick(DIVISI_ALIASES);
  const siklusCol = pick(SIKLUS_ALIASES);
  const satuanCol = pick(SATUAN_ALIASES);
  const tanggalCol = pick(TANGGAL_ALIASES);
  const jamMasukCol = pick(JAM_MASUK_ALIASES);
  const jamPulangCol = pick(JAM_PULANG_ALIASES);
  const upahLemburHariCol = pick(UPAH_LEMBUR_HARI_ALIASES);
  const upahLemburJamCol = pick(UPAH_LEMBUR_JAM_ALIASES);
  const upahInapCol = pick(UPAH_INAP_ALIASES);
  const upahHariCol = pick(UPAH_HARI_ALIASES);
  const upahTripCol = pick(UPAH_TRIP_ALIASES);
  const upahPokokCol = pick(UPAH_POKOK_ALIASES);
  const lemburHariCol = pick(LEMBUR_HARI_ALIASES);
  const inapCol = pick(INAP_ALIASES);
  const lemburJamCol = pick(LEMBUR_JAM_ALIASES);
  const hariKerjaCol = pick(HARI_KERJA_ALIASES);
  const tripCol = pick(TRIP_ALIASES);
  const kasbonCol = pick(KASBON_ALIASES);
  const bpjsCol = pick(BPJS_ALIASES);
  const namaBankCol = pick(BANK_ALIASES);
  const noRekeningCol = pick(REKENING_ALIASES);
  const ketCol = pick(KET_ALIASES);

  const suggestedMapping: SolutionColumnMapping = {
    idCol,
    namaCol,
    divisiCol,
    siklusCol,
    satuanCol,
    tanggalCol,
    jamMasukCol,
    jamPulangCol,
    hariKerjaCol,
    tripCol,
    upahPokokCol,
    upahHariCol,
    upahTripCol,
    lemburHariCol,
    upahLemburHariCol,
    lemburJamCol,
    upahLemburJamCol,
    inapCol,
    upahInapCol,
    kasbonCol,
    bpjsCol,
    namaBankCol,
    noRekeningCol,
    ketCol,
  };

  const detectedMode = detectModeFromMapping(suggestedMapping);

  let minDate = '';
  let maxDate = '';
  if (tanggalCol) {
    rows.forEach((row) => {
      const iso = extractDateISOFromCell(row[tanggalCol]);
      if (!iso) return;
      if (!minDate || iso < minDate) minDate = iso;
      if (!maxDate || iso > maxDate) maxDate = iso;
    });
  }

  return {
    fileName: file.name,
    sheetName,
    availableSheets,
    headers,
    rows,
    suggestedMapping,
    detectedMode,
    minDate,
    maxDate,
  };
}

function buildEmployeeLookup(masterEmployees: PayrollRecord[]) {
  const empByExact = new Map<string, PayrollRecord>();
  const empByNumeric = new Map<string, PayrollRecord>();
  const empByName = new Map<string, PayrollRecord>();

  masterEmployees.forEach((emp) => {
    const key = normalizeFingerKey(emp.nik);
    if (key.exact && !empByExact.has(key.exact)) empByExact.set(key.exact, emp);
    if (key.numeric && !empByNumeric.has(key.numeric)) empByNumeric.set(key.numeric, emp);
    const nm = (emp.nama || '').toString().trim().toLowerCase();
    if (nm && !empByName.has(nm)) empByName.set(nm, emp);
  });

  return (rawId: string, rawNama: string): PayrollRecord | undefined => {
    const fKey = normalizeFingerKey(rawId);
    if (fKey.exact && empByExact.has(fKey.exact)) return empByExact.get(fKey.exact);
    if (fKey.numeric && empByNumeric.has(fKey.numeric)) return empByNumeric.get(fKey.numeric);
    const nm = rawNama.trim().toLowerCase();
    if (nm && empByName.has(nm)) return empByName.get(nm);
    return undefined;
  };
}

export function buildAttendancePreview(
  sheet: ParsedExcelSheet,
  mapping: SolutionColumnMapping,
  masterEmployees: PayrollRecord[],
  startISO: string,
  endISO: string,
): AttendancePreviewRow[] {
  const mode = detectModeFromMapping(mapping);
  const findEmployee = buildEmployeeLookup(masterEmployees);

  // Need at least ID or Nama column
  if (!mapping.idCol && !mapping.namaCol) return [];

  if (mode === 'payroll-rekap') {
    const result: AttendancePreviewRow[] = [];

    sheet.rows.forEach((row, idx) => {
      const rawId = mapping.idCol ? String(row[mapping.idCol] ?? '').trim() : '';
      const rawNama = mapping.namaCol ? String(row[mapping.namaCol] ?? '').trim() : '';
      if (!rawId && !rawNama) return;

      const matchedEmp = findEmployee(rawId, rawNama);
      const calc = matchedEmp ? calculateTHP(matchedEmp) : null;

      const baseDivisi: DivisionName = calc ? calc.skema : 'Karyawan limbah';
      const divisi = mapping.divisiCol
        ? parseDivisionCell(row[mapping.divisiCol], baseDivisi)
        : baseDivisi;
      const baseSiklus: PayrollCycle = matchedEmp ? getSiklusDisplay(matchedEmp) : 'Mingguan';
      const siklusGaji = mapping.siklusCol
        ? parseSiklusCell(row[mapping.siklusCol], baseSiklus)
        : baseSiklus;

      const tripQtyExcel = mapping.tripCol ? parseQtyCell(row[mapping.tripCol]) : 0;
      const hrQtyExcel = mapping.hariKerjaCol ? parseQtyCell(row[mapping.hariKerjaCol]) : 0;

      const baseIsTrip = calc
        ? calc.isTrip
        : divisi === 'Supir B3' || (divisi === 'Supir SPD' && tripQtyExcel > 0 && hrQtyExcel === 0);
      let isTrip = mapping.satuanCol
        ? parseSatuanIsTrip(row[mapping.satuanCol], divisi, baseIsTrip)
        : divisi === 'Supir B3'
          ? true
          : divisi === 'Karyawan limbah'
            ? false
            : tripQtyExcel > 0 && hrQtyExcel === 0
              ? true
              : baseIsTrip;
      if (divisi === 'Supir B3') isTrip = true;
      if (divisi === 'Karyawan limbah') isTrip = false;

      // Nominal Upah Pokok (per employee!)
      const excelUpahPokok = mapping.upahPokokCol ? parseRupiahCell(row[mapping.upahPokokCol]) : 0;
      const excelUpahHari = mapping.upahHariCol ? parseRupiahCell(row[mapping.upahHariCol]) : 0;
      const excelUpahTrip = mapping.upahTripCol ? parseRupiahCell(row[mapping.upahTripCol]) : 0;

      const masterUpahHari =
        (calc && !calc.isTrip && calc.tarifPokok > 0 ? calc.tarifPokok : 0) ||
        cleanRupiahToNumber(matchedEmp?.upahPerHari) ||
        DEFAULT_PAYROLL_RATES.upahPerHari;
      const masterUpahTrip =
        (calc && calc.isTrip && calc.tarifPokok > 0 ? calc.tarifPokok : 0) ||
        cleanRupiahToNumber(matchedEmp?.upahPerTrip) ||
        DEFAULT_PAYROLL_RATES.upahPerTrip;

      const upahPerHari =
        excelUpahHari > 0
          ? excelUpahHari
          : !isTrip && excelUpahPokok > 0
            ? excelUpahPokok
            : masterUpahHari;
      const upahPerTrip =
        excelUpahTrip > 0
          ? excelUpahTrip
          : isTrip && excelUpahPokok > 0
            ? excelUpahPokok
            : masterUpahTrip;

      // Overtime quantities & per-employee rates!
      const lemburHari = mapping.lemburHariCol ? parseQtyCell(row[mapping.lemburHariCol]) : 0;
      const excelUpahLemburHari = mapping.upahLemburHariCol
        ? parseRupiahCell(row[mapping.upahLemburHariCol])
        : 0;
      const upahLemburHari =
        excelUpahLemburHari > 0
          ? excelUpahLemburHari
          : calc?.upahLemburHari ||
            cleanRupiahToNumber(matchedEmp?.upahLemburHari) ||
            DEFAULT_PAYROLL_RATES.upahLemburHari;

      const jamLembur = mapping.lemburJamCol ? parseQtyCell(row[mapping.lemburJamCol]) : 0;
      const excelUpahLemburJam = mapping.upahLemburJamCol
        ? parseRupiahCell(row[mapping.upahLemburJamCol])
        : 0;
      const upahPerJam =
        excelUpahLemburJam > 0
          ? excelUpahLemburJam
          : calc?.upahPerJam ||
            cleanRupiahToNumber(matchedEmp?.upahPerJam) ||
            DEFAULT_PAYROLL_RATES.upahPerJam;

      const inap = mapping.inapCol ? parseQtyCell(row[mapping.inapCol]) : 0;
      const excelUpahInap = mapping.upahInapCol ? parseRupiahCell(row[mapping.upahInapCol]) : 0;
      const upahPerInap =
        excelUpahInap > 0
          ? excelUpahInap
          : calc?.upahPerInap ||
            cleanRupiahToNumber(matchedEmp?.upahPerInap) ||
            DEFAULT_PAYROLL_RATES.upahPerInap;

      const kasbon = mapping.kasbonCol ? parseRupiahCell(row[mapping.kasbonCol]) : 0;
      const hasExcelBpjs = mapping.bpjsCol && hasCellValue(row[mapping.bpjsCol]);
      const bpjs = hasExcelBpjs ? parseRupiahCell(row[mapping.bpjsCol]) : calc?.bpjs || 0;
      const excelBank = mapping.namaBankCol ? String(row[mapping.namaBankCol] ?? '').trim() : '';
      const excelRek = mapping.noRekeningCol
        ? String(row[mapping.noRekeningCol] ?? '').trim()
        : '';
      const namaBank = excelBank || matchedEmp?.namaBank || '';
      const noRekening = excelRek || matchedEmp?.noRekening || '';
      const keterangan = mapping.ketCol ? String(row[mapping.ketCol] ?? '').trim() : '';

      const rateFromExcel = Boolean(
        excelUpahPokok > 0 ||
          excelUpahHari > 0 ||
          excelUpahTrip > 0 ||
          excelUpahLemburHari > 0 ||
          excelUpahLemburJam > 0 ||
          excelUpahInap > 0,
      );
      const overtimeFromExcel = Boolean(lemburHari > 0 || jamLembur > 0 || inap > 0);

      result.push({
        fingerId: rawId || String(idx + 1),
        excelNama: rawNama,
        matched: Boolean(matchedEmp),
        nik: (matchedEmp?.nik || rawId || String(idx + 1)).toUpperCase(),
        nama: rawNama || matchedEmp?.nama || `ID ${rawId || idx + 1}`,
        divisi,
        siklusGaji,
        isTrip,
        hadirDates: [],
        hariFingerprint: isTrip ? tripQtyExcel : hrQtyExcel,
        hariKerjaInput: isTrip ? 0 : hrQtyExcel,
        upahPerHari,
        tripInput: isTrip ? tripQtyExcel : 0,
        upahPerTrip,
        lemburHari,
        upahLemburHari,
        jamLembur,
        upahPerJam,
        inap,
        upahPerInap,
        kasbon,
        bpjs,
        namaBank,
        noRekening,
        keterangan,
        rateFromExcel,
        overtimeFromExcel,
        selected: true,
      });
    });

    return result;
  }

  // Mode: attendance-log (daily Solution X606-S rows, optionally carrying per-employee rates & overtime)
  if (!mapping.idCol || !mapping.tanggalCol) return [];

  const grouped = new Map<
    string,
    {
      fingerId: string;
      excelNama: string;
      divisiRaw: string;
      siklusRaw: string;
      satuanRaw: string;
      dates: Set<string>;
      tripSum: number;
      upahPokok: number;
      upahHari: number;
      upahTrip: number;
      lemburHariSum: number;
      upahLemburHari: number;
      lemburJamSum: number;
      upahPerJam: number;
      inapSum: number;
      upahPerInap: number;
      kasbonMax: number;
      bpjsMax: number;
      hasBpjs: boolean;
      namaBank: string;
      noRekening: string;
      keterangan: string;
    }
  >();

  sheet.rows.forEach((row) => {
    const rawId = String(row[mapping.idCol] ?? '').trim();
    if (!rawId) return;

    const dateISO = extractDateISOFromCell(row[mapping.tanggalCol]);
    if (!dateISO) return;
    if (startISO && dateISO < startISO) return;
    if (endISO && dateISO > endISO) return;

    const rawNama = mapping.namaCol ? String(row[mapping.namaCol] ?? '').trim() : '';
    const ketStr = mapping.ketCol ? String(row[mapping.ketCol] ?? '').trim() : '';
    const ketLower = ketStr.toLowerCase();

    const hasScanIn = mapping.jamMasukCol ? hasClockScan(row[mapping.jamMasukCol]) : false;
    const hasScanOut = mapping.jamPulangCol ? hasClockScan(row[mapping.jamPulangCol]) : false;
    const hasCombinedTime =
      !mapping.jamMasukCol &&
      !mapping.jamPulangCol &&
      /\d{1,2}:\d{2}/.test(String(row[mapping.tanggalCol] ?? ''));
    const isExplicitAbsent = ABSENT_KEYWORDS.some((kw) => ketLower.includes(kw));

    let present = false;
    if (mapping.jamMasukCol || mapping.jamPulangCol) {
      present = hasScanIn || hasScanOut;
    } else if (hasCombinedTime) {
      present = !isExplicitAbsent;
    } else {
      present = !isExplicitAbsent;
    }

    const key = rawId.toUpperCase();
    if (!grouped.has(key)) {
      grouped.set(key, {
        fingerId: rawId,
        excelNama: rawNama,
        divisiRaw: '',
        siklusRaw: '',
        satuanRaw: '',
        dates: new Set<string>(),
        tripSum: 0,
        upahPokok: 0,
        upahHari: 0,
        upahTrip: 0,
        lemburHariSum: 0,
        upahLemburHari: 0,
        lemburJamSum: 0,
        upahPerJam: 0,
        inapSum: 0,
        upahPerInap: 0,
        kasbonMax: 0,
        bpjsMax: 0,
        hasBpjs: false,
        namaBank: '',
        noRekening: '',
        keterangan: '',
      });
    }
    const entry = grouped.get(key)!;
    if (!entry.excelNama && rawNama) entry.excelNama = rawNama;
    if (!entry.divisiRaw && mapping.divisiCol) {
      entry.divisiRaw = String(row[mapping.divisiCol] ?? '').trim();
    }
    if (!entry.siklusRaw && mapping.siklusCol) {
      entry.siklusRaw = String(row[mapping.siklusCol] ?? '').trim();
    }
    if (!entry.satuanRaw && mapping.satuanCol) {
      entry.satuanRaw = String(row[mapping.satuanCol] ?? '').trim();
    }
    if (present) entry.dates.add(dateISO);

    if (mapping.tripCol) entry.tripSum += parseQtyCell(row[mapping.tripCol]);
    if (mapping.upahPokokCol) {
      const v = parseRupiahCell(row[mapping.upahPokokCol]);
      if (v > 0) entry.upahPokok = v;
    }
    if (mapping.upahHariCol) {
      const v = parseRupiahCell(row[mapping.upahHariCol]);
      if (v > 0) entry.upahHari = v;
    }
    if (mapping.upahTripCol) {
      const v = parseRupiahCell(row[mapping.upahTripCol]);
      if (v > 0) entry.upahTrip = v;
    }
    if (mapping.lemburHariCol) entry.lemburHariSum += parseQtyCell(row[mapping.lemburHariCol]);
    if (mapping.upahLemburHariCol) {
      const v = parseRupiahCell(row[mapping.upahLemburHariCol]);
      if (v > 0) entry.upahLemburHari = v;
    }
    if (mapping.lemburJamCol) entry.lemburJamSum += parseQtyCell(row[mapping.lemburJamCol]);
    if (mapping.upahLemburJamCol) {
      const v = parseRupiahCell(row[mapping.upahLemburJamCol]);
      if (v > 0) entry.upahPerJam = v;
    }
    if (mapping.inapCol) entry.inapSum += parseQtyCell(row[mapping.inapCol]);
    if (mapping.upahInapCol) {
      const v = parseRupiahCell(row[mapping.upahInapCol]);
      if (v > 0) entry.upahPerInap = v;
    }
    if (mapping.kasbonCol) {
      const v = parseRupiahCell(row[mapping.kasbonCol]);
      if (v > entry.kasbonMax) entry.kasbonMax = v;
    }
    if (mapping.bpjsCol && hasCellValue(row[mapping.bpjsCol])) {
      entry.hasBpjs = true;
      const v = parseRupiahCell(row[mapping.bpjsCol]);
      if (v > entry.bpjsMax) entry.bpjsMax = v;
    }
    if (!entry.namaBank && mapping.namaBankCol) {
      entry.namaBank = String(row[mapping.namaBankCol] ?? '').trim();
    }
    if (!entry.noRekening && mapping.noRekeningCol) {
      entry.noRekening = String(row[mapping.noRekeningCol] ?? '').trim();
    }
    if (ketStr && !isExplicitAbsent && ketLower !== 'hadir' && !entry.keterangan) {
      entry.keterangan = ketStr;
    }
  });

  const result: AttendancePreviewRow[] = [];

  grouped.forEach((entry) => {
    const matchedEmp = findEmployee(entry.fingerId, entry.excelNama);
    const calc = matchedEmp ? calculateTHP(matchedEmp) : null;
    const sortedDates = Array.from(entry.dates).sort();
    const hariFingerprint = sortedDates.length;

    const baseDivisi: DivisionName = calc ? calc.skema : 'Karyawan limbah';
    const divisi = entry.divisiRaw ? parseDivisionCell(entry.divisiRaw, baseDivisi) : baseDivisi;
    const baseSiklus: PayrollCycle = matchedEmp ? getSiklusDisplay(matchedEmp) : 'Mingguan';
    const siklusGaji = entry.siklusRaw ? parseSiklusCell(entry.siklusRaw, baseSiklus) : baseSiklus;

    const baseIsTrip = calc ? calc.isTrip : divisi === 'Supir B3';
    const isTrip = entry.satuanRaw
      ? parseSatuanIsTrip(entry.satuanRaw, divisi, baseIsTrip)
      : divisi === 'Supir B3'
        ? true
        : divisi === 'Karyawan limbah'
          ? false
          : baseIsTrip;

    const masterUpahHari =
      (calc && !calc.isTrip && calc.tarifPokok > 0 ? calc.tarifPokok : 0) ||
      cleanRupiahToNumber(matchedEmp?.upahPerHari) ||
      DEFAULT_PAYROLL_RATES.upahPerHari;
    const masterUpahTrip =
      (calc && calc.isTrip && calc.tarifPokok > 0 ? calc.tarifPokok : 0) ||
      cleanRupiahToNumber(matchedEmp?.upahPerTrip) ||
      DEFAULT_PAYROLL_RATES.upahPerTrip;

    const upahPerHari =
      entry.upahHari > 0
        ? entry.upahHari
        : !isTrip && entry.upahPokok > 0
          ? entry.upahPokok
          : masterUpahHari;
    const upahPerTrip =
      entry.upahTrip > 0
        ? entry.upahTrip
        : isTrip && entry.upahPokok > 0
          ? entry.upahPokok
          : masterUpahTrip;

    const upahLemburHari =
      entry.upahLemburHari > 0
        ? entry.upahLemburHari
        : calc?.upahLemburHari ||
          cleanRupiahToNumber(matchedEmp?.upahLemburHari) ||
          DEFAULT_PAYROLL_RATES.upahLemburHari;
    const upahPerJam =
      entry.upahPerJam > 0
        ? entry.upahPerJam
        : calc?.upahPerJam ||
          cleanRupiahToNumber(matchedEmp?.upahPerJam) ||
          DEFAULT_PAYROLL_RATES.upahPerJam;
    const upahPerInap =
      entry.upahPerInap > 0
        ? entry.upahPerInap
        : calc?.upahPerInap ||
          cleanRupiahToNumber(matchedEmp?.upahPerInap) ||
          DEFAULT_PAYROLL_RATES.upahPerInap;

    const rateFromExcel = Boolean(
      entry.upahPokok > 0 ||
        entry.upahHari > 0 ||
        entry.upahTrip > 0 ||
        entry.upahLemburHari > 0 ||
        entry.upahPerJam > 0 ||
        entry.upahPerInap > 0,
    );
    const overtimeFromExcel = Boolean(
      entry.lemburHariSum > 0 || entry.lemburJamSum > 0 || entry.inapSum > 0,
    );

    result.push({
      fingerId: entry.fingerId,
      excelNama: entry.excelNama,
      matched: Boolean(matchedEmp),
      nik: (matchedEmp?.nik || entry.fingerId).toUpperCase(),
      nama: matchedEmp?.nama || entry.excelNama || `ID ${entry.fingerId}`,
      divisi,
      siklusGaji,
      isTrip,
      hadirDates: sortedDates,
      hariFingerprint,
      hariKerjaInput: isTrip ? 0 : hariFingerprint,
      upahPerHari,
      tripInput: isTrip ? entry.tripSum : 0,
      upahPerTrip,
      lemburHari: entry.lemburHariSum,
      upahLemburHari,
      jamLembur: entry.lemburJamSum,
      upahPerJam,
      inap: entry.inapSum,
      upahPerInap,
      kasbon: entry.kasbonMax,
      bpjs: entry.hasBpjs ? entry.bpjsMax : calc?.bpjs || 0,
      namaBank: entry.namaBank || matchedEmp?.namaBank || '',
      noRekening: entry.noRekening || matchedEmp?.noRekening || '',
      keterangan: entry.keterangan,
      rateFromExcel,
      overtimeFromExcel,
      selected: (Boolean(matchedEmp) || rateFromExcel) && (hariFingerprint > 0 || entry.tripSum > 0),
    });
  });

  return result.sort((a, b) => {
    if (a.matched !== b.matched) return a.matched ? -1 : 1;
    if (a.isTrip !== b.isTrip) return a.isTrip ? 1 : -1;
    return a.nik.localeCompare(b.nik, 'id', { numeric: true });
  });
}

/**
 * Generates an Excel workbook with:
 * - Sheet 1 (Import_Gaji_Karyawan): Pre-filled per-employee salary & overtime nominal template
 * - Sheet 2 (Absensi_X606S): Daily fingerprint attendance log + optional nominal columns
 * - Sheet 3 (Panduan_Import): Column guide in Bahasa Indonesia
 */
export function downloadSolutionTemplateExcel(masterEmployees: PayrollRecord[]): string {
  const today = new Date();
  const baseDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5);
  const sampleDates: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + i);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    sampleDates.push(`${dd}/${mm}/${yyyy}`);
  }

  const rekapRows =
    masterEmployees.length > 0
      ? masterEmployees.map((emp) => {
          const c = calculateTHP(emp);
          const siklus = getSiklusDisplay(emp);
          const upahPokok =
            c.tarifPokok > 0
              ? c.tarifPokok
              : c.isTrip
                ? DEFAULT_PAYROLL_RATES.upahPerTrip
                : DEFAULT_PAYROLL_RATES.upahPerHari;
          return {
            'NIK / ID': emp.nik || '',
            'Nama Karyawan': emp.nama || '',
            Divisi: c.skema,
            'Siklus Gaji': siklus,
            'Satuan Pokok': c.isTrip ? 'Trip' : 'HR',
            'Hari Kerja (HR)': c.isTrip ? 0 : c.unitPokok || DEFAULT_PAYROLL_RATES.hariKerja,
            'Jumlah Trip': c.isTrip ? c.unitPokok || 0 : 0,
            'Nominal Upah Pokok (Rp)': upahPokok,
            'Lembur Harian (HR)': c.lemburHari || 0,
            'Upah Lembur Harian (Rp)': c.upahLemburHari || DEFAULT_PAYROLL_RATES.upahLemburHari,
            'Lembur Jam (Jam)': c.totalJam || 0,
            'Upah Lembur Jam (Rp)': c.upahPerJam || DEFAULT_PAYROLL_RATES.upahPerJam,
            'Lembur Inap (Inap)': c.inap || 0,
            'Upah Lembur Inap (Rp)': c.upahPerInap || DEFAULT_PAYROLL_RATES.upahPerInap,
            'Potongan Kasbon (Rp)': c.kasbon || 0,
            'Iuran BPJS (Rp)': c.bpjs || 0,
            Bank: emp.namaBank || '',
            'No Rekening': emp.noRekening || '',
            Keterangan: emp.keterangan && emp.keterangan !== '-' ? emp.keterangan : '',
          };
        })
      : [
          {
            'NIK / ID': '001',
            'Nama Karyawan': 'Siti Rahma',
            Divisi: 'Karyawan limbah',
            'Siklus Gaji': 'Mingguan',
            'Satuan Pokok': 'HR',
            'Hari Kerja (HR)': 6,
            'Jumlah Trip': 0,
            'Nominal Upah Pokok (Rp)': 110000,
            'Lembur Harian (HR)': 0,
            'Upah Lembur Harian (Rp)': 110000,
            'Lembur Jam (Jam)': 6,
            'Upah Lembur Jam (Rp)': 18000,
            'Lembur Inap (Inap)': 0,
            'Upah Lembur Inap (Rp)': 50000,
            'Potongan Kasbon (Rp)': 100000,
            'Iuran BPJS (Rp)': 0,
            Bank: 'BRI',
            'No Rekening': '0123456789012',
            Keterangan: 'Ke 1',
          },
          {
            'NIK / ID': '002',
            'Nama Karyawan': 'Budi Santoso',
            Divisi: 'Karyawan limbah',
            'Siklus Gaji': 'Mingguan',
            'Satuan Pokok': 'HR',
            'Hari Kerja (HR)': 6,
            'Jumlah Trip': 0,
            'Nominal Upah Pokok (Rp)': 125000,
            'Lembur Harian (HR)': 1,
            'Upah Lembur Harian (Rp)': 125000,
            'Lembur Jam (Jam)': 4,
            'Upah Lembur Jam (Rp)': 20000,
            'Lembur Inap (Inap)': 0,
            'Upah Lembur Inap (Rp)': 50000,
            'Potongan Kasbon (Rp)': 0,
            'Iuran BPJS (Rp)': 25000,
            Bank: 'BCA',
            'No Rekening': '8765432109',
            Keterangan: '',
          },
          {
            'NIK / ID': '003',
            'Nama Karyawan': 'Dedi Kurniawan',
            Divisi: 'Supir B3',
            'Siklus Gaji': 'Mingguan',
            'Satuan Pokok': 'Trip',
            'Hari Kerja (HR)': 0,
            'Jumlah Trip': 4,
            'Nominal Upah Pokok (Rp)': 275000,
            'Lembur Harian (HR)': 0,
            'Upah Lembur Harian (Rp)': 100000,
            'Lembur Jam (Jam)': 0,
            'Upah Lembur Jam (Rp)': 15000,
            'Lembur Inap (Inap)': 2,
            'Upah Lembur Inap (Rp)': 60000,
            'Potongan Kasbon (Rp)': 150000,
            'Iuran BPJS (Rp)': 0,
            Bank: 'Mandiri',
            'No Rekening': '1440012345678',
            Keterangan: 'Ke 2',
          },
        ];

  const sampleLogEmps = rekapRows.slice(0, 4);
  const attendanceRows: Array<Record<string, string | number>> = [];
  sampleLogEmps.forEach((emp, empIdx) => {
    sampleDates.forEach((tgl, dayIdx) => {
      const isAbsent = empIdx === 1 && dayIdx === 4;
      attendanceRows.push({
        ID: emp['NIK / ID'],
        Nama: emp['Nama Karyawan'],
        Departemen: emp.Divisi,
        Tanggal: tgl,
        'Jam Masuk': isAbsent
          ? ''
          : `07:${String(48 + ((empIdx * 3 + dayIdx) % 10)).padStart(2, '0')}`,
        'Jam Pulang': isAbsent
          ? ''
          : `17:${String(2 + ((empIdx * 2 + dayIdx) % 12)).padStart(2, '0')}`,
        'Nominal Upah Pokok (Rp)': emp['Nominal Upah Pokok (Rp)'],
        'Lembur Harian (HR)': dayIdx === 0 ? emp['Lembur Harian (HR)'] : 0,
        'Upah Lembur Harian (Rp)': emp['Upah Lembur Harian (Rp)'],
        'Lembur Jam (Jam)': !isAbsent && dayIdx === 0 ? emp['Lembur Jam (Jam)'] : 0,
        'Upah Lembur Jam (Rp)': emp['Upah Lembur Jam (Rp)'],
        'Lembur Inap (Inap)': dayIdx === 0 ? emp['Lembur Inap (Inap)'] : 0,
        'Upah Lembur Inap (Rp)': emp['Upah Lembur Inap (Rp)'],
        'Potongan Kasbon (Rp)': dayIdx === 0 ? emp['Potongan Kasbon (Rp)'] : 0,
        'Iuran BPJS (Rp)': dayIdx === 0 ? emp['Iuran BPJS (Rp)'] : 0,
        Keterangan: isAbsent ? 'Alpha' : 'Hadir',
      });
    });
  });

  const guideRows = [
    {
      Kolom: 'Sheet 1: Import_Gaji_Karyawan',
      'Contoh Isi': '1 baris = 1 karyawan',
      Penjelasan:
        'Paling cepat untuk import gaji massal. Ubah Nominal Upah Pokok (Rp) & Upah Lemburan masing-masing karyawan sesuai tarifnya, lalu unggah kembali.',
    },
    {
      Kolom: 'NIK / ID & Nama Karyawan',
      'Contoh Isi': '001 / Siti Rahma',
      Penjelasan:
        'Dicocokkan otomatis dengan data master karyawan (angka 1 otomatis cocok dengan 001). Karyawan baru juga otomatis dibuatkan profilnya saat import.',
    },
    {
      Kolom: 'Nominal Upah Pokok (Rp)',
      'Contoh Isi': '110000 / 125000 / 275000',
      Penjelasan:
        'Nominal gaji per Hari (HR) atau per Trip untuk masing-masing karyawan. Saat di-import, nominal ini langsung memperbarui tarif karyawan & perhitungan gaji.',
    },
    {
      Kolom: 'Lembur Harian / Jam / Inap & Upahnya',
      'Contoh Isi': 'Qty + Upah (Rp) per karyawan',
      Penjelasan:
        'Isi jumlah lembur (HR / Jam / Inap) beserta tarif lembur masing-masing karyawan. Kosongkan atau isi 0 bila tidak ada lembur jenis tersebut.',
    },
    {
      Kolom: 'Sheet 2: Absensi_X606S',
      'Contoh Isi': 'Log harian Solution X606-S',
      Penjelasan:
        'Tetap mendukung file ekspor mesin fingerprint harian. Anda juga bisa menambahkan kolom Nominal Upah Pokok & Upah Lemburan agar langsung terbaca.',
    },
  ];

  const wb = XLSX.utils.book_new();

  const wsRekap = XLSX.utils.json_to_sheet(rekapRows);
  wsRekap['!cols'] = [
    { wch: 12 },
    { wch: 24 },
    { wch: 18 },
    { wch: 13 },
    { wch: 13 },
    { wch: 15 },
    { wch: 13 },
    { wch: 23 },
    { wch: 18 },
    { wch: 23 },
    { wch: 17 },
    { wch: 21 },
    { wch: 18 },
    { wch: 21 },
    { wch: 20 },
    { wch: 16 },
    { wch: 13 },
    { wch: 20 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsRekap, 'Import_Gaji_Karyawan');

  const wsLog = XLSX.utils.json_to_sheet(attendanceRows);
  wsLog['!cols'] = [
    { wch: 10 },
    { wch: 22 },
    { wch: 18 },
    { wch: 13 },
    { wch: 11 },
    { wch: 11 },
    { wch: 22 },
    { wch: 17 },
    { wch: 22 },
    { wch: 16 },
    { wch: 20 },
    { wch: 17 },
    { wch: 20 },
    { wch: 19 },
    { wch: 15 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsLog, 'Absensi_X606S');

  const wsGuide = XLSX.utils.json_to_sheet(guideRows);
  wsGuide['!cols'] = [{ wch: 30 }, { wch: 26 }, { wch: 76 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Panduan_Import');

  const filename = `Template_Import_Gaji_Karyawan_SPD_${getTodayISO()}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}
