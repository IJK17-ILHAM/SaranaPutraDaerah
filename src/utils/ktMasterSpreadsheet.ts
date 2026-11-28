import * as XLSX from 'xlsx';
import type { CustomerType } from '../types/kasTonase';
import { getTodayISO } from './format';

export type KtMasterTabKey = 'barang' | 'customer';

export interface ImportedKtBarangRow {
  nama: string;
  stokKg?: number;
  potDefault: number;
  minKg: number;
  hargaBeli: number;
  hargaJual: number;
}

export interface ImportedKtCustomerRow {
  nama: string;
  tipe: CustomerType;
  plat: string;
  telp: string;
}

export interface KtMasterParseResult {
  barang: ImportedKtBarangRow[];
  customers: ImportedKtCustomerRow[];
  tabsFound: string[];
  skipped: number;
  warnings: string[];
}

export const KT_MASTER_TEMPLATE_META: Record<
  KtMasterTabKey,
  {
    label: string;
    sheetName: string;
    filePrefix: string;
    requiredCols: string[];
    optionalCols: string[];
    tip: string;
  }
> = {
  barang: {
    label: 'Master Barang',
    sheetName: 'Master_Barang',
    filePrefix: 'Template_Master_Barang',
    requiredCols: ['Nama Barang'],
    optionalCols: [
      'Stok Awal (Kg)',
      'Pot. Default (%)',
      'Stok Min (Kg)',
      'Harga Beli/Kg (Rp)',
      'Harga Jual/Kg (Rp)',
    ],
    tip: 'Jika Nama Barang sudah ada di sistem, pengaturan potongan, stok minimum, dan harga akan diperbarui otomatis. Kosongkan Stok Awal jika tidak ingin mengubah stok.',
  },
  customer: {
    label: 'Customer & Supplier',
    sheetName: 'Master_Customer',
    filePrefix: 'Template_Master_Customer',
    requiredCols: ['Nama Mitra'],
    optionalCols: ['Tipe Mitra', 'Plat Armada', 'No. Telepon / WA'],
    tip: 'Isi Tipe Mitra dengan "Supplier & Buyer", "Supplier", atau "Buyer" (default: Supplier & Buyer). Jika Nama Mitra sudah ada, data plat & telepon akan diperbarui.',
  },
};

function setSheetColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map((wch) => ({ wch }));
}

function normalizeHeaderKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
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

function parseExcelNumber(raw: unknown, allowDecimal = false): number {
  if (typeof raw === 'number' && !isNaN(raw)) {
    return allowDecimal ? Math.max(0, raw) : Math.max(0, Math.round(raw));
  }
  const str = String(raw || '').trim();
  if (!str) return 0;
  const cleaned = str.replace(/rp/gi, '').replace(/%/g, '').replace(/\s+/g, '');
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) {
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const n = Number(normalized);
    if (!isNaN(n)) return allowDecimal ? Math.max(0, n) : Math.max(0, Math.round(n));
  }
  const normalized = cleaned.replace(/,/g, allowDecimal ? '.' : '');
  const n = Number(normalized);
  if (!isNaN(n)) return allowDecimal ? Math.max(0, n) : Math.max(0, Math.round(n));
  const digits = str.replace(/[^\d.]/g, '');
  const fallback = Number(digits);
  return isNaN(fallback) ? 0 : allowDecimal ? Math.max(0, fallback) : Math.max(0, Math.round(fallback));
}

function parseCustomerTipe(raw: unknown): CustomerType {
  const s = String(raw || '')
    .trim()
    .toLowerCase();
  if (!s) return 'Supplier & Buyer';
  const hasSup = s.includes('sup') || s.includes('pemasok') || s.includes('beli');
  const hasBuy = s.includes('buy') || s.includes('pembeli') || s.includes('jual');
  if (hasSup && hasBuy) return 'Supplier & Buyer';
  if (hasSup) return 'Supplier';
  if (hasBuy) return 'Buyer';
  return 'Supplier & Buyer';
}

