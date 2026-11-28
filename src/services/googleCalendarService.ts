import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import type { ArmadaUnit } from '../types/armada';

export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
] as const;

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const DEFAULT_REMINDER_DAYS = 2;
const JAKARTA_TZ = 'Asia/Jakarta';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
GOOGLE_CALENDAR_SCOPES.forEach((scope) => provider.addScope(scope));

// Strictly in-memory OAuth access token cache (never stored in localStorage/sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export function initCalendarAuth(
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void,
) {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess?.(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        onAuthFailure?.();
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure?.();
    }
  });
}

export async function signInGoogleCalendar(): Promise<{ user: User; accessToken: string }> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan akses Google Calendar. Silakan coba masuk kembali.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
}

export function getCalendarAccessToken(): string | null {
  return cachedAccessToken;
}

export function getCalendarCurrentUser(): User | null {
  return cachedAccessToken ? auth.currentUser : null;
}

export async function signOutGoogleCalendar(): Promise<void> {
  cachedAccessToken = null;
  await auth.signOut();
}

export type DueDateKind = 'PAJAK' | 'STNK';

export interface UnitDueDateReminderItem {
  key: string;
  unitId: string;
  kodeUnit: string;
  nomorPolisi: string;
  jenisKendaraan: string;
  merekModel: string;
  kind: DueDateKind;
  dueDate: string; // YYYY-MM-DD
  daysBefore: number;
  daysRemaining: number;
  existingEventId?: string;
  existingEventLink?: string;
}

export interface SyncedCalendarEventSummary {
  id: string;
  summary: string;
  description?: string;
  htmlLink?: string;
  startDateTime: string;
  unitId?: string;
  kind?: DueDateKind;
  remindersMinutes: number[];
}

export function getUnitReminderLeadDays(unit: Pick<ArmadaUnit, 'pengingatHariSebelum'>): number {
  const n = Number(unit.pengingatHariSebelum);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_REMINDER_DAYS;
  return Math.min(90, Math.round(n));
}

/**
 * Returns whole days from today (local midnight) to dueDateISO (YYYY-MM-DD).
 * Negative = overdue, 0 = due today, 2 = 2 days before due date (H-2).
 */
export function getDaysUntilDueDate(dueDateISO?: string): number | null {
  if (!dueDateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dueDateISO.trim())) return null;
  const [y, m, d] = dueDateISO.trim().split('-').map(Number);
  const dueMidnight = new Date(y, m - 1, d, 0, 0, 0, 0);
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return Math.round((dueMidnight.getTime() - todayMidnight.getTime()) / (24 * 60 * 60 * 1000));
}

export function getDueDateStatusMeta(
  dueDateISO?: string,
  leadDays = DEFAULT_REMINDER_DAYS,
): {
  level: 'none' | 'overdue' | 'urgent' | 'soon' | 'ok';
  daysRemaining: number | null;
  label: string;
} {
  const days = getDaysUntilDueDate(dueDateISO);
  if (days === null) {
    return { level: 'none', daysRemaining: null, label: 'Belum diatur' };
  }
  if (days < 0) {
    return {
      level: 'overdue',
      daysRemaining: days,
      label: `Lewat ${Math.abs(days)} hari`,
    };
  }
  if (days === 0) {
    return {
      level: 'overdue',
      daysRemaining: 0,
      label: 'Jatuh tempo HARI INI',
    };
  }
  if (days <= leadDays) {
    return {
      level: 'urgent',
      daysRemaining: days,
      label: `H-${days} (${days} hari lagi)`,
    };
  }
  if (days <= Math.max(14, leadDays + 5)) {
    return {
      level: 'soon',
      daysRemaining: days,
      label: `${days} hari lagi`,
    };
  }
  return {
    level: 'ok',
    daysRemaining: days,
    label: `${days} hari lagi`,
  };
}

/**
 * Extracts all configured STNK & Pajak due-date reminder entries from units.
 */
