import { Download, Edit3, FileText, Printer, Share2, StickyNote, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { KtTransaction } from '../../types/kasTonase';
import { canSharePdfFile, downloadNotaPdf, shareNotaPdf } from '../../utils/exportPdf';
import { formatDateFullID, normalizeInvoiceCode } from '../../utils/format';
import { KtNotaSheet } from '../print/SlipTemplates';

interface NotaDetailModalProps {
  transaction: KtTransaction | null;
  onClose: () => void;
  onEdit?: (trx: KtTransaction) => void;
}

export function NotaDetailModal({ transaction, onClose, onEdit }: NotaDetailModalProps) {
  const { triggerPrint, showToast } = useApp();
  const [sharing, setSharing] = useState(false);

  const supportsPdfShare = useMemo(() => canSharePdfFile(), []);

  if (!transaction) return null;

  const isJual = transaction.tipe === 'Jual';
  const internalNote = (transaction.catatan || '').trim();

  const handleDownloadPdf = () => {
    try {
      const filename = downloadNotaPdf(transaction);
      showToast(`File ${filename} berhasil diunduh.`, 'success');
    } catch {
      showToast('Gagal membuat file PDF nota.', 'error');
    }
  };

  const handleSharePdf = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const result = await shareNotaPdf(transaction);
      if (result === 'shared') {
        showToast('Nota PDF siap dibagikan.', 'success');
      } else if (result === 'unsupported') {
        const filename = downloadNotaPdf(transaction);
        showToast(
          `Browser tidak mendukung berbagi file PDF langsung. ${filename} telah diunduh.`,
          'info',
        );
      }
    } catch {
      showToast('Gagal membagikan Nota PDF. Silakan gunakan Unduh PDF.', 'error');
    } finally {
      setSharing(false);
    }
  };

  const handlePrint = () => {
    triggerPrint({ type: 'kt-nota', trx: transaction });
  };

  const handleEditClick = () => {
    if (!onEdit) return;
    const trx = transaction;
    onClose();
    onEdit(trx);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/55 backdrop-blur-xs no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl max-h-[92vh] t-card rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b t-border flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'var(--status-info-bg)',
                color: 'var(--status-info-text)',
              }}
            >
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold t-text truncate">
                {isJual ? 'Detail Invoice Jual' : 'Detail Nota Beli'} &mdash;{' '}
                <span className="font-mono-num">{normalizeInvoiceCode(transaction.nota)}</span>
              </h3>
              <p className="text-xs t-muted truncate mt-0.5">
                {transaction.customer} &bull; <span>{formatDateFullID(transaction.tanggal)}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail nota"
            className="p-2 rounded-xl t-btn-secondary shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content: Web-only Internal Note + Invoice A4 Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 t-subtle">
          {internalNote && (
            <div className="t-card rounded-xl p-4 border t-border flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  backgroundColor: 'var(--status-info-bg)',
                  color: 'var(--status-info-text)',
                }}
              >
                <StickyNote className="w-4 h-4" />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold t-text">Catatan Nota</span>
                  <span className="text-[11px] t-muted">
                    Internal &bull; Hanya tampil di web, tidak masuk ke PDF buyer
                  </span>
                </div>
                <p className="text-xs t-text whitespace-pre-wrap leading-relaxed">{internalNote}</p>
              </div>
            </div>
          )}

          {/* Invoice Preview matching A4 PDF */}
          <div className="rounded-xl overflow-hidden shadow-md border t-border bg-white">
            <KtNotaSheet trx={transaction} />
          </div>
        </div>

        {/* Modal Footer Action Bar */}
        <div className="px-5 py-3.5 border-t t-border flex flex-wrap items-center justify-between gap-2.5 shrink-0 t-card">
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={handleEditClick}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Nota</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
            >
              Tutup
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Nota</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs whitespace-nowrap ${
                supportsPdfShare ? 't-btn-secondary font-semibold' : 't-btn-primary'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh PDF</span>
            </button>

            {supportsPdfShare && (
              <button
                type="button"
                onClick={handleSharePdf}
                disabled={sharing}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl t-btn-primary text-xs whitespace-nowrap disabled:opacity-60"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{sharing ? 'Menyiapkan PDF...' : 'Bagikan Nota PDF'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
