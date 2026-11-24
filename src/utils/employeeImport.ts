import * as XLSX from 'xlsx';
import { DEFAULT_PAYROLL_RATES } from '../config/constants';
import type { DivisionName, EmployeeProfile, PayrollCycle } from '../types/payroll';
import { cleanRupiahToNumber, getTodayISO } from './format';

export interface EmployeeColumnMapping {
  nikCol: string;
  namaCol: string;
  divisiCol: string;
  siklusCol: string;
  satuanCol: string;
  upahDefaultCol: string;
  upahLemburHariCol: string;
  upahPerJamCol: string;
  upahPerInapCol: string;
  namaBankCol: string;
  noRekeningCol: string;
  atasNamaCol: string;
  kasbonSaldoCol: string;
  catatanCol: string;
}

export interface ParsedEmployeeExcel {
  fileName: string;
  sheetName: string;
  availableSheets: string[];
  headers: string[];
  rows: Array<Record<string, unknown>>;
  suggestedMapping: EmployeeColumnMapping;
}

export interface EmployeeImportPreviewRow {
  rowKey: string;
  matchedId?: string;
  isExisting: boolean;
  nik: string;
  nama: string;
  divisi: DivisionName;
  siklusGaji: PayrollCycle;
  satuanPokok: 'trip' | 'hari';
  upahDefault: number;
  upahLemburHariDefault: number;
  upahPerJamDefault: number;
  upahPerInapDefault: number;
  namaBank: string;
  noRekening: string;
  atasNamaRekening: string;
  kasbonSaldo: number;
  hasKasbonColumnValue: boolean;
  catatan: string;
  selected: boolean;
}

const NIK_ALIASES = [
  'nik / id',
  'nik/id',
  'no / nik',
  'no/nik',
  'nik',
  'no. id',
  'no id',
  'id karyawan',
  'id pegawai',
  'id',
  'no pegawai',
  'no. pegawai',
  'badge',
  'pin',
];

const NAMA_ALIASES = [
  'nama lengkap',
  'nama karyawan',
  'nama pegawai',
  'nama',
  'name',
  'karyawan',
  'pegawai',
  'employee',
];

const DIVISI_ALIASES = ['divisi utama', 'divisi', 'departemen', 'dept', 'bagian', 'skema', 'jabatan'];

const SIKLUS_ALIASES = ['siklus gaji', 'siklus', 'periode gaji', 'tipe gaji', 'sistem gaji'];

const SATUAN_ALIASES = ['satuan pokok', 'satuan', 'unit pokok', 'hitungan'];

const UPAH_DEFAULT_ALIASES = [
  'upah default (rp)',
  'upah default',
  'nominal upah pokok (rp)',
  'nominal upah pokok',
  'upah pokok (rp)',
  'upah pokok',
  'upah per hari (rp)',
  'upah per hari',
  'upah per trip (rp)',
  'upah per trip',
  'nominal gaji (rp)',
  'nominal gaji',
  'gaji pokok',
  'tarif pokok',
  'upah',
];

const UPAH_LEMBUR_HARI_ALIASES = [
  'upah lembur harian (rp)',
  'upah lembur harian',
  'upah lembur hari',
  'tarif lembur harian',
  'tarif lembur hari',
  'lembur harian (rp)',
];

const UPAH_PER_JAM_ALIASES = [
  'upah lembur jam (rp)',
  'upah lembur per jam (rp)',
  'upah lembur jam',
  'upah lembur per jam',
  'upah per jam (rp)',
  'upah per jam',
  'upah/jam',
  'tarif lembur jam',
];

const UPAH_PER_INAP_ALIASES = [
  'upah lembur inap (rp)',
  'upah per inap (rp)',
  'upah inap (rp)',
  'upah lembur inap',
  'upah per inap',
  'upah inap',
  'tarif inap',
];

const BANK_ALIASES = ['nama bank', 'bank'];

const REKENING_ALIASES = [
  'no rekening',
  'no. rekening',
  'nomor rekening',
  'rekening bank',
  'rekening',
  'no rek',
  'no. rek',
  'norek',
];

