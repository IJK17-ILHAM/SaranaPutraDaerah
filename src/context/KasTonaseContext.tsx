import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '../config/constants';
import { createSampleKtData } from '../data/sampleData';
import { fetchTonaseAllFromSPS, syncTonaseAction } from '../services/tonaseApi';
import type {
  KtBarang,
  KtCustomer,
  KtKasOps,
  KtPaymentRecord,
  KtPaymentRecordMethod,
  KtPiutangCicilan,
  KtPiutangMitra,
  KtStockMutation,
  KtTransaction,
} from '../types/kasTonase';
import {
  formatRupiah,
  getTodayISO,
  normalizeDateISO,
  normalizeInvoiceCode,
} from '../utils/format';
import {
  buildInitialPaymentsForTransaction,
  buildStockMutationsForTransaction,
  hydratePaymentsFromTransactions,
  hydrateStockMutationsFromTransactions,
} from '../utils/kasLedger';
import type {
  ImportedHutangNotaRow,
  ImportedPiutangMitraRow,
} from '../utils/hutangSpreadsheet';
import type {
  ImportedKtBarangRow,
  ImportedKtCustomerRow,
} from '../utils/ktMasterSpreadsheet';
import { useApp } from './AppContext';

export interface AddPiutangMitraInput {
  tanggal: string;
  customer: string;
  keterangan: string;
  nominalAwal: number;
  catatKasKeluar?: boolean;
  metode?: 'Tunai' | 'Transfer';
}

export interface PayHutangInput {
  trxId: string;
  tanggal: string;
  nominal: number;
  metode: KtPaymentRecordMethod;
  catatan?: string;
}

export interface PayPiutangMitraOptions {
  tanggal?: string;
  metode?: 'Tunai' | 'Transfer';
  catatKasMasuk?: boolean;
  keterangan?: string;
}

interface KasTonaseContextValue {
  barangList: KtBarang[];
  customers: KtCustomer[];
  transactions: KtTransaction[];
  kasOps: KtKasOps[];
  piutangMitra: KtPiutangMitra[];
  payments: KtPaymentRecord[];
  stockMutations: KtStockMutation[];
  syncStatus: string;
  isSyncing: boolean;
  editingTransaction: KtTransaction | null;
  setEditingTransaction: (trx: KtTransaction | null) => void;
  refreshTonase: (notify?: boolean) => Promise<void>;
  saveTransaction: (trx: KtTransaction, editId: string | null) => Promise<KtTransaction>;
  deleteTransaction: (id: string) => void;
  adjustStok: (
    barangId: string,
    stokKg: number,
    minKg: number,
    alasan?: string,
    tanggal?: string,
  ) => void;
  saveBarang: (barang: Omit<KtBarang, 'id' | 'stokKg'>, editId?: string) => void;
  deleteBarang: (id: string) => void;
  saveCustomer: (customer: Omit<KtCustomer, 'id'>, editId?: string) => void;
  deleteCustomer: (id: string) => void;
  payHutang: (input: PayHutangInput) => void;
  deletePaymentRecord: (paymentId: string) => void;
  addPiutangMitra: (input: AddPiutangMitraInput) => void;
  payPiutangMitra: (
    piutangId: string,
    amount: number,
    options?: boolean | PayPiutangMitraOptions,
  ) => void;
  deletePiutangMitra: (piutangId: string) => void;
  saveKasOps: (kas: Omit<KtKasOps, 'id'>) => void;
  deleteKasOps: (id: string) => void;
  getCustomerOutstanding: (name: string) => {
    hutang: number;
    piutang: number;
    piutangNota: number;
    piutangMitra: number;
  };
  getSupplierDebt: (name: string, excludeTrxId?: string | null) => number;
  importHutangPiutangBatch: (payload: {
    notas: ImportedHutangNotaRow[];
    mitras: ImportedPiutangMitraRow[];
  }) => { notasImported: number; mitrasImported: number };
  importKtMasterBatch: (payload: {
    barang: ImportedKtBarangRow[];
    customers: ImportedKtCustomerRow[];
  }) => { barangImported: number; customersImported: number };
  seedSampleData: () => void;
  clearAllData: () => void;
}

const KasTonaseContext = createContext<KasTonaseContextValue | null>(null);

function loadInitialKtState() {
  if (!localStorage.getItem(STORAGE_KEYS.KT_INITIALIZED)) {
    const sample = createSampleKtData();
    const payments = hydratePaymentsFromTransactions(sample.transactions, []);
    const stockMutations = hydrateStockMutationsFromTransactions(sample.transactions, []);
    localStorage.setItem(STORAGE_KEYS.KT_BARANG, JSON.stringify(sample.barang));
    localStorage.setItem(STORAGE_KEYS.KT_CUSTOMERS, JSON.stringify(sample.customers));
    localStorage.setItem(STORAGE_KEYS.KT_TRANSACTIONS, JSON.stringify(sample.transactions));
    localStorage.setItem(STORAGE_KEYS.KT_KASOPS, JSON.stringify(sample.kasOps));
    localStorage.setItem(STORAGE_KEYS.KT_PIUTANG_MITRA, JSON.stringify(sample.piutangMitra));
    localStorage.setItem(STORAGE_KEYS.KT_PAYMENTS, JSON.stringify(payments));
    localStorage.setItem(STORAGE_KEYS.KT_STOCK_MUTATIONS, JSON.stringify(stockMutations));
    localStorage.setItem(STORAGE_KEYS.KT_INITIALIZED, '1');
    return { ...sample, payments, stockMutations };
  }

  try {
    const rawPiutang = localStorage.getItem(STORAGE_KEYS.KT_PIUTANG_MITRA);
    let piutangMitra: KtPiutangMitra[];
    if (rawPiutang === null) {
      piutangMitra = createSampleKtData().piutangMitra;
      localStorage.setItem(STORAGE_KEYS.KT_PIUTANG_MITRA, JSON.stringify(piutangMitra));
    } else {
      piutangMitra = JSON.parse(rawPiutang || '[]') as KtPiutangMitra[];
    }

    const parsedTransactions = (
      JSON.parse(localStorage.getItem(STORAGE_KEYS.KT_TRANSACTIONS) || '[]') as KtTransaction[]
    ).map((t) => ({
      ...t,
      nota: normalizeInvoiceCode(t.nota),
      tanggal: normalizeDateISO(t.tanggal) || String(t.tanggal || ''),
    }));

    const parsedKasOps = (
      JSON.parse(localStorage.getItem(STORAGE_KEYS.KT_KASOPS) || '[]') as KtKasOps[]
    ).map((k) => ({
      ...k,
      tanggal: normalizeDateISO(k.tanggal) || String(k.tanggal || ''),
    }));

    const normalizedPiutang = piutangMitra.map((pm) => ({
      ...pm,
      tanggal: normalizeDateISO(pm.tanggal) || String(pm.tanggal || ''),
      cicilan: Array.isArray(pm.cicilan)
        ? pm.cicilan.map((c) => ({
            ...c,
            tanggal: normalizeDateISO(c.tanggal) || String(c.tanggal || ''),
            notaRef: c.notaRef ? normalizeInvoiceCode(c.notaRef) : undefined,
          }))
        : [],
    }));

    const rawPayments = localStorage.getItem(STORAGE_KEYS.KT_PAYMENTS);
    const storedPayments = rawPayments
      ? (JSON.parse(rawPayments) as KtPaymentRecord[])
      : [];
    const hydratedPayments = hydratePaymentsFromTransactions(parsedTransactions, storedPayments);

    const rawMutations = localStorage.getItem(STORAGE_KEYS.KT_STOCK_MUTATIONS);
    const storedMutations = rawMutations
      ? (JSON.parse(rawMutations) as KtStockMutation[])
      : [];
    const hydratedMutations = hydrateStockMutationsFromTransactions(
      parsedTransactions,
      storedMutations,
    );

    if (rawPayments === null) {
      localStorage.setItem(STORAGE_KEYS.KT_PAYMENTS, JSON.stringify(hydratedPayments));
    }
    if (rawMutations === null) {
      localStorage.setItem(STORAGE_KEYS.KT_STOCK_MUTATIONS, JSON.stringify(hydratedMutations));
    }

    return {
      barang: JSON.parse(localStorage.getItem(STORAGE_KEYS.KT_BARANG) || '[]') as KtBarang[],
      customers: JSON.parse(
        localStorage.getItem(STORAGE_KEYS.KT_CUSTOMERS) || '[]',
      ) as KtCustomer[],
      transactions: parsedTransactions,
      kasOps: parsedKasOps,
      piutangMitra: normalizedPiutang,
      payments: hydratedPayments,
      stockMutations: hydratedMutations,
    };
  } catch {
    return {
      barang: [],
      customers: [],
      transactions: [],
      kasOps: [],
      piutangMitra: [],
      payments: [],
      stockMutations: [],
    };
  }
}

