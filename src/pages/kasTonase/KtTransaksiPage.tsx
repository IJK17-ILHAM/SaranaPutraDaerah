import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  FileText,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  StickyNote,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { TrxTypeText } from '../../components/common/StatusBadge';
import { NotaDetailModal } from '../../components/kasTonase/NotaDetailModal';
import { useApp } from '../../context/AppContext';
import { useKasTonase } from '../../context/KasTonaseContext';
import type {
  KtPaymentMethod,
  KtTransaction,
  KtTransactionItem,
  KtTrxType,
  PotongUtangMode,
} from '../../types/kasTonase';
import {
  cleanRupiahToNumber,
  formatCurrencyInput,
  formatDateShortID,
  formatNumberWithDots,
  formatRupiah,
  getTodayISO,
  normalizeDateISO,
  normalizeInvoiceCode,
} from '../../utils/format';

interface DraftRow {
  barangId: string;
  nama: string;
  hargaStr: string;
  bruto: number;
  tara: number;
  pot: number;
}

export function KtTransaksiPage() {
  const { user, setActiveMenu, triggerPrint, showToast, requestConfirm } = useApp();
  const {
    barangList,
    customers,
    transactions,
    isSyncing,
    editingTransaction,
    setEditingTransaction,
    refreshTonase,
    saveTransaction,
    deleteTransaction,
    getCustomerOutstanding,
    getSupplierDebt,
  } = useKasTonase();

  const generateNextNota = useCallback(
    (dateISO: string, skipNota?: string) => {
      const cleanISO = normalizeDateISO(dateISO) || getTodayISO();
      const prefix = `INV/${cleanISO.slice(5, 7)}${cleanISO.slice(8, 10)}/`;
      const used = new Set(transactions.map((t) => normalizeInvoiceCode(t.nota)));
      if (skipNota) used.add(normalizeInvoiceCode(skipNota));
      let seq = transactions.length + 1;
      let candidate = `${prefix}${String(seq).padStart(3, '0')}`;
      while (used.has(candidate)) {
        seq += 1;
        candidate = `${prefix}${String(seq).padStart(3, '0')}`;
      }
      return candidate;
    },
    [transactions],
  );

  const createEmptyRow = useCallback((): DraftRow => {
    const fb = barangList[0] || {
      id: '',
      nama: 'Kardus OCC',
      potDefault: 0,
    };
    return {
      barangId: fb.id,
      nama: fb.nama,
      hargaStr: '',
      bruto: 0,
      tara: 0,
      pot: fb.potDefault || 0,
    };
  }, [barangList]);

  const [editId, setEditId] = useState<string | null>(null);
  const [nota, setNota] = useState(() => generateNextNota(getTodayISO()));
  const [tanggal, setTanggal] = useState(getTodayISO);
  const [trxType, setTrxType] = useState<KtTrxType>('Beli');
  const [selectedCustId, setSelectedCustId] = useState('');
  const [customerNama, setCustomerNama] = useState('');
  const [plat, setPlat] = useState('');
  const [rows, setRows] = useState<DraftRow[]>(() => [createEmptyRow()]);
  const [catatan, setCatatan] = useState('');
  const [showPriceValidation, setShowPriceValidation] = useState(false);
  const [payMethod, setPayMethod] = useState<KtPaymentMethod>('Tunai');
  const [dibayarStr, setDibayarStr] = useState('0');
  const [manualDibayar, setManualDibayar] = useState(false);

  // Potong Utang Pemasok state (khusus Transaksi Beli)
  const [usePotongUtang, setUsePotongUtang] = useState(false);
  const [potongMode, setPotongMode] = useState<PotongUtangMode>('persen');
  const [potongInputStr, setPotongInputStr] = useState('50');

  const [historySearch, setHistorySearch] = useState('');
  const [historyType, setHistoryType] = useState<'ALL' | KtTrxType>('ALL');
  const [detailTrx, setDetailTrx] = useState<KtTransaction | null>(null);

  const resetForm = useCallback(
    (justSavedNota?: string) => {
      const today = getTodayISO();
      setEditId(null);
      setEditingTransaction(null);
      setTanggal(today);
      setNota(generateNextNota(today, justSavedNota));
      setTrxType('Beli');
      setSelectedCustId('');
      setCustomerNama('');
      setPlat('');
      setRows([createEmptyRow()]);
      setCatatan('');
      setShowPriceValidation(false);
      setPayMethod('Tunai');
      setDibayarStr('0');
      setManualDibayar(false);
      setUsePotongUtang(false);
      setPotongMode('persen');
      setPotongInputStr('50');
    },
    [createEmptyRow, generateNextNota, setEditingTransaction],
  );

  useEffect(() => {
    if (editingTransaction) {
      setEditId(editingTransaction.id);
      setNota(normalizeInvoiceCode(editingTransaction.nota));
      setTanggal(normalizeDateISO(editingTransaction.tanggal) || getTodayISO());
      setTrxType(editingTransaction.tipe);
      setCustomerNama(editingTransaction.customer);
      setPlat(editingTransaction.plat || '');
      setRows(
        (editingTransaction.items || []).map((it) => {
          const matchedBarang =
            barangList.find((b) => b.id === it.barangId) ||
            barangList.find((b) => b.nama.toLowerCase() === (it.nama || '').toLowerCase());
          return {
            barangId: matchedBarang?.id || it.barangId,
            nama: it.nama,
            hargaStr: it.harga > 0 ? formatNumberWithDots(it.harga) : '',
            bruto: it.bruto,
            tara: it.tara,
            pot: it.pot,
          };
        }),
      );
      setCatatan(editingTransaction.catatan || '');
      setShowPriceValidation(false);
      const pm: KtPaymentMethod =
        editingTransaction.metode === 'Transfer' || editingTransaction.metode === 'Hutang'
          ? editingTransaction.metode
          : 'Tunai';
      setPayMethod(pm);
      setDibayarStr(formatNumberWithDots(editingTransaction.dibayar || 0));
      setManualDibayar(true);

      const hasPotong = editingTransaction.tipe === 'Beli' && (editingTransaction.potongUtang || 0) > 0;
      setUsePotongUtang(hasPotong);
      if (hasPotong) {
        const mode: PotongUtangMode = editingTransaction.potongUtangMode || 'rupiah';
        setPotongMode(mode);
        setPotongInputStr(
          mode === 'persen'
            ? String(editingTransaction.potongUtangInput ?? 0)
            : formatNumberWithDots(editingTransaction.potongUtang || 0),
        );
      } else {
        setPotongMode('persen');
        setPotongInputStr('50');
      }
    }
  }, [barangList, editingTransaction]);

  const computedRows = useMemo(() => {
    return rows.map((r) => {
      const harga = cleanRupiahToNumber(r.hargaStr);
      const netto = Math.max(
        0,
        Math.round(((r.bruto || 0) - (r.tara || 0)) * (1 - (r.pot || 0) / 100)),
      );
      const subtotal = Math.round(netto * harga);
      return { ...r, harga, netto, subtotal };
    });
  }, [rows]);

  const totalNetto = useMemo(
    () => computedRows.reduce((acc, r) => acc + r.netto, 0),
    [computedRows],
  );
  const totalBayar = useMemo(
    () => computedRows.reduce((acc, r) => acc + r.subtotal, 0),
    [computedRows],
  );

  const supplierDebt = useMemo(
    () => (trxType === 'Beli' ? getSupplierDebt(customerNama, editId) : 0),
    [customerNama, editId, getSupplierDebt, trxType],
  );

  const rawPotong = useMemo(() => {
    if (trxType !== 'Beli' || !usePotongUtang) return 0;
    if (potongMode === 'persen') {
      const pct = Math.min(100, Math.max(0, parseFloat(potongInputStr) || 0));
      return Math.round((totalBayar * pct) / 100);
    }
    return cleanRupiahToNumber(potongInputStr);
  }, [potongInputStr, potongMode, totalBayar, trxType, usePotongUtang]);

  const maxPotong = Math.min(supplierDebt, totalBayar);
  const potongUtang = trxType === 'Beli' && usePotongUtang ? Math.min(rawPotong, maxPotong) : 0;
  const isCappedByDebt =
    trxType === 'Beli' &&
    usePotongUtang &&
    supplierDebt > 0 &&
    rawPotong > supplierDebt &&
    supplierDebt <= totalBayar;
  const isCappedByNota =
    trxType === 'Beli' &&
    usePotongUtang &&
    totalBayar > 0 &&
    rawPotong > totalBayar &&
    totalBayar < supplierDebt;

  const tagihanBersih = Math.max(0, totalBayar - potongUtang);
  const sisaUtangPTSetelah = Math.max(0, supplierDebt - potongUtang);

  useEffect(() => {
    if (!manualDibayar) {
      setDibayarStr(payMethod === 'Hutang' ? '0' : formatNumberWithDots(tagihanBersih));
    }
  }, [manualDibayar, payMethod, tagihanBersih]);

  const dibayarNum = cleanRupiahToNumber(dibayarStr);
  const sisaNum = Math.max(0, tagihanBersih - dibayarNum);

  const outstanding = getCustomerOutstanding(customerNama);

  const handleSwitchType = (nextType: KtTrxType) => {
    setTrxType(nextType);
    if (nextType === 'Jual') {
      setUsePotongUtang(false);
    }
    setManualDibayar(false);
  };

  const handleSelectCustomer = (cid: string) => {
    setSelectedCustId(cid);
    const found = customers.find((c) => c.id === cid);
    if (found) {
      setCustomerNama(found.nama);
      setPlat(found.plat || '');
      setManualDibayar(false);
    }
  };

  const handleTogglePotongUtang = (checked: boolean) => {
    setUsePotongUtang(checked);
    setManualDibayar(false);
  };

  const handleSwitchPotongMode = (nextMode: PotongUtangMode) => {
    if (nextMode === potongMode) return;
    setPotongMode(nextMode);
    if (nextMode === 'rupiah') {
      setPotongInputStr(formatNumberWithDots(potongUtang));
    } else {
      const pct = totalBayar > 0 ? Math.min(100, Math.round((potongUtang / totalBayar) * 100)) : 50;
      setPotongInputStr(String(pct || 50));
    }
    setManualDibayar(false);
  };

  const handlePresetPotong = (preset: '25' | '50' | 'max') => {
    if (preset === 'max') {
      if (potongMode === 'persen') {
        setPotongInputStr('100');
      } else {
        setPotongInputStr(formatNumberWithDots(maxPotong));
      }
    } else if (potongMode === 'persen') {
      setPotongInputStr(preset);
    } else {
      const pct = Number(preset);
      const nom = Math.min(maxPotong, Math.round((totalBayar * pct) / 100));
      setPotongInputStr(formatNumberWithDots(nom));
    }
    setManualDibayar(false);
  };

  const handleRowBarangChange = (idx: number, bid: string) => {
    const found = barangList.find((b) => b.id === bid);
    if (!found) return;
    setRows((prev) =>
      prev.map((r, i) =>
        i === idx
          ? {
              ...r,
              barangId: found.id,
              nama: found.nama,
              pot: found.potDefault || 0,
            }
          : r,
      ),
    );
  };

  const handleRowPriceChange = (idx: number, raw: string) => {
    setShowPriceValidation(false);
    const formatted = formatCurrencyInput(raw);
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, hargaStr: formatted } : r)));
  };

  const handleRowNumberChange = (
    idx: number,
    field: 'bruto' | 'tara' | 'pot',
    value: number,
  ) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const handlePaymentMethod = (method: KtPaymentMethod) => {
    setPayMethod(method);
    setManualDibayar(false);
    setDibayarStr(method === 'Hutang' ? '0' : formatNumberWithDots(tagihanBersih));
  };

  const handleSave = async (shouldPrint: boolean) => {
    const cleanCust = customerNama.trim();
    if (!cleanCust) {
      showToast('Harap isi nama Customer / Supplier.', 'warning');
      return;
    }

    const weightedRows = computedRows.filter((r) => r.netto > 0 || r.bruto > 0);
    if (!weightedRows.length) {
      showToast('Isi berat Bruto minimal 1 barang.', 'warning');
      return;
    }

    const missingPriceRow = weightedRows.find((r) => r.harga <= 0);
    if (missingPriceRow) {
      setShowPriceValidation(true);
      showToast(
        `Harap isi Harga/kg untuk "${missingPriceRow.nama}" sebelum menyimpan nota.`,
        'warning',
      );
      return;
    }

    const validItems: KtTransactionItem[] = weightedRows.map((r) => ({
      barangId: r.barangId,
      nama: r.nama,
      harga: r.harga,
      bruto: r.bruto,
      tara: r.tara,
      pot: r.pot,
      netto: r.netto,
      subtotal: r.subtotal,
    }));

    const clampedDibayar = Math.min(tagihanBersih, dibayarNum);
    const parsedPotongInput =
      potongMode === 'persen'
        ? Math.min(100, Math.max(0, parseFloat(potongInputStr) || 0))
        : cleanRupiahToNumber(potongInputStr);

    const trxObj: KtTransaction = {
      id: editId || `TRX${Date.now()}`,
      nota: normalizeInvoiceCode(nota.trim()) || generateNextNota(tanggal),
      tanggal: tanggal || getTodayISO(),
      tipe: trxType,
      customer: cleanCust,
      plat: plat.trim().toUpperCase(),
      metode: payMethod,
      items: validItems,
      totalNetto,
      totalBayar,
      potongUtang: trxType === 'Beli' ? potongUtang : 0,
      potongUtangMode: trxType === 'Beli' && potongUtang > 0 ? potongMode : undefined,
      potongUtangInput: trxType === 'Beli' && potongUtang > 0 ? parsedPotongInput : undefined,
      sisaUtangMitraSetelah:
        trxType === 'Beli' && potongUtang > 0 ? sisaUtangPTSetelah : undefined,
      dibayar: clampedDibayar,
      sisa: Math.max(0, tagihanBersih - clampedDibayar),
      catatan: catatan.trim() || undefined,
      diinputOleh: user ? user.nama || user.username : 'Admin',
    };

    const saved = await saveTransaction(trxObj, editId);
    resetForm(saved.nota);
    if (shouldPrint) {
      triggerPrint({ type: 'kt-nota', trx: saved });
    } else if ((saved.potongUtang || 0) > 0) {
      showToast(
        `Nota ${saved.nota} disimpan. Potong utang PT ${formatRupiah(saved.potongUtang || 0)}, dibayar ${formatRupiah(saved.dibayar)}.`,
        'success',
      );
    } else {
      showToast(`Nota ${saved.nota} berhasil disimpan.`, 'success');
    }
  };

  const handleEditHistory = (trx: KtTransaction) => {
    setEditingTransaction(trx);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteHistory = async (trx: KtTransaction) => {
    const ok = await requestConfirm({
      title: 'Hapus Nota Transaksi',
      message:
        (trx.potongUtang || 0) > 0
          ? `Hapus nota ${trx.nota} (${trx.customer}), kembalikan stok gudang, dan kembalikan potongan utang pemasok sebesar ${formatRupiah(trx.potongUtang || 0)}?`
          : `Hapus nota ${trx.nota} (${trx.customer}) dan kembalikan stok gudang secara otomatis?`,
      confirmLabel: 'Hapus Nota',
      danger: true,
    });
    if (ok) {
      deleteTransaction(trx.id);
    }
  };

  const filteredHistory = useMemo(() => {
    const s = historySearch.trim().toLowerCase();
    return transactions.filter(
      (t) =>
        (historyType === 'ALL' || t.tipe === historyType) &&
        (!s ||
          (t.nota || '').toLowerCase().includes(s) ||
          (t.customer || '').toLowerCase().includes(s) ||
          (t.plat || '').toLowerCase().includes(s)),
    );
  }, [historySearch, historyType, transactions]);

  return (
    <section className="space-y-5">
      <PageHeader
        suiteLabel="Kas & Tonase"
        pageLabel="Transaksi baru"
        title={editId ? `Edit Transaksi: ${nota}` : 'Transaksi Baru'}
        subtitle={
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <span>
              Nota <b className="t-text font-mono-num">{nota}</b>
            </span>
            <label className="inline-flex items-center gap-1.5 text-xs t-muted">
              <span>Tanggal transaksi</span>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => {
                  const nextDate = e.target.value;
                  setTanggal(nextDate);
                  if (!editId && nextDate) {
                    setNota(generateNextNota(nextDate));
                  }
                }}
                aria-label="Tanggal transaksi"
                className="t-input rounded-lg px-2 py-0.5 text-xs font-mono-num t-text"
              />
            </label>
          </div>
        }
        actions={
          <>
            <div className="inline-flex rounded-xl t-card p-1">
              <button
                type="button"
                onClick={() => handleSwitchType('Beli')}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs whitespace-nowrap ${
                  trxType === 'Beli' ? 't-btn-primary' : 'font-semibold t-muted'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Beli</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchType('Jual')}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs whitespace-nowrap ${
                  trxType === 'Jual' ? 't-btn-primary' : 'font-semibold t-muted'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Jual</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => refreshTonase(true)}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync SPS</span>
            </button>
            <button
              type="button"
              onClick={() => resetForm()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </>
        }
      />

      {/* Customer & Plat Bar */}
      <div className="t-card rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
          <select
            value={selectedCustId}
            onChange={(e) => handleSelectCustomer(e.target.value)}
            className="text-xs px-3 py-2.5 rounded-xl t-input font-semibold"
          >
            <option value="">-- Pilih Customer / Supplier --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nama}
                {c.plat ? ` (${c.plat})` : ''}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={customerNama}
            onChange={(e) => {
              setCustomerNama(e.target.value);
              setManualDibayar(false);
            }}
            placeholder="Nama Customer / CV / PT..."
            className="text-xs px-3 py-2.5 rounded-xl t-input font-bold"
          />
          <input
            type="text"
            value={plat}
            onChange={(e) => setPlat(e.target.value)}
            placeholder="No. Polisi (cth: B 1234 XY)"
            className="text-xs px-3 py-2.5 rounded-xl t-input font-mono-num uppercase font-semibold"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {trxType === 'Beli' && supplierDebt > 0 && (
            <div className="px-3.5 py-2 rounded-xl t-status-info text-xs font-bold font-mono-num whitespace-nowrap">
              Utang PT {formatRupiah(supplierDebt)}
            </div>
          )}
          <div className="px-3.5 py-2 rounded-xl t-status-warn text-xs font-bold font-mono-num whitespace-nowrap text-right">
            {trxType === 'Beli'
              ? `Hutang ${formatRupiah(outstanding.hutang)}`
              : `Piutang ${formatRupiah(outstanding.piutang)}`}
          </div>
        </div>
      </div>

      {/* Items Table + Checkout Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8 t-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="t-subtle border-b t-border">
                  <th className="py-3 px-3 t-th-label min-w-[150px]">Barang</th>
                  <th className="py-3 px-2 t-th-label text-right min-w-[118px]">Harga/kg *</th>
                  <th className="py-3 px-2 t-th-label text-right w-22">Bruto</th>
                  <th className="py-3 px-2 t-th-label text-right w-20">Tara</th>
                  <th className="py-3 px-2 t-th-label text-right w-16">Pot.%</th>
                  <th className="py-3 px-2 t-th-label text-right w-22">Netto</th>
                  <th className="py-3 px-3 t-th-label text-right w-28">Subtotal</th>
                  <th className="py-3 px-2 w-9" />
                </tr>
              </thead>
              <tbody className="divide-y t-border">
                {computedRows.map((r, idx) => {
                  const hasBarangOption = barangList.some((b) => b.id === r.barangId);
                  const isMissingPrice =
                    showPriceValidation && (r.bruto > 0 || r.netto > 0) && r.harga <= 0;
                  return (
                    <tr key={idx}>
                      <td className="py-2.5 px-3">
                        <select
                          value={r.barangId}
                          onChange={(e) => handleRowBarangChange(idx, e.target.value)}
                          className="w-full text-xs px-2 py-1.5 rounded-lg t-input font-bold"
                        >
                          {barangList.length === 0 ? (
                            <option value="">Belum ada barang</option>
                          ) : (
                            <>
                              {!hasBarangOption && r.nama && (
                                <option value={r.barangId}>{r.nama}</option>
                              )}
                              {barangList.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.nama}
                                </option>
                              ))}
                            </>
                          )}
                        </select>
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] t-muted font-semibold pointer-events-none">
                            Rp
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={r.hargaStr}
                            onChange={(e) => handleRowPriceChange(idx, e.target.value)}
                            placeholder="Isi harga"
                            aria-label={`Harga per kg untuk ${r.nama}`}
                            className="w-full text-right pl-6 pr-2 py-1.5 rounded-lg t-input font-mono-num font-bold"
                            style={
                              isMissingPrice
                                ? { borderColor: 'var(--status-bad-text)' }
                                : undefined
                            }
                          />
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          value={r.bruto}
                          min={0}
                          step={1}
                          onChange={(e) =>
                            handleRowNumberChange(idx, 'bruto', parseFloat(e.target.value) || 0)
                          }
                          className="w-full text-right px-2 py-1.5 rounded-lg t-input font-mono-num font-bold"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          value={r.tara}
                          min={0}
                          step={1}
                          onChange={(e) =>
                            handleRowNumberChange(idx, 'tara', parseFloat(e.target.value) || 0)
                          }
                          className="w-full text-right px-2 py-1.5 rounded-lg t-input font-mono-num"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          value={r.pot}
                          min={0}
                          max={100}
                          step={0.5}
                          onChange={(e) =>
                            handleRowNumberChange(idx, 'pot', parseFloat(e.target.value) || 0)
                          }
                          className="w-full text-right px-1.5 py-1.5 rounded-lg t-input font-mono-num"
                        />
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono-num font-bold t-text">
                        {formatNumberWithDots(r.netto)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num font-bold t-text">
                        {formatNumberWithDots(r.subtotal)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
                            aria-label="Hapus baris barang"
                            className="p-1.5 rounded-lg t-status-bad"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3.5 border-t t-border flex flex-wrap justify-between items-center gap-2">
            <button
              type="button"
              onClick={() => setRows((prev) => [...prev, createEmptyRow()])}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl t-btn-secondary text-xs font-bold whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah barang</span>
            </button>
            <span className="text-[11px] t-muted">
              Netto = (Bruto &minus; Tara) &times; (1 &minus; Pot.%)
            </span>
          </div>

          {/* Catatan Nota (Opsional · Internal) */}
          <div className="p-4 border-t t-border t-subtle space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="kt-catatan-nota"
                className="inline-flex items-center gap-1.5 t-field-label"
              >
                <StickyNote className="w-3.5 h-3.5 t-link" />
                <span>Catatan Nota</span>
                <span className="font-normal t-muted">(Opsional)</span>
              </label>
              <span className="text-[11px] t-muted">
                Catatan internal &bull; Hanya tampil di Detail Nota web, tidak masuk ke PDF buyer
              </span>
            </div>
            <textarea
              id="kt-catatan-nota"
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Harga khusus sesuai kesepakatan untuk kiriman ini."
              className="w-full text-xs px-3 py-2 rounded-xl t-input resize-y"
            />
          </div>
        </div>

        {/* Payment Summary */}
        <div className="lg:col-span-4 t-card rounded-2xl p-5 space-y-4 sticky top-6">
          <div className="flex justify-between items-center text-xs">
            <span className="t-field-label">Total netto</span>
            <span className="font-bold t-text font-mono-num text-sm">
              {formatNumberWithDots(totalNetto)} kg
            </span>
          </div>

          <div className="border-t t-border pt-3">
            <div className="t-field-label">
              {trxType === 'Beli' ? 'Nilai nota pembelian' : 'Total bayar'}
            </div>
            <div className="text-2xl font-display t-text mt-1 tabular-nums">
              {formatRupiah(totalBayar)}
            </div>
          </div>

          {/* Potong Utang Pemasok — khusus Transaksi Beli */}
          {trxType === 'Beli' && (
            <div className="rounded-xl t-subtle border t-border-strong p-3.5 space-y-3">
              <label className="flex items-start justify-between gap-2.5 cursor-pointer select-none">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={usePotongUtang}
                    onChange={(e) => handleTogglePotongUtang(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded accent-[var(--accent-brand)] cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold t-text">Potong Utang Pemasok</div>
                    <div className="text-[11px] t-muted mt-0.5">
                      Sisa utang PT:{' '}
                      <b className="font-mono-num t-text">{formatRupiah(supplierDebt)}</b>
                    </div>
                  </div>
                </div>
              </label>

              {usePotongUtang && (
                <div className="space-y-3 pt-2 border-t t-border">
                  {supplierDebt === 0 ? (
                    <div className="rounded-lg t-status-warn px-3 py-2 text-[11px] space-y-1.5">
                      <div>
                        {customerNama.trim()
                          ? `${customerNama.trim()} belum memiliki sisa utang (Piutang Mitra) yang tercatat.`
                          : 'Pilih atau isi nama pemasok terlebih dahulu untuk mengecek sisa utang PT.'}
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveMenu('menu-kt-hutang')}
                        className="inline-flex items-center gap-1 font-bold underline"
                      >
                        <span>Kelola di Hutang Piutang → Piutang Mitra</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Mode toggle: % vs Rp */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="inline-flex rounded-lg t-card p-0.5 border t-border">
                          <button
                            type="button"
                            onClick={() => handleSwitchPotongMode('persen')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap ${
                              potongMode === 'persen' ? 't-btn-primary' : 't-muted'
                            }`}
                          >
                            Persen (%)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSwitchPotongMode('rupiah')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap ${
                              potongMode === 'rupiah' ? 't-btn-primary' : 't-muted'
                            }`}
                          >
                            Rupiah (Rp)
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {(['25', '50', 'max'] as const).map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handlePresetPotong(preset)}
                              className="px-2 py-1 rounded-md t-btn-secondary text-[10px] font-bold whitespace-nowrap"
                            >
                              {preset === 'max' ? 'Maks' : `${preset}%`}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Deduction value input */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="t-field-label">
                          {potongMode === 'persen' ? 'Potongan (%)' : 'Potongan (Rp)'}
                        </span>
                        <div className="relative w-36">
                          {potongMode === 'rupiah' && (
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] t-muted font-semibold">
                              Rp
                            </span>
                          )}
                          <input
                            type={potongMode === 'persen' ? 'number' : 'text'}
                            min={potongMode === 'persen' ? 0 : undefined}
                            max={potongMode === 'persen' ? 100 : undefined}
                            step={potongMode === 'persen' ? 1 : undefined}
                            value={potongInputStr}
                            onChange={(e) => {
                              setManualDibayar(false);
                              setPotongInputStr(
                                potongMode === 'persen'
                                  ? e.target.value
                                  : formatCurrencyInput(e.target.value),
                              );
                            }}
                            className={`w-full text-right py-1.5 rounded-lg t-input font-mono-num font-bold text-xs ${
                              potongMode === 'rupiah' ? 'pl-8 pr-2.5' : 'pl-2.5 pr-7'
                            }`}
                          />
                          {potongMode === 'persen' && (
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] t-muted font-bold">
                              %
                            </span>
                          )}
                        </div>
                      </div>

                      {isCappedByDebt && (
                        <div className="rounded-lg t-status-warn px-2.5 py-1.5 text-[11px] font-semibold">
                          Dibatasi maksimal sebesar sisa utang PT ({formatRupiah(supplierDebt)}).
                        </div>
                      )}
                      {isCappedByNota && (
                        <div className="rounded-lg t-status-warn px-2.5 py-1.5 text-[11px] font-semibold">
                          Dibatasi maksimal sebesar nilai nota ({formatRupiah(totalBayar)}).
                        </div>
                      )}

                      {/* Automatic 4-line summary */}
                      <div className="rounded-lg t-card border t-border p-2.5 space-y-1.5 text-[11px]">
                        <div className="flex justify-between items-center">
                          <span className="t-muted">Dipotong cicilan utang PT</span>
                          <span
                            className="font-mono-num font-bold"
                            style={{ color: 'var(--status-info-text)' }}
                          >
                            &minus;{formatRupiah(potongUtang)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="t-muted">Harus dibayar ke PT</span>
                          <span className="font-mono-num font-bold t-text">
                            {formatRupiah(tagihanBersih)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t t-border">
                          <span className="t-muted">Sisa utang PT setelah potong</span>
                          <span
                            className="font-mono-num font-bold"
                            style={{
                              color:
                                sisaUtangPTSetelah === 0
                                  ? 'var(--status-ok-text)'
                                  : 'var(--status-warn-text)',
                            }}
                          >
                            {formatRupiah(sisaUtangPTSetelah)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl t-subtle border t-border-strong">
            {(['Tunai', 'Transfer', 'Hutang'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handlePaymentMethod(m)}
                className={`py-2 rounded-lg text-xs whitespace-nowrap ${
                  payMethod === m ? 'font-bold t-card-accent' : 'font-semibold t-btn-secondary'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="space-y-2.5 text-xs pt-1">
            <div className="flex justify-between items-center gap-3">
              <span className="t-field-label">
                {trxType === 'Beli' && potongUtang > 0 ? 'Dibayar ke PT' : 'Dibayar'}
              </span>
              <input
                type="text"
                value={dibayarStr}
                onChange={(e) => {
                  setManualDibayar(true);
                  setDibayarStr(formatCurrencyInput(e.target.value));
                }}
                className="w-40 text-right px-3 py-1.5 rounded-xl t-input font-mono-num font-bold text-sm"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="t-field-label">
                {trxType === 'Beli' ? 'Sisa hutang nota' : 'Sisa piutang'}
              </span>
              <span
                className="font-mono-num font-bold text-sm"
                style={{
                  color: sisaNum > 0 ? 'var(--status-warn-text)' : 'var(--status-ok-text)',
                }}
              >
                {formatNumberWithDots(sisaNum)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSave(true)}
            className="w-full py-3 rounded-xl t-btn-primary text-xs inline-flex items-center justify-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Simpan dan cetak nota</span>
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            className="w-full py-2.5 rounded-xl t-btn-secondary text-xs font-semibold inline-flex items-center justify-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan tanpa cetak</span>
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="t-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b t-border flex flex-wrap items-center justify-between gap-3">
          <span className="t-section-label">Riwayat Nota Transaksi</span>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Cari nota / customer / plat..."
              className="text-xs px-3 py-1.5 rounded-xl t-input"
            />
            <select
              value={historyType}
              onChange={(e) => setHistoryType(e.target.value as 'ALL' | KtTrxType)}
              className="text-xs px-3 py-1.5 rounded-xl t-input"
            >
              <option value="ALL">Semua (Beli &amp; Jual)</option>
              <option value="Beli">Beli</option>
              <option value="Jual">Jual</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="t-subtle border-b t-border">
                <th className="py-3 px-4 t-th-label">Nota &amp; Tgl</th>
                <th className="py-3 px-3 t-th-label">Tipe</th>
                <th className="py-3 px-3 t-th-label">Customer &amp; Armada</th>
                <th className="py-3 px-3 t-th-label">Rincian Barang</th>
                <th className="py-3 px-3 t-th-label text-right">Total Netto</th>
                <th className="py-3 px-3 t-th-label text-right">Nilai Nota / Potongan</th>
                <th className="py-3 px-3 t-th-label text-right">Sisa</th>
                <th className="py-3 px-4 t-th-label text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y t-border">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center t-muted">
                    Tidak ada riwayat transaksi.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((t) => {
                  const summary = (t.items || [])
                    .map(
                      (i) =>
                        `${i.nama} (${formatNumberWithDots(i.netto)} kg @${formatRupiah(i.harga)})`,
                    )
                    .join(', ');
                  return (
                    <tr key={t.id} className="t-row-hover">
                      <td className="py-3 px-4">
                        <div className="font-bold font-mono-num t-text">{t.nota}</div>
                        <div className="text-[10px] t-muted font-mono-num">
                          {formatDateShortID(t.tanggal)}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <TrxTypeText tipe={t.tipe} />
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold t-text">{t.customer}</div>
                        <div className="text-[10px] t-muted font-mono-num">{t.plat || '-'}</div>
                      </td>
                      <td className="py-3 px-3 text-[11px] t-muted">
                        <div>{summary}</div>
                        {t.catatan && (
                          <div className="text-[10px] t-link mt-0.5 truncate max-w-[260px]">
                            Catatan: {t.catatan}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num font-bold t-text">
                        {formatNumberWithDots(t.totalNetto)} kg
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num">
                        <div className="font-bold t-text">{formatRupiah(t.totalBayar)}</div>
                        {(t.potongUtang || 0) > 0 && (
                          <div className="text-[10px] font-semibold t-link">
                            Potong {formatRupiah(t.potongUtang || 0)} &bull; Bayar{' '}
                            {formatRupiah(t.dibayar)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num">
                        {(t.sisa || 0) > 0 ? (
                          <span
                            className="text-[11px] font-bold"
                            style={{ color: 'var(--status-warn-text)' }}
                          >
                            {formatRupiah(t.sisa)}
                          </span>
                        ) : (
                          <span
                            className="text-[11px] font-bold"
                            style={{ color: 'var(--status-ok-text)' }}
                          >
                            Lunas
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setDetailTrx(t)}
                            className="inline-flex items-center gap-1 t-link font-bold hover:underline"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Detail Nota</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditHistory(t)}
                            className="inline-flex items-center gap-1 t-muted font-semibold hover:underline"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteHistory(t)}
                            className="inline-flex items-center gap-1 font-semibold hover:underline"
                            style={{ color: 'var(--status-bad-text)' }}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Nota (Preview A4 + Catatan Internal + Unduh PDF + Bagikan Nota PDF) */}
      <NotaDetailModal
        transaction={detailTrx}
        onClose={() => setDetailTrx(null)}
        onEdit={handleEditHistory}
      />
    </section>
  );
}