const ATAS_NAMA_ALIASES = [
  'atas nama rekening',
  'atas nama',
  'nama pemilik rekening',
  'pemilik rekening',
  'a.n.',
  'a.n',
  'an rekening',
];

const KASBON_ALIASES = [
  'saldo hutang / kasbon (rp)',
  'saldo hutang / kasbon',
  'saldo kasbon (rp)',
  'saldo kasbon',
  'nominal hutang / kasbon',
  'hutang / kasbon (rp)',
  'hutang / kasbon',
  'kasbon (rp)',
  'kasbon',
  'hutang',
];

const CATATAN_ALIASES = ['catatan', 'keterangan', 'ket', 'note', 'notes', 'remarks'];

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

function parseRupiahCell(raw: unknown): number {
  if (raw === null || raw === undefined || raw === '') return 0;
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0;
  const s = String(raw).trim();
  if (!s || s === '-') return 0;
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

/**
 * Safely converts an Excel cell (number or string) to a clean account/ID string
 * avoiding scientific notation or trailing decimals.
 */
function parseIdentifierCell(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return '';
    return raw.toLocaleString('fullwide', { useGrouping: false }).replace(/\.0+$/, '');
  }
  return String(raw).trim();
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

function parseSatuanCell(raw: unknown, divisi: DivisionName, fallback: 'trip' | 'hari'): 'trip' | 'hari' {
  if (divisi === 'Supir B3') return 'trip';
  if (divisi === 'Karyawan limbah') return 'hari';
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (s.includes('trip')) return 'trip';
  if (s.includes('hari') || s === 'hr') return 'hari';
  return fallback;
}

function pickDefaultEmployeeSheet(sheetNames: string[]): string {
  if (!sheetNames.length) return '';
  const nonGuide = sheetNames.filter((n) => !n.toLowerCase().includes('panduan'));
  const pool = nonGuide.length ? nonGuide : sheetNames;
  const preferred = pool.find(
    (n) =>
      n.toLowerCase().includes('karyawan') ||
      n.toLowerCase().includes('pegawai') ||
      n.toLowerCase().includes('employee') ||
      n.toLowerCase().includes('master'),
  );
  return preferred || pool[0];
}

export async function parseEmployeeExcel(
  file: File,
  preferredSheetName?: string,
): Promise<ParsedEmployeeExcel> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
  const availableSheets = wb.SheetNames || [];
  if (!availableSheets.length) {
    throw new Error('File Excel tidak memiliki sheet yang dapat dibaca.');
  }

  const sheetName =
    preferredSheetName && availableSheets.includes(preferredSheetName)
      ? preferredSheetName
      : pickDefaultEmployeeSheet(availableSheets);

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
    if (cells.some((c) => NIK_ALIASES.some((a) => c === a || c.includes(a)))) score += 3;
    if (cells.some((c) => NAMA_ALIASES.some((a) => c === a || c.includes(a)))) score += 4;
    if (cells.some((c) => DIVISI_ALIASES.some((a) => c === a || c.includes(a)))) score += 2;
    if (cells.some((c) => REKENING_ALIASES.some((a) => c === a || c.includes(a)))) score += 2;
    if (cells.some((c) => KASBON_ALIASES.some((a) => c === a || c.includes(a)))) score += 2;
    if (cells.some((c) => UPAH_DEFAULT_ALIASES.some((a) => c === a || c.includes(a)))) score += 2;

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

  // Match specific multi-word columns first before broader columns
  const nikCol = pick(NIK_ALIASES);
  const atasNamaCol = pick(ATAS_NAMA_ALIASES);
  const namaCol = pick(NAMA_ALIASES);
  const divisiCol = pick(DIVISI_ALIASES);
  const siklusCol = pick(SIKLUS_ALIASES);
  const satuanCol = pick(SATUAN_ALIASES);
  const upahLemburHariCol = pick(UPAH_LEMBUR_HARI_ALIASES);
  const upahPerJamCol = pick(UPAH_PER_JAM_ALIASES);
  const upahPerInapCol = pick(UPAH_PER_INAP_ALIASES);
  const upahDefaultCol = pick(UPAH_DEFAULT_ALIASES);
  const namaBankCol = pick(BANK_ALIASES);
  const noRekeningCol = pick(REKENING_ALIASES);
  const kasbonSaldoCol = pick(KASBON_ALIASES);
  const catatanCol = pick(CATATAN_ALIASES);

  return {
    fileName: file.name,
    sheetName,
    availableSheets,
    headers,
    rows,
    suggestedMapping: {
      nikCol,
      namaCol,
      divisiCol,
      siklusCol,
      satuanCol,
      upahDefaultCol,
      upahLemburHariCol,
      upahPerJamCol,
      upahPerInapCol,
      namaBankCol,
      noRekeningCol,
      atasNamaCol,
      kasbonSaldoCol,
      catatanCol,
    },
  };
}

