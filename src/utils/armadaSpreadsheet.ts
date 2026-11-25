import * as XLSX from 'xlsx';
import { DASAR_TARIF_OPTIONS, generateNextArmadaCode } from '../data/armadaSeed';
import type {
  ArmadaDasarTarif,
  ArmadaJenisLokasi,
  ArmadaLokasi,
  ArmadaPelanggan,
  ArmadaTarif,
  ArmadaUnit,
  ArmadaUnitStatus,
} from '../types/armada';
import { cleanRupiahToNumber, getTodayISO, normalizeDateISO } from './format';

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
  tabsFound: string[];
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
    Status: u.status,
    Catatan: u.catatan || '',
  }));
  const wsUnit = XLSX.utils.json_to_sheet(
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
            Status: 'Aktif',
            Catatan: '',
          },
        ],
  );
  wsUnit['!cols'] = [
    { wch: 14 },
    { wch: 15 },
    { wch: 18 },
    { wch: 14 },
    { wch: 18 },
    { wch: 8 },
    { wch: 22 },
    { wch: 18 },
    { wch: 11 },
    { wch: 30 },
  ];
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
  const wsPelanggan = XLSX.utils.json_to_sheet(
    pelangganRows.length > 0
      ? pelangganRows
      : [
          {
            'ID Pelanggan': 'PLG-001',
            'Nama PT': 'PT Demo Logistik',
            PIC: '',
            Kontak: '',
            Status: 'Aktif',
            Catatan: '',
          },
        ],
  );
  wsPelanggan['!cols'] = [
    { wch: 14 },
    { wch: 30 },
    { wch: 20 },
    { wch: 20 },
    { wch: 11 },
    { wch: 34 },
  ];
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
  const wsLokasi = XLSX.utils.json_to_sheet(
    lokasiRows.length > 0
      ? lokasiRows
      : [
          {
            'ID Lokasi': 'LOK-001',
            'ID Pelanggan': 'PLG-001',
            Pelanggan: 'PT Demo Logistik',
            'Nama Lokasi': 'Gudang Muat Cikarang',
            'Alamat Lengkap': '',
            'Jenis Lokasi': 'Muat',
            Status: 'Aktif',
            Catatan: '',
          },
        ],
  );
  wsLokasi['!cols'] = [
    { wch: 12 },
    { wch: 14 },
    { wch: 28 },
    { wch: 26 },
    { wch: 46 },
    { wch: 14 },
    { wch: 11 },
    { wch: 30 },
  ];
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
  const wsTarif = XLSX.utils.json_to_sheet(
    tarifRows.length > 0
      ? tarifRows
      : [
          {
            'ID Tarif': 'TRF-001',
            'ID Pelanggan': 'PLG-001',
            Pelanggan: 'PT Demo Logistik',
            'ID Lokasi Muat': 'LOK-001',
            'Lokasi Muat': 'Gudang Muat Cikarang',
            'ID Lokasi Bongkar': 'LOK-002',
            'Lokasi Bongkar': 'Lokasi Bongkar Bekasi',
            'Jenis Kendaraan': 'Wingbox',
            'Dasar Tarif': 'Per Rit / Trip',
            Nominal: 1650000,
            'Tanggal Mulai Berlaku': getTodayISO(),
            Status: 'Aktif',
            Catatan: '',
          },
        ],
  );
  wsTarif['!cols'] = [
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
 * Imports/merges data from an uploaded SPS Armada Excel workbook (.xlsx / .xls)
 * supporting tabs: Pelanggan, Lokasi, Tarif, and Unit Armada.
 */
export async function importSpsArmadaWorkbook(
  file: File,
  current: SpsArmadaDataset,
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

  let nextUnits = [...current.units];
  let nextPelanggan = [...current.pelanggan];
  let nextLokasi = [...current.lokasi];
  let nextTarif = [...current.tarif];

  const counts = { pelanggan: 0, lokasi: 0, tarif: 0, units: 0 };
  const tabsFound: string[] = [];

  // 1. Unit Armada tab (optional)
  const wsUnit = findSheet(['Unit Armada', 'Unit', 'Armada']);
  if (wsUnit) {
    tabsFound.push('Unit Armada');
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wsUnit, { defval: '' });
    for (const row of rows) {
      const kodeUnit = getField(row, ['Kode Unit', 'Kode']).toUpperCase();
      const nomorPolisi = getField(row, ['Nomor Polisi', 'No Polisi', 'Nopol'])
        .toUpperCase()
        .replace(/\s+/g, ' ');
      const jenisKendaraan = getField(row, ['Jenis Kendaraan', 'Jenis']);
      if (!kodeUnit || !nomorPolisi || !jenisKendaraan) continue;

      const idx = nextUnits.findIndex(
        (u) => u.kodeUnit.toUpperCase() === kodeUnit,
      );
      const status = normalizeStatus(getField(row, ['Status']));
      const baseFields = {
        kodeUnit,
        nomorPolisi,
        jenisKendaraan,
        merek: getField(row, ['Merek']),
        model: getField(row, ['Model', 'Tipe']),
        tahun: getField(row, ['Tahun']).replace(/\D/g, '').slice(0, 4),
        nomorRangka: getField(row, ['Nomor Rangka', 'No Rangka', 'VIN']).toUpperCase(),
        nomorMesin: getField(row, ['Nomor Mesin', 'No Mesin']).toUpperCase(),
        status,
        catatan: getField(row, ['Catatan']),
        updatedAt: now,
      };
      if (idx >= 0) {
        nextUnits[idx] = { ...nextUnits[idx], ...baseFields };
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
    }
  }

  // 2. Pelanggan tab
  const wsPelanggan = findSheet(['Pelanggan', 'Customer', 'Master Pelanggan']);
  if (wsPelanggan) {
    tabsFound.push('Pelanggan');
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wsPelanggan, { defval: '' });
    for (const row of rows) {
      const namaPt = getField(row, ['Nama PT', 'Pelanggan', 'Nama Pelanggan', 'Perusahaan']);
      if (!namaPt) continue;
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
    }
  }

  // 3. Lokasi tab
  const wsLokasi = findSheet(['Lokasi', 'Lokasi Muat-Bongkar', 'Lokasi Muat Bongkar']);
  if (wsLokasi) {
    tabsFound.push('Lokasi');
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wsLokasi, { defval: '' });
    for (const row of rows) {
      const namaLokasi = getField(row, ['Nama Lokasi', 'Lokasi']);
      if (!namaLokasi) continue;

      const refIdPlg = getField(row, ['ID Pelanggan', 'Kode Pelanggan']).toUpperCase();
      const refNamaPlg = getField(row, ['Pelanggan', 'Nama PT', 'Nama Pelanggan']);
      const matchedPlg = nextPelanggan.find(
        (p) =>
          (refIdPlg && p.idPelanggan.toUpperCase() === refIdPlg) ||
          (refNamaPlg && p.namaPt.toLowerCase() === refNamaPlg.toLowerCase()),
      );
      if (!matchedPlg) continue;

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
    }
  }

  // 4. Tarif tab
  const wsTarif = findSheet(['Tarif', 'Master Tarif']);
  if (wsTarif) {
    tabsFound.push('Tarif');
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wsTarif, { defval: '' });
    for (const row of rows) {
      const refIdPlg = getField(row, ['ID Pelanggan']).toUpperCase();
      const refNamaPlg = getField(row, ['Pelanggan', 'Nama PT', 'Nama Pelanggan']);
      const matchedPlg = nextPelanggan.find(
        (p) =>
          (refIdPlg && p.idPelanggan.toUpperCase() === refIdPlg) ||
          (refNamaPlg && p.namaPt.toLowerCase() === refNamaPlg.toLowerCase()),
      );
      if (!matchedPlg) continue;

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
      if (!matchedMuat || !matchedBongkar || !jenisKendaraan || nominal <= 0) continue;

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
    }
  }

  return {
    dataset: {
      units: nextUnits,
      pelanggan: nextPelanggan,
      lokasi: nextLokasi,
      tarif: nextTarif,
    },
    counts,
    tabsFound,
  };
}
