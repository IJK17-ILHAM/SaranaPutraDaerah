import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  HardDrive,
  SlidersHorizontal,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_PAYROLL_RATES } from '../../config/constants';
import { useApp } from '../../context/AppContext';
import { usePayroll } from '../../context/PayrollContext';
import type { PayrollRecord } from '../../types/payroll';
import {
  type AttendancePreviewRow,
  type ParsedExcelSheet,
  type SolutionColumnMapping,
  buildAttendancePreview,
  downloadSolutionTemplateExcel,
  parseSolutionAttendanceExcel,
} from '../../utils/attendanceImport';
import {
  cleanRupiahToNumber,
  formatCurrencyInput,
  formatDateRangeLabel,
  formatNumberWithDots,
  formatRupiah,
} from '../../utils/format';

interface AttendanceImportModalProps {
  open: boolean;
  onClose: () => void;
  initialStartISO: string;
  initialEndISO: string;
  onApplyToForm: (row: AttendancePreviewRow, startISO: string, endISO: string) => void;
  onSavedBatchDrafts: (count: number, startISO: string, endISO: string) => void;
}

export function AttendanceImportModal({
  open,
  onClose,
  initialStartISO,
  initialEndISO,
  onApplyToForm,
  onSavedBatchDrafts,
}: AttendanceImportModalProps) {
  const { user, showToast } = useApp();
  const { masterEmployees, saveLocalDraftsBatch } = usePayroll();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sheet, setSheet] = useState<ParsedExcelSheet | null>(null);
  const [mapping, setMapping] = useState<SolutionColumnMapping>({
    idCol: '',
    namaCol: '',
    tanggalCol: '',
    jamMasukCol: '',
    jamPulangCol: '',
    ketCol: '',
  });
  const [showMapping, setShowMapping] = useState(false);
  const [startISO, setStartISO] = useState(initialStartISO);
  const [endISO, setEndISO] = useState(initialEndISO);
  const [rows, setRows] = useState<AttendancePreviewRow[]>([]);
  const [loadingFile, setLoadingFile] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (open) {
      setStartISO(initialStartISO);
      setEndISO(initialEndISO);
    }
  }, [initialEndISO, initialStartISO, open]);

  // Rebuild preview whenever sheet, column mapping, or period filter changes
  useEffect(() => {
    if (!sheet) {
      setRows([]);
      return;
    }
    const nextRows = buildAttendancePreview(sheet, mapping, masterEmployees, startISO, endISO);
    setRows(nextRows);
  }, [endISO, mapping, masterEmployees, sheet, startISO]);

  const periodeLabel = useMemo(
    () => (startISO && endISO ? formatDateRangeLabel(startISO, endISO) : 'Periode Import'),
    [endISO, startISO],
  );

  const selectedRows = useMemo(() => rows.filter((r) => r.selected), [rows]);
  const matchedCount = useMemo(() => rows.filter((r) => r.matched).length, [rows]);
  const unmatchedCount = rows.length - matchedCount;

  if (!open) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    setLoadingFile(true);
    try {
      const parsed = await parseSolutionAttendanceExcel(file);
      setSheet(parsed);
      setMapping(parsed.suggestedMapping);
      if (parsed.minDate) setStartISO(parsed.minDate);
      if (parsed.maxDate) setEndISO(parsed.maxDate);

      if (!parsed.suggestedMapping.idCol || !parsed.suggestedMapping.tanggalCol) {
        setShowMapping(true);
        showToast(
          'File dibaca. Silakan sesuaikan pemetaan kolom ID dan Tanggal di bawah.',
          'warning',
        );
      } else {
        showToast(
          `File ${parsed.fileName} berhasil dibaca (${parsed.rows.length} baris log absensi).`,
          'success',
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal membaca file Excel.';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setLoadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    const fname = downloadSolutionTemplateExcel(masterEmployees);
    showToast(`Template contoh ${fname} berhasil diunduh.`, 'success');
  };

  const updateRow = (idx: number, patch: Partial<AttendancePreviewRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const toggleAllRows = (checked: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: checked })));
  };

  const calcRowThp = (r: AttendancePreviewRow) => {
    const gapok = r.isTrip ? r.tripInput * r.upahPerTrip : r.hariKerjaInput * r.upahPerHari;
    const nomJam = r.jamLembur * DEFAULT_PAYROLL_RATES.upahPerJam;
    const nomInap = r.inap * DEFAULT_PAYROLL_RATES.upahPerInap;
    const kotor = gapok + nomJam + nomInap;
    const pot = r.kasbon + r.bpjs;
    return { gapok, nomJam, nomInap, totalLembur: nomJam + nomInap, kotor, pot, thp: kotor - pot };
  };

  const handleSaveSelectedToLocalDrafts = () => {
    if (!selectedRows.length) {
      showToast('Centang minimal 1 karyawan terlebih dahulu.', 'warning');
      return;
    }

    const payloads: PayrollRecord[] = selectedRows.map((r) => {
      const calc = calcRowThp(r);
      const bp: string[] = [];
      if (r.jamLembur > 0) bp.push(`${r.jamLembur} Jam`);
      if (r.inap > 0) bp.push(`${r.inap} Inap`);

      return {
        action: 'save',
        nama: r.nama.trim(),
        nik: r.nik.trim().toUpperCase(),
        divisi: r.divisi,
        skema: r.divisi,
        tipe: r.divisi.toLowerCase(),
        satuanPokok: r.isTrip ? 'trip' : 'hari',
        periodeTanggal: periodeLabel,
        periodeBulan: periodeLabel,
        periodeWaktu: periodeLabel,
        hariKerja: r.isTrip ? 0 : r.hariKerjaInput,
        hadir: r.isTrip ? r.tripInput : r.hariKerjaInput,
        spsHadir: r.hariFingerprint,
        spsAlpha: 0,
        upahPerHari: r.isTrip ? 0 : r.upahPerHari,
        trip: r.isTrip ? r.tripInput : 0,
        upahPerTrip: r.isTrip ? r.upahPerTrip : 0,
        lemburHari: 0,
        upahLemburHari: DEFAULT_PAYROLL_RATES.upahLemburHari,
        nominalLemburHari: 0,
        jamLembur: r.jamLembur,
        tambahanJamLembur: 0,
        upahPerJam: DEFAULT_PAYROLL_RATES.upahPerJam,
        nominalLemburJam: calc.nomJam,
        inap: r.inap,
        upahPerInap: DEFAULT_PAYROLL_RATES.upahPerInap,
        nominalLemburInap: calc.nomInap,
        lemburJenis: r.inap > 0 && r.jamLembur === 0 ? 'Menginap' : 'Jam',
        lemburVolume: r.inap > 0 && r.jamLembur === 0 ? r.inap : r.jamLembur,
        lemburTarif:
          r.inap > 0 && r.jamLembur === 0
            ? DEFAULT_PAYROLL_RATES.upahPerInap
            : DEFAULT_PAYROLL_RATES.upahPerJam,
        lemburNominal: calc.totalLembur,
        lemburBreakdown: bp.join(' + ') || '0',
        gapok: calc.gapok,
        tunjangan: 0,
        potAbsen: 0,
        pph: 0,
        gajiKotor: calc.kotor,
        kasbon: r.kasbon,
        bpjs: r.bpjs,
        keterangan: r.keterangan.trim() || `Import Solution X606-S (${r.hariFingerprint} hari hadir)`,
        totalPotongan: calc.pot,
        thp: calc.thp,
        status: 'Draft',
        statusBayar: 'Draft',
        diinputOleh: user ? `${user.nama} (${user.username || user.email || 'admin'})` : 'Admin',
      };
    });

    const savedCount = saveLocalDraftsBatch(payloads);
    onSavedBatchDrafts(savedCount, startISO, endISO);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/55 backdrop-blur-xs no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-6xl max-h-[92vh] t-card rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b t-border flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'var(--status-info-bg)',
                color: 'var(--status-info-text)',
              }}
            >
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold t-text truncate">
                Import Absensi Excel (Solution X606-S)
              </h3>
              <p className="text-xs t-muted mt-0.5 truncate">
                Cocokkan ID fingerprint dengan NIK, isi otomatis Hari Kerja untuk karyawan harian,
                lalu simpan sebagai Draft Lokal.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal import absensi"
            className="p-2 rounded-xl t-btn-secondary shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Step 1: Upload Bar & Example Template */}
          <div className="rounded-2xl t-subtle border t-border p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs font-bold t-text">
                1. Unggah File Excel Ekspor Mesin Solution X606-S (.xlsx / .xls / .csv)
              </div>
              <p className="text-[11px] t-muted">
                {sheet
                  ? `File aktif: ${sheet.fileName} (${sheet.rows.length} baris log · Sheet "${sheet.sheetName}")`
                  : 'Belum ada file dipilih. Unduh template contoh terlebih dahulu untuk melihat struktur kolom ID, Tanggal, dan Jam Absensi.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Template Contoh</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                disabled={loadingFile}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl t-btn-primary text-xs whitespace-nowrap disabled:opacity-60"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{loadingFile ? 'Membaca file...' : sheet ? 'Ganti File Excel' : 'Pilih File Excel'}</span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl t-status-bad text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Step 2: Period Filter & Column Mapping */}
          {sheet && (
            <div className="t-card rounded-2xl p-4 border t-border space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-bold t-text">
                    <Calendar className="w-3.5 h-3.5 t-link" />
                    <span>2. Periode Absensi:</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <label className="t-muted">Dari</label>
                    <input
                      type="date"
                      value={startISO}
                      onChange={(e) => setStartISO(e.target.value)}
                      className="t-input rounded-lg px-2 py-1 text-xs font-mono-num"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="t-muted">Sampai</label>
                    <input
                      type="date"
                      value={endISO}
                      onChange={(e) => setEndISO(e.target.value)}
                      className="t-input rounded-lg px-2 py-1 text-xs font-mono-num"
                    />
                  </div>
                  <span className="text-[11px] font-semibold t-link">{periodeLabel}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMapping((p) => !p)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>{showMapping ? 'Sembunyikan Pemetaan Kolom' : 'Atur Pemetaan Kolom'}</span>
                </button>
              </div>

              {showMapping && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 pt-3 border-t t-border">
                  {(
                    [
                      { key: 'idCol', label: 'Kolom ID Finger *' },
                      { key: 'namaCol', label: 'Kolom Nama' },
                      { key: 'tanggalCol', label: 'Kolom Tanggal *' },
                      { key: 'jamMasukCol', label: 'Jam Masuk / Scan 1' },
                      { key: 'jamPulangCol', label: 'Jam Pulang / Scan 2' },
                      { key: 'ketCol', label: 'Keterangan' },
                    ] as const
                  ).map((field) => (
                    <div key={field.key}>
                      <label className="block t-field-label mb-1">{field.label}</label>
                      <select
                        value={mapping[field.key]}
                        onChange={(e) =>
                          setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg t-input font-semibold"
                      >
                        <option value="">-- Tidak dipakai --</option>
                        {sheet.headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Preview Matched Attendance Table */}
          {sheet && (
            <div className="t-card rounded-2xl border t-border overflow-hidden">
              <div className="px-4 py-3 border-b t-border flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="t-section-label">
                    3. Hasil Pencocokan ID Fingerprint &rarr; NIK ({rows.length} karyawan)
                  </span>
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-bold"
                    style={{ color: 'var(--status-ok-text)' }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{matchedCount} cocok NIK</span>
                  </span>
                  {unmatchedCount > 0 && (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-bold"
                      style={{ color: 'var(--status-warn-text)' }}
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{unmatchedCount} belum di master</span>
                    </span>
                  )}
                </div>

                <span className="text-[11px] t-muted">
                  Trip, Inap, Lembur &amp; Kasbon bisa diisi langsung di tabel atau lewat tombol
                  Muat ke Form.
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="t-subtle border-b t-border">
                      <th className="py-2.5 px-3 w-9 text-center">
                        <input
                          type="checkbox"
                          checked={rows.length > 0 && selectedRows.length === rows.length}
                          onChange={(e) => toggleAllRows(e.target.checked)}
                          aria-label="Pilih semua karyawan"
                          className="w-3.5 h-3.5 rounded accent-[var(--accent-brand)] cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3 t-th-label">ID &rarr; Karyawan</th>
                      <th className="py-2.5 px-2 t-th-label">Skema</th>
                      <th className="py-2.5 px-2 t-th-label text-center">Hadir Finger</th>
                      <th className="py-2.5 px-2 t-th-label text-right">HR / Trip</th>
                      <th className="py-2.5 px-2 t-th-label text-right">Lembur (Jam)</th>
                      <th className="py-2.5 px-2 t-th-label text-right">Inap</th>
                      <th className="py-2.5 px-2 t-th-label text-right">Kasbon (Rp)</th>
                      <th className="py-2.5 px-3 t-th-label text-right">Est. THP</th>
                      <th className="py-2.5 px-3 t-th-label text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y t-border">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-6 text-center t-muted">
                          Tidak ada data absensi dalam rentang periode ini. Cek tanggal periode atau
                          pengaturan pemetaan kolom di atas.
                        </td>
                      </tr>
                    ) : (
                      rows.map((r, idx) => {
                        const calc = calcRowThp(r);
                        return (
                          <tr key={`${r.fingerId}-${idx}`} className="t-row-hover">
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={r.selected}
                                onChange={(e) => updateRow(idx, { selected: e.target.checked })}
                                aria-label={`Pilih ${r.nama}`}
                                className="w-3.5 h-3.5 rounded accent-[var(--accent-brand)] cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold t-text">{r.nama}</div>
                              <div className="text-[10px] font-mono-num t-muted">
                                ID {r.fingerId} &rarr; NIK {r.nik}{' '}
                                {!r.matched && (
                                  <span style={{ color: 'var(--status-warn-text)' }}>
                                    (Belum di master)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-2 whitespace-nowrap">
                              <div className="font-semibold t-text">{r.divisi}</div>
                              <div className="text-[10px] t-muted">
                                {r.isTrip ? 'Gaji per Trip' : 'Gaji Harian (Auto HR)'}
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono-num font-bold t-link">
                              {r.hariFingerprint} hari
                            </td>
                            <td className="py-2.5 px-2 text-right">
                              {r.isTrip ? (
                                <div className="inline-flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={r.tripInput}
                                    onChange={(e) =>
                                      updateRow(idx, { tripInput: parseFloat(e.target.value) || 0 })
                                    }
                                    className="w-16 text-right px-2 py-1 rounded-lg t-input font-mono-num font-bold"
                                  />
                                  <span className="text-[10px] t-muted">Trip</span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={0}
                                    step={0.5}
                                    value={r.hariKerjaInput}
                                    onChange={(e) =>
                                      updateRow(idx, {
                                        hariKerjaInput: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className="w-16 text-right px-2 py-1 rounded-lg t-input font-mono-num font-bold"
                                  />
                                  <span className="text-[10px] t-muted">HR</span>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-right">
                              <input
                                type="number"
                                min={0}
                                step={0.5}
                                value={r.jamLembur}
                                onChange={(e) =>
                                  updateRow(idx, { jamLembur: parseFloat(e.target.value) || 0 })
                                }
                                className="w-16 text-right px-2 py-1 rounded-lg t-input font-mono-num"
                              />
                            </td>
                            <td className="py-2.5 px-2 text-right">
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={r.inap}
                                onChange={(e) =>
                                  updateRow(idx, { inap: parseFloat(e.target.value) || 0 })
                                }
                                className="w-14 text-right px-2 py-1 rounded-lg t-input font-mono-num"
                              />
                            </td>
                            <td className="py-2.5 px-2 text-right">
                              <input
                                type="text"
                                value={r.kasbon > 0 ? formatNumberWithDots(r.kasbon) : ''}
                                placeholder="0"
                                onChange={(e) =>
                                  updateRow(idx, {
                                    kasbon: cleanRupiahToNumber(formatCurrencyInput(e.target.value)),
                                  })
                                }
                                className="w-24 text-right px-2 py-1 rounded-lg t-input font-mono-num"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono-num font-bold t-text whitespace-nowrap">
                              {formatRupiah(calc.thp)}
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  onApplyToForm(r, startISO, endISO);
                                  onClose();
                                }}
                                className="inline-flex items-center gap-1 t-link font-bold hover:underline"
                              >
                                <span>Muat ke Form</span>
                                <ArrowRight className="w-3 h-3" />
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
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t t-border flex flex-wrap items-center justify-between gap-2.5 shrink-0 t-card">
          <div className="text-xs t-muted">
            {rows.length > 0 ? (
              <>
                <b className="t-text font-mono-num">{selectedRows.length}</b> dari{' '}
                <b className="t-text font-mono-num">{rows.length}</b> karyawan dipilih untuk
                disimpan ke Draft Lokal.
              </>
            ) : (
              'Unggah file Excel Solution X606-S untuk mulai memproses absensi.'
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
            >
              Tutup
            </button>
            <button
              type="button"
              disabled={selectedRows.length === 0}
              onClick={handleSaveSelectedToLocalDrafts}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl t-btn-primary text-xs whitespace-nowrap disabled:opacity-50"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Simpan ke Draft Lokal ({selectedRows.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
