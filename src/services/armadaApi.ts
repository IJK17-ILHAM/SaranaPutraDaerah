import {
  GOOGLE_ARMADA_DRIVE_FOLDER_ID,
  GOOGLE_ARMADA_URL,
} from '../config/constants';
import { loadStoredArmadaAccounts } from '../data/armadaSeed';
import type {
  ArmadaAccount,
  ArmadaAccountRole,
  ArmadaDasarTarif,
  ArmadaKendalaReport,
  ArmadaLokasi,
  ArmadaMaintenanceRequest,
  ArmadaP2HRecord,
  ArmadaPelanggan,
  ArmadaPerjalanan,
  ArmadaPermintaanBarang,
  ArmadaSewaUnit,
  ArmadaTarif,
  ArmadaUangJalan,
  ArmadaUnit,
  ArmadaUnitBerkas,
  P2HChecklistItem,
  PermintaanBarangItem,
  UangJalanExpenseItem,
} from '../types/armada';
import type { UserSession } from '../types/auth';
import { jsonpRequest } from './jsonp';

export type ArmadaCollectionKey =
  | 'units'
  | 'pelanggan'
  | 'lokasi'
  | 'tarif'
  | 'perjalanan'
  | 'uangJalan'
  | 'sewa'
  | 'p2h'
  | 'maintenance'
  | 'permintaanBarang'
  | 'kendala'
  | 'accounts';

export type ArmadaDriveKategori =
  | 'P2H'
  | 'Perbaikan'
  | 'Pengajuan Barang'
  | 'Sewa Unit'
  | 'Uang Jalan'
  | 'Perjalanan'
  | 'Kendala'
  | 'Berkas Kendaraan';

export interface ArmadaDriveMeta {
  rootFolderId?: string;
  nomorPolisi?: string;
  unitNomorPolisi?: string;
  kodeUnit?: string;
  kategori?: ArmadaDriveKategori | string;
  refNumber?: string;
  folderMode?: 'vehicle' | 'pengajuan_barang';
}

export const ARMADA_SHEET_NAMES: Record<ArmadaCollectionKey, string> = {
  units: 'Unit Armada',
  pelanggan: 'Pelanggan',
  lokasi: 'Lokasi',
  tarif: 'Tarif',
  perjalanan: 'Perjalanan',
  uangJalan: 'Uang Jalan',
  sewa: 'Sewa Unit',
  p2h: 'P2H',
  maintenance: 'Maintenance',
  permintaanBarang: 'Permintaan Barang',
  kendala: 'Kendala',
  accounts: 'Akun Armada',
};

export const COLLECTION_TO_DRIVE_KATEGORI: Partial<
  Record<ArmadaCollectionKey, ArmadaDriveKategori>
> = {
  p2h: 'P2H',
  maintenance: 'Perbaikan',
  permintaanBarang: 'Pengajuan Barang',
  sewa: 'Sewa Unit',
  uangJalan: 'Uang Jalan',
  perjalanan: 'Perjalanan',
  kendala: 'Kendala',
  units: 'Berkas Kendaraan',
};

export interface ArmadaSpsSnapshot {
  units?: ArmadaUnit[];
  pelanggan?: ArmadaPelanggan[];
  lokasi?: ArmadaLokasi[];
  tarif?: ArmadaTarif[];
  perjalanan?: ArmadaPerjalanan[];
  uangJalan?: ArmadaUangJalan[];
  sewa?: ArmadaSewaUnit[];
  p2h?: ArmadaP2HRecord[];
  maintenance?: ArmadaMaintenanceRequest[];
  permintaanBarang?: ArmadaPermintaanBarang[];
  kendala?: ArmadaKendalaReport[];
  accounts?: ArmadaAccount[];
}

export interface ParsedArmadaSpsData extends ArmadaSpsSnapshot {
  updated: boolean;
  pengajuanBarangDriveUrl?: string;
}

