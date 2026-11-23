import * as XLSX from 'xlsx';
import { DEFAULT_PAYROLL_RATES } from '../config/constants';
import type { DivisionName, PayrollRecord } from '../types/payroll';
import { getTodayISO, normalizeDateISO } from './format';
import { calculateTHP } from './payrollCalc';

export interface SolutionColumnMapping {
  idCol: string;
  namaCol: string;
  tanggalCol: string;
  jamMasukCol: string;
  jamPulangCol: string;
  ketCol: string;
}

export interface ParsedExcelSheet {
  fileName: string;
  sheetName: string;
  headers: string[];
  rows: Array<Record<string, unknown>>;
  suggestedMapping: SolutionColumnMapping;
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
  isTrip: boolean;
  hadirDates: string[];
  hariFingerprint: number;
  hariKerjaInput: number;
  upahPerHari: number;
  tripInput: number;
  upahPerTrip: number;
  jamLembur: number;
  inap: number;
  kasbon: number;
  bpjs: number;
  keterangan: string;
  selected: boolean;
}

const ID_ALIASES = [
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
  'nik',
  'no. pegawai',
  'no pegawai',
  'id finger',
  'finger id',
  'badge',
  'no. akun',
  'emp no',
];

const NAMA_ALIASES = ['nama', 'name', 'nama karyawan', 'karyawan', 'pegawai', 'employee'];

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
  'in',
  'scan 1',
  'jam 1',
  'jam',
  'time',
  'c/in',
];

const JAM_PULANG_ALIASES = [
  'jam pulang',
  'scan pulang',
  'pulang',
  'clock out',
  'check out',
  'checkout',
  'out',
  'scan 2',
  'jam 2',
  'c/out',
  'keluar',
];

const KET_ALIASES = ['keterangan', 'ket', 'status', 'catatan', 'exception', 'note', 'remarks'];

const ABSENT_KEYWORDS = ['alpha', 'alpa', 'absen', 'tidak hadir', 'izin', 'ijin', 'sakit', 'cuti', 'off', 'libur'];

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

  // Handle "02/11/2026 07:55:12" or "2026-11-02 07:55:12"
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
    // Excel time fraction (0..1) or datetime serial
    return raw > 0;
  }
  const s = String(raw).trim();
  if (!s || s === '-' || s === '--' || s === '0' || s === '00:00' || s === '00:00:00') return false;
  return /\d/.test(s);
}

export function normalizeFingerKey(id: unknown): { exact: string; numeric: string } {
  const exact = String(id ?? '')
    .trim()
    .toUpperCase();
  const digits = exact.replace(/\D/g, '');
  const numeric = digits ? String(parseInt(digits, 10)) : '';
  return { exact, numeric };
}

export async function parseSolutionAttendanceExcel(file: File): Promise<ParsedExcelSheet> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    throw new Error('File Excel tidak memiliki sheet yang dapat dibaca.');
  }

  const ws = wb.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!matrix.length) {
    throw new Error('File Excel kosong.');
  }

  // Detect header row within first 10 rows (Solution X606-S exports often include a title banner)
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
    if (cells.some((c) => TANGGAL_ALIASES.some((a) => c === a || c.includes(a)))) score += 3;
    if (cells.some((c) => NAMA_ALIASES.some((a) => c === a || c.includes(a)))) score += 2;
    if (cells.some((c) => JAM_MASUK_ALIASES.some((a) => c === a || c.includes(a)))) score += 2;
    if (cells.some((c) => JAM_PULANG_ALIASES.some((a) => c === a || c.includes(a)))) score += 1;

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

  const idCol = findBestColumn(headers, ID_ALIASES);
  const namaCol = findBestColumn(headers, NAMA_ALIASES, [idCol]);
  const tanggalCol = findBestColumn(headers, TANGGAL_ALIASES, [idCol, namaCol]);
  const jamMasukCol = findBestColumn(headers, JAM_MASUK_ALIASES, [idCol, namaCol, tanggalCol]);
  const jamPulangCol = findBestColumn(headers, JAM_PULANG_ALIASES, [
    idCol,
    namaCol,
    tanggalCol,
    jamMasukCol,
  ]);
  const ketCol = findBestColumn(headers, KET_ALIASES, [
    idCol,
    namaCol,
    tanggalCol,
    jamMasukCol,
    jamPulangCol,
  ]);

  const suggestedMapping: SolutionColumnMapping = {
    idCol,
    namaCol,
    tanggalCol,
    jamMasukCol,
    jamPulangCol,
    ketCol,
  };

  // Detect date range inside file
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
    headers,
    rows,
    suggestedMapping,
    minDate,
    maxDate,
  };
}

