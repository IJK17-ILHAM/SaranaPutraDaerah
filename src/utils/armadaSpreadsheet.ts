import * as XLSX from 'xlsx';
import { DASAR_TARIF_OPTIONS, generateNextArmadaCode } from '../data/armadaSeed';
import type {
  ArmadaDasarTarif,
  ArmadaJenisLokasi,
  ArmadaLokasi,
  ArmadaMenuId,
  ArmadaPelanggan,
  ArmadaTarif,
  ArmadaUnit,
  ArmadaUnitStatus,
} from '../types/armada';
import { cleanRupiahToNumber, getTodayISO, normalizeDateISO } from './format';

export type MasterDataTabKey = 'units' | 'pelanggan' | 'lokasi' | 'tarif';

export interface SpsArmadaDataset {
  units: ArmadaUnit[];
  pelanggan: ArmadaPelanggan[];
  lokasi: ArmadaLokasi[];
  tarif: ArmadaTarif[];
}

export interface SpsArmadaImportResult {
  dataset: SpsArmadaDataset;
  counts: {
    pelanggan: number;
    lokasi: number;
    tarif: number;
    units: number;
  };
  skipped: number;
  warnings: string[];
  tabsFound: string[];
}

export const MASTER_DATA_TEMPLATE_META: Record<
  MasterDataTabKey,
  {
    label: string;
    sheetName: string;
    menuId: ArmadaMenuId;
    requiredCols: string[];
    optionalCols: string[];
    tip: string;
  }
> = {
  units: {
    label: 'Unit Armada',
    sheetName: 'Unit Armada',
    menuId: 'armada-master-unit',
    requiredCols: ['Nomor Polisi', 'Jenis Kendaraan'],
    optionalCols: [
      'Kode Unit (otomatis jika kosong)',
      'Merek',
      'Model',
      'Tahun',
      'Nomor Rangka',
      'Nomor Mesin',
      'Supir Utama',
      'Status (Aktif / Nonaktif)',
      'Catatan',
    ],
    tip: 'Jika Kode Unit atau Nomor Polisi sudah ada, data unit akan diperbarui otomatis tanpa duplikat.',
  },
  pelanggan: {
    label: 'Pelanggan',
    sheetName: 'Pelanggan',
    menuId: 'armada-master-pelanggan',
    requiredCols: ['Nama PT'],
    optionalCols: [
      'ID Pelanggan (otomatis jika kosong)',
      'PIC',
      'Kontak',
      'Status (Aktif / Nonaktif)',
      'Catatan',
    ],
    tip: 'Impor Pelanggan terlebih dahulu sebelum mengimpor Lokasi dan Tarif, atau gunakan Template 4 Tab sekaligus.',
  },
  lokasi: {
    label: 'Lokasi Muat–Bongkar',
    sheetName: 'Lokasi',
    menuId: 'armada-master-lokasi',
    requiredCols: ['ID Pelanggan / Pelanggan', 'Nama Lokasi'],
    optionalCols: [
      'ID Lokasi (otomatis jika kosong)',
      'Alamat Lengkap',
      'Jenis Lokasi (Muat / Bongkar / Keduanya)',
      'Status (Aktif / Nonaktif)',
      'Catatan',
    ],
    tip: 'Pastikan ID Pelanggan atau Nama PT di kolom Pelanggan sesuai dengan Master Pelanggan.',
  },
  tarif: {
    label: 'Tarif Angkutan',
    sheetName: 'Tarif',
    menuId: 'armada-master-tarif',
    requiredCols: [
      'ID Pelanggan / Pelanggan',
      'Lokasi Muat',
      'Lokasi Bongkar',
      'Jenis Kendaraan',
      'Nominal',
    ],
    optionalCols: [
      'ID Tarif (otomatis jika kosong)',
      'Dasar Tarif (Per Rit / Trip, Per Ton, Per Kg, Per Km, Per Hari, Borongan)',
      'Tanggal Mulai Berlaku (YYYY-MM-DD)',
      'Status (Aktif / Nonaktif)',
      'Catatan',
    ],
    tip: 'Lokasi Muat dan Lokasi Bongkar dicocokkan berdasarkan ID Lokasi atau Nama Lokasi milik pelanggan tersebut.',
  },
};

