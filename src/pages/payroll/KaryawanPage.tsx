import { Download, Plus } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { PayrollStatusText } from '../../components/common/StatusBadge';
import { DIVISIONS, PAYROLL_STATUSES } from '../../config/constants';
import { useApp } from '../../context/AppContext';
import { usePayroll } from '../../context/PayrollContext';
import { exportPayrollToExcelMultiSheet } from '../../utils/exportExcel';
import { formatRupiah } from '../../utils/format';
import { calculateTHP, getStatusDisplay } from '../../utils/payrollCalc';

export function KaryawanPage() {
  const { setActiveMenu, openSlipModal, showToast } = useApp();
  const {
    records,
    filteredRecords,
    periodOptions,
    divisiOptions,
    filters,
    setFilter,
  } = usePayroll();

  const handleExport = () => {
    const items = filteredRecords.length ? filteredRecords : records;
    if (!exportPayrollToExcelMultiSheet(items)) {
      showToast('Tidak ada data untuk diekspor.', 'warning');
    }
  };

  return (
    <section className="space-y-5">
      <PageHeader
        suiteLabel="Payroll"
        pageLabel="Karyawan"
        title="Data Karyawan & Rekap Mingguan"
        subtitle="Monitoring lengkap 3 divisi, lembur, kasbon, BPJS, dan gaji bersih."
        actions={
          <>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMenu('menu-input')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-primary text-xs whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Input Gaji Baru</span>
            </button>
          </>
        }
      />

      {/* 5 Filter Controls */}
      <div className="t-card p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="block t-field-label mb-1">Cari Karyawan</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            placeholder="Nama / No / NIK..."
            className="w-full text-xs px-3 py-2 rounded-xl t-input"
          />
        </div>
        <div>
          <label className="block t-field-label mb-1">Divisi Utama</label>
          <select
            value={filters.skema}
            onChange={(e) => setFilter('skema', e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-xl t-input"
          >
            <option value="ALL">Semua Divisi</option>
            {DIVISIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block t-field-label mb-1">Bagian</label>
          <select
            value={filters.divisi}
            onChange={(e) => setFilter('divisi', e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-xl t-input"
          >
            <option value="ALL">Semua Bagian</option>
            {divisiOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block t-field-label mb-1">Periode</label>
          <select
            value={filters.periode}
            onChange={(e) => setFilter('periode', e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-xl t-input"
          >
            <option value="ALL">Semua Periode</option>
            {periodOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block t-field-label mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilter('status', e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-xl t-input"
          >
            <option value="ALL">Semua Status</option>
            {PAYROLL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="t-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="t-subtle border-b t-border">
                <th className="py-3.5 px-4 t-th-label">Karyawan &amp; Divisi</th>
                <th className="py-3.5 px-3 t-th-label text-center">HR / Trip</th>
                <th className="py-3.5 px-3 t-th-label text-right">Gaji Pokok</th>
                <th className="py-3.5 px-3 t-th-label text-right">Lembur</th>
                <th className="py-3.5 px-3 t-th-label text-right">Potongan</th>
                <th className="py-3.5 px-3 t-th-label text-right">Gaji Bersih</th>
                <th className="py-3.5 px-3 t-th-label text-center">Status</th>
                <th className="py-3.5 px-4 t-th-label text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y t-border">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center t-muted">
                    Belum ada data yang cocok dengan filter saat ini.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item, idx) => {
                  const c = calculateTHP(item);
                  return (
                    <tr key={`${item.nik}-${idx}`} className="t-row-hover">
                      <td className="py-3 px-4">
                        <div className="font-bold t-text">{item.nama}</div>
                        <div className="text-[11px] t-muted font-mono-num">
                          {item.nik} &middot; {c.skema}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono-num font-bold t-text">
                        {c.isTrip ? `${c.unitPokok} Trip` : `${c.unitPokok} HR`}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num t-text">
                        {formatRupiah(c.gapok)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold font-mono-num t-text">
                          {formatRupiah(c.lemburNominal)}
                        </div>
                        <div className="text-[10px] t-muted">{c.breakdownText}</div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div
                          className="font-mono-num font-semibold"
                          style={{ color: 'var(--status-bad-text)' }}
                        >
                          {formatRupiah(c.totalPot)}
                        </div>
                        <div className="text-[10px] t-muted">{c.keterangan}</div>
                      </td>
                      <td className="py-3 px-3 text-right font-bold t-text font-mono-num">
                        {formatRupiah(c.thp)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <PayrollStatusText status={getStatusDisplay(item)} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => openSlipModal(item)}
                          className="px-3 py-1.5 t-btn-secondary text-xs font-bold rounded-xl whitespace-nowrap"
                        >
                          Slip Gaji
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
    </section>
  );
}
