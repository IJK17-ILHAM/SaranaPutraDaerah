import type {
  KtKasOps,
  KtPaymentRecord,
  KtStockMutation,
  KtTransaction,
} from '../types/kasTonase';
import { getTodayISO, normalizeDateISO, normalizeInvoiceCode } from './format';

export type BukuKasFlow = 'Masuk' | 'Keluar' | 'Nonkas';

export interface BukuKasEntry {
  id: string;
  tanggal: string;
  flow: BukuKasFlow;
  kategori: string;
  uraian: string;
  mitra: string;
  metode: string;
  notaRef?: string;
  trxId?: string;
  kasMasuk: number;
  kasKeluar: number;
  nonKas: number;
  saldoSetelah: number;
  sumberType: 'payment' | 'kasOps';
  sourceId: string;
}

/**
 * Synthesizes initial payment records for transactions that have dibayar/potongUtang
 * but do not yet have any explicit payment ledger records (legacy cache / SPS sync).
 */
export function buildInitialPaymentsForTransaction(
  trx: KtTransaction,
  actor = 'Admin',
): KtPaymentRecord[] {
  const out: KtPaymentRecord[] = [];
  const tgl = normalizeDateISO(trx.tanggal) || trx.tanggal || getTodayISO();

  const invCode = normalizeInvoiceCode(trx.nota);

  if ((trx.dibayar || 0) > 0) {
    const metode: 'Tunai' | 'Transfer' = trx.metode === 'Transfer' ? 'Transfer' : 'Tunai';
    out.push({
      id: `PAY_INIT_${trx.id}`,
      trxId: trx.id,
      nota: invCode,
      tipe: trx.tipe,
      customer: trx.customer,
      tanggal: tgl,
      nominal: trx.dibayar,
      metode,
      isNonKas: false,
      source: 'awal',
      catatan: 'Pembayaran saat transaksi',
      diinputOleh: trx.diinputOleh || actor,
    });
  }

  if (trx.tipe === 'Beli' && (trx.potongUtang || 0) > 0) {
    out.push({
      id: `PAY_POTONG_${trx.id}`,
      trxId: trx.id,
      nota: invCode,
      tipe: 'Beli',
      customer: trx.customer,
      tanggal: tgl,
      nominal: trx.potongUtang || 0,
      metode: 'Potong Utang Pemasok',
      isNonKas: true,
      source: 'awal',
      catatan:
        trx.potongUtangMode === 'persen' && trx.potongUtangInput
          ? `Potong utang pemasok (${trx.potongUtangInput}% dari nota)`
          : 'Potong utang pemasok pada nota beli',
      diinputOleh: trx.diinputOleh || actor,
    });
  }

  return out;
}

export function hydratePaymentsFromTransactions(
  transactions: KtTransaction[],
  existingPayments: KtPaymentRecord[],
): KtPaymentRecord[] {
  const normalizedExisting = existingPayments.map((p) => ({
    ...p,
    nota: normalizeInvoiceCode(p.nota),
    tanggal: normalizeDateISO(p.tanggal) || p.tanggal || getTodayISO(),
  }));

  const coveredTrxIds = new Set(normalizedExisting.map((p) => p.trxId));
  const synthesized: KtPaymentRecord[] = [];

  transactions.forEach((trx) => {
    if (coveredTrxIds.has(trx.id)) return;
    synthesized.push(...buildInitialPaymentsForTransaction(trx));
  });

  return [...normalizedExisting, ...synthesized];
}

export function buildStockMutationsForTransaction(
  trx: KtTransaction,
  actor = 'Admin',
): KtStockMutation[] {
  const tgl = normalizeDateISO(trx.tanggal) || trx.tanggal || getTodayISO();
  const isBeli = trx.tipe === 'Beli';

  return (trx.items || [])
    .filter((it) => (it.netto || 0) > 0)
    .map((it, idx) => ({
      id: `STK_${trx.id}_${idx}`,
      tanggal: tgl,
      barangId: it.barangId,
      barangNama: it.nama,
      jenis: isBeli ? 'Masuk' : 'Keluar',
      deltaKg: isBeli ? Math.abs(it.netto) : -Math.abs(it.netto),
      sumber: isBeli ? 'Nota Beli' : 'Nota Jual',
      notaRef: normalizeInvoiceCode(trx.nota),
      trxId: trx.id,
      mitra: trx.customer,
      alasan: isBeli
        ? `Pembelian tonase dari ${trx.customer}`
        : `Penjualan tonase ke ${trx.customer}`,
      diinputOleh: trx.diinputOleh || actor,
    }));
}

