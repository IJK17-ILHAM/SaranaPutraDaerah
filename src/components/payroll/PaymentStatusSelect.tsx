import { Building2, Check, ChevronDown, Copy, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { PAYROLL_STATUSES } from '../../config/constants';
import { useApp } from '../../context/AppContext';
import type { PayrollStatus } from '../../types/payroll';
import { canEditPaymentStatus } from '../../utils/format';
import { PayrollStatusText } from '../common/StatusBadge';

interface PaymentStatusSelectProps {
  status: string;
  employeeName: string;
  onChangeStatus: (nextStatus: PayrollStatus) => Promise<boolean>;
  align?: 'left' | 'center' | 'right';
}

function getStatusSelectClass(status: string): string {
  const s = (status || 'Draft').toLowerCase();
  if (s === 'paid') return 't-status-ok';
  if (s === 'approved') return 't-status-info';
  return 't-status-warn';
}

export function PaymentStatusSelect({
  status,
  employeeName,
  onChangeStatus,
  align = 'right',
}: PaymentStatusSelectProps) {
  const { user, showToast } = useApp();
  const [saving, setSaving] = useState(false);

  const normalized: PayrollStatus =
    status.toLowerCase() === 'paid'
      ? 'Paid'
      : status.toLowerCase() === 'approved'
        ? 'Approved'
        : 'Draft';

  if (!canEditPaymentStatus(user?.role)) {
    return <PayrollStatusText status={normalized} />;
  }

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const next = e.target.value as PayrollStatus;
    if (next === normalized || saving) return;
    setSaving(true);
    try {
      const ok = await onChangeStatus(next);
      if (ok) {
        showToast(`Status pembayaran ${employeeName} diubah ke ${next}.`, 'success');
      } else {
        showToast(`Gagal mengubah status pembayaran ${employeeName}.`, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const wrapperAlign =
    align === 'center' ? 'justify-center' : align === 'left' ? 'justify-start' : 'justify-end';

  return (
    <div
      className={`inline-flex items-center ${wrapperAlign}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative inline-flex items-center">
        <select
          value={normalized}
          disabled={saving}
          onChange={handleChange}
          aria-label={`Ubah status pembayaran ${employeeName}`}
          title="Klik untuk mengubah status pembayaran (Finance)"
          className={`appearance-none cursor-pointer pl-2.5 pr-7 py-1 rounded-lg text-[11px] font-bold transition-opacity disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[var(--accent-brand)]/40 ${getStatusSelectClass(
            normalized,
          )}`}
        >
          {PAYROLL_STATUSES.map((st) => (
            <option key={st} value={st} className="bg-[var(--surface-card)] text-[var(--text-primary)]">
              {st}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2 flex items-center opacity-80">
          {saving ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </span>
      </div>
    </div>
  );
}

interface BankAccountBadgeProps {
  namaBank?: string;
  noRekening?: string;
  atasNama?: string;
  employeeName: string;
  onEmptyAction?: () => void;
  emptyActionLabel?: string;
  compact?: boolean;
}

export function BankAccountBadge({
  namaBank,
  noRekening,
  atasNama,
  employeeName,
  onEmptyAction,
  emptyActionLabel = 'Atur',
  compact = false,
}: BankAccountBadgeProps) {
  const { showToast } = useApp();
  const [copied, setCopied] = useState(false);

  const bank = (namaBank || '').trim();
  const rek = (noRekening || '').trim();
  const an = (atasNama || '').trim();

  if (!rek) {
    return (
      <div className="inline-flex items-center gap-1.5 text-[10px] t-muted mt-0.5">
        <Building2 className="w-3 h-3 opacity-60 shrink-0" />
        <span>Rekening belum diisi</span>
        {onEmptyAction && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEmptyAction();
            }}
            className="t-link font-semibold hover:underline"
          >
            {emptyActionLabel}
          </button>
        )}
      </div>
    );
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(rek);
      setCopied(true);
      showToast(
        `No. rekening ${bank ? `${bank} ` : ''}${rek} (${employeeName}) disalin.`,
        'success',
      );
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast(`No. rekening: ${rek}`, 'info');
    }
  };

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-1.5 ${
        compact ? 'text-[10px]' : 'text-[11px]'
      } t-muted mt-0.5`}
    >
      <Building2 className="w-3 h-3 t-link shrink-0" />
      {bank && <span className="font-bold t-text">{bank}</span>}
      <span className="font-mono-num t-text font-semibold tracking-tight">{rek}</span>
      {an && an.toLowerCase() !== employeeName.trim().toLowerCase() && (
        <span className="t-muted truncate max-w-[140px]">a.n. {an}</span>
      )}
      <button
        type="button"
        onClick={handleCopy}
        title={`Salin no. rekening ${employeeName}`}
        aria-label={`Salin nomor rekening ${employeeName}`}
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md t-btn-secondary text-[10px] font-semibold leading-none"
      >
        {copied ? (
          <>
            <Check className="w-2.5 h-2.5" style={{ color: 'var(--status-ok-text)' }} />
            <span style={{ color: 'var(--status-ok-text)' }}>Disalin</span>
          </>
        ) : (
          <>
            <Copy className="w-2.5 h-2.5" />
            <span>Salin</span>
          </>
        )}
      </button>
    </div>
  );
}