interface ArmadaSpsResponse {
  status?: string;
  message?: string;
  user?: UserSession;
  folderUrl?: string;
  pengajuanBarangDriveUrl?: string;
  units?: Record<string, unknown>[];
  pelanggan?: Record<string, unknown>[];
  lokasi?: Record<string, unknown>[];
  tarif?: Record<string, unknown>[];
  perjalanan?: Record<string, unknown>[];
  uangJalan?: Record<string, unknown>[];
  sewa?: Record<string, unknown>[];
  p2h?: Record<string, unknown>[];
  maintenance?: Record<string, unknown>[];
  permintaanBarang?: Record<string, unknown>[];
  kendala?: Record<string, unknown>[];
  accounts?: Record<string, unknown>[];
}

export interface ArmadaLoginResult {
  status: 'ok' | 'error';
  user?: UserSession;
  message?: string;
}

const MAX_SHEET_CELL_CHARS = 45000;
const MAX_JSONP_QUERY_CHARS = 1750;

const VALID_DASAR_TARIF: ArmadaDasarTarif[] = [
  'Per Rit / Trip',
  'Per Ton',
  'Per Kg',
  'Per Km',
  'Per Hari',
  'Borongan',
];

const VALID_ARMADA_ROLES: ArmadaAccountRole[] = [
  'Super Admin',
  'Admin Armada',
  'Kepala Armada',
  'Finance',
  'Mekanik',
  'Sopir',
];

