import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CreditCard,
  FileText,
  Phone,
  Receipt,
  Repeat2,
  Truck,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useKasTonase } from '../../context/KasTonaseContext';
import type { KtCustomer, KtTransaction } from '../../types/kasTonase';
import {
  formatDateShortID,
  formatNumberWithDots,
  formatRupiah,
} from '../../utils/format';

type DetailTab = 'beli' | 'jual' | 'pembayaran' | 'cicilan';

interface MitraDetailModalProps {
  customer: KtCustomer | null;
  onClose: () => void;
  onOpenNota: (trx: KtTransaction) => void;
}

export function MitraDetailModal({ customer, onClose, onOpenNota }: MitraDetailModalProps) {
  const { transactions, payments, piutangMitra, getCustomerOutstanding } = useKasTonase();
  const [activeTab, setActiveTab] = useState<DetailTab>('beli');

  const targetKey = (customer?.nama || '').trim().toLowerCase();

  const outstanding = useMemo(
    () =>
      customer
        ? getCustomerOutstanding(customer.nama)
        : { hutang: 0, piutang: 0, piutangNota: 0, piutangMitra: 0 },
    [customer, getCustomerOutstanding],
  );

  const notaBeli = useMemo(
    () =>
      transactions
        .filter((t) => t.tipe === 'Beli' && (t.customer || '').trim().toLowerCase() === targetKey)
        .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '')),
    [targetKey, transactions],
  );

  const notaJual = useMemo(
    () =>
      transactions
        .filter((t) => t.tipe === 'Jual' && (t.customer || '').trim().toLowerCase() === targetKey)
        .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '')),
    [targetKey, transactions],
  );

  const mitraPayments = useMemo(
    () =>
      payments
        .filter((p) => (p.customer || '').trim().toLowerCase() === targetKey)
        .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '')),
    [payments, targetKey],
  );

  const mitraPiutangList = useMemo(
    () =>
      piutangMitra
        .filter((pm) => (pm.customer || '').trim().toLowerCase() === targetKey)
        .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '')),
    [piutangMitra, targetKey],
  );

  const flattenedCicilan = useMemo(() => {
    return mitraPiutangList
      .flatMap((pm) =>
        (pm.cicilan || []).map((c) => ({
          ...c,
          kodePiutang: pm.kode,
          piutangKet: pm.keterangan,
        })),
      )
      .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
  }, [mitraPiutangList]);

  const trxById = useMemo(() => {
    const map = new Map<string, KtTransaction>();
    transactions.forEach((t) => map.set(t.id, t));
    return map;
  }, [transactions]);

  if (!customer) return null;

  const initChar = (customer.nama || '?').trim().charAt(0).toUpperCase();
  const unpaidBeliCount = notaBeli.filter((t) => (t.sisa || 0) > 0).length;
  const unpaidJualCount = notaJual.filter((t) => (t.sisa || 0) > 0).length;
  const activePmCount = mitraPiutangList.filter((pm) => (pm.sisa || 0) > 0).length;

  const tabs: { id: DetailTab; label: string; count: number; icon: typeof FileText }[] = [
    { id: 'beli', label: 'Nota Beli', count: notaBeli.length, icon: ArrowDownLeft },
    { id: 'jual', label: 'Nota Jual', count: notaJual.length, icon: ArrowUpRight },
    { id: 'pembayaran', label: 'Pembayaran', count: mitraPayments.length, icon: CreditCard },
    { id: 'cicilan', label: 'Cicilan Piutang', count: flattenedCicilan.length, icon: Repeat2 },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/55 backdrop-blur-xs no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl max-h-[92vh] t-card rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b t-border flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
              style={{
                backgroundColor: 'var(--status-info-bg)',
                color: 'var(--status-info-text)',
              }}
            >
              {initChar}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold t-text truncate">{customer.nama}</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md t-subtle t-muted">
                  {customer.tipe}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs t-muted">
                <span className="inline-flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" />
                  <span className="font-mono-num">{customer.plat || 'Tanpa plat default'}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  <span className="font-mono-num">{customer.telp || '-'}</span>
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup riwayat mitra"
            className="p-2 rounded-xl t-btn-secondary shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Two Explicitly Separated Balance Cards */}
        <div className="px-5 py-4 border-b t-border t-subtle grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
          <div className="t-card rounded-xl p-4 border t-border flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="t-kpi-label">Utang Mitra ke Kita (Piutang)</span>
              <span
                className="text-[11px] font-bold"
                style={{
                  color:
                    outstanding.piutang > 0 ? 'var(--status-info-text)' : 'var(--status-ok-text)',
                }}
              >
                {outstanding.piutang > 0 ? 'Belum Lunas' : 'Lunas'}
              </span>
            </div>
            <div
              className="text-xl font-extrabold font-mono-num"
              style={{
                color:
                  outstanding.piutang > 0 ? 'var(--status-info-text)' : 'var(--text-primary)',
              }}
            >
              {formatRupiah(outstanding.piutang)}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] t-muted pt-1 border-t t-border">
              <span>
                Nota Jual ({unpaidJualCount}):{' '}
                <strong className="font-mono-num t-text">
                  {formatRupiah(outstanding.piutangNota)}
                </strong>
              </span>
              <span>
                Piutang Mitra ({activePmCount}):{' '}
                <strong className="font-mono-num t-text">
                  {formatRupiah(outstanding.piutangMitra)}
                </strong>
              </span>
            </div>
          </div>

          <div className="t-card rounded-xl p-4 border t-border flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="t-kpi-label">Utang Kita ke Mitra (Hutang Beli)</span>
              <span
                className="text-[11px] font-bold"
                style={{
                  color:
                    outstanding.hutang > 0 ? 'var(--status-warn-text)' : 'var(--status-ok-text)',
                }}
              >
                {outstanding.hutang > 0 ? 'Belum Lunas' : 'Lunas'}
              </span>
            </div>
            <div
              className="text-xl font-extrabold font-mono-num"
              style={{
                color:
                  outstanding.hutang > 0 ? 'var(--status-warn-text)' : 'var(--text-primary)',
              }}
            >
              {formatRupiah(outstanding.hutang)}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] t-muted pt-1 border-t t-border">
              <span>
                Sisa Nota Beli belum lunas:{' '}
                <strong className="font-mono-num t-text">{unpaidBeliCount} nota</strong>
              </span>
              <span>
                Total Nota Beli:{' '}
                <strong className="font-mono-num t-text">{notaBeli.length} nota</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-3 pb-2 border-b t-border flex flex-wrap gap-2 shrink-0 t-card">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                  active ? 't-btn-primary' : 't-btn-secondary'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span className="font-mono-num text-[11px] opacity-80">({tab.count})</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB: NOTA BELI */}
          {activeTab === 'beli' && (
            <div className="t-card rounded-xl border t-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="t-subtle border-b t-border">
                      <th className="py-3 px-3.5 t-th-label">Tanggal</th>
                      <th className="py-3 px-3 t-th-label">No. Nota</th>
                      <th className="py-3 px-3 t-th-label text-right">Netto</th>
                      <th className="py-3 px-3 t-th-label text-right">Total</th>
                      <th className="py-3 px-3 t-th-label text-right">Potong Utang</th>
                      <th className="py-3 px-3 t-th-label text-right">Dibayar Kas</th>
                      <th className="py-3 px-3 t-th-label text-right">Sisa Hutang</th>
                      <th className="py-3 px-3.5 t-th-label text-center">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y t-border">
                    {notaBeli.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center t-muted">
                          Belum ada nota pembelian dari mitra ini.
                        </td>
                      </tr>
                    ) : (
                      notaBeli.map((t) => (
                        <tr key={t.id} className="t-row-hover">
                          <td className="py-2.5 px-3.5 font-mono-num t-muted whitespace-nowrap">
                            {formatDateShortID(t.tanggal)}
                          </td>
                          <td className="py-2.5 px-3 font-mono-num font-bold t-text whitespace-nowrap">
                            {t.nota}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num t-muted whitespace-nowrap">
                            {formatNumberWithDots(t.totalNetto)} kg
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num font-semibold t-text whitespace-nowrap">
                            {formatRupiah(t.totalBayar)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num whitespace-nowrap">
                            {(t.potongUtang || 0) > 0 ? (
                              <span style={{ color: 'var(--status-info-text)' }} className="font-semibold">
                                {formatRupiah(t.potongUtang || 0)}
                              </span>
                            ) : (
                              <span className="t-muted">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num t-text whitespace-nowrap">
                            {formatRupiah(t.dibayar)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num font-bold whitespace-nowrap">
                            <span
                              style={{
                                color:
                                  t.sisa > 0 ? 'var(--status-warn-text)' : 'var(--status-ok-text)',
                              }}
                            >
                              {t.sisa > 0 ? formatRupiah(t.sisa) : 'Lunas'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => onOpenNota(t)}
                              className="inline-flex items-center gap-1 t-link font-semibold hover:underline"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>Nota</span>
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

          {/* TAB: NOTA JUAL */}
          {activeTab === 'jual' && (
            <div className="t-card rounded-xl border t-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="t-subtle border-b t-border">
                      <th className="py-3 px-3.5 t-th-label">Tanggal</th>
                      <th className="py-3 px-3 t-th-label">No. Nota</th>
                      <th className="py-3 px-3 t-th-label text-right">Netto</th>
                      <th className="py-3 px-3 t-th-label text-right">Total</th>
                      <th className="py-3 px-3 t-th-label text-right">Dibayar</th>
                      <th className="py-3 px-3 t-th-label text-right">Sisa Piutang</th>
                      <th className="py-3 px-3.5 t-th-label text-center">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y t-border">
                    {notaJual.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center t-muted">
                          Belum ada nota penjualan ke mitra ini.
                        </td>
                      </tr>
                    ) : (
                      notaJual.map((t) => (
                        <tr key={t.id} className="t-row-hover">
                          <td className="py-2.5 px-3.5 font-mono-num t-muted whitespace-nowrap">
                            {formatDateShortID(t.tanggal)}
                          </td>
                          <td className="py-2.5 px-3 font-mono-num font-bold t-text whitespace-nowrap">
                            {t.nota}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num t-muted whitespace-nowrap">
                            {formatNumberWithDots(t.totalNetto)} kg
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num font-semibold t-text whitespace-nowrap">
                            {formatRupiah(t.totalBayar)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num t-text whitespace-nowrap">
                            {formatRupiah(t.dibayar)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num font-bold whitespace-nowrap">
                            <span
                              style={{
                                color:
                                  t.sisa > 0 ? 'var(--status-info-text)' : 'var(--status-ok-text)',
                              }}
                            >
                              {t.sisa > 0 ? formatRupiah(t.sisa) : 'Lunas'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => onOpenNota(t)}
                              className="inline-flex items-center gap-1 t-link font-semibold hover:underline"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>Nota</span>
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

          {/* TAB: PEMBAYARAN NOTA */}
          {activeTab === 'pembayaran' && (
            <div className="t-card rounded-xl border t-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="t-subtle border-b t-border">
                      <th className="py-3 px-3.5 t-th-label">Tanggal Bayar</th>
                      <th className="py-3 px-3 t-th-label">No. Nota</th>
                      <th className="py-3 px-3 t-th-label">Jenis</th>
                      <th className="py-3 px-3 t-th-label">Metode</th>
                      <th className="py-3 px-3 t-th-label">Arus Kas</th>
                      <th className="py-3 px-3 t-th-label text-right">Nominal</th>
                      <th className="py-3 px-3.5 t-th-label">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y t-border">
                    {mitraPayments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center t-muted">
                          Belum ada riwayat pembayaran nota untuk mitra ini.
                        </td>
                      </tr>
                    ) : (
                      mitraPayments.map((p) => {
                        const linkedTrx = trxById.get(p.trxId);
                        const flowLabel = p.isNonKas
                          ? 'Pelunasan Nonkas'
                          : p.tipe === 'Jual'
                            ? 'Kas Masuk'
                            : 'Kas Keluar';
                        const flowColor = p.isNonKas
                          ? 'var(--status-info-text)'
                          : p.tipe === 'Jual'
                            ? 'var(--status-ok-text)'
                            : 'var(--status-warn-text)';
                        return (
                          <tr key={p.id} className="t-row-hover">
                            <td className="py-2.5 px-3.5 font-mono-num t-muted whitespace-nowrap">
                              {formatDateShortID(p.tanggal)}
                            </td>
                            <td className="py-2.5 px-3 font-mono-num whitespace-nowrap">
                              {linkedTrx ? (
                                <button
                                  type="button"
                                  onClick={() => onOpenNota(linkedTrx)}
                                  className="t-link font-bold hover:underline"
                                >
                                  {p.nota}
                                </button>
                              ) : (
                                <span className="font-semibold t-text">{p.nota}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-semibold t-text whitespace-nowrap">
                              Nota {p.tipe}
                            </td>
                            <td className="py-2.5 px-3 t-text whitespace-nowrap">{p.metode}</td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="text-[11px] font-bold" style={{ color: flowColor }}>
                                {flowLabel}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono-num font-bold t-text whitespace-nowrap">
                              {formatRupiah(p.nominal)}
                            </td>
                            <td className="py-2.5 px-3.5 t-muted">{p.catatan || '-'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: CICILAN PIUTANG MITRA */}
          {activeTab === 'cicilan' && (
            <div className="space-y-4">
              {mitraPiutangList.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold t-text">
                    <Building2 className="w-3.5 h-3.5 t-muted" />
                    <span>Daftar Pinjaman / Piutang Mitra ({mitraPiutangList.length})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {mitraPiutangList.map((pm) => (
                      <div
                        key={pm.id}
                        className="t-subtle rounded-xl p-3.5 border t-border space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono-num font-bold t-text">{pm.kode}</span>
                          <span className="font-mono-num text-[11px] t-muted">
                            {formatDateShortID(pm.tanggal)}
                          </span>
                        </div>
                        <p className="t-muted text-[11px]">{pm.keterangan}</p>
                        <div className="grid grid-cols-3 gap-2 pt-1.5 border-t t-border font-mono-num text-[11px]">
                          <div>
                            <div className="t-muted">Awal</div>
                            <div className="font-semibold t-text">
                              {formatRupiah(pm.nominalAwal)}
                            </div>
                          </div>
                          <div>
                            <div className="t-muted">Terbayar</div>
                            <div
                              className="font-semibold"
                              style={{ color: 'var(--status-ok-text)' }}
                            >
                              {formatRupiah(pm.terbayar)}
                            </div>
                          </div>
                          <div>
                            <div className="t-muted">Sisa</div>
                            <div
                              className="font-bold"
                              style={{
                                color:
                                  pm.sisa > 0 ? 'var(--status-info-text)' : 'var(--status-ok-text)',
                              }}
                            >
                              {pm.sisa > 0 ? formatRupiah(pm.sisa) : 'Lunas'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="t-card rounded-xl border t-border overflow-hidden">
                <div className="px-4 py-2.5 t-subtle border-b t-border text-xs font-bold t-text">
                  Riwayat Cicilan &amp; Potongan Piutang Mitra
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="t-subtle border-b t-border">
                        <th className="py-3 px-3.5 t-th-label">Tanggal</th>
                        <th className="py-3 px-3 t-th-label">Kode Piutang</th>
                        <th className="py-3 px-3 t-th-label">Sumber / Metode</th>
                        <th className="py-3 px-3 t-th-label">Ref. Nota</th>
                        <th className="py-3 px-3 t-th-label text-right">Nominal</th>
                        <th className="py-3 px-3.5 t-th-label">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y t-border">
                      {flattenedCicilan.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center t-muted">
                            Belum ada catatan cicilan piutang untuk mitra ini.
                          </td>
                        </tr>
                      ) : (
                        flattenedCicilan.map((c) => {
                          const linkedTrx = c.trxId ? trxById.get(c.trxId) : undefined;
                          return (
                            <tr key={c.id} className="t-row-hover">
                              <td className="py-2.5 px-3.5 font-mono-num t-muted whitespace-nowrap">
                                {formatDateShortID(c.tanggal)}
                              </td>
                              <td className="py-2.5 px-3 font-mono-num font-bold t-text whitespace-nowrap">
                                {c.kodePiutang}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span
                                  className="text-[11px] font-bold"
                                  style={{
                                    color:
                                      c.sumber === 'Potong Nota Beli'
                                        ? 'var(--status-info-text)'
                                        : 'var(--status-ok-text)',
                                  }}
                                >
                                  {c.sumber}
                                </span>
                                {c.metode && (
                                  <span className="text-[11px] t-muted ml-1.5">({c.metode})</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono-num whitespace-nowrap">
                                {linkedTrx ? (
                                  <button
                                    type="button"
                                    onClick={() => onOpenNota(linkedTrx)}
                                    className="t-link font-bold hover:underline"
                                  >
                                    {c.notaRef || linkedTrx.nota}
                                  </button>
                                ) : (
                                  <span className="t-muted">{c.notaRef || '-'}</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono-num font-bold t-text whitespace-nowrap">
                                {formatRupiah(c.nominal)}
                              </td>
                              <td className="py-2.5 px-3.5 t-muted">{c.keterangan || '-'}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t t-border flex items-center justify-between gap-2 shrink-0 t-card">
          <span className="text-[11px] t-muted">
            Saldo Utang Mitra ke Kita dan Utang Kita ke Mitra dipisahkan agar posisi kas &amp; tagihan mudah diaudit.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
