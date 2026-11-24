import { CheckSquare, Download, Eye, Printer, Square, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { PayrollStatusText } from '../../components/common/StatusBadge';
import { DIVISIONS, PAYROLL_STATUSES } from '../../config/constants';
import { useApp } from '../../context/AppContext';
import { usePayroll } from '../../context/PayrollContext';
import { SpdLogoWordmark } from '../../components/common/SpdLogo';
import type { PayrollRecord } from '../../types/payroll';
import { exportPayrollToExcelMultiSheet } from '../../utils/exportExcel';
import { downloadSingleSlipPDF } from '../../utils/exportPdf';
import { formatNumberWithDots, formatRupiah } from '../../utils/format';
import {
  calculateTHP,
  getActiveOvertimeDetails,
  getPeriodeDisplay,
  getStatusDisplay,
  resolveSlipKasbonInfo,
} from '../../utils/payrollCalc';

function getSlipRowKey(item: PayrollRecord, idx: number): string {
  return `${item.nik || 'NONIK'}__${item.nama || 'NONAMA'}__${getPeriodeDisplay(item)}__${idx}`;
}

export function SlipGajiPage() {
  const { openSlipModal, openBatchSlipModal, showToast } = useApp();
  const {
    records,
    filteredRecords,
    periodOptions,
    divisiOptions,
    filters,
    setFilter,
    getEmployeeKasbonSaldo,
  } = usePayroll();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectionMode, setSelectionMode] = useState(false);
  const [checkedKeys, setCheckedKeys] = useState<Record<string, boolean>>({});

  const safeIndex = selectedIndex < filteredRecords.length ? selectedIndex : 0;
  const selectedItem = filteredRecords[safeIndex] || null;
  const selectedCalc = selectedItem ? calculateTHP(selectedItem) : null;
  const selectedLiveKasbon = selectedItem
    ? getEmployeeKasbonSaldo(selectedItem.nik, selectedItem.nama)
    : 0;
  const selectedActiveOvertime = selectedCalc ? getActiveOvertimeDetails(selectedCalc) : [];
  const selectedKasbonInfo =
    selectedItem && selectedCalc
      ? resolveSlipKasbonInfo(selectedItem, selectedCalc, selectedLiveKasbon)
      : null;

  const rowKeys = useMemo(
    () => filteredRecords.map((item, idx) => getSlipRowKey(item, idx)),
    [filteredRecords],
  );

  const selectedPrintItems = useMemo(
    () =>
      selectionMode
        ? filteredRecords.filter((item, idx) => Boolean(checkedKeys[getSlipRowKey(item, idx)]))
        : [],
    [checkedKeys, filteredRecords, selectionMode],
  );

  const allFilteredChecked =
    selectionMode && filteredRecords.length > 0 && selectedPrintItems.length === filteredRecords.length;

  const openSelectionMode = () => {
    setSelectionMode(true);
  };

  const closeSelectionMode = () => {
    setSelectionMode(false);
    setCheckedKeys({});
  };

  const toggleRowCheck = (key: string) => {
    setCheckedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAllFiltered = () => {
    const next: Record<string, boolean> = { ...checkedKeys };
    rowKeys.forEach((k) => {
      next[k] = true;
    });
    setCheckedKeys(next);
  };

  const clearSelection = () => {
    setCheckedKeys({});
  };

  const handlePrintSelected = () => {
    if (!selectedPrintItems.length) {
      showToast('Pilih minimal 1 karyawan pada daftar untuk dicetak.', 'warning');
      return;
    }
    openBatchSlipModal(selectedPrintItems);
  };

  const handleBatchPrintAll = () => {
    const items = filteredRecords.length ? filteredRecords : records;
    if (!items.length) {
      showToast('Tidak ada data slip untuk dicetak.', 'warning');
      return;
    }
    openBatchSlipModal(items);
  };

  const handleExport = () => {
    const items = selectedPrintItems.length
      ? selectedPrintItems
      : filteredRecords.length
        ? filteredRecords
        : records;
    if (!exportPayrollToExcelMultiSheet(items)) {
      showToast('Tidak ada data untuk diekspor.', 'warning');
    }
  };

  return (
    <section className="space-y-5">
      <PageHeader
        suiteLabel="Payroll"
        pageLabel="Slip gaji"
        title="Slip Gaji"
        subtitle={
          <>
            Menampilkan <b className="t-text font-mono-num">{filteredRecords.length}</b> data siap
            cetak &bull; Klik <b>Pilih Karyawan</b> untuk memilih slip tertentu yang akan dicetak.
          </>
        }
        actions={
          <>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 t-btn-secondary rounded-xl text-xs font-semibold whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{selectedPrintItems.length > 0 ? `Excel (${selectedPrintItems.length})` : 'Excel'}</span>
            </button>
            {selectedPrintItems.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={handleBatchPrintAll}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 t-btn-secondary rounded-xl text-xs font-semibold whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Semua ({filteredRecords.length})</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintSelected}
                  className="inline-flex items-center gap-1.5 px-4 py-2 t-btn-primary rounded-xl text-xs whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Terpilih ({selectedPrintItems.length})</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleBatchPrintAll}
                className="inline-flex items-center gap-1.5 px-4 py-2 t-btn-primary rounded-xl text-xs whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak semua (4 Slip per A4)</span>
              </button>
            )}
          </>
        }
      />

      {/* Filter Bar */}
      <div className="t-card p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-4">
          <label className="block t-field-label mb-1">Cari</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            placeholder="Cari nama atau No / NIK..."
            className="w-full text-xs px-3.5 py-2 rounded-xl t-input"
          />
        </div>
        <div className="lg:col-span-2">
          <label className="block t-field-label mb-1">Periode</label>
          <select
            value={filters.periode}
            onChange={(e) => setFilter('periode', e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-xl t-input font-medium"
          >
            <option value="ALL">Semua Periode</option>
            {periodOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="lg:col-span-2">
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
        <div className="lg:col-span-2">
          <label className="block t-field-label mb-1">Divisi</label>
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
        <div className="lg:col-span-2">
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

      {/* Split Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 t-card rounded-2xl overflow-hidden">
          {/* Selection Toolbar */}
          <div className="px-4 py-3 border-b t-border flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold t-text">Pilihan Cetak Karyawan</span>
              {selectionMode && (
                <span className="t-muted font-mono-num">
                  ({selectedPrintItems.length}/{filteredRecords.length} dipilih)
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!selectionMode ? (
                <button
                  type="button"
                  disabled={filteredRecords.length === 0}
                  onClick={openSelectionMode}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg t-btn-secondary text-[11px] font-semibold whitespace-nowrap disabled:opacity-50"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Pilih Karyawan</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={filteredRecords.length === 0}
                    onClick={allFilteredChecked ? clearSelection : selectAllFiltered}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg t-btn-secondary text-[11px] font-semibold whitespace-nowrap disabled:opacity-50"
                  >
                    {allFilteredChecked ? (
                      <>
                        <Square className="w-3.5 h-3.5" />
                        <span>Batal Pilih Semua</span>
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Pilih Semua</span>
                      </>
                    )}
                  </button>

                  {selectedPrintItems.length > 0 && (
                    <button
                      type="button"
                      onClick={handlePrintSelected}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg t-btn-primary text-[11px] whitespace-nowrap"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Cetak Terpilih ({selectedPrintItems.length})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={closeSelectionMode}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg t-btn-secondary text-[11px] font-semibold whitespace-nowrap"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Batal</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b t-border t-subtle">
                  {selectionMode && (
                    <th className="py-3 pl-4 pr-2 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={allFilteredChecked}
                        onChange={(e) => (e.target.checked ? selectAllFiltered() : clearSelection())}
                        aria-label="Pilih semua karyawan untuk dicetak"
                        className="w-4 h-4 rounded accent-[var(--accent-brand)] cursor-pointer"
                      />
                    </th>
                  )}
                  <th className={`py-3 ${selectionMode ? 'px-3' : 'px-4'} t-th-label`}>Nama</th>
                  <th className="py-3 px-4 t-th-label text-right">Gaji Bersih</th>
                  <th className="py-3 px-4 t-th-label text-center">Status</th>
                  <th className="py-3 px-4 t-th-label text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y t-border">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={selectionMode ? 5 : 4} className="p-6 text-center t-muted">
                      Tidak ada slip gaji yang cocok.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((item, idx) => {
                    const c = calculateTHP(item);
                    const rowKey = getSlipRowKey(item, idx);
                    const isChecked = Boolean(checkedKeys[rowKey]);
                    const isFocused = idx === safeIndex;
                    return (
                      <tr
                        key={rowKey}
                        onClick={() => setSelectedIndex(idx)}
                        className={`cursor-pointer ${isFocused ? 't-subtle' : 't-row-hover'}`}
                      >
                        {selectionMode && (
                          <td
                            className="py-3 pl-4 pr-2 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleRowCheck(rowKey)}
                              aria-label={`Pilih cetak slip ${item.nama}`}
                              className="w-4 h-4 rounded accent-[var(--accent-brand)] cursor-pointer"
                            />
                          </td>
                        )}
                        <td className={`py-3 ${selectionMode ? 'px-3' : 'px-4'}`}>
                          <div className="font-semibold t-text">{item.nama}</div>
                          <div className="text-[11px] t-muted font-mono-num">
                            {item.nik} &middot; {c.skema}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono-num font-semibold t-text">
                          {formatNumberWithDots(c.thp)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <PayrollStatusText status={getStatusDisplay(item)} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openSlipModal(item);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold t-link hover:underline whitespace-nowrap"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lihat Slip</span>
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

        {/* Right Detail Panel */}
        <div className="lg:col-span-5 t-card rounded-2xl p-5 space-y-4 sticky top-6">
          <div className="rounded-xl border border-dashed t-border-strong p-4 space-y-3">
            <div className="flex justify-between items-center border-b t-border pb-3">
              <span className="inline-flex items-center gap-2 text-sm font-display t-text">
                <SpdLogoWordmark variant="adaptive" size="sm" />
                <span>Slip gaji</span>
              </span>
              <span className="text-xs t-muted font-mono-num">
                {selectedItem ? getPeriodeDisplay(selectedItem) : '-'}
              </span>
            </div>

            <div>
              <div className="text-sm font-bold t-text">
                {selectedItem && selectedCalc
                  ? `${selectedItem.nama} - ${selectedCalc.skema}`
                  : 'Pilih karyawan di sebelah kiri'}
              </div>
              <div className="text-[11px] t-muted font-mono-num mt-0.5">
                {selectedItem && selectedCalc
                  ? `No: ${selectedItem.nik} · ${
                      selectedCalc.isTrip
                        ? `${selectedCalc.unitPokok} Trip`
                        : `${selectedCalc.unitPokok} HR`
                    }`
                  : '-'}
              </div>
            </div>

            <div className="space-y-2.5 text-xs pt-2">
              <div className="flex justify-between">
                <span className="t-muted">Gaji Pokok</span>
                <span className="font-mono-num t-text font-semibold">
                  {formatNumberWithDots(selectedCalc?.gapok ?? 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="t-muted">
                  {selectedCalc ? `Lembur (${selectedCalc.breakdownText})` : 'Lembur'}
                </span>
                <span
                  className="font-mono-num font-semibold"
                  style={{ color: 'var(--status-ok-text)' }}
                >
                  {formatNumberWithDots(selectedCalc?.lemburNominal ?? 0)}
                </span>
              </div>
              {selectedActiveOvertime.length > 0 && (
                <div className="text-[11px] t-muted pl-2 border-l-2 t-border">
                  Rincian: {selectedActiveOvertime.join(' · ')}
                </div>
              )}
              <div className="flex justify-between border-t t-border pt-2">
                <span className="t-text font-semibold">Gaji Kotor</span>
                <span className="font-mono-num t-text font-semibold">
                  {formatNumberWithDots(selectedCalc?.gajiKotor ?? 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="t-muted">Potongan (Kasbon + BPJS)</span>
                <span
                  className="font-mono-num font-semibold"
                  style={{ color: 'var(--status-bad-text)' }}
                >
                  -{formatNumberWithDots(selectedCalc?.totalPot ?? 0)}
                </span>
              </div>
            </div>

            <div className="border-t t-border pt-3 flex justify-between items-center">
              <span className="t-field-label">Gaji Bersih</span>
              <span className="text-xl font-display t-text tabular-nums">
                {formatRupiah(selectedCalc?.thp ?? 0)}
              </span>
            </div>

            {selectedKasbonInfo?.hasKasbonNotice && (
              <div className="p-2.5 rounded-xl t-status-warn text-[11px] space-y-1">
                <div className="font-bold">Pemberitahuan Hutang / Kasbon</div>
                <div className="flex justify-between">
                  <span>Gaji dipotong kasbon:</span>
                  <span className="font-mono-num font-bold">
                    {formatRupiah(selectedKasbonInfo.potonganKasbon)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Sisa hutang / kasbon:</span>
                  <span className="font-mono-num font-bold">
                    {selectedKasbonInfo.sisaKasbon > 0
                      ? formatRupiah(selectedKasbonInfo.sisaKasbon)
                      : 'Lunas (Rp 0)'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={!selectedItem}
              onClick={() =>
                selectedItem && downloadSingleSlipPDF(selectedItem, selectedLiveKasbon)
              }
              className="py-2.5 rounded-xl t-btn-secondary text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh PDF</span>
            </button>
            <button
              type="button"
              disabled={!selectedItem}
              onClick={() => selectedItem && openSlipModal(selectedItem)}
              className="py-2.5 rounded-xl t-btn-primary text-xs inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Preview / Cetak</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
