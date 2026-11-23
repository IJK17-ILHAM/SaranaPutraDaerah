import { AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function ConfirmModal() {
  const { confirmState, closeConfirm } = useApp();

  if (!confirmState) return null;

  return (
    <div
      className="fixed inset-0 z-[65] bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="t-card rounded-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              confirmState.danger ? 't-status-bad' : 't-status-warn'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 id="confirm-modal-title" className="text-base font-bold t-text">
              {confirmState.title}
            </h3>
            <p className="text-xs t-muted leading-relaxed">{confirmState.message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t t-border">
          <button
            type="button"
            onClick={() => closeConfirm(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold t-btn-secondary whitespace-nowrap"
          >
            {confirmState.cancelLabel || 'Batal'}
          </button>
          <button
            type="button"
            onClick={() => closeConfirm(true)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
              confirmState.danger ? 't-status-bad' : 't-btn-primary'
            }`}
          >
            {confirmState.confirmLabel || 'Ya, Lanjutkan'}
          </button>
        </div>
      </div>
    </div>
  );
}