function buildUnitWorksheet(rows: Record<string, unknown>[]): XLSX.WorkSheet {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 15 },
    { wch: 18 },
    { wch: 14 },
    { wch: 18 },
    { wch: 8 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 },
    { wch: 11 },
    { wch: 30 },
  ];
  return ws;
}

function buildPelangganWorksheet(rows: Record<string, unknown>[]): XLSX.WorkSheet {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 30 },
    { wch: 20 },
    { wch: 20 },
    { wch: 11 },
    { wch: 34 },
  ];
  return ws;
}

function buildLokasiWorksheet(rows: Record<string, unknown>[]): XLSX.WorkSheet {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 14 },
    { wch: 28 },
    { wch: 26 },
    { wch: 46 },
    { wch: 14 },
    { wch: 11 },
    { wch: 30 },
  ];
  return ws;
}

function buildTarifWorksheet(rows: Record<string, unknown>[]): XLSX.WorkSheet {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 14 },
    { wch: 26 },
    { wch: 15 },
    { wch: 24 },
    { wch: 17 },
    { wch: 24 },
    { wch: 18 },
    { wch: 16 },
    { wch: 15 },
    { wch: 20 },
    { wch: 11 },
    { wch: 30 },
  ];
  return ws;
}

function buildGuideWorksheet(target: MasterDataTabKey | 'all'): XLSX.WorkSheet {
  const guideRows: Array<Record<string, string>> = [
    {
      Bagian: 'ATURAN UMUM',
      Keterangan:
        'Jangan ubah nama kolom header di baris pertama. Hapus atau timpa baris contoh sebelum melakukan impor.',
    },
    {
      Bagian: 'FORMAT FILE',
      Keterangan: 'Mendukung file Excel (.xlsx / .xls) dan CSV (.csv).',
    },
    {
      Bagian: 'URUTAN DATA',
      Keterangan:
        'Jika memakai Template 4 Tab sekaligus, sistem otomatis memproses urutan: Unit Armada -> Pelanggan -> Lokasi -> Tarif.',
    },
  ];

  if (target === 'all' || target === 'units') {
    guideRows.push({
      Bagian: 'TAB: Unit Armada',
      Keterangan:
        'Wajib: Nomor Polisi, Jenis Kendaraan. Kode Unit boleh dikosongkan (otomatis ARM-001, dst). Status: Aktif / Nonaktif.',
    });
  }
  if (target === 'all' || target === 'pelanggan') {
    guideRows.push({
      Bagian: 'TAB: Pelanggan',
      Keterangan:
        'Wajib: Nama PT. ID Pelanggan boleh dikosongkan (otomatis PLG-001, dst). Status: Aktif / Nonaktif.',
    });
  }
  if (target === 'all' || target === 'lokasi') {
    guideRows.push({
      Bagian: 'TAB: Lokasi',
      Keterangan:
        'Wajib: ID Pelanggan atau Nama PT (kolom Pelanggan), dan Nama Lokasi. Jenis Lokasi: Muat / Bongkar / Keduanya.',
    });
  }
  if (target === 'all' || target === 'tarif') {
    guideRows.push({
      Bagian: 'TAB: Tarif',
      Keterangan:
        'Wajib: Pelanggan, Lokasi Muat, Lokasi Bongkar, Jenis Kendaraan, Nominal (angka saja, misal 1650000). Dasar Tarif: Per Rit / Trip, Per Ton, Per Kg, Per Km, Per Hari, atau Borongan.',
    });
  }

  const ws = XLSX.utils.json_to_sheet(guideRows);
  ws['!cols'] = [{ wch: 22 }, { wch: 96 }];
  return ws;
}

/**
 * Downloads a clean, ready-to-fill Excel (.xlsx) import template for either
 * a single Master Data tab or all 4 Master Data tabs combined.
 */
