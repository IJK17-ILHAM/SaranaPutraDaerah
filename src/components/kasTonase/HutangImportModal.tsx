import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import {
  downloadHutangPiutangTemplate,
  HUTANG_TEMPLATE_META,
  type HutangImportTabKey,
} from '../../utils/hutangSpreadsheet';

export interface HutangImportExecutionResult {
  notasImported: number;
  mitrasImported: number;
  tabsFound: string[];
  skipped: number;
  warnings: string[];
}

interface HutangImportModalProps {
  open: boolean;
  defaultTab: HutangImportTabKey;
  onClose: () => void;
  onImportFile: (
    file: File,
    preferredTab: HutangImportTabKey | 'all',
  ) => Promise<HutangImportExecutionResult | null>;
}

export function HutangImportModal({
  open,
  defaultTab,
  onClose,
  onImportFile,
}: HutangImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedTab, setSelectedTab] = useState<HutangImportTabKey>(defaultTab);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<HutangImportExecutionResult | null>(null);

  if (!open) return null;

  const meta = HUTANG_TEMPLATE_META[selectedTab];

  const processFile = async (file: File) => {
    setErrorMsg('');
    setResult(null);
    setIsProcessing(true);
    try {
      const res = await onImportFile(file, selectedTab);
      if (!res) {
        setErrorMsg('Gagal membaca file. Pastikan format .xlsx, .xls, atau .csv valid.');
        return;
      }
      if (res.tabsFound.length === 0) {
        setErrorMsg(
          `Tab "${meta.sheetName}" atau header kolom yang sesuai tidak ditemukan. Unduh template terlebih dahulu agar nama kolom cocok.`,
        );
        return;
      }
      setResult(res);
    } catch {
      setErrorMsg('Gagal memproses file impor. Pastikan file tidak terkunci atau rusak.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      void processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const totalImported = result ? result.notasImported + result.mitrasImported : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="t-card rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b t-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl t-subtle border t-border flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5 t-link" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-display font-bold t-text truncate">
                Template &amp; Impor Hutang Piutang
              </h3>
              <p className="text-[11px] t-muted">
                Unduh template Excel, isi data hutang/piutang, lalu unggah kembali (.xlsx / .xls /
                .csv).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal impor"
            className="p-2 rounded-xl t-btn-secondary shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Jenis Data Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl t-subtle border t-border">
            <button
              type="button"
              onClick={() => {
                setSelectedTab('nota');
                setErrorMsg('');
                setResult(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                selectedTab === 'nota' ? 't-btn-primary' : 't-muted hover:t-text'
              }`}
            >
              Hutang &amp; Piutang Nota
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedTab('mitra');
                setErrorMsg('');
                setResult(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                selectedTab === 'mitra' ? 't-btn-primary' : 't-muted hover:t-text'
              }`}
            >
              Piutang Mitra
            </button>
          </div>

          {/* Step 1: Download Template */}
          <div className="p-4 rounded-2xl t-subtle border t-border space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold t-text">1. Unduh Template Excel</span>
              <span className="text-[11px] t-muted">Termasuk contoh &amp; tab Panduan</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => downloadHutangPiutangTemplate(selectedTab)}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl t-btn-primary text-xs font-semibold"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Template {selectedTab === 'nota' ? 'Nota' : 'Piutang Mitra'}</span>
              </button>
              <button
                type="button"
                onClick={() => downloadHutangPiutangTemplate('all')}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl t-btn-secondary text-xs font-semibold"
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span>Template Lengkap (2 Tab)</span>
              </button>
            </div>

            <div className="space-y-1.5 pt-1 text-[11px]">
              <div>
                <span className="font-bold t-text">Kolom Wajib: </span>
                <span className="t-link font-semibold">{meta.requiredCols.join(', ')}</span>
              </div>
              <div>
                <span className="font-bold t-text">Kolom Opsional: </span>
                <span className="t-muted">{meta.optionalCols.join(', ')}</span>
              </div>
              <p className="t-muted leading-relaxed pt-0.5">{meta.tip}</p>
            </div>
          </div>

          {/* Step 2: Upload & Import */}
          <div className="space-y-2">
            <div className="font-bold t-text">2. Unggah File untuk Impor Data</div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors space-y-2 ${
                isDragging ? 'border-blue-500 t-subtle' : 't-border hover:t-subtle'
              }`}
            >
              <div className="w-11 h-11 rounded-2xl t-subtle border t-border mx-auto flex items-center justify-center">
                <Upload className="w-5 h-5 t-link" />
              </div>
              <div className="font-bold t-text">
                {isProcessing
                  ? 'Sedang memproses & menyimpan data...'
                  : 'Klik untuk pilih file atau seret file ke sini'}
              </div>
              <div className="text-[11px] t-muted">
                Mendukung Excel (.xlsx, .xls) atau CSV (.csv) &middot; Bisa impor 1 tab atau
                sekaligus 2 tab
              </div>
            </div>
          </div>

          {/* Error Feedback */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl t-status-bad flex items-start gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Result Summary */}
          {result && (
            <div className="p-4 rounded-2xl t-subtle border t-border space-y-2.5">
              <div className="flex items-center gap-2 font-bold t-text">
                <CheckCircle2
                  className="w-4 h-4 shrink-0"
                  style={{ color: 'var(--status-ok-text)' }}
                />
                <span>
                  Impor selesai — {totalImported} data berhasil disimpan
                  {result.skipped > 0 ? ` (${result.skipped} baris dilewati)` : ''}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 rounded-xl t-card border t-border">
                  <div className="text-[10px] t-muted font-semibold">Hutang &amp; Piutang Nota</div>
                  <div className="text-base font-display font-bold t-text tabular-nums">
                    {result.notasImported}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl t-card border t-border">
                  <div className="text-[10px] t-muted font-semibold">Piutang Mitra</div>
                  <div className="text-base font-display font-bold t-text tabular-nums">
                    {result.mitrasImported}
                  </div>
                </div>
              </div>

              {result.warnings.length > 0 && (
                <div className="pt-1 space-y-1 text-[11px]" style={{ color: 'var(--status-warn-text)' }}>
                  <div className="font-bold">Catatan baris dilewati:</div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t t-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl t-btn-secondary text-xs font-semibold"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
