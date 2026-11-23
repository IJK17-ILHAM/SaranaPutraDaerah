import { ChevronDown, Plus, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { RingkasanSpotIcon } from '../../components/common/RingkasanSpotIcons';
import { TrxTypeText } from '../../components/common/StatusBadge';
import { NotaDetailModal } from '../../components/kasTonase/NotaDetailModal';
import { useApp } from '../../context/AppContext';
import { useKasTonase } from '../../context/KasTonaseContext';
import type { KtDashboardPeriod, KtTransaction } from '../../types/kasTonase';
import {
  formatDateShortID,
  formatJuta,
  formatNumberWithDots,
  formatRupiah,
  formatTon,
  getDaysAgoISO,
  getTodayISO,
} from '../../utils/format';
import { buildBukuKasEntries } from '../../utils/kasLedger';

export function KtDashboardPage() {
  const { setActiveMenu, theme } = useApp();
  const isDark = theme === 'dark';
  const {
    barangList,
    transactions,
    kasOps,
    payments,
    isSyncing,
    refreshTonase,
    setEditingTransaction,
  } = useKasTonase();

  const [period, setPeriod] = useState<KtDashboardPeriod>('month');
  const [detailTrx, setDetailTrx] = useState<KtTransaction | null>(null);

  const todayStr = getTodayISO();
  const monthPrefix = todayStr.slice(0, 7);
  const weekStr = getDaysAgoISO(6);

  const metrics = useMemo(() => {
    const inPeriod = (tanggal: string) => {
      if (period === 'today') return tanggal === todayStr;
      if (period === 'week') return (tanggal || '') >= weekStr;
      if (period === 'month') return (tanggal || '').startsWith(monthPrefix);
      return true;
    };

    const fTrx = transactions.filter((t) => inPeriod(t.tanggal));
    const bukuKas = buildBukuKasEntries(payments, kasOps).filter((e) => inPeriod(e.tanggal));

    let kasMasuk = 0;
    let kasKeluar = 0;
    let tonJual = 0;
    let tonBeli = 0;

    bukuKas.forEach((e) => {
      kasMasuk += e.kasMasuk;
      kasKeluar += e.kasKeluar;
    });

    fTrx.forEach((t) => {
      if (t.tipe === 'Jual') tonJual += t.totalNetto || 0;
      else tonBeli += t.totalNetto || 0;
    });

    const selisih = kasMasuk - kasKeluar;
    const margin = kasMasuk > 0 ? Math.round((selisih / kasMasuk) * 100) : 0;
    const totalStokKg = barangList.reduce((acc, b) => acc + (b.stokKg || 0), 0);
    const lowStock = barangList.filter((b) => (b.stokKg || 0) <= (b.minKg || 0));

    return { kasMasuk, tonJual, kasKeluar, tonBeli, selisih, margin, totalStokKg, lowStock };
  }, [barangList, kasOps, monthPrefix, payments, period, todayStr, transactions, weekStr]);

  const sevenDayData = useMemo(() => {
    const days: Array<{ label: string; beli: number; jual: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate(),
      ).padStart(2, '0')}`;
      let beli = 0;
      let jual = 0;
      transactions
        .filter((t) => t.tanggal === iso)
        .forEach((t) => {
          if (t.tipe === 'Beli') beli += t.totalBayar || 0;
          else jual += t.totalBayar || 0;
        });
      days.push({
        label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(
          2,
          '0',
        )}`,
        beli,
        jual,
      });
    }
    return days;
  }, [transactions]);

  const maxDayVal = Math.max(...sevenDayData.map((d) => Math.max(d.beli, d.jual)), 1);
  const maxStockKg = Math.max(...barangList.map((b) => b.stokKg || 0), 1);
  const recentTransactions = transactions.slice(0, 6);

  const openNewTransaksi = () => {
    setEditingTransaction(null);
    setActiveMenu('menu-kt-transaksi');
  };

  return (
    <section className="space-y-5">
      <PageHeader
        suiteLabel="Kas & Tonase"
        pageLabel="Dashboard"
        title="Dashboard"
        subtitle="Monitoring Kas Masuk/Keluar, Tonase Beli & Jual, serta Stok Gudang (SPS Tonase)"
        actions={
          <>
            <button
              type="button"
              onClick={() => refreshTonase(true)}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync SPS</span>
            </button>
            <div className="relative inline-flex items-center">
              <span className="absolute left-2.5 flex items-center justify-center pointer-events-none">
                <RingkasanSpotIcon kind="periode" size={18} onDark={isDark} />
              </span>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as KtDashboardPeriod)}
                aria-label="Filter rentang waktu dashboard"
                className="text-xs pl-9 pr-8 py-2 rounded-xl t-card font-semibold appearance-none cursor-pointer"
              >
                <option value="month">Bulan ini</option>
                <option value="week">7 hari terakhir</option>
                <option value="today">Hari ini</option>
                <option value="ALL">Semua waktu</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 t-muted absolute right-2.5 pointer-events-none" />
            </div>
            <button
              type="button"
              onClick={openNewTransaksi}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl t-btn-primary text-xs whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Transaksi</span>
            </button>
          </>
        }
      />

      {/* Stock Alert Banner */}
      <div
        className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
          metrics.lowStock.length > 0 ? 't-status-warn' : 't-status-ok'
        }`}
      >
        <span>
          {metrics.lowStock.length === 1
            ? `Stok ${metrics.lowStock[0].nama} tinggal ${formatTon(
                metrics.lowStock[0].stokKg,
              )}, di bawah batas minimum`
            : metrics.lowStock.length > 1
              ? `${metrics.lowStock.length} barang di bawah batas minimum (${metrics.lowStock[0].nama})`
              : `Semua stok barang (${barangList.length} jenis) aman`}
        </span>
        <button
          type="button"
          onClick={() => setActiveMenu('menu-kt-stok')}
          className="text-xs font-bold underline shrink-0 whitespace-nowrap"
        >
          Cek Stok
        </button>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="t-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="t-field-label">Kas masuk (jual)</div>
              <div className="text-2xl font-display t-text mt-2 tabular-nums">
                {formatJuta(metrics.kasMasuk)}
              </div>
            </div>
            <div className="w-14 h-14 rounded-xl bg-transparent flex items-center justify-center shrink-0">
              <RingkasanSpotIcon kind="kt-kas-masuk" size={54} onDark={isDark} />
            </div>
          </div>
          <div
            className="text-[11px] font-semibold mt-2.5 font-mono-num"
            style={{ color: 'var(--status-ok-text)' }}
          >
            {formatTon(metrics.tonJual)}
          </div>
        </div>

        <div className="t-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="t-field-label">Kas keluar (beli)</div>
              <div className="text-2xl font-display t-text mt-2 tabular-nums">
                {formatJuta(metrics.kasKeluar)}
              </div>
            </div>
            <div className="w-14 h-14 rounded-xl bg-transparent flex items-center justify-center shrink-0">
              <RingkasanSpotIcon kind="kt-kas-keluar" size={54} onDark={isDark} />
            </div>
          </div>
          <div
            className="text-[11px] font-semibold mt-2.5 font-mono-num"
            style={{ color: 'var(--status-bad-text)' }}
          >
            {formatTon(metrics.tonBeli)}
          </div>
        </div>

        <div className="t-card-accent p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-medium" style={{ color: 'var(--card-accent-muted)' }}>
                Selisih kas
              </div>
              <div className="text-2xl font-display text-white mt-2 tabular-nums">
                {formatJuta(metrics.selisih)}
              </div>
            </div>
            <div className="w-14 h-14 rounded-xl bg-transparent flex items-center justify-center shrink-0">
              <RingkasanSpotIcon kind="kt-selisih" size={54} onDark />
            </div>
          </div>
          <div className="text-[11px] font-semibold mt-2.5 text-white/75 font-mono-num">
            Margin {metrics.margin}%
          </div>
        </div>

        <div className="t-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="t-field-label">Stok gudang</div>
              <div className="text-2xl font-display t-text mt-2 tabular-nums">
                {formatTon(metrics.totalStokKg)}
              </div>
            </div>
            <div className="w-14 h-14 rounded-xl bg-transparent flex items-center justify-center shrink-0">
              <RingkasanSpotIcon kind="kt-stok-gudang" size={54} onDark={isDark} />
            </div>
          </div>
          <div className="text-[11px] t-muted mt-2.5">{barangList.length} jenis barang</div>
        </div>
      </div>

      {/* 7-day chart & Stock bars */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 t-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-center gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <RingkasanSpotIcon kind="kt-chart-7d" size={42} onDark={isDark} />
              <h2 className="t-section-label truncate">Beli &amp; jual 7 hari terakhir</h2>
            </div>
            <span className="text-[11px] t-muted shrink-0">Nominal transaksi harian</span>
          </div>

          <div className="h-44 flex items-end justify-between gap-2 pt-4 border-b t-border px-2">
            {sevenDayData.map((d) => {
              const bh = d.beli > 0 ? Math.max(10, Math.round((d.beli / maxDayVal) * 100)) : 4;
              const jh = d.jual > 0 ? Math.max(10, Math.round((d.jual / maxDayVal) * 100)) : 4;
              return (
                <div
                  key={d.label}
                  className="flex-1 flex items-end justify-center gap-1 h-full"
                >
                  <div
                    className="w-4 sm:w-5 rounded-t"
                    style={{ height: `${bh}%`, backgroundColor: 'var(--accent-highlight)' }}
                    title={`Beli ${d.label}: ${formatRupiah(d.beli)}`}
                  />
                  <div
                    className="w-4 sm:w-5 rounded-t"
                    style={{ height: `${jh}%`, backgroundColor: 'var(--accent-brand)' }}
                    title={`Jual ${d.label}: ${formatRupiah(d.jual)}`}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-between gap-2 pt-2 text-[10px] t-muted px-2 font-mono-num">
            {sevenDayData.map((d) => (
              <div key={d.label} className="flex-1 text-center">
                {d.label}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-xs"
                style={{ backgroundColor: 'var(--accent-highlight)' }}
              />
              <span className="t-muted">Beli</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-xs"
                style={{ backgroundColor: 'var(--accent-brand)' }}
              />
              <span className="t-muted">Jual</span>
            </span>
          </div>
        </div>

        <div className="lg:col-span-5 t-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-center gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <RingkasanSpotIcon kind="kt-stok-barang" size={42} onDark={isDark} />
              <h2 className="t-section-label truncate">Stok per barang</h2>
            </div>
            <button
              type="button"
              onClick={() => setActiveMenu('menu-kt-stok')}
              className="text-[11px] t-link font-semibold hover:underline shrink-0"
            >
              Kelola
            </button>
          </div>
          <div className="space-y-4 my-auto">
            {barangList.length === 0 ? (
              <div className="text-xs t-muted text-center py-6">Belum ada data barang.</div>
            ) : (
              barangList.map((b) => {
                const pct = Math.max(5, Math.round(((b.stokKg || 0) / maxStockKg) * 100));
                const isLow = (b.stokKg || 0) <= (b.minKg || 0);
                return (
                  <div key={b.id}>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-semibold t-text">{b.nama}</span>
                      <span className="font-mono-num font-bold t-text">
                        {formatTon(b.stokKg)}
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full t-subtle overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: isLow ? '#F59E0B' : 'var(--accent-brand)',
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="t-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b t-border flex justify-between items-center">
          <span className="t-section-label">Transaksi Tonase Terbaru</span>
          <button
            type="button"
            onClick={() => setActiveMenu('menu-kt-transaksi')}
            className="text-xs t-link font-semibold hover:underline"
          >
            Lihat Semua
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="t-subtle border-b t-border">
                <th className="py-3 px-4 t-th-label">Nota &amp; Tanggal</th>
                <th className="py-3 px-4 t-th-label">Tipe</th>
                <th className="py-3 px-4 t-th-label">Customer / Plat</th>
                <th className="py-3 px-4 t-th-label text-right">Netto</th>
                <th className="py-3 px-4 t-th-label text-right">Total Bayar</th>
                <th className="py-3 px-4 t-th-label text-center">Status</th>
                <th className="py-3 px-4 t-th-label text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y t-border">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center t-muted">
                    Belum ada transaksi tonase.
                  </td>
                </tr>
              ) : (
                recentTransactions.map((t) => (
                  <tr key={t.id} className="t-row-hover">
                    <td className="py-3 px-4">
                      <div className="font-bold font-mono-num t-text">{t.nota}</div>
                      <div className="text-[10px] t-muted font-mono-num">
                        {formatDateShortID(t.tanggal)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <TrxTypeText tipe={t.tipe} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold t-text">{t.customer}</div>
                      <div className="text-[10px] t-muted font-mono-num">{t.plat || '-'}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num font-semibold t-text">
                      {formatNumberWithDots(t.totalNetto)} kg
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num">
                      <div className="font-bold t-text">{formatRupiah(t.totalBayar)}</div>
                      {(t.potongUtang || 0) > 0 && (
                        <div className="text-[10px] font-semibold t-link">
                          Potong utang {formatRupiah(t.potongUtang || 0)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {(t.sisa || 0) === 0 ? (
                        <span
                          className="text-[11px] font-bold"
                          style={{ color: 'var(--status-ok-text)' }}
                        >
                          Lunas
                        </span>
                      ) : (
                        <span
                          className="text-[11px] font-bold font-mono-num"
                          style={{ color: 'var(--status-warn-text)' }}
                        >
                          Sisa {formatRupiah(t.sisa)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setDetailTrx(t)}
                        className="t-link font-bold hover:underline"
                      >
                        Detail Nota
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
