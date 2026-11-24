import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  SlidersHorizontal,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DIVISIONS, PAYROLL_CYCLES } from '../../config/constants';
import { useApp } from '../../context/AppContext';
import { usePayroll } from '../../context/PayrollContext';
import type { DivisionName, PayrollCycle } from '../../types/payroll';
import {
  type EmployeeColumnMapping,
  type EmployeeImportPreviewRow,
  type ParsedEmployeeExcel,
  buildEmployeeImportPreview,
  downloadEmployeeTemplateExcel,
  parseEmployeeExcel,
} from '../../utils/employeeImport';
import {
  cleanRupiahToNumber,
  formatCurrencyInput,
  formatNumberWithDots,
  formatRupiah,
} from '../../utils/format';

interface EmployeeImportModalProps {
  open: boolean;
  onClose: () => void;
}

const EMPTY_MAPPING: EmployeeColumnMapping = {
  nikCol: '',
  namaCol: '',
  divisiCol: '',
  siklusCol: '',
  satuanCol: '',
  upahDefaultCol: '',
  upahLemburHariCol: '',
  upahPerJamCol: '',
  upahPerInapCol: '',
  namaBankCol: '',
  noRekeningCol: '',
  atasNamaCol: '',
  kasbonSaldoCol: '',
  catatanCol: '',
};