export function downloadMasterDataTemplate(target: MasterDataTabKey | 'all' = 'all'): void {
  const wb = XLSX.utils.book_new();
  const today = getTodayISO();

  if (target === 'all' || target === 'units') {
    const wsUnit = buildUnitWorksheet([
      {
        'Kode Unit': 'ARM-001',
        'Nomor Polisi': 'B 9001 SPD',
        'Jenis Kendaraan': 'Wingbox',
        Merek: 'Hino',
        Model: 'Dutro 130 HD',
        Tahun: '2024',
        'Nomor Rangka': 'MJEC1JG43P5009001',
        'Nomor Mesin': 'W04DTRJ90011',
        'Supir Utama': '',
        Status: 'Aktif',
        Catatan: 'Contoh baris — timpa atau hapus sebelum impor',
      },
    ]);
    XLSX.utils.book_append_sheet(wb, wsUnit, 'Unit Armada');
  }

  if (target === 'all' || target === 'pelanggan') {
    const wsPelanggan = buildPelangganWorksheet([
      {
        'ID Pelanggan': 'PLG-001',
        'Nama PT': 'PT Contoh Logistik Nusantara',
        PIC: 'Budi Santoso',
        Kontak: '0812-3456-7890',
        Status: 'Aktif',
        Catatan: 'Contoh baris — timpa atau hapus sebelum impor',
      },
    ]);
    XLSX.utils.book_append_sheet(wb, wsPelanggan, 'Pelanggan');
  }

  if (target === 'all' || target === 'lokasi') {
    const wsLokasi = buildLokasiWorksheet([
      {
        'ID Lokasi': 'LOK-001',
        'ID Pelanggan': 'PLG-001',
        Pelanggan: 'PT Contoh Logistik Nusantara',
        'Nama Lokasi': 'Gudang Muat Cikarang',
        'Alamat Lengkap': 'Kawasan Industri Jababeka Blok C-14, Cikarang, Bekasi',
        'Jenis Lokasi': 'Muat',
        Status: 'Aktif',
        Catatan: 'Contoh baris — timpa atau hapus sebelum impor',
      },
      {
        'ID Lokasi': 'LOK-002',
        'ID Pelanggan': 'PLG-001',
        Pelanggan: 'PT Contoh Logistik Nusantara',
        'Nama Lokasi': 'Lokasi Bongkar Bekasi',
        'Alamat Lengkap': 'Jl. Raya Narogong KM 11, Kota Bekasi',
        'Jenis Lokasi': 'Bongkar',
        Status: 'Aktif',
        Catatan: 'Contoh baris — timpa atau hapus sebelum impor',
      },
    ]);
    XLSX.utils.book_append_sheet(wb, wsLokasi, 'Lokasi');
  }

  if (target === 'all' || target === 'tarif') {
    const wsTarif = buildTarifWorksheet([
      {
        'ID Tarif': 'TRF-001',
        'ID Pelanggan': 'PLG-001',
        Pelanggan: 'PT Contoh Logistik Nusantara',
        'ID Lokasi Muat': 'LOK-001',
        'Lokasi Muat': 'Gudang Muat Cikarang',
        'ID Lokasi Bongkar': 'LOK-002',
        'Lokasi Bongkar': 'Lokasi Bongkar Bekasi',
        'Jenis Kendaraan': 'Wingbox',
        'Dasar Tarif': 'Per Rit / Trip',
        Nominal: 1650000,
        'Tanggal Mulai Berlaku': today,
        Status: 'Aktif',
        Catatan: 'Contoh baris — timpa atau hapus sebelum impor',
      },
    ]);
    XLSX.utils.book_append_sheet(wb, wsTarif, 'Tarif');
  }

  XLSX.utils.book_append_sheet(wb, buildGuideWorksheet(target), 'Panduan Pengisian');

  const filenameMap: Record<MasterDataTabKey | 'all', string> = {
    all: 'Template_Master_Data_Armada_PT_SPD.xlsx',
    units: 'Template_Unit_Armada_PT_SPD.xlsx',
    pelanggan: 'Template_Pelanggan_Armada_PT_SPD.xlsx',
    lokasi: 'Template_Lokasi_Armada_PT_SPD.xlsx',
    tarif: 'Template_Tarif_Armada_PT_SPD.xlsx',
  };

  XLSX.writeFile(wb, filenameMap[target]);
}

/**
 * Exports all Armada Master Data tabs into a single unified SPS Armada Excel workbook:
 * - Unit Armada
 * - Pelanggan
 * - Lokasi
 * - Tarif
 */
