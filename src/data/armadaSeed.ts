import { STORAGE_KEYS } from '../config/constants';
import type { ArmadaUnit } from '../types/armada';

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

const SEED_TIMESTAMP = '2026-11-25T08:00:00.000Z';

export const INITIAL_ARMADA_UNITS: ArmadaUnit[] = [
  {
    id: 'UNIT-01',
    kodeUnit: 'SPD-B3-01',
    nomorPolisi: 'B 9421 SPD',
    jenisKendaraan: 'Truk B3',
    merek: 'Hino',
    model: 'Dutro 130 HD',
    tahun: '2022',
    nomorRangka: 'MJEC1JG43N5094210',
    nomorMesin: 'W04DTRJ48219',
    status: 'Aktif',
    divisi: 'Supir B3',
    supirUtama: 'Dedi Kurniawan',
    lokasiTerakhir: 'Kawasan Industri Cikarang',
    ruteAktif: 'Pool SPD → PT. Mitra Industri → Fasilitas B3',
    statusOperasional: 'Beroperasi',
    muatanTon: 6.4,
    updateTerakhir: '10 menit lalu',
    catatan: 'Box tertutup standar pengangkutan limbah B3',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'UNIT-02',
    kodeUnit: 'SPD-B3-02',
    nomorPolisi: 'B 9184 SPD',
    jenisKendaraan: 'Truk B3',
    merek: 'Mitsubishi',
    model: 'Canter FE 74 HD',
    tahun: '2021',
    nomorRangka: 'MHMFE74P5MK291840',
    nomorMesin: '4D34T-X81920',
    status: 'Aktif',
    divisi: 'Supir B3',
    supirUtama: 'Rudi Hartono',
    lokasiTerakhir: 'Tol Cikampek KM 34',
    ruteAktif: 'Pool SPD → Kawasan MM2100 → Gudang Utama',
    statusOperasional: 'Beroperasi',
    muatanTon: 5.1,
    updateTerakhir: '18 menit lalu',
    catatan: 'Dilengkapi GPS & APAR 6 kg',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'UNIT-03',
    kodeUnit: 'SPD-OP-01',
    nomorPolisi: 'B 8712 SPD',
    jenisKendaraan: 'Wingbox',
    merek: 'Isuzu',
    model: 'Elf NMR 71 HD',
    tahun: '2023',
    nomorRangka: 'MHCNMR71LPJ087120',
    nomorMesin: '4HG1-T55102',
    status: 'Aktif',
    divisi: 'Supir SPD',
    supirUtama: 'Hendra Wijaya',
    lokasiTerakhir: 'Pool Utama PT. SPD',
    ruteAktif: 'Siap muat jadwal shift siang',
    statusOperasional: 'Stand-by',
    muatanTon: 0,
    updateTerakhir: '25 menit lalu',
    catatan: 'Unit operasional pengangkutan material daur ulang',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'UNIT-04',
    kodeUnit: 'SPD-OP-02',
    nomorPolisi: 'B 9630 SPD',
    jenisKendaraan: 'Dump Truck',
    merek: 'Hino',
    model: 'Ranger FM 260 JD',
    tahun: '2020',
    nomorRangka: 'MJEFM8JNKL5096301',
    nomorMesin: 'J08E-UF91044',
    status: 'Aktif',
    divisi: 'Supir SPD',
    supirUtama: 'Agus Salim',
    lokasiTerakhir: 'Cibitung — Timbangan Mitra',
    ruteAktif: 'Gudang Sortir → Mitra Daur Ulang',
    statusOperasional: 'Beroperasi',
    muatanTon: 8.2,
    updateTerakhir: '5 menit lalu',
    catatan: 'Hidrolik bak belakang baru diservis',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'UNIT-05',
    kodeUnit: 'SPD-B3-03',
    nomorPolisi: 'B 8209 SPD',
    jenisKendaraan: 'Colt Diesel',
    merek: 'Mitsubishi',
    model: 'FE 71 Long',
    tahun: '2019',
    nomorRangka: 'MHMFE71P1KK182094',
    nomorMesin: '4D34-L39011',
    status: 'Nonaktif',
    divisi: 'Supir B3',
    supirUtama: 'Slamet Riyadi',
    lokasiTerakhir: 'Bengkel Rekanan Bekasi',
    ruteAktif: 'Servis berkala rem & ganti oli',
    statusOperasional: 'Servis',
    muatanTon: 0,
    updateTerakhir: '1 jam lalu',
    catatan: 'Sementara nonaktif selama perawatan berkala',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'UNIT-06',
    kodeUnit: 'SPD-OP-03',
    nomorPolisi: 'B 8945 SPD',
    jenisKendaraan: 'Truk Fuso',
    merek: 'Isuzu',
    model: 'Giga FRR 90 Q',
    tahun: '2022',
    nomorRangka: 'MHCFRR90LNJ089451',
    nomorMesin: '4HK1-TC77312',
    status: 'Aktif',
    divisi: 'Supir SPD',
    supirUtama: 'Yusuf Maulana',
    lokasiTerakhir: 'Pool Utama PT. SPD',
    ruteAktif: 'Menunggu surat jalan pengiriman sore',
    statusOperasional: 'Stand-by',
    muatanTon: 0,
    updateTerakhir: '32 menit lalu',
    catatan: 'Unit muatan besar antar kota',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
];

export function loadStoredArmadaUnits(): ArmadaUnit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARMADA_UNITS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as ArmadaUnit[];
      }
    }
  } catch {
    // fallback to seed
  }
  localStorage.setItem(STORAGE_KEYS.ARMADA_UNITS, JSON.stringify(INITIAL_ARMADA_UNITS));
  return INITIAL_ARMADA_UNITS;
}

export function saveStoredArmadaUnits(units: ArmadaUnit[]): void {
  localStorage.setItem(STORAGE_KEYS.ARMADA_UNITS, JSON.stringify(units));
}
