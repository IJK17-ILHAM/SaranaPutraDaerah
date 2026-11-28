import { Check, Download, FileSpreadsheet, Printer, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { useApp } from '../../context/AppContext';
import { usePayroll } from '../../context/PayrollContext';
import type { DivisionName } from '../../types/payroll';
import { exportPayrollToExcelMultiSheet } from '../../utils/exportExcel';
import { formatRupiah } from '../../utils/format';
import { buildDivisionSummary, calculateTHP, getSkemaDisplay } from '../../utils/payrollCalc';

const ALL_DIVISIONS: Array<{ id: DivisionName; label: string }> = [
  { id: 'Karyawan limbah', label: 'Karyawan Limbah' },
  { id: 'Supir B3', label: 'Supir B3' },
  { id: 'Supir SPD', label: 'Supir SPD' },
];

export function LaporanPayrollPage() {
  const { openBatchSlipModal, showToast } = useApp();
  const { records, filteredRecords, kpiRecords } = usePayroll();
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedDivisions, setSelectedDivisions] = useState<DivisionName[]>(
    ALL_DIVISIONS.map((d) => d.id),
  );

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

  const exportSourceItems = useMemo(
    () => (filteredRecords.length ? filteredRecords : records),
    [filteredRecords, records],
  );

  const exportDivisionStats = useMemo(() => {
    return ALL_DIVISIONS.map((div) => {
      const list = exportSourceItems.filter((r) => getSkemaDisplay(r) === div.id);
      const totalThp = list.reduce((sum, r) => sum + calculateTHP(r).thp, 0);
      return {
        ...div,
        count: list.length,
        totalThp,
      };
    });
  }, [exportSourceItems]);

  const handleOpenExportModal = () => {
    if (!exportSourceItems.length) {
      showToast('Tidak ada data untuk diekspor.', 'warning');
      return;
    }
    const available = exportDivisionStats.filter((d) => d.count > 0).map((d) => d.id);
    setSelectedDivisions(available.length ? available : ALL_DIVISIONS.map((d) => d.id));
    setExportModalOpen(true);
  };

  const toggleDivision = (divId: DivisionName) => {
    setSelectedDivisions((prev) =>
      prev.includes(divId) ? prev.filter((id) => id !== divId) : [...prev, divId],
    );
  };

  const handleConfirmExport = () => {
    if (selectedDivisions.length === 0) {
      showToast('Pilih minimal 1 divisi untuk diekspor.', 'warning');
      return;
    }
    if (!exportPayrollToExcelMultiSheet(exportSourceItems, selectedDivisions)) {
      showToast('Tidak ada data pada divisi yang dipilih untuk diekspor.', 'warning');
      return;
    }
    const labelText = ALL_DIVISIONS.filter((d) => selectedDivisions.includes(d.id))
      .map((d) => d.label)
      .join(', ');
    showToast(`Berhasil ekspor Excel untuk divisi: ${labelText}.`, 'success');
    setExportModalOpen(false);
  };

  const handleBatchPrint = () => {
    const items = filteredRecords.length ? filteredRecords : records;
    if (!items.length) {
      showToast('Tidak ada data slip untuk dicetak.', 'warning');
      return;
    }
    openBatchSlipModal(items);
  };

  return (
    <section className="space-y-5">
      <PageHeader
        suiteLabel="Payroll"
        pageLabel="Laporan"
        title="Laporan Penggajian & Ekspor"
        subtitle="Rekapitulasi per divisi serta ekspor Excel per divisi & Cetak Batch."
        actions={
          <>
            <button
              type="button"
              onClick={handleOpenExportModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel (Pilih Divisi)</span>
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

      {exportModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setExportModalOpen(false)}
        >
          <div
            className="w-full max-w-md t-card rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b t-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: 'var(--status-ok-bg)',
                    color: 'var(--status-ok-text)',
                  }}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-display font-bold t-text truncate">
                    Pilih Divisi untuk Export Excel
                  </h3>
                  <p className="text-[11px] t-muted mt-0.5">
                    Centang satu atau beberapa divisi yang ingin diunduh.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                aria-label="Tutup pilihan export divisi"
                className="p-1.5 rounded-xl t-btn-secondary shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="t-field-label">Daftar Divisi</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedDivisions(
                        exportDivisionStats.filter((d) => d.count > 0).map((d) => d.id),
                      )
                    }
                    className="text-[11px] font-bold t-link hover:underline"
                  >
                    Pilih Semua
                  </button>
                  <span className="t-muted">&middot;</span>
                  <button
                    type="button"
                    onClick={() => setSelectedDivisions([])}
                    className="text-[11px] font-semibold t-muted hover:underline"
                  >
                    Kosongkan
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {exportDivisionStats.map((div) => {
                  const checked = selectedDivisions.includes(div.id);
                  const disabled = div.count === 0;
                  return (
                    <button
                      key={div.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleDivision(div.id)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors ${
                        disabled
                          ? 't-subtle t-border opacity-55 cursor-not-allowed'
                          : checked
                            ? 't-status-info border-current/35 cursor-pointer'
                            : 't-subtle t-border t-row-hover cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                            checked && !disabled
                              ? 'bg-[var(--accent-brand)] border-[var(--accent-brand)] text-white'
                              : 't-border bg-white/70'
                          }`}
                        >
                          {checked && !disabled && <Check className="w-3 h-3" />}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold t-text">{div.label}</div>
                          <div className="text-[11px] t-muted">
                            {div.count > 0
                              ? `${div.count} Orang · Total Bersih ${formatRupiah(div.totalThp)}`
                              : 'Belum ada data gaji'}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono-num text-[11px] font-bold t-text shrink-0">
                        {div.count} data
                      </span>
                    </button>
                  );
                })}
              </div>

              {(() => {
                const selectedCount = exportDivisionStats
                  .filter((d) => selectedDivisions.includes(d.id))
                  .reduce((sum, d) => sum + d.count, 0);
                return (
                  <div className="flex items-center justify-between gap-2 pt-3 border-t t-border">
                    <span className="text-[11px] t-muted">
                      Terpilih: <b className="t-text">{selectedDivisions.length} divisi</b> (
                      <b className="font-mono-num t-text">{selectedCount} data</b>)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setExportModalOpen(false)}
                        className="px-3.5 py-2 rounded-xl t-btn-secondary font-semibold"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        disabled={selectedCount === 0}
                        onClick={handleConfirmExport}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl t-btn-primary disabled:opacity-55"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh Excel</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
