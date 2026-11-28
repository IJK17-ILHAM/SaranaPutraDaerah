import * as XLSX from 'xlsx';
import type { KtTrxType } from '../types/kasTonase';
import { getTodayISO, normalizeDateISO, normalizeInvoiceCode } from './format';

export type HutangImportTabKey = 'nota' | 'mitra';

export interface ImportedHutangNotaRow {
  nota: string;
  tanggal: string;
  tipe: KtTrxType;
  customer: string;
  plat: string;
  totalNetto: number;
  totalBayar: number;
  dibayar: number;
  sisa: number;
  metode: 'Tunai' | 'Transfer' | 'Hutang';
  catatan: string;
}

export interface ImportedPiutangMitraRow {
  kode: string;
  tanggal: string;
  customer: string;
  keterangan: string;
  nominalAwal: number;
  terbayar: number;
  sisa: number;
}

export interface HutangImportParseResult {
  notas: ImportedHutangNotaRow[];
  mitras: ImportedPiutangMitraRow[];
  tabsFound: string[];
  skipped: number;
  warnings: string[];
}

export const HUTANG_TEMPLATE_META: Record<
  HutangImportTabKey,
  {
    label: string;
    sheetName: string;
    filePrefix: string;
    requiredCols: string[];
    optionalCols: string[];
    tip: string;
  }
> = {
  nota: {
    label: 'Hutang & Piutang Nota',
    sheetName: 'Hutang_Piutang_Nota',
    filePrefix: 'Template_Hutang_Piutang_Nota',
    requiredCols: ['Jenis (Beli/Jual)', 'Nama Mitra', 'Total Tagihan (Rp)'],
    optionalCols: [
      'No Nota',
      'Tanggal',
      'Plat Kendaraan',
      'Total Netto (Kg)',
      'Sudah Dibayar (Rp)',
      'Metode',
      'Catatan',
    ],
    tip: 'Isi kolom Jenis dengan "Beli" (Hutang ke pemasok) atau "Jual" (Piutang dari buyer). Sisa tagihan dihitung otomatis dari Total Tagihan dikurangi Sudah Dibayar.',
  },
  mitra: {
    label: 'Piutang Mitra',
    sheetName: 'Piutang_Mitra',
    filePrefix: 'Template_Piutang_Mitra',
    requiredCols: ['Nama Mitra / PT', 'Nominal Awal (Rp)'],
    optionalCols: ['Kode', 'Tanggal', 'Keterangan', 'Sudah Dicicil (Rp)'],
    tip: 'Gunakan sheet ini untuk mengimpor saldo pinjaman / kasbon / utang pemasok (PT). Sisa piutang dihitung otomatis dari Nominal Awal dikurangi Sudah Dicicil.',
  },
};

function setSheetColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map((wch) => ({ wch }));
}

function normalizeHeaderKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function getRowValue(row: Record<string, unknown>, aliases: string[]): unknown {
  const normalizedMap = new Map<string, unknown>();
  Object.entries(row).forEach(([k, v]) => {
    normalizedMap.set(normalizeHeaderKey(k), v);
  });
  for (const alias of aliases) {
    const val = normalizedMap.get(normalizeHeaderKey(alias));
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return val;
    }
  }
  return '';
}

function parseExcelNumber(raw: unknown): number {
  if (typeof raw === 'number' && !isNaN(raw)) return Math.max(0, Math.round(raw));
  const str = String(raw || '').trim();
  if (!str) return 0;
  // Handle Indonesian formatting like "Rp 1.500.000" or "1.500.000,00"
  const withoutCurrency = str.replace(/rp/gi, '').replace(/\s+/g, '');
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(withoutCurrency)) {
    const normalized = withoutCurrency.replace(/\./g, '').replace(',', '.');
    const n = Number(normalized);
    return isNaN(n) ? 0 : Math.max(0, Math.round(n));
  }
  const cleaned = withoutCurrency.replace(/,/g, '');
  const n = Number(cleaned);
  if (!isNaN(n)) return Math.max(0, Math.round(n));
  const digits = str.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

