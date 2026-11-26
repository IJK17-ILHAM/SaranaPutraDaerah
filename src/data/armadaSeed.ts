import { STORAGE_KEYS } from '../config/constants';
import type {
  ArmadaDasarTarif,
  ArmadaLokasi,
  ArmadaMaintenanceRequest,
  ArmadaP2HRecord,
  ArmadaPelanggan,
  ArmadaPerjalanan,
  ArmadaSewaUnit,
  ArmadaTarif,
  ArmadaUangJalan,
  ArmadaUnit,
  P2HChecklistItem,
} from '../types/armada';

export const COMMON_JENIS_KENDARAAN = [
  'Truk B3',
  'Dump Truck',
  'Wingbox',
  'Colt Diesel',
  'Truk Fuso',
  'Tangki Limbah',
  'Pickup Operasional',
] as const;

export const COMMON_MEREK_KENDARAAN = [
  'Hino',
  'Mitsubishi',
  'Isuzu',
  'Toyota',
  'Daihatsu',
  'Suzuki',
  'UD Trucks',
] as const;

export const DASAR_TARIF_OPTIONS: ArmadaDasarTarif[] = [
  'Per Rit / Trip',
  'Per Ton',
  'Per Kg',
  'Per Km',
  'Per Hari',
  'Borongan',
];

export const ARMADA_SOPIR_LIST = [
  'Dedi Kurniawan',
  'Rudi Hartono',
  'Hendra Wijaya',
  'Agus Salim',
  'Yusuf Maulana',
  'Slamet Riyadi',
] as const;

export const P2H_CHECKLIST_TEMPLATE: Array<
  Omit<P2HChecklistItem, 'kondisi' | 'catatan' | 'fotoDataUrl' | 'fotoNama'>
> = [
  { kode: 'BAN', label: 'Ban & Tekanan Angin', kategori: 'Keselamatan Kritis', kritis: true },
  { kode: 'REM', label: 'Sistem Rem & Rem Parkir', kategori: 'Keselamatan Kritis', kritis: true },
  { kode: 'LAMPU', label: 'Lampu Utama, Rem & Sein', kategori: 'Keselamatan Kritis', kritis: true },
  { kode: 'OLI', label: 'Oli Mesin & Air Radiator', kategori: 'Mesin & Cairan', kritis: true },
  { kode: 'KLAKSON', label: 'Klakson & Alarm Mundur', kategori: 'Keselamatan', kritis: false },
  {
    kode: 'PERLENGKAPAN',
    label: 'Perlengkapan Kendaraan (Dongkrak, Segitiga, P3K)',
    kategori: 'Perlengkapan',
    kritis: false,
  },
  {
    kode: 'APAR_B3',
    label: 'APAR & Kelengkapan Safety B3 / Box',
    kategori: 'Khusus',
    kritis: false,
    bolehTidakBerlaku: true,
  },
  {
    kode: 'HIDROLIK',
    label: 'Hidrolik Bak / Wingbox',
    kategori: 'Khusus',
    kritis: false,
    bolehTidakBerlaku: true,
  },
];

const SEED_TIMESTAMP = '2026-11-25T08:00:00.000Z';

const ARMADA_DATA_RESET_MARKER = 'spd_armada_data_cleared_v1';

const ARMADA_OPERATIONAL_STORAGE_KEYS = [
  STORAGE_KEYS.ARMADA_UNITS,
  STORAGE_KEYS.ARMADA_PELANGGAN,
  STORAGE_KEYS.ARMADA_LOKASI,
  STORAGE_KEYS.ARMADA_TARIF,
  STORAGE_KEYS.ARMADA_PERJALANAN,
  STORAGE_KEYS.ARMADA_UANG_JALAN,
  STORAGE_KEYS.ARMADA_SEWA,
  STORAGE_KEYS.ARMADA_P2H,
  STORAGE_KEYS.ARMADA_MAINTENANCE,
  STORAGE_KEYS.ARMADA_PERMINTAAN_BARANG,
  STORAGE_KEYS.ARMADA_KENDALA,
] as const;

let hasCheckedArmadaReset = false;

/**
 * Clears previously cached Armada demo/seed records from browser localStorage once
 * while keeping login accounts intact so users can still sign in cleanly.
 */
function ensureArmadaDataClearedOnce(): void {
  if (hasCheckedArmadaReset || typeof window === 'undefined') return;
  hasCheckedArmadaReset = true;
  try {
    if (localStorage.getItem(ARMADA_DATA_RESET_MARKER) === '1') return;
    for (const key of ARMADA_OPERATIONAL_STORAGE_KEYS) {
      localStorage.setItem(key, JSON.stringify([]));
    }
    localStorage.setItem(ARMADA_DATA_RESET_MARKER, '1');
  } catch {
    // ignore storage errors
  }
}

export const INITIAL_ARMADA_UNITS: ArmadaUnit[] = [];

export const INITIAL_ARMADA_PELANGGAN: ArmadaPelanggan[] = [];

export const INITIAL_ARMADA_LOKASI: ArmadaLokasi[] = [];

