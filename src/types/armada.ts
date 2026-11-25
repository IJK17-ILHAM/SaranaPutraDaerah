export type ArmadaUnitStatus = 'Aktif' | 'Nonaktif';

export type ArmadaOperationalStatus = 'Beroperasi' | 'Stand-by' | 'Servis';

export type ArmadaMenuId = 'armada-dashboard' | 'armada-master-unit';

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
