import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_PAYROLL_RATES, STORAGE_KEYS } from '../config/constants';
import { SAMPLE_PAYROLL_FALLBACK } from '../data/sampleData';
import {
  deletePayrollFromSPS,
  deleteUserFromSPS,
  fetchPayrollFromSPS,
  fetchUsersFromSPS,
  savePayrollToSPS,
  saveUserToSPS,
  updatePayrollInSPS,
} from '../services/payrollApi';
import type { AccountFormPayload, AccountRecord } from '../types/auth';
import type {
  DivisionName,
  EmployeeKasbonEntry,
  EmployeeProfile,
  PayrollCycle,
  PayrollFilters,
  PayrollRecord,
  PayrollStatus,
} from '../types/payroll';
import { cleanRupiahToNumber, formatRupiah, isAdminRole, todayISO } from '../utils/format';
import {
  calculateTHP,
  getPeriodeDisplay,
  getSiklusDisplay,
  getSkemaDisplay,
  getStatusDisplay,
} from '../utils/payrollCalc';
import { useApp } from './AppContext';

export type SyncBadgeState = 'loading' | 'ok' | 'offline';

export interface EmployeeProfileInput {
  id?: string;
  nik: string;
  nama: string;
  divisi: DivisionName | string;
  siklusGaji: PayrollCycle;
  satuanPokok?: 'trip' | 'hari';
  upahDefault?: number;
  upahLemburHariDefault?: number;
  upahPerJamDefault?: number;
  upahPerInapDefault?: number;
  namaBank?: string;
  noRekening?: string;
  atasNamaRekening?: string;
  kasbonSaldo: number;
  catatan?: string;
}

export interface KasbonAdjustmentInput {
  jenis: 'Pinjaman' | 'Cicilan';
  nominal: number;
  tanggal: string;
  keterangan?: string;
}

interface PayrollContextValue {
  records: PayrollRecord[];
  filteredRecords: PayrollRecord[];
  kpiRecords: PayrollRecord[];
  masterEmployees: PayrollRecord[];
  employeeProfiles: EmployeeProfile[];
  periodOptions: string[];
  divisiOptions: string[];
  filters: PayrollFilters;
  setFilter: <K extends keyof PayrollFilters>(key: K, value: PayrollFilters[K]) => void;
  syncState: SyncBadgeState;
  syncLabel: string;
  isSyncing: boolean;
  refreshPayroll: (notify?: boolean) => Promise<void>;
  submitPayroll: (payload: PayrollRecord) => Promise<boolean>;
  updatePayrollRecord: (target: PayrollRecord, updated: PayrollRecord) => Promise<boolean>;
  updatePayrollStatus: (target: PayrollRecord, nextStatus: PayrollStatus) => Promise<boolean>;
  deletePayrollRecord: (target: PayrollRecord) => Promise<void>;
  editingPayrollRecord: PayrollRecord | null;
  setEditingPayrollRecord: (rec: PayrollRecord | null) => void;
  saveEmployeeProfile: (input: EmployeeProfileInput) => EmployeeProfile;
  deleteEmployeeProfile: (id: string) => void;
  adjustEmployeeKasbon: (employeeId: string, entry: KasbonAdjustmentInput) => void;
  getEmployeeProfile: (nik: string, nama?: string) => EmployeeProfile | undefined;
  getEmployeeKasbonSaldo: (nik: string, nama?: string) => number;
  localDrafts: PayrollRecord[];
  saveLocalDraft: (payload: PayrollRecord) => PayrollRecord;
  saveLocalDraftsBatch: (payloads: PayrollRecord[]) => number;
  syncEmployeeRatesFromImport: (payloads: PayrollRecord[]) => void;
  upsertPayrollBatch: (
    payloads: PayrollRecord[],
  ) => Promise<{ updated: number; created: number; failed: number }>;
  deleteLocalDraft: (localDraftId: string) => void;
  promoteDraftToSPS: (localDraftId: string) => Promise<boolean>;
  accounts: AccountRecord[];
  accountsLoading: boolean;
  refreshAccounts: () => Promise<void>;
  saveAccount: (payload: AccountFormPayload) => Promise<boolean>;
  removeAccount: (username: string) => Promise<boolean>;
}

const PayrollContext = createContext<PayrollContextValue | null>(null);

function normalizeNikKey(nik?: string): string {
  const clean = (nik || '').toString().trim().toUpperCase();
  return clean ? `NIK:${clean}` : '';
}

function normalizeNameKey(nama?: string): string {
  const clean = (nama || '').toString().trim().toLowerCase();
  return clean ? `NAMA:${clean}` : '';
}

function getEmployeePrimaryKey(nik?: string, nama?: string): string {
  return normalizeNikKey(nik) || normalizeNameKey(nama);
}

function stampRecordIds(list: PayrollRecord[]): PayrollRecord[] {
  return list.map((rec, idx) => {
    if (rec.recordId) return rec;
    const nik = (rec.nik || '').toString().trim().toUpperCase();
    const periode = getPeriodeDisplay(rec);
    return {
      ...rec,
      recordId: `REC-${idx}-${nik || 'NONIK'}-${periode}-${String(rec.thp ?? '')}`,
    };
  });
}

