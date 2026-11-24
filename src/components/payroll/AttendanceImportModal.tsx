import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  CloudUpload,
  Download,
  FileSpreadsheet,
  HardDrive,
  SlidersHorizontal,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DIVISIONS, PAYROLL_CYCLES } from '../../config/constants';
import { useApp } from '../../context/AppContext';
import { usePayroll } from '../../context/PayrollContext';
import type { DivisionName, PayrollCycle, PayrollRecord } from '../../types/payroll';
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
import { getPeriodeDisplay } from '../../utils/payrollCalc';

interface AttendanceImportModalProps {
  open: boolean;
  onClose: () => void;
  initialStartISO: string;
  initialEndISO: string;
  initialPeriodeLabel?: string;
  onApplyToForm: (row: AttendancePreviewRow, startISO: string, endISO: string, periodeLabel: string) => void;
  onSavedBatchDrafts: (count: number, startISO: string, endISO: string, periodeLabel: string) => void;
  onImportedDirect?: (
    summary: { updated: number; created: number; failed: number },
    startISO: string,
    endISO: string,
    periodeLabel: string,
  ) => void;
}

const EMPTY_MAPPING: SolutionColumnMapping = {
  idCol: '',
  namaCol: '',
  divisiCol: '',
  siklusCol: '',
  satuanCol: '',
  tanggalCol: '',
  jamMasukCol: '',
  jamPulangCol: '',
  hariKerjaCol: '',
  tripCol: '',
  upahPokokCol: '',
  upahHariCol: '',
  upahTripCol: '',
  lemburHariCol: '',
  upahLemburHariCol: '',
  lemburJamCol: '',
  upahLemburJamCol: '',
  inapCol: '',
  upahInapCol: '',
  kasbonCol: '',
  bpjsCol: '',
  ketCol: '',
};