export function exportSpsArmadaWorkbook(data: SpsArmadaDataset): void {
  const wb = XLSX.utils.book_new();
  const pelangganById = new Map(data.pelanggan.map((p) => [p.id, p]));
  const lokasiById = new Map(data.lokasi.map((l) => [l.id, l]));

  // Tab 1: Unit Armada
  const unitRows = data.units.map((u) => ({
    'Kode Unit': u.kodeUnit,
    'Nomor Polisi': u.nomorPolisi,
    'Jenis Kendaraan': u.jenisKendaraan,
    Merek: u.merek || '',
    Model: u.model || '',
    Tahun: u.tahun || '',
    'Nomor Rangka': u.nomorRangka || '',
    'Nomor Mesin': u.nomorMesin || '',
    'Supir Utama': u.supirUtama || '',
    Status: u.status,
    Catatan: u.catatan || '',
  }));
  const wsUnit = buildUnitWorksheet(
    unitRows.length > 0
      ? unitRows
      : [
          {
            'Kode Unit': '',
            'Nomor Polisi': '',
            'Jenis Kendaraan': '',
            Merek: '',
            Model: '',
            Tahun: '',
            'Nomor Rangka': '',
            'Nomor Mesin': '',
            'Supir Utama': '',
            Status: 'Aktif',
            Catatan: '',
          },
        ],
  );
  XLSX.utils.book_append_sheet(wb, wsUnit, 'Unit Armada');

  // Tab 2: Pelanggan
  const pelangganRows = data.pelanggan.map((p) => ({
    'ID Pelanggan': p.idPelanggan,
    'Nama PT': p.namaPt,
    PIC: p.pic,
    Kontak: p.kontak,
    Status: p.status,
    Catatan: p.catatan || '',
  }));
  const wsPelanggan = buildPelangganWorksheet(
    pelangganRows.length > 0
      ? pelangganRows
      : [
          {
            'ID Pelanggan': '',
            'Nama PT': '',
            PIC: '',
            Kontak: '',
            Status: 'Aktif',
            Catatan: '',
          },
        ],
  );
  XLSX.utils.book_append_sheet(wb, wsPelanggan, 'Pelanggan');

  // Tab 3: Lokasi
  const lokasiRows = data.lokasi.map((l) => {
    const p = pelangganById.get(l.pelangganId);
    return {
      'ID Lokasi': l.idLokasi,
      'ID Pelanggan': p?.idPelanggan || '',
      Pelanggan: p?.namaPt || '',
      'Nama Lokasi': l.namaLokasi,
      'Alamat Lengkap': l.alamatLengkap,
      'Jenis Lokasi': l.jenisLokasi,
      Status: l.status,
      Catatan: l.catatan || '',
    };
  });
  const wsLokasi = buildLokasiWorksheet(
    lokasiRows.length > 0
      ? lokasiRows
      : [
          {
            'ID Lokasi': '',
            'ID Pelanggan': '',
            Pelanggan: '',
            'Nama Lokasi': '',
            'Alamat Lengkap': '',
            'Jenis Lokasi': 'Muat',
            Status: 'Aktif',
            Catatan: '',
          },
        ],
  );
  XLSX.utils.book_append_sheet(wb, wsLokasi, 'Lokasi');

  // Tab 4: Tarif
  const tarifRows = data.tarif.map((t) => {
    const p = pelangganById.get(t.pelangganId);
    const lMuat = lokasiById.get(t.lokasiMuatId);
    const lBongkar = lokasiById.get(t.lokasiBongkarId);
    return {
      'ID Tarif': t.idTarif,
      'ID Pelanggan': p?.idPelanggan || '',
      Pelanggan: p?.namaPt || '',
      'ID Lokasi Muat': lMuat?.idLokasi || '',
      'Lokasi Muat': lMuat?.namaLokasi || '',
      'ID Lokasi Bongkar': lBongkar?.idLokasi || '',
      'Lokasi Bongkar': lBongkar?.namaLokasi || '',
      'Jenis Kendaraan': t.jenisKendaraan,
      'Dasar Tarif': t.dasarTarif,
      Nominal: t.nominal,
      'Tanggal Mulai Berlaku': t.tanggalMulaiBerlaku,
      Status: t.status,
      Catatan: t.catatan || '',
    };
  });
  const wsTarif = buildTarifWorksheet(
    tarifRows.length > 0
      ? tarifRows
      : [
          {
            'ID Tarif': '',
            'ID Pelanggan': '',
            Pelanggan: '',
            'ID Lokasi Muat': '',
            'Lokasi Muat': '',
            'ID Lokasi Bongkar': '',
            'Lokasi Bongkar': '',
            'Jenis Kendaraan': '',
            'Dasar Tarif': 'Per Rit / Trip',
            Nominal: 0,
            'Tanggal Mulai Berlaku': getTodayISO(),
            Status: 'Aktif',
            Catatan: '',
          },
        ],
  );
  XLSX.utils.book_append_sheet(wb, wsTarif, 'Tarif');

  const today = getTodayISO().replace(/-/g, '');
  XLSX.writeFile(wb, `SPS_Armada_PT_SPD_${today}.xlsx`);
}

