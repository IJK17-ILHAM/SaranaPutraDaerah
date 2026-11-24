import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { STORAGE_KEYS, type ThemeId } from '../config/constants';
import type { AppSuite, MenuId, UserSession } from '../types/auth';
import type { KtTransaction } from '../types/kasTonase';
import type { PayrollRecord } from '../types/payroll';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export type PrintJob =
  | { type: 'single-slip'; item: PayrollRecord }
  | { type: 'batch-slips'; items: PayrollRecord[] }
  | { type: 'kt-nota'; trx: KtTransaction }
  | { type: 'kt-laporan'; transactions: KtTransaction[] }
  | null;

interface AppContextValue {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  user: UserSession | null;
  loginUser: (u: UserSession) => void;
  logoutUser: () => void;
  activeSuite: AppSuite;
  switchSuite: (s: AppSuite) => void;
  activeMenu: MenuId;
  setActiveMenu: (m: MenuId) => void;
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastType) => void;
  dismissToast: (id: string) => void;
  confirmState: (ConfirmOptions & { resolve: (val: boolean) => void }) | null;
  requestConfirm: (opts: ConfirmOptions) => Promise<boolean>;
  closeConfirm: (result: boolean) => void;
  slipModalItem: PayrollRecord | null;
  openSlipModal: (item: PayrollRecord) => void;
  closeSlipModal: () => void;
  batchSlipModalItems: PayrollRecord[] | null;
  openBatchSlipModal: (items: PayrollRecord[]) => void;
  closeBatchSlipModal: () => void;
  printJob: PrintJob;
  triggerPrint: (job: NonNullable<PrintJob>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return saved === 'eco' || saved === 'dark' || saved === 'spd' ? saved : 'spd';
  });

  const [user, setUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER);
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved) as UserSession;
      if (parsed && (parsed.username || parsed.email || parsed.nama)) return parsed;
    } catch {
      return null;
    }
    return null;
  });

  const [activeSuite, setActiveSuite] = useState<AppSuite>('payroll');
  const [activeMenu, setActiveMenu] = useState<MenuId>('menu-ringkasan');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmState, setConfirmState] = useState<
    (ConfirmOptions & { resolve: (val: boolean) => void }) | null
  >(null);
  const [slipModalItem, setSlipModalItem] = useState<PayrollRecord | null>(null);
  const [batchSlipModalItems, setBatchSlipModalItems] = useState<PayrollRecord[] | null>(null);
  const [printJob, setPrintJob] = useState<PrintJob>(null);

  const printCleanupRef = useRef<(() => void) | null>(null);
  const printTimerRef = useRef<number | null>(null);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  useEffect(() => {
    return () => {
      if (printTimerRef.current !== null) {
        window.clearTimeout(printTimerRef.current);
      }
      if (printCleanupRef.current) {
        printCleanupRef.current();
        printCleanupRef.current = null;
      }
    };
  }, []);

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const requestConfirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ ...opts, resolve });
    });
  }, []);

  const closeConfirm = useCallback(
    (result: boolean) => {
      if (confirmState) {
        confirmState.resolve(result);
        setConfirmState(null);
      }
    },
    [confirmState],
  );

  const loginUser = useCallback((u: UserSession) => {
    setUser(u);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(u));
  }, []);

  const logoutUser = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.USER);
    setActiveSuite('payroll');
    setActiveMenu('menu-ringkasan');
  }, []);

  const switchSuite = useCallback((suite: AppSuite) => {
    setActiveSuite(suite);
    setActiveMenu(suite === 'kastonase' ? 'menu-kt-dashboard' : 'menu-ringkasan');
  }, []);

  const openSlipModal = useCallback((item: PayrollRecord) => {
    setSlipModalItem(item);
  }, []);

  const closeSlipModal = useCallback(() => {
    setSlipModalItem(null);
  }, []);

  const openBatchSlipModal = useCallback((items: PayrollRecord[]) => {
    if (!items.length) return;
    setBatchSlipModalItems(items);
  }, []);

  const closeBatchSlipModal = useCallback(() => {
    setBatchSlipModalItems(null);
  }, []);

  const triggerPrint = useCallback((job: NonNullable<PrintJob>) => {
    if (printTimerRef.current !== null) {
      window.clearTimeout(printTimerRef.current);
      printTimerRef.current = null;
    }
    if (printCleanupRef.current) {
      printCleanupRef.current();
      printCleanupRef.current = null;
    }

    setPrintJob(job);

    const handleAfterPrint = () => {
      setPrintJob(null);
      window.removeEventListener('afterprint', handleAfterPrint);
      printCleanupRef.current = null;
    };

    window.addEventListener('afterprint', handleAfterPrint);
    printCleanupRef.current = () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };

    // Wait for React commit + layout paint before opening the browser Print dialog
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        printTimerRef.current = window.setTimeout(() => {
          printTimerRef.current = null;
          window.print();
        }, 120);
      });
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        theme,
        setTheme,
        user,
        loginUser,
        logoutUser,
        activeSuite,
        switchSuite,
        activeMenu,
        setActiveMenu,
        toasts,
        showToast,
        dismissToast,
        confirmState,
        requestConfirm,
        closeConfirm,
        slipModalItem,
        openSlipModal,
        closeSlipModal,
        batchSlipModalItems,
        openBatchSlipModal,
        closeBatchSlipModal,
        printJob,
        triggerPrint,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
