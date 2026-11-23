import {
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  CreditCard,
  FileText,
  Filter,
  History,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { RingkasanSpotIcon } from '../../components/common/RingkasanSpotIcons';
import { NotaDetailModal } from '../../components/kasTonase/NotaDetailModal';
import { PayDebtModal } from '../../components/kasTonase/PayDebtModal';
import { useApp } from '../../context/AppContext';
import { useKasTonase } from '../../context/KasTonaseContext';
import type { KtPaymentRecord, KtPiutangMitra, KtTransaction } from '../../types/kasTonase';
import {
  cleanRupiahToNumber,
  formatCurrencyInput,
  formatDateShortID,
  formatNumberWithDots,
  formatRupiah,
  getTodayISO,
} from '../../utils/format';

type HutangTab = 'nota' | 'mitra';

export function KtHutangPage() {
  const { theme, setActiveMenu, requestConfirm, showToast } = useApp();
  const isDark = theme === 'dark';
  const {
    customers,
    transactions,
    piutangMitra,
    payments,
    setEditingTransaction,
    payHutang,
    deletePaymentRecord,
    addPiutangMitra,
    payPiutangMitra,
    deletePiutangMitra,
    getSupplierDebt,
  } = useKasTonase();

  const [activeTab, setActiveTab] = useState<HutangTab>('nota');
  const [payingTrx, setPayingTrx] = useState<KtTransaction | null>(null);
  const [detailTrx, setDetailTrx] = useState<KtTransaction | null>(null);

  // Nota tab filters & expand state
  const [notaSearch, setNotaSearch] = useState('');
  const [notaStatusFilter, setNotaStatusFilter] = useState<'OPEN' | 'ALL' | 'LUNAS'>('OPEN');
  const [notaTipeFilter, setNotaTipeFilter] = useState<'ALL' | 'Beli' | 'Jual'>('ALL');
  const [expandedNotaIds, setExpandedNotaIds] = useState<Record<string, boolean>>({});

  // Piutang Mitra form state
  const [pmTanggal, setPmTanggal] = useState(getTodayISO);
  const [pmSelectedCust, setPmSelectedCust] = useState('');
  const [pmCustomer, setPmCustomer] = useState('');
  const [pmKeterangan, setPmKeterangan] = useState('');
  const [pmNominalStr, setPmNominalStr] = useState('');
  const [pmCatatKas, setPmCatatKas] = useState(false);

  // Piutang Mitra filter & expand state
  const [pmSearch, setPmSearch] = useState('');
  const [pmStatusFilter, setPmStatusFilter] = useState<'ALL' | 'OPEN' | 'LUNAS'>('ALL');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // Direct payment modal for Piutang Mitra
  const [payingMitra, setPayingMitra] = useState<KtPiutangMitra | null>(null);
  const [mitraPayTgl, setMitraPayTgl] = useState(getTodayISO);
  const [mitraPayMetode, setMitraPayMetode] = useState<'Transfer' | 'Tunai'>('Transfer');
  const [mitraPayStr, setMitraPayStr] = useState('');
  const [mitraPayKet, setMitraPayKet] = useState('');
  const [mitraCatatKas, setMitraCatatKas] = useState(true);

  useEffect(() => {
    if (payingMitra) {
      setMitraPayTgl(getTodayISO());
      setMitraPayMetode('Transfer');
      setMitraPayStr(formatNumberWithDots(payingMitra.sisa));
      setMitraPayKet('');
      setMitraCatatKas(true);
    }
  }, [payingMitra]);

  const paymentsByTrxId = useMemo(() => {
    const map: Record<string, KtPaymentRecord[]> = {};
    payments.forEach((p) => {
      if (!map[p.trxId]) map[p.trxId] = [];
      map[p.trxId].push(p);
    });
    Object.values(map).forEach((list) => {
      list.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
    });
    return map;
  }, [payments]);

  const { unpaidCount, totalHutang, totalPiutangNota } = useMemo(() => {
    let h = 0;
    let p = 0;
    let count = 0;
    transactions.forEach((t) => {
      if ((t.sisa || 0) > 0) {
        count += 1;
        if (t.tipe === 'Beli') h += t.sisa;
        else p += t.sisa;
      }
    });
    return { unpaidCount: count, totalHutang: h, totalPiutangNota: p };
  }, [transactions]);

  const filteredNotas = useMemo(() => {
    const q = notaSearch.trim().toLowerCase();
    return transactions.filter((t) => {
      if (notaStatusFilter === 'OPEN' && (t.sisa || 0) <= 0) return false;
      if (notaStatusFilter === 'LUNAS' && (t.sisa || 0) > 0) return false;
      if (notaTipeFilter !== 'ALL' && t.tipe !== notaTipeFilter) return false;
      if (!q) return true;
      return (
        (t.nota || '').toLowerCase().includes(q) ||
        (t.customer || '').toLowerCase().includes(q)
      );
    });
  }, [notaSearch, notaStatusFilter, notaTipeFilter, transactions]);

  const mitraStats = useMemo(() => {
    let totalAwal = 0;
    let totalCicilan = 0;
    let totalSisa = 0;
    let openCount = 0;
    piutangMitra.forEach((pm) => {
      totalAwal += pm.nominalAwal || 0;
      totalCicilan += pm.terbayar || 0;
      totalSisa += pm.sisa || 0;
      if ((pm.sisa || 0) > 0) openCount += 1;
    });
    return { totalAwal, totalCicilan, totalSisa, openCount };
  }, [piutangMitra]);

  const filteredMitra = useMemo(() => {
    const q = pmSearch.trim().toLowerCase();
    return piutangMitra.filter((pm) => {
      if (pmStatusFilter === 'OPEN' && pm.sisa <= 0) return false;
      if (pmStatusFilter === 'LUNAS' && pm.sisa > 0) return false;
      if (!q) return true;
      return (
        pm.customer.toLowerCase().includes(q) ||
        pm.kode.toLowerCase().includes(q) ||
        (pm.keterangan || '').toLowerCase().includes(q)
      );
    });
  }, [piutangMitra, pmSearch, pmStatusFilter]);

  const isRowExpanded = (pm: KtPiutangMitra) => {
    if (pm.id in expandedIds) return expandedIds[pm.id];
    return (pm.cicilan || []).length > 0;
  };

  const toggleExpand = (pm: KtPiutangMitra) => {
    const current = isRowExpanded(pm);
    setExpandedIds((prev) => ({ ...prev, [pm.id]: !current }));
  };

  const toggleNotaExpand = (trxId: string) => {
    setExpandedNotaIds((prev) => ({ ...prev, [trxId]: !prev[trxId] }));
  };

  const handleDeletePayment = async (p: KtPaymentRecord) => {
    const ok = await requestConfirm({
      title: 'Batalkan Catatan Pembayaran',
      message: `Batalkan pembayaran ${formatRupiah(p.nominal)} (${p.metode} · ${formatDateShortID(
        p.tanggal,
      )}) pada nota ${p.nota}? Sisa tagihan nota akan dikembalikan.`,
      confirmLabel: 'Batalkan Pembayaran',
      danger: true,
    });
    if (ok) {
      deletePaymentRecord(p.id);
    }
  };

  const handleSelectPmCustomer = (cid: string) => {
    setPmSelectedCust(cid);
    const found = customers.find((c) => c.id === cid);
    if (found) setPmCustomer(found.nama);
  };

  const handleAddPiutangMitra = (e: React.FormEvent) => {
    e.preventDefault();
    const nom = cleanRupiahToNumber(pmNominalStr);
    if (!pmCustomer.trim()) {
      showToast('Isi nama PT / Pemasok terlebih dahulu.', 'warning');
      return;
    }
    if (nom <= 0) {
      showToast('Nominal piutang harus lebih dari Rp 0.', 'warning');
      return;
    }
    addPiutangMitra({
      tanggal: pmTanggal || getTodayISO(),
      customer: pmCustomer.trim(),
      keterangan: pmKeterangan.trim() || 'Utang Pemasok / Pinjaman Mitra',
      nominalAwal: nom,
      catatKasKeluar: pmCatatKas,
    });
    setPmSelectedCust('');
    setPmCustomer('');
    setPmKeterangan('');
    setPmNominalStr('');
    setPmCatatKas(false);
  };

  const handleConfirmMitraPay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingMitra) return;
    const nom = cleanRupiahToNumber(mitraPayStr);
    if (nom <= 0) return;
    payPiutangMitra(payingMitra.id, nom, {
      tanggal: mitraPayTgl || getTodayISO(),
      metode: mitraPayMetode,
      catatKasMasuk: mitraCatatKas,
      keterangan: mitraPayKet.trim(),
    });
    setPayingMitra(null);
  };

  const handleDeleteMitra = async (pm: KtPiutangMitra) => {
    const ok = await requestConfirm({
      title: 'Hapus Piutang Mitra',
      message: `Hapus catatan piutang ${pm.kode} (${pm.customer}) beserta riwayat cicilannya?`,
      confirmLabel: 'Hapus',
      danger: true,
    });
    if (ok) {
      deletePiutangMitra(pm.id);
    }
  };

  const payingTrxHistory = payingTrx ? paymentsByTrxId[payingTrx.id] || [] : [];
  const payingTrxSupplierDebt = payingTrx ? getSupplierDebt(payingTrx.customer) : 0;

  return (
    <section className="space-y-5">
      <PageHeader
        suiteLabel="Kas & Tonase"
        pageLabel="Hutang piutang"
        title="Hutang & Piutang"
        subtitle="Catat pembayaran bertanggal per nota (termasuk Potong Utang Pemasok) & pantau riwayat cicilan mitra."
        actions={
          <div className="inline-flex rounded-xl t-card p-1">
            <button
              type="button"
              onClick={() => setActiveTab('nota')}
              className={`px-4 py-1.5 rounded-lg text-xs whitespace-nowrap ${
                activeTab === 'nota' ? 't-btn-primary' : 'font-semibold t-muted'
              }`}
            >
              Hutang &amp; Piutang Nota ({unpaidCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mitra')}
              className={`px-4 py-1.5 rounded-lg text-xs whitespace-nowrap ${
                activeTab === 'mitra' ? 't-btn-primary' : 'font-semibold t-muted'
              }`}
            >
              Piutang Mitra ({mitraStats.openCount})
            </button>
          </div>
        }
      />

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="t-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="t-field-label">Utang Kita ke Mitra (Nota Beli)</div>
              <div className="text-2xl font-display t-text mt-2 tabular-nums">
                {formatRupiah(totalHutang)}
              </div>
            </div>
            <div className="w-14 h-14 rounded-xl bg-transparent flex items-center justify-center shrink-0">
              <RingkasanSpotIcon kind="kt-hutang-beli" size={54} onDark={isDark} />
            </div>
          </div>
        </div>
        <div className="t-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="t-field-label">Piutang Nota Jual</div>
              <div className="text-2xl font-display t-text mt-2 tabular-nums">
                {formatRupiah(totalPiutangNota)}
              </div>
            </div>
            <div className="w-14 h-14 rounded-xl bg-transparent flex items-center justify-center shrink-0">
              <RingkasanSpotIcon kind="kt-piutang-jual" size={54} onDark={isDark} />
            </div>
          </div>
        </div>
        <div className="t-card-accent p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-medium" style={{ color: 'var(--card-accent-muted)' }}>
                Sisa Piutang Mitra (Utang PT)
              </div>
              <div className="text-2xl font-display text-white mt-2 tabular-nums">
                {formatRupiah(mitraStats.totalSisa)}
              </div>
            </div>
            <div className="w-14 h-14 rounded-xl bg-transparent flex items-center justify-center shrink-0">
              <RingkasanSpotIcon kind="kt-piutang-mitra" size={54} onDark />
            </div>
          </div>
          <div className="text-[11px] text-white/75 font-mono-num mt-2">
            {mitraStats.openCount} mitra aktif
          </div>
        </div>
        <div className="t-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="t-field-label">Total Catatan Pembayaran</div>
              <div className="text-2xl font-display t-text mt-2 tabular-nums">
                {payments.length} <span className="text-sm font-normal t-muted">riwayat</span>
              </div>
            </div>
            <div className="w-14 h-14 rounded-xl bg-transparent flex items-center justify-center shrink-0">
              <RingkasanSpotIcon kind="kt-catatan-bayar" size={54} onDark={isDark} />
            </div>
          </div>
          <div className="text-[11px] t-muted font-mono-num mt-2">
            Terhubung ke Buku Kas &amp; Mitra
          </div>
        </div>
      </div>

      {activeTab === 'nota' ? (
        <div className="t-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b t-border flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <RingkasanSpotIcon kind="kt-daftar-nota" size={42} onDark={isDark} />
              <div className="min-w-0">
                <div className="t-section-label">Daftar Nota &amp; Riwayat Pembayaran</div>
                <p className="text-[11px] t-muted mt-0.5">
                  Klik <b>Catat Pembayaran</b> untuk mengisi tanggal bayar, nominal, dan metode. Klik
                  baris / <b>Riwayat</b> untuk melihat rincian cicilan per nota.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 t-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={notaSearch}
                  onChange={(e) => setNotaSearch(e.target.value)}
                  placeholder="Cari no. nota / mitra..."
                  className="text-xs pl-8 pr-3 py-1.5 rounded-xl t-input"
                />
              </div>
              <div className="relative">
                <ArrowLeftRight className="w-3.5 h-3.5 t-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={notaTipeFilter}
                  onChange={(e) => setNotaTipeFilter(e.target.value as 'ALL' | 'Beli' | 'Jual')}
                  className="text-xs pl-8 pr-7 py-1.5 rounded-xl t-input appearance-none"
                >
                  <option value="ALL">Semua Jenis</option>
                  <option value="Beli">Hutang (Beli)</option>
                  <option value="Jual">Piutang (Jual)</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 t-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <div className="relative">
                <Filter className="w-3.5 h-3.5 t-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={notaStatusFilter}
                  onChange={(e) => setNotaStatusFilter(e.target.value as 'OPEN' | 'ALL' | 'LUNAS')}
                  className="text-xs pl-8 pr-7 py-1.5 rounded-xl t-input font-semibold appearance-none"
                >
                  <option value="OPEN">Belum Lunas ({unpaidCount})</option>
                  <option value="LUNAS">Sudah Lunas</option>
                  <option value="ALL">Semua Nota ({transactions.length})</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 t-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="t-subtle border-b t-border">
                  <th className="py-3.5 px-4 t-th-label">Nota &amp; Tanggal</th>
                  <th className="py-3.5 px-3 t-th-label">Jenis</th>
                  <th className="py-3.5 px-3 t-th-label">Mitra</th>
                  <th className="py-3.5 px-3 t-th-label text-right">Total Nota</th>
                  <th className="py-3.5 px-3 t-th-label text-right">Kas / Nonkas</th>
                  <th className="py-3.5 px-3 t-th-label text-right">Sisa Tagihan</th>
                  <th className="py-3.5 px-4 t-th-label text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y t-border">
                {filteredNotas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center t-muted">
                      {notaStatusFilter === 'OPEN'
                        ? 'Semua transaksi nota sudah lunas. Ubah filter ke "Semua Nota" untuk melihat riwayat pembayaran nota yang sudah lunas.'
                        : 'Tidak ada nota yang cocok dengan filter.'}
                    </td>
                  </tr>
                ) : (
                  filteredNotas.map((t) => {
                    const trxPayments = paymentsByTrxId[t.id] || [];
                    const expanded = Boolean(expandedNotaIds[t.id]);
                    return (
                      <Fragment key={t.id}>
                        <tr className="t-row-hover">
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => toggleNotaExpand(t.id)}
                              className="inline-flex items-center gap-1.5 font-bold font-mono-num t-text hover:underline"
                            >
                              {expanded ? (
                                <ChevronDown className="w-3.5 h-3.5 t-muted" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 t-muted" />
                              )}
                              <span>{t.nota}</span>
                            </button>
                            <div className="text-[10px] t-muted font-mono-num pl-5">
                              {formatDateShortID(t.tanggal)}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className="text-[11px] font-bold"
                              style={{
                                color:
                                  t.tipe === 'Beli'
                                    ? 'var(--status-warn-text)'
                                    : 'var(--status-info-text)',
                              }}
                            >
                              {t.tipe === 'Beli' ? 'Hutang (Beli)' : 'Piutang (Jual)'}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold t-text">{t.customer}</td>
                          <td className="py-3 px-3 text-right font-mono-num t-text">
                            {formatRupiah(t.totalBayar)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-num t-muted">
                            <div>Kas {formatRupiah(t.dibayar)}</div>
                            {(t.potongUtang || 0) > 0 && (
                              <div className="text-[10px] t-link font-semibold">
                                Potong {formatRupiah(t.potongUtang || 0)}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-num font-bold">
                            <span
                              style={{
                                color:
                                  (t.sisa || 0) > 0
                                    ? 'var(--status-warn-text)'
                                    : 'var(--status-ok-text)',
                              }}
                            >
                              {(t.sisa || 0) > 0 ? formatRupiah(t.sisa) : 'Lunas'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              {(t.sisa || 0) > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setPayingTrx(t)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg t-btn-primary text-[11px] whitespace-nowrap"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>Catat Pembayaran</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => toggleNotaExpand(t.id)}
                                className="inline-flex items-center gap-1 t-link font-semibold hover:underline text-[11px]"
                              >
                                <History className="w-3.5 h-3.5" />
                                <span>Riwayat ({trxPayments.length})</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDetailTrx(t)}
                                className="inline-flex items-center gap-1 t-muted hover:t-text font-semibold text-[11px]"
                                title="Lihat Detail Nota"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Nota</span>
                              </button>
                            </div>
                          </td>
                        </tr>

                        {expanded && (
                          <tr className="t-subtle">
                            <td colSpan={7} className="px-6 py-3.5">
                              <div className="t-card rounded-xl overflow-hidden border t-border">
                                <div className="px-3.5 py-2 border-b t-border flex items-center justify-between text-[11px]">
                                  <span className="font-bold t-text">
                                    Riwayat Pembayaran Nota {t.nota} &mdash; {t.customer}
                                  </span>
                                  <span className="t-muted font-mono-num">
                                    {trxPayments.length} catatan pembayaran
                                  </span>
                                </div>
                                {trxPayments.length === 0 ? (
                                  <div className="px-3.5 py-4 text-[11px] t-muted text-center">
                                    Belum ada pembayaran pada nota ini.
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-[11px]">
                                      <thead>
                                        <tr className="t-subtle border-b t-border">
                                          <th className="py-2 px-3 t-th-label">Tanggal Bayar</th>
                                          <th className="py-2 px-3 t-th-label">No. Nota</th>
                                          <th className="py-2 px-3 t-th-label">Metode</th>
                                          <th className="py-2 px-3 t-th-label">Aliran Kas</th>
                                          <th className="py-2 px-3 t-th-label">Catatan</th>
                                          <th className="py-2 px-3 t-th-label text-right">
                                            Nominal
                                          </th>
                                          <th className="py-2 px-3 t-th-label text-center">Aksi</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y t-border">
                                        {trxPayments.map((p) => (
                                          <tr key={p.id}>
                                            <td className="py-2 px-3 font-mono-num font-semibold t-text">
                                              {formatDateShortID(p.tanggal)}
                                            </td>
                                            <td className="py-2 px-3 font-mono-num t-text">
                                              {p.nota}
                                            </td>
                                            <td className="py-2 px-3 font-semibold t-text">
                                              {p.metode}
                                            </td>
                                            <td className="py-2 px-3">
                                              <span
                                                className="font-bold"
                                                style={{
                                                  color: p.isNonKas
                                                    ? 'var(--status-info-text)'
                                                    : p.tipe === 'Jual'
                                                      ? 'var(--status-ok-text)'
                                                      : 'var(--status-warn-text)',
                                                }}
                                              >
                                                {p.isNonKas
                                                  ? 'Pelunasan Nonkas'
                                                  : p.tipe === 'Jual'
                                                    ? 'Kas Masuk'
                                                    : 'Kas Keluar'}
                                              </span>
                                            </td>
                                            <td className="py-2 px-3 t-muted">
                                              {p.catatan || '-'}
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono-num font-bold t-text">
                                              {formatRupiah(p.nominal)}
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                              {p.source === 'cicilan' ? (
                                                <button
                                                  type="button"
                                                  onClick={() => handleDeletePayment(p)}
                                                  className="inline-flex items-center gap-1 font-semibold hover:underline"
                                                  style={{ color: 'var(--status-bad-text)' }}
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                  <span>Batal</span>
                                                </button>
                                              ) : (
                                                <span className="text-[10px] t-muted">Awal</span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Form Catat Piutang Mitra */}
          <form onSubmit={handleAddPiutangMitra} className="t-card rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="t-section-label">Catat Utang Pemasok (Piutang Mitra)</div>
                <p className="text-xs t-muted mt-0.5">
                  Saldo ini akan otomatis muncul di Transaksi &rarr; Beli maupun saat pelunasan
                  Nota Beli dengan opsi Potong Utang Pemasok.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block t-field-label mb-1">Tanggal</label>
                <input
                  type="date"
                  value={pmTanggal}
                  onChange={(e) => setPmTanggal(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 rounded-xl t-input font-mono-num"
                />
              </div>
              <div>
                <label className="block t-field-label mb-1">Pilih Pemasok (opsional)</label>
                <select
                  value={pmSelectedCust}
                  onChange={(e) => handleSelectPmCustomer(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl t-input font-semibold"
                >
                  <option value="">-- Dari Daftar Mitra --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block t-field-label mb-1">Nama PT / Pemasok *</label>
                <input
                  type="text"
                  value={pmCustomer}
                  onChange={(e) => setPmCustomer(e.target.value)}
                  required
                  placeholder="cth: CV Maju Jaya"
                  className="w-full text-xs px-3 py-2 rounded-xl t-input font-bold"
                />
              </div>
              <div>
                <label className="block t-field-label mb-1">Keterangan</label>
                <input
                  type="text"
                  value={pmKeterangan}
                  onChange={(e) => setPmKeterangan(e.target.value)}
                  placeholder="cth: Utang lama / Uang muka"
                  className="w-full text-xs px-3 py-2 rounded-xl t-input"
                />
              </div>
              <div>
                <label className="block t-field-label mb-1">Nominal Utang PT (Rp) *</label>
                <input
                  type="text"
                  value={pmNominalStr}
                  onChange={(e) => setPmNominalStr(formatCurrencyInput(e.target.value))}
                  required
                  placeholder="1.000.000"
                  className="w-full text-xs px-3 py-2 rounded-xl t-input font-mono-num font-bold"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label className="inline-flex items-center gap-2 text-xs t-muted cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={pmCatatKas}
                  onChange={(e) => setPmCatatKas(e.target.checked)}
                  className="w-4 h-4 rounded accent-[var(--accent-brand)]"
                />
                <span>
                  Catat juga sebagai <b>Kas Keluar</b> pada tanggal di atas (centang jika uang baru
                  diserahkan)
                </span>
              </label>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl t-btn-primary text-xs inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Simpan Piutang Mitra</span>
              </button>
            </div>
          </form>

          {/* Daftar Piutang Mitra & Riwayat Cicilan per Nota */}
          <div className="t-card rounded-2xl overflow-hidden">
            <div className="p-4 border-b t-border flex flex-wrap items-center justify-between gap-3">
              <span className="t-section-label">
                Daftar Piutang Mitra &amp; Riwayat Cicilan per Nota
              </span>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={pmSearch}
                  onChange={(e) => setPmSearch(e.target.value)}
                  placeholder="Cari kode / nama PT..."
                  className="text-xs px-3 py-1.5 rounded-xl t-input"
                />
                <select
                  value={pmStatusFilter}
                  onChange={(e) => setPmStatusFilter(e.target.value as 'ALL' | 'OPEN' | 'LUNAS')}
                  className="text-xs px-3 py-1.5 rounded-xl t-input"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="OPEN">Belum Lunas</option>
                  <option value="LUNAS">Lunas</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="t-subtle border-b t-border">
                    <th className="py-3.5 px-4 t-th-label">Kode &amp; Tanggal</th>
                    <th className="py-3.5 px-3 t-th-label">Pemasok / PT &amp; Keterangan</th>
                    <th className="py-3.5 px-3 t-th-label text-right">Utang Awal</th>
                    <th className="py-3.5 px-3 t-th-label text-right">Total Cicilan</th>
                    <th className="py-3.5 px-3 t-th-label text-right">Sisa Utang PT</th>
                    <th className="py-3.5 px-3 t-th-label text-center">Status</th>
                    <th className="py-3.5 px-4 t-th-label text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y t-border">
                  {filteredMitra.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center t-muted">
                        Belum ada data Piutang Mitra.
                      </td>
                    </tr>
                  ) : (
                    filteredMitra.map((pm) => {
                      const expanded = isRowExpanded(pm);
                      const cicilanList = pm.cicilan || [];
                      return (
                        <Fragment key={pm.id}>
                          <tr className="t-row-hover">
                            <td className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() => toggleExpand(pm)}
                                className="inline-flex items-center gap-1.5 font-bold font-mono-num t-text hover:underline"
                              >
                                {expanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 t-muted" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 t-muted" />
                                )}
                                <span>{pm.kode}</span>
                              </button>
                              <div className="text-[10px] t-muted font-mono-num pl-5">
                                {formatDateShortID(pm.tanggal)}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-bold t-text">{pm.customer}</div>
                              <div className="text-[11px] t-muted">{pm.keterangan}</div>
                            </td>
                            <td className="py-3 px-3 text-right font-mono-num t-text">
                              {formatRupiah(pm.nominalAwal)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono-num t-muted">
                              {formatRupiah(pm.terbayar)}
                            </td>
                            <td
                              className="py-3 px-3 text-right font-mono-num font-bold"
                              style={{
                                color:
                                  pm.sisa > 0
                                    ? 'var(--status-warn-text)'
                                    : 'var(--status-ok-text)',
                              }}
                            >
                              {formatRupiah(pm.sisa)}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span
                                className="text-[11px] font-bold whitespace-nowrap"
                                style={{
                                  color:
                                    pm.sisa === 0
                                      ? 'var(--status-ok-text)'
                                      : 'var(--status-warn-text)',
                                }}
                              >
                                {pm.sisa === 0 ? 'Lunas' : 'Belum Lunas'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center space-x-2 whitespace-nowrap">
                              {pm.sisa > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setPayingMitra(pm)}
                                  className="px-2.5 py-1 rounded-lg t-btn-primary text-[11px] whitespace-nowrap"
                                >
                                  Catat Cicilan
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => toggleExpand(pm)}
                                className="t-link font-semibold hover:underline"
                              >
                                Riwayat ({cicilanList.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMitra(pm)}
                                className="font-semibold hover:underline"
                                style={{ color: 'var(--status-bad-text)' }}
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>

                          {expanded && (
                            <tr className="t-subtle">
                              <td colSpan={7} className="px-6 py-3.5">
                                <div className="t-card rounded-xl overflow-hidden border t-border">
                                  <div className="px-3.5 py-2 border-b t-border flex items-center justify-between text-[11px]">
                                    <span className="font-bold t-text">
                                      Riwayat Cicilan per Nota &mdash; {pm.customer} ({pm.kode})
                                    </span>
                                    <span className="t-muted font-mono-num">
                                      {cicilanList.length} transaksi cicilan
                                    </span>
                                  </div>
                                  {cicilanList.length === 0 ? (
                                    <div className="px-3.5 py-4 text-[11px] t-muted text-center">
                                      Belum ada cicilan. Potong utang otomatis dari menu Transaksi
                                      &rarr; Beli atau klik Catat Cicilan untuk pembayaran langsung.
                                    </div>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left text-[11px]">
                                        <thead>
                                          <tr className="t-subtle border-b t-border">
                                            <th className="py-2 px-3 t-th-label">Tanggal</th>
                                            <th className="py-2 px-3 t-th-label">Sumber / Metode</th>
                                            <th className="py-2 px-3 t-th-label">No. Nota</th>
                                            <th className="py-2 px-3 t-th-label">Keterangan</th>
                                            <th className="py-2 px-3 t-th-label text-right">
                                              Nominal Cicilan
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y t-border">
                                          {cicilanList.map((c) => {
                                            const linkedTrx = c.trxId
                                              ? transactions.find((t) => t.id === c.trxId)
                                              : c.notaRef
                                                ? transactions.find((t) => t.nota === c.notaRef)
                                                : undefined;
                                            return (
                                              <tr key={c.id}>
                                                <td className="py-2 px-3 font-mono-num t-text">
                                                  {formatDateShortID(c.tanggal)}
                                                </td>
                                                <td className="py-2 px-3">
                                                  <span
                                                    className="font-bold"
                                                    style={{
                                                      color:
                                                        c.sumber === 'Potong Nota Beli'
                                                          ? 'var(--status-info-text)'
                                                          : 'var(--status-ok-text)',
                                                    }}
                                                  >
                                                    {c.sumber}
                                                    {c.metode && c.sumber !== 'Potong Nota Beli'
                                                      ? ` · ${c.metode}`
                                                      : ''}
                                                  </span>
                                                </td>
                                                <td className="py-2 px-3 font-mono-num">
                                                  {c.notaRef ? (
                                                    <div className="inline-flex items-center gap-2">
                                                      <span className="font-bold t-text">
                                                        {c.notaRef}
                                                      </span>
                                                      {linkedTrx && (
                                                        <button
                                                          type="button"
                                                          onClick={() => setDetailTrx(linkedTrx)}
                                                          className="inline-flex items-center gap-1 t-link font-semibold hover:underline"
                                                        >
                                                          <FileText className="w-3 h-3" />
                                                          <span>Detail</span>
                                                        </button>
                                                      )}
                                                    </div>
                                                  ) : (
                                                    <span className="t-muted">-</span>
                                                  )}
                                                </td>
                                                <td className="py-2 px-3 t-muted">
                                                  {c.keterangan || '-'}
                                                </td>
                                                <td
                                                  className="py-2 px-3 text-right font-mono-num font-bold"
                                                  style={{ color: 'var(--status-ok-text)' }}
                                                >
                                                  {formatRupiah(c.nominal)}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Pembayaran Nota dengan Riwayat */}
      <PayDebtModal
        transaction={payingTrx}
        history={payingTrxHistory}
        supplierDebt={payingTrxSupplierDebt}
        onClose={() => setPayingTrx(null)}
        onConfirmPay={payHutang}
      />

      {/* Modal Bayar Langsung Piutang Mitra */}
      {payingMitra && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPayingMitra(null);
          }}
        >
          <div className="w-full max-w-md t-card rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b t-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold t-text">Catat Cicilan Piutang Mitra</h3>
                <p className="text-xs t-muted mt-0.5">
                  {payingMitra.kode} &bull; {payingMitra.customer}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayingMitra(null)}
                aria-label="Tutup modal"
                className="p-1.5 rounded-lg t-btn-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmMitraPay} className="p-5 space-y-4">
              <div className="t-subtle rounded-xl p-3.5 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="t-muted">Utang awal</span>
                  <span className="font-mono-num font-semibold t-text">
                    {formatRupiah(payingMitra.nominalAwal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="t-muted">Sudah dicicil</span>
                  <span className="font-mono-num t-text">
                    {formatRupiah(payingMitra.terbayar)}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5 border-t t-border">
                  <span className="font-bold t-text">Sisa utang PT</span>
                  <span
                    className="font-mono-num font-bold"
                    style={{ color: 'var(--status-warn-text)' }}
                  >
                    {formatRupiah(payingMitra.sisa)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block t-field-label mb-1">Tanggal Bayar</label>
                  <input
                    type="date"
                    value={mitraPayTgl}
                    onChange={(e) => setMitraPayTgl(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl t-input text-xs font-mono-num font-semibold"
                  />
                </div>
                <div>
                  <label className="block t-field-label mb-1">Metode</label>
                  <select
                    value={mitraPayMetode}
                    onChange={(e) => setMitraPayMetode(e.target.value as 'Transfer' | 'Tunai')}
                    className="w-full px-3 py-2 rounded-xl t-input text-xs font-semibold"
                  >
                    <option value="Transfer">Transfer</option>
                    <option value="Tunai">Tunai</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="t-field-label">Nominal pembayaran (Rp)</label>
                  <button
                    type="button"
                    onClick={() => setMitraPayStr(formatNumberWithDots(payingMitra.sisa))}
                    className="text-[11px] t-link font-semibold hover:underline"
                  >
                    Lunasi penuh
                  </button>
                </div>
                <input
                  type="text"
                  value={mitraPayStr}
                  onChange={(e) => setMitraPayStr(formatCurrencyInput(e.target.value))}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl t-input text-sm font-mono-num font-bold"
                />
              </div>

              <div>
                <label className="block t-field-label mb-1">Catatan (opsional)</label>
                <input
                  type="text"
                  value={mitraPayKet}
                  onChange={(e) => setMitraPayKet(e.target.value)}
                  placeholder="cth: Transfer BCA pelunasan tahap 1"
                  className="w-full px-3 py-2 rounded-xl t-input text-xs"
                />
              </div>

              <label className="flex items-center gap-2 text-xs t-muted cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={mitraCatatKas}
                  onChange={(e) => setMitraCatatKas(e.target.checked)}
                  className="w-4 h-4 rounded accent-[var(--accent-brand)]"
                />
                <span>Catat pembayaran ini ke Buku Kas (Kas Masuk) pada tanggal bayar</span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingMitra(null)}
                  className="px-4 py-2 rounded-xl t-btn-secondary text-xs font-semibold"
                >
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl t-btn-primary text-xs">
                  Simpan Cicilan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Nota */}
      <NotaDetailModal
        transaction={detailTrx}
        onClose={() => setDetailTrx(null)}
        onEdit={(trx) => {
          setEditingTransaction(trx);
          setActiveMenu('menu-kt-transaksi');
        }}
      />
    </section>
  );
}
