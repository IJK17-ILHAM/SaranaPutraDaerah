import { Calendar, CreditCard, History, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { PayHutangInput } from '../../context/KasTonaseContext';
import type {
  KtPaymentRecord,
  KtPaymentRecordMethod,
  KtTransaction,
} from '../../types/kasTonase';
import {
  cleanRupiahToNumber,
  formatCurrencyInput,
  formatDateShortID,
  formatNumberWithDots,
  formatRupiah,
  getTodayISO,
} from '../../utils/format';

interface PayDebtModalProps {
  transaction: KtTransaction | null;
  history: KtPaymentRecord[];
  supplierDebt: number;
  onClose: () => void;
  onConfirmPay: (input: PayHutangInput) => void;
}

export function PayDebtModal({
  transaction,
  history,
  supplierDebt,
  onClose,
  onConfirmPay,
}: PayDebtModalProps) {
  const [tanggal, setTanggal] = useState(getTodayISO);
  const [metode, setMetode] = useState<KtPaymentRecordMethod>('Transfer');
  const [amountStr, setAmountStr] = useState('');
  const [catatan, setCatatan] = useState('');

  useEffect(() => {
    if (transaction) {
      setTanggal(getTodayISO());
      setMetode(transaction.metode === 'Tunai' ? 'Tunai' : 'Transfer');
      setAmountStr(formatNumberWithDots(transaction.sisa));
      setCatatan('');
    }
  }, [transaction]);

  if (!transaction) return null;

  const isBeli = transaction.tipe === 'Beli';
  const canPotongUtang = isBeli && supplierDebt > 0;
  const isPotong = metode === 'Potong Utang Pemasok';
  const maxPayable = isPotong ? Math.min(transaction.sisa, supplierDebt) : transaction.sisa;

  const rawAmount = cleanRupiahToNumber(amountStr);
  const effectiveAmount = Math.min(rawAmount, maxPayable);
  const sisaAfter = Math.max(0, transaction.sisa - effectiveAmount);
  const sisaUtangMitraAfter = isPotong ? Math.max(0, supplierDebt - effectiveAmount) : supplierDebt;

  const handleChangeMetode = (next: KtPaymentRecordMethod) => {
    setMetode(next);
    if (next === 'Potong Utang Pemasok') {
      const cap = Math.min(transaction.sisa, supplierDebt);
      if (cleanRupiahToNumber(amountStr) > cap || cleanRupiahToNumber(amountStr) === 0) {
        setAmountStr(formatNumberWithDots(cap));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (effectiveAmount <= 0) return;
    onConfirmPay({
      trxId: transaction.id,
      tanggal: tanggal || getTodayISO(),
      nominal: effectiveAmount,
      metode,
      catatan: catatan.trim(),
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 no-print"
      role="dialog"
      aria-modal="true"
      aria-label="Form Pembayaran Nota dengan Riwayat"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="t-card rounded-2xl max-w-lg w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b t-border flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'var(--status-info-bg)',
                color: 'var(--status-info-text)',
              }}
            >
              <CreditCard className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold t-text truncate">
                Catat Pembayaran {isBeli ? 'Hutang Beli' : 'Piutang Jual'}
              </h3>
              <p className="text-xs t-muted truncate mt-0.5">
                Nota <span className="font-mono-num font-semibold t-text">{transaction.nota}</span>{' '}
                &middot; {transaction.customer} (Tgl Nota: {formatDateShortID(transaction.tanggal)})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form pembayaran"
            className="p-1.5 rounded-lg t-btn-secondary shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4">
          {/* Summary Card */}
          <div className="p-3.5 rounded-xl t-subtle border t-border space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="t-muted">Nilai Nota</span>
              <span className="font-mono-num font-semibold t-text">
                {formatRupiah(transaction.totalBayar)}
              </span>
            </div>
            {(transaction.potongUtang || 0) > 0 && (
              <div className="flex justify-between">
                <span className="t-muted">Potong Utang Pemasok (Nonkas)</span>
                <span className="font-mono-num font-semibold t-link">
                  &minus;{formatRupiah(transaction.potongUtang || 0)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="t-muted">Sudah Dibayar (Kas)</span>
              <span className="font-mono-num t-text">{formatRupiah(transaction.dibayar)}</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t t-border">
              <span className="font-bold t-text">Sisa Tagihan Saat Ini</span>
              <span
                className="font-mono-num font-bold"
                style={{ color: 'var(--status-warn-text)' }}
              >
                {formatRupiah(transaction.sisa)}
              </span>
            </div>
          </div>

          {/* Date & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block t-field-label mb-1">Tanggal Pembayaran *</label>
              <div className="relative">
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl t-input text-xs font-mono-num font-semibold"
                />
              </div>
              <p className="text-[10px] t-muted mt-1">
                Buku Kas mencatat arus uang sesuai tanggal bayar ini.
              </p>
            </div>

            <div>
              <label className="block t-field-label mb-1">Metode Pembayaran *</label>
              <select
                value={metode}
                onChange={(e) => handleChangeMetode(e.target.value as KtPaymentRecordMethod)}
                className="w-full px-3 py-2 rounded-xl t-input text-xs font-semibold"
              >
                <option value="Transfer">Transfer (Masuk Buku Kas)</option>
                <option value="Tunai">Tunai (Masuk Buku Kas)</option>
                {canPotongUtang && (
                  <option value="Potong Utang Pemasok">
                    Potong Utang Pemasok (Nonkas)
                  </option>
                )}
              </select>
              {isPotong ? (
                <p className="text-[10px] t-link font-semibold mt-1">
                  Sisa utang {transaction.customer}: {formatRupiah(supplierDebt)} (Nonkas)
                </p>
              ) : (
                <p className="text-[10px] t-muted mt-1">
                  Tercatat sebagai {isBeli ? 'Kas Keluar' : 'Kas Masuk'} pada Buku Kas.
                </p>
              )}
            </div>
          </div>

          {/* Nominal */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="t-field-label">Nominal Pembayaran (Rp) *</label>
              <button
                type="button"
                onClick={() => setAmountStr(formatNumberWithDots(maxPayable))}
                className="text-[11px] t-link font-semibold hover:underline"
              >
                {isPotong
                  ? `Maks. Potong (${formatRupiah(maxPayable)})`
                  : `Lunasi Penuh (${formatRupiah(transaction.sisa)})`}
              </button>
            </div>
            <input
              type="text"
              value={amountStr}
              onChange={(e) => setAmountStr(formatCurrencyInput(e.target.value))}
              required
              className="w-full px-3.5 py-2.5 rounded-xl t-input text-sm font-mono-num font-bold"
              placeholder="Masukkan nominal..."
            />
            {rawAmount > maxPayable && (
              <div className="text-[11px] font-semibold" style={{ color: 'var(--status-warn-text)' }}>
                Nominal melebihi batas maksimal ({formatRupiah(maxPayable)}), akan disesuaikan
                otomatis.
              </div>
            )}
            <div className="flex items-center justify-between text-[11px] t-muted">
              <span>Sisa tagihan nota setelah bayar:</span>
              <span className="font-mono-num font-bold t-text">{formatRupiah(sisaAfter)}</span>
            </div>
            {isPotong && (
              <div className="flex items-center justify-between text-[11px] t-muted">
                <span>Sisa utang pemasok setelah dipotong:</span>
                <span className="font-mono-num font-bold t-link">
                  {formatRupiah(sisaUtangMitraAfter)}
                </span>
              </div>
            )}
          </div>

          {/* Note / Reference */}
          <div>
            <label className="block t-field-label mb-1">Catatan / Referensi (opsional)</label>
            <input
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder={
                isPotong
                  ? 'cth: Potong utang lama sesuai kesepakatan'
                  : 'cth: Transfer BCA tahap 2 / Tunai di kantor'
              }
              className="w-full px-3 py-2 rounded-xl t-input text-xs"
            />
          </div>

          {/* Payment History for this Nota */}
          <div className="rounded-xl border t-border overflow-hidden">
            <div className="px-3.5 py-2 t-subtle border-b t-border flex items-center justify-between text-[11px]">
              <span className="inline-flex items-center gap-1.5 font-bold t-text">
                <History className="w-3.5 h-3.5 t-link" />
                <span>Riwayat Pembayaran Nota Ini</span>
              </span>
              <span className="t-muted font-mono-num">{history.length} catatan</span>
            </div>
            {history.length === 0 ? (
              <div className="px-3.5 py-3 text-[11px] t-muted text-center">
                Belum ada catatan pembayaran pada nota ini.
              </div>
            ) : (
              <div className="divide-y t-border max-h-40 overflow-y-auto">
                {history.map((p) => (
                  <div
                    key={p.id}
                    className="px-3.5 py-2 flex items-center justify-between gap-2 text-[11px]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 font-mono-num font-semibold t-text">
                          <Calendar className="w-3 h-3 t-muted" />
                          {formatDateShortID(p.tanggal)}
                        </span>
                        <span
                          className="font-bold"
                          style={{
                            color: p.isNonKas
                              ? 'var(--status-info-text)'
                              : 'var(--status-ok-text)',
                          }}
                        >
                          {p.metode}
                        </span>
                      </div>
                      {p.catatan && <div className="text-[10px] t-muted truncate">{p.catatan}</div>}
                    </div>
                    <span className="font-mono-num font-bold t-text shrink-0">
                      {formatRupiah(p.nominal)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t t-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold t-btn-secondary whitespace-nowrap"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={effectiveAmount <= 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs t-btn-primary whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Pembayaran</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
