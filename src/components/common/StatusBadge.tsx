interface StatusBadgeProps {
  status: string;
}

export function PayrollStatusText({ status }: StatusBadgeProps) {
  const v = (status || 'Draft').toLowerCase();
  if (v === 'paid') {
    return (
      <span
        className="inline-flex items-center text-[11px] font-bold tracking-tight whitespace-nowrap"
        style={{ color: 'var(--status-info-text)' }}
      >
        Dibayar
      </span>
    );
  }
  if (v === 'approved') {
    return (
      <span
        className="inline-flex items-center text-[11px] font-bold tracking-tight whitespace-nowrap"
        style={{ color: 'var(--status-ok-text)' }}
      >
        Disetujui
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center text-[11px] font-bold tracking-tight whitespace-nowrap"
      style={{ color: 'var(--status-warn-text)' }}
    >
      Draft
    </span>
  );
}

export function TrxTypeText({ tipe }: { tipe: string }) {
  const isJual = tipe === 'Jual';
  return (
    <span
      className="text-[11px] font-bold whitespace-nowrap"
      style={{ color: isJual ? 'var(--status-ok-text)' : 'var(--status-bad-text)' }}
    >
      {isJual ? 'Jual' : 'Beli'}
    </span>
  );
}