function parseBool(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  const s = String(val ?? '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'ya' || s === 'yes';
}

function parseOptionalNumber(val: unknown): number | undefined {
  if (val === undefined || val === null || String(val).trim() === '') return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

function parseJsonArray<T>(val: unknown): T[] {
  if (Array.isArray(val)) return val as T[];
  if (typeof val === 'string' && val.trim()) {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Checks whether an object contains any base64 `data:` file/photo payload
 * (including nested arrays like P2H `items` or Uang Jalan `rincianPengeluaran`).
 */
function containsEmbeddedMedia(obj: unknown): boolean {
  if (!obj) return false;
  if (typeof obj === 'string') return obj.startsWith('data:');
  if (Array.isArray(obj)) return obj.some((item) => containsEmbeddedMedia(item));
  if (typeof obj === 'object') {
    return Object.values(obj as Record<string, unknown>).some((v) => containsEmbeddedMedia(v));
  }
  return false;
}

/**
 * Prepares a record for SPS/Apps Script:
 * - When `preserveMediaForDrive` is true (POST), keeps base64 `data:` strings intact
 *   so Google Apps Script saves them to Google Drive under `<NOMOR POLISI>/<KATEGORI>`
 *   and replaces them with Google Drive URLs before writing to the Sheet.
 */
function prepareRecordForSps<T extends object>(
  record: T,
  preserveMediaForDrive: boolean,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  Object.entries(record as Record<string, unknown>).forEach(([key, val]) => {
    if (val === undefined || val === null) {
      out[key] = '';
      return;
    }
    if (typeof val === 'object') {
      if (preserveMediaForDrive) {
        out[key] = val;
        return;
      }
      const serialized = JSON.stringify(val);
      out[key] = serialized.length > MAX_SHEET_CELL_CHARS ? '[]' : serialized;
      return;
    }
    if (typeof val === 'string' && !preserveMediaForDrive && val.length > MAX_SHEET_CELL_CHARS) {
      out[key] = val.startsWith('data:') ? '' : val.slice(0, MAX_SHEET_CELL_CHARS);
      return;
    }
    out[key] = val;
  });
  return out;
}

function normalizeUnits(rows: Record<string, unknown>[]): ArmadaUnit[] {
  return rows
    .filter((r) => String(r.id || r.kodeUnit || '').trim() !== '')
    .map((r) => ({
      id: String(r.id || `UNIT_${r.kodeUnit}`),
      kodeUnit: String(r.kodeUnit || ''),
      nomorPolisi: String(r.nomorPolisi || ''),
      jenisKendaraan: String(r.jenisKendaraan || ''),
      merek: String(r.merek || ''),
      model: String(r.model || ''),
      tahun: String(r.tahun || ''),
      nomorRangka: String(r.nomorRangka || ''),
      nomorMesin: String(r.nomorMesin || ''),
      status: String(r.status) === 'Nonaktif' ? 'Nonaktif' : 'Aktif',
      divisi: r.divisi ? String(r.divisi) : undefined,
      supirUtama: r.supirUtama ? String(r.supirUtama) : undefined,
      lokasiTerakhir: r.lokasiTerakhir ? String(r.lokasiTerakhir) : undefined,
      ruteAktif: r.ruteAktif ? String(r.ruteAktif) : undefined,
      statusOperasional:
        r.statusOperasional === 'Beroperasi' ||
        r.statusOperasional === 'Stand-by' ||
        r.statusOperasional === 'Servis'
          ? r.statusOperasional
          : undefined,
      muatanTon: parseOptionalNumber(r.muatanTon),
      updateTerakhir: r.updateTerakhir ? String(r.updateTerakhir) : undefined,
      catatan: r.catatan ? String(r.catatan) : '',
      masaBerlakuStnk: r.masaBerlakuStnk ? String(r.masaBerlakuStnk) : undefined,
      masaBerlakuPajak: r.masaBerlakuPajak ? String(r.masaBerlakuPajak) : undefined,
      pengingatHariSebelum: parseOptionalNumber(r.pengingatHariSebelum),
      calendarEventIdStnk: r.calendarEventIdStnk ? String(r.calendarEventIdStnk) : undefined,
      calendarEventLinkStnk: r.calendarEventLinkStnk ? String(r.calendarEventLinkStnk) : undefined,
      calendarEventIdPajak: r.calendarEventIdPajak ? String(r.calendarEventIdPajak) : undefined,
      calendarEventLinkPajak: r.calendarEventLinkPajak ? String(r.calendarEventLinkPajak) : undefined,
      driveFolderUrl: r.driveFolderUrl ? String(r.driveFolderUrl) : undefined,
      berkasList: parseJsonArray<ArmadaUnitBerkas>(r.berkasList),
      createdAt: String(r.createdAt || new Date().toISOString()),
      updatedAt: String(r.updatedAt || new Date().toISOString()),
    }));
}

function normalizePelanggan(rows: Record<string, unknown>[]): ArmadaPelanggan[] {
  return rows
    .filter((r) => String(r.id || r.idPelanggan || '').trim() !== '')
    .map((r) => ({
      id: String(r.id || `PLG_${r.idPelanggan}`),
      idPelanggan: String(r.idPelanggan || ''),
      namaPt: String(r.namaPt || ''),
      pic: String(r.pic || ''),
      kontak: String(r.kontak || ''),
      status: String(r.status) === 'Nonaktif' ? 'Nonaktif' : 'Aktif',
      catatan: r.catatan ? String(r.catatan) : '',
      createdAt: String(r.createdAt || new Date().toISOString()),
      updatedAt: String(r.updatedAt || new Date().toISOString()),
    }));
}

function normalizeLokasi(rows: Record<string, unknown>[]): ArmadaLokasi[] {
  return rows
    .filter((r) => String(r.id || r.idLokasi || '').trim() !== '')
    .map((r) => ({
      id: String(r.id || `LOK_${r.idLokasi}`),
      idLokasi: String(r.idLokasi || ''),
      pelangganId: String(r.pelangganId || ''),
      namaLokasi: String(r.namaLokasi || ''),
      alamatLengkap: String(r.alamatLengkap || ''),
      jenisLokasi:
        r.jenisLokasi === 'Muat' || r.jenisLokasi === 'Bongkar' || r.jenisLokasi === 'Keduanya'
          ? r.jenisLokasi
          : 'Keduanya',
      status: String(r.status) === 'Nonaktif' ? 'Nonaktif' : 'Aktif',
      catatan: r.catatan ? String(r.catatan) : '',
      createdAt: String(r.createdAt || new Date().toISOString()),
      updatedAt: String(r.updatedAt || new Date().toISOString()),
    }));
}

function normalizeTarif(rows: Record<string, unknown>[]): ArmadaTarif[] {
  return rows
    .filter((r) => String(r.id || r.idTarif || '').trim() !== '')
    .map((r) => {
      const rawDasar = String(r.dasarTarif || '');
      const dasarTarif: ArmadaDasarTarif = VALID_DASAR_TARIF.includes(rawDasar as ArmadaDasarTarif)
        ? (rawDasar as ArmadaDasarTarif)
        : 'Per Rit / Trip';
      return {
        id: String(r.id || `TRF_${r.idTarif}`),
        idTarif: String(r.idTarif || ''),
        pelangganId: String(r.pelangganId || ''),
        lokasiMuatId: String(r.lokasiMuatId || ''),
        lokasiBongkarId: String(r.lokasiBongkarId || ''),
        jenisKendaraan: String(r.jenisKendaraan || ''),
        dasarTarif,
        nominal: Number(r.nominal) || 0,
        tanggalMulaiBerlaku: String(r.tanggalMulaiBerlaku || ''),
        status: String(r.status) === 'Nonaktif' ? 'Nonaktif' : 'Aktif',
        catatan: r.catatan ? String(r.catatan) : '',
        createdAt: String(r.createdAt || new Date().toISOString()),
        updatedAt: String(r.updatedAt || new Date().toISOString()),
      };
    });
}

function normalizePerjalanan(rows: Record<string, unknown>[]): ArmadaPerjalanan[] {
  return rows
    .filter((r) => String(r.id || r.nomorPenugasan || '').trim() !== '')
    .map((r) => ({
      ...(r as unknown as ArmadaPerjalanan),
      id: String(r.id || `PRJ_${r.nomorPenugasan}`),
      nomorPenugasan: String(r.nomorPenugasan || ''),
      nomorSuratJalan: r.nomorSuratJalan ? String(r.nomorSuratJalan) : undefined,
      nominalTarif: Number(r.nominalTarif) || 0,
    }));
}

function normalizeUangJalan(rows: Record<string, unknown>[]): ArmadaUangJalan[] {
  return rows
    .filter((r) => String(r.id || r.nomorUangJalan || '').trim() !== '')
    .map((r) => ({
      ...(r as unknown as ArmadaUangJalan),
      id: String(r.id || `UJ_${r.nomorUangJalan}`),
      nominalDiajukan: Number(r.nominalDiajukan) || 0,
      nominalDicairkan: parseOptionalNumber(r.nominalDicairkan),
      totalPengeluaran: Number(r.totalPengeluaran) || 0,
      selisih: parseOptionalNumber(r.selisih),
      rincianPengeluaran: parseJsonArray<UangJalanExpenseItem>(r.rincianPengeluaran),
    }));
}

function normalizeSewa(rows: Record<string, unknown>[]): ArmadaSewaUnit[] {
  return rows
    .filter((r) => String(r.id || r.nomorSewa || '').trim() !== '')
    .map((r) => ({
      ...(r as unknown as ArmadaSewaUnit),
      id: String(r.id || `SEWA_${r.nomorSewa}`),
      tarifDisepakati: Number(r.tarifDisepakati) || 0,
      kmAwal: parseOptionalNumber(r.kmAwal),
      kmAkhir: parseOptionalNumber(r.kmAkhir),
    }));
}

function normalizeP2H(rows: Record<string, unknown>[]): ArmadaP2HRecord[] {
  return rows
    .filter((r) => String(r.id || r.nomorP2H || '').trim() !== '')
    .map((r) => ({
      ...(r as unknown as ArmadaP2HRecord),
      id: String(r.id || `P2H_${r.nomorP2H}`),
      kilometer: Number(r.kilometer) || 0,
      jumlahTemuan: Number(r.jumlahTemuan) || 0,
      items: parseJsonArray<P2HChecklistItem>(r.items),
      adaTemuan: parseBool(r.adaTemuan),
      adaTemuanKritis: parseBool(r.adaTemuanKritis),
      isPemeriksaanUlang: parseBool(r.isPemeriksaanUlang),
      maintenanceIds: parseJsonArray<string>(r.maintenanceIds),
    }));
}

function normalizeMaintenance(rows: Record<string, unknown>[]): ArmadaMaintenanceRequest[] {
  return rows
    .filter((r) => String(r.id || r.nomorPengajuan || '').trim() !== '')
    .map((r) => ({
      ...(r as unknown as ArmadaMaintenanceRequest),
      id: String(r.id || `MNT_${r.nomorPengajuan}`),
      kilometer: Number(r.kilometer) || 0,
      kritis: parseBool(r.kritis),
      penahananDilepas: parseBool(r.penahananDilepas),
    }));
}

function normalizePermintaanBarang(rows: Record<string, unknown>[]): ArmadaPermintaanBarang[] {
  return rows
    .filter((r) => String(r.id || r.nomorPermintaan || '').trim() !== '')
    .map((r) => ({
      ...(r as unknown as ArmadaPermintaanBarang),
      id: String(r.id || `PB_${r.nomorPermintaan}`),
      items: parseJsonArray<PermintaanBarangItem>(r.items),
      fotoDataUrl: r.fotoDataUrl ? String(r.fotoDataUrl) : undefined,
      fotoNama: r.fotoNama ? String(r.fotoNama) : undefined,
      driveFolderUrl: r.driveFolderUrl ? String(r.driveFolderUrl) : undefined,
    }));
}

function normalizeKendala(rows: Record<string, unknown>[]): ArmadaKendalaReport[] {
  return rows
    .filter((r) => String(r.id || r.nomorLaporan || '').trim() !== '')
    .map((r) => ({
      ...(r as unknown as ArmadaKendalaReport),
      id: String(r.id || `KDL_${r.nomorLaporan}`),
    }));
}

function normalizeAccounts(rows: Record<string, unknown>[]): ArmadaAccount[] {
  return rows
    .filter((r) => String(r.id || r.idAkun || r.username || '').trim() !== '')
    .map((r) => {
      const rawRole = String(r.roleAkses || r.role || 'Sopir').trim();
      const roleAkses: ArmadaAccountRole = VALID_ARMADA_ROLES.includes(
        rawRole as ArmadaAccountRole,
      )
        ? (rawRole as ArmadaAccountRole)
        : 'Sopir';
      return {
        id: String(r.id || r.idAkun || `ARM_USR_${r.username}`),
        idAkun: String(r.idAkun || r.id || ''),
        namaLengkap: String(r.namaLengkap || r.nama || ''),
        username: String(r.username || ''),
        passwordPin: String(r.passwordPin || r.password || ''),
        roleAkses,
        status: String(r.status) === 'Nonaktif' ? 'Nonaktif' : 'Aktif',
        unitUtamaKode: r.unitUtamaKode ? String(r.unitUtamaKode) : undefined,
        catatan: r.catatan ? String(r.catatan) : '',
        createdAt: String(r.createdAt || new Date().toISOString()),
        updatedAt: String(r.updatedAt || new Date().toISOString()),
      };
    });
}

export async function loginArmadaWithSPS(
  username: string,
  password: string,
): Promise<ArmadaLoginResult> {
  const cleanUser = username.trim();
  const cleanPass = password.trim();

  try {
    const res = await jsonpRequest<ArmadaSpsResponse>(
      { action: 'loginArmada', username: cleanUser, password: cleanPass },
      10000,
      GOOGLE_ARMADA_URL,
    );
    if (res && res.status === 'ok' && res.user) {
      return { status: 'ok', user: res.user };
    }
    if (res && res.status === 'error') {
      return { status: 'error', message: res.message || 'Username atau Password Armada salah.' };
    }
  } catch {
    // Fallback to local Armada accounts when SPS Armada script is offline / not yet deployed
  }

  const localAccounts = loadStoredArmadaAccounts();
  const matched = localAccounts.find(
    (acc) => acc.username.trim().toLowerCase() === cleanUser.toLowerCase(),
  );
  if (!matched) {
    return { status: 'error', message: 'Akun Armada tidak ditemukan.' };
  }
  if (matched.status === 'Nonaktif') {
    return { status: 'error', message: 'Akun Armada ini sedang dinonaktifkan.' };
  }
  if (matched.passwordPin !== cleanPass) {
    return { status: 'error', message: 'Password / PIN Armada salah.' };
  }
  return {
    status: 'ok',
    user: {
      id: matched.idAkun || matched.id,
      nama: matched.namaLengkap,
      username: matched.username,
      role: matched.roleAkses,
      status: matched.status,
    },
  };
}

export async function fetchArmadaAllFromSPS(): Promise<ParsedArmadaSpsData> {
  const json = await jsonpRequest<ArmadaSpsResponse>(
    { action: 'getAll', t: Date.now() },
    15000,
    GOOGLE_ARMADA_URL,
  );

  const result: ParsedArmadaSpsData = { updated: false };
  if (!json || typeof json !== 'object' || json.status === 'error') {
    return result;
  }

  if (Array.isArray(json.units)) {
    result.units = normalizeUnits(json.units);
    result.updated = true;
  }
  if (Array.isArray(json.pelanggan)) {
    result.pelanggan = normalizePelanggan(json.pelanggan);
    result.updated = true;
  }
  if (Array.isArray(json.lokasi)) {
    result.lokasi = normalizeLokasi(json.lokasi);
    result.updated = true;
  }
  if (Array.isArray(json.tarif)) {
    result.tarif = normalizeTarif(json.tarif);
    result.updated = true;
  }
  if (Array.isArray(json.perjalanan)) {
    result.perjalanan = normalizePerjalanan(json.perjalanan);
    result.updated = true;
  }
  if (Array.isArray(json.uangJalan)) {
    result.uangJalan = normalizeUangJalan(json.uangJalan);
    result.updated = true;
  }
  if (Array.isArray(json.sewa)) {
    result.sewa = normalizeSewa(json.sewa);
    result.updated = true;
  }
  if (Array.isArray(json.p2h)) {
    result.p2h = normalizeP2H(json.p2h);
    result.updated = true;
  }
  if (Array.isArray(json.maintenance)) {
    result.maintenance = normalizeMaintenance(json.maintenance);
    result.updated = true;
  }
  if (Array.isArray(json.permintaanBarang)) {
    result.permintaanBarang = normalizePermintaanBarang(json.permintaanBarang);
    result.updated = true;
  }
  if (Array.isArray(json.kendala)) {
    result.kendala = normalizeKendala(json.kendala);
    result.updated = true;
  }
  if (Array.isArray(json.accounts) && json.accounts.length > 0) {
    result.accounts = normalizeAccounts(json.accounts);
    result.updated = true;
  }
  if (typeof json.pengajuanBarangDriveUrl === 'string' && json.pengajuanBarangDriveUrl.trim()) {
    result.pengajuanBarangDriveUrl = json.pengajuanBarangDriveUrl.trim();
  }

  return result;
}

/**
 * Ensures the dedicated "Pengajuan Barang" folder exists inside Google Drive Armada Root
 * and returns its direct Google Drive URL when supported by the deployed Apps Script.
 */
export async function ensurePengajuanBarangDriveFolderFromSPS(): Promise<string | null> {
  try {
    const res = await jsonpRequest<ArmadaSpsResponse>(
      {
        action: 'ensurePengajuanBarangFolder',
        rootFolderId: GOOGLE_ARMADA_DRIVE_FOLDER_ID,
        t: Date.now(),
      },
      12000,
      GOOGLE_ARMADA_URL,
    );
    if (res && res.status === 'ok' && typeof res.folderUrl === 'string' && res.folderUrl.trim()) {
      return res.folderUrl.trim();
    }
  } catch {
    // Fallback to fire-and-forget POST trigger if JSONP action not yet redeployed
  }

  try {
    await postToArmadaSps({
      action: 'ensurePengajuanBarangFolder',
      rootFolderId: GOOGLE_ARMADA_DRIVE_FOLDER_ID,
    });
  } catch {
    // Ignore network error
  }

  return null;
}

async function postToArmadaSps(body: Record<string, unknown>): Promise<void> {
  await fetch(GOOGLE_ARMADA_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });
}

/**
 * Upserts a single Armada record into SPS Armada.
 * If the record carries any embedded photo/document (`data:...`), always sends via POST
 * with `driveMeta` so Apps Script automatically uploads files to:
 * `Google Drive Armada / <NOMOR POLISI> / <KATEGORI>` and stores the Drive link in the Sheet.
 */
export async function syncArmadaRecordToSPS<T extends object>(
  collection: ArmadaCollectionKey,
  record: T,
  driveMeta?: ArmadaDriveMeta,
): Promise<{ ok: boolean }> {
  const sheet = ARMADA_SHEET_NAMES[collection];
  const hasMedia = containsEmbeddedMedia(record);
  const isPengajuanBarang = collection === 'permintaanBarang';
  const unitPlate = driveMeta?.nomorPolisi || '';

  // For Permintaan Barang, route files into dedicated root folder "Pengajuan Barang"
  // (works both on the updated Apps Script via folderMode='pengajuan_barang' and on older
  // deployments where nomorPolisi='Pengajuan Barang' creates the dedicated top-level folder).
  const fullDriveMeta: ArmadaDriveMeta = isPengajuanBarang
    ? {
        rootFolderId: GOOGLE_ARMADA_DRIVE_FOLDER_ID,
        folderMode: 'pengajuan_barang',
        nomorPolisi: 'Pengajuan Barang',
        unitNomorPolisi: unitPlate,
        kodeUnit: driveMeta?.kodeUnit,
        kategori: unitPlate && unitPlate !== '-' ? unitPlate : 'Umum',
        refNumber: driveMeta?.refNumber,
      }
    : {
        rootFolderId: GOOGLE_ARMADA_DRIVE_FOLDER_ID,
        kategori: COLLECTION_TO_DRIVE_KATEGORI[collection],
        ...driveMeta,
      };

  // Always use POST if embedded media is present (or Unit Armada / Permintaan Barang so Drive folder gets created reliably)
  if (hasMedia || collection === 'units' || isPengajuanBarang) {
    await postToArmadaSps({
      action: 'saveRecord',
      sheet,
      data: prepareRecordForSps(record, true),
      driveMeta: fullDriveMeta,
    });
    return { ok: true };
  }

  const sanitized = prepareRecordForSps(record, false);
  const serialized = JSON.stringify(sanitized);

  if (serialized.length < MAX_JSONP_QUERY_CHARS) {
    const res = await jsonpRequest<ArmadaSpsResponse>(
      { action: 'saveRecord', sheet, data: serialized },
      15000,
      GOOGLE_ARMADA_URL,
    );
    return { ok: res?.status !== 'error' };
  }

  await postToArmadaSps({
    action: 'saveRecord',
    sheet,
    data: prepareRecordForSps(record, true),
    driveMeta: fullDriveMeta,
  });
  return { ok: true };
}

/**
 * Uploads a single document/photo directly into Google Drive under:
 * `Google Drive Armada / <NOMOR POLISI> / <KATEGORI>`
 */
export async function uploadArmadaFileToDrive(params: {
  nomorPolisi: string;
  kodeUnit?: string;
  kategori: ArmadaDriveKategori;
  refNumber?: string;
  fileName: string;
  dataUrl: string;
  catatan?: string;
}): Promise<void> {
  await postToArmadaSps({
    action: 'uploadDriveFile',
    rootFolderId: GOOGLE_ARMADA_DRIVE_FOLDER_ID,
    nomorPolisi: params.nomorPolisi,
    kodeUnit: params.kodeUnit || '',
    kategori: params.kategori,
    refNumber: params.refNumber || '',
    fileName: params.fileName,
    dataUrl: params.dataUrl,
    catatan: params.catatan || '',
  });
}

export async function deleteArmadaRecordFromSPS(
  collection: ArmadaCollectionKey,
  id: string,
): Promise<{ ok: boolean }> {
  const sheet = ARMADA_SHEET_NAMES[collection];
  const res = await jsonpRequest<ArmadaSpsResponse>(
    { action: 'deleteRecord', sheet, id },
    15000,
    GOOGLE_ARMADA_URL,
  );
  return { ok: res?.status !== 'error' };
}

export async function syncArmadaCollectionToSPS<T extends object>(
  collection: ArmadaCollectionKey,
  records: T[],
): Promise<void> {
  const sheet = ARMADA_SHEET_NAMES[collection];
  await postToArmadaSps({
    action: 'syncSheet',
    sheet,
    rootFolderId: GOOGLE_ARMADA_DRIVE_FOLDER_ID,
    kategori: COLLECTION_TO_DRIVE_KATEGORI[collection] || '',
    rows: records.map((r) => prepareRecordForSps(r, true)),
  });
}

export async function pushAllArmadaToSPS(snapshot: ArmadaSpsSnapshot): Promise<void> {
  const sheetsPayload: Record<string, Record<string, unknown>[]> = {};
  (Object.keys(ARMADA_SHEET_NAMES) as ArmadaCollectionKey[]).forEach((key) => {
    const rows = snapshot[key];
    if (Array.isArray(rows)) {
      sheetsPayload[ARMADA_SHEET_NAMES[key]] = rows.map((r) => prepareRecordForSps(r, true));
    }
  });

  await postToArmadaSps({
    action: 'syncAll',
    rootFolderId: GOOGLE_ARMADA_DRIVE_FOLDER_ID,
    sheets: sheetsPayload,
  });
}