export function EmployeeImportModal({ open, onClose }: EmployeeImportModalProps) {
  const { showToast } = useApp();
  const { employeeProfiles, importEmployeeProfilesBatch } = usePayroll();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadedFileRef = useRef<File | null>(null);

  const [sheet, setSheet] = useState<ParsedEmployeeExcel | null>(null);
  const [mapping, setMapping] = useState<EmployeeColumnMapping>(EMPTY_MAPPING);
  const [showMapping, setShowMapping] = useState(false);
  const [rows, setRows] = useState<EmployeeImportPreviewRow[]>([]);
  const [loadingFile, setLoadingFile] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!sheet) {
      setRows([]);
      return;
    }
    setRows(buildEmployeeImportPreview(sheet, mapping, employeeProfiles));
  }, [employeeProfiles, mapping, sheet]);

  const selectedRows = useMemo(() => rows.filter((r) => r.selected), [rows]);
  const newCount = useMemo(() => selectedRows.filter((r) => !r.isExisting).length, [selectedRows]);
  const updateCount = useMemo(() => selectedRows.filter((r) => r.isExisting).length, [selectedRows]);
  const totalKasbonPreview = useMemo(
    () => selectedRows.reduce((sum, r) => sum + (Number(r.kasbonSaldo) || 0), 0),
    [selectedRows],
  );

  if (!open) return null;

  const loadWorkbookSheet = async (file: File, preferredSheet?: string) => {
    setErrorMsg('');
    setLoadingFile(true);
    try {
      const parsed = await parseEmployeeExcel(file, preferredSheet);
      setSheet(parsed);
      setMapping(parsed.suggestedMapping);

      if (!parsed.suggestedMapping.namaCol && !parsed.suggestedMapping.nikCol) {
        setShowMapping(true);
        showToast('File dibaca. Sesuaikan pemetaan kolom Nama / NIK agar data terbaca.', 'warning');
      } else {
        showToast(
          `Sheet "${parsed.sheetName}" berhasil dibaca (${parsed.rows.length} baris karyawan).`,
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
    const fname = downloadEmployeeTemplateExcel(employeeProfiles);
    showToast(
      `Template ${fname} berhasil diunduh (berisi kolom identitas, upah, rekening & kasbon).`,
      'success',
    );
  };

  const updateRow = (idx: number, patch: Partial<EmployeeImportPreviewRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const toggleAll = (checked: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: checked })));
  };

  const handleCommitImport = () => {
    if (!selectedRows.length) {
      showToast('Centang minimal 1 karyawan untuk diimpor.', 'warning');
      return;
    }

    const summary = importEmployeeProfilesBatch(
      selectedRows.map((r) => ({
        id: r.matchedId,
        nik: r.nik.trim().toUpperCase(),
        nama: r.nama.trim(),
        divisi: r.divisi,
        siklusGaji: r.siklusGaji,
        satuanPokok:
          r.divisi === 'Supir B3'
            ? 'trip'
            : r.divisi === 'Karyawan limbah'
              ? 'hari'
              : r.satuanPokok,
        upahDefault: r.upahDefault,
        upahLemburHariDefault: r.upahLemburHariDefault,
        upahPerJamDefault: r.upahPerJamDefault,
        upahPerInapDefault: r.upahPerInapDefault,
        namaBank: r.namaBank.trim(),
        noRekening: r.noRekening.trim(),
        atasNamaRekening: r.atasNamaRekening.trim(),
        kasbonSaldo: r.kasbonSaldo,
        catatan: r.catatan.trim(),
      })),
    );

    const parts: string[] = [];
    if (summary.created > 0) parts.push(`${summary.created} karyawan baru ditambahkan`);
    if (summary.updated > 0) parts.push(`${summary.updated} profil diperbarui`);
    showToast(`Import Data Karyawan selesai: ${parts.join(', ')}.`, 'success');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/55 backdrop-blur-xs no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
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
                Import Data Karyawan dari Excel
              </h3>
              <p className="text-xs t-muted mt-0.5 truncate">
                Import massal identitas karyawan, divisi, siklus Mingguan/Bulanan, upah default,
                nomor rekening bank, dan saldo hutang/kasbon.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal import karyawan"
            className="p-2 rounded-xl t-btn-secondary shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Step 1: Template Download & Upload */}
          <div className="rounded-2xl t-subtle border t-border p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="text-xs font-bold t-text">
                1. Unduh Template Data Karyawan atau Unggah File Excel (.xlsx / .xls / .csv)
              </div>
              <p className="text-[11px] t-muted">
                {sheet ? (
                  <>
                    File aktif: <b className="t-text">{sheet.fileName}</b> ({sheet.rows.length}{' '}
                    baris &middot; Sheet <b>&ldquo;{sheet.sheetName}&rdquo;</b>)
                  </>
                ) : (
                  'Template Excel sudah disesuaikan dengan data karyawan saat ini (NIK, Nama, Divisi, Siklus, Upah Pokok & Lembur, Bank, No. Rekening, Kasbon, dan Catatan).'
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
                <span>Unduh Template Karyawan</span>
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

          {/* Step 2: Sheet Switcher & Optional Column Mapping */}
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

                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold t-text">
                    <Users className="w-3.5 h-3.5 t-link" />
                    <span>{rows.length} karyawan terbaca</span>
                  </span>
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-bold"
                    style={{ color: 'var(--status-ok-text)' }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{newCount} baru</span>
                  </span>
                  {updateCount > 0 && (
                    <span
                      className="text-[11px] font-bold"
                      style={{ color: 'var(--status-info-text)' }}
                    >
                      &middot; {updateCount} update profil lama
                    </span>
                  )}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-3 border-t t-border">
                  {(
                    [
                      { key: 'nikCol', label: 'NIK / ID' },
                      { key: 'namaCol', label: 'Nama Lengkap' },
                      { key: 'divisiCol', label: 'Divisi' },
                      { key: 'siklusCol', label: 'Siklus Gaji' },
                      { key: 'satuanCol', label: 'Satuan (HR/Trip)' },
                      { key: 'upahDefaultCol', label: 'Upah Default' },
                      { key: 'upahLemburHariCol', label: 'Upah Lembur HR' },
                      { key: 'upahPerJamCol', label: 'Upah Lembur Jam' },
                      { key: 'upahPerInapCol', label: 'Upah Lembur Inap' },
                      { key: 'namaBankCol', label: 'Nama Bank' },
                      { key: 'noRekeningCol', label: 'No. Rekening' },
                      { key: 'atasNamaCol', label: 'Atas Nama Rek.' },
                      { key: 'kasbonSaldoCol', label: 'Saldo Kasbon' },
                      { key: 'catatanCol', label: 'Catatan' },
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

          {/* Step 3: Preview & Inline Edit Table */}
          {sheet && (
            <div className="t-card rounded-2xl border t-border overflow-hidden">
              <div className="px-4 py-3 border-b t-border flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="t-section-label">
                  2. Preview Data Karyawan ({selectedRows.length}/{rows.length} dipilih)
                </span>
                <span className="text-[11px] t-muted">
                  Periksa atau edit data langsung di tabel sebelum disimpan ke daftar karyawan.
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
                          onChange={(e) => toggleAll(e.target.checked)}
                          aria-label="Pilih semua karyawan"
                          className="w-3.5 h-3.5 rounded accent-[var(--accent-brand)] cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-2.5 t-th-label">NIK &amp; Nama Karyawan</th>
                      <th className="py-2.5 px-2 t-th-label">Divisi &amp; Siklus</th>
                      <th className="py-2.5 px-2 t-th-label">Upah Default (Rp)</th>
                      <th className="py-2.5 px-2 t-th-label">Rekening Bank (Finance)</th>
                      <th className="py-2.5 px-2 t-th-label">Saldo Kasbon (Rp)</th>
                      <th className="py-2.5 px-2.5 t-th-label">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y t-border">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center t-muted">
                          Tidak ada baris karyawan yang terbaca. Cek pemetaan kolom di atas.
                        </td>
                      </tr>
                    ) : (
                      rows.map((r, idx) => (
                        <tr key={r.rowKey} className="t-row-hover align-top">
                          <td className="py-2.5 px-2.5 text-center pt-3">
                            <input
                              type="checkbox"
                              checked={r.selected}
                              onChange={(e) => updateRow(idx, { selected: e.target.checked })}
                              aria-label={`Pilih ${r.nama}`}
                              className="w-3.5 h-3.5 rounded accent-[var(--accent-brand)] cursor-pointer"
                            />
                          </td>

                          {/* NIK & Nama */}
                          <td className="py-2.5 px-2.5 min-w-[190px] space-y-1">
                            <input
                              type="text"
                              value={r.nama}
                              onChange={(e) => updateRow(idx, { nama: e.target.value })}
                              placeholder="Nama lengkap"
                              className="w-full px-2 py-1 rounded-lg t-input font-bold text-xs"
                            />
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={r.nik}
                                onChange={(e) =>
                                  updateRow(idx, { nik: e.target.value.toUpperCase() })
                                }
                                placeholder="NIK"
                                className="w-20 px-2 py-0.5 rounded-md t-input font-mono-num uppercase text-[11px] font-bold"
                              />
                              <span
                                className="text-[10px] font-bold whitespace-nowrap"
                                style={{
                                  color: r.isExisting
                                    ? 'var(--status-info-text)'
                                    : 'var(--status-ok-text)',
                                }}
                              >
                                {r.isExisting ? 'Update Profil' : 'Karyawan Baru'}
                              </span>
                            </div>
                          </td>

                          {/* Divisi, Siklus & Satuan */}
                          <td className="py-2.5 px-2 min-w-[165px] space-y-1">
                            <select
                              value={r.divisi}
                              onChange={(e) => {
                                const nextDiv = e.target.value as DivisionName;
                                const nextSatuan: 'trip' | 'hari' =
                                  nextDiv === 'Supir B3'
                                    ? 'trip'
                                    : nextDiv === 'Karyawan limbah'
                                      ? 'hari'
                                      : r.satuanPokok;
                                updateRow(idx, { divisi: nextDiv, satuanPokok: nextSatuan });
                              }}
                              className="w-full text-[11px] px-2 py-1 rounded-lg t-input font-semibold"
                            >
                              {DIVISIONS.map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center gap-1">
                              <select
                                value={r.siklusGaji}
                                onChange={(e) =>
                                  updateRow(idx, { siklusGaji: e.target.value as PayrollCycle })
                                }
                                className="flex-1 text-[10px] px-1.5 py-1 rounded-md t-input font-semibold"
                              >
                                {PAYROLL_CYCLES.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                              {r.divisi === 'Supir SPD' && (
                                <select
                                  value={r.satuanPokok}
                                  onChange={(e) =>
                                    updateRow(idx, {
                                      satuanPokok: e.target.value as 'trip' | 'hari',
                                    })
                                  }
                                  className="text-[10px] px-1.5 py-1 rounded-md t-input font-semibold"
                                >
                                  <option value="trip">Trip</option>
                                  <option value="hari">HR</option>
                                </select>
                              )}
                            </div>
                          </td>

                          {/* Upah Default */}
                          <td className="py-2.5 px-2 min-w-[135px] space-y-1">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={formatNumberWithDots(r.upahDefault)}
                                onChange={(e) =>
                                  updateRow(idx, {
                                    upahDefault: cleanRupiahToNumber(
                                      formatCurrencyInput(e.target.value),
                                    ),
                                  })
                                }
                                className="w-24 text-right px-2 py-1 rounded-lg t-input font-mono-num font-bold text-[11px]"
                              />
                              <span className="text-[10px] t-muted">
                                /{r.satuanPokok === 'trip' ? 'trip' : 'hr'}
                              </span>
                            </div>
                            <div className="text-[10px] t-muted font-mono-num">
                              Jam {formatNumberWithDots(r.upahPerJamDefault)} &middot; Inap{' '}
                              {formatNumberWithDots(r.upahPerInapDefault)}
                            </div>
                          </td>

                          {/* Rekening Bank */}
                          <td className="py-2.5 px-2 min-w-[210px] space-y-1">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={r.namaBank}
                                onChange={(e) => updateRow(idx, { namaBank: e.target.value })}
                                placeholder="Bank"
                                className="w-20 px-2 py-1 rounded-lg t-input font-semibold text-[11px]"
                              />
                              <input
                                type="text"
                                value={r.noRekening}
                                onChange={(e) =>
                                  updateRow(idx, {
                                    noRekening: e.target.value.replace(/[^0-9\s-]/g, ''),
                                  })
                                }
                                placeholder="No. Rekening"
                                className="flex-1 min-w-[115px] px-2 py-1 rounded-lg t-input font-mono-num font-bold text-[11px]"
                              />
                            </div>
                            <input
                              type="text"
                              value={r.atasNamaRekening}
                              onChange={(e) =>
                                updateRow(idx, { atasNamaRekening: e.target.value })
                              }
                              placeholder="Atas nama (opsional)"
                              className="w-full px-2 py-0.5 rounded-md t-input text-[10px]"
                            />
                          </td>

                          {/* Saldo Kasbon */}
                          <td className="py-2.5 px-2 min-w-[120px]">
                            <input
                              type="text"
                              value={r.kasbonSaldo > 0 ? formatNumberWithDots(r.kasbonSaldo) : '0'}
                              onChange={(e) =>
                                updateRow(idx, {
                                  kasbonSaldo: cleanRupiahToNumber(
                                    formatCurrencyInput(e.target.value),
                                  ),
                                })
                              }
                              className="w-28 text-right px-2 py-1 rounded-lg t-input font-mono-num font-bold text-[11px]"
                            />
                          </td>

                          {/* Catatan */}
                          <td className="py-2.5 px-2.5 min-w-[140px]">
                            <input
                              type="text"
                              value={r.catatan}
                              onChange={(e) => updateRow(idx, { catatan: e.target.value })}
                              placeholder="Catatan..."
                              className="w-full px-2 py-1 rounded-lg t-input text-[11px]"
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t t-border flex flex-wrap items-center justify-between gap-3 shrink-0 t-subtle">
          <div className="text-xs t-muted">
            {selectedRows.length > 0 ? (
              <>
                Siap impor <b className="t-text font-mono-num">{selectedRows.length}</b> karyawan (
                <b style={{ color: 'var(--status-ok-text)' }}>{newCount} baru</b>
                {updateCount > 0 && (
                  <>
                    , <b style={{ color: 'var(--status-info-text)' }}>{updateCount} update</b>
                  </>
                )}
                ) &middot; Total saldo kasbon:{' '}
                <b className="t-text font-mono-num">{formatRupiah(totalKasbonPreview)}</b>
              </>
            ) : (
              'Unduh template Excel, isi data karyawan, lalu unggah file di atas.'
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl t-btn-secondary text-xs font-semibold"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={selectedRows.length === 0}
              onClick={handleCommitImport}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl t-btn-primary text-xs whitespace-nowrap disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Import &amp; Simpan ({selectedRows.length} Karyawan)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
