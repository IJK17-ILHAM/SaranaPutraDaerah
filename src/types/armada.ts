export type ArmadaUnitStatus = 'Aktif' | 'Nonaktif';

export type ArmadaOperationalStatus = 'Beroperasi' | 'Stand-by' | 'Servis';

export type ArmadaMenuId =
  | 'armada-dashboard'
  | 'armada-tugas-saya'
  | 'armada-perjalanan'
  | 'armada-uang-jalan'
  | 'armada-sewa-unit'
  | 'armada-hasil-p2h'
  | 'armada-maintenance'
  | 'armada-permintaan-barang'
  | 'armada-master-unit'
  | 'armada-master-pelanggan'
  | 'armada-master-lokasi'
  | 'armada-master-tarif';

export interface ArmadaUnit {
  id: string;
  kodeUnit: string;
  nomorPolisi: string;
  jenisKendaraan: string;
  merek: string;
  model: string;
  tahun: string;
  nomorRangka: string;
  nomorMesin: string;
  status: ArmadaUnitStatus;
  divisi?: string;
  supirUtama?: string;
  lokasiTerakhir?: string;
  ruteAktif?: string;
  statusOperasional?: ArmadaOperationalStatus;
  muatanTon?: number;
  updateTerakhir?: string;
  catatan?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArmadaUnitInput {
  id?: string;
  kodeUnit: string;
  nomorPolisi: string;
  jenisKendaraan: string;
  merek: string;
  model: string;
  tahun: string;
  nomorRangka: string;
  nomorMesin: string;
  status: ArmadaUnitStatus;
  catatan?: string;
}

export interface ArmadaPelanggan {
  id: string;
  idPelanggan: string;
  namaPt: string;
  pic: string;
  kontak: string;
  status: ArmadaUnitStatus;
  catatan?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArmadaPelangganInput {
  id?: string;
  idPelanggan: string;
  namaPt: string;
  pic: string;
  kontak: string;
  status: ArmadaUnitStatus;
  catatan?: string;
}

export type ArmadaJenisLokasi = 'Muat' | 'Bongkar' | 'Keduanya';

export interface ArmadaLokasi {
  id: string;
  idLokasi: string;
  pelangganId: string;
  namaLokasi: string;
  alamatLengkap: string;
  jenisLokasi: ArmadaJenisLokasi;
  status: ArmadaUnitStatus;
  catatan?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArmadaLokasiInput {
  id?: string;
  idLokasi: string;
  pelangganId: string;
  namaLokasi: string;
  alamatLengkap: string;
  jenisLokasi: ArmadaJenisLokasi;
  status: ArmadaUnitStatus;
  catatan?: string;
}

export type ArmadaDasarTarif =
  | 'Per Rit / Trip'
  | 'Per Ton'
  | 'Per Kg'
  | 'Per Km'
  | 'Per Hari'
  | 'Borongan';

export interface ArmadaTarif {
  id: string;
  idTarif: string;
  pelangganId: string;
  lokasiMuatId: string;
  lokasiBongkarId: string;
  jenisKendaraan: string;
  dasarTarif: ArmadaDasarTarif;
  nominal: number;
  tanggalMulaiBerlaku: string;
  status: ArmadaUnitStatus;
  catatan?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArmadaTarifInput {
  id?: string;
  idTarif?: string;
  pelangganId: string;
  lokasiMuatId: string;
  lokasiBongkarId: string;
  jenisKendaraan: string;
  dasarTarif: ArmadaDasarTarif;
  nominal: number;
  tanggalMulaiBerlaku: string;
  status: ArmadaUnitStatus;
  catatan?: string;
}

// ==========================================
// PERJALANAN
// ==========================================

export type ArmadaPerjalananStatus =
  | 'Dijadwalkan'
  | 'Berjalan'
  | 'Selesai'
  | 'Dibatalkan';

export type ArmadaPerjalananTahap =
  | 'Belum Mulai'
  | 'Menuju Muat'
  | 'Selesai Muat'
  | 'Selesai Bongkar';

export interface ArmadaPerjalanan {
  id: string;
  nomorPenugasan: string;
  nomorSuratJalan?: string;
  unitId: string;
  sopirNama: string;
  pelangganId: string;
  lokasiMuatId: string;
  lokasiBongkarId: string;
  tarifId?: string;
  dasarTarif?: ArmadaDasarTarif;
  nominalTarif: number;
  tanggalMulai: string; // YYYY-MM-DD
  jamMulai: string; // HH:mm
  tanggalSelesai: string; // YYYY-MM-DD
  jamSelesai: string; // HH:mm
  status: ArmadaPerjalananStatus;
  tahapPerjalanan?: ArmadaPerjalananTahap;
  mulaiAktual?: string;
  selesaiMuatAktual?: string;
  selesaiBongkarAktual?: string;
  selesaiAktual?: string;
  buktiBongkarDataUrl?: string;
  buktiBongkarNama?: string;
  catatan?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArmadaPerjalananInput {
  id?: string;
  nomorPenugasan?: string;
  unitId: string;
  sopirNama: string;
  pelangganId: string;
  lokasiMuatId: string;
  lokasiBongkarId: string;
  tarifId?: string;
  dasarTarif?: ArmadaDasarTarif;
  nominalTarif: number;
  tanggalMulai: string;
  jamMulai: string;
  tanggalSelesai: string;
  jamSelesai: string;
  catatan?: string;
}

// ==========================================
// UANG JALAN
// ==========================================

export type UangJalanStatus =
  | 'Diajukan'
  | 'Dicairkan'
  | 'Dipertanggungjawabkan'
  | 'Selesai';

export type PengeluaranKategori = 'Tol' | 'BBM' | 'Parkir' | 'Makan / Harian' | 'Lainnya';

export interface UangJalanExpenseItem {
  id: string;
  kategori: PengeluaranKategori;
  keterangan: string;
  nominal: number;
  buktiDataUrl?: string;
  buktiNama?: string;
}

export interface ArmadaUangJalan {
  id: string;
  nomorUangJalan: string;
  perjalananId: string;
  status: UangJalanStatus;
  // Tahap 1: Diajukan (Admin Armada)
  nominalDiajukan: number;
  keperluan: string;
  diajukanOleh: string;
  tanggalDiajukan: string;
  // Tahap 2: Dicairkan (Finance)
  nominalDicairkan?: number;
  tanggalPencairan?: string;
  metodePencairan?: 'Tunai' | 'Transfer';
  buktiPencairanDataUrl?: string;
  buktiPencairanNama?: string;
  dicairkanOleh?: string;
  kasOpsPencairanId?: string;
  // Tahap 3: Dipertanggungjawabkan (Sopir / Admin Armada)
  rincianPengeluaran: UangJalanExpenseItem[];
  totalPengeluaran: number;
  tanggalPertanggungjawaban?: string;
  dipertanggungjawabkanOleh?: string;
  catatanPertanggungjawaban?: string;
  // Tahap 4: Selesai (Finance)
  selisih?: number; // dicairkan - totalPengeluaran (>0 sisa dikembalikan, <0 kekurangan dibayar)
  statusPenyelesaian?: 'Pas' | 'Sisa Dikembalikan' | 'Kekurangan Dibayarkan';
  tanggalPenyelesaian?: string;
  metodePenyelesaian?: 'Tunai' | 'Transfer';
  catatanVerifikasi?: string;
  diverifikasiOleh?: string;
  kasOpsPenyelesaianId?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// SEWA UNIT
// ==========================================

export type SewaUnitStatus = 'Dipesan' | 'Sedang Disewa' | 'Dikembalikan';
export type SewaMode = 'Dengan Sopir' | 'Lepas Kunci';

export interface ArmadaSewaUnit {
  id: string;
  nomorSewa: string;
  pelangganId: string;
  unitId: string;
  tanggalMulai: string; // YYYY-MM-DD
  jamMulai: string; // HH:mm
  tanggalSelesai: string; // YYYY-MM-DD
  jamSelesai: string; // HH:mm
  modeSewa: SewaMode;
  namaSopir?: string;
  tarifDisepakati: number;
  catatanPemesanan?: string;
  status: SewaUnitStatus;
  // Tahap 2: Serahkan Unit -> Sedang Disewa
  serahTerimaTanggal?: string; // YYYY-MM-DD
  serahTerimaJam?: string; // HH:mm
  kmAwal?: number;
  kondisiAwal?: string;
  buktiSerahTerimaDataUrl?: string;
  buktiSerahTerimaNama?: string;
  // Tahap 3: Terima Kembali Unit -> Dikembalikan
  kembaliTanggal?: string; // YYYY-MM-DD
  kembaliJam?: string; // HH:mm
  kmAkhir?: number;
  kondisiKembali?: string;
  catatanKerusakan?: string;
  buktiKembaliDataUrl?: string;
  buktiKembaliNama?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// P2H KENDARAAN & MAINTENANCE
// ==========================================

export type P2HCondition = 'Baik' | 'Ada Temuan' | 'Tidak Berlaku';

export interface P2HChecklistItem {
  kode: string;
  label: string;
  kategori: string;
  kritis: boolean;
  bolehTidakBerlaku?: boolean;
  kondisi: P2HCondition;
  catatan?: string;
  fotoDataUrl?: string;
  fotoNama?: string;
}

export type P2HReviewStatus =
  | 'Lolos'
  | 'Menunggu Tinjauan'
  | 'Ditahan (Temuan Kritis)'
  | 'Dalam Perbaikan'
  | 'Selesai / Lulus Ulang';

export interface ArmadaP2HRecord {
  id: string;
  nomorP2H: string;
  perjalananId: string;
  nomorPenugasan: string;
  unitId: string;
  kodeUnit: string;
  nomorPolisi: string;
  sopirNama: string;
  kilometer: number;
  tanggalIsi: string; // ISO
  isPemeriksaanUlang?: boolean;
  items: P2HChecklistItem[];
  jumlahTemuan: number;
  adaTemuanKritis: boolean;
  statusTinjauan: P2HReviewStatus;
  catatanAdmin?: string;
  maintenanceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type MaintenanceStatus =
  | 'Diajukan'
  | 'Ditinjau'
  | 'Dikerjakan'
  | 'Menunggu Barang'
  | 'Selesai';

export type MaintenancePriority = 'Rendah' | 'Sedang' | 'Tinggi' | 'Kritis';

export interface ArmadaMaintenanceRequest {
  id: string;
  nomorPengajuan: string;
  sumber: 'Temuan P2H' | 'Laporan Manual';
  unitId: string;
  kodeUnit: string;
  nomorPolisi: string;
  perjalananId?: string;
  p2hId?: string;
  nomorP2H?: string;
  itemTemuan?: string;
  kritis: boolean;
  kilometer: number;
  catatan: string; // keluhan
  fotoDataUrl?: string;
  fotoNama?: string;
  status: MaintenanceStatus;
  diajukanOleh: string;
  tanggalDiajukan: string;
  // Tahap 2: Ditinjau (Kepala Armada)
  prioritas?: MaintenancePriority;
  mekanikAtauBengkel?: string;
  ditinjauOleh?: string;
  tanggalDitinjau?: string;
  catatanTinjauan?: string;
  // Tahap 3: Dikerjakan / Menunggu Barang (Mekanik)
  tindakanPerbaikan?: string;
  // Tahap 4: Selesai (Mekanik & Kepala Armada)
  hasilPekerjaan?: string;
  tanggalSelesai?: string;
  hasilPemeriksaanUlang?: string;
  pemeriksaanUlangOleh?: string;
  tanggalPemeriksaanUlang?: string;
  penahananDilepas?: boolean;
  tanggalPenahananDilepas?: string;
  createdAt: string;
  updatedAt: string;
}

export type PermintaanBarangStatus =
  | 'Diajukan'
  | 'Disetujui'
  | 'Terpenuhi Sebagian'
  | 'Terpenuhi';

export interface PermintaanBarangItem {
  id: string;
  namaBarang: string;
  satuan: string;
  jumlahDiminta: number;
  jumlahDisetujui: number;
  jumlahDiterima: number;
  catatan?: string;
}

export interface ArmadaPermintaanBarang {
  id: string;
  nomorPermintaan: string;
  maintenanceId: string;
  nomorPengajuanPerbaikan: string;
  unitId: string;
  kodeUnit: string;
  nomorPolisi: string;
  tanggalPermintaan: string;
  dimintaOleh: string;
  items: PermintaanBarangItem[];
  status: PermintaanBarangStatus;
  catatan?: string;
  createdAt: string;
  updatedAt: string;
}

export type ArmadaKendalaKategori =
  | 'Masalah Kendaraan'
  | 'Keterlambatan'
  | 'Kendala Lokasi Muat–Bongkar'
  | 'Lainnya';

export type ArmadaKendalaStatus = 'Dilaporkan' | 'Ditindaklanjuti' | 'Selesai';

export interface ArmadaKendalaReport {
  id: string;
  nomorLaporan: string;
  perjalananId: string;
  nomorPenugasan: string;
  unitId: string;
  kodeUnit: string;
  nomorPolisi: string;
  sopirNama: string;
  kategori: ArmadaKendalaKategori;
  catatan: string;
  fotoDataUrl?: string;
  fotoNama?: string;
  status: ArmadaKendalaStatus;
  tindakLanjutAdmin?: string;
  maintenanceId?: string;
  nomorPengajuanPerbaikan?: string;
  waktuLapor: string; // ISO
  updatedAt: string;
}