function applyStockDelta(list: KtBarang[], trx: KtTransaction, multiplier: 1 | -1): KtBarang[] {
  return list.map((b) => {
    const matchingItems = (trx.items || []).filter(
      (it) => it.barangId === b.id || it.nama === b.nama,
    );
    if (!matchingItems.length) return b;
    const totalDelta = matchingItems.reduce((acc, it) => {
      const sign = trx.tipe === 'Beli' ? 1 : -1;
      return acc + (it.netto || 0) * sign * multiplier;
    }, 0);
    return { ...b, stokKg: Math.max(0, (b.stokKg || 0) + totalDelta) };
  });
}

function reversePiutangByRefId(
  piutangList: KtPiutangMitra[],
  refId: string,
): KtPiutangMitra[] {
  return piutangList.map((pm) => {
    const removed = (pm.cicilan || []).filter(
      (c) => c.trxId === refId || c.id === refId || c.id.startsWith(`${refId}_`),
    );
    if (!removed.length) return pm;
    const remainingCicilan = (pm.cicilan || []).filter(
      (c) => c.trxId !== refId && c.id !== refId && !c.id.startsWith(`${refId}_`),
    );
    const terbayar = remainingCicilan.reduce((sum, c) => sum + (c.nominal || 0), 0);
    const sisa = Math.max(0, (pm.nominalAwal || 0) - terbayar);
    return { ...pm, cicilan: remainingCicilan, terbayar, sisa };
  });
}