export function downloadKtMasterTemplate(target: KtMasterTabKey | 'all'): void {
  const wb = XLSX.utils.book_new();
  const today = getTodayISO();

  if (target === 'all' || target === 'barang') {
    const barangRows = [
      {
        'Nama Barang': 'Kardus OCC',
        'Stok Awal (Kg)': 2500,
        'Pot. Default (%)': 2,
        'Stok Min (Kg)': 500,
        'Harga Beli/Kg (Rp)': 1800,
        'Harga Jual/Kg (Rp)': 2250,
      },
      {
        'Nama Barang': 'Plastik PET Bening',
        'Stok Awal (Kg)': 1200,
        'Pot. Default (%)': 3,
        'Stok Min (Kg)': 300,
        'Harga Beli/Kg (Rp)': 4200,
        'Harga Jual/Kg (Rp)': 5100,
      },
      {
        'Nama Barang': 'Besi Tua / Scrap A',
        'Stok Awal (Kg)': 0,
        'Pot. Default (%)': 0,
        'Stok Min (Kg)': 1000,
        'Harga Beli/Kg (Rp)': 5000,
        'Harga Jual/Kg (Rp)': 5800,
      },
    ];
    const wsBarang = XLSX.utils.json_to_sheet(barangRows);
    setSheetColWidths(wsBarang, [26, 16, 16, 15, 20, 20]);
    XLSX.utils.book_append_sheet(wb, wsBarang, KT_MASTER_TEMPLATE_META.barang.sheetName);
  }

  if (target === 'all' || target === 'customer') {
    const custRows = [
      {
        'Nama Mitra': 'CV Sumber Rezeki Limbah',
        'Tipe Mitra': 'Supplier',
        'Plat Armada': 'B 9123 KDA',
        'No. Telepon / WA': '081234567890',
      },
      {
        'Nama Mitra': 'PT Pabrik Kertas Nusantara',
        'Tipe Mitra': 'Buyer',
        'Plat Armada': 'D 8451 AB',
        'No. Telepon / WA': '081398765432',
      },
      {
        'Nama Mitra': 'UD Mitra Bersama',
        'Tipe Mitra': 'Supplier & Buyer',
        'Plat Armada': 'F 8810 CD',
        'No. Telepon / WA': '085611223344',
      },
    ];
    const wsCust = XLSX.utils.json_to_sheet(custRows);
    setSheetColWidths(wsCust, [30, 20, 16, 18]);
    XLSX.utils.book_append_sheet(wb, wsCust, KT_MASTER_TEMPLATE_META.customer.sheetName);
  }

  const guideRows = [
    {
      Sheet: KT_MASTER_TEMPLATE_META.barang.sheetName,
      'Kolom Wajib': KT_MASTER_TEMPLATE_META.barang.requiredCols.join(', '),
      'Kolom Opsional': KT_MASTER_TEMPLATE_META.barang.optionalCols.join(', '),
      Keterangan: KT_MASTER_TEMPLATE_META.barang.tip,
    },
    {
      Sheet: KT_MASTER_TEMPLATE_META.customer.sheetName,
      'Kolom Wajib': KT_MASTER_TEMPLATE_META.customer.requiredCols.join(', '),
      'Kolom Opsional': KT_MASTER_TEMPLATE_META.customer.optionalCols.join(', '),
      Keterangan: KT_MASTER_TEMPLATE_META.customer.tip,
    },
    {
      Sheet: 'Catatan Umum',
      'Kolom Wajib': 'Hapus baris contoh sebelum impor',
      'Kolom Opsional': 'Format file: .xlsx, .xls, atau .csv',
      Keterangan:
        'Anda dapat mengimpor 1 tab saja atau sekaligus 2 tab (Master Barang + Customer) dalam satu unggahan.',
    },
  ];
  const wsGuide = XLSX.utils.json_to_sheet(guideRows);
  setSheetColWidths(wsGuide, [20, 32, 46, 62]);
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Panduan');

  const prefix =
    target === 'all'
      ? 'Template_Master_KasTonase_Lengkap'
      : KT_MASTER_TEMPLATE_META[target].filePrefix;
  XLSX.writeFile(wb, `${prefix}_${today}.xlsx`);
}