export function hydrateStockMutationsFromTransactions(
  transactions: KtTransaction[],
  existingMutations: KtStockMutation[],
): KtStockMutation[] {
  const normalizedExisting = existingMutations.map((m) => ({
    ...m,
    notaRef: m.notaRef ? normalizeInvoiceCode(m.notaRef) : undefined,
    tanggal: normalizeDateISO(m.tanggal) || m.tanggal || getTodayISO(),
  }));

  const coveredTrxIds = new Set(
    normalizedExisting.filter((m) => m.trxId).map((m) => m.trxId as string),
  );
  const synthesized: KtStockMutation[] = [];

  transactions.forEach((trx) => {
    if (coveredTrxIds.has(trx.id)) return;
    synthesized.push(...buildStockMutationsForTransaction(trx));
  });

  return [...normalizedExisting, ...synthesized];
}

/**
 * Builds the cash-basis Buku Kas ledger ordered chronologically with running cash balance,
 * returned newest-first for display.
 * - Real cash movements (Tunai/Transfer payments + Kas Operasional) affect running saldo kas
 *   strictly on their actual payment date.
 * - Potong Utang Pemasok entries appear transparently as Pelunasan Nonkas (saldo delta = 0).
 */
export function buildBukuKasEntries(
  payments: KtPaymentRecord[],
  kasOps: KtKasOps[],
): BukuKasEntry[] {
  const raw: Array<Omit<BukuKasEntry, 'saldoSetelah'> & { sortOrder: number }> = [];

  payments.forEach((p, idx) => {
    const tgl = normalizeDateISO(p.tanggal) || p.tanggal || getTodayISO();
    const nom = Math.max(0, p.nominal || 0);
    if (nom <= 0) return;

    if (p.isNonKas || p.metode === 'Potong Utang Pemasok') {
      raw.push({
        id: `BK_${p.id}`,
        tanggal: tgl,
        flow: 'Nonkas',
        kategori: 'Pelunasan Nonkas',
        uraian: p.catatan || `Potong utang pemasok (${p.nota})`,
        mitra: p.customer,
        metode: 'Potong Utang Pemasok',
        notaRef: p.nota,
        trxId: p.trxId,
        kasMasuk: 0,
        kasKeluar: 0,
        nonKas: nom,
        sumberType: 'payment',
        sourceId: p.id,
        sortOrder: idx,
      });
      return;
    }

    const isMasuk = p.tipe === 'Jual';
    raw.push({
      id: `BK_${p.id}`,
      tanggal: tgl,
      flow: isMasuk ? 'Masuk' : 'Keluar',
      kategori: isMasuk
        ? p.source === 'cicilan'
          ? 'Pelunasan Piutang Nota'
          : 'Penjualan Tonase'
        : p.source === 'cicilan'
          ? 'Pelunasan Hutang Nota'
          : 'Pembelian Tonase',
      uraian:
        p.catatan ||
        (isMasuk ? `Pembayaran Nota Jual ${p.nota}` : `Pembayaran Nota Beli ${p.nota}`),
      mitra: p.customer,
      metode: p.metode || 'Tunai',
      notaRef: p.nota,
      trxId: p.trxId,
      kasMasuk: isMasuk ? nom : 0,
      kasKeluar: isMasuk ? 0 : nom,
      nonKas: 0,
      sumberType: 'payment',
      sourceId: p.id,
      sortOrder: idx,
    });
  });

  kasOps.forEach((k, idx) => {
    const tgl = normalizeDateISO(k.tanggal) || k.tanggal || getTodayISO();
    const nom = Math.max(0, k.nominal || 0);
    if (nom <= 0) return;
    const isMasuk = k.jenis === 'Masuk';
    raw.push({
      id: `BK_${k.id}`,
      tanggal: tgl,
      flow: isMasuk ? 'Masuk' : 'Keluar',
      kategori: isMasuk ? 'Kas Masuk Lainnya' : 'Kas Operasional',
      uraian: k.ket || '-',
      mitra: k.mitra || '-',
      metode: k.metode || 'Tunai',
      kasMasuk: isMasuk ? nom : 0,
      kasKeluar: isMasuk ? 0 : nom,
      nonKas: 0,
      sumberType: 'kasOps',
      sourceId: k.id,
      sortOrder: 10000 + idx,
    });
  });

  // Sort chronologically (oldest first) to compute accurate running cash balance
  const asc = [...raw].sort((a, b) => {
    const cmp = (a.tanggal || '').localeCompare(b.tanggal || '');
    if (cmp !== 0) return cmp;
    return a.sortOrder - b.sortOrder;
  });

  let runningBalance = 0;
  const withSaldo: BukuKasEntry[] = asc.map((item) => {
    runningBalance += item.kasMasuk - item.kasKeluar;
    const { sortOrder: _omit, ...entry } = item;
    return {
      ...entry,
      saldoSetelah: runningBalance,
    };
  });

  // Return newest first for ledger tables
  return withSaldo.reverse();
}