export function buildAttendancePreview(
  sheet: ParsedExcelSheet,
  mapping: SolutionColumnMapping,
  masterEmployees: PayrollRecord[],
  startISO: string,
  endISO: string,
): AttendancePreviewRow[] {
  if (!mapping.idCol || !mapping.tanggalCol) return [];

  // Build fast lookup for master employees by exact NIK and numeric NIK (e.g. "003" <-> "3")
  const empByExact = new Map<string, PayrollRecord>();
  const empByNumeric = new Map<string, PayrollRecord>();

  masterEmployees.forEach((emp) => {
    const key = normalizeFingerKey(emp.nik);
    if (key.exact && !empByExact.has(key.exact)) empByExact.set(key.exact, emp);
    if (key.numeric && !empByNumeric.has(key.numeric)) empByNumeric.set(key.numeric, emp);
  });

  const grouped = new Map<
    string,
    {
      fingerId: string;
      excelNama: string;
      dates: Set<string>;
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
    const ketStr = mapping.ketCol ? String(row[mapping.ketCol] ?? '').trim().toLowerCase() : '';

    // Determine whether this row represents an actual attendance scan
    const hasScanIn = mapping.jamMasukCol ? hasClockScan(row[mapping.jamMasukCol]) : false;
    const hasScanOut = mapping.jamPulangCol ? hasClockScan(row[mapping.jamPulangCol]) : false;
    const hasCombinedTime =
      !mapping.jamMasukCol &&
      !mapping.jamPulangCol &&
      /\d{1,2}:\d{2}/.test(String(row[mapping.tanggalCol] ?? ''));

    const isExplicitAbsent = ABSENT_KEYWORDS.some((kw) => ketStr.includes(kw));

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
        dates: new Set<string>(),
      });
    }
    const entry = grouped.get(key)!;
    if (!entry.excelNama && rawNama) entry.excelNama = rawNama;
    if (present) entry.dates.add(dateISO);
  });

  const result: AttendancePreviewRow[] = [];

  grouped.forEach((entry) => {
    const fKey = normalizeFingerKey(entry.fingerId);
    const matchedEmp =
      (fKey.exact ? empByExact.get(fKey.exact) : undefined) ||
      (fKey.numeric ? empByNumeric.get(fKey.numeric) : undefined);

    const sortedDates = Array.from(entry.dates).sort();
    const hariFingerprint = sortedDates.length;

    if (matchedEmp) {
      const calc = calculateTHP(matchedEmp);
      result.push({
        fingerId: entry.fingerId,
        excelNama: entry.excelNama,
        matched: true,
        nik: matchedEmp.nik,
        nama: matchedEmp.nama,
        divisi: calc.skema,
        isTrip: calc.isTrip,
        hadirDates: sortedDates,
        hariFingerprint,
        hariKerjaInput: calc.isTrip ? 0 : hariFingerprint,
        upahPerHari: calc.isTrip
          ? DEFAULT_PAYROLL_RATES.upahPerHari
          : calc.tarifPokok || DEFAULT_PAYROLL_RATES.upahPerHari,
        tripInput: 0,
        upahPerTrip: calc.isTrip
          ? calc.tarifPokok || DEFAULT_PAYROLL_RATES.upahPerTrip
          : DEFAULT_PAYROLL_RATES.upahPerTrip,
        jamLembur: 0,
        inap: 0,
        kasbon: 0,
        bpjs: calc.bpjs || 0,
        keterangan: '',
        selected: !calc.isTrip && hariFingerprint > 0,
      });
    } else {
      result.push({
        fingerId: entry.fingerId,
        excelNama: entry.excelNama,
        matched: false,
        nik: entry.fingerId.toUpperCase(),
        nama: entry.excelNama || `ID ${entry.fingerId}`,
        divisi: 'Karyawan limbah',
        isTrip: false,
        hadirDates: sortedDates,
        hariFingerprint,
        hariKerjaInput: hariFingerprint,
        upahPerHari: DEFAULT_PAYROLL_RATES.upahPerHari,
        tripInput: 0,
        upahPerTrip: DEFAULT_PAYROLL_RATES.upahPerTrip,
        jamLembur: 0,
        inap: 0,
        kasbon: 0,
        bpjs: 0,
        keterangan: '',
        selected: false,
      });
    }
  });

  // Sort matched harian first, then matched trip, then unmatched
  return result.sort((a, b) => {
    if (a.matched !== b.matched) return a.matched ? -1 : 1;
    if (a.isTrip !== b.isTrip) return a.isTrip ? 1 : -1;
    return a.nik.localeCompare(b.nik, 'id', { numeric: true });
  });
}

