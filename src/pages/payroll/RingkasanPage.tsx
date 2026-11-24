import {
  BadgeCheck,
  Banknote,
  Calendar,
  ChevronDown,
  Clock,
  Layers,
  RefreshCw,
  ShieldCheck,
  User,
  Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { RingkasanSpotIcon } from '../../components/common/RingkasanSpotIcons';
import { BankAccountBadge, PaymentStatusSelect } from '../../components/payroll/PaymentStatusSelect';
import { DIVISIONS } from '../../config/constants';
import { useApp } from '../../context/AppContext';
import { usePayroll } from '../../context/PayrollContext';
import { formatRupiah } from '../../utils/format';
import {
  buildDivisionSummary,
  calculateTHP,
  getPeriodeDisplay,
  getStatusDisplay,
} from '../../utils/payrollCalc';

export function RingkasanPage() {
  const { setActiveMenu, theme } = useApp();
  const isDark = theme === 'dark';
  const {
    kpiRecords,
    periodOptions,
    filters,
    setFilter,
    isSyncing,
    refreshPayroll,
    getEmployeeProfile,
    updatePayrollStatus,
  } = usePayroll();

  const [showAllRows, setShowAllRows] = useState(false);

  const stats = useMemo(() => {
    let totalThp = 0;
    let totalLembur = 0;
    let totalPot = 0;
    let totalKasbon = 0;
    let totalBpjs = 0;
    let totalUnit = 0;
    let draftCount = 0;
    let approvedCount = 0;
    let paidCount = 0;

    kpiRecords.forEach((d) => {
      const c = calculateTHP(d);
      totalThp += c.thp;
      totalLembur += c.lemburNominal;
      totalPot += c.totalPot;
      totalKasbon += c.kasbon;
      totalBpjs += c.bpjs;
      totalUnit += c.unitPokok;

      const st = getStatusDisplay(d).toLowerCase();
      if (st === 'paid') paidCount++;
      else if (st === 'approved') approvedCount++;
      else draftCount++;
    });

    return {
      totalThp,
      totalLembur,
      totalPot,
      totalKasbon,
      totalBpjs,
      totalUnit,
      draftCount,
      approvedCount: approvedCount + paidCount,
      onlyApprovedCount: approvedCount,
      paidCount,
    };
  }, [kpiRecords]);

  const divisionSummary = useMemo(() => buildDivisionSummary(kpiRecords), [kpiRecords]);
  const maxDivisionThp = useMemo(
    () => Math.max(...divisionSummary.map((d) => d.thp), 1),
    [divisionSummary],
  );

  const recentItems = showAllRows ? kpiRecords : kpiRecords.slice(0, 5);

  const bannerText =
    stats.draftCount > 0
      ? `${stats.draftCount} slip masih berstatus draft`
      : kpiRecords.length > 0
        ? `Semua (${kpiRecords.length}) slip telah disetujui / dibayar`
        : 'Belum ada data slip gaji';

  return (
    <section className="space-y-5">
      <PageHeader
        suiteLabel="Payroll"
        pageLabel="Ringkasan finansial"
        title="Ringkasan Finansial"
        subtitle="PT. Sarana Putra Daerah · 3 Divisi & Google SPS"
        actions={
          <>
            <div className="relative inline-flex items-center">
              <span className="absolute left-2.5 flex items-center justify-center pointer-events-none">
                <RingkasanSpotIcon kind="periode" size={18} onDark={isDark} />
              </span>
              <select
                value={filters.periode}
                onChange={(e) => setFilter('periode', e.target.value)}
                aria-label="Filter periode"
                className="text-xs pl-9 pr-8 py-2 rounded-xl t-card font-semibold appearance-none cursor-pointer"
              >
                <option value="ALL">Semua periode</option>
                {periodOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 t-muted absolute right-2.5 pointer-events-none" />
            </div>
            <div className="relative inline-flex items-center">
              <span className="absolute left-2.5 flex items-center justify-center pointer-events-none">
                <RingkasanSpotIcon kind="divisi" size={18} onDark={isDark} />
              </span>
              <select
                value={filters.skema}
                onChange={(e) => setFilter('skema', e.target.value)}
                aria-label="Filter divisi"
                className="text-xs pl-9 pr-8 py-2 rounded-xl t-card font-semibold appearance-none cursor-pointer"
              >
                <option value="ALL">Semua divisi</option>
                {DIVISIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 t-muted absolute right-2.5 pointer-events-none" />
            </div>
            <button
              type="button"
              onClick={() => refreshPayroll(true)}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync SPS</span>
            </button>
          </>
        }
      />

      {/* Draft Alert Banner */}
      <div
        className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
          stats.draftCount > 0 ? 't-status-warn' : 't-status-ok'
        }`}
      >
        <span>{bannerText}</span>
        <button
          type="button"
          onClick={() => setActiveMenu('menu-slip')}
          className="text-xs font-bold underline shrink-0 whitespace-nowrap"
        >
          Cek Slip
        </button>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="t-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="t-field-label">Total Gaji Bersih</div>
              <div className="text-2xl font-display t-text mt-2 tabular-nums">
                {formatRupiah(stats.totalThp)}
              </div>
            </div>
            <div className="w-14 h-14 rounded-xl bg-transparent flex items-center justify-center shrink-0">
              <RingkasanSpotIcon kind="gaji" size={54} onDark={isDark} />
            </div>
          </div>
          <div className="text-[11px] font-semibold mt-2.5" style={{ color: 'var(--status-ok-text)' }}>
            Akumulasi THP diterima
          </div>
        </div>

        <div className="t-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="t-field-label">Total Lembur (Hari/Jam/Inap)</div>
              <div className="text-2xl font-display t-text mt-2 tabular-nums">
                {formatRupiah(stats.totalLembur)}
              </div>
            </div>
            <div className="w-14 h-14 rounded-xl bg-transparent flex items-center justify-center shrink-0">
              <RingkasanSpotIcon kind="lembur" size={54} onDark={isDark} />
            </div>
          </div>
          <div className="text-[11px] font-semibold mt-2.5 t-link">
            Gabungan semua satuan lembur
          </div>
        </div>

        <div className="t-card-accent p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-medium" style={{ color: 'var(--card-accent-muted)' }}>
                Karyawan
              </div>
              <div className="text-2xl font-display text-white mt-2 tabular-nums">
                {kpiRecords.length} orang
              </div>
            </div>
            <div className="w-14 h-14 rounded-xl bg-transparent flex items-center justify-center shrink-0">
              <RingkasanSpotIcon kind="karyawan" size={54} onDark />
            </div>
          </div>
          <div className="text-[11px] text-white/75 mt-2.5">
            {stats.draftCount} draft, {stats.approvedCount} disetujui/dibayar
          </div>
        </div>

        <div className="t-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="t-field-label">Total Potongan</div>
              <div className="text-2xl font-display t-text mt-2 tabular-nums">
                {formatRupiah(stats.totalPot)}
              </div>
            </div>
            <div className="w-14 h-14 rounded-xl bg-transparent flex items-center justify-center shrink-0">
              <RingkasanSpotIcon kind="potongan" size={54} onDark={isDark} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveMenu('menu-karyawan')}
            className="text-[11px] t-link font-semibold hover:underline mt-2.5 text-left"
          >
            Lihat rincian Kasbon &amp; BPJS
          </button>
        </div>
      </div>

      {/* Chart & Potongan Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 t-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-center gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <RingkasanSpotIcon kind="chart" size={42} onDark={isDark} />
              <h2 className="t-section-label truncate">Gaji bersih per divisi (juta)</h2>
            </div>
            <span className="text-[11px] t-link font-medium shrink-0">Distribusi aktual SPS</span>
          </div>

          <div className="h-44 flex items-end justify-around gap-3 pt-4 border-b t-border px-2">
            {divisionSummary.length === 0 ? (
              <div className="w-full text-center text-xs t-muted my-auto">
                Belum ada data grafik divisi
              </div>
            ) : (
              divisionSummary.map((row) => {
                const pct = Math.max(12, Math.round((row.thp / maxDivisionThp) * 100));
                return (
                  <div
                    key={row.divisi}
                    className="flex-1 flex flex-col items-center justify-end h-full"
                  >
                    <div className="text-[11px] t-text font-bold mb-1 font-mono-num">
                      {(row.thp / 1_000_000).toFixed(1).replace('.', ',')} jt
                    </div>
                    <div
                      className="w-full max-w-[60px] rounded-t-lg transition-all"
                      style={{
                        height: `${pct}%`,
                        backgroundColor: 'var(--accent-brand)',
                      }}
                      title={`${row.divisi}: ${formatRupiah(row.thp)}`}
                    />
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-around gap-3 pt-2 text-[11px] t-muted px-2">
            {divisionSummary.map((row) => (
              <div key={row.divisi} className="flex-1 text-center truncate">
                {row.divisi}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 t-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <RingkasanSpotIcon kind="potongan-detail" size={42} onDark={isDark} />
            <h2 className="t-section-label">Rincian potongan</h2>
          </div>
          <div className="space-y-4 my-auto text-sm">
            <div className="flex justify-between items-center border-b t-border pb-2.5">
              <span className="t-muted inline-flex items-center gap-2">
                <Wallet className="w-4 h-4 shrink-0" style={{ color: 'var(--status-bad-text)' }} />
                <span>Kasbon</span>
              </span>
              <span
                className="font-bold font-mono-num"
                style={{ color: 'var(--status-bad-text)' }}
              >
                {formatRupiah(stats.totalKasbon)}
              </span>
            </div>
            <div className="flex justify-between items-center border-b t-border pb-2.5">
              <span className="t-muted inline-flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 t-link" />
                <span>BPJS</span>
              </span>
              <span className="font-bold t-text font-mono-num">
                {formatRupiah(stats.totalBpjs)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="t-muted inline-flex items-center gap-2">
                <Clock className="w-4 h-4 shrink-0 t-muted" />
                <span>Total Hari Kerja / Trip</span>
              </span>
              <span className="font-bold t-text font-mono-num">{stats.totalUnit} HR / Trip</span>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t t-border flex justify-between items-center text-xs">
            <span className="t-field-label">Jumlah Potongan</span>
            <span className="t-text font-bold font-mono-num">{formatRupiah(stats.totalPot)}</span>
          </div>
        </div>
      </div>

      {/* Recent Table — Finance Payment & Status Control */}
      <div className="t-card rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b t-border flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="t-section-label">Daftar Pembayaran Gaji (Finance)</h2>
            <span className="text-[11px] t-muted font-mono-num">
              Paid: <b style={{ color: 'var(--status-ok-text)' }}>{stats.paidCount}</b> &middot;
              Approved: <b style={{ color: 'var(--status-info-text)' }}>{stats.onlyApprovedCount}</b>{' '}
              &middot; Draft: <b style={{ color: 'var(--status-warn-text)' }}>{stats.draftCount}</b>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {kpiRecords.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllRows((prev) => !prev)}
                className="px-3 py-1 rounded-lg t-btn-secondary text-[11px] font-semibold whitespace-nowrap"
              >
                {showAllRows ? 'Tampilkan 5 Terbaru' : `Lihat Semua (${kpiRecords.length})`}
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveMenu('menu-karyawan')}
              className="text-[11px] t-link font-semibold hover:underline whitespace-nowrap"
            >
              Atur Rekening Karyawan
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="t-subtle border-b t-border">
                <th className="py-3.5 px-5 t-th-label">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <User className="w-3.5 h-3.5 shrink-0 opacity-75" />
                    <span>Nama &amp; Rekening</span>
                  </span>
                </th>
                <th className="py-3.5 px-4 t-th-label">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <Layers className="w-3.5 h-3.5 shrink-0 opacity-75" />
                    <span>Divisi</span>
                  </span>
                </th>
                <th className="py-3.5 px-4 t-th-label">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <Calendar className="w-3.5 h-3.5 shrink-0 opacity-75" />
                    <span>Periode</span>
                  </span>
                </th>
                <th className="py-3.5 px-4 t-th-label text-right">
                  <span className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                    <Banknote className="w-3.5 h-3.5 shrink-0 opacity-75" />
                    <span>Gaji Bersih</span>
                  </span>
                </th>
                <th className="py-3.5 px-5 t-th-label text-right">
                  <span className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                    <BadgeCheck className="w-3.5 h-3.5 shrink-0 opacity-75" />
                    <span>Status Pembayaran</span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y t-border">
              {recentItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center t-muted">
                    Belum ada data dari SPS.{' '}
                    <button
                      type="button"
                      onClick={() => setActiveMenu('menu-input')}
                      className="t-link font-semibold hover:underline ml-1"
                    >
                      Input Gaji Pertama
                    </button>
                  </td>
                </tr>
              ) : (
                recentItems.map((item, idx) => {
                  const calc = calculateTHP(item);
                  const profile = getEmployeeProfile(item.nik, item.nama);
                  const namaBank = profile?.namaBank || item.namaBank || '';
                  const noRekening = profile?.noRekening || item.noRekening || '';
                  const atasNama = profile?.atasNamaRekening || '';
                  return (
                    <tr key={item.recordId || `${item.nik}-${idx}`} className="t-row-hover">
                      <td className="py-3 px-5">
                        <div className="font-semibold t-text">
                          {item.nama}{' '}
                          <span className="text-[10px] t-muted font-mono-num font-normal">
                            &middot; NIK {item.nik}
                          </span>
                        </div>
                        <BankAccountBadge
                          namaBank={namaBank}
                          noRekening={noRekening}
                          atasNama={atasNama}
                          employeeName={item.nama}
                          compact
                          onEmptyAction={() => setActiveMenu('menu-karyawan')}
                          emptyActionLabel="Isi rekening"
                        />
                      </td>
                      <td className="py-3 px-4 t-muted">{calc.skema}</td>
                      <td className="py-3 px-4 t-muted font-mono-num text-[11px]">
                        {getPeriodeDisplay(item)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num font-semibold t-text">
                        {formatRupiah(calc.thp)}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <PaymentStatusSelect
                          status={getStatusDisplay(item)}
                          employeeName={item.nama}
                          onChangeStatus={(nextStatus) => updatePayrollStatus(item, nextStatus)}
                          align="right"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
