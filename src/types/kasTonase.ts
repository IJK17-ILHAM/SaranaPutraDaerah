export interface KtBarang {
  id: string;
  nama: string;
  hargaBeli: number;
  hargaJual: number;
  potDefault: number;
  stokKg: number;
  minKg: number;
}

export type CustomerType = 'Supplier & Buyer' | 'Supplier' | 'Buyer' | string;

export interface KtCustomer {
  id: string;
  nama: string;
  tipe: CustomerType;
  plat: string;
  telp: string;
}

export type KtTrxType = 'Beli' | 'Jual';
export type KtPaymentMethod = 'Tunai' | 'Transfer' | 'Hutang';
export type PotongUtangMode = 'persen' | 'rupiah';

export interface KtTransactionItem {
  barangId: string;
  nama: string;
  harga: number;
  bruto: number;
  tara: number;
  pot: number;
  netto: number;
  subtotal: number;
}

export interface KtTransaction {
  id: string;
  nota: string;
  tanggal: string;
  tipe: KtTrxType;
  customer: string;
  plat: string;
  metode: KtPaymentMethod | string;
  items: KtTransactionItem[];
  totalNetto: number;
  totalBayar: number;
  potongUtang?: number;
  potongUtangMode?: PotongUtangMode;
  potongUtangInput?: number;
  sisaUtangMitraSetelah?: number;
  dibayar: number;
  sisa: number;
  catatan?: string;
  diinputOleh?: string;
}

export interface KtPiutangCicilan {
  id: string;
  tanggal: string;
  nominal: number;
  sumber: 'Potong Nota Beli' | 'Bayar Langsung';
  metode?: 'Tunai' | 'Transfer' | 'Potong Utang Pemasok';
  notaRef?: string;
  trxId?: string;
  keterangan?: string;
}

export interface KtPiutangMitra {
  id: string;
  kode: string;
  tanggal: string;
  customer: string;
  keterangan: string;
  nominalAwal: number;
  terbayar: number;
  sisa: number;
  cicilan: KtPiutangCicilan[];
  diinputOleh?: string;
}

export type KtPaymentRecordMethod = 'Tunai' | 'Transfer' | 'Potong Utang Pemasok';

export interface KtPaymentRecord {
  id: string;
  trxId: string;
  nota: string;
  tipe: KtTrxType;
  customer: string;
  tanggal: string;
  nominal: number;
  metode: KtPaymentRecordMethod;
  isNonKas: boolean;
  source?: 'awal' | 'cicilan';
  catatan?: string;
  diinputOleh?: string;
}

export type KtStockMutationType = 'Masuk' | 'Keluar' | 'Opname';

export interface KtStockMutation {
  id: string;
  tanggal: string;
  barangId: string;
  barangNama: string;
  jenis: KtStockMutationType;
  deltaKg: number;
  stokSetelahKg?: number;
  sumber: 'Nota Beli' | 'Nota Jual' | 'Stok Opname';
  notaRef?: string;
  trxId?: string;
  mitra?: string;
  alasan?: string;
  diinputOleh?: string;
}

export interface KtKasOps {
  id: string;
  tanggal: string;
  jenis: 'Masuk' | 'Keluar';
  ket: string;
  nominal: number;
  metode?: 'Tunai' | 'Transfer';
  mitra?: string;
  diinputOleh?: string;
}

export type KtDashboardPeriod = 'month' | 'week' | 'today' | 'ALL';
