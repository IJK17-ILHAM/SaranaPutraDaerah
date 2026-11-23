import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  ChevronDown,
  ClipboardEdit,
  Download,
  Filter,
  Gauge,
  History,
  Package,
  Receipt,
  Scale,
  Search,
  Weight,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { RingkasanSpotIcon } from '../../components/common/RingkasanSpotIcons';
import { NotaDetailModal } from '../../components/kasTonase/NotaDetailModal';
import { useApp } from '../../context/AppContext';
import { useKasTonase } from '../../context/KasTonaseContext';
import type { KtStockMutationType, KtTransaction } from '../../types/kasTonase';
import { exportKasTonaseToExcel } from '../../utils/exportExcel';
import {
  formatDateShortID,
  formatNumberWithDots,
  formatRupiah,
  formatTon,
  getTodayISO,
} from '../../utils/format';

export function KtStokPage() {
  const { setActiveMenu, theme } = useApp();
  const isDark = theme === 'dark';
  const {
    barangList,
    transactions,
    kasOps,
    piutangMitra,
    stockMutations,
    adjustStok,
    setEditingTransaction,
  } = useKasTonase();

  const [selectedId, setSelectedId] = useState(barangList[0]?.id || '');
  const [tanggalOpname, setTanggalOpname] = useState(getTodayISO());
  const [stokKg, setStokKg] = useState('');
  const [minKg, setMinKg] = useState('');
  const [alasan, setAlasan] = useState('');

  // Filters for Riwayat Mutasi Stok
  const [filterBarang, setFilterBarang] = useState('ALL');
  const [filterJenis, setFilterJenis] = useState<'ALL' | KtStockMutationType>('ALL');
  const [searchMutasi, setSearchMutasi] = useState('');
  const [detailNota, setDetailNota] = useState<KtTransaction | null>(null);
  const mutasiRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const target = barangList.find((b) => b.id === selectedId) || barangList[0];
    if (target) {
      if (target.id !== selectedId) setSelectedId(target.id);
      setStokKg(String(target.stokKg ?? 0));
      setMinKg(String(target.minKg ?? 0));
    }
  }, [barangList, selectedId]);

  const selectedBarang = useMemo(
    () => barangList.find((b) => b.id === selectedId) || null,
    [barangList, selectedId],
  );

  const previewDelta = useMemo(() => {
    if (!selectedBarang) return 0;
    const nextVal = parseFloat(stokKg);
    if (isNaN(nextVal)) return 0;
    return nextVal - (selectedBarang.stokKg || 0);
  }, [selectedBarang, stokKg]);

  const maxStock = Math.max(...barangList.map((b) => b.stokKg || 0), 1);

  const trxById = useMemo(() => {
    const map = new Map<string, KtTransaction>();
    transactions.forEach((t) => map.set(t.id, t));
    return map;
  }, [transactions]);

  const filteredMutations = useMemo(() => {
    const q = searchMutasi.trim().toLowerCase();
    return stockMutations
      .filter((m) => {
        if (filterBarang !== 'ALL') {
          const targetB = barangList.find((b) => b.id === filterBarang);
          const matchById = m.barangId === filterBarang;
          const matchByName =
            targetB && (m.barangNama || '').toLowerCase() === targetB.nama.toLowerCase();
          if (!matchById && !matchByName) return false;
        }
        if (filterJenis !== 'ALL' && m.jenis !== filterJenis) return false;
        if (!q) return true;
        return (
          (m.barangNama || '').toLowerCase().includes(q) ||
          (m.notaRef || '').toLowerCase().includes(q) ||
          (m.mitra || '').toLowerCase().includes(q) ||
          (m.alasan || '').toLowerCase().includes(q) ||
          (m.diinputOleh || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
  }, [barangList, filterBarang, filterJenis, searchMutasi, stockMutations]);

  const mutationSummary = useMemo(() => {
    return filteredMutations.reduce(
      (acc, m) => {
        if (m.jenis === 'Masuk') acc.masuk += Math.abs(m.deltaKg || 0);
        else if (m.jenis === 'Keluar') acc.keluar += Math.abs(m.deltaKg || 0);
        else {
          acc.opnameCount += 1;
          acc.opnameNet += m.deltaKg || 0;
        }
        return acc;
      },
      { masuk: 0, keluar: 0, opnameCount: 0, opnameNet: 0 },
    );
  }, [filteredMutations]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    adjustStok(
      selectedId,
      parseFloat(stokKg) || 0,
      parseFloat(minKg) || 0,
      alasan.trim() || undefined,
      tanggalOpname || getTodayISO(),
    );
    setAlasan('');
  };

  const handleInspectBarangMutasi = (barangId: string) => {
    setFilterBarang(barangId);
    setFilterJenis('ALL');
    mutasiRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleEditNota = (trx: KtTransaction) => {
    setEditingTransaction(trx);
    setDetailNota(null);
    setActiveMenu('menu-kt-transaksi');
  };

  return (
    <section className="space-y-5">
      <PageHeader
        suiteLabel="Kas & Tonase"
        pageLabel="Stok gudang"
        title="Stok Gudang"
        subtitle="Stok bertambah saat Beli, berkurang saat Jual, dan setiap koreksi opname tercatat beserta alasannya."
        actions={
          <button
            type="button"
            onClick={() => exportKasTonaseToExcel(transactions, barangList, kasOps, piutangMitra)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        }
      />

      {/* Form Stok Opname */}
      <form onSubmit={handleSubmit} className="t-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b t-border pb-2.5">
          <div className="flex items-center gap-2">
            <ClipboardEdit className="w-4 h-4 t-muted" />
            <span className="t-section-label">Stok Opname &amp; Penyesuaian Gudang</span>
          </div>
          {selectedBarang && (
            <div className="text-xs t-muted font-mono-num">
              Stok tercatat:{' '}
              <strong className="t-text">{formatNumberWithDots(selectedBarang.stokKg)} kg</strong>
              {previewDelta !== 0 && (
                <span
                  className="ml-2 font-bold"
                  style={{
                    color:
                      previewDelta > 0 ? 'var(--status-ok-text)' : 'var(--status-bad-text)',
                  }}
                >
                  ({previewDelta > 0 ? '+' : ''}
                  {formatNumberWithDots(previewDelta)} kg)
                </span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div>
            <label className="block t-field-label mb-1">Tanggal Opname</label>
            <input
              type="date"
              value={tanggalOpname}
              onChange={(e) => setTanggalOpname(e.target.value)}
              required
              className="w-full text-xs px-3 py-2.5 rounded-xl t-input font-mono-num"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block t-field-label mb-1">Pilih Barang</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              required
              className="w-full text-xs px-3 py-2.5 rounded-xl t-input font-semibold"
            >
              {barangList.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nama} ({formatNumberWithDots(b.stokKg)} kg)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block t-field-label mb-1">Stok Aktual (Kg)</label>
            <input
              type="number"
              value={stokKg}
              onChange={(e) => setStokKg(e.target.value)}
              required
              min={0}
              step={1}
              className="w-full text-xs px-3 py-2.5 rounded-xl t-input font-mono-num font-bold"
            />
          </div>
          <div>
            <label className="block t-field-label mb-1">Batas Min (Kg)</label>
            <input
              type="number"
              value={minKg}
              onChange={(e) => setMinKg(e.target.value)}
              required
              min={0}
              step={1}
              className="w-full text-xs px-3 py-2.5 rounded-xl t-input font-mono-num"
            />
          </div>
          <button
            type="submit"
            className="py-2.5 px-4 rounded-xl t-btn-primary text-xs whitespace-nowrap"
          >
            Simpan Opname
          </button>
        </div>

        <div>
          <label className="block t-field-label mb-1">
            Alasan Koreksi Opname{' '}
            <span className="font-normal t-muted">
              (dicatat otomatis di Riwayat Mutasi Stok jika stok berubah)
            </span>
          </label>
          <input
            type="text"
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            placeholder="Contoh: Susut kadar air / hasil timbang ulang fisik gudang"
            className="w-full text-xs px-3 py-2.5 rounded-xl t-input"
          />
        </div>
      </form>

      {/* Current Stock Table */}
      <div className="t-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="t-subtle border-b t-border">
                <th className="py-3.5 px-4 t-th-label">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <Package className="w-3.5 h-3.5 shrink-0 opacity-75" />
                    <span>Nama Barang</span>
                  </span>
                </th>
                <th className="py-3.5 px-3 t-th-label text-right">
                  <span className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                    <Scale className="w-3.5 h-3.5 shrink-0 opacity-75" />
                    <span>Stok (Kg)</span>
                  </span>
                </th>
                <th className="py-3.5 px-3 t-th-label text-right">
                  <span className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                    <Weight className="w-3.5 h-3.5 shrink-0 opacity-75" />
                    <span>Stok (Ton)</span>
                  </span>
                </th>
                <th className="py-3.5 px-3 t-th-label text-right">
                  <span className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 opacity-75" />
                    <span>Batas Min (Kg)</span>
                  </span>
                </th>
                <th className="py-3.5 px-3 t-th-label w-32">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <Gauge className="w-3.5 h-3.5 shrink-0 opacity-75" />
                    <span>Level</span>
                  </span>
                </th>
                <th className="py-3.5 px-3 t-th-label text-right">
                  <span className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                    <Banknote className="w-3.5 h-3.5 shrink-0 opacity-75" />
                    <span>Nilai Aset (HPP)</span>
                  </span>
                </th>
                <th className="py-3.5 px-3 t-th-label text-center">
                  <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                    <BadgeCheck className="w-3.5 h-3.5 shrink-0 opacity-75" />
                    <span>Status</span>
                  </span>
                </th>
                <th className="py-3.5 px-4 t-th-label text-center">
                  <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                    <History className="w-3.5 h-3.5 shrink-0 opacity-75" />
                    <span>Mutasi</span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y t-border">
              {barangList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center t-muted">
                    Belum ada data barang di gudang.
                  </td>
                </tr>
              ) : (
                barangList.map((b) => {
                  const low = (b.stokKg || 0) <= (b.minKg || 0);
                  const pct = Math.max(6, Math.round(((b.stokKg || 0) / maxStock) * 100));
                  return (
                    <tr key={b.id} className="t-row-hover">
                      <td className="py-3 px-4 font-bold t-text">{b.nama}</td>
                      <td className="py-3 px-3 text-right font-mono-num font-bold t-text whitespace-nowrap">
                        {formatNumberWithDots(b.stokKg || 0)} kg
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num t-muted whitespace-nowrap">
                        {formatTon(b.stokKg, 2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num t-muted whitespace-nowrap">
                        {formatNumberWithDots(b.minKg || 0)} kg
                      </td>
                      <td className="py-3 px-3">
                        <div className="w-full h-2 rounded-full t-subtle overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: low ? '#F59E0B' : 'var(--accent-brand)',
                            }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num font-semibold t-text whitespace-nowrap">
                        {formatRupiah((b.stokKg || 0) * (b.hargaBeli || 0))}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className="text-[11px] font-bold whitespace-nowrap"
                          style={{
                            color: low ? 'var(--status-warn-text)' : 'var(--status-ok-text)',
                          }}
                        >
                          {low ? 'Stok menipis' : 'Aman'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleInspectBarangMutasi(b.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg t-btn-secondary text-[11px] font-semibold whitespace-nowrap"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>Mutasi</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Riwayat Mutasi Stok */}
      <div ref={mutasiRef} className="t-card rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b t-border space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-transparent flex items-center justify-center shrink-0">
                <RingkasanSpotIcon kind="kt-stok-barang" size={42} onDark={isDark} />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold t-text">Riwayat Mutasi Stok</h2>
                <p className="text-xs t-muted mt-0.5">
                  Telusuri stok masuk dari Nota Beli, stok keluar dari Nota Jual, dan koreksi Stok Opname per barang.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono-num">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl t-subtle border t-border">
                <ArrowDownLeft
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: 'var(--status-ok-text)' }}
                />
                <span className="t-muted">Masuk:</span>
                <strong style={{ color: 'var(--status-ok-text)' }}>
                  +{formatNumberWithDots(mutationSummary.masuk)} kg
                </strong>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl t-subtle border t-border">
                <ArrowUpRight
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: 'var(--status-bad-text)' }}
                />
                <span className="t-muted">Keluar:</span>
                <strong style={{ color: 'var(--status-bad-text)' }}>
                  -{formatNumberWithDots(mutationSummary.keluar)} kg
                </strong>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl t-subtle border t-border">
                <ClipboardEdit
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: 'var(--status-info-text)' }}
                />
                <span className="t-muted">Opname ({mutationSummary.opnameCount}):</span>
                <strong style={{ color: 'var(--status-info-text)' }}>
                  {mutationSummary.opnameNet > 0 ? '+' : ''}
                  {formatNumberWithDots(mutationSummary.opnameNet)} kg
                </strong>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Package className="w-3.5 h-3.5 t-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={filterBarang}
                onChange={(e) => setFilterBarang(e.target.value)}
                aria-label="Filter barang mutasi"
                className="w-full text-xs pl-8 pr-8 py-2 rounded-xl t-input font-semibold appearance-none cursor-pointer"
              >
                <option value="ALL">Semua Barang</option>
                {barangList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nama}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 t-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative">
              <Filter className="w-3.5 h-3.5 t-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={filterJenis}
                onChange={(e) => setFilterJenis(e.target.value as 'ALL' | KtStockMutationType)}
                aria-label="Filter jenis mutasi"
                className="w-full text-xs pl-8 pr-8 py-2 rounded-xl t-input font-semibold appearance-none cursor-pointer"
              >
                <option value="ALL">Semua Jenis Mutasi</option>
                <option value="Masuk">Stok Masuk (Nota Beli)</option>
                <option value="Keluar">Stok Keluar (Nota Jual)</option>
                <option value="Opname">Koreksi Stok Opname</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 t-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 t-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchMutasi}
                onChange={(e) => setSearchMutasi(e.target.value)}
                placeholder="Cari no. nota, mitra, atau alasan..."
                className="w-full text-xs pl-8 pr-3 py-2 rounded-xl t-input"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="t-subtle border-b t-border">
                <th className="py-3 px-4 t-th-label">Tanggal</th>
                <th className="py-3 px-3 t-th-label">Barang</th>
                <th className="py-3 px-3 t-th-label">Jenis</th>
                <th className="py-3 px-3 t-th-label text-right">Mutasi (Kg)</th>
                <th className="py-3 px-3 t-th-label text-right">Stok Akhir</th>
                <th className="py-3 px-3 t-th-label">Referensi Nota / Alasan Koreksi</th>
                <th className="py-3 px-4 t-th-label">Mitra / Petugas</th>
              </tr>
            </thead>
            <tbody className="divide-y t-border">
              {filteredMutations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center t-muted">
                    Belum ada riwayat mutasi stok untuk filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredMutations.map((m) => {
                  const linkedTrx = m.trxId ? trxById.get(m.trxId) : undefined;
                  const isPositive = (m.deltaKg || 0) >= 0;
                  const jenisColor =
                    m.jenis === 'Masuk'
                      ? 'var(--status-ok-text)'
                      : m.jenis === 'Keluar'
                        ? 'var(--status-bad-text)'
                        : 'var(--status-info-text)';
                  return (
                    <tr key={m.id} className="t-row-hover">
                      <td className="py-2.5 px-4 font-mono-num t-muted whitespace-nowrap">
                        {formatDateShortID(m.tanggal)}
                      </td>
                      <td className="py-2.5 px-3 font-bold t-text whitespace-nowrap">
                        {m.barangNama}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-bold"
                          style={{ color: jenisColor }}
                        >
                          {m.jenis === 'Masuk' && <ArrowDownLeft className="w-3.5 h-3.5" />}
                          {m.jenis === 'Keluar' && <ArrowUpRight className="w-3.5 h-3.5" />}
                          {m.jenis === 'Opname' && <ClipboardEdit className="w-3.5 h-3.5" />}
                          <span>{m.sumber}</span>
                        </span>
                      </td>
                      <td
                        className="py-2.5 px-3 text-right font-mono-num font-bold whitespace-nowrap"
                        style={{
                          color: isPositive
                            ? 'var(--status-ok-text)'
                            : 'var(--status-bad-text)',
                        }}
                      >
                        {isPositive ? '+' : ''}
                        {formatNumberWithDots(m.deltaKg)} kg
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num t-muted whitespace-nowrap">
                        {typeof m.stokSetelahKg === 'number'
                          ? `${formatNumberWithDots(m.stokSetelahKg)} kg`
                          : '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        {linkedTrx ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDetailNota(linkedTrx)}
                              className="inline-flex items-center gap-1 font-mono-num font-bold t-link hover:underline whitespace-nowrap"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>{m.notaRef || linkedTrx.nota}</span>
                            </button>
                            {m.alasan && <span className="t-muted text-[11px]">{m.alasan}</span>}
                          </div>
                        ) : (
                          <div className="t-text">
                            {m.notaRef && (
                              <span className="font-mono-num font-semibold mr-1.5">
                                {m.notaRef}
                              </span>
                            )}
                            <span className={m.jenis === 'Opname' ? 't-text' : 't-muted'}>
                              {m.alasan || '-'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 t-muted whitespace-nowrap">
                        {m.mitra || m.diinputOleh || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NotaDetailModal
        transaction={detailNota}
        onClose={() => setDetailNota(null)}
        onEdit={handleEditNota}
      />
    </section>
  );
}