function getField(row: Record<string, unknown>, candidates: string[]): string {
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const normalizedCand = cand.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matchKey = keys.find(
      (k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedCand,
    );
    if (matchKey !== undefined) {
      const val = row[matchKey];
      if (val !== undefined && val !== null) {
        return String(val).trim();
      }
    }
  }
  return '';
}

function isCompletelyEmptyRow(row: Record<string, unknown>): boolean {
  return Object.values(row).every((v) => v === undefined || v === null || String(v).trim() === '');
}

function normalizeStatus(raw: string): ArmadaUnitStatus {
  return raw.toLowerCase().includes('non') ? 'Nonaktif' : 'Aktif';
}

function normalizeJenisLokasi(raw: string): ArmadaJenisLokasi {
  const s = raw.toLowerCase();
  if (s.includes('kedua') || (s.includes('muat') && s.includes('bongkar'))) return 'Keduanya';
  if (s.includes('bongkar')) return 'Bongkar';
  return 'Muat';
}

function normalizeDasarTarif(raw: string): ArmadaDasarTarif {
  const s = raw.toLowerCase();
  const exact = DASAR_TARIF_OPTIONS.find((opt) => opt.toLowerCase() === s);
  if (exact) return exact;
  if (s.includes('ton')) return 'Per Ton';
  if (s.includes('kg')) return 'Per Kg';
  if (s.includes('km')) return 'Per Km';
  if (s.includes('hari')) return 'Per Hari';
  if (s.includes('borong')) return 'Borongan';
  return 'Per Rit / Trip';
}

/**
 * Imports/merges data from an uploaded Master Data Excel/CSV file (.xlsx / .xls / .csv)
 * supporting tabs: Unit Armada, Pelanggan, Lokasi, and Tarif.
 * When `preferredTab` is provided and the workbook uses a generic first sheet name (e.g. Sheet1 / CSV),
 * automatically maps the first worksheet to that Master Data tab.
 */
