import { Download, Printer, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { usePayroll } from '../../context/PayrollContext';
import { downloadBatchSlipsA4PDF } from '../../utils/exportPdf';
import { CompactSlip } from '../print/SlipTemplates';

export function BatchSlipModal() {
  const { batchSlipModalItems, closeBatchSlipModal, triggerPrint, showToast } = useApp();
  const { getEmployeeKasbonSaldo } = usePayroll();

  if (!batchSlipModalItems || batchSlipModalItems.length === 0) return null;

  const totalPages = Math.ceil(batchSlipModalItems.length / 4);

  const handlePrintA4 = () => {
    triggerPrint({ type: 'batch-slips', items: batchSlipModalItems });
  };

  const handleDownloadPdf = () => {
    const ok = downloadBatchSlipsA4PDF(batchSlipModalItems, getEmployeeKasbonSaldo);
    if (ok) {
      showToast(
        `PDF A4 (${batchSlipModalItems.length} slip, ${totalPages} halaman) berhasil diunduh.`,
        'success',
      );
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 no-print"
      role="dialog"
      aria-modal="true"
      aria-label="Preview Cetak Batch 4 Slip per A4"
    >
      <div className="bg-white text-black rounded-2xl shadow-2xl max-w-5xl w-full p-4 sm:p-5 max-h-[95vh] flex flex-col border border-[#E4E1D9]">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200 shrink-0">
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              Preview Cetak Batch Slip Gaji — Format A4 (4 Slip per Halaman)
            </div>
            <div className="text-[11px] text-slate-500 font-mono-num mt-0.5">
              Total {batchSlipModalItems.length} Slip &middot; {totalPages} Halaman A4 Portrait (210
              &times; 297 mm)
            </div>
          </div>
          <button
            type="button"
            onClick={closeBatchSlipModal}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Tutup preview batch"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable A4 Sheets Preview */}
        <div className="flex-1 min-h-0 overflow-auto py-4 px-2 sm:px-4 bg-slate-100 rounded-xl my-3 border border-slate-200 space-y-6">
          {Array.from({ length: totalPages }).map((_, pageIdx) => {
            const pageItems = batchSlipModalItems.slice(pageIdx * 4, pageIdx * 4 + 4);
            return (
              <div key={pageIdx} className="flex flex-col items-center gap-2">
                <div className="text-[11px] font-semibold text-slate-600 font-mono-num">
                  Halaman {pageIdx + 1} dari {totalPages} ({pageItems.length} Slip pada kertas A4)
                </div>
                <div className="overflow-x-auto max-w-full pb-1">
                  <div className="a4-preview-sheet mx-auto">
                    {pageItems.map((item, i) => (
                      <CompactSlip
                        key={`${item.nik}-${pageIdx}-${i}`}
                        item={item}
                        liveSaldoKasbon={getEmployeeKasbonSaldo(item.nik, item.nama)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 shrink-0">
          <span className="text-[11px] text-slate-500">
            Tip: Pada dialog print pilih ukuran kertas <b>A4 Portrait</b> &amp; aktifkan{' '}
            <b>Background graphics</b>, atau langsung klik <b>Unduh PDF A4</b>.
          </span>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={closeBatchSlipModal}
              className="px-4 py-2 text-xs font-semibold border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 whitespace-nowrap"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handlePrintA4}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl t-btn-secondary whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4 (4 Slip/Halaman)</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl t-btn-primary whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh PDF A4</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
