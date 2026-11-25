import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  Info,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Palette,
  Search,
  ShieldAlert,
  ShieldCheck,
  Truck,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { SPD_NAVY_GRADIENT, SpdLogoWordmark } from '../../components/common/SpdLogo';
import { STORAGE_KEYS, type ThemeId } from '../../config/constants';
import { loadStoredArmadaUnits, saveStoredArmadaUnits } from '../../data/armadaSeed';
import type {
  ArmadaMenuId,
  ArmadaOperationalStatus,
  ArmadaUnit,
  ArmadaUnitInput,
} from '../../types/armada';
import type { UserSession } from '../../types/auth';
import {
  clearStoredUserSession,
  getPortalBaseUrlFromArmada,
  getPortalLoginUrlFromArmada,
  isActiveSuperAdminSession,
  readStoredUserSession,
} from '../../utils/portalAuth';
import { UnitArmadaPage } from './UnitArmadaPage';

const THEME_ORDER: ThemeId[] = ['spd', 'eco', 'dark'];
const THEME_LABELS: Record<ThemeId, string> = {
  spd: 'Soft UI',
  eco: 'Hijau',
  dark: 'Gelap',
};

export function ArmadaDashboardPage() {
  const [theme, setTheme] = useState<ThemeId>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return saved === 'eco' || saved === 'dark' || saved === 'spd' ? saved : 'spd';
  });

  const [session, setSession] = useState<UserSession | null>(() => readStoredUserSession());
  const [activeMenu, setActiveMenu] = useState<ArmadaMenuId>('armada-dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [units, setUnits] = useState<ArmadaUnit[]>(() => loadStoredArmadaUnits());
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Dashboard filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ArmadaOperationalStatus>('ALL');

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  // Redirect unauthenticated visitors directly to Portal SPD login with safe return flag
  useEffect(() => {
    if (!session) {
      window.location.replace(getPortalLoginUrlFromArmada());
    }
  }, [session]);

  // Sync logout/login/units/theme events across tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.USER) {
        setSession(readStoredUserSession());
      }
      if (e.key === STORAGE_KEYS.THEME) {
        const next = localStorage.getItem(STORAGE_KEYS.THEME);
        if (next === 'eco' || next === 'dark' || next === 'spd') {
          setTheme(next);
        }
      }
      if (e.key === STORAGE_KEYS.ARMADA_UNITS) {
        setUnits(loadStoredArmadaUnits());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const notify = (message: string) => {
    setToastMsg(message);
    window.setTimeout(() => {
      setToastMsg((curr) => (curr === message ? null : curr));
    }, 3600);
  };

  const handleSaveUnit = (input: ArmadaUnitInput): ArmadaUnit => {
    const now = new Date().toISOString();
    let savedUnit: ArmadaUnit | null = null;

    setUnits((prev) => {
      let next: ArmadaUnit[];
      if (input.id) {
        next = prev.map((u) => {
          if (u.id !== input.id) return u;
          const updated: ArmadaUnit = {
            ...u,
            kodeUnit: input.kodeUnit,
            nomorPolisi: input.nomorPolisi,
            jenisKendaraan: input.jenisKendaraan,
            merek: input.merek,
            model: input.model,
            tahun: input.tahun,
            nomorRangka: input.nomorRangka,
            nomorMesin: input.nomorMesin,
            status: input.status,
            statusOperasional:
              input.status === 'Nonaktif'
                ? 'Servis'
                : u.statusOperasional === 'Servis'
                  ? 'Stand-by'
                  : u.statusOperasional || 'Stand-by',
            catatan: input.catatan || '',
            updatedAt: now,
          };
          savedUnit = updated;
          return updated;
        });
      } else {
        const created: ArmadaUnit = {
          id: `UNIT-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
          kodeUnit: input.kodeUnit,
          nomorPolisi: input.nomorPolisi,
          jenisKendaraan: input.jenisKendaraan,
          merek: input.merek,
          model: input.model,
          tahun: input.tahun,
          nomorRangka: input.nomorRangka,
          nomorMesin: input.nomorMesin,
          status: input.status,
          divisi: input.jenisKendaraan.toLowerCase().includes('b3') ? 'Supir B3' : 'Supir SPD',
          supirUtama: '-',
          lokasiTerakhir: 'Pool Utama PT. SPD',
          ruteAktif: input.status === 'Aktif' ? 'Unit terdaftar, siap dijadwalkan' : 'Unit nonaktif',
          statusOperasional: input.status === 'Aktif' ? 'Stand-by' : 'Servis',
          muatanTon: 0,
          updateTerakhir: 'Baru ditambahkan',
          catatan: input.catatan || '',
          createdAt: now,
          updatedAt: now,
        };
        savedUnit = created;
        next = [created, ...prev];
      }
      saveStoredArmadaUnits(next);
      return next;
    });

    notify(
      input.id
        ? `Perubahan unit ${input.kodeUnit} (${input.nomorPolisi}) disimpan.`
        : `Unit baru ${input.kodeUnit} (${input.nomorPolisi}) berhasil ditambahkan.`,
    );

    return (
      savedUnit || {
        id: input.id || `UNIT-${Date.now()}`,
        kodeUnit: input.kodeUnit,
        nomorPolisi: input.nomorPolisi,
        jenisKendaraan: input.jenisKendaraan,
        merek: input.merek,
        model: input.model,
        tahun: input.tahun,
        nomorRangka: input.nomorRangka,
        nomorMesin: input.nomorMesin,
        status: input.status,
        catatan: input.catatan || '',
        createdAt: now,
        updatedAt: now,
      }
    );
  };

  const handleToggleStatus = (unit: ArmadaUnit) => {
    const nextStatus = unit.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    const now = new Date().toISOString();
    setUnits((prev) => {
      const next = prev.map((u) =>
        u.id === unit.id
          ? {
              ...u,
              status: nextStatus as 'Aktif' | 'Nonaktif',
              statusOperasional: (nextStatus === 'Nonaktif' ? 'Servis' : 'Stand-by') as ArmadaOperationalStatus,
              updatedAt: now,
            }
          : u,
      );
      saveStoredArmadaUnits(next);
      return next;
    });
    notify(`Status unit ${unit.kodeUnit} diubah menjadi ${nextStatus}.`);
  };

  const stats = useMemo(() => {
    const total = units.length;
    const aktif = units.filter((u) => u.status === 'Aktif').length;
    const beroperasi = units.filter((u) => u.status === 'Aktif' && u.statusOperasional === 'Beroperasi').length;
    const standby = units.filter((u) => u.status === 'Aktif' && u.statusOperasional !== 'Beroperasi').length;
    const nonaktifServis = units.filter((u) => u.status === 'Nonaktif' || u.statusOperasional === 'Servis').length;
    const totalMuatan = units.reduce((sum, u) => sum + (Number(u.muatanTon) || 0), 0);
    return { total, aktif, beroperasi, standby, nonaktifServis, totalMuatan };
  }, [units]);

  const filteredDashboardUnits = useMemo(() => {
    const q = search.trim().toLowerCase();
    return units.filter((u) => {
      const opStatus: ArmadaOperationalStatus =
        u.status === 'Nonaktif' ? 'Servis' : u.statusOperasional || 'Stand-by';
      if (statusFilter !== 'ALL' && opStatus !== statusFilter) return false;
      if (
        q &&
        !u.kodeUnit.toLowerCase().includes(q) &&
        !u.nomorPolisi.toLowerCase().includes(q) &&
        !u.jenisKendaraan.toLowerCase().includes(q) &&
        !u.merek.toLowerCase().includes(q) &&
        !u.model.toLowerCase().includes(q) &&
        !(u.supirUtama || '').toLowerCase().includes(q) &&
        !(u.lokasiTerakhir || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [search, statusFilter, units]);

  const handleCycleTheme = () => {
    const idx = THEME_ORDER.indexOf(theme);
    setTheme(THEME_ORDER[(idx + 1) % THEME_ORDER.length]);
  };

  const handleLogoutAndSwitch = () => {
    clearStoredUserSession();
    window.location.replace(getPortalLoginUrlFromArmada());
  };

  const handleBackToPortal = () => {
    window.location.href = getPortalBaseUrlFromArmada();
  };

  const openMenu = (menu: ArmadaMenuId, unitId: string | null = null) => {
    setActiveMenu(menu);
    setSelectedUnitId(unitId);
    setMobileMenuOpen(false);
  };

  // State 1: Not logged in — redirecting to Portal SPD login
  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="t-card rounded-2xl p-6 max-w-md w-full text-center space-y-3 shadow-lg">
          <div
            className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center border border-white/15"
            style={{ background: SPD_NAVY_GRADIENT }}
          >
            <Truck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-base font-display t-text">
            Sistem Operasional dan Pemantauan Armada
          </h1>
          <p className="text-xs t-muted leading-relaxed">
            Sesi login belum aktif. Mengarahkan ke halaman masuk Portal SPD...
          </p>
          <a
            href={getPortalLoginUrlFromArmada()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl t-btn-primary text-xs"
          >
            <span>Buka Halaman Masuk</span>
          </a>
        </div>
      </main>
    );
  }

  // State 2: Logged in, but NOT Super Admin
  if (!isActiveSuperAdminSession(session)) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="t-card rounded-2xl p-7 max-w-lg w-full space-y-5 shadow-xl">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl t-status-warn flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-display t-text">Akses Terbatas — Khusus Super Admin</h1>
              <p className="text-xs t-muted mt-1 leading-relaxed">
                Halaman <b>Sistem Operasional dan Pemantauan Armada</b> hanya dapat diakses oleh
                akun dengan role <b>Super Admin</b>.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl t-subtle border t-border text-xs space-y-1">
            <div className="flex justify-between">
              <span className="t-muted">Akun aktif saat ini:</span>
              <span className="font-bold t-text">
                {session.nama || session.username || session.email}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="t-muted">Role:</span>
              <span className="font-bold t-text">{session.role || '-'}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t t-border">
            <button
              type="button"
              onClick={handleBackToPortal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl t-btn-secondary text-xs font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Portal SPD</span>
            </button>
            <button
              type="button"
              onClick={handleLogoutAndSwitch}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl t-btn-primary text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Ganti Akun Super Admin</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  // State 3: Active Super Admin Session — Armada Application Shell
  const userName = session.nama || session.username || session.email || 'Super Admin';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:sticky lg:top-0 lg:h-screen shrink-0 p-4 pr-0">
        <div className="t-sidebar rounded-3xl flex-1 flex flex-col justify-between p-4 shadow-xl overflow-y-auto">
          <div className="space-y-5">
            {/* Brand */}
            <div
              className="p-3.5 rounded-2xl border border-white/15 flex items-center justify-between gap-2"
              style={{ background: SPD_NAVY_GRADIENT }}
            >
              <SpdLogoWordmark variant="on-dark" size="md" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/85 px-2 py-0.5 rounded-md bg-white/10">
                Armada
              </span>
            </div>

            {/* Navigation */}
            <nav className="space-y-4" aria-label="Navigasi Armada">
              <div className="space-y-1">
                <div
                  className="px-2.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: 'var(--text-sidebar-muted)' }}
                >
                  Operasional
                </div>
                <button
                  type="button"
                  onClick={() => openMenu('armada-dashboard')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    activeMenu === 'armada-dashboard' ? 'font-bold shadow-xs' : 't-sidebar-btn'
                  }`}
                  style={
                    activeMenu === 'armada-dashboard'
                      ? { backgroundColor: 'var(--btn-gold)', color: 'var(--btn-gold-text)' }
                      : undefined
                  }
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span>Dashboard Armada</span>
                </button>
              </div>

              {/* Master Data Group */}
              <div className="space-y-1">
                <div
                  className="px-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: 'var(--text-sidebar-muted)' }}
                >
                  <Database className="w-3 h-3" />
                  <span>Master Data</span>
                </div>
                <button
                  type="button"
                  onClick={() => openMenu('armada-master-unit')}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    activeMenu === 'armada-master-unit' ? 'font-bold shadow-xs' : 't-sidebar-btn'
                  }`}
                  style={
                    activeMenu === 'armada-master-unit'
                      ? { backgroundColor: 'var(--btn-gold)', color: 'var(--btn-gold-text)' }
                      : undefined
                  }
                >
                  <span className="inline-flex items-center gap-2.5 truncate">
                    <Truck className="w-4 h-4 shrink-0" />
                    <span>Unit Armada</span>
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono-num font-bold ${
                      activeMenu === 'armada-master-unit'
                        ? 'bg-black/15'
                        : 'bg-white/10 text-white/85'
                    }`}
                  >
                    {units.length}
                  </span>
                </button>
              </div>
            </nav>
          </div>

          {/* Bottom User & Utilities */}
          <div className="pt-4 border-t border-white/10 space-y-2.5">
            <div className="px-2 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <div className="text-xs font-bold text-white truncate">{userName}</div>
              <div className="inline-flex items-center gap-1 text-[10px] font-semibold mt-0.5" style={{ color: 'var(--accent-highlight)' }}>
                <ShieldCheck className="w-3 h-3" />
                <span>{session.role}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={handleCycleTheme}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-white"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>{THEME_LABELS[theme]}</span>
              </button>
              <button
                type="button"
                onClick={handleBackToPortal}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-white"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Portal SPD</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleLogoutAndSwitch}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white/85"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="lg:hidden m-3 mb-0 t-sidebar rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="px-2.5 py-1.5 rounded-xl border border-white/15 shrink-0"
            style={{ background: SPD_NAVY_GRADIENT }}
          >
            <SpdLogoWordmark variant="on-dark" size="xs" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">Sistem Armada</div>
            <div className="text-[10px] truncate" style={{ color: 'var(--text-sidebar-muted)' }}>
              {activeMenu === 'armada-master-unit' ? 'Master Data → Unit Armada' : 'Dashboard'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="p-2 rounded-xl bg-white/10 text-white"
          aria-label="Buka navigasi Armada"
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden mx-3 mt-2 t-sidebar rounded-2xl p-3 space-y-2.5 shadow-lg">
          <button
            type="button"
            onClick={() => openMenu('armada-dashboard')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
              activeMenu === 'armada-dashboard' ? 'font-bold' : 't-sidebar-btn'
            }`}
            style={
              activeMenu === 'armada-dashboard'
                ? { backgroundColor: 'var(--btn-gold)', color: 'var(--btn-gold-text)' }
                : undefined
            }
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard Armada</span>
          </button>
          <div className="pt-1 border-t border-white/10 space-y-1">
            <div
              className="px-2 text-[10px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--text-sidebar-muted)' }}
            >
              Master Data
            </div>
            <button
              type="button"
              onClick={() => openMenu('armada-master-unit')}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
                activeMenu === 'armada-master-unit' ? 'font-bold' : 't-sidebar-btn'
              }`}
              style={
                activeMenu === 'armada-master-unit'
                  ? { backgroundColor: 'var(--btn-gold)', color: 'var(--btn-gold-text)' }
                  : undefined
              }
            >
              <span className="inline-flex items-center gap-2">
                <Truck className="w-4 h-4" />
                <span>Unit Armada</span>
              </span>
              <span className="text-[10px] font-mono-num font-bold">{units.length}</span>
            </button>
          </div>
          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCycleTheme}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 text-xs text-white font-semibold"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>{THEME_LABELS[theme]}</span>
              </button>
              <button
                type="button"
                onClick={handleBackToPortal}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 text-xs text-white font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Portal SPD</span>
              </button>
            </div>
            <button
              type="button"
              onClick={handleLogoutAndSwitch}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 text-xs text-white/85"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-5 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-5">
          {/* App Top Title Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b t-border">
            <div>
              <h1 className="text-base sm:text-lg font-display t-text">
                Sistem Operasional dan Pemantauan Armada
              </h1>
              <p className="text-[11px] t-muted">PT. Sarana Putra Daerah &middot; Akses Super Admin</p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => openMenu('armada-dashboard')}
                className={`px-3 py-1.5 rounded-xl transition-colors ${
                  activeMenu === 'armada-dashboard' ? 't-btn-primary' : 't-btn-secondary'
                }`}
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => openMenu('armada-master-unit')}
                className={`px-3 py-1.5 rounded-xl transition-colors ${
                  activeMenu === 'armada-master-unit' ? 't-btn-primary' : 't-btn-secondary'
                }`}
              >
                Master Data &rarr; Unit Armada
              </button>
            </div>
          </div>

          {activeMenu === 'armada-master-unit' ? (
            <UnitArmadaPage
              units={units}
              selectedUnitId={selectedUnitId}
              onSelectUnit={setSelectedUnitId}
              onSaveUnit={handleSaveUnit}
              onToggleStatus={handleToggleStatus}
            />
          ) : (
            <section className="space-y-5">
              {/* Uji Coba / Session Notice Banner */}
              <div className="p-3.5 rounded-xl t-status-info text-xs flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-start sm:items-center gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
                  <span>
                    <b>Mode Uji Coba Awal (Data Dummy):</b> Data tersinkron langsung dengan{' '}
                    <b>Master Data &rarr; Unit Armada</b> di browser ini.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openMenu('armada-master-unit')}
                  className="inline-flex items-center gap-1 font-bold underline whitespace-nowrap"
                >
                  <span>Kelola Unit Armada</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 4 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="t-card-accent p-5 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: 'var(--card-accent-muted)' }}>
                      Total Unit Armada
                    </span>
                    <Truck className="w-5 h-5 text-white/85" />
                  </div>
                  <div className="text-2xl font-display text-white mt-2 tabular-nums">
                    {stats.total} Unit
                  </div>
                  <div className="text-[11px] text-white/75 mt-2">
                    {stats.aktif} Aktif &middot; {stats.total - stats.aktif} Nonaktif
                  </div>
                </div>

                <div className="t-card p-5 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="t-field-label">Sedang Beroperasi</span>
                    <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--status-ok-text)' }} />
                  </div>
                  <div
                    className="text-2xl font-display mt-2 tabular-nums"
                    style={{ color: 'var(--status-ok-text)' }}
                  >
                    {stats.beroperasi} Unit
                  </div>
                  <div className="text-[11px] t-muted mt-2 font-mono-num">
                    Total muatan aktif: {stats.totalMuatan.toFixed(1).replace('.', ',')} ton
                  </div>
                </div>

                <div className="t-card p-5 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="t-field-label">Stand-by di Pool</span>
                    <Clock className="w-5 h-5 t-link" />
                  </div>
                  <div className="text-2xl font-display t-text mt-2 tabular-nums">
                    {stats.standby} Unit
                  </div>
                  <div className="text-[11px] t-muted mt-2">Siap ditugaskan untuk rute berikutnya</div>
                </div>

                <div className="t-card p-5 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="t-field-label">Servis / Nonaktif</span>
                    <Wrench className="w-5 h-5" style={{ color: 'var(--status-warn-text)' }} />
                  </div>
                  <div
                    className="text-2xl font-display mt-2 tabular-nums"
                    style={{ color: 'var(--status-warn-text)' }}
                  >
                    {stats.nonaktifServis} Unit
                  </div>
                  <div className="text-[11px] t-muted mt-2">Dalam perawatan atau nonaktif</div>
                </div>
              </div>

              {/* Fleet Monitoring Table */}
              <div className="t-card rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b t-border flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="t-section-label">Pemantauan Status Armada</h2>
                    <p className="text-[11px] t-muted mt-0.5">
                      Klik baris kendaraan untuk membuka <b>Detail Unit</b> pada Master Data.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 t-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari kode unit / nopol / supir..."
                        className="text-xs pl-8 pr-3 py-2 rounded-xl t-input w-56"
                      />
                    </div>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as 'ALL' | ArmadaOperationalStatus)}
                      aria-label="Filter status armada"
                      className="text-xs px-3 py-2 rounded-xl t-input font-semibold"
                    >
                      <option value="ALL">Semua Status</option>
                      <option value="Beroperasi">Beroperasi</option>
                      <option value="Stand-by">Stand-by</option>
                      <option value="Servis">Servis</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="t-subtle border-b t-border">
                        <th className="py-3.5 px-5 t-th-label">Unit &amp; No. Polisi</th>
                        <th className="py-3.5 px-4 t-th-label">Jenis &amp; Merek</th>
                        <th className="py-3.5 px-4 t-th-label">Lokasi &amp; Rute Terakhir</th>
                        <th className="py-3.5 px-4 t-th-label text-right">Muatan</th>
                        <th className="py-3.5 px-4 t-th-label text-center">Status</th>
                        <th className="py-3.5 px-5 t-th-label text-right">Update</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y t-border">
                      {filteredDashboardUnits.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center t-muted">
                            Tidak ada unit armada yang cocok dengan filter pencarian.
                          </td>
                        </tr>
                      ) : (
                        filteredDashboardUnits.map((unit) => {
                          const opStatus: ArmadaOperationalStatus =
                            unit.status === 'Nonaktif'
                              ? 'Servis'
                              : unit.statusOperasional || 'Stand-by';
                          const statusClass =
                            opStatus === 'Beroperasi'
                              ? 't-status-ok'
                              : opStatus === 'Stand-by'
                                ? 't-status-info'
                                : 't-status-warn';
                          const merekModel = [unit.merek, unit.model].filter(Boolean).join(' ');
                          return (
                            <tr
                              key={unit.id}
                              onClick={() => openMenu('armada-master-unit', unit.id)}
                              className="t-row-hover cursor-pointer"
                            >
                              <td className="py-3.5 px-5">
                                <div className="font-bold font-mono-num t-link">
                                  {unit.kodeUnit}
                                </div>
                                <div className="text-[11px] font-mono-num font-semibold t-text">
                                  {unit.nomorPolisi}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-semibold t-text">{unit.jenisKendaraan}</div>
                                <div className="text-[11px] t-muted">
                                  {merekModel || '-'}
                                  {unit.supirUtama && unit.supirUtama !== '-'
                                    ? ` · ${unit.supirUtama}`
                                    : ''}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="inline-flex items-center gap-1 font-semibold t-text">
                                  <MapPin className="w-3.5 h-3.5 t-link shrink-0" />
                                  <span>{unit.lokasiTerakhir || 'Pool Utama PT. SPD'}</span>
                                </div>
                                <div className="text-[11px] t-muted mt-0.5">
                                  {unit.ruteAktif || '-'}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono-num font-semibold t-text whitespace-nowrap">
                                {unit.muatanTon && unit.muatanTon > 0
                                  ? `${unit.muatanTon.toFixed(1).replace('.', ',')} ton`
                                  : '-'}
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <span
                                  className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold ${statusClass}`}
                                >
                                  {unit.status === 'Nonaktif' ? 'Nonaktif' : opStatus}
                                </span>
                              </td>
                              <td className="py-3.5 px-5 text-right text-[11px] t-muted whitespace-nowrap">
                                {unit.updateTerakhir || '-'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Lightweight Toast Notification */}
      {toastMsg && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl t-status-ok shadow-xl text-xs font-bold flex items-center gap-2 border border-current/15"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