export async function importSpsArmadaWorkbook(
  file: File,
  current: SpsArmadaDataset,
  preferredTab: MasterDataTabKey | 'all' = 'all',
): Promise<SpsArmadaImportResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const now = new Date().toISOString();

  const findSheet = (names: string[]): XLSX.WorkSheet | null => {
    for (const target of names) {
      const found = wb.SheetNames.find(
        (sn) => sn.trim().toLowerCase() === target.toLowerCase(),
      );
      if (found) return wb.Sheets[found];
    }
    return null;
  };

  let wsUnit = findSheet(['Unit Armada', 'Unit', 'Armada', 'Master Unit']);
  let wsPelanggan = findSheet(['Pelanggan', 'Customer', 'Master Pelanggan']);
  let wsLokasi = findSheet(['Lokasi', 'Lokasi Muat-Bongkar', 'Lokasi Muat Bongkar', 'Master Lokasi']);
  let wsTarif = findSheet(['Tarif', 'Master Tarif', 'Tarif Angkutan']);

  // Single-sheet fallback (e.g., CSV or custom sheet name like Sheet1) when importing from a specific tab
  const nonGuideSheets = wb.SheetNames.filter(
    (sn) => !sn.trim().toLowerCase().includes('panduan'),
  );
  if (
    preferredTab !== 'all' &&
    !wsUnit &&
    !wsPelanggan &&
    !wsLokasi &&
    !wsTarif &&
    nonGuideSheets.length > 0
  ) {
    const firstSheet = wb.Sheets[nonGuideSheets[0]];
    if (preferredTab === 'units') wsUnit = firstSheet;
    if (preferredTab === 'pelanggan') wsPelanggan = firstSheet;
    if (preferredTab === 'lokasi') wsLokasi = firstSheet;
    if (preferredTab === 'tarif') wsTarif = firstSheet;
  }

  const nextUnits = [...current.units];
  const nextPelanggan = [...current.pelanggan];
  const nextLokasi = [...current.lokasi];
  const nextTarif = [...current.tarif];

  const counts = { pelanggan: 0, lokasi: 0, tarif: 0, units: 0 };
  const tabsFound: string[] = [];
  const warnings: string[] = [];
  let skipped = 0;

  const pushWarning = (msg: string) => {
    if (warnings.length < 6) warnings.push(msg);
  };

  // 1. Unit Armada tab
  if (wsUnit) {
    tabsFound.push('Unit Armada');
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wsUnit, { defval: '' });
    rows.forEach((row, idxRow) => {
      if (isCompletelyEmptyRow(row)) return;
      const nomorPolisi = getField(row, ['Nomor Polisi', 'No Polisi', 'Nopol', 'Plat'])
        .toUpperCase()
        .replace(/\s+/g, ' ');
      const jenisKendaraan = getField(row, ['Jenis Kendaraan', 'Jenis', 'Tipe Kendaraan']);
      if (!nomorPolisi || !jenisKendaraan) {
        skipped += 1;
        pushWarning(
          `Unit Armada baris ${idxRow + 2}: Nomor Polisi dan Jenis Kendaraan wajib diisi.`,
        );
        return;
      }

      let kodeUnit = getField(row, ['Kode Unit', 'Kode']).toUpperCase();
      if (!kodeUnit) {
        kodeUnit = generateNextArmadaCode(
          'ARM',
          nextUnits.map((u) => u.kodeUnit),
        );
      }

      const idx = nextUnits.findIndex(
        (u) =>
          u.kodeUnit.toUpperCase() === kodeUnit ||
          u.nomorPolisi.toUpperCase().replace(/\s+/g, ' ') === nomorPolisi,
      );
      const status = normalizeStatus(getField(row, ['Status']));
      const supirUtama = getField(row, ['Supir Utama', 'Sopir Utama', 'Supir', 'Sopir']);
      const baseFields = {
        kodeUnit,
        nomorPolisi,
        jenisKendaraan,
        merek: getField(row, ['Merek', 'Merk']),
        model: getField(row, ['Model', 'Tipe']),
        tahun: getField(row, ['Tahun']).replace(/\D/g, '').slice(0, 4),
        nomorRangka: getField(row, ['Nomor Rangka', 'No Rangka', 'VIN']).toUpperCase(),
        nomorMesin: getField(row, ['Nomor Mesin', 'No Mesin']).toUpperCase(),
        supirUtama: supirUtama || undefined,
        status,
        catatan: getField(row, ['Catatan']),
        updatedAt: now,
      };
      if (idx >= 0) {
        nextUnits[idx] = {
          ...nextUnits[idx],
          ...baseFields,
          supirUtama: supirUtama || nextUnits[idx].supirUtama,
        };
      } else {
        nextUnits.unshift({
          id: `UNIT-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
          ...baseFields,
          statusOperasional: status === 'Aktif' ? 'Stand-by' : 'Servis',
          lokasiTerakhir: 'Pool Utama PT. SPD',
          createdAt: now,
        });
      }
      counts.units += 1;
    });
  }

  // 2. Pelanggan tab
  if (wsPelanggan) {
    tabsFound.push('Pelanggan');
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wsPelanggan, { defval: '' });
    rows.forEach((row, idxRow) => {
      if (isCompletelyEmptyRow(row)) return;
      const namaPt = getField(row, ['Nama PT', 'Pelanggan', 'Nama Pelanggan', 'Perusahaan']);
      if (!namaPt) {
        skipped += 1;
        pushWarning(`Pelanggan baris ${idxRow + 2}: Nama PT wajib diisi.`);
        return;
      }
      let idPelanggan = getField(row, ['ID Pelanggan', 'Kode Pelanggan', 'ID']).toUpperCase();
      if (!idPelanggan) {
        idPelanggan = generateNextArmadaCode(
          'PLG',
          nextPelanggan.map((p) => p.idPelanggan),
        );
      }
      const pic = getField(row, ['PIC', 'Nama PIC', 'Contact Person']);
      const kontak = getField(row, ['Kontak', 'No HP', 'Telepon', 'Telp', 'WA']);
      const status = normalizeStatus(getField(row, ['Status']));
      const catatan = getField(row, ['Catatan']);

      const idx = nextPelanggan.findIndex(
        (p) =>
          p.idPelanggan.toUpperCase() === idPelanggan ||
          p.namaPt.toLowerCase() === namaPt.toLowerCase(),
      );
      if (idx >= 0) {
        nextPelanggan[idx] = {
          ...nextPelanggan[idx],
          idPelanggan,
          namaPt,
          pic: pic || nextPelanggan[idx].pic,
          kontak: kontak || nextPelanggan[idx].kontak,
          status,
          catatan: catatan || nextPelanggan[idx].catatan,
          updatedAt: now,
        };
      } else {
        nextPelanggan.push({
          id: `PLG-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
          idPelanggan,
          namaPt,
          pic: pic || '-',
          kontak: kontak || '-',
          status,
          catatan,
          createdAt: now,
          updatedAt: now,
        });
      }
      counts.pelanggan += 1;
    });
  }

  // 3. Lokasi tab
  if (wsLokasi) {
    tabsFound.push('Lokasi');
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wsLokasi, { defval: '' });
    rows.forEach((row, idxRow) => {
      if (isCompletelyEmptyRow(row)) return;
      const namaLokasi = getField(row, ['Nama Lokasi', 'Lokasi']);
      if (!namaLokasi) {
        skipped += 1;
        pushWarning(`Lokasi baris ${idxRow + 2}: Nama Lokasi wajib diisi.`);
        return;
      }

      const refIdPlg = getField(row, ['ID Pelanggan', 'Kode Pelanggan']).toUpperCase();
      const refNamaPlg = getField(row, ['Pelanggan', 'Nama PT', 'Nama Pelanggan']);
      const matchedPlg = nextPelanggan.find(
        (p) =>
          (refIdPlg && p.idPelanggan.toUpperCase() === refIdPlg) ||
          (refNamaPlg && p.namaPt.toLowerCase() === refNamaPlg.toLowerCase()),
      );
      if (!matchedPlg) {
        skipped += 1;
        pushWarning(
          `Lokasi baris ${idxRow + 2} (${namaLokasi}): Pelanggan "${refNamaPlg || refIdPlg || '-'}" belum terdaftar di Master Pelanggan.`,
        );
        return;
      }

      let idLokasi = getField(row, ['ID Lokasi', 'Kode Lokasi', 'ID']).toUpperCase();
      if (!idLokasi) {
        idLokasi = generateNextArmadaCode(
          'LOK',
          nextLokasi.map((l) => l.idLokasi),
        );
      }
      const alamatLengkap = getField(row, ['Alamat Lengkap', 'Alamat']);
      const jenisLokasi = normalizeJenisLokasi(getField(row, ['Jenis Lokasi', 'Jenis']));
      const status = normalizeStatus(getField(row, ['Status']));
      const catatan = getField(row, ['Catatan']);

      const idx = nextLokasi.findIndex(
        (l) =>
          l.idLokasi.toUpperCase() === idLokasi ||
          (l.pelangganId === matchedPlg.id &&
            l.namaLokasi.toLowerCase() === namaLokasi.toLowerCase()),
      );
      if (idx >= 0) {
        nextLokasi[idx] = {
          ...nextLokasi[idx],
          idLokasi,
          pelangganId: matchedPlg.id,
          namaLokasi,
          alamatLengkap: alamatLengkap || nextLokasi[idx].alamatLengkap,
          jenisLokasi,
          status,
          catatan: catatan || nextLokasi[idx].catatan,
          updatedAt: now,
        };
      } else {
        nextLokasi.push({
          id: `LOK-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
          idLokasi,
          pelangganId: matchedPlg.id,
          namaLokasi,
          alamatLengkap: alamatLengkap || '-',
          jenisLokasi,
          status,
          catatan,
          createdAt: now,
          updatedAt: now,
        });
      }
      counts.lokasi += 1;
    });
  }

  // 4. Tarif tab
  if (wsTarif) {
    tabsFound.push('Tarif');
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wsTarif, { defval: '' });
    rows.forEach((row, idxRow) => {
      if (isCompletelyEmptyRow(row)) return;
      const refIdPlg = getField(row, ['ID Pelanggan']).toUpperCase();
      const refNamaPlg = getField(row, ['Pelanggan', 'Nama PT', 'Nama Pelanggan']);
      const matchedPlg = nextPelanggan.find(
        (p) =>
          (refIdPlg && p.idPelanggan.toUpperCase() === refIdPlg) ||
          (refNamaPlg && p.namaPt.toLowerCase() === refNamaPlg.toLowerCase()),
      );
      if (!matchedPlg) {
        skipped += 1;
        pushWarning(
          `Tarif baris ${idxRow + 2}: Pelanggan "${refNamaPlg || refIdPlg || '-'}" belum terdaftar di Master Pelanggan.`,
        );
        return;
      }

      const refIdMuat = getField(row, ['ID Lokasi Muat']).toUpperCase();
      const refNamaMuat = getField(row, ['Lokasi Muat', 'Muat']);
      const matchedMuat = nextLokasi.find(
        (l) =>
          (refIdMuat && l.idLokasi.toUpperCase() === refIdMuat) ||
          (refNamaMuat &&
            l.pelangganId === matchedPlg.id &&
            l.namaLokasi.toLowerCase() === refNamaMuat.toLowerCase()),
      );

      const refIdBongkar = getField(row, ['ID Lokasi Bongkar']).toUpperCase();
      const refNamaBongkar = getField(row, ['Lokasi Bongkar', 'Bongkar']);
      const matchedBongkar = nextLokasi.find(
        (l) =>
          (refIdBongkar && l.idLokasi.toUpperCase() === refIdBongkar) ||
          (refNamaBongkar &&
            l.pelangganId === matchedPlg.id &&
            l.namaLokasi.toLowerCase() === refNamaBongkar.toLowerCase()),
      );

      const jenisKendaraan = getField(row, ['Jenis Kendaraan', 'Kendaraan']);
      const nominal = cleanRupiahToNumber(getField(row, ['Nominal', 'Tarif', 'Harga']));
      if (!matchedMuat || !matchedBongkar || !jenisKendaraan || nominal <= 0) {
        skipped += 1;
        pushWarning(
          `Tarif baris ${idxRow + 2}: pastikan Lokasi Muat, Lokasi Bongkar, Jenis Kendaraan, dan Nominal (> 0) valid.`,
        );
        return;
      }

      let idTarif = getField(row, ['ID Tarif', 'Kode Tarif']).toUpperCase();
      if (!idTarif) {
        idTarif = generateNextArmadaCode(
          'TRF',
          nextTarif.map((t) => t.idTarif),
        );
      }
      const dasarTarif = normalizeDasarTarif(getField(row, ['Dasar Tarif', 'Dasar']));
      const tanggalMulaiBerlaku =
        normalizeDateISO(getField(row, ['Tanggal Mulai Berlaku', 'Mulai Berlaku', 'Berlaku'])) ||
        getTodayISO();
      const status = normalizeStatus(getField(row, ['Status']));
      const catatan = getField(row, ['Catatan']);

      const idx = nextTarif.findIndex((t) => t.idTarif.toUpperCase() === idTarif);
      if (idx >= 0) {
        nextTarif[idx] = {
          ...nextTarif[idx],
          pelangganId: matchedPlg.id,
          lokasiMuatId: matchedMuat.id,
          lokasiBongkarId: matchedBongkar.id,
          jenisKendaraan,
          dasarTarif,
          nominal,
          tanggalMulaiBerlaku,
          status,
          catatan: catatan || nextTarif[idx].catatan,
          updatedAt: now,
        };
      } else {
        nextTarif.push({
          id: `TRF-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
          idTarif,
          pelangganId: matchedPlg.id,
          lokasiMuatId: matchedMuat.id,
          lokasiBongkarId: matchedBongkar.id,
          jenisKendaraan,
          dasarTarif,
          nominal,
          tanggalMulaiBerlaku,
          status,
          catatan,
          createdAt: now,
          updatedAt: now,
        });
      }
      counts.tarif += 1;
    });
  }

  return {
    dataset: {
      units: nextUnits,
      pelanggan: nextPelanggan,
      lokasi: nextLokasi,
      tarif: nextTarif,
    },
    counts,
    skipped,
    warnings,
    tabsFound,
  };
}