export function AttendanceImportModal({
  open,
  onClose,
  initialStartISO,
  initialEndISO,
  initialPeriodeLabel,
  onApplyToForm,
  onSavedBatchDrafts,
  onImportedDirect,
}: AttendanceImportModalProps) {
  const { user, showToast } = useApp();
  const {
    records,
    masterEmployees,
    getEmployeeKasbonSaldo,
    saveLocalDraftsBatch,
    syncEmployeeRatesFromImport,
    upsertPayrollBatch,
  } = usePayroll();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadedFileRef = useRef<File | null>(null);

  const [sheet, setSheet] = useState<ParsedExcelSheet | null>(null);
  const [mapping, setMapping] = useState<SolutionColumnMapping>(EMPTY_MAPPING);
  const [showMapping, setShowMapping] = useState(false);
  const [startISO, setStartISO] = useState(initialStartISO);
  const [endISO, setEndISO] = useState(initialEndISO);
  const [periodeLabel, setPeriodeLabel] = useState(
    initialPeriodeLabel ||
      (initialStartISO && initialEndISO
        ? formatDateRangeLabel(initialStartISO, initialEndISO)
        : 'Periode Import'),
  );
  const [rows, setRows] = useState<AttendancePreviewRow[]>([]);
  const [loadingFile, setLoadingFile] = useState(false);
  const [importingDirect, setImportingDirect] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (open) {
      setStartISO(initialStartISO);
      setEndISO(initialEndISO);
      setPeriodeLabel(
        initialPeriodeLabel ||
          (initialStartISO && initialEndISO
            ? formatDateRangeLabel(initialStartISO, initialEndISO)
            : 'Periode Import'),
      );
    }
  }, [initialEndISO, initialPeriodeLabel, initialStartISO, open]);

  // Rebuild preview whenever sheet, column mapping, or period filter changes
  useEffect(() => {
    if (!sheet) {
      setRows([]);
      return;
    }
    const nextRows = buildAttendancePreview(sheet, mapping, masterEmployees, startISO, endISO);
    setRows(nextRows);
  }, [endISO, mapping, masterEmployees, sheet, startISO]);

  const calcRowThp = (r: AttendancePreviewRow) => {
    const gapok = r.isTrip ? r.tripInput * r.upahPerTrip : r.hariKerjaInput * r.upahPerHari;
    const nomHari = r.lemburHari * r.upahLemburHari;
    const nomJam = r.jamLembur * r.upahPerJam;
    const nomInap = r.inap * r.upahPerInap;
    const totalLembur = nomHari + nomJam + nomInap;
    const kotor = gapok + totalLembur;
    const pot = r.kasbon + r.bpjs;
    return { gapok, nomHari, nomJam, nomInap, totalLembur, kotor, pot, thp: kotor - pot };
  };

  const selectedRows = useMemo(() => rows.filter((r) => r.selected), [rows]);
  const matchedCount = useMemo(() => rows.filter((r) => r.matched).length, [rows]);
  const rateExcelCount = useMemo(() => rows.filter((r) => r.rateFromExcel).length, [rows]);
  const totalSelectedThp = useMemo(
    () => selectedRows.reduce((sum, r) => sum + calcRowThp(r).thp, 0),
    [selectedRows],
  );

  // Detect which rows already exist in records for this period (so user sees "Update" badge)
  const existingPeriodKeys = useMemo(() => {
    const set = new Set<string>();
    const targetPer = periodeLabel.trim().toLowerCase();
    records.forEach((rec) => {
      if (getPeriodeDisplay(rec).toLowerCase() !== targetPer) return;
      const nik = (rec.nik || '').toString().trim().toUpperCase();
      if (nik) set.add(`NIK:${nik}`);
      const digits = nik.replace(/\D/g, '');
      if (digits) set.add(`NUM:${parseInt(digits, 10)}`);
      const nm = (rec.nama || '').toString().trim().toLowerCase();
      if (nm) set.add(`NAMA:${nm}`);
    });
    return set;
  }, [periodeLabel, records]);

  const isExistingInPeriod = (r: AttendancePreviewRow): boolean => {
    const nik = r.nik.trim().toUpperCase();
    if (nik && existingPeriodKeys.has(`NIK:${nik}`)) return true;
    const digits = nik.replace(/\D/g, '');
    if (digits && existingPeriodKeys.has(`NUM:${parseInt(digits, 10)}`)) return true;
    const nm = r.nama.trim().toLowerCase();
    return Boolean(nm && existingPeriodKeys.has(`NAMA:${nm}`));
  };

  if (!open) return null;

  const loadWorkbookSheet = async (file: File, preferredSheet?: string) => {
    setErrorMsg('');
    setLoadingFile(true);
    try {
      const parsed = await parseSolutionAttendanceExcel(file, preferredSheet);
      setSheet(parsed);
      setMapping(parsed.suggestedMapping);
      if (parsed.detectedMode === 'attendance-log' && parsed.minDate && parsed.maxDate) {
        setStartISO(parsed.minDate);
        setEndISO(parsed.maxDate);
        setPeriodeLabel(formatDateRangeLabel(parsed.minDate, parsed.maxDate));
      }

      const missingCore =
        parsed.detectedMode === 'attendance-log'
          ? !parsed.suggestedMapping.idCol || !parsed.suggestedMapping.tanggalCol
          : !parsed.suggestedMapping.idCol && !parsed.suggestedMapping.namaCol;

      if (missingCore) {
        setShowMapping(true);
        showToast('File dibaca. Sesuaikan pemetaan kolom agar data terbaca tepat.', 'warning');
      } else {
        showToast(
          `Sheet "${parsed.sheetName}" terbaca (${parsed.rows.length} baris · ${
            parsed.detectedMode === 'payroll-rekap' ? 'Mode Rekap Gaji & Nominal' : 'Mode Log Absensi Harian'
          }).`,
          'success',
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal membaca file Excel.';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setLoadingFile(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadedFileRef.current = file;
    await loadWorkbookSheet(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSwitchSheet = async (nextSheet: string) => {
    if (!uploadedFileRef.current) return;
    await loadWorkbookSheet(uploadedFileRef.current, nextSheet);
  };

  const handleDownloadTemplate = () => {
    const fname = downloadSolutionTemplateExcel(masterEmployees);
    showToast(
      `Template ${fname} diunduh (berisi nominal upah & lembur per karyawan).`,
      'success',
    );
  };

  const updateRow = (idx: number, patch: Partial<AttendancePreviewRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const toggleAllRows = (checked: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: checked })));
  };

  const buildPayloads = (list: AttendancePreviewRow[]): PayrollRecord[] => {
    const cleanPeriode = periodeLabel.trim() || formatDateRangeLabel(startISO, endISO);
    return list.map((r) => {
      const calc = calcRowThp(r);
      const bp: string[] = [];
      if (r.lemburHari > 0) bp.push(`${r.lemburHari} Hari`);
      if (r.jamLembur > 0) bp.push(`${r.jamLembur} Jam`);
      if (r.inap > 0) bp.push(`${r.inap} Inap`);

      const lemburJenis =
        bp.length > 1
          ? 'Campuran'
          : r.inap > 0
            ? 'Menginap'
            : r.lemburHari > 0
              ? 'Harian'
              : 'Jam';
      const lemburVolume =
        lemburJenis === 'Menginap'
          ? r.inap
          : lemburJenis === 'Harian'
            ? r.lemburHari
            : r.jamLembur;
      const lemburTarif =
        lemburJenis === 'Menginap'
          ? r.upahPerInap
          : lemburJenis === 'Harian'
            ? r.upahLemburHari
            : r.upahPerJam;

      const liveSaldo = getEmployeeKasbonSaldo(r.nik, r.nama);
      const sisaSetelah = Math.max(0, liveSaldo - r.kasbon);

      return {
        action: 'save',
        nama: r.nama.trim(),
        nik: r.nik.trim().toUpperCase(),
        divisi: r.divisi,
        skema: r.divisi,
        tipe: r.divisi.toLowerCase(),
        siklusGaji: r.siklusGaji,
        satuanPokok: r.isTrip ? 'trip' : 'hari',
        periodeTanggal: cleanPeriode,
        periodeBulan: cleanPeriode,
        periodeWaktu: cleanPeriode,
        hariKerja: r.isTrip ? 0 : r.hariKerjaInput,
        hadir: r.isTrip ? r.tripInput : r.hariKerjaInput,
        spsHadir: r.hariFingerprint || (r.isTrip ? r.tripInput : r.hariKerjaInput),
        spsAlpha: 0,
        upahPerHari: r.isTrip ? 0 : r.upahPerHari,
        trip: r.isTrip ? r.tripInput : 0,
        upahPerTrip: r.isTrip ? r.upahPerTrip : 0,
        lemburHari: r.lemburHari,
        upahLemburHari: r.upahLemburHari,
        nominalLemburHari: calc.nomHari,
        jamLembur: r.jamLembur,
        tambahanJamLembur: 0,
        upahPerJam: r.upahPerJam,
        nominalLemburJam: calc.nomJam,
        inap: r.inap,
        upahPerInap: r.upahPerInap,
        nominalLemburInap: calc.nomInap,
        lemburJenis,
        lemburVolume,
        lemburTarif,
        lemburNominal: calc.totalLembur,
        lemburBreakdown: bp.join(' + ') || '0',
        gapok: calc.gapok,
        tunjangan: 0,
        potAbsen: 0,
        pph: 0,
        gajiKotor: calc.kotor,
        kasbon: r.kasbon,
        saldoKasbonAwal: liveSaldo,
        sisaKasbonSetelah: sisaSetelah,
        bpjs: r.bpjs,
        keterangan:
          r.keterangan.trim() ||
          (sheet?.detectedMode === 'attendance-log'
            ? `Import Excel (${r.hariFingerprint} hari hadir)`
            : 'Import Template Gaji Excel'),
        totalPotongan: calc.pot,
        thp: calc.thp,
        status: 'Draft',
        statusBayar: 'Draft',
        diinputOleh: user ? `${user.nama} (${user.username || user.email || 'admin'})` : 'Admin',
      };
    });
  };

  const handleSaveSelectedToLocalDrafts = () => {
    if (!selectedRows.length) {
      showToast('Centang minimal 1 karyawan terlebih dahulu.', 'warning');
      return;
    }

    const payloads = buildPayloads(selectedRows);
    // Sync each employee's master salary & overtime tariff profile immediately
    syncEmployeeRatesFromImport(payloads);
    const savedCount = saveLocalDraftsBatch(payloads);
    onSavedBatchDrafts(savedCount, startISO, endISO, periodeLabel.trim());
    onClose();
  };

  const handleImportAndUpdateDirectly = async () => {
    if (!selectedRows.length || importingDirect) {
      if (!selectedRows.length) showToast('Centang minimal 1 karyawan terlebih dahulu.', 'warning');
      return;
    }

    setImportingDirect(true);
    try {
      const payloads = buildPayloads(selectedRows);
      const summary = await upsertPayrollBatch(payloads);
      if (onImportedDirect) {
        onImportedDirect(summary, startISO, endISO, periodeLabel.trim());
      } else {
        showToast(
          `Import selesai: ${summary.updated} diperbarui, ${summary.created} baru disimpan, dan nominal tarif tiap karyawan telah di-update.`,
          'success',
        );
      }
      onClose();
    } finally {
      setImportingDirect(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/55 backdrop-blur-xs no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget && !importingDirect) onClose();
      }}
    >
      <div className="w-full max-w-7xl max-h-[94vh] t-card rounded-2xl overflow-hidden shadow-2xl flex flex-col">
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
                Import Gaji &amp; Absensi Excel (Nominal Gaji &amp; Lembur per Karyawan)
              </h3>
              <p className="text-xs t-muted mt-0.5 truncate">
                Mendukung template gaji dengan nominal upah &amp; lemburan berbeda tiap karyawan
                maupun log absensi Solution X606-S.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={importingDirect}
            onClick={onClose}
            aria-label="Tutup modal import gaji"
            className="p-2 rounded-xl t-btn-secondary shrink-0 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Step 1: Upload Bar & Template Download */}
          <div className="rounded-2xl t-subtle border t-border p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="text-xs font-bold t-text">
                1. Unduh Template Terbaru atau Unggah File Excel (.xlsx / .xls / .csv)
              </div>
              <p className="text-[11px] t-muted">
                {sheet ? (
                  <>
                    File aktif: <b className="t-text">{sheet.fileName}</b> ({sheet.rows.length}{' '}
                    baris &middot; Sheet <b>&ldquo;{sheet.sheetName}&rdquo;</b> &middot;{' '}
                    <span className="font-semibold t-link">
                      {sheet.detectedMode === 'payroll-rekap'
                        ? 'Mode Rekap Gaji per Karyawan'
                        : 'Mode Log Absensi Harian'}
                    </span>
                    )
                  </>
                ) : (
                  'Template Excel sudah berisi daftar karyawan aktif beserta kolom Nominal Upah Pokok (Rp), Lembur Harian/Jam/Inap & tarifnya masing-masing.'
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Template Gaji</span>
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
                disabled={loadingFile || importingDirect}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl t-btn-primary text-xs whitespace-nowrap disabled:opacity-60"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {loadingFile ? 'Membaca file...' : sheet ? 'Ganti File Excel' : 'Pilih File Excel'}
                </span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl t-status-bad text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Step 2: Sheet Switcher, Period & Column Mapping */}
          {sheet && (
            <div className="t-card rounded-2xl p-4 border t-border space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {sheet.availableSheets.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      <label className="font-bold t-text">Sheet:</label>
                      <select
                        value={sheet.sheetName}
                        onChange={(e) => handleSwitchSheet(e.target.value)}
                        className="t-input rounded-lg px-2.5 py-1 text-xs font-semibold"
                      >
                        {sheet.availableSheets.map((sn) => (
                          <option key={sn} value={sn}>
                            {sn}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <span className="inline-flex items-center gap-1.5 font-bold t-text">
                    <Calendar className="w-3.5 h-3.5 t-link" />
                    <span>2. Periode Gaji:</span>
                  </span>

                  <input
                    type="text"
                    value={periodeLabel}
                    onChange={(e) => setPeriodeLabel(e.target.value)}
                    placeholder="Contoh: 31 Okt - 06 Nov 2026"
                    className="t-input rounded-lg px-2.5 py-1 text-xs font-semibold w-44"
                  />

                  <div className="flex items-center gap-1.5">
                    <label className="t-muted">Dari</label>
                    <input
                      type="date"
                      value={startISO}
                      onChange={(e) => {
                        setStartISO(e.target.value);
                        if (e.target.value && endISO) {
                          setPeriodeLabel(formatDateRangeLabel(e.target.value, endISO));
                        }
                      }}
                      className="t-input rounded-lg px-2 py-1 text-xs font-mono-num"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="t-muted">Sampai</label>
                    <input
                      type="date"
                      value={endISO}
                      onChange={(e) => {
                        setEndISO(e.target.value);
                        if (startISO && e.target.value) {
                          setPeriodeLabel(formatDateRangeLabel(startISO, e.target.value));
                        }
                      }}
                      className="t-input rounded-lg px-2 py-1 text-xs font-mono-num"
                    />
                  </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3 border-t t-border">
                  {(
                    [
                      { key: 'idCol', label: 'NIK / ID Finger' },
                      { key: 'namaCol', label: 'Nama Karyawan' },
                      { key: 'divisiCol', label: 'Divisi' },
                      { key: 'siklusCol', label: 'Siklus Gaji' },
                      { key: 'satuanCol', label: 'Satuan (HR/Trip)' },
                      { key: 'tanggalCol', label: 'Tanggal (Log Harian)' },
                      { key: 'jamMasukCol', label: 'Jam Masuk' },
                      { key: 'jamPulangCol', label: 'Jam Pulang' },
                      { key: 'hariKerjaCol', label: 'Hari Kerja (HR)' },
                      { key: 'tripCol', label: 'Jumlah Trip' },
                      { key: 'upahPokokCol', label: 'Nominal Upah Pokok' },
                      { key: 'upahHariCol', label: 'Upah/Hari (Khusus)' },
                      { key: 'upahTripCol', label: 'Upah/Trip (Khusus)' },
                      { key: 'lemburHariCol', label: 'Lembur Harian (HR)' },
                      { key: 'upahLemburHariCol', label: 'Upah Lembur Harian' },
                      { key: 'lemburJamCol', label: 'Lembur Jam (Jam)' },
                      { key: 'upahLemburJamCol', label: 'Upah Lembur Jam' },
                      { key: 'inapCol', label: 'Lembur Inap' },
                      { key: 'upahInapCol', label: 'Upah Lembur Inap' },
                      { key: 'kasbonCol', label: 'Potongan Kasbon' },
                      { key: 'bpjsCol', label: 'Iuran BPJS' },
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
                        className="w-full text-xs px-2 py-1.5 rounded-lg t-input font-semibold"
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

          {/* Step 3: Preview Table with Editable Per-Employee Nominal Salary & Overtime */}
          {sheet && (
            <div className="t-card rounded-2xl border t-border overflow-hidden">
              <div className="px-4 py-3 border-b t-border flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="t-section-label">
                    3. Preview Nominal Gaji &amp; Lemburan per Karyawan ({rows.length} karyawan)
                  </span>
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-bold"
                    style={{ color: 'var(--status-ok-text)' }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{matchedCount} terdaftar</span>
                  </span>
                  {rateExcelCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold t-link">
                      <span>{rateExcelCount} nominal dari Excel</span>
                    </span>
                  )}
                </div>

                <span className="text-[11px] t-muted">
                  Nominal Upah &amp; Tarif Lembur tiap karyawan langsung terbaca &amp; bisa diubah
                  langsung di tabel sebelum disimpan.
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="t-subtle border-b t-border">
                      <th className="py-2.5 px-2.5 w-8 text-center">
                        <input
                          type="checkbox"
                          checked={rows.length > 0 && selectedRows.length === rows.length}
                          onChange={(e) => toggleAllRows(e.target.checked)}
                          aria-label="Pilih semua karyawan"
                          className="w-3.5 h-3.5 rounded accent-[var(--accent-brand)] cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-2.5 t-th-label">Karyawan &amp; Divisi</th>
                      <th className="py-2.5 px-2 t-th-label">Pokok (Qty &times; Nominal Rp)</th>
                      <th className="py-2.5 px-2 t-th-label">Lembur Harian</th>
                      <th className="py-2.5 px-2 t-th-label">Lembur Jam</th>
                      <th className="py-2.5 px-2 t-th-label">Lembur Inap</th>
                      <th className="py-2.5 px-2 t-th-label">Kasbon &amp; BPJS</th>
                      <th className="py-2.5 px-2.5 t-th-label text-right">Est. Gaji Bersih</th>
                      <th className="py-2.5 px-2.5 t-th-label text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y t-border">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-6 text-center t-muted">
                          Tidak ada data yang cocok. Cek pemetaan kolom atau rentang tanggal di
                          atas.
                        </td>
                      </tr>
                    ) : (
                      rows.map((r, idx) => {
                        const calc = calcRowThp(r);
                        const willUpdateExisting = isExistingInPeriod(r);
                        return (
                          <tr key={`${r.fingerId}-${idx}`} className="t-row-hover align-top">
                            <td className="py-2.5 px-2.5 text-center pt-3">
                              <input
                                type="checkbox"
                                checked={r.selected}
                                onChange={(e) => updateRow(idx, { selected: e.target.checked })}
                                aria-label={`Pilih ${r.nama}`}
                                className="w-3.5 h-3.5 rounded accent-[var(--accent-brand)] cursor-pointer"
                              />
                            </td>

                            {/* Karyawan, Divisi & Siklus */}
                            <td className="py-2.5 px-2.5 min-w-[175px]">
                              <div className="font-bold t-text leading-tight">{r.nama}</div>
                              <div className="text-[10px] font-mono-num t-muted mt-0.5 flex flex-wrap items-center gap-1.5">
                                <span>NIK {r.nik}</span>
                                {willUpdateExisting ? (
                                  <span
                                    className="font-bold"
                                    style={{ color: 'var(--status-info-text)' }}
                                  >
                                    &bull; Update Periode Ini
                                  </span>
                                ) : !r.matched ? (
                                  <span
                                    className="font-bold"
                                    style={{ color: 'var(--status-warn-text)' }}
                                  >
                                    &bull; Karyawan Baru
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-1.5 flex items-center gap-1">
                                <select
                                  value={r.divisi}
                                  onChange={(e) => {
                                    const nextDiv = e.target.value as DivisionName;
                                    const nextIsTrip =
                                      nextDiv === 'Supir B3'
                                        ? true
                                        : nextDiv === 'Karyawan limbah'
                                          ? false
                                          : r.isTrip;
                                    updateRow(idx, { divisi: nextDiv, isTrip: nextIsTrip });
                                  }}
                                  className="text-[10px] px-1.5 py-1 rounded-md t-input font-semibold"
                                >
                                  {DIVISIONS.map((d) => (
                                    <option key={d} value={d}>
                                      {d}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={r.siklusGaji}
                                  onChange={(e) =>
                                    updateRow(idx, { siklusGaji: e.target.value as PayrollCycle })
                                  }
                                  className="text-[10px] px-1.5 py-1 rounded-md t-input font-semibold"
                                >
                                  {PAYROLL_CYCLES.map((c) => (
                                    <option key={c} value={c}>
                                      {c}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>

                            {/* Gaji Pokok: Qty x Nominal Upah Pokok */}
                            <td className="py-2.5 px-2 min-w-[155px]">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  step={r.isTrip ? 1 : 0.5}
                                  value={r.isTrip ? r.tripInput : r.hariKerjaInput}
                                  onChange={(e) =>
                                    updateRow(
                                      idx,
                                      r.isTrip
                                        ? { tripInput: parseFloat(e.target.value) || 0 }
                                        : { hariKerjaInput: parseFloat(e.target.value) || 0 },
                                    )
                                  }
                                  aria-label={r.isTrip ? 'Jumlah Trip' : 'Hari Kerja'}
                                  className="w-14 text-right px-1.5 py-1 rounded-lg t-input font-mono-num font-bold text-[11px]"
                                />
                                <span className="text-[10px] t-muted font-semibold">
                                  {r.isTrip ? 'Trip' : 'HR'} &times;
                                </span>
                              </div>
                              <div className="mt-1 flex items-center gap-1">
                                <span className="text-[10px] t-muted">Rp</span>
                                <input
                                  type="text"
                                  value={formatNumberWithDots(
                                    r.isTrip ? r.upahPerTrip : r.upahPerHari,
                                  )}
                                  onChange={(e) => {
                                    const val = cleanRupiahToNumber(
                                      formatCurrencyInput(e.target.value),
                                    );
                                    updateRow(
                                      idx,
                                      r.isTrip ? { upahPerTrip: val } : { upahPerHari: val },
                                    );
                                  }}
                                  aria-label="Nominal Upah Pokok"
                                  className="w-24 text-right px-1.5 py-1 rounded-lg t-input font-mono-num font-bold text-[11px]"
                                />
                              </div>
                              <div className="text-[10px] font-mono-num t-muted mt-0.5">
                                = {formatRupiah(calc.gapok)}
                              </div>
                            </td>

                            {/* Lembur Harian (Qty & Nominal) */}
                            <td className="py-2.5 px-2 min-w-[125px]">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  step={0.5}
                                  value={r.lemburHari}
                                  onChange={(e) =>
                                    updateRow(idx, { lemburHari: parseFloat(e.target.value) || 0 })
                                  }
                                  aria-label="Jumlah Lembur Harian"
                                  className="w-14 text-right px-1.5 py-1 rounded-lg t-input font-mono-num text-[11px]"
                                />
                                <span className="text-[10px] t-muted">HR</span>
                              </div>
                              <div className="mt-1 flex items-center gap-1">
                                <span className="text-[10px] t-muted">@</span>
                                <input
                                  type="text"
                                  value={formatNumberWithDots(r.upahLemburHari)}
                                  onChange={(e) =>
                                    updateRow(idx, {
                                      upahLemburHari: cleanRupiahToNumber(
                                        formatCurrencyInput(e.target.value),
                                      ),
                                    })
                                  }
                                  aria-label="Upah Lembur Harian"
                                  className="w-20 text-right px-1.5 py-1 rounded-lg t-input font-mono-num text-[11px]"
                                />
                              </div>
                              {calc.nomHari > 0 && (
                                <div
                                  className="text-[10px] font-mono-num font-semibold mt-0.5"
                                  style={{ color: 'var(--status-ok-text)' }}
                                >
                                  +{formatNumberWithDots(calc.nomHari)}
                                </div>
                              )}
                            </td>

                            {/* Lembur Jam (Qty & Nominal) */}
                            <td className="py-2.5 px-2 min-w-[125px]">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  step={0.5}
                                  value={r.jamLembur}
                                  onChange={(e) =>
                                    updateRow(idx, { jamLembur: parseFloat(e.target.value) || 0 })
                                  }
                                  aria-label="Jumlah Lembur Jam"
                                  className="w-14 text-right px-1.5 py-1 rounded-lg t-input font-mono-num text-[11px]"
                                />
                                <span className="text-[10px] t-muted">Jam</span>
                              </div>
                              <div className="mt-1 flex items-center gap-1">
                                <span className="text-[10px] t-muted">@</span>
                                <input
                                  type="text"
                                  value={formatNumberWithDots(r.upahPerJam)}
                                  onChange={(e) =>
                                    updateRow(idx, {
                                      upahPerJam: cleanRupiahToNumber(
                                        formatCurrencyInput(e.target.value),
                                      ),
                                    })
                                  }
                                  aria-label="Upah Lembur Jam"
                                  className="w-20 text-right px-1.5 py-1 rounded-lg t-input font-mono-num text-[11px]"
                                />
                              </div>
                              {calc.nomJam > 0 && (
                                <div
                                  className="text-[10px] font-mono-num font-semibold mt-0.5"
                                  style={{ color: 'var(--status-ok-text)' }}
                                >
                                  +{formatNumberWithDots(calc.nomJam)}
                                </div>
                              )}
                            </td>

                            {/* Lembur Inap (Qty & Nominal) */}
                            <td className="py-2.5 px-2 min-w-[125px]">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={r.inap}
                                  onChange={(e) =>
                                    updateRow(idx, { inap: parseFloat(e.target.value) || 0 })
                                  }
                                  aria-label="Jumlah Inap"
                                  className="w-14 text-right px-1.5 py-1 rounded-lg t-input font-mono-num text-[11px]"
                                />
                                <span className="text-[10px] t-muted">Inap</span>
                              </div>
                              <div className="mt-1 flex items-center gap-1">
                                <span className="text-[10px] t-muted">@</span>
                                <input
                                  type="text"
                                  value={formatNumberWithDots(r.upahPerInap)}
                                  onChange={(e) =>
                                    updateRow(idx, {
                                      upahPerInap: cleanRupiahToNumber(
                                        formatCurrencyInput(e.target.value),
                                      ),
                                    })
                                  }
                                  aria-label="Upah Lembur Inap"
                                  className="w-20 text-right px-1.5 py-1 rounded-lg t-input font-mono-num text-[11px]"
                                />
                              </div>
                              {calc.nomInap > 0 && (
                                <div
                                  className="text-[10px] font-mono-num font-semibold mt-0.5"
                                  style={{ color: 'var(--status-ok-text)' }}
                                >
                                  +{formatNumberWithDots(calc.nomInap)}
                                </div>
                              )}
                            </td>

                            {/* Kasbon & BPJS */}
                            <td className="py-2.5 px-2 min-w-[125px]">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] t-muted w-9">Kbn</span>
                                <input
                                  type="text"
                                  value={r.kasbon > 0 ? formatNumberWithDots(r.kasbon) : ''}
                                  placeholder="0"
                                  onChange={(e) =>
                                    updateRow(idx, {
                                      kasbon: cleanRupiahToNumber(
                                        formatCurrencyInput(e.target.value),
                                      ),
                                    })
                                  }
                                  aria-label="Potongan Kasbon"
                                  className="w-20 text-right px-1.5 py-1 rounded-lg t-input font-mono-num text-[11px]"
                                />
                              </div>
                              <div className="mt-1 flex items-center gap-1">
                                <span className="text-[10px] t-muted w-9">BPJS</span>
                                <input
                                  type="text"
                                  value={r.bpjs > 0 ? formatNumberWithDots(r.bpjs) : ''}
                                  placeholder="0"
                                  onChange={(e) =>
                                    updateRow(idx, {
                                      bpjs: cleanRupiahToNumber(
                                        formatCurrencyInput(e.target.value),
                                      ),
                                    })
                                  }
                                  aria-label="Iuran BPJS"
                                  className="w-20 text-right px-1.5 py-1 rounded-lg t-input font-mono-num text-[11px]"
                                />
                              </div>
                            </td>

                            {/* Est. THP */}
                            <td className="py-2.5 px-2.5 text-right whitespace-nowrap">
                              <div className="font-mono-num font-bold t-text text-xs">
                                {formatRupiah(calc.thp)}
                              </div>
                              {calc.totalLembur > 0 && (
                                <div
                                  className="text-[10px] font-mono-num mt-0.5"
                                  style={{ color: 'var(--status-ok-text)' }}
                                >
                                  Lmbr {formatNumberWithDots(calc.totalLembur)}
                                </div>
                              )}
                              {calc.pot > 0 && (
                                <div
                                  className="text-[10px] font-mono-num"
                                  style={{ color: 'var(--status-bad-text)' }}
                                >
                                  Pot -{formatNumberWithDots(calc.pot)}
                                </div>
                              )}
                            </td>

                            {/* Aksi */}
                            <td className="py-2.5 px-2.5 text-right whitespace-nowrap pt-3">
                              <button
                                type="button"
                                onClick={() => {
                                  onApplyToForm(r, startISO, endISO, periodeLabel.trim());
                                  onClose();
                                }}
                                className="inline-flex items-center gap-1 t-link font-bold hover:underline"
                              >
                                <span>Ke Form</span>
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
                <b className="t-text font-mono-num">{rows.length}</b> karyawan dipilih &bull; Total
                Gaji Bersih:{' '}
                <b className="t-text font-mono-num">{formatRupiah(totalSelectedThp)}</b>
              </>
            ) : (
              'Unduh Template Gaji terlebih dahulu atau unggah file Excel Anda.'
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={importingDirect}
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap disabled:opacity-50"
            >
              Tutup
            </button>
            <button
              type="button"
              disabled={selectedRows.length === 0 || importingDirect}
              onClick={handleSaveSelectedToLocalDrafts}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap disabled:opacity-50"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Simpan ke Draft ({selectedRows.length})</span>
            </button>
            <button
              type="button"
              disabled={selectedRows.length === 0 || importingDirect}
              onClick={handleImportAndUpdateDirectly}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl t-btn-primary text-xs whitespace-nowrap disabled:opacity-50"
            >
              <CloudUpload className="w-3.5 h-3.5" />
              <span>
                {importingDirect
                  ? 'Memperbarui Gaji...'
                  : `Import & Update Langsung (${selectedRows.length})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
