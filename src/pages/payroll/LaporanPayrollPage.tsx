import { Download, Printer } from 'lucide-react';
import { useMemo } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { useApp } from '../../context/AppContext';
import { usePayroll } from '../../context/PayrollContext';
import { exportPayrollToExcelMultiSheet } from '../../utils/exportExcel';
import { formatRupiah } from '../../utils/format';
import { buildDivisionSummary } from '../../utils/payrollCalc';

export function LaporanPayrollPage() {
  const { triggerPrint, showToast } = useApp();
  const { records, filteredRecords, kpiRecords } = usePayroll();

  const summaryRows = useMemo(() => buildDivisionSummary(kpiRecords), [kpiRecords]);

  const totals = useMemo(() => {
    return summaryRows.reduce(
      (acc, r) => ({
        count: acc.count + r.count,
        gapok: acc.gapok + r.gapok,
        lembur: acc.lembur + r.lembur,
        pot: acc.pot + r.pot,
        thp: acc.thp + r.thp,
      }),
      { count: 0, gapok: 0, lembur: 0, pot: 0, thp: 0 },
    );
  }, [summaryRows]);

  const handleExport = () => {
    const items = filteredRecords.length ? filteredRecords : records;
    if (!exportPayrollToExcelMultiSheet(items)) {
      showToast('Tidak ada data untuk diekspor.', 'warning');
    }
  };

  const handleBatchPrint = () => {
    const items = filteredRecords.length ? filteredRecords : records;
    if (!items.length) {
      showToast('Tidak ada data slip untuk dicetak.', 'warning');
      return;
    }
    triggerPrint({ type: 'batch-slips', items });
  };

  return (
    <section className="space-y-5">
      <PageHeader
        suiteLabel="Payroll"
        pageLabel="Laporan"
        title="Laporan Penggajian & Ekspor"
        subtitle="Rekapitulasi per divisi serta ekspor Excel 3 Divisi & Cetak Batch."
        actions={
          <>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel (3 Divisi)</span>
            </button>
            <button
              type="button"
              onClick={handleBatchPrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl t-btn-primary text-xs whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Batch 4 Slip/A4</span>
            </button>
          </>
        }
      />

      <div className="t-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b t-border t-section-label">
          Rekapitulasi Pengeluaran per Divisi
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="t-subtle border-b t-border">
                <th className="py-3 px-4 t-th-label">Divisi</th>
                <th className="py-3 px-4 t-th-label text-center">Jumlah Karyawan</th>
                <th className="py-3 px-4 t-th-label text-right">Total Gaji Pokok</th>
                <th className="py-3 px-4 t-th-label text-right">Total Lembur</th>
                <th className="py-3 px-4 t-th-label text-right">Total Potongan</th>
                <th
                  className="py-3 px-4 t-th-label text-right"
                  style={{ color: 'var(--accent-link)' }}
                >
                  Total Gaji Bersih
                </th>
              </tr>
            </thead>
            <tbody className="divide-y t-border">
              {summaryRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center t-muted">
                    Belum ada data rekapitulasi divisi.
                  </td>
                </tr>
              ) : (
                <>
                  {summaryRows.map((row) => (
                    <tr key={row.divisi} className="t-row-hover">
                      <td className="py-3 px-4 font-bold t-text">{row.divisi}</td>
                      <td className="py-3 px-4 text-center t-muted font-mono-num">
                        {row.count} Orang
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num t-text">
                        {formatRupiah(row.gapok)}
                      </td>
                      <td
                        className="py-3 px-4 text-right font-mono-num"
                        style={{ color: 'var(--status-ok-text)' }}
                      >
                        {formatRupiah(row.lembur)}
                      </td>
                      <td
                        className="py-3 px-4 text-right font-mono-num"
                        style={{ color: 'var(--status-bad-text)' }}
                      >
                        {formatRupiah(row.pot)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num font-bold t-text">
                        {formatRupiah(row.thp)}
                      </td>
                    </tr>
                  ))}
                  <tr className="t-subtle font-bold">
                    <td className="py-3 px-4 t-text">Total Keseluruhan</td>
                    <td className="py-3 px-4 text-center font-mono-num t-text">
                      {totals.count} Orang
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num t-text">
                      {formatRupiah(totals.gapok)}
                    </td>
                    <td
                      className="py-3 px-4 text-right font-mono-num"
                      style={{ color: 'var(--status-ok-text)' }}
                    >
                      {formatRupiah(totals.lembur)}
                    </td>
                    <td
                      className="py-3 px-4 text-right font-mono-num"
                      style={{ color: 'var(--status-bad-text)' }}
                    >
                      {formatRupiah(totals.pot)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num t-text">
                      {formatRupiah(totals.thp)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