export const INITIAL_ARMADA_TARIF: ArmadaTarif[] = [];

export function buildInitialPerjalanan(): ArmadaPerjalanan[] {
  return [];
}

export function buildInitialUangJalan(): ArmadaUangJalan[] {
  return [];
}

export function buildInitialSewaUnit(): ArmadaSewaUnit[] {
  return [];
}

export function buildInitialP2H(): ArmadaP2HRecord[] {
  return [];
}

export function generateNextArmadaCode(prefix: string, existingCodes: string[]): string {
  const regex = new RegExp(`^${prefix}-(\\d+)$`, 'i');
  let maxNum = 0;
  for (const code of existingCodes) {
    const m = String(code || '').trim().match(regex);
    if (m) {
      const n = Number(m[1]);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  }
  return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
}

export function loadStoredArmadaUnits(): ArmadaUnit[] {
  ensureArmadaDataClearedOnce();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARMADA_UNITS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as ArmadaUnit[];
      }
    }
  } catch {
    // fallback to empty
  }
  localStorage.setItem(STORAGE_KEYS.ARMADA_UNITS, JSON.stringify([]));
  return [];
}

export function saveStoredArmadaUnits(units: ArmadaUnit[]): void {
  localStorage.setItem(STORAGE_KEYS.ARMADA_UNITS, JSON.stringify(units));
}

export function loadStoredArmadaPelanggan(): ArmadaPelanggan[] {
  ensureArmadaDataClearedOnce();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARMADA_PELANGGAN);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as ArmadaPelanggan[];
    }
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEYS.ARMADA_PELANGGAN, JSON.stringify([]));
  return [];
}

export function saveStoredArmadaPelanggan(items: ArmadaPelanggan[]): void {
  localStorage.setItem(STORAGE_KEYS.ARMADA_PELANGGAN, JSON.stringify(items));
}

export function loadStoredArmadaLokasi(): ArmadaLokasi[] {
  ensureArmadaDataClearedOnce();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARMADA_LOKASI);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as ArmadaLokasi[];
    }
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEYS.ARMADA_LOKASI, JSON.stringify([]));
  return [];
}

export function saveStoredArmadaLokasi(items: ArmadaLokasi[]): void {
  localStorage.setItem(STORAGE_KEYS.ARMADA_LOKASI, JSON.stringify(items));
}

export function loadStoredArmadaTarif(): ArmadaTarif[] {
  ensureArmadaDataClearedOnce();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARMADA_TARIF);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as ArmadaTarif[];
    }
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEYS.ARMADA_TARIF, JSON.stringify([]));
  return [];
}

export function saveStoredArmadaTarif(items: ArmadaTarif[]): void {
  localStorage.setItem(STORAGE_KEYS.ARMADA_TARIF, JSON.stringify(items));
}

export function loadStoredArmadaPerjalanan(): ArmadaPerjalanan[] {
  ensureArmadaDataClearedOnce();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARMADA_PERJALANAN);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as ArmadaPerjalanan[];
    }
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEYS.ARMADA_PERJALANAN, JSON.stringify([]));
  return [];
}

export function saveStoredArmadaPerjalanan(items: ArmadaPerjalanan[]): void {
  localStorage.setItem(STORAGE_KEYS.ARMADA_PERJALANAN, JSON.stringify(items));
}

export function loadStoredArmadaUangJalan(): ArmadaUangJalan[] {
  ensureArmadaDataClearedOnce();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARMADA_UANG_JALAN);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as ArmadaUangJalan[];
    }
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEYS.ARMADA_UANG_JALAN, JSON.stringify([]));
  return [];
}

export function saveStoredArmadaUangJalan(items: ArmadaUangJalan[]): void {
  localStorage.setItem(STORAGE_KEYS.ARMADA_UANG_JALAN, JSON.stringify(items));
}

export function loadStoredArmadaSewa(): ArmadaSewaUnit[] {
  ensureArmadaDataClearedOnce();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARMADA_SEWA);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as ArmadaSewaUnit[];
    }
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEYS.ARMADA_SEWA, JSON.stringify([]));
  return [];
}

export function saveStoredArmadaSewa(items: ArmadaSewaUnit[]): void {
  localStorage.setItem(STORAGE_KEYS.ARMADA_SEWA, JSON.stringify(items));
}

export function loadStoredArmadaP2H(): ArmadaP2HRecord[] {
  ensureArmadaDataClearedOnce();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARMADA_P2H);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as ArmadaP2HRecord[];
    }
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEYS.ARMADA_P2H, JSON.stringify([]));
  return [];
}

export function saveStoredArmadaP2H(items: ArmadaP2HRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.ARMADA_P2H, JSON.stringify(items));
}

export function loadStoredArmadaMaintenance(): ArmadaMaintenanceRequest[] {
  ensureArmadaDataClearedOnce();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARMADA_MAINTENANCE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as ArmadaMaintenanceRequest[];
    }
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEYS.ARMADA_MAINTENANCE, JSON.stringify([]));
  return [];
}

