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

/**
 * Returns the nearest Monday (YYYY-MM-DD) for the current week (or upcoming Monday if after Monday)
 * so the Monday 08:00-12:00 ARM-001 test scenario is always immediate and easy to test.
 */
export function getSeedMondayISO(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const diffToNextMon = day === 1 ? 0 : day === 0 ? 1 : 8 - day;
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToNextMon);
  return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(
    mon.getDate(),
  ).padStart(2, '0')}`;
}

function getRelativeISO(daysOffset: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysOffset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export const INITIAL_ARMADA_UNITS: ArmadaUnit[] = [
  {
    id: 'UNIT-ARM-001',
    kodeUnit: 'ARM-001',
    nomorPolisi: 'B 9001 ARM',
    jenisKendaraan: 'Wingbox',
    merek: 'Hino',
    model: 'Dutro 130 HD',
    tahun: '2023',
    nomorRangka: 'MJEC1JG43P5009001',
    nomorMesin: 'W04DTRJ90011',
    status: 'Aktif',
    divisi: 'Supir SPD',
    supirUtama: 'Dedi Kurniawan',
    lokasiTerakhir: 'Pool Utama PT. SPD',
    ruteAktif: 'Dijadwalkan: PT Demo Logistik (Cikarang → Bekasi)',
    statusOperasional: 'Stand-by',
    muatanTon: 0,
    updateTerakhir: '5 menit lalu',
    catatan: 'Unit utama Wingbox untuk pengiriman rutin Jabodetabek',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
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
    supirUtama: 'Rudi Hartono',
    lokasiTerakhir: 'Kawasan Industri Cikarang',
    ruteAktif: 'Plant 1 Jababeka → Fasilitas Pengolahan Cileungsi',
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
    supirUtama: 'Hendra Wijaya',
    lokasiTerakhir: 'Tol Cikampek KM 34',
    ruteAktif: 'Pool SPD → Kawasan MM2100 → Gudang Utama',
    statusOperasional: 'Stand-by',
    muatanTon: 0,
    updateTerakhir: '18 menit lalu',
    catatan: 'Dilengkapi GPS & APAR 6 kg',
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
    ruteAktif: 'Gudang Sortir Cibitung → Pabrik Daur Ulang Marunda',
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
    lokasiTerakhir: 'Kawasan Industri MM2100 (Sewa)',
    ruteAktif: 'Sedang disewa oleh PT Sinar Baja MM2100',
    statusOperasional: 'Beroperasi',
    muatanTon: 0,
    updateTerakhir: '32 menit lalu',
    catatan: 'Unit muatan besar antar kota',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
];

export const INITIAL_ARMADA_PELANGGAN: ArmadaPelanggan[] = [
  {
    id: 'PLG-1',
    idPelanggan: 'PLG-001',
    namaPt: 'PT Demo Logistik',
    pic: 'Budi Santoso',
    kontak: '0812-8841-2201',
    status: 'Aktif',
    catatan: 'Pelanggan rutin pengiriman kawasan Cikarang–Bekasi',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'PLG-2',
    idPelanggan: 'PLG-002',
    namaPt: 'PT Mitra Industri Cikarang',
    pic: 'Rina Kusuma',
    kontak: '0813-9022-4410',
    status: 'Aktif',
    catatan: 'Kontrak angkut limbah B3 dan material palet mingguan',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'PLG-3',
    idPelanggan: 'PLG-003',
    namaPt: 'PT Sinar Baja MM2100',
    pic: 'Hendra Prasetyo',
    kontak: '0811-7750-982',
    status: 'Aktif',
    catatan: 'Jadwal muat shift pagi 08.00 WIB, wajib surat jalan rangkap 3',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'PLG-4',
    idPelanggan: 'PLG-004',
    namaPt: 'PT Karya Daur Ulang Nusantara',
    pic: 'Siti Aminah',
    kontak: '0856-4419-0083',
    status: 'Aktif',
    catatan: 'Mitra bongkar material sortiran dan scrap industri',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
];

export const INITIAL_ARMADA_LOKASI: ArmadaLokasi[] = [
  {
    id: 'LOK-1',
    idLokasi: 'LOK-001',
    pelangganId: 'PLG-1',
    namaLokasi: 'Gudang Muat Cikarang',
    alamatLengkap:
      'Kawasan Industri Jababeka II Blok C-14, Cikarang Selatan, Kabupaten Bekasi, Jawa Barat',
    jenisLokasi: 'Muat',
    status: 'Aktif',
    catatan: 'Akses gerbang timur, antrean bongkar-muat mulai 07.30 WIB',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'LOK-2',
    idLokasi: 'LOK-002',
    pelangganId: 'PLG-1',
    namaLokasi: 'Lokasi Bongkar Bekasi',
    alamatLengkap:
      'Jl. Raya Narogong KM 11 No. 48, Bantargebang, Kota Bekasi, Jawa Barat',
    jenisLokasi: 'Bongkar',
    status: 'Aktif',
    catatan: 'Tersedia jembatan timbang internal',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'LOK-3',
    idLokasi: 'LOK-003',
    pelangganId: 'PLG-2',
    namaLokasi: 'Plant 1 Jababeka',
    alamatLengkap:
      'Jl. Industri Selatan IV Blok GG-6, Kawasan Jababeka, Cikarang, Bekasi',
    jenisLokasi: 'Muat',
    status: 'Aktif',
    catatan: 'Area TPS Limbah B3 pintu loading dock 2',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'LOK-4',
    idLokasi: 'LOK-004',
    pelangganId: 'PLG-2',
    namaLokasi: 'Fasilitas Pengolahan Cileungsi',
    alamatLengkap:
      'Jl. Raya Narogong KM 23,5, Cileungsi, Kabupaten Bogor, Jawa Barat',
    jenisLokasi: 'Bongkar',
    status: 'Aktif',
    catatan: 'Wajib lampirkan manifest elektronik B3',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'LOK-5',
    idLokasi: 'LOK-005',
    pelangganId: 'PLG-3',
    namaLokasi: 'Pabrik Utama MM2100',
    alamatLengkap:
      'Kawasan Industri MM2100 Jl. Kalimantan Blok G-2, Cikarang Barat, Bekasi',
    jenisLokasi: 'Keduanya',
    status: 'Aktif',
    catatan: 'Bisa dipakai untuk muat scrap maupun bongkar bahan baku',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'LOK-6',
    idLokasi: 'LOK-006',
    pelangganId: 'PLG-3',
    namaLokasi: 'Depo Distribusi Karawang',
    alamatLengkap:
      'Kawasan Industri KIIC Lot B-9, Telukjambe Barat, Kabupaten Karawang, Jawa Barat',
    jenisLokasi: 'Bongkar',
    status: 'Aktif',
    catatan: 'Batas masuk kendaraan besar maksimal pukul 16.30 WIB',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'LOK-7',
    idLokasi: 'LOK-007',
    pelangganId: 'PLG-4',
    namaLokasi: 'Gudang Sortir Cibitung',
    alamatLengkap:
      'Jl. Teuku Umar KM 44 No. 19, Cibitung, Kabupaten Bekasi, Jawa Barat',
    jenisLokasi: 'Keduanya',
    status: 'Aktif',
    catatan: 'Operasional Senin–Sabtu 08.00–17.00 WIB',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'LOK-8',
    idLokasi: 'LOK-008',
    pelangganId: 'PLG-4',
    namaLokasi: 'Pabrik Daur Ulang Marunda',
    alamatLengkap:
      'Kawasan Marunda Center Blok F-5, Tarumajaya, Kabupaten Bekasi, Jawa Barat',
    jenisLokasi: 'Bongkar',
    status: 'Aktif',
    catatan: 'Wajib helm & rompi safety di area timbangan',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
];

export const INITIAL_ARMADA_TARIF: ArmadaTarif[] = [
  {
    id: 'TRF-1',
    idTarif: 'TRF-001',
    pelangganId: 'PLG-1',
    lokasiMuatId: 'LOK-1',
    lokasiBongkarId: 'LOK-2',
    jenisKendaraan: 'Wingbox',
    dasarTarif: 'Per Rit / Trip',
    nominal: 1650000,
    tanggalMulaiBerlaku: '2026-11-01',
    status: 'Aktif',
    catatan: 'Tarif standar rute Cikarang → Bekasi (termasuk tol)',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'TRF-2',
    idTarif: 'TRF-002',
    pelangganId: 'PLG-1',
    lokasiMuatId: 'LOK-1',
    lokasiBongkarId: 'LOK-2',
    jenisKendaraan: 'Colt Diesel',
    dasarTarif: 'Per Rit / Trip',
    nominal: 1150000,
    tanggalMulaiBerlaku: '2026-11-01',
    status: 'Aktif',
    catatan: 'Untuk muatan di bawah 4 ton',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'TRF-3',
    idTarif: 'TRF-003',
    pelangganId: 'PLG-2',
    lokasiMuatId: 'LOK-3',
    lokasiBongkarId: 'LOK-4',
    jenisKendaraan: 'Truk B3',
    dasarTarif: 'Per Rit / Trip',
    nominal: 2450000,
    tanggalMulaiBerlaku: '2026-10-15',
    status: 'Aktif',
    catatan: 'Pengangkutan limbah B3 berizin dengan manifest resmi',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'TRF-4',
    idTarif: 'TRF-004',
    pelangganId: 'PLG-3',
    lokasiMuatId: 'LOK-5',
    lokasiBongkarId: 'LOK-6',
    jenisKendaraan: 'Truk Fuso',
    dasarTarif: 'Per Ton',
    nominal: 215000,
    tanggalMulaiBerlaku: '2026-11-01',
    status: 'Aktif',
    catatan: 'Minimum charge 6 ton per keberangkatan',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'TRF-5',
    idTarif: 'TRF-005',
    pelangganId: 'PLG-4',
    lokasiMuatId: 'LOK-7',
    lokasiBongkarId: 'LOK-8',
    jenisKendaraan: 'Dump Truck',
    dasarTarif: 'Per Rit / Trip',
    nominal: 1850000,
    tanggalMulaiBerlaku: '2026-11-10',
    status: 'Aktif',
    catatan: 'Angkut material hasil sortir ke pabrik pengolahan',
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
];

export function buildInitialPerjalanan(): ArmadaPerjalanan[] {
  const mondayISO = getSeedMondayISO();
  const todayISO = getRelativeISO(0);
  return [
    {
      id: 'PRJ-1',
      nomorPenugasan: 'PRJ-001',
      nomorSuratJalan: 'SJ/SPD/2026/001',
      unitId: 'UNIT-ARM-001',
      sopirNama: 'Dedi Kurniawan',
      pelangganId: 'PLG-1',
      lokasiMuatId: 'LOK-1',
      lokasiBongkarId: 'LOK-2',
      tarifId: 'TRF-1',
      dasarTarif: 'Per Rit / Trip',
      nominalTarif: 1650000,
      tanggalMulai: mondayISO,
      jamMulai: '08:00',
      tanggalSelesai: mondayISO,
      jamSelesai: '12:00',
      status: 'Dijadwalkan',
      tahapPerjalanan: 'Belum Mulai',
      catatan: 'Jadwal muat Senin pagi di Gudang Muat Cikarang → Lokasi Bongkar Bekasi',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'PRJ-2',
      nomorPenugasan: 'PRJ-002',
      nomorSuratJalan: 'SJ/SPD/2026/002',
      unitId: 'UNIT-01',
      sopirNama: 'Rudi Hartono',
      pelangganId: 'PLG-2',
      lokasiMuatId: 'LOK-3',
      lokasiBongkarId: 'LOK-4',
      tarifId: 'TRF-3',
      dasarTarif: 'Per Rit / Trip',
      nominalTarif: 2450000,
      tanggalMulai: todayISO,
      jamMulai: '07:30',
      tanggalSelesai: todayISO,
      jamSelesai: '15:00',
      status: 'Berjalan',
      tahapPerjalanan: 'Menuju Muat',
      mulaiAktual: `${todayISO}T07:40:00`,
      catatan: 'Angkut limbah B3 dengan manifest elektronik',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'PRJ-3',
      nomorPenugasan: 'PRJ-003',
      nomorSuratJalan: 'SJ/SPD/2026/003',
      unitId: 'UNIT-04',
      sopirNama: 'Agus Salim',
      pelangganId: 'PLG-4',
      lokasiMuatId: 'LOK-7',
      lokasiBongkarId: 'LOK-8',
      tarifId: 'TRF-5',
      dasarTarif: 'Per Rit / Trip',
      nominalTarif: 1850000,
      tanggalMulai: getRelativeISO(1),
      jamMulai: '09:00',
      tanggalSelesai: getRelativeISO(1),
      jamSelesai: '14:00',
      status: 'Dijadwalkan',
      tahapPerjalanan: 'Belum Mulai',
      catatan: 'Pengiriman material sortiran ke Marunda',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
  ];
}

export function buildInitialUangJalan(): ArmadaUangJalan[] {
  const todayISO = getRelativeISO(0);
  return [
    {
      id: 'UJ-1',
      nomorUangJalan: 'UJ-001',
      perjalananId: 'PRJ-2',
      status: 'Dicairkan',
      nominalDiajukan: 500000,
      keperluan: 'BBM solar, tol Cikarang–Cileungsi, dan parkir kawasan',
      diajukanOleh: 'Admin Armada',
      tanggalDiajukan: todayISO,
      nominalDicairkan: 500000,
      tanggalPencairan: todayISO,
      metodePencairan: 'Transfer',
      buktiPencairanNama: 'TRF_BCA_UJ001.jpg',
      dicairkanOleh: 'Finance PT. SPD',
      rincianPengeluaran: [],
      totalPengeluaran: 0,
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
  ];
}

export function buildInitialSewaUnit(): ArmadaSewaUnit[] {
  const yesterdayISO = getRelativeISO(-1);
  const twoDaysAgoISO = getRelativeISO(-2);
  const tomorrowISO = getRelativeISO(1);
  return [
    {
      id: 'SEWA-1',
      nomorSewa: 'SEWA-001',
      pelangganId: 'PLG-3',
      unitId: 'UNIT-06',
      tanggalMulai: twoDaysAgoISO,
      jamMulai: '08:00',
      tanggalSelesai: yesterdayISO,
      jamSelesai: '17:00',
      modeSewa: 'Dengan Sopir',
      namaSopir: 'Yusuf Maulana',
      tarifDisepakati: 2200000,
      catatanPemesanan: 'Sewa harian antar depo MM2100 – KIIC Karawang',
      status: 'Sedang Disewa',
      serahTerimaTanggal: twoDaysAgoISO,
      serahTerimaJam: '08:15',
      kmAwal: 84210,
      kondisiAwal: 'Unit bersih, solar penuh, ban dan rem baik',
      buktiSerahTerimaNama: 'BAST_SEWA001.jpg',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'SEWA-2',
      nomorSewa: 'SEWA-002',
      pelangganId: 'PLG-1',
      unitId: 'UNIT-02',
      tanggalMulai: tomorrowISO,
      jamMulai: '09:00',
      tanggalSelesai: tomorrowISO,
      jamSelesai: '17:00',
      modeSewa: 'Lepas Kunci',
      tarifDisepakati: 1400000,
      catatanPemesanan: 'Sewa operasional gudang Cikarang',
      status: 'Dipesan',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
  ];
}

export function buildInitialP2H(): ArmadaP2HRecord[] {
  const todayISO = getRelativeISO(0);
  return [
    {
      id: 'P2H-1',
      nomorP2H: 'P2H-001',
      perjalananId: 'PRJ-2',
      nomorPenugasan: 'PRJ-002',
      unitId: 'UNIT-01',
      kodeUnit: 'SPD-B3-01',
      nomorPolisi: 'B 9421 SPD',
      sopirNama: 'Rudi Hartono',
      kilometer: 62450,
      tanggalIsi: `${todayISO}T07:15:00`,
      items: P2H_CHECKLIST_TEMPLATE.map((tpl) => ({
        ...tpl,
        kondisi: tpl.kode === 'HIDROLIK' ? 'Tidak Berlaku' : 'Baik',
      })),
      jumlahTemuan: 0,
      adaTemuanKritis: false,
      statusTinjauan: 'Lolos',
      maintenanceIds: [],
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
  ];
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
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARMADA_UNITS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const list = parsed as ArmadaUnit[];
        // Ensure ARM-001 exists if user had older seed data in browser localStorage
        const hasArm001 = list.some((u) => u.kodeUnit.toUpperCase() === 'ARM-001');
        if (!hasArm001) {
          const merged = [INITIAL_ARMADA_UNITS[0], ...list];
          localStorage.setItem(STORAGE_KEYS.ARMADA_UNITS, JSON.stringify(merged));
          return merged;
        }
        return list;
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

export function loadStoredArmadaPelanggan(): ArmadaPelanggan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARMADA_PELANGGAN);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as ArmadaPelanggan[];
    }
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEYS.ARMADA_PELANGGAN, JSON.stringify(INITIAL_ARMADA_PELANGGAN));
  return INITIAL_ARMADA_PELANGGAN;
}

export function saveStoredArmadaPelanggan(items: ArmadaPelanggan[]): void {
  localStorage.setItem(STORAGE_KEYS.ARMADA_PELANGGAN, JSON.stringify(items));
}

export function loadStoredArmadaLokasi(): ArmadaLokasi[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARMADA_LOKASI);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as ArmadaLokasi[];
    }
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEYS.ARMADA_LOKASI, JSON.stringify(INITIAL_ARMADA_LOKASI));
  return INITIAL_ARMADA_LOKASI;
}

export function saveStoredArmadaLokasi(items: ArmadaLokasi[]): void {
  localStorage.setItem(STORAGE_KEYS.ARMADA_LOKASI, JSON.stringify(items));
}

export function loadStoredArmadaTarif(): ArmadaTarif[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARMADA_TARIF);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as ArmadaTarif[];
    }
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEYS.ARMADA_TARIF, JSON.stringify(INITIAL_ARMADA_TARIF));
  return INITIAL_ARMADA_TARIF;
}

export function saveStoredArmadaTarif(items: ArmadaTarif[]): void {
  localStorage.setItem(STORAGE_KEYS.ARMADA_TARIF, JSON.stringify(items));
}

export function loadStoredArmadaPerjalanan(): ArmadaPerjalanan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARMADA_PERJALANAN);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as ArmadaPerjalanan[];
    }
  } catch {
    // fallback
  }
  const initial = buildInitialPerjalanan();
  localStorage.setItem(STORAGE_KEYS.ARMADA_PERJALANAN, JSON.stringify(initial));
  return initial;
}

export function saveStoredArmadaPerjalanan(items: ArmadaPerjalanan[]): void {
  localStorage.setItem(STORAGE_KEYS.ARMADA_PERJALANAN, JSON.stringify(items));
}

export function loadStoredArmadaUangJalan(): ArmadaUangJalan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARMADA_UANG_JALAN);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as ArmadaUangJalan[];
    }
  } catch {
    // fallback
  }
  const initial = buildInitialUangJalan();
  localStorage.setItem(STORAGE_KEYS.ARMADA_UANG_JALAN, JSON.stringify(initial));
  return initial;
}

export function saveStoredArmadaUangJalan(items: ArmadaUangJalan[]): void {
  localStorage.setItem(STORAGE_KEYS.ARMADA_UANG_JALAN, JSON.stringify(items));
}

export function loadStoredArmadaSewa(): ArmadaSewaUnit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARMADA_SEWA);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as ArmadaSewaUnit[];
    }
  } catch {
    // fallback
  }
  const initial = buildInitialSewaUnit();
  localStorage.setItem(STORAGE_KEYS.ARMADA_SEWA, JSON.stringify(initial));
  return initial;
}

export function saveStoredArmadaSewa(items: ArmadaSewaUnit[]): void {
  localStorage.setItem(STORAGE_KEYS.ARMADA_SEWA, JSON.stringify(items));
}

export function loadStoredArmadaP2H(): ArmadaP2HRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ARMADA_P2H);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as ArmadaP2HRecord[];
    }
  } catch {
    // fallback
  }
  const initial = buildInitialP2H();
  localStorage.setItem(STORAGE_KEYS.ARMADA_P2H, JSON.stringify(initial));
  return initial;
}

export function saveStoredArmadaP2H(items: ArmadaP2HRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.ARMADA_P2H, JSON.stringify(items));
}

export function loadStoredArmadaMaintenance(): ArmadaMaintenanceRequest[] {
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
