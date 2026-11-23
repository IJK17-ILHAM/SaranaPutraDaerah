import { Download, Printer, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { usePayroll } from '../../context/PayrollContext';
import { downloadSingleSlipPDF } from '../../utils/exportPdf';
import { SingleEnvelopeSlip } from '../print/SlipTemplates';

export function SlipModal() {
  const { slipModalItem, closeSlipModal, triggerPrint } = useApp();
  const { getEmployeeKasbonSaldo } = usePayroll();

  if (!slipModalItem) return null;

  const liveSaldoKasbon = getEmployeeKasbonSaldo(slipModalItem.nik, slipModalItem.nama);

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 no-print"
      role="dialog"
      aria-modal="true"
      aria-label="Preview Slip Gaji"
    >
      <div className="bg-white text-black rounded-2xl shadow-2xl max-w-4xl w-full p-5 sm:p-6 max-h-[95vh] overflow-y-auto border border-[#E4E1D9]">
        <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-slate-800 truncate">
              Format Tabel Slip Gaji Standar (110 &times; 220 mm)
            </span>
            <span className="hidden sm:inline text-[11px] text-slate-500 font-mono-num">
              &middot; Presisi Amplop &amp; A4
            </span>
          </div>
          <button
            type="button"
            onClick={closeSlipModal}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Tutup modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex justify-center overflow-x-auto p-3 t-subtle rounded-xl border t-border-strong">
          <SingleEnvelopeSlip item={slipModalItem} liveSaldoKasbon={liveSaldoKasbon} />
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2 border-t t-border pt-3">
          <button
            type="button"
            onClick={closeSlipModal}
            className="px-4 py-2 text-xs font-semibold border t-border-strong t-text rounded-xl hover:opacity-80 whitespace-nowrap"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={() => triggerPrint({ type: 'single-slip', item: slipModalItem })}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl t-btn-secondary whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Slip (110 &times; 220 mm)</span>
          </button>
          <button
            type="button"
            onClick={() => downloadSingleSlipPDF(slipModalItem, liveSaldoKasbon)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl t-btn-primary whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
