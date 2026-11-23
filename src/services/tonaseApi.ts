import { GOOGLE_TONASE_URL } from '../config/constants';
import type {
  KtBarang,
  KtCustomer,
  KtKasOps,
  KtPaymentRecord,
  KtPiutangCicilan,
  KtPiutangMitra,
  KtStockMutation,
  KtTransaction,
  KtTransactionItem,
} from '../types/kasTonase';
import { normalizeDateISO, normalizeInvoiceCode } from '../utils/format';
import { jsonpRequest } from './jsonp';

type RawPiutangMitra = Omit<KtPiutangMitra, 'cicilan'> & {
  cicilan?: string | KtPiutangCicilan[];
};

interface TonaseGetAllResponse {
  barang?: KtBarang[];
  customers?: KtCustomer[];
  transactions?: Array<Omit<KtTransaction, 'items'> & { items: string | KtTransactionItem[] }>;
  kasOps?: KtKasOps[];
  piutangMitra?: RawPiutangMitra[];
  payments?: Array<Omit<KtPaymentRecord, 'isNonKas'> & { isNonKas?: boolean | string }>;
  stockMutations?: KtStockMutation[];
  data?: Array<Omit<KtTransaction, 'items'> & { items: string | KtTransactionItem[] }>;
}

interface TonaseMutationResponse {
  status?: string;
  message?: string;
}