/**
 * Generates an example Excel template following Solution X606-S attendance export structure
 * so admin can verify column mapping (ID, Nama, Tanggal, Jam Masuk, Jam Pulang).
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

  const sampleEmps =
    masterEmployees.length > 0
      ? masterEmployees.slice(0, 4).map((e) => ({
          id: e.nik || '001',
          nama: e.nama || 'Karyawan',
          dept: calculateTHP(e).skema,
        }))
      : [
          { id: '001', nama: 'Siti Rahma', dept: 'Karyawan limbah' },
          { id: '002', nama: 'Budi Santoso', dept: 'Karyawan limbah' },
          { id: '003', nama: 'Dedi Kurniawan', dept: 'Supir B3' },
        ];

  const attendanceRows: Array<Record<string, string>> = [];
  sampleEmps.forEach((emp, empIdx) => {
    sampleDates.forEach((tgl, dayIdx) => {
      // Simulate 1 absent day on employee #2 so admin can see 5 vs 6 Hari Kerja clearly
      const isAbsent = empIdx === 1 && dayIdx === 4;
      attendanceRows.push({
        ID: emp.id,
        Nama: emp.nama,
        Departemen: emp.dept,
        Tanggal: tgl,
        'Jam Masuk': isAbsent ? '' : `07:${String(48 + ((empIdx * 3 + dayIdx) % 10)).padStart(2, '0')}`,
        'Jam Pulang': isAbsent ? '' : `17:${String(2 + ((empIdx * 2 + dayIdx) % 12)).padStart(2, '0')}`,
        Keterangan: isAbsent ? 'Alpha' : 'Hadir',
      });
    });
  });

  const guideRows = [
    {
      Kolom: 'ID',
      'Contoh Isi': '001 atau 1',
      Penjelasan: 'Dicocokkan otomatis dengan kolom NIK karyawan di web Payroll (angka 1 otomatis cocok dengan 001).',
    },
    {
      Kolom: 'Nama',
      'Contoh Isi': 'Siti Rahma',
      Penjelasan: 'Nama karyawan dari mesin Solution X606-S (opsional bila NIK sudah terdaftar di master).',
    },
    {
      Kolom: 'Tanggal',
      'Contoh Isi': '17/11/2026 atau 2026-11-17',
      Penjelasan: 'Tanggal absensi. Difilter sesuai periode Dari–Sampai yang dipilih saat import.',
    },
    {
      Kolom: 'Jam Masuk / Jam Pulang',
      'Contoh Isi': '07:50 / 17:05',
      Penjelasan: 'Hari yang memiliki minimal 1 jam scan masuk/pulang dihitung sebagai 1 Hari Kerja (HR).',
    },
    {
      Kolom: 'Aturan Divisi',
      'Contoh Isi': 'Harian vs Trip',
      Penjelasan:
        'Karyawan harian otomatis terisi Hari Kerja dari fingerprint. Trip, inap, dan kasbon tetap diisi manual dari catatan.',
    },
  ];

  const wb = XLSX.utils.book_new();
  const wsData = XLSX.utils.json_to_sheet(attendanceRows);
  wsData['!cols'] = [
    { wch: 10 },
    { wch: 24 },
    { wch: 18 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsData, 'Absensi_X606S');

  const wsGuide = XLSX.utils.json_to_sheet(guideRows);
  wsGuide['!cols'] = [{ wch: 22 }, { wch: 26 }, { wch: 68 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Panduan_Pemetaan');

  const filename = `Template_Absensi_Solution_X606S_${getTodayISO()}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}
