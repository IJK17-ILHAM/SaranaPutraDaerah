import {
  ArrowLeftRight,
  ChevronDown,
  CreditCard,
  Download,
  FileText,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { RingkasanSpotIcon } from '../../components/common/RingkasanSpotIcons';
import { NotaDetailModal } from '../../components/kasTonase/NotaDetailModal';
import { useApp } from '../../context/AppContext';
import { useKasTonase } from '../../context/KasTonaseContext';
import type { KtTransaction } from '../../types/kasTonase';
import { exportKasTonaseToExcel } from '../../utils/exportExcel';
import {
  cleanRupiahToNumber,
  formatCurrencyInput,
  formatDateShortID,
  formatNumberWithDots,
  formatRupiah,
  getTodayISO,
} from '../../utils/format';
import { type BukuKasFlow, buildBukuKasEntries } from '../../utils/kasLedger';

type LaporanTab = 'buku-kas' | 'margin' | 'kas-ops';

export function KtLaporanPage() {
  const { theme, triggerPrint, requestConfirm, setActiveMenu } = useApp();
  const isDark = theme === 'dark';
  const {
    barangList,
    transactions,
    kasOps,
    piutangMitra,
    payments,
    saveKasOps,
    deleteKasOps,
    setEditingTransaction,
  } = useKasTonase();

  const [activeTab, setActiveTab] = useState<LaporanTab>('buku-kas');
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState('');

  // Buku Kas filters
  const [flowFilter, setFlowFilter] = useState<'ALL' | BukuKasFlow>('ALL');
  const [metodeFilter, setMetodeFilter] = useState<string>('ALL');
  const [kasSearch, setKasSearch] = useState('');
  const [detailTrx, setDetailTrx] = useState<KtTransaction | null>(null);

  // Kas Operasional form
  const [kasTgl, setKasTgl] = useState(getTodayISO);
  const [kasJenis, setKasJenis] = useState<'Masuk' | 'Keluar'>('Keluar');
  const [kasMetode, setKasMetode] = useState<'Tunai' | 'Transfer'>('Tunai');
  const [kasKet, setKasKet] = useState('');
  const [kasNom, setKasNom] = useState('');

  const allBukuKas = useMemo(() => buildBukuKasEntries(payments, kasOps), [kasOps, payments]);

  const filteredBukuKas = useMemo(() => {
    const q = kasSearch.trim().toLowerCase();
    return allBukuKas.filter((entry) => {
      if (dari && entry.tanggal < dari) return false;
      if (sampai && entry.tanggal > sampai) return false;
      if (flowFilter !== 'ALL' && entry.flow !== flowFilter) return false;
      if (metodeFilter !== 'ALL' && entry.metode !== metodeFilter) return false;
      if (!q) return true;
      return (
        entry.uraian.toLowerCase().includes(q) ||
        entry.mitra.toLowerCase().includes(q) ||
        (entry.notaRef || '').toLowerCase().includes(q) ||
        entry.kategori.toLowerCase().includes(q)
      );
    });
  }, [allBukuKas, dari, flowFilter, kasSearch, metodeFilter, sampai]);

  const bukuKasTotals = useMemo(() => {
    let masuk = 0;
    let keluar = 0;
    let nonKas = 0;
    filteredBukuKas.forEach((e) => {
      masuk += e.kasMasuk;
      keluar += e.kasKeluar;
      nonKas += e.nonKas;
    });
    return { masuk, keluar, bersih: masuk - keluar, nonKas };
  }, [filteredBukuKas]);

  const filteredTrx = useMemo(
    () =>
      transactions.filter(
        (t) => (!dari || t.tanggal >= dari) && (!sampai || t.tanggal <= sampai),
      ),
    [dari, sampai, transactions],
  );

  const filteredKas = useMemo(
    () => kasOps.filter((k) => (!dari || k.tanggal >= dari) && (!sampai || k.tanggal <= sampai)),
    [dari, kasOps, sampai],
  );

  const barangSummary = useMemo(() => {
    const map: Record<string, { kgB: number; rpB: number; kgJ: number; rpJ: number }> = {};
    filteredTrx.forEach((t) => {
      (t.items || []).forEach((it) => {
        if (!map[it.nama]) map[it.nama] = { kgB: 0, rpB: 0, kgJ: 0, rpJ: 0 };
        if (t.tipe === 'Beli') {
          map[it.nama].kgB += it.netto || 0;
          map[it.nama].rpB += it.subtotal || 0;
        } else {
          map[it.nama].kgJ += it.netto || 0;
          map[it.nama].rpJ += it.subtotal || 0;
        }
      });
    });
    return Object.entries(map);
  }, [filteredTrx]);

  const handleSaveKas = (e: React.FormEvent) => {
    e.preventDefault();
    const nom = cleanRupiahToNumber(kasNom);
    if (nom <= 0 || !kasKet.trim()) return;
    saveKasOps({
      tanggal: kasTgl || getTodayISO(),
      jenis: kasJenis,
      metode: kasMetode,
      ket: kasKet.trim(),
      nominal: nom,
    });
    setKasKet('');
    setKasNom('');
  };

  const handleDeleteKas = async (id: string, ket: string) => {
    const ok = await requestConfirm({
      title: 'Hapus Catatan Kas',
      message: `Hapus catatan kas operasional "${ket}"?`,
      confirmLabel: 'Hapus',
      danger: true,
    });
    if (ok) deleteKasOps(id);
  };

  const openLinkedNota = (trxId?: string, notaRef?: string) => {
    const found = trxId
      ? transactions.find((t) => t.id === trxId)
      : notaRef
        ? transactions.find((t) => t.nota === notaRef)
        : undefined;
    if (found) setDetailTrx(found);
  };

  return (
    <section className="space-y-5">
      <PageHeader
        suiteLabel="Kas & Tonase"
        pageLabel="Laporan & Buku Kas"
        title="Buku Kas & Laporan"
        subtitle="Buku Kas berbasis tanggal pembayaran riil (termasuk pelunasan nonkas), rekap tonase per barang, dan kas operasional."
        actions={
          <>
            <button
              type="button"
              onClick={() => exportKasTonaseToExcel(transactions, barangList, kasOps, piutangMitra)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              onClick={() => triggerPrint({ type: 'kt-laporan', transactions: filteredTrx })}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl t-btn-primary text-xs whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Laporan A4</span>
            </button>
          </>
        }
      />

      {/* Tabs + Date Range Filter */}
      <div className="t-card p-4 rounded-2xl flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div className="inline-flex rounded-xl t-subtle p-1 border t-border self-start">
          <button
            type="button"
            onClick={() => setActiveTab('buku-kas')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs whitespace-nowrap ${
              activeTab === 'buku-kas' ? 't-btn-primary' : 'font-semibold t-muted'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Buku Kas ({allBukuKas.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('margin')}
            className={`px-3.5 py-1.5 rounded-lg text-xs whitespace-nowrap ${
              activeTab === 'margin' ? 't-btn-primary' : 'font-semibold t-muted'
            }`}
          >
            Tonase &amp; Margin
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('kas-ops')}
            className={`px-3.5 py-1.5 rounded-lg text-xs whitespace-nowrap ${
              activeTab === 'kas-ops' ? 't-btn-primary' : 'font-semibold t-muted'
            }`}
          >
            Kas Operasional ({kasOps.length})
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
          <div>
            <label className="block t-field-label mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={dari}
              onChange={(e) => setDari(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl t-input font-mono-num"
            />
          </div>
          <div>
            <label className="block t-field-label mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={sampai}
              onChange={(e) => setSampai(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl t-input font-mono-num"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setDari('');
              setSampai('');
            }}
            className="inline-flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Semua Tanggal</span>
          </button>
        </div>
      </div>

      {activeTab === 'buku-kas' && (
        <div className="space-y-5">
          {/* Buku Kas KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="t-card p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="t-field-label">Kas Masuk (Riil)</div>
                  <div
                    className="text-2xl font-display mt-2 tabular-nums"
                    style={{ color: 'var(--status-ok-text)' }}
                  >
                    {formatRupiah(bukuKasTotals.masuk)}
                  </div>
                </div>
                <div className="w-14 h-14 rounded-xl bg-transparent flex items-center justify-center shrink-0">
                  <RingkasanSpotIcon kind="kt-kas-masuk" size={54} onDark={isDark} />
                </div>
              </div>
              <div className="text-[11px] t-muted mt-2">Berdasarkan tanggal uang diterima</div>
            </div>

            <div className="t-card p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="t-field-label">Kas Keluar (Riil)</div>
                  <div
                    className="text-2xl font-display mt-2 tabular-nums"
                    style={{ color: 'var(--status-bad-text)' }}
                  >
                    {formatRupiah(bukuKasTotals.keluar)}
                  </div>
                </div>
                <div className="w-14 h-14 rounded-xl bg-transparent flex items-center justify-center shrink-0">
                  <RingkasanSpotIcon kind="kt-kas-keluar" size={54} onDark={isDark} />
                </div>
              </div>
              <div className="text-[11px] t-muted mt-2">Berdasarkan tanggal uang dibayarkan</div>
            </div>

            <div className="t-card-accent p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div
                    className="text-xs font-medium"
                    style={{ color: 'var(--card-accent-muted)' }}
                  >
                    Saldo Kas Bersih
                  </div>
                  <div className="text-2xl font-display text-white mt-2 tabular-nums">
                    {formatRupiah(bukuKasTotals.bersih)}
                  </div>
                </div>
                <div className="w-14 h-14 rounded-xl bg-transparent flex items-center justify-center shrink-0">
                  <RingkasanSpotIcon kind="kt-saldo-kas" size={54} onDark />
                </div>
              </div>
              <div className="text-[11px] text-white/75 mt-2">
                Kas Masuk &minus; Kas Keluar (tanpa nonkas)
              </div>
            </div>

            <div className="t-card p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="t-field-label">Pelunasan Nonkas</div>
                  <div className="text-2xl font-display t-link mt-2 tabular-nums">
                    {formatRupiah(bukuKasTotals.nonKas)}
                  </div>
                </div>
                <div className="w-14 h-14 rounded-xl bg-transparent flex items-center justify-center shrink-0">
                  <RingkasanSpotIcon kind="kt-nonkas" size={54} onDark={isDark} />
                </div>
              </div>
              <div className="text-[11px] t-muted mt-2">Potong utang pemasok (tidak ubah kas)</div>
            </div>
          </div>

          {/* Buku Kas Ledger Table */}
          <div className="t-card rounded-2xl overflow-hidden">
            <div className="p-4 border-b t-border flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <RingkasanSpotIcon kind="kt-buku-kas" size={42} onDark={isDark} />
                <div className="min-w-0">
                  <div className="t-section-label">Buku Kas (Tanggal Pembayaran Riil)</div>
                  <p className="text-[11px] t-muted mt-0.5">
                    Jika nota dibuat Senin dan dibayar Rabu, arus kas tercatat pada hari Rabu.
                    Potongan utang pemasok tercatat terpisah sebagai Pelunasan Nonkas.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 t-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={kasSearch}
                    onChange={(e) => setKasSearch(e.target.value)}
                    placeholder="Cari nota / mitra / uraian..."
                    className="text-xs pl-8 pr-3 py-1.5 rounded-xl t-input"
                  />
                </div>
                <div className="relative">
                  <ArrowLeftRight className="w-3.5 h-3.5 t-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={flowFilter}
                    onChange={(e) => setFlowFilter(e.target.value as 'ALL' | BukuKasFlow)}
                    className="text-xs pl-8 pr-7 py-1.5 rounded-xl t-input font-semibold appearance-none"
                  >
                    <option value="ALL">Semua Aliran</option>
                    <option value="Masuk">Kas Masuk</option>
                    <option value="Keluar">Kas Keluar</option>
                    <option value="Nonkas">Pelunasan Nonkas</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 t-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <div className="relative">
                  <CreditCard className="w-3.5 h-3.5 t-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={metodeFilter}
                    onChange={(e) => setMetodeFilter(e.target.value)}
                    className="text-xs pl-8 pr-7 py-1.5 rounded-xl t-input appearance-none"
                  >
                    <option value="ALL">Semua Metode</option>
                    <option value="Transfer">Transfer</option>
                    <option value="Tunai">Tunai</option>
                    <option value="Potong Utang Pemasok">Potong Utang Pemasok</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 t-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="t-subtle border-b t-border">
                    <th className="py-3 px-4 t-th-label">Tgl Bayar</th>
                    <th className="py-3 px-3 t-th-label">Kategori &amp; Uraian</th>
                    <th className="py-3 px-3 t-th-label">Mitra &amp; Nota</th>
                    <th className="py-3 px-3 t-th-label">Metode</th>
                    <th className="py-3 px-3 t-th-label text-right">Kas Masuk</th>
                    <th className="py-3 px-3 t-th-label text-right">Kas Keluar</th>
                    <th className="py-3 px-3 t-th-label text-right">Nonkas</th>
                    <th className="py-3 px-4 t-th-label text-right">Saldo Kas</th>
                  </tr>
                </thead>
                <tbody className="divide-y t-border">
                  {filteredBukuKas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center t-muted">
                        Belum ada arus kas atau pelunasan pada filter yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    filteredBukuKas.map((entry) => (
                      <tr key={entry.id} className="t-row-hover">
                        <td className="py-3 px-4 font-mono-num font-semibold t-text whitespace-nowrap">
                          {formatDateShortID(entry.tanggal)}
                        </td>
                        <td className="py-3 px-3">
                          <div
                            className="font-bold text-[11px]"
                            style={{
                              color:
                                entry.flow === 'Masuk'
                                  ? 'var(--status-ok-text)'
                                  : entry.flow === 'Keluar'
                                    ? 'var(--status-bad-text)'
                                    : 'var(--status-info-text)',
                            }}
                          >
                            {entry.kategori}
                          </div>
                          <div className="text-[11px] t-muted">{entry.uraian}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold t-text">{entry.mitra}</div>
                          {entry.notaRef && (
                            <button
                              type="button"
                              onClick={() => openLinkedNota(entry.trxId, entry.notaRef)}
                              className="inline-flex items-center gap-1 text-[10px] font-mono-num t-link font-semibold hover:underline"
                            >
                              <FileText className="w-3 h-3" />
                              <span>{entry.notaRef}</span>
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-3 text-[11px] font-semibold t-text whitespace-nowrap">
                          {entry.metode}
                        </td>
                        <td
                          className="py-3 px-3 text-right font-mono-num font-bold whitespace-nowrap"
                          style={{
                            color: entry.kasMasuk > 0 ? 'var(--status-ok-text)' : undefined,
                          }}
                        >
                          {entry.kasMasuk > 0 ? formatRupiah(entry.kasMasuk) : '-'}
                        </td>
                        <td
                          className="py-3 px-3 text-right font-mono-num font-bold whitespace-nowrap"
                          style={{
                            color: entry.kasKeluar > 0 ? 'var(--status-bad-text)' : undefined,
                          }}
                        >
                          {entry.kasKeluar > 0 ? formatRupiah(entry.kasKeluar) : '-'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num font-bold whitespace-nowrap t-link">
                          {entry.nonKas > 0 ? formatRupiah(entry.nonKas) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono-num font-bold t-text whitespace-nowrap">
                          {formatRupiah(entry.saldoSetelah)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'margin' && (
        <div className="t-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b t-border t-section-label">
            Rekap Tonase &amp; Margin per Barang
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="t-subtle border-b t-border">
                  <th className="py-3 px-4 t-th-label">Barang</th>
                  <th className="py-3 px-3 t-th-label text-right">Tonase Beli</th>
                  <th className="py-3 px-3 t-th-label text-right">Nilai Beli</th>
                  <th className="py-3 px-3 t-th-label text-right">Tonase Jual</th>
                  <th className="py-3 px-3 t-th-label text-right">Nilai Jual</th>
                  <th className="py-3 px-4 t-th-label text-right">Selisih / Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y t-border">
                {barangSummary.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center t-muted">
                      Belum ada transaksi tonase pada rentang tanggal ini.
                    </td>
                  </tr>
                ) : (
                  barangSummary.map(([nama, v]) => {
                    const selisih = v.rpJ - v.rpB;
                    return (
                      <tr key={nama} className="t-row-hover">
                        <td className="py-3 px-4 font-bold t-text">{nama}</td>
                        <td className="py-3 px-3 text-right font-mono-num">
                          {formatNumberWithDots(v.kgB)} kg
                        </td>
                        <td
                          className="py-3 px-3 text-right font-mono-num"
                          style={{ color: 'var(--status-bad-text)' }}
                        >
                          {formatRupiah(v.rpB)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num">
                          {formatNumberWithDots(v.kgJ)} kg
                        </td>
                        <td
                          className="py-3 px-3 text-right font-mono-num"
                          style={{ color: 'var(--status-ok-text)' }}
                        >
                          {formatRupiah(v.rpJ)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono-num font-bold ${
                            selisih >= 0 ? 't-link' : ''
                          }`}
                          style={selisih < 0 ? { color: 'var(--status-bad-text)' } : undefined}
                        >
                          {formatRupiah(selisih)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'kas-ops' && (
        <div className="t-card rounded-2xl p-5 space-y-4">
          <div className="t-section-label">
            Kas Operasional Tambahan (Uang Jalan, BBM, Tol, Drop Kas)
          </div>

          <form onSubmit={handleSaveKas} className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
            <div>
              <label className="block t-field-label mb-1">Tanggal</label>
              <input
                type="date"
                value={kasTgl}
                onChange={(e) => setKasTgl(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 rounded-xl t-input font-mono-num"
              />
            </div>
            <div>
              <label className="block t-field-label mb-1">Jenis</label>
              <select
                value={kasJenis}
                onChange={(e) => setKasJenis(e.target.value as 'Masuk' | 'Keluar')}
                className="w-full text-xs px-3 py-2 rounded-xl t-input font-semibold"
              >
                <option value="Keluar">Kas Keluar</option>
                <option value="Masuk">Kas Masuk</option>
              </select>
            </div>
            <div>
              <label className="block t-field-label mb-1">Metode</label>
              <select
                value={kasMetode}
                onChange={(e) => setKasMetode(e.target.value as 'Tunai' | 'Transfer')}
                className="w-full text-xs px-3 py-2 rounded-xl t-input font-semibold"
              >
                <option value="Tunai">Tunai</option>
                <option value="Transfer">Transfer</option>
              </select>
            </div>
            <div>
              <label className="block t-field-label mb-1">Uraian Biaya / Kas</label>
              <input
                type="text"
                value={kasKet}
                onChange={(e) => setKasKet(e.target.value)}
                required
                placeholder="Uang jalan / Solar..."
                className="w-full text-xs px-3 py-2 rounded-xl t-input"
              />
            </div>
            <div>
              <label className="block t-field-label mb-1">Nominal (Rp)</label>
              <input
                type="text"
                value={kasNom}
                onChange={(e) => setKasNom(formatCurrencyInput(e.target.value))}
                required
                placeholder="150.000"
                className="w-full text-xs px-3 py-2 rounded-xl t-input font-mono-num font-bold"
              />
            </div>
            <button
              type="submit"
              className="py-2 px-4 rounded-xl t-btn-primary text-xs inline-flex items-center justify-center gap-1 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Catat Kas</span>
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="t-subtle border-b t-border">
                  <th className="py-2.5 px-3 t-th-label">Tanggal</th>
                  <th className="py-2.5 px-3 t-th-label">Jenis</th>
                  <th className="py-2.5 px-3 t-th-label">Metode</th>
                  <th className="py-2.5 px-3 t-th-label">Uraian</th>
                  <th className="py-2.5 px-3 t-th-label text-right">Nominal</th>
                  <th className="py-2.5 px-3 t-th-label text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y t-border">
                {filteredKas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-5 text-center t-muted">
                      Belum ada kas operasional tambahan.
                    </td>
                  </tr>
                ) : (
                  filteredKas.map((k) => (
                    <tr key={k.id} className="t-row-hover">
                      <td className="py-2.5 px-3 font-mono-num t-text">
                        {formatDateShortID(k.tanggal)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className="text-[11px] font-bold"
                          style={{
                            color:
                              k.jenis === 'Masuk'
                                ? 'var(--status-ok-text)'
                                : 'var(--status-bad-text)',
                          }}
                        >
                          {k.jenis}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold t-muted">
                        {k.metode || 'Tunai'}
                      </td>
                      <td className="py-2.5 px-3 t-text">{k.ket}</td>
                      <td className="py-2.5 px-3 text-right font-mono-num font-bold t-text">
                        {formatRupiah(k.nominal)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteKas(k.id, k.ket)}
                          className="text-xs font-semibold hover:underline"
                          style={{ color: 'var(--status-bad-text)' }}
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