export function buildEmployeeImportPreview(
  sheet: ParsedEmployeeExcel,
  mapping: EmployeeColumnMapping,
  existingProfiles: EmployeeProfile[],
): EmployeeImportPreviewRow[] {
  if (!mapping.namaCol && !mapping.nikCol) return [];

  const byExactNik = new Map<string, EmployeeProfile>();
  const byNumericNik = new Map<string, EmployeeProfile>();
  const byName = new Map<string, EmployeeProfile>();

  existingProfiles.forEach((p) => {
    const cleanNik = (p.nik || '').trim().toUpperCase();
    if (cleanNik && cleanNik !== '-') {
      byExactNik.set(cleanNik, p);
      const digits = cleanNik.replace(/\D/g, '');
      if (digits) byNumericNik.set(String(parseInt(digits, 10)), p);
    }
    const cleanName = (p.nama || '').trim().toLowerCase();
    if (cleanName) byName.set(cleanName, p);
  });

  const findExisting = (rawNik: string, rawNama: string): EmployeeProfile | undefined => {
    const cleanNik = rawNik.trim().toUpperCase();
    if (cleanNik && cleanNik !== '-') {
      if (byExactNik.has(cleanNik)) return byExactNik.get(cleanNik);
      const digits = cleanNik.replace(/\D/g, '');
      if (digits) {
        const numKey = String(parseInt(digits, 10));
        if (byNumericNik.has(numKey)) return byNumericNik.get(numKey);
      }
    }
    const cleanName = rawNama.trim().toLowerCase();
    if (cleanName && byName.has(cleanName)) return byName.get(cleanName);
    return undefined;
  };

  const result: EmployeeImportPreviewRow[] = [];

  sheet.rows.forEach((row, idx) => {
    const rawNik = mapping.nikCol ? parseIdentifierCell(row[mapping.nikCol]).toUpperCase() : '';
    const rawNama = mapping.namaCol ? String(row[mapping.namaCol] ?? '').trim() : '';
    if (!rawNik && !rawNama) return;

    const existing = findExisting(rawNik, rawNama);
    const existingDiv: DivisionName =
      existing?.divisi === 'Supir B3' || existing?.divisi === 'Supir SPD'
        ? existing.divisi
        : 'Karyawan limbah';

    const divisi = mapping.divisiCol
      ? parseDivisionCell(row[mapping.divisiCol], existingDiv)
      : existingDiv;

    const siklusGaji = mapping.siklusCol
      ? parseSiklusCell(row[mapping.siklusCol], existing?.siklusGaji || 'Mingguan')
      : existing?.siklusGaji || 'Mingguan';

    const fallbackSatuan: 'trip' | 'hari' =
      existing?.satuanPokok || (divisi === 'Supir B3' || divisi === 'Supir SPD' ? 'trip' : 'hari');
    const satuanPokok = mapping.satuanCol
      ? parseSatuanCell(row[mapping.satuanCol], divisi, fallbackSatuan)
      : divisi === 'Supir B3'
        ? 'trip'
        : divisi === 'Karyawan limbah'
          ? 'hari'
          : fallbackSatuan;

    const defaultUpahByUnit =
      satuanPokok === 'trip' ? DEFAULT_PAYROLL_RATES.upahPerTrip : DEFAULT_PAYROLL_RATES.upahPerHari;

    const excelUpah = mapping.upahDefaultCol ? parseRupiahCell(row[mapping.upahDefaultCol]) : 0;
    const upahDefault = excelUpah > 0 ? excelUpah : existing?.upahDefault || defaultUpahByUnit;

    const excelLemburHari = mapping.upahLemburHariCol
      ? parseRupiahCell(row[mapping.upahLemburHariCol])
      : 0;
    const upahLemburHariDefault =
      excelLemburHari > 0
        ? excelLemburHari
        : existing?.upahLemburHariDefault || DEFAULT_PAYROLL_RATES.upahLemburHari;

    const excelPerJam = mapping.upahPerJamCol ? parseRupiahCell(row[mapping.upahPerJamCol]) : 0;
    const upahPerJamDefault =
      excelPerJam > 0 ? excelPerJam : existing?.upahPerJamDefault || DEFAULT_PAYROLL_RATES.upahPerJam;

    const excelPerInap = mapping.upahPerInapCol ? parseRupiahCell(row[mapping.upahPerInapCol]) : 0;
    const upahPerInapDefault =
      excelPerInap > 0
        ? excelPerInap
        : existing?.upahPerInapDefault || DEFAULT_PAYROLL_RATES.upahPerInap;

    const excelBank = mapping.namaBankCol ? String(row[mapping.namaBankCol] ?? '').trim() : '';
    const namaBank = excelBank || existing?.namaBank || '';

    const excelRek = mapping.noRekeningCol
      ? parseIdentifierCell(row[mapping.noRekeningCol]).replace(/[^0-9\s-]/g, '').trim()
      : '';
    const noRekening = excelRek || existing?.noRekening || '';

    const excelAtasNama = mapping.atasNamaCol ? String(row[mapping.atasNamaCol] ?? '').trim() : '';
    const atasNamaRekening = excelAtasNama || existing?.atasNamaRekening || '';

    const hasKasbonColVal = Boolean(mapping.kasbonSaldoCol && hasCellValue(row[mapping.kasbonSaldoCol]));
    const kasbonSaldo = hasKasbonColVal
      ? parseRupiahCell(row[mapping.kasbonSaldoCol])
      : existing?.kasbonSaldo || 0;

    const excelCatatan = mapping.catatanCol ? String(row[mapping.catatanCol] ?? '').trim() : '';
    const catatan = excelCatatan || existing?.catatan || '';

    result.push({
      rowKey: `EMPIMP-${idx}-${rawNik || rawNama}`,
      matchedId: existing?.id,
      isExisting: Boolean(existing),
      nik: rawNik || existing?.nik || String(idx + 1).padStart(3, '0'),
      nama: rawNama || existing?.nama || `Karyawan ${rawNik || idx + 1}`,
      divisi,
      siklusGaji,
      satuanPokok,
      upahDefault,
      upahLemburHariDefault,
      upahPerJamDefault,
      upahPerInapDefault,
      namaBank,
      noRekening,
      atasNamaRekening,
      kasbonSaldo,
      hasKasbonColumnValue: hasKasbonColVal,
      catatan,
      selected: true,
    });
  });

  return result;
}

