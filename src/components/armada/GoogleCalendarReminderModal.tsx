import {
  AlertCircle,
  BellRing,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Trash2,
  X,
} from 'lucide-react';
import type {
  SyncedCalendarEventSummary,
  UnitDueDateReminderItem,
} from '../../services/googleCalendarService';
import { formatDateShortID } from '../../utils/format';

interface GoogleSignInButtonProps {
  onClick: () => void;
  loading?: boolean;
  label?: string;
}

/**
 * Official Google Sign-In button styled per Google Identity branding guidelines.
 */
export function GoogleSignInButton({
  onClick,
  loading = false,
  label = 'Sign in with Google',
}: GoogleSignInButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center justify-center gap-2.5 px-3.5 py-2 rounded-xl bg-white text-[#1f1f1f] border border-[#747775]/40 hover:bg-[#f8f9fa] active:bg-[#eef1f4] shadow-xs font-medium text-xs transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-[#4285F4] shrink-0" />
      ) : (
        <svg
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 48 48"
          className="w-4 h-4 shrink-0 block"
          aria-hidden="true"
        >
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
          <path fill="none" d="M0 0h48v48H0z" />
        </svg>
      )}
      <span>{loading ? 'Menghubungkan...' : label}</span>
    </button>
  );
}

interface GoogleCalendarSyncConfirmModalProps {
  open: boolean;
  items: UnitDueDateReminderItem[];
  googleEmail?: string | null;
  submitting: boolean;
  errorMsg?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Explicit user confirmation dialog shown BEFORE creating/updating events in Google Calendar.
 */
export function GoogleCalendarSyncConfirmModal({
  open,
  items,
  googleEmail,
  submitting,
  errorMsg,
  onCancel,
  onConfirm,
}: GoogleCalendarSyncConfirmModalProps) {
  if (!open) return null;

  const updateCount = items.filter((it) => Boolean(it.existingEventId)).length;
  const createCount = items.length - updateCount;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={() => {
        if (!submitting) onCancel();
      }}
    >
      <div
        className="w-full max-w-xl max-h-[88vh] flex flex-col t-card rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b t-border flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'var(--status-info-bg)',
                color: 'var(--status-info-text)',
              }}
            >
              <BellRing className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-display font-bold t-text truncate">
                Konfirmasi Kirim Pengingat ke Google Calendar
              </h3>
              <p className="text-[11px] t-muted mt-0.5">
                {googleEmail ? `Akun Google: ${googleEmail}` : 'Kalender Utama Google Anda'}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onCancel}
            aria-label="Tutup konfirmasi Google Calendar"
            className="p-1.5 rounded-xl t-btn-secondary shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          <p className="t-text leading-relaxed">
            Anda akan{' '}
            {createCount > 0 && updateCount > 0
              ? `membuat ${createCount} pengingat baru dan memperbarui ${updateCount} pengingat`
              : updateCount > 0
                ? `memperbarui ${updateCount} pengingat`
                : `menambahkan ${createCount} pengingat baru`}{' '}
            pada <b>Google Calendar</b> Anda. Setiap acara akan disetel agar memberikan{' '}
            <b>notifikasi otomatis (pop-up &amp; email)</b> mulai dari jumlah hari sebelum jatuh
            tempo (misal H-2), H-1, hingga pagi hari jatuh tempo.
          </p>

          {errorMsg && (
            <div className="p-3 rounded-xl t-status-bad font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="border t-border rounded-xl overflow-hidden">
            <div className="px-3.5 py-2 t-subtle border-b t-border font-bold t-text flex items-center justify-between">
              <span>Daftar Acara yang Akan Dikirim ({items.length})</span>
              <span className="text-[11px] font-normal t-muted">Notifikasi Pop-up &amp; Email</span>
            </div>
            <div className="divide-y t-border max-h-64 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.key}
                  className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-bold t-text">
                      [Jatuh Tempo {item.kind === 'PAJAK' ? 'Pajak' : 'STNK'}] {item.nomorPolisi}{' '}
                      <span className="font-mono-num t-muted font-semibold">({item.kodeUnit})</span>
                    </div>
                    <div className="text-[11px] t-muted mt-0.5">
                      Jatuh tempo: <b className="font-mono-num t-text">{formatDateShortID(item.dueDate)}</b>{' '}
                      &middot; Pengingat otomatis mulai <b>H-{item.daysBefore}</b>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      item.existingEventId ? 't-status-info' : 't-status-ok'
                    }`}
                  >
                    {item.existingEventId ? 'Perbarui' : 'Baru'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t t-border">
            <button
              type="button"
              disabled={submitting}
              onClick={onCancel}
              className="px-4 py-2 rounded-xl t-btn-secondary font-semibold"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={submitting || items.length === 0}
              onClick={onConfirm}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl t-btn-primary disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>
                {submitting
                  ? 'Mengirim ke Google Calendar...'
                  : `Konfirmasi & Kirim (${items.length})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface GoogleCalendarEventsModalProps {
  open: boolean;
  googleEmail?: string | null;
  events: SyncedCalendarEventSummary[];
  loading: boolean;
  errorMsg?: string;
  deletingId: string | null;
  pendingDeleteEvent: SyncedCalendarEventSummary | null;
  onRequestDelete: (ev: SyncedCalendarEventSummary | null) => void;
  onConfirmDelete: (ev: SyncedCalendarEventSummary) => void;
  onRefresh: () => void;
  onClose: () => void;
}

/**
 * Displays STNK & Pajak reminder events currently stored on the user's Google Calendar,
 * with explicit confirmation before deleting any event.
 */
export function GoogleCalendarEventsModal({
  open,
  googleEmail,
  events,
  loading,
  errorMsg,
  deletingId,
  pendingDeleteEvent,
  onRequestDelete,
  onConfirmDelete,
  onRefresh,
  onClose,
}: GoogleCalendarEventsModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] flex flex-col t-card rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b t-border flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'var(--status-ok-bg)',
                color: 'var(--status-ok-text)',
              }}
            >
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-display font-bold t-text truncate">
                Jadwal Pengingat STNK &amp; Pajak di Google Calendar
              </h3>
              <p className="text-[11px] t-muted mt-0.5">
                {googleEmail ? `Terhubung ke ${googleEmail}` : 'Kalender Utama Google Anda'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={loading}
              onClick={onRefresh}
              className="px-3 py-1.5 rounded-xl t-btn-secondary text-xs font-semibold"
            >
              {loading ? 'Memuat...' : 'Muat Ulang'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup daftar acara Google Calendar"
              className="p-1.5 rounded-xl t-btn-secondary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto space-y-3 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl t-status-bad font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {pendingDeleteEvent && (
            <div className="p-3.5 rounded-xl t-status-bad space-y-2.5 border border-current/20">
              <div className="font-bold">
                Konfirmasi Hapus Acara dari Google Calendar
              </div>
              <p className="text-[11px]">
                Hapus pengingat <b>{pendingDeleteEvent.summary}</b> dari Google Calendar Anda?
                Notifikasi otomatis untuk acara ini akan berhenti.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={Boolean(deletingId)}
                  onClick={() => onRequestDelete(null)}
                  className="px-3 py-1.5 rounded-lg t-btn-secondary text-[11px] font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={Boolean(deletingId)}
                  onClick={() => onConfirmDelete(pendingDeleteEvent)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-bold hover:bg-red-700 disabled:opacity-60"
                >
                  {deletingId === pendingDeleteEvent.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                  <span>Ya, Hapus dari Kalender</span>
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center t-muted flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memuat acara pengingat dari Google Calendar...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center t-muted">
              Belum ada pengingat STNK / Pajak yang dikirim ke Google Calendar. Isi masa berlaku
              STNK/Pajak pada unit, lalu klik <b>Sinkronkan ke Google Calendar</b>.
            </div>
          ) : (
            <div className="divide-y t-border border t-border rounded-xl overflow-hidden">
              {events.map((ev) => {
                const datePart = ev.startDateTime ? ev.startDateTime.slice(0, 10) : '';
                const maxDayRem = ev.remindersMinutes.length
                  ? Math.round(Math.max(...ev.remindersMinutes) / 1440)
                  : 0;
                return (
                  <div
                    key={ev.id}
                    className="p-3.5 flex flex-wrap items-center justify-between gap-3 t-row-hover"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-bold t-text">{ev.summary}</div>
                      <div className="text-[11px] t-muted">
                        Jatuh tempo:{' '}
                        <b className="font-mono-num t-text">
                          {datePart ? formatDateShortID(datePart) : '-'}
                        </b>
                        {maxDayRem > 0 ? (
                          <span> &middot; Pengingat otomatis aktif mulai H-{maxDayRem}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {ev.htmlLink && (
                        <a
                          href={ev.htmlLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg t-btn-secondary text-[11px] font-semibold"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Buka</span>
                        </a>
                      )}
                      <button
                        type="button"
                        disabled={Boolean(deletingId)}
                        onClick={() => onRequestDelete(ev)}
                        title="Hapus acara dari Google Calendar"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg t-btn-secondary text-[11px] font-semibold"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