function isSamePayrollRecord(a: PayrollRecord, b: PayrollRecord): boolean {
  if (a.recordId && b.recordId) {
    return a.recordId === b.recordId;
  }
  return (
    (a.nik || '').toString().trim().toUpperCase() ===
      (b.nik || '').toString().trim().toUpperCase() &&
    (a.nama || '').toString().trim().toLowerCase() ===
      (b.nama || '').toString().trim().toLowerCase() &&
    getPeriodeDisplay(a) === getPeriodeDisplay(b) &&
    String(a.thp ?? '') === String(b.thp ?? '')
  );
}

function makeEntryId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function PayrollProvider({ children }: { children: React.ReactNode }) {
  const { user, showToast } = useApp();

  const [records, setRecords] = useState<PayrollRecord[]>(() => {
    const cached = localStorage.getItem(STORAGE_KEYS.PAYROLL_CACHE);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return stampRecordIds(parsed);
      } catch {
        // ignore invalid cache
      }
    }
    return [];
  });

  const [employeeProfiles, setEmployeeProfiles] = useState<EmployeeProfile[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.PAYROLL_EMPLOYEES);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // ignore invalid storage
      }
    }
    return [];
  });

  const [deletedEmployeeKeys, setDeletedEmployeeKeys] = useState<string[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.PAYROLL_DELETED_EMPLOYEES);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // ignore invalid storage
      }
    }
    return [];
  });

  const [editingPayrollRecord, setEditingPayrollRecord] = useState<PayrollRecord | null>(null);

  const [localDrafts, setLocalDrafts] = useState<PayrollRecord[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.PAYROLL_LOCAL_DRAFTS);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // ignore invalid local drafts
      }
    }
    return [];
  });

  const [filters, setFilters] = useState<PayrollFilters>({
    search: '',
    skema: 'ALL',
    divisi: 'ALL',
    siklus: 'ALL',
    periode: 'ALL',
    status: 'ALL',
  });

  const [syncState, setSyncState] = useState<SyncBadgeState>('ok');
  const [syncLabel, setSyncLabel] = useState('LIVE');
  const [isSyncing, setIsSyncing] = useState(false);

  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);

  const persistEmployeeProfiles = useCallback(
    (updater: (prev: EmployeeProfile[]) => EmployeeProfile[]) => {
      setEmployeeProfiles((prev) => {
        const next = updater(prev);
        localStorage.setItem(STORAGE_KEYS.PAYROLL_EMPLOYEES, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const persistDeletedKeys = useCallback((updater: (prev: string[]) => string[]) => {
    setDeletedEmployeeKeys((prev) => {
      const next = updater(prev);
      localStorage.setItem(STORAGE_KEYS.PAYROLL_DELETED_EMPLOYEES, JSON.stringify(next));
      return next;
    });
  }, []);

  // Auto-hydrate employee profiles from SPS payroll records so existing employees appear automatically
  useEffect(() => {
    if (!records.length) return;
    setEmployeeProfiles((prev) => {
      const deletedSet = new Set(deletedEmployeeKeys);
      const existingNikKeys = new Set(prev.map((p) => normalizeNikKey(p.nik)).filter(Boolean));
      const existingNameKeys = new Set(prev.map((p) => normalizeNameKey(p.nama)).filter(Boolean));

      const additions: EmployeeProfile[] = [];
      records.forEach((rec) => {
        const cleanNama = (rec.nama || '').toString().trim();
        const cleanNik = (rec.nik || '').toString().trim().toUpperCase();
        if (!cleanNama) return;

        const nikKey = normalizeNikKey(cleanNik);
        const nameKey = normalizeNameKey(cleanNama);
        if ((nikKey && deletedSet.has(nikKey)) || (nameKey && deletedSet.has(nameKey))) {
          return;
        }
        if ((nikKey && existingNikKeys.has(nikKey)) || (!nikKey && existingNameKeys.has(nameKey))) {
          return;
        }

        const c = calculateTHP(rec);
        const profile: EmployeeProfile = {
          id: makeEntryId('EMP'),
          nik: cleanNik || '-',
          nama: cleanNama,
          divisi: c.skema,
          siklusGaji: getSiklusDisplay(rec),
          satuanPokok: c.isTrip ? 'trip' : 'hari',
          upahDefault:
            c.tarifPokok ||
            (c.isTrip ? DEFAULT_PAYROLL_RATES.upahPerTrip : DEFAULT_PAYROLL_RATES.upahPerHari),
          upahLemburHariDefault: c.upahLemburHari || DEFAULT_PAYROLL_RATES.upahLemburHari,
          upahPerJamDefault: c.upahPerJam || DEFAULT_PAYROLL_RATES.upahPerJam,
          upahPerInapDefault: c.upahPerInap || DEFAULT_PAYROLL_RATES.upahPerInap,
          namaBank: (rec.namaBank || '').toString().trim(),
          noRekening: (rec.noRekening || '').toString().trim(),
          atasNamaRekening: '',
          kasbonSaldo: 0,
          kasbonHistory: [],
          catatan: '',
          updatedAt: new Date().toISOString(),
        };
        additions.push(profile);
        if (nikKey) existingNikKeys.add(nikKey);
        if (nameKey) existingNameKeys.add(nameKey);
      });

      if (!additions.length) return prev;
      const next = [...prev, ...additions];
      localStorage.setItem(STORAGE_KEYS.PAYROLL_EMPLOYEES, JSON.stringify(next));
      return next;
    });
  }, [records, deletedEmployeeKeys]);

  const setFilter = useCallback(
    <K extends keyof PayrollFilters>(key: K, value: PayrollFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const getEmployeeProfile = useCallback(
    (nik: string, nama?: string): EmployeeProfile | undefined => {
      const nikKey = normalizeNikKey(nik);
      const nameKey = normalizeNameKey(nama);
      if (nikKey) {
        const byNik = employeeProfiles.find((p) => normalizeNikKey(p.nik) === nikKey);
        if (byNik) return byNik;
      }
      if (nameKey) {
        return employeeProfiles.find((p) => normalizeNameKey(p.nama) === nameKey);
      }
      return undefined;
    },
    [employeeProfiles],
  );

  const getEmployeeKasbonSaldo = useCallback(
    (nik: string, nama?: string): number => {
      return getEmployeeProfile(nik, nama)?.kasbonSaldo ?? 0;
    },
    [getEmployeeProfile],
  );

  const saveEmployeeProfile = useCallback(
    (input: EmployeeProfileInput): EmployeeProfile => {
      const cleanNik = input.nik.trim().toUpperCase();
      const cleanNama = input.nama.trim();
      const cleanSaldo = Math.max(0, Math.round(Number(input.kasbonSaldo) || 0));
      const nowIso = new Date().toISOString();
      const today = todayISO();

      // Remove from deleted keys in case this employee is re-added
      const keysToRestore = [normalizeNikKey(cleanNik), normalizeNameKey(cleanNama)].filter(Boolean);
      if (keysToRestore.length) {
        persistDeletedKeys((prev) => prev.filter((k) => !keysToRestore.includes(k)));
      }

      let savedResult: EmployeeProfile | null = null;

      persistEmployeeProfiles((prev) => {
        const existingIdx = input.id
          ? prev.findIndex((p) => p.id === input.id)
          : prev.findIndex(
              (p) =>
                (cleanNik && normalizeNikKey(p.nik) === normalizeNikKey(cleanNik)) ||
                normalizeNameKey(p.nama) === normalizeNameKey(cleanNama),
            );

        if (existingIdx >= 0) {
          const old = prev[existingIdx];
          const history = [...(old.kasbonHistory || [])];
          if (cleanSaldo !== old.kasbonSaldo) {
            history.unshift({
              id: makeEntryId('KBN'),
              tanggal: today,
              jenis: 'Penyesuaian',
              nominal: Math.abs(cleanSaldo - old.kasbonSaldo),
              keterangan: `Penyesuaian saldo dari ${formatRupiah(old.kasbonSaldo)} menjadi ${formatRupiah(cleanSaldo)}`,
            });
          }
          const updated: EmployeeProfile = {
            ...old,
            nik: cleanNik || old.nik,
            nama: cleanNama,
            divisi: input.divisi,
            siklusGaji: input.siklusGaji,
            satuanPokok: input.satuanPokok,
            upahDefault: input.upahDefault ?? old.upahDefault,
            upahLemburHariDefault: input.upahLemburHariDefault ?? old.upahLemburHariDefault,
            upahPerJamDefault: input.upahPerJamDefault ?? old.upahPerJamDefault,
            upahPerInapDefault: input.upahPerInapDefault ?? old.upahPerInapDefault,
            namaBank:
              input.namaBank !== undefined ? input.namaBank.trim() : (old.namaBank || ''),
            noRekening:
              input.noRekening !== undefined ? input.noRekening.trim() : (old.noRekening || ''),
            atasNamaRekening:
              input.atasNamaRekening !== undefined
                ? input.atasNamaRekening.trim()
                : (old.atasNamaRekening || ''),
            kasbonSaldo: cleanSaldo,
            kasbonHistory: history,
            catatan: (input.catatan || '').trim(),
            updatedAt: nowIso,
          };
          savedResult = updated;
          return prev.map((p, idx) => (idx === existingIdx ? updated : p));
        }

        const initialHistory: EmployeeKasbonEntry[] =
          cleanSaldo > 0
            ? [
                {
                  id: makeEntryId('KBN'),
                  tanggal: today,
                  jenis: 'Pinjaman',
                  nominal: cleanSaldo,
                  keterangan: 'Saldo awal hutang / kasbon karyawan',
                },
              ]
            : [];

        const created: EmployeeProfile = {
          id: input.id || makeEntryId('EMP'),
          nik: cleanNik || '-',
          nama: cleanNama,
          divisi: input.divisi,
          siklusGaji: input.siklusGaji,
          satuanPokok: input.satuanPokok,
          upahDefault: input.upahDefault,
          upahLemburHariDefault: input.upahLemburHariDefault,
          upahPerJamDefault: input.upahPerJamDefault,
          upahPerInapDefault: input.upahPerInapDefault,
          namaBank: (input.namaBank || '').trim(),
          noRekening: (input.noRekening || '').trim(),
          atasNamaRekening: (input.atasNamaRekening || '').trim(),
          kasbonSaldo: cleanSaldo,
          kasbonHistory: initialHistory,
          catatan: (input.catatan || '').trim(),
          updatedAt: nowIso,
        };
        savedResult = created;
        return [created, ...prev];
      });

      return (
        savedResult || {
          id: input.id || makeEntryId('EMP'),
          nik: cleanNik || '-',
          nama: cleanNama,
          divisi: input.divisi,
          siklusGaji: input.siklusGaji,
          satuanPokok: input.satuanPokok,
          upahDefault: input.upahDefault,
          namaBank: (input.namaBank || '').trim(),
          noRekening: (input.noRekening || '').trim(),
          atasNamaRekening: (input.atasNamaRekening || '').trim(),
          kasbonSaldo: cleanSaldo,
          kasbonHistory: [],
          catatan: (input.catatan || '').trim(),
          updatedAt: nowIso,
        }
      );
    },
    [persistDeletedKeys, persistEmployeeProfiles],
  );

  const deleteEmployeeProfile = useCallback(
    (id: string) => {
      const target = employeeProfiles.find((p) => p.id === id);
      if (target) {
        const keys = [normalizeNikKey(target.nik), normalizeNameKey(target.nama)].filter(Boolean);
        if (keys.length) {
          persistDeletedKeys((prev) => Array.from(new Set([...prev, ...keys])));
        }
      }
      persistEmployeeProfiles((prev) => prev.filter((p) => p.id !== id));
    },
    [employeeProfiles, persistDeletedKeys, persistEmployeeProfiles],
  );

  const adjustEmployeeKasbon = useCallback(
    (employeeId: string, entry: KasbonAdjustmentInput) => {
      const nominal = Math.max(0, Math.round(Number(entry.nominal) || 0));
      if (nominal <= 0) return;

      persistEmployeeProfiles((prev) =>
        prev.map((emp) => {
          if (emp.id !== employeeId) return emp;
          const nextSaldo =
            entry.jenis === 'Pinjaman'
              ? emp.kasbonSaldo + nominal
              : Math.max(0, emp.kasbonSaldo - nominal);

          const newLog: EmployeeKasbonEntry = {
            id: makeEntryId('KBN'),
            tanggal: entry.tanggal || todayISO(),
            jenis: entry.jenis,
            nominal,
            keterangan:
              (entry.keterangan || '').trim() ||
              (entry.jenis === 'Pinjaman' ? 'Pinjaman / kasbon baru' : 'Pembayaran cicilan kasbon'),
          };

          return {
            ...emp,
            kasbonSaldo: nextSaldo,
            kasbonHistory: [newLog, ...(emp.kasbonHistory || [])],
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [persistEmployeeProfiles],
  );

  const deductKasbonFromPayroll = useCallback(
    (payload: PayrollRecord, deltaAmount: number, isEditAdjustment = false) => {
      if (deltaAmount === 0) return;
      const nikKey = normalizeNikKey(payload.nik);
      const nameKey = normalizeNameKey(payload.nama);
      const periodeRef = getPeriodeDisplay(payload);

      persistEmployeeProfiles((prev) => {
        const idx = prev.findIndex(
          (p) =>
            (nikKey && normalizeNikKey(p.nik) === nikKey) ||
            (nameKey && normalizeNameKey(p.nama) === nameKey),
        );
        if (idx < 0) return prev;

        const target = prev[idx];
        const nextSaldo = Math.max(0, target.kasbonSaldo - deltaAmount);
        const logEntry: EmployeeKasbonEntry = {
          id: makeEntryId('KBN'),
          tanggal: todayISO(),
          jenis: isEditAdjustment ? 'Penyesuaian' : 'Potong Gaji',
          nominal: Math.abs(deltaAmount),
          periodeRef,
          keterangan: isEditAdjustment
            ? `Penyesuaian potongan gaji periode ${periodeRef}`
            : `Potongan kasbon dari gaji (${getSiklusDisplay(payload)}) periode ${periodeRef}`,
        };

        const updated: EmployeeProfile = {
          ...target,
          kasbonSaldo: nextSaldo,
          kasbonHistory: [logEntry, ...(target.kasbonHistory || [])],
          updatedAt: new Date().toISOString(),
        };
        return prev.map((p, i) => (i === idx ? updated : p));
      });
    },
    [persistEmployeeProfiles],
  );

  const refreshPayroll = useCallback(
    async (notify = false) => {
      setIsSyncing(true);
      setSyncState('loading');
      setSyncLabel('SYNCING...');
      try {
        const rows = stampRecordIds(await fetchPayrollFromSPS());
        setRecords(rows);
        localStorage.setItem(STORAGE_KEYS.PAYROLL_CACHE, JSON.stringify(rows));
        setSyncState('ok');
        setSyncLabel('LIVE');
        if (notify) {
          showToast(`Berhasil menarik ${rows.length} baris data terbaru dari Google SPS.`, 'success');
        }
      } catch {
        const cached = localStorage.getItem(STORAGE_KEYS.PAYROLL_CACHE);
        let fallbackRows: PayrollRecord[] = [];
        if (cached) {
          try {
            fallbackRows = JSON.parse(cached) || [];
          } catch {
            fallbackRows = [];
          }
        }
        if (fallbackRows.length === 0 && user?.isDemo) {
          fallbackRows = SAMPLE_PAYROLL_FALLBACK;
        }
        setRecords(stampRecordIds(fallbackRows));
        setSyncState('offline');
        setSyncLabel('CACHE');
        if (notify) {
          showToast('Gagal terhubung ke Google SPS saat ini. Menggunakan cache lokal.', 'warning');
        }
      } finally {
        setIsSyncing(false);
      }
    },
    [showToast, user?.isDemo],
  );

  const submitPayroll = useCallback(
    async (payload: PayrollRecord): Promise<boolean> => {
      setSyncState('loading');
      setSyncLabel('SAVING...');
      const stampedPayload: PayrollRecord = {
        ...payload,
        recordId: payload.recordId || makeEntryId('REC'),
        siklusGaji: getSiklusDisplay(payload),
        savedAt: new Date().toISOString(),
      };
      const kasbonPot = cleanRupiahToNumber(stampedPayload.kasbon);

      try {
        const res = await savePayrollToSPS(stampedPayload);
        if (res && res.status === 'error') {
          throw new Error(res.message || 'Gagal menyimpan ke Google SPS');
        }
        setRecords((prev) => {
          const next = [stampedPayload, ...prev];
          localStorage.setItem(STORAGE_KEYS.PAYROLL_CACHE, JSON.stringify(next));
          return next;
        });
        if (kasbonPot > 0) {
          deductKasbonFromPayroll(stampedPayload, kasbonPot, false);
        }
        setSyncState('ok');
        setSyncLabel('LIVE');
        return true;
      } catch (err) {
        if (user?.isDemo) {
          setRecords((prev) => {
            const next = [stampedPayload, ...prev];
            localStorage.setItem(STORAGE_KEYS.PAYROLL_CACHE, JSON.stringify(next));
            return next;
          });
          if (kasbonPot > 0) {
            deductKasbonFromPayroll(stampedPayload, kasbonPot, false);
          }
          setSyncState('offline');
          setSyncLabel('CACHE');
          showToast('Tersimpan di cache lokal (Mode Demo).', 'info');
          return true;
        }
        const msg = err instanceof Error ? err.message : 'Kendala koneksi';
        showToast(`Gagal mengirim data: ${msg}`, 'error');
        setSyncState('offline');
        setSyncLabel('ERROR');
        return false;
      }
    },
    [deductKasbonFromPayroll, showToast, user?.isDemo],
  );

  const updatePayrollRecord = useCallback(
    async (target: PayrollRecord, updated: PayrollRecord): Promise<boolean> => {
      const merged: PayrollRecord = {
        ...updated,
        recordId: target.recordId || updated.recordId || makeEntryId('REC'),
        siklusGaji: getSiklusDisplay(updated),
        savedAt: new Date().toISOString(),
      };

      const oldKasbon = cleanRupiahToNumber(target.kasbon);
      const newKasbon = cleanRupiahToNumber(merged.kasbon);
      const kasbonDelta = newKasbon - oldKasbon;

      setRecords((prev) => {
        const idx = prev.findIndex((r) => isSamePayrollRecord(r, target));
        const next =
          idx >= 0 ? prev.map((r, i) => (i === idx ? merged : r)) : [merged, ...prev];
        localStorage.setItem(STORAGE_KEYS.PAYROLL_CACHE, JSON.stringify(next));
        return next;
      });

      if (kasbonDelta !== 0) {
        deductKasbonFromPayroll(merged, kasbonDelta, true);
      }

      try {
        await updatePayrollInSPS(merged);
      } catch {
        // Legacy Google Apps Script may not implement updatePayroll yet; local cache already updated
      }

      return true;
    },
    [deductKasbonFromPayroll],
  );

  const updatePayrollStatus = useCallback(
    async (target: PayrollRecord, nextStatus: PayrollStatus): Promise<boolean> => {
      return updatePayrollRecord(target, {
        ...target,
        status: nextStatus,
        statusBayar: nextStatus,
      });
    },
    [updatePayrollRecord],
  );

  const deletePayrollRecord = useCallback(async (target: PayrollRecord): Promise<void> => {
    setRecords((prev) => {
      const next = prev.filter((r) => !isSamePayrollRecord(r, target));
      localStorage.setItem(STORAGE_KEYS.PAYROLL_CACHE, JSON.stringify(next));
      return next;
    });

    try {
      await deletePayrollFromSPS(target.nik || '', target.nama || '', getPeriodeDisplay(target));
    } catch {
      // Legacy Google Apps Script may not implement deletePayroll yet; local cache already updated
    }
  }, []);

  const saveLocalDraft = useCallback((payload: PayrollRecord): PayrollRecord => {
    const id =
      payload.localDraftId ||
      `DRAFT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const record: PayrollRecord = {
      ...payload,
      localDraftId: id,
      siklusGaji: getSiklusDisplay(payload),
      status: payload.status || 'Draft',
      statusBayar: payload.statusBayar || payload.status || 'Draft',
      savedAt: new Date().toISOString(),
    };
    setLocalDrafts((prev) => {
      const idx = prev.findIndex((d) => d.localDraftId === id);
      const next = idx >= 0 ? prev.map((d, i) => (i === idx ? record : d)) : [record, ...prev];
      localStorage.setItem(STORAGE_KEYS.PAYROLL_LOCAL_DRAFTS, JSON.stringify(next));
      return next;
    });
    return record;
  }, []);

  const saveLocalDraftsBatch = useCallback((payloads: PayrollRecord[]): number => {
    if (!payloads.length) return 0;
    const now = new Date().toISOString();
    const stamped = payloads.map((p, idx) => ({
      ...p,
      localDraftId:
        p.localDraftId ||
        `DRAFT-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      siklusGaji: getSiklusDisplay(p),
      status: p.status || 'Draft',
      statusBayar: p.statusBayar || p.status || 'Draft',
      savedAt: now,
    }));

    setLocalDrafts((prev) => {
      const mapKey = (r: PayrollRecord) =>
        `${(r.nik || '').trim().toUpperCase()}__${(r.periodeTanggal || r.periodeBulan || '').trim().toLowerCase()}`;
      const incomingKeys = new Set(stamped.map(mapKey));
      const kept = prev.filter((d) => !incomingKeys.has(mapKey(d)));
      const next = [...stamped, ...kept];
      localStorage.setItem(STORAGE_KEYS.PAYROLL_LOCAL_DRAFTS, JSON.stringify(next));
      return next;
    });
    return stamped.length;
  }, []);

  const syncEmployeeRatesFromImport = useCallback(
    (payloads: PayrollRecord[]) => {
      if (!payloads.length) return;
      const nowIso = new Date().toISOString();
      const restoredKeys = new Set<string>();

      payloads.forEach((p) => {
        const nk = normalizeNikKey(p.nik);
        const nm = normalizeNameKey(p.nama);
        if (nk) restoredKeys.add(nk);
        if (nm) restoredKeys.add(nm);
      });

      if (restoredKeys.size > 0) {
        persistDeletedKeys((prev) => prev.filter((k) => !restoredKeys.has(k)));
      }

      persistEmployeeProfiles((prev) => {
        const next = [...prev];
        payloads.forEach((rec) => {
          const cleanNama = (rec.nama || '').toString().trim();
          const cleanNik = (rec.nik || '').toString().trim().toUpperCase();
          if (!cleanNama) return;

          const c = calculateTHP(rec);
          const nikKey = normalizeNikKey(cleanNik);
          const nameKey = normalizeNameKey(cleanNama);
          const numericNik = cleanNik.replace(/\D/g, '')
            ? String(parseInt(cleanNik.replace(/\D/g, ''), 10))
            : '';

          const idx = next.findIndex((p) => {
            if (nikKey && normalizeNikKey(p.nik) === nikKey) return true;
            const pDigits = (p.nik || '').replace(/\D/g, '');
            const pNumeric = pDigits ? String(parseInt(pDigits, 10)) : '';
            if (numericNik && pNumeric && numericNik === pNumeric) return true;
            return Boolean(nameKey && normalizeNameKey(p.nama) === nameKey);
          });

          const nextUpahDefault =
            c.tarifPokok > 0
              ? c.tarifPokok
              : idx >= 0
                ? next[idx].upahDefault
                : c.isTrip
                  ? DEFAULT_PAYROLL_RATES.upahPerTrip
                  : DEFAULT_PAYROLL_RATES.upahPerHari;
          const nextUpahLemburHari =
            c.upahLemburHari > 0
              ? c.upahLemburHari
              : idx >= 0
                ? next[idx].upahLemburHariDefault
                : DEFAULT_PAYROLL_RATES.upahLemburHari;
          const nextUpahPerJam =
            c.upahPerJam > 0
              ? c.upahPerJam
              : idx >= 0
                ? next[idx].upahPerJamDefault
                : DEFAULT_PAYROLL_RATES.upahPerJam;
          const nextUpahPerInap =
            c.upahPerInap > 0
              ? c.upahPerInap
              : idx >= 0
                ? next[idx].upahPerInapDefault
                : DEFAULT_PAYROLL_RATES.upahPerInap;

          const incomingBank = (rec.namaBank || '').toString().trim();
          const incomingRek = (rec.noRekening || '').toString().trim();

          if (idx >= 0) {
            const old = next[idx];
            next[idx] = {
              ...old,
              nik: cleanNik || old.nik,
              nama: cleanNama || old.nama,
              divisi: c.skema,
              siklusGaji: getSiklusDisplay(rec),
              satuanPokok: c.isTrip ? 'trip' : 'hari',
              upahDefault: nextUpahDefault,
              upahLemburHariDefault: nextUpahLemburHari,
              upahPerJamDefault: nextUpahPerJam,
              upahPerInapDefault: nextUpahPerInap,
              namaBank: incomingBank || old.namaBank || '',
              noRekening: incomingRek || old.noRekening || '',
              updatedAt: nowIso,
            };
          } else {
            next.unshift({
              id: makeEntryId('EMP'),
              nik: cleanNik || '-',
              nama: cleanNama,
              divisi: c.skema,
              siklusGaji: getSiklusDisplay(rec),
              satuanPokok: c.isTrip ? 'trip' : 'hari',
              upahDefault: nextUpahDefault,
              upahLemburHariDefault: nextUpahLemburHari,
              upahPerJamDefault: nextUpahPerJam,
              upahPerInapDefault: nextUpahPerInap,
              namaBank: incomingBank,
              noRekening: incomingRek,
              atasNamaRekening: '',
              kasbonSaldo: 0,
              kasbonHistory: [],
              catatan: '',
              updatedAt: nowIso,
            });
          }
        });
        return next;
      });
    },
    [persistDeletedKeys, persistEmployeeProfiles],
  );

  const upsertPayrollBatch = useCallback(
    async (
      payloads: PayrollRecord[],
    ): Promise<{ updated: number; created: number; failed: number }> => {
      if (!payloads.length) return { updated: 0, created: 0, failed: 0 };

      // Always update per-employee master salary & overtime rates right away
      syncEmployeeRatesFromImport(payloads);

      let updated = 0;
      let created = 0;
      let failed = 0;

      const importedKeys = new Set<string>();

      for (const payload of payloads) {
        const pNik = (payload.nik || '').toString().trim().toUpperCase();
        const pDigits = pNik.replace(/\D/g, '');
        const pNum = pDigits ? String(parseInt(pDigits, 10)) : '';
        const pNama = (payload.nama || '').toString().trim().toLowerCase();
        const pPeriode = getPeriodeDisplay(payload).toLowerCase();

        importedKeys.add(`${pNik}__${pPeriode}`);

        const existingMatch = records.find((r) => {
          if (getPeriodeDisplay(r).toLowerCase() !== pPeriode) return false;
          const rNik = (r.nik || '').toString().trim().toUpperCase();
          if (pNik && rNik && rNik === pNik) return true;
          const rDigits = rNik.replace(/\D/g, '');
          const rNum = rDigits ? String(parseInt(rDigits, 10)) : '';
          if (pNum && rNum && rNum === pNum) return true;
          return Boolean(pNama && (r.nama || '').toString().trim().toLowerCase() === pNama);
        });

        if (existingMatch) {
          const ok = await updatePayrollRecord(existingMatch, payload);
          if (ok) updated++;
          else failed++;
        } else {
          const ok = await submitPayroll(payload);
          if (ok) created++;
          else failed++;
        }
      }

      // Remove matching local drafts that have now been imported directly
      setLocalDrafts((prev) => {
        const next = prev.filter((d) => {
          const key = `${(d.nik || '').trim().toUpperCase()}__${getPeriodeDisplay(d).toLowerCase()}`;
          return !importedKeys.has(key);
        });
        if (next.length !== prev.length) {
          localStorage.setItem(STORAGE_KEYS.PAYROLL_LOCAL_DRAFTS, JSON.stringify(next));
        }
        return next;
      });

      return { updated, created, failed };
    },
    [records, submitPayroll, syncEmployeeRatesFromImport, updatePayrollRecord],
  );

  const deleteLocalDraft = useCallback((localDraftId: string) => {
    setLocalDrafts((prev) => {
      const next = prev.filter((d) => d.localDraftId !== localDraftId);
      localStorage.setItem(STORAGE_KEYS.PAYROLL_LOCAL_DRAFTS, JSON.stringify(next));
      return next;
    });
  }, []);

  const promoteDraftToSPS = useCallback(
    async (localDraftId: string): Promise<boolean> => {
      const target = localDrafts.find((d) => d.localDraftId === localDraftId);
      if (!target) return false;
      const ok = await submitPayroll({ ...target, action: 'save' });
      if (ok) {
        setLocalDrafts((prev) => {
          const next = prev.filter((d) => d.localDraftId !== localDraftId);
          localStorage.setItem(STORAGE_KEYS.PAYROLL_LOCAL_DRAFTS, JSON.stringify(next));
          return next;
        });
      }
      return ok;
    },
    [localDrafts, submitPayroll],
  );

  const refreshAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      const json = await fetchUsersFromSPS();
      if (json && json.status === 'ok') {
        setAccounts(json.users || []);
      }
    } catch {
      showToast('Gagal memuat daftar akun dari Google Sheet.', 'warning');
    } finally {
      setAccountsLoading(false);
    }
  }, [showToast]);

  const saveAccount = useCallback(
    async (payload: AccountFormPayload): Promise<boolean> => {
      try {
        const json = await saveUserToSPS(payload);
        if (json && json.status === 'ok') {
          showToast(json.message || 'Akun berhasil disimpan ke Google Sheet.', 'success');
          await refreshAccounts();
          return true;
        }
        showToast((json && json.message) || 'Gagal menyimpan akun.', 'error');
        return false;
      } catch {
        showToast('Kendala koneksi saat menyimpan akun.', 'error');
        return false;
      }
    },
    [refreshAccounts, showToast],
  );

  const removeAccount = useCallback(
    async (username: string): Promise<boolean> => {
      try {
        const json = await deleteUserFromSPS(username);
        if (json && json.status === 'ok') {
          showToast(`Akun ${username} berhasil dihapus.`, 'success');
          await refreshAccounts();
          return true;
        }
        showToast((json && json.message) || 'Gagal menghapus akun.', 'error');
        return false;
      } catch {
        showToast('Kendala koneksi saat menghapus akun.', 'error');
        return false;
      }
    },
    [refreshAccounts, showToast],
  );

  useEffect(() => {
    if (user) {
      refreshPayroll(false);
      if (isAdminRole(user.role)) {
        refreshAccounts();
      }
    }
  }, [user, refreshPayroll, refreshAccounts]);

  const periodOptions = useMemo(() => {
    return [...new Set(records.map((d) => getPeriodeDisplay(d)))]
      .filter((p) => p && p !== '-')
      .sort()
      .reverse();
  }, [records]);

  const divisiOptions = useMemo(() => {
    return [...new Set(records.map((d) => (d.divisi || '').toString().trim()))]
      .filter(Boolean)
      .sort();
  }, [records]);

  const masterEmployees = useMemo(() => {
    const map = new Map<string, PayrollRecord>();
    // Seed with historical payroll records first
    records.forEach((item) => {
      if (item.nama) {
        const key = getEmployeePrimaryKey(item.nik, item.nama);
        if (key && !map.has(key)) {
          map.set(key, item);
        }
      }
    });
    // Overlay managed employeeProfiles so new/edited profiles always reflect latest divisi, siklus, and rates
    employeeProfiles.forEach((prof) => {
      const key = getEmployeePrimaryKey(prof.nik, prof.nama);
      if (!key) return;
      const existing = map.get(key);
      const isTrip =
        prof.divisi === 'Supir B3' ||
        (prof.divisi === 'Supir SPD' && (prof.satuanPokok || 'trip') === 'trip');
      map.set(key, {
        ...(existing || {}),
        nama: prof.nama,
        nik: prof.nik,
        divisi: prof.divisi,
        skema: prof.divisi,
        siklusGaji: prof.siklusGaji,
        satuanPokok: isTrip ? 'trip' : 'hari',
        upahPerHari: !isTrip
          ? prof.upahDefault || existing?.upahPerHari || DEFAULT_PAYROLL_RATES.upahPerHari
          : existing?.upahPerHari || 0,
        upahPerTrip: isTrip
          ? prof.upahDefault || existing?.upahPerTrip || DEFAULT_PAYROLL_RATES.upahPerTrip
          : existing?.upahPerTrip || 0,
        upahLemburHari:
          prof.upahLemburHariDefault ||
          existing?.upahLemburHari ||
          DEFAULT_PAYROLL_RATES.upahLemburHari,
        upahPerJam:
          prof.upahPerJamDefault || existing?.upahPerJam || DEFAULT_PAYROLL_RATES.upahPerJam,
        upahPerInap:
          prof.upahPerInapDefault || existing?.upahPerInap || DEFAULT_PAYROLL_RATES.upahPerInap,
        namaBank: prof.namaBank || existing?.namaBank || '',
        noRekening: prof.noRekening || existing?.noRekening || '',
      });
    });
    return Array.from(map.values());
  }, [records, employeeProfiles]);

  const kpiRecords = useMemo(() => {
    const sk = filters.skema.toLowerCase();
    const cyc = filters.siklus.toLowerCase();
    return records.filter(
      (d) =>
        (sk === 'all' || getSkemaDisplay(d).toLowerCase() === sk) &&
        (cyc === 'all' || getSiklusDisplay(d).toLowerCase() === cyc) &&
        (filters.periode === 'ALL' || getPeriodeDisplay(d) === filters.periode),
    );
  }, [records, filters.skema, filters.siklus, filters.periode]);

  const filteredRecords = useMemo(() => {
    const sk = filters.skema.toLowerCase();
    const cyc = filters.siklus.toLowerCase();
    const sv = filters.search.trim().toLowerCase();
    return records.filter((d) => {
      const iSkema = getSkemaDisplay(d).toLowerCase();
      const iSiklus = getSiklusDisplay(d).toLowerCase();
      const iPeriode = getPeriodeDisplay(d);
      const iStatus = getStatusDisplay(d);
      const iDivisi = (d.divisi || '').toString();
      return (
        (sk === 'all' || iSkema === sk) &&
        (cyc === 'all' || iSiklus === cyc) &&
        (filters.divisi === 'ALL' || iDivisi === filters.divisi) &&
        (filters.periode === 'ALL' || iPeriode === filters.periode) &&
        (filters.status === 'ALL' || iStatus.toLowerCase() === filters.status.toLowerCase()) &&
        (!sv ||
          (d.nama || '').toLowerCase().includes(sv) ||
          (d.nik || '').toLowerCase().includes(sv) ||
          iDivisi.toLowerCase().includes(sv) ||
          iSkema.includes(sv) ||
          iSiklus.includes(sv))
      );
    });
  }, [records, filters]);

  return (
    <PayrollContext.Provider
      value={{
        records,
        filteredRecords,
        kpiRecords,
        masterEmployees,
        employeeProfiles,
        periodOptions,
        divisiOptions,
        filters,
        setFilter,
        syncState,
        syncLabel,
        isSyncing,
        refreshPayroll,
        submitPayroll,
        updatePayrollRecord,
        updatePayrollStatus,
        deletePayrollRecord,
        editingPayrollRecord,
        setEditingPayrollRecord,
        saveEmployeeProfile,
        deleteEmployeeProfile,
        adjustEmployeeKasbon,
        getEmployeeProfile,
        getEmployeeKasbonSaldo,
        localDrafts,
        saveLocalDraft,
        saveLocalDraftsBatch,
        syncEmployeeRatesFromImport,
        upsertPayrollBatch,
        deleteLocalDraft,
        promoteDraftToSPS,
        accounts,
        accountsLoading,
        refreshAccounts,
        saveAccount,
        removeAccount,
      }}
    >
      {children}
    </PayrollContext.Provider>
  );
}

export function usePayroll(): PayrollContextValue {
  const ctx = useContext(PayrollContext);
  if (!ctx) throw new Error('usePayroll must be used inside PayrollProvider');
  return ctx;
}