/**
 * Generates a dedicated Excel template tailored for bulk Data Karyawan import:
 * - Sheet 1 (Data_Karyawan): Pre-filled with current employees (or 4 realistic samples covering Mingguan & Bulanan)
 * - Sheet 2 (Panduan_Import): Column guide in Bahasa Indonesia
 */
export function downloadEmployeeTemplateExcel(existingProfiles: EmployeeProfile[]): string {
  const rows =
    existingProfiles.length > 0
      ? existingProfiles.map((emp) => {
          const isTrip =
            emp.divisi === 'Supir B3' ||
            (emp.divisi === 'Supir SPD' && (emp.satuanPokok || 'trip') === 'trip');
          return {
            'NIK / ID': emp.nik || '',
            'Nama Lengkap': emp.nama || '',
            Divisi: emp.divisi || 'Karyawan limbah',
            'Siklus Gaji': emp.siklusGaji || 'Mingguan',
            'Satuan Pokok': isTrip ? 'Trip' : 'HR',
            'Upah Default (Rp)':
              emp.upahDefault ||
              (isTrip ? DEFAULT_PAYROLL_RATES.upahPerTrip : DEFAULT_PAYROLL_RATES.upahPerHari),
            'Upah Lembur Harian (Rp)':
              emp.upahLemburHariDefault || DEFAULT_PAYROLL_RATES.upahLemburHari,
            'Upah Lembur Jam (Rp)': emp.upahPerJamDefault || DEFAULT_PAYROLL_RATES.upahPerJam,
            'Upah Lembur Inap (Rp)': emp.upahPerInapDefault || DEFAULT_PAYROLL_RATES.upahPerInap,
            'Nama Bank': emp.namaBank || '',
            'No Rekening': emp.noRekening || '',
            'Atas Nama Rekening': emp.atasNamaRekening || '',
            'Saldo Hutang / Kasbon (Rp)': emp.kasbonSaldo || 0,
            Catatan: emp.catatan || '',
          };
        })
      : [
          {
            'NIK / ID': '001',
            'Nama Lengkap': 'Ahmad Fauzi',
            Divisi: 'Karyawan limbah',
            'Siklus Gaji': 'Mingguan',
            'Satuan Pokok': 'HR',
            'Upah Default (Rp)': 110000,
            'Upah Lembur Harian (Rp)': 110000,
            'Upah Lembur Jam (Rp)': 18000,
            'Upah Lembur Inap (Rp)': 50000,
            'Nama Bank': 'BRI',
            'No Rekening': '012345678901234',
            'Atas Nama Rekening': 'Ahmad Fauzi',
            'Saldo Hutang / Kasbon (Rp)': 300000,
            Catatan: 'Bagian sortir limbah',
          },
          {
            'NIK / ID': '002',
            'Nama Lengkap': 'Siti Rahma',
            Divisi: 'Karyawan limbah',
            'Siklus Gaji': 'Bulanan',
            'Satuan Pokok': 'HR',
            'Upah Default (Rp)': 125000,
            'Upah Lembur Harian (Rp)': 125000,
            'Upah Lembur Jam (Rp)': 20000,
            'Upah Lembur Inap (Rp)': 50000,
            'Nama Bank': 'BCA',
            'No Rekening': '8765432109',
            'Atas Nama Rekening': 'Siti Rahma',
            'Saldo Hutang / Kasbon (Rp)': 0,
            Catatan: 'Admin gudang',
          },
          {
            'NIK / ID': '003',
            'Nama Lengkap': 'Dedi Kurniawan',
            Divisi: 'Supir B3',
            'Siklus Gaji': 'Mingguan',
            'Satuan Pokok': 'Trip',
            'Upah Default (Rp)': 275000,
            'Upah Lembur Harian (Rp)': 100000,
            'Upah Lembur Jam (Rp)': 15000,
            'Upah Lembur Inap (Rp)': 60000,
            'Nama Bank': 'Mandiri',
            'No Rekening': '1440012345678',
            'Atas Nama Rekening': 'Dedi Kurniawan',
            'Saldo Hutang / Kasbon (Rp)': 500000,
            Catatan: 'Armada B3 Truk 02',
          },
          {
            'NIK / ID': '004',
            'Nama Lengkap': 'Hendra Wijaya',
            Divisi: 'Supir SPD',
            'Siklus Gaji': 'Bulanan',
            'Satuan Pokok': 'Trip',
            'Upah Default (Rp)': 250000,
            'Upah Lembur Harian (Rp)': 100000,
            'Upah Lembur Jam (Rp)': 15000,
            'Upah Lembur Inap (Rp)': 50000,
            'Nama Bank': 'BNI',
            'No Rekening': '0987654321',
            'Atas Nama Rekening': 'Hendra Wijaya',
            'Saldo Hutang / Kasbon (Rp)': 150000,
            Catatan: 'Supir operasional SPD',
          },
        ];

  const guideRows = [
    {
      Kolom: 'NIK / ID (Wajib)',
      'Format / Pilihan': 'Teks / Angka (cth: 001, 002)',
      Penjelasan:
        'Kode unik karyawan. Jika NIK sudah ada di sistem, data karyawan tersebut otomatis diperbarui (tidak duplikat).',
    },
    {
      Kolom: 'Nama Lengkap (Wajib)',
      'Format / Pilihan': 'Teks (cth: Ahmad Fauzi)',
      Penjelasan: 'Nama lengkap karyawan yang tampil di daftar karyawan, rekap gaji, dan slip gaji.',
    },
    {
      Kolom: 'Divisi',
      'Format / Pilihan': 'Karyawan limbah / Supir B3 / Supir SPD',
      Penjelasan: 'Isi salah satu dari 3 divisi utama PT. Sarana Putra Daerah.',
    },
    {
      Kolom: 'Siklus Gaji',
      'Format / Pilihan': 'Mingguan / Bulanan',
      Penjelasan: 'Menentukan apakah karyawan masuk siklus penggajian Mingguan atau Bulanan.',
    },
    {
      Kolom: 'Satuan Pokok',
      'Format / Pilihan': 'HR / Trip',
      Penjelasan:
        'Karyawan limbah otomatis HR, Supir B3 otomatis Trip, sedangkan Supir SPD bisa memilih Trip atau HR.',
    },
    {
      Kolom: 'Upah Default & Upah Lembur (Rp)',
      'Format / Pilihan': 'Angka Rupiah tanpa titik/Rp (cth: 125000)',
      Penjelasan:
        'Nominal upah pokok per Hari/Trip serta tarif lembur Harian, Jam, dan Inap masing-masing karyawan. Langsung dipakai saat Input Gaji & Import Gaji.',
    },
    {
      Kolom: 'Nama Bank, No Rekening & Atas Nama',
      'Format / Pilihan': 'Cth: BCA | 8765432109 | Siti Rahma',
      Penjelasan:
        'Identitas rekening karyawan untuk keperluan transfer Finance. Cukup diinput sekali, lalu tampil otomatis di Ringkasan, Rekap Gaji, dan Slip Gaji.',
    },
    {
      Kolom: 'Saldo Hutang / Kasbon (Rp)',
      'Format / Pilihan': 'Angka Rupiah (isi 0 jika tidak ada hutang)',
      Penjelasan:
        'Saldo hutang/kasbon aktif per karyawan. Perubahan saldo otomatis tercatat di riwayat mutasi kasbon.',
    },
    {
      Kolom: 'Catatan',
      'Format / Pilihan': 'Teks opsional',
      Penjelasan: 'Keterangan tambahan seperti bagian kerja, nomor armada, atau nomor HP.',
    },
  ];

  const wb = XLSX.utils.book_new();
  const wsData = XLSX.utils.json_to_sheet(rows);

  // Force NIK (col A = index 0) and No Rekening (col K = index 10) cells as text so Excel keeps leading zeros
  const range = XLSX.utils.decode_range(wsData['!ref'] || 'A1');
  for (let R = 1; R <= range.e.r; R++) {
    for (const colIdx of [0, 10]) {
      const addr = XLSX.utils.encode_cell({ r: R, c: colIdx });
      const cell = wsData[addr];
      if (cell) {
        cell.t = 's';
        cell.v = String(cell.v ?? '');
        cell.z = '@';
      }
    }
  }

  wsData['!cols'] = [
    { wch: 12 }, // NIK / ID
    { wch: 24 }, // Nama Lengkap
    { wch: 18 }, // Divisi
    { wch: 13 }, // Siklus Gaji
    { wch: 13 }, // Satuan Pokok
    { wch: 18 }, // Upah Default
    { wch: 22 }, // Upah Lembur Harian
    { wch: 20 }, // Upah Lembur Jam
    { wch: 20 }, // Upah Lembur Inap
    { wch: 14 }, // Nama Bank
    { wch: 20 }, // No Rekening
    { wch: 22 }, // Atas Nama Rekening
    { wch: 24 }, // Saldo Hutang / Kasbon
    { wch: 24 }, // Catatan
  ];
  XLSX.utils.book_append_sheet(wb, wsData, 'Data_Karyawan');

  const wsGuide = XLSX.utils.json_to_sheet(guideRows);
  wsGuide['!cols'] = [{ wch: 30 }, { wch: 34 }, { wch: 76 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Panduan_Import');

  const filename = `Template_Import_Data_Karyawan_SPD_${getTodayISO()}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}