function classifySheetKind(
  sheetName: string,
  headers: string[],
  preferredTab: KtMasterTabKey | 'all',
): KtMasterTabKey | null {
  const nameKey = normalizeHeaderKey(sheetName);
  if (nameKey.includes('panduan') || nameKey.includes('guide') || nameKey.includes('petunjuk')) {
    return null;
  }
  if (nameKey.includes('barang') || nameKey.includes('produk') || nameKey.includes('stok')) {
    return 'barang';
  }
  if (
    nameKey.includes('customer') ||
    nameKey.includes('costumer') ||
    nameKey.includes('mitra') ||
    nameKey.includes('supplier') ||
    nameKey.includes('pelanggan')
  ) {
    return 'customer';
  }

  const normalizedHeaders = new Set(headers.map(normalizeHeaderKey));
  const hasBarangSignal =
    normalizedHeaders.has('namabarang') ||
    normalizedHeaders.has('barang') ||
    normalizedHeaders.has('potdefault') ||
    normalizedHeaders.has('stokminkg') ||
    normalizedHeaders.has('hargabelikgrp');
  const hasCustomerSignal =
    normalizedHeaders.has('namamitra') ||
    normalizedHeaders.has('namacustomer') ||
    normalizedHeaders.has('tipemitra') ||
    normalizedHeaders.has('platarmada') ||
    normalizedHeaders.has('noteleponwa') ||
    normalizedHeaders.has('telp');

  if (hasBarangSignal && !hasCustomerSignal) return 'barang';
  if (hasCustomerSignal && !hasBarangSignal) return 'customer';
  if (preferredTab !== 'all') return preferredTab;
  if (hasBarangSignal) return 'barang';
  if (hasCustomerSignal) return 'customer';
  return null;
}

export async function parseKtMasterWorkbook(
  file: File,
  preferredTab: KtMasterTabKey | 'all' = 'all',
): Promise<KtMasterParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });

  const barang: ImportedKtBarangRow[] = [];
  const customers: ImportedKtCustomerRow[] = [];
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

    if (kind === 'barang') {
      rows.forEach((row, idx) => {
        const rowNum = idx + 2;
        const nama = String(
          getRowValue(row, ['Nama Barang', 'Barang', 'Nama Item', 'Item', 'Produk', 'Nama']),
        ).trim();

        const rawStok = getRowValue(row, [
          'Stok Awal (Kg)',
          'Stok Awal',
          'Stok (Kg)',
          'Stok Gudang',
          'Stok',
        ]);
        const potDefault = parseExcelNumber(
          getRowValue(row, ['Pot. Default (%)', 'Pot Default (%)', 'Pot Default', 'Potongan (%)', 'Pot']),
          true,
        );
        const minKg = parseExcelNumber(
          getRowValue(row, ['Stok Min (Kg)', 'Batas Min (Kg)', 'Batas Min', 'Stok Min', 'Min Kg']),
        );
        const hargaBeli = parseExcelNumber(
          getRowValue(row, ['Harga Beli/Kg (Rp)', 'Harga Beli/Kg', 'Harga Beli', 'Beli']),
        );
        const hargaJual = parseExcelNumber(
          getRowValue(row, ['Harga Jual/Kg (Rp)', 'Harga Jual/Kg', 'Harga Jual', 'Jual']),
        );

        if (!nama && rawStok === '' && potDefault === 0 && minKg === 0) {
          return;
        }
        if (!nama) {
          skipped += 1;
          warnings.push(`[${sheetName} baris ${rowNum}] Nama Barang kosong — baris dilewati.`);
          return;
        }

        barang.push({
          nama,
          stokKg: rawStok !== '' ? parseExcelNumber(rawStok) : undefined,
          potDefault: Math.min(50, potDefault),
          minKg,
          hargaBeli,
          hargaJual,
        });
      });
    } else if (kind === 'customer') {
      rows.forEach((row, idx) => {
        const rowNum = idx + 2;
        const nama = String(
          getRowValue(row, [
            'Nama Mitra',
            'Nama Customer',
            'Nama Customer / PT / CV',
            'Nama PT',
            'Customer',
            'Mitra',
            'Nama',
          ]),
        ).trim();
        const rawTipe = getRowValue(row, ['Tipe Mitra', 'Tipe', 'Kategori', 'Jenis']);
        const plat = String(
          getRowValue(row, ['Plat Armada', 'Plat Armada Default', 'Plat', 'No Polisi', 'Nopol']),
        )
          .trim()
          .toUpperCase();
        const telp = String(
          getRowValue(row, ['No. Telepon / WA', 'No Telepon / WA', 'No Telepon', 'Telepon', 'Telp', 'WA', 'HP']),
        ).trim();

        if (!nama && !plat && !telp) {
          return;
        }
        if (!nama) {
          skipped += 1;
          warnings.push(`[${sheetName} baris ${rowNum}] Nama Mitra kosong — baris dilewati.`);
          return;
        }

        customers.push({
          nama,
          tipe: parseCustomerTipe(rawTipe),
          plat,
          telp,
        });
      });
    }
  });

  return {
    barang,
    customers,
    tabsFound,
    skipped,
    warnings: warnings.slice(0, 12),
  };
}