export function saveStoredArmadaMaintenance(items: ArmadaMaintenanceRequest[]): void {
  localStorage.setItem(STORAGE_KEYS.ARMADA_MAINTENANCE, JSON.stringify(items));
}

export function loadStoredArmadaPermintaanBarang(): import('../types/armada').ArmadaPermintaanBarang[] {
  ensureArmadaDataClearedOnce();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARMADA_PERMINTAAN_BARANG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as import('../types/armada').ArmadaPermintaanBarang[];
      }
    }
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEYS.ARMADA_PERMINTAAN_BARANG, JSON.stringify([]));
  return [];
}

export function saveStoredArmadaPermintaanBarang(
  items: import('../types/armada').ArmadaPermintaanBarang[],
): void {
  localStorage.setItem(STORAGE_KEYS.ARMADA_PERMINTAAN_BARANG, JSON.stringify(items));
}

export function computePermintaanBarangStatus(
  items: import('../types/armada').PermintaanBarangItem[],
): import('../types/armada').PermintaanBarangStatus {
  if (!items || items.length === 0) return 'Diajukan';
  let totalTarget = 0;
  let totalApproved = 0;
  let totalReceived = 0;
  let allFulfilled = true;

  for (const it of items) {
    const req = Math.max(0, Number(it.jumlahDiminta) || 0);
    const app = Math.max(0, Number(it.jumlahDisetujui) || 0);
    const rec = Math.max(0, Number(it.jumlahDiterima) || 0);
    const target = app > 0 ? app : req;
    totalTarget += target;
    totalApproved += app;
    totalReceived += rec;
    if (target > 0 && rec < target) {
      allFulfilled = false;
    }
  }

  if (totalTarget > 0 && allFulfilled && totalReceived >= totalTarget) {
    return 'Terpenuhi';
  }
  if (totalReceived > 0) {
    return 'Terpenuhi Sebagian';
  }
  if (totalApproved > 0) {
    return 'Disetujui';
  }
  return 'Diajukan';
}

export function loadStoredArmadaKendala(): import('../types/armada').ArmadaKendalaReport[] {
  ensureArmadaDataClearedOnce();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARMADA_KENDALA);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as import('../types/armada').ArmadaKendalaReport[];
      }
    }
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEYS.ARMADA_KENDALA, JSON.stringify([]));
  return [];
}

export function saveStoredArmadaKendala(
  items: import('../types/armada').ArmadaKendalaReport[],
): void {
  localStorage.setItem(STORAGE_KEYS.ARMADA_KENDALA, JSON.stringify(items));
}

export const INITIAL_ARMADA_ACCOUNTS: import('../types/armada').ArmadaAccount[] = [
  {
    id: 'ARM-USR-001',
    idAkun: 'ARM-USR-001',
    namaLengkap: 'Dedi Kurniawan',
    username: 'dedi.sopir',
    passwordPin: 'SPD123',
    roleAkses: 'Sopir',
    status: 'Aktif',
    catatan: 'Akun sopir Armada',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'ARM-USR-002',
    idAkun: 'ARM-USR-002',
    namaLengkap: 'Rudi Hartono',
    username: 'rudi.sopir',
    passwordPin: 'SPD123',
    roleAkses: 'Sopir',
    status: 'Aktif',
    catatan: 'Akun sopir Armada',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'ARM-USR-003',
    idAkun: 'ARM-USR-003',
    namaLengkap: 'Admin Armada SPD',
    username: 'admin.armada',
    passwordPin: 'ARMADA2026',
    roleAkses: 'Admin Armada',
    status: 'Aktif',
    catatan: 'Pengelola jadwal perjalanan, sewa, dan P2H',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'ARM-USR-004',
    idAkun: 'ARM-USR-004',
    namaLengkap: 'Kepala Armada SPD',
    username: 'kepala.armada',
    passwordPin: 'ARMADA2026',
    roleAkses: 'Kepala Armada',
    status: 'Aktif',
    catatan: 'Persetujuan perbaikan & pelepasan penahanan unit',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'ARM-USR-005',
    idAkun: 'ARM-USR-005',
    namaLengkap: 'Mekanik Workshop SPD',
    username: 'mekanik.spd',
    passwordPin: 'ARMADA2026',
    roleAkses: 'Mekanik',
    status: 'Aktif',
    catatan: 'Eksekusi perbaikan & permintaan suku cadang',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
];

export function loadStoredArmadaAccounts(): import('../types/armada').ArmadaAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARMADA_ACCOUNTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as import('../types/armada').ArmadaAccount[];
      }
    }
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEYS.ARMADA_ACCOUNTS, JSON.stringify(INITIAL_ARMADA_ACCOUNTS));
  return INITIAL_ARMADA_ACCOUNTS;
}

export function saveStoredArmadaAccounts(
  items: import('../types/armada').ArmadaAccount[],
): void {
  localStorage.setItem(STORAGE_KEYS.ARMADA_ACCOUNTS, JSON.stringify(items));
}