export function buildUnitDueDateReminders(units: ArmadaUnit[]): UnitDueDateReminderItem[] {
  const items: UnitDueDateReminderItem[] = [];

  for (const unit of units) {
    const daysBefore = getUnitReminderLeadDays(unit);
    const merekModel = [unit.merek, unit.model].filter(Boolean).join(' ');

    const stnkFallbackDate =
      unit.masaBerlakuStnk ||
      (unit.berkasList || []).find((b) => b.jenis === 'STNK' && b.berlakuSampai)?.berlakuSampai;

    if (unit.masaBerlakuPajak && /^\d{4}-\d{2}-\d{2}$/.test(unit.masaBerlakuPajak)) {
      const daysRemaining = getDaysUntilDueDate(unit.masaBerlakuPajak) ?? 0;
      items.push({
        key: `${unit.id}:PAJAK`,
        unitId: unit.id,
        kodeUnit: unit.kodeUnit,
        nomorPolisi: unit.nomorPolisi,
        jenisKendaraan: unit.jenisKendaraan,
        merekModel,
        kind: 'PAJAK',
        dueDate: unit.masaBerlakuPajak,
        daysBefore,
        daysRemaining,
        existingEventId: unit.calendarEventIdPajak,
        existingEventLink: unit.calendarEventLinkPajak,
      });
    }

    if (stnkFallbackDate && /^\d{4}-\d{2}-\d{2}$/.test(stnkFallbackDate)) {
      const daysRemaining = getDaysUntilDueDate(stnkFallbackDate) ?? 0;
      items.push({
        key: `${unit.id}:STNK`,
        unitId: unit.id,
        kodeUnit: unit.kodeUnit,
        nomorPolisi: unit.nomorPolisi,
        jenisKendaraan: unit.jenisKendaraan,
        merekModel,
        kind: 'STNK',
        dueDate: stnkFallbackDate,
        daysBefore,
        daysRemaining,
        existingEventId: unit.calendarEventIdStnk,
        existingEventLink: unit.calendarEventLinkStnk,
      });
    }
  }

  return items.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

function buildReminderOverrides(daysBefore: number): Array<{ method: 'popup' | 'email'; minutes: number }> {
  const primaryMinutes = Math.max(1, daysBefore) * 24 * 60;
  const overrides: Array<{ method: 'popup' | 'email'; minutes: number }> = [
    { method: 'popup', minutes: primaryMinutes },
    { method: 'email', minutes: primaryMinutes },
  ];

  // Add H-1 reminder if primary is > 1 day before
  if (daysBefore > 1) {
    overrides.push({ method: 'popup', minutes: 24 * 60 });
  }
  // Morning-of reminder (1 hour before 08:00 WIB = 07:00 WIB)
  overrides.push({ method: 'popup', minutes: 60 });

  return overrides;
}

function buildGoogleCalendarEventPayload(item: UnitDueDateReminderItem) {
  const labelJenis = item.kind === 'PAJAK' ? 'Pajak Tahunan Kendaraan' : 'Masa Berlaku STNK (5 Tahunan)';
  const shortJenis = item.kind === 'PAJAK' ? 'Pajak' : 'STNK';

  return {
    summary: `[Jatuh Tempo ${shortJenis}] ${item.nomorPolisi} (${item.kodeUnit})`,
    description: [
      `Pengingat Otomatis ${labelJenis} — PT. Sarana Putra Daerah`,
      `Kode Unit: ${item.kodeUnit}`,
      `Nomor Polisi: ${item.nomorPolisi}`,
      `Kendaraan: ${item.jenisKendaraan}${item.merekModel ? ` (${item.merekModel})` : ''}`,
      `Tanggal Jatuh Tempo: ${item.dueDate}`,
      `Notifikasi Otomatis: Mulai H-${item.daysBefore} (${item.daysBefore} hari sebelum jatuh tempo), H-1, dan pagi hari jatuh tempo.`,
    ].join('\n'),
    start: {
      dateTime: `${item.dueDate}T08:00:00+07:00`,
      timeZone: JAKARTA_TZ,
    },
    end: {
      dateTime: `${item.dueDate}T09:00:00+07:00`,
      timeZone: JAKARTA_TZ,
    },
    colorId: '11',
    reminders: {
      useDefault: false,
      overrides: buildReminderOverrides(item.daysBefore),
    },
    extendedProperties: {
      private: {
        spdArmadaReminder: 'true',
        unitId: item.unitId,
        jenis: item.kind,
      },
    },
  };
}

async function parseGoogleApiError(res: Response): Promise<string> {
  if (res.status === 401) {
    cachedAccessToken = null;
    return 'Sesi Google Calendar berakhir. Silakan masuk kembali dengan Google.';
  }
  const payload = (await res.json().catch(() => null)) as
    | { error?: { message?: string } }
    | null;
  return payload?.error?.message || `Google Calendar API error (${res.status})`;
}

/**
 * Creates or updates a Google Calendar reminder event for a unit's STNK or Pajak due date.
 * Must only be called AFTER explicit user confirmation!
 */
export async function upsertUnitDueDateCalendarEvent(
  accessToken: string,
  item: UnitDueDateReminderItem,
): Promise<{ eventId: string; htmlLink: string }> {
  const body = buildGoogleCalendarEventPayload(item);

  // If we already have an eventId, try updating it first
  if (item.existingEventId) {
    const patchRes = await fetch(
      `${CALENDAR_API_BASE}/${encodeURIComponent(item.existingEventId)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    if (patchRes.ok) {
      const updated = (await patchRes.json()) as { id: string; htmlLink?: string };
      return {
        eventId: updated.id,
        htmlLink: updated.htmlLink || item.existingEventLink || '',
      };
    }

    // If the event was manually deleted in Google Calendar (404/410), fall through to create a fresh event
    if (patchRes.status !== 404 && patchRes.status !== 410) {
      throw new Error(await parseGoogleApiError(patchRes));
    }
  }

  const createRes = await fetch(CALENDAR_API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!createRes.ok) {
    throw new Error(await parseGoogleApiError(createRes));
  }

  const created = (await createRes.json()) as { id: string; htmlLink?: string };
  return {
    eventId: created.id,
    htmlLink: created.htmlLink || '',
  };
}

/**
 * Deletes an existing Google Calendar reminder event.
 * Must only be called AFTER explicit user confirmation!
 */
export async function deleteUnitDueDateCalendarEvent(
  accessToken: string,
  eventId: string,
): Promise<void> {
  const res = await fetch(`${CALENDAR_API_BASE}/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(await parseGoogleApiError(res));
  }
}

/**
 * Lists STNK & Pajak reminder events created by SPD Armada on the user's primary Google Calendar.
 */
export async function listUnitDueDateCalendarEvents(
  accessToken: string,
): Promise<SyncedCalendarEventSummary[]> {
  const params = new URLSearchParams({
    privateExtendedProperty: 'spdArmadaReminder=true',
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  });

  const res = await fetch(`${CALENDAR_API_BASE}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res));
  }

  const data = (await res.json()) as {
    items?: Array<{
      id: string;
      summary?: string;
      description?: string;
      htmlLink?: string;
      start?: { dateTime?: string; date?: string };
      extendedProperties?: { private?: Record<string, string> };
      reminders?: { overrides?: Array<{ method?: string; minutes?: number }> };
    }>;
  };

  return (data.items || []).map((ev) => ({
    id: ev.id,
    summary: ev.summary || '(Tanpa Judul)',
    description: ev.description,
    htmlLink: ev.htmlLink,
    startDateTime: ev.start?.dateTime || ev.start?.date || '',
    unitId: ev.extendedProperties?.private?.unitId,
    kind:
      ev.extendedProperties?.private?.jenis === 'STNK'
        ? 'STNK'
        : ev.extendedProperties?.private?.jenis === 'PAJAK'
          ? 'PAJAK'
          : undefined,
    remindersMinutes: (ev.reminders?.overrides || [])
      .map((r) => Number(r.minutes))
      .filter((m) => Number.isFinite(m) && m > 0),
  }));
}