function parseBoolFlag(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  const s = String(val ?? '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'ya' || s === 'yes';
}

function normalizeTransactions(
  list: Array<Omit<KtTransaction, 'items'> & { items: string | KtTransactionItem[] }>,
): KtTransaction[] {
  return list.map((t) => {
    let parsedItems: KtTransactionItem[] = [];
    if (typeof t.items === 'string') {
      try {
        parsedItems = JSON.parse(t.items || '[]');
      } catch {
        parsedItems = [];
      }
    } else if (Array.isArray(t.items)) {
      parsedItems = t.items;
    }

    const rawMode = String(t.potongUtangMode || '').trim();
    const potongUtangMode =
      rawMode === 'persen' || rawMode === 'rupiah' ? rawMode : undefined;

    return {
      ...t,
      nota: normalizeInvoiceCode(t.nota),
      tanggal: normalizeDateISO(t.tanggal) || String(t.tanggal || ''),
      items: parsedItems,
      totalNetto: Number(t.totalNetto) || 0,
      totalBayar: Number(t.totalBayar) || 0,
      potongUtang: Number(t.potongUtang) || 0,
      potongUtangMode,
      potongUtangInput:
        t.potongUtangInput !== undefined && t.potongUtangInput !== null && String(t.potongUtangInput) !== ''
          ? Number(t.potongUtangInput) || 0
          : undefined,
      sisaUtangMitraSetelah:
        t.sisaUtangMitraSetelah !== undefined &&
        t.sisaUtangMitraSetelah !== null &&
        String(t.sisaUtangMitraSetelah) !== ''
          ? Number(t.sisaUtangMitraSetelah) || 0
          : undefined,
      dibayar: Number(t.dibayar) || 0,
      sisa: Number(t.sisa) || 0,
      catatan: typeof t.catatan === 'string' && t.catatan.trim() ? t.catatan.trim() : undefined,
    };
  });
}

function normalizePiutangMitra(list: RawPiutangMitra[]): KtPiutangMitra[] {
  return list.map((pm) => {
    let parsedCicilan: KtPiutangCicilan[] = [];
    if (typeof pm.cicilan === 'string') {
      try {
        parsedCicilan = JSON.parse(pm.cicilan || '[]');
      } catch {
        parsedCicilan = [];
      }
    } else if (Array.isArray(pm.cicilan)) {
      parsedCicilan = pm.cicilan;
    }

    return {
      ...pm,
      tanggal: normalizeDateISO(pm.tanggal) || String(pm.tanggal || ''),
      nominalAwal: Number(pm.nominalAwal) || 0,
      terbayar: Number(pm.terbayar) || 0,
      sisa: Number(pm.sisa) || 0,
      cicilan: parsedCicilan.map((c) => ({
        ...c,
        tanggal: normalizeDateISO(c.tanggal) || String(c.tanggal || ''),
        nominal: Number(c.nominal) || 0,
        notaRef: c.notaRef ? normalizeInvoiceCode(c.notaRef) : undefined,
      })),
    };
  });
}

export interface ParsedTonaseData {
  barang?: KtBarang[];
  customers?: KtCustomer[];
  transactions?: KtTransaction[];
  kasOps?: KtKasOps[];
  piutangMitra?: KtPiutangMitra[];
  payments?: KtPaymentRecord[];
  stockMutations?: KtStockMutation[];
  updated: boolean;
}

export async function fetchTonaseAllFromSPS(): Promise<ParsedTonaseData> {
  const json = await jsonpRequest<TonaseGetAllResponse | KtTransaction[]>(
    { action: 'getAll', t: Date.now() },
    15000,
    GOOGLE_TONASE_URL,
  );

  const result: ParsedTonaseData = { updated: false };

  if (Array.isArray(json)) {
    if (json.length > 0 && 'nota' in json[0]) {
      result.transactions = normalizeTransactions(
        json as unknown as Array<
          Omit<KtTransaction, 'items'> & { items: string | KtTransactionItem[] }
        >,
      );
      result.updated = true;
    }
    return result;
  }

  if (json && typeof json === 'object') {
    if (Array.isArray(json.barang) && json.barang.length > 0) {
      result.barang = json.barang.map((b) => ({
        ...b,
        hargaBeli: Number(b.hargaBeli) || 0,
        hargaJual: Number(b.hargaJual) || 0,
        potDefault: Number(b.potDefault) || 0,
        stokKg: Number(b.stokKg) || 0,
        minKg: Number(b.minKg) || 0,
      }));
      result.updated = true;
    }
    if (Array.isArray(json.customers) && json.customers.length > 0) {
      result.customers = json.customers;
      result.updated = true;
    }
    if (Array.isArray(json.transactions)) {
      result.transactions = normalizeTransactions(json.transactions);
      result.updated = true;
    }
    if (Array.isArray(json.kasOps)) {
      result.kasOps = json.kasOps.map((k) => ({
        ...k,
        tanggal: normalizeDateISO(k.tanggal) || String(k.tanggal || ''),
        nominal: Number(k.nominal) || 0,
      }));
      result.updated = true;
    }
    if (Array.isArray(json.piutangMitra)) {
      result.piutangMitra = normalizePiutangMitra(json.piutangMitra);
      result.updated = true;
    }
    if (Array.isArray(json.payments)) {
      result.payments = json.payments.map((p) => ({
        ...p,
        nota: normalizeInvoiceCode(p.nota),
        tanggal: normalizeDateISO(p.tanggal) || String(p.tanggal || ''),
        nominal: Number(p.nominal) || 0,
        isNonKas: parseBoolFlag(p.isNonKas),
      }));
      result.updated = true;
    }
    if (Array.isArray(json.stockMutations)) {
      result.stockMutations = json.stockMutations.map((m) => ({
        ...m,
        tanggal: normalizeDateISO(m.tanggal) || String(m.tanggal || ''),
        deltaKg: Number(m.deltaKg) || 0,
        notaRef: m.notaRef ? normalizeInvoiceCode(m.notaRef) : undefined,
        stokSetelahKg:
          m.stokSetelahKg !== undefined &&
          m.stokSetelahKg !== null &&
          String(m.stokSetelahKg) !== ''
            ? Number(m.stokSetelahKg) || 0
            : undefined,
      }));
      result.updated = true;
    }
    if (!result.updated && Array.isArray(json.data) && json.data.length > 0 && json.data[0].nota) {
      result.transactions = normalizeTransactions(json.data);
      result.updated = true;
    }
  }

  return result;
}

export async function syncTonaseAction(
  action: string,
  payload: Record<string, unknown>,
): Promise<TonaseMutationResponse> {
  return jsonpRequest<TonaseMutationResponse>(
    { action, ...payload },
    15000,
    GOOGLE_TONASE_URL,
  );
}
