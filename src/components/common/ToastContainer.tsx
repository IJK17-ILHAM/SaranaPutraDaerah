import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function ToastContainer() {
  const { toasts, dismissToast } = useApp();

  if (!toasts.length) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0 no-print"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const toneClass =
          toast.type === 'success'
            ? 't-status-ok'
            : toast.type === 'error'
              ? 't-status-bad'
              : toast.type === 'warning'
                ? 't-status-warn'
                : 't-status-info';

        const Icon =
          toast.type === 'success'
            ? CheckCircle2
            : toast.type === 'error' || toast.type === 'warning'
              ? AlertCircle
              : Info;

        return (
          <div
            key={toast.id}
            className={`${toneClass} rounded-xl px-4 py-3 shadow-lg flex items-start gap-2.5 text-xs font-semibold`}
          >
            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1 leading-relaxed">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Tutup notifikasi"
              className="opacity-70 hover:opacity-100 p-0.5 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