function applyPotongUtangToMitra(
  piutangList: KtPiutangMitra[],
  transactionsList: KtTransaction[],
  customerName: string,
  potongAmount: number,
  opts: {
    tanggal: string;
    nota: string;
    trxId: string;
    refPrefix?: string;
    keterangan?: string;
  },
): {
  nextPiutang: KtPiutangMitra[];
  nextTransactions: KtTransaction[];
  sisaSetelah: number;
} {
  const target = customerName.trim().toLowerCase();
  let remainingToDeduct = Math.max(0, Math.round(potongAmount));

  // Apply FIFO to open Piutang Mitra records (oldest first)
  const sortedIds = piutangList
    .filter((pm) => pm.customer.trim().toLowerCase() === target && pm.sisa > 0)
    .sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || ''))
    .map((pm) => pm.id);

  const deductionMap: Record<string, number> = {};
  for (const pmId of sortedIds) {
    if (remainingToDeduct <= 0) break;
    const pm = piutangList.find((x) => x.id === pmId);
    if (!pm || pm.sisa <= 0) continue;
    const applied = Math.min(pm.sisa, remainingToDeduct);
    deductionMap[pmId] = applied;
    remainingToDeduct -= applied;
  }

  const nextPiutang = piutangList.map((pm, idx) => {
    const applied = deductionMap[pm.id] || 0;
    if (applied <= 0) return pm;
    const newCicilan: KtPiutangCicilan = {
      id: opts.refPrefix
        ? `${opts.refPrefix}_${idx}`
        : `CCL${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tanggal: opts.tanggal || getTodayISO(),
      nominal: applied,
      sumber: 'Potong Nota Beli',
      metode: 'Potong Utang Pemasok',
      notaRef: opts.nota,
      trxId: opts.trxId,
      keterangan: opts.keterangan || `Potong Utang dari Nota Beli ${opts.nota}`,
    };
    const nextCicilan = [newCicilan, ...(pm.cicilan || [])];
    const terbayar = nextCicilan.reduce((sum, c) => sum + (c.nominal || 0), 0);
    const sisa = Math.max(0, (pm.nominalAwal || 0) - terbayar);
    return { ...pm, cicilan: nextCicilan, terbayar, sisa };
  });

  // If there is still remainder (e.g. supplier owed us via unpaid Jual invoice), reduce Jual invoices FIFO
  const nextTransactions = transactionsList.map((t) => {
    if (
      remainingToDeduct <= 0 ||
      t.tipe !== 'Jual' ||
      t.sisa <= 0 ||
      t.customer.trim().toLowerCase() !== target
    ) {
      return t;
    }
    const applied = Math.min(t.sisa, remainingToDeduct);
    remainingToDeduct -= applied;
    const dibayar = (t.dibayar || 0) + applied;
    const sisa = Math.max(0, (t.totalBayar || 0) - dibayar);
    return { ...t, dibayar, sisa };
  });

  const remPiutang = nextPiutang
    .filter((pm) => pm.customer.trim().toLowerCase() === target)
    .reduce((sum, pm) => sum + (pm.sisa || 0), 0);
  const remJual = nextTransactions
    .filter((t) => t.tipe === 'Jual' && t.customer.trim().toLowerCase() === target)
    .reduce((sum, t) => sum + (t.sisa || 0), 0);

  return {
    nextPiutang,
    nextTransactions,
    sisaSetelah: remPiutang + remJual,
  };
}

export function KasTonaseProvider({ children }: { children: React.ReactNode }) {
  const { user, showToast } = useApp();
  const [initial] = useState(loadInitialKtState);

  const [barangList, setBarangList] = useState<KtBarang[]>(initial.barang);
  const [customers, setCustomers] = useState<KtCustomer[]>(initial.customers);
  const [transactions, setTransactions] = useState<KtTransaction[]>(initial.transactions);
  const [kasOps, setKasOps] = useState<KtKasOps[]>(initial.kasOps);
  const [piutangMitra, setPiutangMitra] = useState<KtPiutangMitra[]>(initial.piutangMitra);
  const [payments, setPayments] = useState<KtPaymentRecord[]>(initial.payments);
  const [stockMutations, setStockMutations] = useState<KtStockMutation[]>(initial.stockMutations);
  const [syncStatus, setSyncStatus] = useState('siap');
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<KtTransaction | null>(null);

  const persist = useCallback(
    (
      b: KtBarang[],
      c: KtCustomer[],
      t: KtTransaction[],
      k: KtKasOps[],
      pm: KtPiutangMitra[],
      pay: KtPaymentRecord[],
      mut: KtStockMutation[],
    ) => {
      localStorage.setItem(STORAGE_KEYS.KT_BARANG, JSON.stringify(b));
      localStorage.setItem(STORAGE_KEYS.KT_CUSTOMERS, JSON.stringify(c));
      localStorage.setItem(STORAGE_KEYS.KT_TRANSACTIONS, JSON.stringify(t));
      localStorage.setItem(STORAGE_KEYS.KT_KASOPS, JSON.stringify(k));
      localStorage.setItem(STORAGE_KEYS.KT_PIUTANG_MITRA, JSON.stringify(pm));
      localStorage.setItem(STORAGE_KEYS.KT_PAYMENTS, JSON.stringify(pay));
      localStorage.setItem(STORAGE_KEYS.KT_STOCK_MUTATIONS, JSON.stringify(mut));
      localStorage.setItem(STORAGE_KEYS.KT_INITIALIZED, '1');
    },
    [],
  );

  const syncRemote = useCallback(async (action: string, payload: Record<string, unknown>) => {
    setSyncStatus('menyimpan...');
    try {
      const res = await syncTonaseAction(action, payload);
      setSyncStatus(res && res.status === 'error' ? 'tersimpan lokal' : 'tersinkron SPS');
    } catch {
      setSyncStatus('tersimpan lokal (offline)');
    }
  }, []);

  const syncChangedPiutang = useCallback(
    (prevList: KtPiutangMitra[], nextList: KtPiutangMitra[]) => {
      const prevMap = new Map(prevList.map((pm) => [pm.id, pm]));
      nextList.forEach((pm) => {
        const old = prevMap.get(pm.id);
        if (
          !old ||
          old.terbayar !== pm.terbayar ||
          old.sisa !== pm.sisa ||
          (old.cicilan || []).length !== (pm.cicilan || []).length
        ) {
          syncRemote('savePiutangMitra', {
            ...pm,
            cicilan: JSON.stringify(pm.cicilan || []),
          });
        }
      });
    },
    [syncRemote],
  );

  const refreshTonase = useCallback(
    async (notify = false) => {
      setIsSyncing(true);
      setSyncStatus('sinkronisasi...');
      try {
        const parsed = await fetchTonaseAllFromSPS();
        let nextB = barangList;
        let nextC = customers;
        let nextT = transactions;
        let nextK = kasOps;
        let nextPm = piutangMitra;

        if (parsed.barang) {
          nextB = parsed.barang;
          setBarangList(nextB);
        }
        if (parsed.customers) {
          nextC = parsed.customers;
          setCustomers(nextC);
        }
        if (parsed.transactions) {
          nextT = parsed.transactions;
          setTransactions(nextT);
        }
        if (parsed.kasOps) {
          nextK = parsed.kasOps;
          setKasOps(nextK);
        }
        if (parsed.piutangMitra) {
          nextPm = parsed.piutangMitra;
          setPiutangMitra(nextPm);
        }

        const basePayments = parsed.payments !== undefined ? parsed.payments : payments;
        const baseMutations =
          parsed.stockMutations !== undefined ? parsed.stockMutations : stockMutations;
        const nextPay = hydratePaymentsFromTransactions(nextT, basePayments);
        const nextMut = hydrateStockMutationsFromTransactions(nextT, baseMutations);
        setPayments(nextPay);
        setStockMutations(nextMut);

        if (parsed.updated) {
          persist(nextB, nextC, nextT, nextK, nextPm, nextPay, nextMut);
        }
        setSyncStatus('tersinkron SPS');
        if (notify) {
          showToast('Sinkronisasi data Kas & Tonase dari Google SPS berhasil.', 'success');
        }
      } catch {
        setSyncStatus('mode cache lokal');
        if (notify) {
          showToast('Menggunakan cache lokal Kas & Tonase.', 'warning');
        }
      } finally {
        setIsSyncing(false);
      }
    },
    [
      barangList,
      customers,
      kasOps,
      payments,
      persist,
      piutangMitra,
      showToast,
      stockMutations,
      transactions,
    ],
  );

  useEffect(() => {
    if (user) {
      refreshTonase(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const getSupplierDebt = useCallback(
    (name: string, excludeTrxId?: string | null) => {
      if (!name) return 0;
      const target = name.trim().toLowerCase();
      const basePiutang = excludeTrxId
        ? reversePiutangByRefId(piutangMitra, excludeTrxId)
        : piutangMitra;

      const pmTotal = basePiutang
        .filter((pm) => pm.customer.trim().toLowerCase() === target && (pm.sisa || 0) > 0)
        .reduce((sum, pm) => sum + (pm.sisa || 0), 0);

      const jualTotal = transactions
        .filter(
          (t) =>
            t.tipe === 'Jual' &&
            t.customer.trim().toLowerCase() === target &&
            (t.sisa || 0) > 0,
        )
        .reduce((sum, t) => sum + (t.sisa || 0), 0);

      return pmTotal + jualTotal;
    },
    [piutangMitra, transactions],
  );

  const getCustomerOutstanding = useCallback(
    (name: string) => {
      if (!name) return { hutang: 0, piutang: 0, piutangNota: 0, piutangMitra: 0 };
      const target = name.trim().toLowerCase();
      let hutang = 0;
      let piutangNota = 0;
      let piutangMitraTotal = 0;

      transactions.forEach((t) => {
        if ((t.customer || '').trim().toLowerCase() === target && (t.sisa || 0) > 0) {
          if (t.tipe === 'Beli') hutang += t.sisa;
          else piutangNota += t.sisa;
        }
      });

      piutangMitra.forEach((pm) => {
        if ((pm.customer || '').trim().toLowerCase() === target && (pm.sisa || 0) > 0) {
          piutangMitraTotal += pm.sisa;
        }
      });

      return {
        hutang,
        piutang: piutangNota + piutangMitraTotal,
        piutangNota,
        piutangMitra: piutangMitraTotal,
      };
    },
    [piutangMitra, transactions],
  );

  const saveTransaction = useCallback(
    async (trxObj: KtTransaction, editId: string | null): Promise<KtTransaction> => {
      const actor = user ? user.nama || user.username : 'Admin';
      let nextBarang = [...barangList];
      let nextTransactions = [...transactions];
      let nextPiutang = [...piutangMitra];
      let nextPayments = [...payments];
      let nextMutations = [...stockMutations];

      if (editId) {
        const oldIdx = nextTransactions.findIndex((t) => t.id === editId);
        if (oldIdx >= 0) {
          nextBarang = applyStockDelta(nextBarang, nextTransactions[oldIdx], -1);
          nextTransactions.splice(oldIdx, 1);
        }
        nextPiutang = reversePiutangByRefId(nextPiutang, editId);
        // Remove previous initial auto-payments and stock mutations for this nota
        nextPayments = nextPayments.filter((p) => p.trxId !== editId || p.source === 'cicilan');
        nextMutations = nextMutations.filter((m) => m.trxId !== editId);
      }

      let finalTrx: KtTransaction = {
        ...trxObj,
        nota: normalizeInvoiceCode(trxObj.nota),
        tanggal: normalizeDateISO(trxObj.tanggal) || trxObj.tanggal || getTodayISO(),
      };

      if (finalTrx.tipe === 'Beli' && (finalTrx.potongUtang || 0) > 0) {
        const appliedResult = applyPotongUtangToMitra(
          nextPiutang,
          nextTransactions,
          finalTrx.customer,
          finalTrx.potongUtang || 0,
          {
            tanggal: finalTrx.tanggal,
            nota: finalTrx.nota,
            trxId: finalTrx.id,
            keterangan:
              finalTrx.potongUtangMode === 'persen' && finalTrx.potongUtangInput
                ? `Potong ${finalTrx.potongUtangInput}% dari Nota Beli ${finalTrx.nota}`
                : `Potong Utang dari Nota Beli ${finalTrx.nota}`,
          },
        );
        nextPiutang = appliedResult.nextPiutang;
        nextTransactions = appliedResult.nextTransactions;
        finalTrx = {
          ...finalTrx,
          sisaUtangMitraSetelah: appliedResult.sisaSetelah,
        };
      }

      // Sync initial payment records (preserving any follow-up cicilan payments on edit)
      const existingCicilanCash = editId
        ? nextPayments
            .filter((p) => p.trxId === editId && p.source === 'cicilan' && !p.isNonKas)
            .reduce((s, p) => s + (p.nominal || 0), 0)
        : 0;
      const existingCicilanNonKas = editId
        ? nextPayments
            .filter((p) => p.trxId === editId && p.source === 'cicilan' && p.isNonKas)
            .reduce((s, p) => s + (p.nominal || 0), 0)
        : 0;

      const initialCashPortion = Math.max(0, (finalTrx.dibayar || 0) - existingCicilanCash);
      const initialPotongPortion = Math.max(0, (finalTrx.potongUtang || 0) - existingCicilanNonKas);

      const initPayments = buildInitialPaymentsForTransaction(
        {
          ...finalTrx,
          dibayar: initialCashPortion,
          potongUtang: initialPotongPortion,
        },
        actor,
      );
      nextPayments = [...initPayments, ...nextPayments];

      // Update stock & log stock mutations
      nextBarang = applyStockDelta(nextBarang, finalTrx, 1);
      const newMutations = buildStockMutationsForTransaction(finalTrx, actor);
      nextMutations = [...newMutations, ...nextMutations];
      nextTransactions = [finalTrx, ...nextTransactions];

      let nextCustomers = [...customers];
      if (!nextCustomers.some((c) => c.nama.toLowerCase() === finalTrx.customer.toLowerCase())) {
        const newCust: KtCustomer = {
          id: `CST${Date.now()}`,
          nama: finalTrx.customer,
          tipe: finalTrx.tipe === 'Beli' ? 'Supplier' : 'Buyer',
          plat: finalTrx.plat,
          telp: '-',
        };
        nextCustomers = [...nextCustomers, newCust];
        syncRemote('saveCustomer', newCust as unknown as Record<string, unknown>);
      }

      setBarangList(nextBarang);
      setTransactions(nextTransactions);
      setCustomers(nextCustomers);
      setPiutangMitra(nextPiutang);
      setPayments(nextPayments);
      setStockMutations(nextMutations);
      setEditingTransaction(null);
      persist(
        nextBarang,
        nextCustomers,
        nextTransactions,
        kasOps,
        nextPiutang,
        nextPayments,
        nextMutations,
      );

      syncRemote('saveTransaction', {
        ...finalTrx,
        items: JSON.stringify(finalTrx.items),
        barangJson: JSON.stringify(nextBarang),
        initialCashPortion,
        initialPotongPortion,
      });
      syncChangedPiutang(piutangMitra, nextPiutang);

      return finalTrx;
    },
    [
      barangList,
      customers,
      kasOps,
      payments,
      persist,
      piutangMitra,
      stockMutations,
      syncChangedPiutang,
      syncRemote,
      transactions,
      user,
    ],
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      const target = transactions.find((t) => t.id === id);
      if (!target) return;
      const nextBarang = applyStockDelta(barangList, target, -1);
      const nextTrx = transactions.filter((t) => t.id !== id);
      const nextPiutang = reversePiutangByRefId(piutangMitra, id);
      const nextPayments = payments.filter((p) => p.trxId !== id);
      const nextMutations = stockMutations.filter((m) => m.trxId !== id);

      setBarangList(nextBarang);
      setTransactions(nextTrx);
      setPiutangMitra(nextPiutang);
      setPayments(nextPayments);
      setStockMutations(nextMutations);
      persist(nextBarang, customers, nextTrx, kasOps, nextPiutang, nextPayments, nextMutations);
      syncRemote('deleteTransaction', { id, barangJson: JSON.stringify(nextBarang) });
      syncChangedPiutang(piutangMitra, nextPiutang);
      showToast(
        (target.potongUtang || 0) > 0
          ? `Nota ${target.nota} dihapus, stok dan saldo utang pemasok dikembalikan.`
          : `Nota ${target.nota} dihapus dan stok dikembalikan.`,
        'info',
      );
    },
    [
      barangList,
      customers,
      kasOps,
      payments,
      persist,
      piutangMitra,
      showToast,
      stockMutations,
      syncChangedPiutang,
      syncRemote,
      transactions,
    ],
  );

  const addPiutangMitra = useCallback(
    (input: AddPiutangMitraInput) => {
      const cleanCustomer = input.customer.trim();
      const nominal = Math.max(0, Math.round(input.nominalAwal));
      if (!cleanCustomer || nominal <= 0) return;

      const kode = `PM-${String(piutangMitra.length + 1).padStart(3, '0')}`;
      const tgl = normalizeDateISO(input.tanggal) || input.tanggal || getTodayISO();
      const newRecord: KtPiutangMitra = {
        id: `PM${Date.now()}`,
        kode,
        tanggal: tgl,
        customer: cleanCustomer,
        keterangan: input.keterangan.trim() || 'Pinjaman / Kasbon Mitra',
        nominalAwal: nominal,
        terbayar: 0,
        sisa: nominal,
        cicilan: [],
        diinputOleh: user ? user.nama || user.username : 'Admin',
      };

      const nextPiutang = [newRecord, ...piutangMitra];
      let nextKas = kasOps;
      if (input.catatKasKeluar) {
        const kasEntry: KtKasOps = {
          id: `KOPS${Date.now()}`,
          tanggal: tgl,
          jenis: 'Keluar',
          ket: `Pinjaman / Piutang Mitra ${cleanCustomer} (${kode})`,
          nominal,
          metode: input.metode || 'Transfer',
          mitra: cleanCustomer,
          diinputOleh: user ? user.nama || user.username : 'Admin',
        };
        nextKas = [kasEntry, ...kasOps];
        syncRemote('saveKasOps', kasEntry as unknown as Record<string, unknown>);
      }

      let nextCustomers = customers;
      if (!customers.some((c) => c.nama.toLowerCase() === cleanCustomer.toLowerCase())) {
        const newCust: KtCustomer = {
          id: `CST${Date.now()}`,
          nama: cleanCustomer,
          tipe: 'Supplier',
          plat: '',
          telp: '-',
        };
        nextCustomers = [...customers, newCust];
        syncRemote('saveCustomer', newCust as unknown as Record<string, unknown>);
      }

      setPiutangMitra(nextPiutang);
      setKasOps(nextKas);
      setCustomers(nextCustomers);
      persist(
        barangList,
        nextCustomers,
        transactions,
        nextKas,
        nextPiutang,
        payments,
        stockMutations,
      );
      syncRemote('savePiutangMitra', {
        ...newRecord,
        cicilan: JSON.stringify(newRecord.cicilan),
      });
      showToast(
        `Piutang mitra ${cleanCustomer} sebesar ${formatRupiah(nominal)} dicatat.`,
        'success',
      );
    },
    [
      barangList,
      customers,
      kasOps,
      payments,
      persist,
      piutangMitra,
      showToast,
      stockMutations,
      syncRemote,
      transactions,
      user,
    ],
  );

  const payPiutangMitra = useCallback(
    (piutangId: string, amount: number, options?: boolean | PayPiutangMitraOptions) => {
      const target = piutangMitra.find((p) => p.id === piutangId);
      if (!target || amount <= 0) return;

      const opts: PayPiutangMitraOptions =
        typeof options === 'boolean' ? { catatKasMasuk: options } : options || {};
      const catatKasMasuk = opts.catatKasMasuk ?? true;
      const tgl = normalizeDateISO(opts.tanggal) || opts.tanggal || getTodayISO();
      const metode = opts.metode || 'Transfer';

      const actualPaid = Math.min(target.sisa, Math.round(amount));
      const newCicilan: KtPiutangCicilan = {
        id: `CCL${Date.now()}`,
        tanggal: tgl,
        nominal: actualPaid,
        sumber: 'Bayar Langsung',
        metode,
        keterangan: opts.keterangan?.trim() || `Cicilan langsung (${metode})`,
      };

      const nextPiutang = piutangMitra.map((pm) => {
        if (pm.id !== piutangId) return pm;
        const cicilan = [newCicilan, ...(pm.cicilan || [])];
        const terbayar = cicilan.reduce((sum, c) => sum + (c.nominal || 0), 0);
        const sisa = Math.max(0, (pm.nominalAwal || 0) - terbayar);
        return { ...pm, cicilan, terbayar, sisa };
      });

      let nextKas = kasOps;
      if (catatKasMasuk) {
        const kasEntry: KtKasOps = {
          id: `KOPS${Date.now()}`,
          tanggal: tgl,
          jenis: 'Masuk',
          ket: `Cicilan Piutang Mitra ${target.customer} (${target.kode})`,
          nominal: actualPaid,
          metode,
          mitra: target.customer,
          diinputOleh: user ? user.nama || user.username : 'Admin',
        };
        nextKas = [kasEntry, ...kasOps];
        syncRemote('saveKasOps', kasEntry as unknown as Record<string, unknown>);
      }

      setPiutangMitra(nextPiutang);
      setKasOps(nextKas);
      persist(
        barangList,
        customers,
        transactions,
        nextKas,
        nextPiutang,
        payments,
        stockMutations,
      );

      const updatedPm = nextPiutang.find((pm) => pm.id === piutangId);
      if (updatedPm) {
        syncRemote('savePiutangMitra', {
          ...updatedPm,
          cicilan: JSON.stringify(updatedPm.cicilan || []),
        });
      }

      const sisaNow = Math.max(0, target.sisa - actualPaid);
      showToast(
        sisaNow === 0
          ? `Piutang ${target.customer} (${target.kode}) telah LUNAS!`
          : `Cicilan ${formatRupiah(actualPaid)} dicatat. Sisa: ${formatRupiah(sisaNow)}`,
        'success',
      );
    },
    [
      barangList,
      customers,
      kasOps,
      payments,
      persist,
      piutangMitra,
      showToast,
      stockMutations,
      syncRemote,
      transactions,
      user,
    ],
  );

  const deletePiutangMitra = useCallback(
    (piutangId: string) => {
      const nextPiutang = piutangMitra.filter((p) => p.id !== piutangId);
      setPiutangMitra(nextPiutang);
      persist(
        barangList,
        customers,
        transactions,
        kasOps,
        nextPiutang,
        payments,
        stockMutations,
      );
      syncRemote('deletePiutangMitra', { id: piutangId });
      showToast('Catatan piutang mitra dihapus.', 'info');
    },
    [
      barangList,
      customers,
      kasOps,
      payments,
      persist,
      piutangMitra,
      showToast,
      stockMutations,
      syncRemote,
      transactions,
    ],
  );

  const adjustStok = useCallback(
    (
      barangId: string,
      stokKg: number,
      minKg: number,
      alasan?: string,
      tanggal?: string,
    ) => {
      const existing = barangList.find((b) => b.id === barangId);
      if (!existing) return;

      const oldStok = existing.stokKg || 0;
      const deltaKg = stokKg - oldStok;
      const nextBarang = barangList.map((b) =>
        b.id === barangId ? { ...b, stokKg, minKg } : b,
      );
      const updated = nextBarang.find((b) => b.id === barangId);

      let nextMutations = stockMutations;
      let opnameMutation: KtStockMutation | null = null;
      if (deltaKg !== 0) {
        const actor = user ? user.nama || user.username : 'Admin';
        opnameMutation = {
          id: `STK_OPN_${Date.now()}`,
          tanggal: normalizeDateISO(tanggal) || tanggal || getTodayISO(),
          barangId: existing.id,
          barangNama: existing.nama,
          jenis: 'Opname',
          deltaKg,
          stokSetelahKg: stokKg,
          sumber: 'Stok Opname',
          alasan: alasan?.trim() || 'Koreksi stok opname gudang',
          diinputOleh: actor,
        };
        nextMutations = [opnameMutation, ...stockMutations];
      }

      setBarangList(nextBarang);
      setStockMutations(nextMutations);
      persist(
        nextBarang,
        customers,
        transactions,
        kasOps,
        piutangMitra,
        payments,
        nextMutations,
      );
      if (updated) {
        syncRemote('saveBarang', updated as unknown as Record<string, unknown>);
        if (opnameMutation) {
          syncRemote('saveStockMutation', opnameMutation as unknown as Record<string, unknown>);
        }
        showToast(
          deltaKg !== 0
            ? `Stok opname ${updated.nama} diperbarui (${deltaKg > 0 ? '+' : ''}${deltaKg} kg → ${stokKg} kg).`
            : `Batas minimum ${updated.nama} diperbarui menjadi ${minKg} kg.`,
          'success',
        );
      }
    },
    [
      barangList,
      customers,
      kasOps,
      payments,
      persist,
      piutangMitra,
      showToast,
      stockMutations,
      syncRemote,
      transactions,
      user,
    ],
  );

  const saveBarang = useCallback(
    (data: Omit<KtBarang, 'id' | 'stokKg'>, editId?: string) => {
      let nextBarang: KtBarang[];
      let savedObj: KtBarang;

      if (editId) {
        const existing = barangList.find((b) => b.id === editId);
        savedObj = {
          id: editId,
          stokKg: existing?.stokKg ?? 0,
          ...data,
        };
        nextBarang = barangList.map((b) => (b.id === editId ? savedObj : b));
      } else {
        savedObj = {
          id: `BRG${Date.now()}`,
          stokKg: 0,
          ...data,
        };
        nextBarang = [...barangList, savedObj];
      }

      setBarangList(nextBarang);
      persist(nextBarang, customers, transactions, kasOps, piutangMitra, payments, stockMutations);
      syncRemote('saveBarang', savedObj as unknown as Record<string, unknown>);
      showToast(`Data barang ${savedObj.nama} disimpan.`, 'success');
    },
    [
      barangList,
      customers,
      kasOps,
      payments,
      persist,
      piutangMitra,
      showToast,
      stockMutations,
      syncRemote,
      transactions,
    ],
  );

  const deleteBarang = useCallback(
    (id: string) => {
      const nextBarang = barangList.filter((b) => b.id !== id);
      setBarangList(nextBarang);
      persist(nextBarang, customers, transactions, kasOps, piutangMitra, payments, stockMutations);
      syncRemote('deleteBarang', { id });
      showToast('Barang dihapus dari daftar.', 'info');
    },
    [
      barangList,
      customers,
      kasOps,
      payments,
      persist,
      piutangMitra,
      showToast,
      stockMutations,
      syncRemote,
      transactions,
    ],
  );

  const saveCustomer = useCallback(
    (data: Omit<KtCustomer, 'id'>, editId?: string) => {
      let nextCustomers: KtCustomer[];
      let savedObj: KtCustomer;

      if (editId) {
        savedObj = { id: editId, ...data };
        nextCustomers = customers.map((c) => (c.id === editId ? savedObj : c));
      } else {
        savedObj = { id: `CST${Date.now()}`, ...data };
        nextCustomers = [...customers, savedObj];
      }

      setCustomers(nextCustomers);
      persist(barangList, nextCustomers, transactions, kasOps, piutangMitra, payments, stockMutations);
      syncRemote('saveCustomer', savedObj as unknown as Record<string, unknown>);
      showToast(`Mitra ${savedObj.nama} berhasil disimpan.`, 'success');
    },
    [
      barangList,
      customers,
      kasOps,
      payments,
      persist,
      piutangMitra,
      showToast,
      stockMutations,
      syncRemote,
      transactions,
    ],
  );

  const deleteCustomer = useCallback(
    (id: string) => {
      const nextCustomers = customers.filter((c) => c.id !== id);
      setCustomers(nextCustomers);
      persist(barangList, nextCustomers, transactions, kasOps, piutangMitra, payments, stockMutations);
      syncRemote('deleteCustomer', { id });
      showToast('Data customer dihapus.', 'info');
    },
    [
      barangList,
      customers,
      kasOps,
      payments,
      persist,
      piutangMitra,
      showToast,
      stockMutations,
      syncRemote,
      transactions,
    ],
  );

  const payHutang = useCallback(
    (input: PayHutangInput) => {
      const target = transactions.find((t) => t.id === input.trxId);
      if (!target || input.nominal <= 0 || target.sisa <= 0) return;

      const actor = user ? user.nama || user.username : 'Admin';
      const tgl = normalizeDateISO(input.tanggal) || input.tanggal || getTodayISO();
      const isNonKas = input.metode === 'Potong Utang Pemasok';

      let maxAllowed = target.sisa;
      if (isNonKas) {
        if (target.tipe !== 'Beli') {
          showToast('Potong Utang Pemasok hanya berlaku untuk Nota Beli.', 'warning');
          return;
        }
        const availDebt = getSupplierDebt(target.customer);
        if (availDebt <= 0) {
          showToast(`Tidak ada sisa utang pemasok aktif untuk ${target.customer}.`, 'warning');
          return;
        }
        maxAllowed = Math.min(target.sisa, availDebt);
      }

      const actualPaid = Math.min(maxAllowed, Math.round(input.nominal));
      if (actualPaid <= 0) return;

      const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newPayment: KtPaymentRecord = {
        id: paymentId,
        trxId: target.id,
        nota: target.nota,
        tipe: target.tipe,
        customer: target.customer,
        tanggal: tgl,
        nominal: actualPaid,
        metode: input.metode,
        isNonKas,
        source: 'cicilan',
        catatan:
          input.catatan?.trim() ||
          (isNonKas
            ? `Pelunasan nonkas potong utang pemasok (${target.nota})`
            : `Pembayaran ${input.metode} (${target.nota})`),
        diinputOleh: actor,
      };

      const nextPotongUtang = (target.potongUtang || 0) + (isNonKas ? actualPaid : 0);
      const nextDibayar = (target.dibayar || 0) + (isNonKas ? 0 : actualPaid);
      const nextSisa = Math.max(0, (target.totalBayar || 0) - nextPotongUtang - nextDibayar);

      let nextPiutang = piutangMitra;
      let nextTrx = transactions.map((t) =>
        t.id === target.id
          ? { ...t, dibayar: nextDibayar, potongUtang: nextPotongUtang, sisa: nextSisa }
          : t,
      );

      if (isNonKas) {
        const applied = applyPotongUtangToMitra(
          nextPiutang,
          nextTrx,
          target.customer,
          actualPaid,
          {
            tanggal: tgl,
            nota: target.nota,
            trxId: target.id,
            refPrefix: paymentId,
            keterangan:
              input.catatan?.trim() || `Potong utang pemasok saat pelunasan ${target.nota}`,
          },
        );
        nextPiutang = applied.nextPiutang;
        nextTrx = applied.nextTransactions.map((t) =>
          t.id === target.id ? { ...t, sisaUtangMitraSetelah: applied.sisaSetelah } : t,
        );
      }

      const nextPayments = [newPayment, ...payments];

      setTransactions(nextTrx);
      setPiutangMitra(nextPiutang);
      setPayments(nextPayments);
      persist(
        barangList,
        customers,
        nextTrx,
        kasOps,
        nextPiutang,
        nextPayments,
        stockMutations,
      );

      const updatedTargetTrx = nextTrx.find((t) => t.id === target.id);
      syncRemote('payHutang', {
        id: target.id,
        nota: normalizeInvoiceCode(target.nota),
        tipe: target.tipe,
        customer: target.customer,
        dibayar: nextDibayar,
        potongUtang: nextPotongUtang,
        sisa: nextSisa,
        sisaUtangMitraSetelah: updatedTargetTrx?.sisaUtangMitraSetelah,
        paymentId,
        tanggalBayar: tgl,
        nominalBayar: actualPaid,
        metodeBayar: input.metode,
        isNonKas: isNonKas ? 'true' : 'false',
        catatan: newPayment.catatan || '',
        diinputOleh: actor,
      });
      if (isNonKas) {
        syncChangedPiutang(piutangMitra, nextPiutang);
      }

      showToast(
        nextSisa === 0
          ? `Nota ${normalizeInvoiceCode(target.nota)} telah LUNAS (${input.metode} · ${tgl})!`
          : `Pembayaran ${formatRupiah(actualPaid)} (${input.metode}) dicatat pada ${tgl}. Sisa: ${formatRupiah(nextSisa)}`,
        'success',
      );
    },
    [
      barangList,
      customers,
      getSupplierDebt,
      kasOps,
      payments,
      persist,
      piutangMitra,
      showToast,
      stockMutations,
      syncChangedPiutang,
      syncRemote,
      transactions,
      user,
    ],
  );

  const deletePaymentRecord = useCallback(
    (paymentId: string) => {
      const targetPay = payments.find((p) => p.id === paymentId);
      if (!targetPay) return;

      const nextPayments = payments.filter((p) => p.id !== paymentId);
      let nextPiutang = piutangMitra;

      if (targetPay.isNonKas) {
        nextPiutang = reversePiutangByRefId(piutangMitra, paymentId);
      }

      const nextTrx = transactions.map((t) => {
        if (t.id !== targetPay.trxId) return t;
        const nextDibayar = targetPay.isNonKas
          ? t.dibayar || 0
          : Math.max(0, (t.dibayar || 0) - targetPay.nominal);
        const nextPotong = targetPay.isNonKas
          ? Math.max(0, (t.potongUtang || 0) - targetPay.nominal)
          : t.potongUtang || 0;
        const nextSisa = Math.max(0, (t.totalBayar || 0) - nextPotong - nextDibayar);
        return { ...t, dibayar: nextDibayar, potongUtang: nextPotong, sisa: nextSisa };
      });

      setPayments(nextPayments);
      setTransactions(nextTrx);
      setPiutangMitra(nextPiutang);
      persist(
        barangList,
        customers,
        nextTrx,
        kasOps,
        nextPiutang,
        nextPayments,
        stockMutations,
      );
      const updatedTrx = nextTrx.find((t) => t.id === targetPay.trxId);
      syncRemote('deletePayment', {
        paymentId,
        trxId: targetPay.trxId,
        dibayar: updatedTrx?.dibayar ?? 0,
        potongUtang: updatedTrx?.potongUtang ?? 0,
        sisa: updatedTrx?.sisa ?? 0,
      });
      if (targetPay.isNonKas) {
        syncChangedPiutang(piutangMitra, nextPiutang);
      }

      showToast(
        `Catatan pembayaran ${formatRupiah(targetPay.nominal)} pada ${normalizeInvoiceCode(targetPay.nota)} dibatalkan.`,
        'info',
      );
    },
    [
      barangList,
      customers,
      kasOps,
      payments,
      persist,
      piutangMitra,
      showToast,
      stockMutations,
      syncChangedPiutang,
      syncRemote,
      transactions,
    ],
  );

  const saveKasOps = useCallback(
    (data: Omit<KtKasOps, 'id'>) => {
      const newKas: KtKasOps = {
        id: `KOPS${Date.now()}`,
        ...data,
        tanggal: normalizeDateISO(data.tanggal) || data.tanggal || getTodayISO(),
        metode: data.metode || 'Tunai',
        diinputOleh: user ? user.nama || user.username : 'Admin',
      };
      const nextKas = [newKas, ...kasOps];
      setKasOps(nextKas);
      persist(
        barangList,
        customers,
        transactions,
        nextKas,
        piutangMitra,
        payments,
        stockMutations,
      );
      syncRemote('saveKasOps', newKas as unknown as Record<string, unknown>);
      showToast('Catatan kas operasional ditambahkan.', 'success');
    },
    [
      barangList,
      customers,
      kasOps,
      payments,
      persist,
      piutangMitra,
      showToast,
      stockMutations,
      syncRemote,
      transactions,
      user,
    ],
  );

  const deleteKasOps = useCallback(
    (id: string) => {
      const nextKas = kasOps.filter((k) => k.id !== id);
      setKasOps(nextKas);
      persist(
        barangList,
        customers,
        transactions,
        nextKas,
        piutangMitra,
        payments,
        stockMutations,
      );
      syncRemote('deleteKasOps', { id });
      showToast('Catatan kas operasional dihapus.', 'info');
    },
    [
      barangList,
      customers,
      kasOps,
      payments,
      persist,
      piutangMitra,
      showToast,
      stockMutations,
      syncRemote,
      transactions,
    ],
  );

  const seedSampleData = useCallback(() => {
    const sample = createSampleKtData();
    const nextPayments = hydratePaymentsFromTransactions(sample.transactions, []);
    const nextMutations = hydrateStockMutationsFromTransactions(sample.transactions, []);
    setBarangList(sample.barang);
    setCustomers(sample.customers);
    setTransactions(sample.transactions);
    setKasOps(sample.kasOps);
    setPiutangMitra(sample.piutangMitra);
    setPayments(nextPayments);
    setStockMutations(nextMutations);
    persist(
      sample.barang,
      sample.customers,
      sample.transactions,
      sample.kasOps,
      sample.piutangMitra,
      nextPayments,
      nextMutations,
    );
    showToast('Data contoh Kas & Tonase berhasil dimuat ulang.', 'success');
  }, [persist, showToast]);

  const importHutangPiutangBatch = useCallback(
    (payload: { notas: ImportedHutangNotaRow[]; mitras: ImportedPiutangMitraRow[] }) => {
      const actor = user ? user.nama || user.username : 'Admin';
      const now = Date.now();
      let nextTransactions = [...transactions];
      let nextPiutang = [...piutangMitra];
      let nextPayments = [...payments];
      let nextCustomers = [...customers];

      const ensureCustomer = (name: string, tipe: 'Supplier' | 'Buyer', plat = '') => {
        const clean = name.trim();
        if (!clean) return;
        const exists = nextCustomers.some((c) => c.nama.toLowerCase() === clean.toLowerCase());
        if (!exists) {
          const newCust: KtCustomer = {
            id: `CST_IMP_${now}_${nextCustomers.length + 1}`,
            nama: clean,
            tipe,
            plat,
            telp: '-',
          };
          nextCustomers = [...nextCustomers, newCust];
          syncRemote('saveCustomer', newCust as unknown as Record<string, unknown>);
        }
      };

      let notasImported = 0;
      const newTrxToPrepend: KtTransaction[] = [];

      payload.notas.forEach((row, idx) => {
        const generatedNota =
          row.nota ||
          `NT-IMP-${String(nextTransactions.length + newTrxToPrepend.length + idx + 1).padStart(3, '0')}`;
        const existingIdx = nextTransactions.findIndex(
          (t) => t.nota.toLowerCase() === generatedNota.toLowerCase(),
        );

        ensureCustomer(row.customer, row.tipe === 'Beli' ? 'Supplier' : 'Buyer', row.plat);

        if (existingIdx >= 0) {
          const prev = nextTransactions[existingIdx];
          const updated: KtTransaction = {
            ...prev,
            tanggal: row.tanggal || prev.tanggal,
            tipe: row.tipe,
            customer: row.customer,
            plat: row.plat || prev.plat,
            metode: row.metode,
            totalNetto: row.totalNetto || prev.totalNetto,
            totalBayar: row.totalBayar,
            dibayar: row.dibayar,
            sisa: row.sisa,
            catatan: row.catatan || prev.catatan,
          };
          nextTransactions[existingIdx] = updated;
          syncRemote('saveTransaction', {
            ...updated,
            items: JSON.stringify(updated.items || []),
          });
        } else {
          const created: KtTransaction = {
            id: `TRX_IMP_${now}_${idx + 1}`,
            nota: generatedNota,
            tanggal: row.tanggal || getTodayISO(),
            tipe: row.tipe,
            customer: row.customer,
            plat: row.plat,
            metode: row.metode,
            items: [],
            totalNetto: row.totalNetto,
            totalBayar: row.totalBayar,
            dibayar: row.dibayar,
            sisa: row.sisa,
            catatan: row.catatan || 'Impor saldo Hutang & Piutang Excel',
            diinputOleh: actor,
          };
          newTrxToPrepend.push(created);
          const initialPays = buildInitialPaymentsForTransaction(created, actor);
          if (initialPays.length > 0) {
            nextPayments = [...initialPays, ...nextPayments];
            initialPays.forEach((p) => {
              syncRemote('savePayment', p as unknown as Record<string, unknown>);
            });
          }
          syncRemote('saveTransaction', {
            ...created,
            items: JSON.stringify(created.items || []),
          });
        }
        notasImported += 1;
      });

      if (newTrxToPrepend.length > 0) {
        nextTransactions = [...newTrxToPrepend, ...nextTransactions];
      }

      let mitrasImported = 0;
      const newMitraToPrepend: KtPiutangMitra[] = [];

      payload.mitras.forEach((row, idx) => {
        const generatedKode =
          row.kode ||
          `PM-${String(nextPiutang.length + newMitraToPrepend.length + 1).padStart(3, '0')}`;
        const existingIdx = nextPiutang.findIndex(
          (p) => p.kode.toLowerCase() === generatedKode.toLowerCase(),
        );

        ensureCustomer(row.customer, 'Supplier');

        if (existingIdx >= 0) {
          const prev = nextPiutang[existingIdx];
          const updated: KtPiutangMitra = {
            ...prev,
            tanggal: row.tanggal || prev.tanggal,
            customer: row.customer,
            keterangan: row.keterangan || prev.keterangan,
            nominalAwal: row.nominalAwal,
            terbayar: row.terbayar,
            sisa: row.sisa,
          };
          nextPiutang[existingIdx] = updated;
          syncRemote('savePiutangMitra', {
            ...updated,
            cicilan: JSON.stringify(updated.cicilan || []),
          });
        } else {
          const initialCicilan: KtPiutangCicilan[] =
            row.terbayar > 0
              ? [
                  {
                    id: `CCL_IMP_${now}_${idx + 1}`,
                    tanggal: row.tanggal || getTodayISO(),
                    nominal: row.terbayar,
                    sumber: 'Bayar Langsung',
                    metode: 'Transfer',
                    keterangan: 'Cicilan awal (Impor Excel)',
                  },
                ]
              : [];
          const created: KtPiutangMitra = {
            id: `PM_IMP_${now}_${idx + 1}`,
            kode: generatedKode,
            tanggal: row.tanggal || getTodayISO(),
            customer: row.customer,
            keterangan: row.keterangan,
            nominalAwal: row.nominalAwal,
            terbayar: row.terbayar,
            sisa: row.sisa,
            cicilan: initialCicilan,
            diinputOleh: actor,
          };
          newMitraToPrepend.push(created);
          syncRemote('savePiutangMitra', {
            ...created,
            cicilan: JSON.stringify(created.cicilan),
          });
        }
        mitrasImported += 1;
      });

      if (newMitraToPrepend.length > 0) {
        nextPiutang = [...newMitraToPrepend, ...nextPiutang];
      }

      if (notasImported > 0 || mitrasImported > 0) {
        setTransactions(nextTransactions);
        setPiutangMitra(nextPiutang);
        setPayments(nextPayments);
        setCustomers(nextCustomers);
        persist(
          barangList,
          nextCustomers,
          nextTransactions,
          kasOps,
          nextPiutang,
          nextPayments,
          stockMutations,
        );
        showToast(
          `Impor berhasil: ${notasImported} nota & ${mitrasImported} piutang mitra disimpan.`,
          'success',
        );
      }

      return { notasImported, mitrasImported };
    },
    [
      barangList,
      customers,
      kasOps,
      payments,
      persist,
      piutangMitra,
      showToast,
      stockMutations,
      syncRemote,
      transactions,
      user,
    ],
  );

  const importKtMasterBatch = useCallback(
    (payload: { barang: ImportedKtBarangRow[]; customers: ImportedKtCustomerRow[] }) => {
      const now = Date.now();
      let nextBarang = [...barangList];
      let nextCustomers = [...customers];
      let barangImported = 0;
      let customersImported = 0;

      payload.barang.forEach((row, idx) => {
        const cleanNama = row.nama.trim();
        if (!cleanNama) return;
        const existingIdx = nextBarang.findIndex(
          (b) => b.nama.toLowerCase() === cleanNama.toLowerCase(),
        );
        if (existingIdx >= 0) {
          const prev = nextBarang[existingIdx];
          const updated: KtBarang = {
            ...prev,
            nama: cleanNama,
            stokKg: typeof row.stokKg === 'number' ? row.stokKg : prev.stokKg,
            potDefault: row.potDefault,
            minKg: row.minKg,
            hargaBeli: row.hargaBeli > 0 ? row.hargaBeli : prev.hargaBeli,
            hargaJual: row.hargaJual > 0 ? row.hargaJual : prev.hargaJual,
          };
          nextBarang[existingIdx] = updated;
          syncRemote('saveBarang', updated as unknown as Record<string, unknown>);
        } else {
          const created: KtBarang = {
            id: `BRG_IMP_${now}_${idx + 1}`,
            nama: cleanNama,
            stokKg: typeof row.stokKg === 'number' ? row.stokKg : 0,
            potDefault: row.potDefault,
            minKg: row.minKg,
            hargaBeli: row.hargaBeli,
            hargaJual: row.hargaJual,
          };
          nextBarang = [...nextBarang, created];
          syncRemote('saveBarang', created as unknown as Record<string, unknown>);
        }
        barangImported += 1;
      });

      payload.customers.forEach((row, idx) => {
        const cleanNama = row.nama.trim();
        if (!cleanNama) return;
        const existingIdx = nextCustomers.findIndex(
          (c) => c.nama.toLowerCase() === cleanNama.toLowerCase(),
        );
        if (existingIdx >= 0) {
          const prev = nextCustomers[existingIdx];
          const updated: KtCustomer = {
            ...prev,
            nama: cleanNama,
            tipe: row.tipe || prev.tipe,
            plat: row.plat || prev.plat,
            telp: row.telp || prev.telp,
          };
          nextCustomers[existingIdx] = updated;
          syncRemote('saveCustomer', updated as unknown as Record<string, unknown>);
        } else {
          const created: KtCustomer = {
            id: `CST_IMP_${now}_${idx + 1}`,
            nama: cleanNama,
            tipe: row.tipe || 'Supplier & Buyer',
            plat: row.plat,
            telp: row.telp,
          };
          nextCustomers = [...nextCustomers, created];
          syncRemote('saveCustomer', created as unknown as Record<string, unknown>);
        }
        customersImported += 1;
      });

      if (barangImported > 0 || customersImported > 0) {
        setBarangList(nextBarang);
        setCustomers(nextCustomers);
        persist(
          nextBarang,
          nextCustomers,
          transactions,
          kasOps,
          piutangMitra,
          payments,
          stockMutations,
        );
        showToast(
          `Impor berhasil: ${barangImported} barang & ${customersImported} customer disimpan.`,
          'success',
        );
      }

      return { barangImported, customersImported };
    },
    [
      barangList,
      customers,
      kasOps,
      payments,
      persist,
      piutangMitra,
      showToast,
      stockMutations,
      syncRemote,
      transactions,
    ],
  );

  const clearAllData = useCallback(() => {
    const resetBarang = barangList.map((b) => ({ ...b, stokKg: 0 }));
    setBarangList(resetBarang);
    setTransactions([]);
    setKasOps([]);
    setPiutangMitra([]);
    setPayments([]);
    setStockMutations([]);
    persist(resetBarang, customers, [], [], [], [], []);
    showToast('Transaksi, pembayaran, mutasi stok, dan kas operasional dikosongkan.', 'info');
  }, [barangList, customers, persist, showToast]);

  return (
    <KasTonaseContext.Provider
      value={{
        barangList,
        customers,
        transactions,
        kasOps,
        piutangMitra,
        payments,
        stockMutations,
        syncStatus,
        isSyncing,
        editingTransaction,
        setEditingTransaction,
        refreshTonase,
        saveTransaction,
        deleteTransaction,
        adjustStok,
        saveBarang,
        deleteBarang,
        saveCustomer,
        deleteCustomer,
        payHutang,
        deletePaymentRecord,
        addPiutangMitra,
        payPiutangMitra,
        deletePiutangMitra,
        saveKasOps,
        deleteKasOps,
        getCustomerOutstanding,
        getSupplierDebt,
        importHutangPiutangBatch,
        importKtMasterBatch,
        seedSampleData,
        clearAllData,
      }}
    >
      {children}
    </KasTonaseContext.Provider>
  );
}

export function useKasTonase(): KasTonaseContextValue {
  const ctx = useContext(KasTonaseContext);
  if (!ctx) throw new Error('useKasTonase must be used inside KasTonaseProvider');
  return ctx;
}
