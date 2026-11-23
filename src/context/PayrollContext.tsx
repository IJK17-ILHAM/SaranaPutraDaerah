import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { STORAGE_KEYS } from '../config/constants';
import { SAMPLE_PAYROLL_FALLBACK } from '../data/sampleData';
import {
  deleteUserFromSPS,
  fetchPayrollFromSPS,
  fetchUsersFromSPS,
  savePayrollToSPS,
  saveUserToSPS,
} from '../services/payrollApi';
import type { AccountFormPayload, AccountRecord } from '../types/auth';
import type { PayrollFilters, PayrollRecord } from '../types/payroll';
import { isAdminRole } from '../utils/format';
import { getPeriodeDisplay, getSkemaDisplay, getStatusDisplay } from '../utils/payrollCalc';
import { useApp } from './AppContext';

export type SyncBadgeState = 'loading' | 'ok' | 'offline';

interface PayrollContextValue {
  records: PayrollRecord[];
  filteredRecords: PayrollRecord[];
  kpiRecords: PayrollRecord[];
  masterEmployees: PayrollRecord[];
  periodOptions: string[];
  divisiOptions: string[];
  filters: PayrollFilters;
  setFilter: <K extends keyof PayrollFilters>(key: K, value: PayrollFilters[K]) => void;
  syncState: SyncBadgeState;
  syncLabel: string;
  isSyncing: boolean;
  refreshPayroll: (notify?: boolean) => Promise<void>;
  submitPayroll: (payload: PayrollRecord) => Promise<boolean>;
  localDrafts: PayrollRecord[];
  saveLocalDraft: (payload: PayrollRecord) => PayrollRecord;
  saveLocalDraftsBatch: (payloads: PayrollRecord[]) => number;
  deleteLocalDraft: (localDraftId: string) => void;
  promoteDraftToSPS: (localDraftId: string) => Promise<boolean>;
  accounts: AccountRecord[];
  accountsLoading: boolean;
  refreshAccounts: () => Promise<void>;
  saveAccount: (payload: AccountFormPayload) => Promise<boolean>;
  removeAccount: (username: string) => Promise<boolean>;
}

const PayrollContext = createContext<PayrollContextValue | null>(null);

export function PayrollProvider({ children }: { children: React.ReactNode }) {
  const { user, showToast } = useApp();

  const [records, setRecords] = useState<PayrollRecord[]>(() => {
    const cached = localStorage.getItem(STORAGE_KEYS.PAYROLL_CACHE);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // ignore invalid cache
      }
    }
    return [];
  });

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
    periode: 'ALL',
    status: 'ALL',
  });

  const [syncState, setSyncState] = useState<SyncBadgeState>('ok');
  const [syncLabel, setSyncLabel] = useState('LIVE');
  const [isSyncing, setIsSyncing] = useState(false);

  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);

  const setFilter = useCallback(
    <K extends keyof PayrollFilters>(key: K, value: PayrollFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const refreshPayroll = useCallback(
    async (notify = false) => {
      setIsSyncing(true);
      setSyncState('loading');
      setSyncLabel('SYNCING...');
      try {
        const rows = await fetchPayrollFromSPS();
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
        setRecords(fallbackRows);
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
      try {
        const res = await savePayrollToSPS(payload);
        if (res && res.status === 'error') {
          throw new Error(res.message || 'Gagal menyimpan ke Google SPS');
        }
        setRecords((prev) => {
          const next = [payload, ...prev];
          localStorage.setItem(STORAGE_KEYS.PAYROLL_CACHE, JSON.stringify(next));
          return next;
        });
        setSyncState('ok');
        setSyncLabel('LIVE');
        return true;
      } catch (err) {
        if (user?.isDemo) {
          setRecords((prev) => {
            const next = [payload, ...prev];
            localStorage.setItem(STORAGE_KEYS.PAYROLL_CACHE, JSON.stringify(next));
            return next;
          });
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
    [showToast, user?.isDemo],
  );

  const persistLocalDrafts = useCallback((next: PayrollRecord[]) => {
    setLocalDrafts(next);
    localStorage.setItem(STORAGE_KEYS.PAYROLL_LOCAL_DRAFTS, JSON.stringify(next));
  }, []);

  const saveLocalDraft = useCallback(
    (payload: PayrollRecord): PayrollRecord => {
      const id =
        payload.localDraftId ||
        `DRAFT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const record: PayrollRecord = {
        ...payload,
        localDraftId: id,
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
    },
    [],
  );

  const saveLocalDraftsBatch = useCallback((payloads: PayrollRecord[]): number => {
    if (!payloads.length) return 0;
    const now = new Date().toISOString();
    const stamped = payloads.map((p, idx) => ({
      ...p,
      localDraftId:
        p.localDraftId ||
        `DRAFT-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      status: p.status || 'Draft',
      statusBayar: p.statusBayar || p.status || 'Draft',
      savedAt: now,
    }));

    setLocalDrafts((prev) => {
      // Replace existing local draft for same NIK + periode if present
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
    records.forEach((item) => {
      if (item.nama) {
        map.set((item.nik || item.nama).toString().toUpperCase(), item);
      }
    });
    return Array.from(map.values());
  }, [records]);

  const kpiRecords = useMemo(() => {
    const sk = filters.skema.toLowerCase();
    return records.filter(
      (d) =>
        (sk === 'all' || getSkemaDisplay(d).toLowerCase() === sk) &&
        (filters.periode === 'ALL' || getPeriodeDisplay(d) === filters.periode),
    );
  }, [records, filters.skema, filters.periode]);

  const filteredRecords = useMemo(() => {
    const sk = filters.skema.toLowerCase();
    const sv = filters.search.trim().toLowerCase();
    return records.filter((d) => {
      const iSkema = getSkemaDisplay(d).toLowerCase();
      const iPeriode = getPeriodeDisplay(d);
      const iStatus = getStatusDisplay(d);
      const iDivisi = (d.divisi || '').toString();
      return (
        (sk === 'all' || iSkema === sk) &&
        (filters.divisi === 'ALL' || iDivisi === filters.divisi) &&
        (filters.periode === 'ALL' || iPeriode === filters.periode) &&
        (filters.status === 'ALL' || iStatus.toLowerCase() === filters.status.toLowerCase()) &&
        (!sv ||
          (d.nama || '').toLowerCase().includes(sv) ||
          (d.nik || '').toLowerCase().includes(sv) ||
          iDivisi.toLowerCase().includes(sv) ||
          iSkema.includes(sv))
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
        periodOptions,
        divisiOptions,
        filters,
        setFilter,
        syncState,
        syncLabel,
        isSyncing,
        refreshPayroll,
        submitPayroll,
        localDrafts,
        saveLocalDraft,
        saveLocalDraftsBatch,
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
