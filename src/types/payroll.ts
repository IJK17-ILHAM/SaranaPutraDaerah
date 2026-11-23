export type DivisionName = 'Karyawan limbah' | 'Supir B3' | 'Supir SPD';

export type PayrollStatus = 'Draft' | 'Approved' | 'Paid';

export type SupirSpdUnit = 'trip' | 'hari';

export interface ActiveLemburState {
  hari: boolean;
  jam: boolean;
  inap: boolean;
}

export interface PayrollRecord {
  action?: string;
  nama: string;
  nik: string;
  divisi: string;
  skema?: string;
  tipe?: string;
  satuanPokok?: 'trip' | 'hari' | string;
  periodeTanggal?: string;
  periodeBulan?: string;
  periodeWaktu?: string;
  hariKerja?: number | string;
  hadir?: number | string;
  spsHadir?: number | string;
  spsAlpha?: number | string;
  upahPerHari?: number | string;
  trip?: number | string;
  upahPerTrip?: number | string;
  lemburHari?: number | string;
  upahLemburHari?: number | string;
  nominalLemburHari?: number | string;
  jamLembur?: number | string;
  tambahanJamLembur?: number | string;
  upahPerJam?: number | string;
  nominalLemburJam?: number | string;
  inap?: number | string;
  upahPerInap?: number | string;
  nominalLemburInap?: number | string;
  lemburJenis?: string;
  lemburVolume?: number | string;
  lemburTarif?: number | string;
  lemburNominal?: number | string;
  lemburBreakdown?: string;
  gapok?: number | string;
  tunjangan?: number | string;
  potAbsen?: number | string;
  pph?: number | string;
  gajiKotor?: number | string;
  kasbon?: number | string;
  bpjs?: number | string;
  keterangan?: string;
  totalPotongan?: number | string;
  thp?: number | string;
  status?: string;
  statusBayar?: string;
  diinputOleh?: string;
  localDraftId?: string;
  savedAt?: string;
}

export interface PayrollCalculation {
  skema: DivisionName;
  isTrip: boolean;
  unitPokok: number;
  tarifPokok: number;
  gapok: number;
  lemburHari: number;
  upahLemburHari: number;
  nomHari: number;
  jamUtama: number;
  tambahanJam: number;
  totalJam: number;
  upahPerJam: number;
  nomJam: number;
  inap: number;
  upahPerInap: number;
  nomInap: number;
  lemburNominal: number;
  breakdownText: string;
  gajiKotor: number;
  kasbon: number;
  bpjs: number;
  totalPot: number;
  thp: number;
  keterangan: string;
}

export interface PayrollFilters {
  search: string;
  skema: string;
  divisi: string;
  periode: string;
  status: string;
}

export interface DivisionSummaryRow {
  divisi: string;
  count: number;
  gapok: number;
  lembur: number;
  pot: number;
  thp: number;
}