function parseExcelDate(raw: unknown): string {
  if (typeof raw === 'number' && raw > 20000 && raw < 80000) {
    // Excel serial date
    const utcDays = Math.floor(raw - 25569);
    const d = new Date(utcDays * 86400 * 1000);
    if (!isNaN(d.getTime())) {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  }
  const str = String(raw || '').trim();
  if (!str) return getTodayISO();
  const iso = normalizeDateISO(str);
  if (iso) return iso;
  // Support DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const dd = dmy[1].padStart(2, '0');
    const mm = dmy[2].padStart(2, '0');
    const yyyy = dmy[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  return getTodayISO();
}

function parseNotaTipe(raw: unknown): KtTrxType | null {
  const s = String(raw || '')
    .trim()
    .toLowerCase();
  if (!s) return null;
  if (s.includes('beli') || s.includes('hutang') || s.includes('utang') || s.includes('supplier')) {
    return 'Beli';
  }
  if (s.includes('jual') || s.includes('piutang') || s.includes('buyer') || s.includes('pelanggan')) {
    return 'Jual';
  }
  return null;
}

function parseMetode(raw: unknown, sisa: number): 'Tunai' | 'Transfer' | 'Hutang' {
  const s = String(raw || '')
    .trim()
    .toLowerCase();
  if (s.includes('tunai') || s.includes('cash')) return 'Tunai';
  if (s.includes('transfer') || s.includes('bank') || s.includes('tf')) return 'Transfer';
  if (s.includes('hutang') || s.includes('tempo') || s.includes('kredit')) return 'Hutang';
  return sisa > 0 ? 'Hutang' : 'Transfer';
}

export function downloadHutangPiutangTemplate(target: HutangImportTabKey | 'all'): void {
  const wb = XLSX.utils.book_new();
  const today = getTodayISO();

  if (target === 'all' || target === 'nota') {
    const notaRows = [
      {
        'No Nota': 'NT-IMP-001',
        Tanggal: today,
        'Jenis (Beli/Jual)': 'Beli',
        'Nama Mitra': 'PT Contoh Pemasok Limbah',
        'Plat Kendaraan': 'B 9123 KDA',
        'Total Netto (Kg)': 4500,
        'Total Tagihan (Rp)': 12500000,
        'Sudah Dibayar (Rp)': 5000000,
        Metode: 'Hutang',
        Catatan: 'Contoh Hutang Nota Beli (hapus baris contoh ini sebelum impor)',
      },
      {
        'No Nota': 'NT-IMP-002',
        Tanggal: today,
        'Jenis (Beli/Jual)': 'Jual',
        'Nama Mitra': 'PT Contoh Buyer Industri',
        'Plat Kendaraan': 'D 8451 AB',
        'Total Netto (Kg)': 6200,
        'Total Tagihan (Rp)': 18600000,
        'Sudah Dibayar (Rp)': 6000000,
        Metode: 'Transfer',
        Catatan: 'Contoh Piutang Nota Jual (hapus baris contoh ini sebelum impor)',
      },
    ];
    const wsNota = XLSX.utils.json_to_sheet(notaRows);
    setSheetColWidths(wsNota, [16, 13, 18, 28, 16, 16, 19, 19, 12, 36]);
    XLSX.utils.book_append_sheet(wb, wsNota, HUTANG_TEMPLATE_META.nota.sheetName);
  }

  if (target === 'all' || target === 'mitra') {
    const mitraRows = [
      {
        Kode: 'PM-001',
        Tanggal: today,
        'Nama Mitra / PT': 'PT Contoh Pemasok Limbah',
        Keterangan: 'Pinjaman modal operasional / kasbon pemasok',
        'Nominal Awal (Rp)': 15000000,
        'Sudah Dicicil (Rp)': 3000000,
      },
      {
        Kode: 'PM-002',
        Tanggal: today,
        'Nama Mitra / PT': 'CV Mitra Sejahtera',
        Keterangan: 'Uang muka pembelian limbah bulanan',
        'Nominal Awal (Rp)': 8000000,
        'Sudah Dicicil (Rp)': 0,
      },
    ];
    const wsMitra = XLSX.utils.json_to_sheet(mitraRows);
    setSheetColWidths(wsMitra, [12, 13, 28, 38, 19, 19]);
    XLSX.utils.book_append_sheet(wb, wsMitra, HUTANG_TEMPLATE_META.mitra.sheetName);
  }

  const guideRows = [
    {
      Sheet: HUTANG_TEMPLATE_META.nota.sheetName,
      'Kolom Wajib': HUTANG_TEMPLATE_META.nota.requiredCols.join(', '),
      'Kolom Opsional': HUTANG_TEMPLATE_META.nota.optionalCols.join(', '),
      Keterangan: HUTANG_TEMPLATE_META.nota.tip,
    },
    {
      Sheet: HUTANG_TEMPLATE_META.mitra.sheetName,
      'Kolom Wajib': HUTANG_TEMPLATE_META.mitra.requiredCols.join(', '),
      'Kolom Opsional': HUTANG_TEMPLATE_META.mitra.optionalCols.join(', '),
      Keterangan: HUTANG_TEMPLATE_META.mitra.tip,
    },
    {
      Sheet: 'Format Tanggal & Angka',
      'Kolom Wajib': 'Tanggal: YYYY-MM-DD (mis. 2026-11-27)',
      'Kolom Opsional': 'Nominal: angka polos (mis. 12500000)',
      Keterangan:
        'Hapus baris contoh sebelum mengisi data asli. Jika No Nota atau Kode sudah ada di sistem, data akan diperbarui; jika baru, akan ditambahkan otomatis.',
    },
  ];
  const wsGuide = XLSX.utils.json_to_sheet(guideRows);
  setSheetColWidths(wsGuide, [24, 38, 42, 60]);
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Panduan');

  const prefix =
    target === 'all'
      ? 'Template_Hutang_Piutang_Lengkap'
      : HUTANG_TEMPLATE_META[target].filePrefix;
  XLSX.writeFile(wb, `${prefix}_${today}.xlsx`);
}

function classifySheetKind(
  sheetName: string,
  headers: string[],
  preferredTab: HutangImportTabKey | 'all',
): HutangImportTabKey | null {
  const nameKey = normalizeHeaderKey(sheetName);
  if (nameKey.includes('panduan') || nameKey.includes('guide') || nameKey.includes('petunjuk')) {
    return null;
  }
  if (nameKey.includes('mitra') || nameKey.includes('kasbon') || nameKey.includes('pinjaman')) {
    return 'mitra';
  }
  if (nameKey.includes('nota') || nameKey.includes('transaksi')) {
    return 'nota';
  }

  const normalizedHeaders = new Set(headers.map(normalizeHeaderKey));
  const hasNotaSignal =
    normalizedHeaders.has('nonota') ||
    normalizedHeaders.has('nota') ||
    normalizedHeaders.has('jenisbelijual') ||
    normalizedHeaders.has('tipe') ||
    normalizedHeaders.has('totaltagihanrp') ||
    normalizedHeaders.has('totalbayarrp') ||
    normalizedHeaders.has('totalnota');
  const hasMitraSignal =
    normalizedHeaders.has('nominalawalrp') ||
    normalizedHeaders.has('nominalawal') ||
    normalizedHeaders.has('sudahdicicilrp') ||
    normalizedHeaders.has('namamitrapt') ||
    normalizedHeaders.has('kode');

  if (hasNotaSignal && !hasMitraSignal) return 'nota';
  if (hasMitraSignal && !hasNotaSignal) return 'mitra';
  if (preferredTab !== 'all') return preferredTab;
  if (hasNotaSignal) return 'nota';
  if (hasMitraSignal) return 'mitra';
  return null;
}

export async function parseHutangPiutangWorkbook(
  file: File,
  preferredTab: HutangImportTabKey | 'all' = 'all',
): Promise<HutangImportParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });

  const notas: ImportedHutangNotaRow[] = [];
  const mitras: ImportedPiutangMitraRow[] = [];
  const tabsFound: string[] = [];
  const warnings: string[] = [];
  let skipped = 0;

  wb.SheetNames.forEach((sheetName) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
    if (!rows.length) return;

    const headers = Object.keys(rows[0] || {});
    const kind = classifySheetKind(sheetName, headers, preferredTab);
    if (!kind) return;

    tabsFound.push(sheetName);

    if (kind === 'nota') {
      rows.forEach((row, idx) => {
        const rowNum = idx + 2;
        const customer = String(
          getRowValue(row, ['Nama Mitra', 'Mitra', 'Customer', 'Nama PT', 'Pelanggan', 'Pemasok']),
        ).trim();
        const rawTipe = getRowValue(row, ['Jenis (Beli/Jual)', 'Jenis', 'Tipe', 'Kategori']);
        const tipe = parseNotaTipe(rawTipe);
        const totalBayar = parseExcelNumber(
          getRowValue(row, [
            'Total Tagihan (Rp)',
            'Total Tagihan',
            'Total Nota (Rp)',
            'Total Nota',
            'Total Bayar (Rp)',
            'Total Bayar',
            'Nominal',
            'Nominal (Rp)',
          ]),
        );

        if (!customer && totalBayar === 0 && !rawTipe) {
          return; // Blank trailing row
        }
        if (!customer) {
          skipped += 1;
          warnings.push(`[${sheetName} baris ${rowNum}] Nama Mitra kosong — baris dilewati.`);
          return;
        }
        if (!tipe) {
          skipped += 1;
          warnings.push(
            `[${sheetName} baris ${rowNum}] Jenis "${String(rawTipe || '')}" tidak dikenali (gunakan Beli atau Jual) — baris dilewati.`,
          );
          return;
        }
        if (totalBayar <= 0) {
          skipped += 1;
          warnings.push(
            `[${sheetName} baris ${rowNum}] Total Tagihan untuk ${customer} harus > 0 — baris dilewati.`,
          );
          return;
        }

        const rawDibayar = getRowValue(row, [
          'Sudah Dibayar (Rp)',
          'Sudah Dibayar',
          'Dibayar (Rp)',
          'Dibayar',
          'DP',
          'Terbayar',
        ]);
        const rawSisa = getRowValue(row, [
          'Sisa Tagihan (Rp)',
          'Sisa Tagihan',
          'Sisa (Rp)',
          'Sisa',
        ]);

        let dibayar = parseExcelNumber(rawDibayar);
        let sisa: number;
        if (rawDibayar === '' && rawSisa !== '') {
          sisa = Math.min(totalBayar, parseExcelNumber(rawSisa));
          dibayar = Math.max(0, totalBayar - sisa);
        } else {
          dibayar = Math.min(totalBayar, dibayar);
          sisa = Math.max(0, totalBayar - dibayar);
        }

        const rawNota = String(getRowValue(row, ['No Nota', 'Nota', 'Nomor Nota', 'Invoice'])).trim();
        const nota = rawNota ? normalizeInvoiceCode(rawNota) : '';
        const tanggal = parseExcelDate(getRowValue(row, ['Tanggal', 'Tgl', 'Date']));
        const plat = String(
          getRowValue(row, ['Plat Kendaraan', 'Plat', 'No Polisi', 'Nopol']),
        ).trim();
        const totalNetto = parseExcelNumber(
          getRowValue(row, ['Total Netto (Kg)', 'Netto (Kg)', 'Netto', 'Berat (Kg)']),
        );
        const metode = parseMetode(
          getRowValue(row, ['Metode', 'Metode Bayar', 'Pembayaran']),
          sisa,
        );
        const catatan = String(
          getRowValue(row, ['Catatan', 'Keterangan', 'Catatan Internal', 'Note']),
        ).trim();

        notas.push({
          nota,
          tanggal,
          tipe,
          customer,
          plat,
          totalNetto,
          totalBayar,
          dibayar,
          sisa,
          metode,
          catatan,
        });
      });
    } else if (kind === 'mitra') {
      rows.forEach((row, idx) => {
        const rowNum = idx + 2;
        const customer = String(
          getRowValue(row, ['Nama Mitra / PT', 'Nama Mitra', 'Mitra', 'Customer', 'Nama PT', 'Pemasok']),
        ).trim();
        const nominalAwal = parseExcelNumber(
          getRowValue(row, [
            'Nominal Awal (Rp)',
            'Nominal Awal',
            'Nominal (Rp)',
            'Nominal',
            'Total Piutang (Rp)',
            'Utang Awal (Rp)',
          ]),
        );

        if (!customer && nominalAwal === 0) {
          return;
        }
        if (!customer) {
          skipped += 1;
          warnings.push(`[${sheetName} baris ${rowNum}] Nama Mitra / PT kosong — baris dilewati.`);
          return;
        }
        if (nominalAwal <= 0) {
          skipped += 1;
          warnings.push(
            `[${sheetName} baris ${rowNum}] Nominal Awal untuk ${customer} harus > 0 — baris dilewati.`,
          );
          return;
        }

        const rawTerbayar = getRowValue(row, [
          'Sudah Dicicil (Rp)',
          'Sudah Dicicil',
          'Total Cicilan (Rp)',
          'Terbayar (Rp)',
          'Terbayar',
          'Dibayar',
        ]);
        const rawSisa = getRowValue(row, [
          'Sisa Utang PT (Rp)',
          'Sisa Piutang (Rp)',
          'Sisa (Rp)',
          'Sisa',
        ]);

        let terbayar = parseExcelNumber(rawTerbayar);
        let sisa: number;
        if (rawTerbayar === '' && rawSisa !== '') {
          sisa = Math.min(nominalAwal, parseExcelNumber(rawSisa));
          terbayar = Math.max(0, nominalAwal - sisa);
        } else {
          terbayar = Math.min(nominalAwal, terbayar);
          sisa = Math.max(0, nominalAwal - terbayar);
        }

        const kode = String(getRowValue(row, ['Kode', 'Kode Piutang', 'ID'])).trim();
        const tanggal = parseExcelDate(getRowValue(row, ['Tanggal', 'Tgl', 'Date']));
        const keterangan = String(
          getRowValue(row, ['Keterangan', 'Catatan', 'Uraian', 'Keperluan']),
        ).trim();

        mitras.push({
          kode,
          tanggal,
          customer,
          keterangan: keterangan || 'Utang Pemasok / Pinjaman Mitra (Impor)',
          nominalAwal,
          terbayar,
          sisa,
        });
      });
    }
  });

  return {
    notas,
    mitras,
    tabsFound,
    skipped,
    warnings: warnings.slice(0, 12),
  };
}
