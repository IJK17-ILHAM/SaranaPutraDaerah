import { Check, LogOut, Menu, Palette, RefreshCw, Truck, X } from 'lucide-react';
import { useState } from 'react';
import type { ThemeId } from '../../config/constants';
import { useApp } from '../../context/AppContext';
import { useKasTonase } from '../../context/KasTonaseContext';
import { usePayroll } from '../../context/PayrollContext';
import type { MenuId } from '../../types/auth';
import { getInitials, isAdminRole } from '../../utils/format';
import { getArmadaUrlFromPortal, isActiveSuperAdminSession } from '../../utils/portalAuth';
import { MainMenuIcon } from '../common/MainMenuIcons';
import { SPD_NAVY_GRADIENT, SpdLogoWordmark } from '../common/SpdLogo';

interface NavItem {
  id: MenuId;
  label: string;
  highlight?: boolean;
  adminOnly?: boolean;
}

const PAYROLL_NAV: NavItem[] = [
  { id: 'menu-ringkasan', label: 'Ringkasan' },
  { id: 'menu-input', label: 'Input gaji' },
  { id: 'menu-karyawan', label: 'Karyawan' },
  { id: 'menu-slip', label: 'Slip gaji' },
  { id: 'menu-laporan', label: 'Laporan' },
  {
    id: 'menu-akun',
    label: 'Kelola Akun',
    highlight: true,
    adminOnly: true,
  },
];

const KT_NAV: NavItem[] = [
  { id: 'menu-kt-dashboard', label: 'Dashboard' },
  { id: 'menu-kt-transaksi', label: 'Transaksi' },
  { id: 'menu-kt-laporan', label: 'Laporan' },
  { id: 'menu-kt-hutang', label: 'Hutang piutang' },
  { id: 'menu-kt-stok', label: 'Stok gudang' },
  { id: 'menu-kt-harga', label: 'Master barang' },
  { id: 'menu-kt-customer', label: 'Customer' },
  { id: 'menu-kt-pengaturan', label: 'Pengaturan' },
];

const THEME_ORDER: ThemeId[] = ['spd', 'eco', 'dark'];

export function Sidebar() {
  const {
    theme,
    setTheme,
    user,
    logoutUser,
    activeSuite,
    switchSuite,
    activeMenu,
    setActiveMenu,
  } = useApp();
  const { syncState, syncLabel, isSyncing: payrollSyncing, refreshPayroll } = usePayroll();
  const { isSyncing: ktSyncing, refreshTonase } = useKasTonase();

  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const canManageAccounts = isAdminRole(user?.role);
  const canOpenArmada = isActiveSuperAdminSession(user);
  const userName = user?.nama || user?.username || user?.email || 'User';
  const userRole = user?.role || 'Staff';
  const initials = getInitials(userName);

  const navItems = (activeSuite === 'payroll' ? PAYROLL_NAV : KT_NAV).filter(
    (item) => !item.adminOnly || canManageAccounts,
  );

  const isCurrentlySyncing = activeSuite === 'kastonase' ? ktSyncing : payrollSyncing;

  const handleSelectMenu = (id: MenuId) => {
    setActiveMenu(id);
    setMobileOpen(false);
  };

  const handleSyncActive = () => {
    if (activeSuite === 'kastonase') {
      refreshTonase(true);
    } else {
      refreshPayroll(true);
    }
  };

  const handleCycleTheme = () => {
    const idx = THEME_ORDER.indexOf(theme);
    const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    setTheme(next);
  };

  const themeLabels: Record<ThemeId, string> = {
    spd: 'Soft UI',
    eco: 'Hijau',
    dark: 'Gelap',
  };

  return (
    <aside
      className={`shrink-0 no-print lg:sticky lg:top-0 lg:h-screen lg:flex lg:flex-col lg:items-center lg:py-4 lg:pl-4 lg:pr-1 transition-[width] duration-200 ${
        expanded ? 'lg:w-[252px]' : 'lg:w-[92px]'
      }`}
    >
      {/* Mobile Top Bar */}
      <div className="lg:hidden m-3 mb-0 t-sidebar rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/15 shadow-xs"
            style={{ background: SPD_NAVY_GRADIENT }}
          >
            <SpdLogoWordmark variant="on-dark" size="xs" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">
              {activeSuite === 'kastonase' ? 'Kas & Tonase' : 'Payroll'}
            </div>
            <div className="text-[10px] truncate" style={{ color: 'var(--text-sidebar-muted)' }}>
              {userName}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => switchSuite(activeSuite === 'payroll' ? 'kastonase' : 'payroll')}
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap"
            style={{ backgroundColor: 'var(--btn-gold)', color: 'var(--btn-gold-text)' }}
          >
            {activeSuite === 'payroll' ? 'Kas & Tonase' : 'Payroll'}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="p-2 rounded-xl bg-white/10 text-white"
            aria-label="Buka menu navigasi"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Drawer */}
      {mobileOpen && (
        <div className="lg:hidden mx-3 mt-2 t-sidebar rounded-2xl p-3 space-y-2 shadow-lg">
          <div className="grid grid-cols-2 gap-1.5">
            {navItems.map((item) => {
              const isActive = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectMenu(item.id)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-left whitespace-nowrap ${
                    isActive ? 'font-bold' : 't-sidebar-btn'
                  }`}
                  style={
                    isActive
                      ? { backgroundColor: 'var(--btn-gold)', color: 'var(--btn-gold-text)' }
                      : undefined
                  }
                >
                  <span className="w-7 h-7 rounded-full bg-transparent flex items-center justify-center shrink-0">
                    <MainMenuIcon id={item.id} size={24} onDark />
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
            {canOpenArmada && (
              <a
                href={getArmadaUrlFromPortal()}
                className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-left whitespace-nowrap t-sidebar-btn col-span-2 border border-white/15"
              >
                <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4" style={{ color: 'var(--accent-highlight)' }} />
                </span>
                <span className="truncate font-semibold" style={{ color: 'var(--accent-highlight)' }}>
                  Dashboard Armada
                </span>
              </a>
            )}
          </div>
          <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSyncActive}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-xs text-white font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCurrentlySyncing ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
              <button
                type="button"
                onClick={handleCycleTheme}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-xs text-white font-semibold"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>{themeLabels[theme]}</span>
              </button>
            </div>
            <button
              type="button"
              onClick={logoutUser}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-xs text-white/85"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Floating Medallion + Rounded Capsule Rail */}
      <div
        className={`hidden lg:flex flex-col items-center h-full min-h-0 gap-3.5 transition-all duration-200 ${
          expanded ? 'w-[228px]' : 'w-[68px]'
        }`}
      >
        {/* Top Floating Brand Medallion */}
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          title="spd. Portal — PT. Sarana Putra Daerah"
          style={{ background: SPD_NAVY_GRADIENT }}
          className={`shadow-md border border-white/15 flex items-center shrink-0 transition-all duration-200 ${
            expanded
              ? 'w-full h-14 rounded-[26px] px-4 justify-between gap-4'
              : 'w-[54px] h-[54px] rounded-full justify-center'
          }`}
        >
          <SpdLogoWordmark variant="on-dark" size={expanded ? 'md' : 'xs'} />
          {expanded && (
            <span className="ml-auto pl-3 border-l border-white/20 text-[11px] font-semibold truncate text-white/85">
              {activeSuite === 'kastonase' ? 'Kas & Tonase' : 'Payroll'}
            </span>
          )}
        </button>

        {/* Main Floating Dark Capsule Rail */}
        <div
          className={`t-sidebar shadow-xl flex-1 min-h-0 w-full flex flex-col justify-between gap-2 py-4 overflow-y-auto overscroll-contain spd-sidebar-scroll transition-all duration-200 ${
            expanded ? 'rounded-[30px]' : 'rounded-[34px]'
          }`}
        >
          {/* Top Controls: Expand Toggle + Module Switcher */}
          <div className="space-y-3 shrink-0">
            <div className={`flex ${expanded ? 'px-4 justify-between items-center' : 'justify-center'}`}>
              {expanded && (
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: 'var(--text-sidebar-muted)' }}
                >
                  Menu Navigasi
                </span>
              )}
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                aria-label={expanded ? 'Ciutkan sidebar' : 'Perluas sidebar'}
                title={expanded ? 'Ciutkan sidebar' : 'Perluas sidebar'}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                {expanded ? <X className="w-[18px] h-[18px]" /> : <Menu className="w-[18px] h-[18px]" />}
              </button>
            </div>

            {/* Suite Switcher inside Capsule */}
            <div className={expanded ? 'px-3' : 'px-2'}>
              <div
                className={`p-1 rounded-2xl bg-black/20 border border-white/10 ${
                  expanded ? 'grid grid-cols-2 gap-1' : 'flex flex-col items-center gap-1'
                }`}
              >
                <button
                  type="button"
                  onClick={() => switchSuite('payroll')}
                  title="Modul Payroll"
                  className={`relative group flex items-center justify-center gap-1.5 rounded-xl transition-all ${
                    expanded ? 'py-1.5 px-2 text-[11px]' : 'w-9 h-9'
                  } ${
                    activeSuite === 'payroll'
                      ? 'font-bold shadow-xs'
                      : 'text-white/75 hover:text-white hover:bg-white/10 opacity-85 hover:opacity-100'
                  }`}
                  style={
                    activeSuite === 'payroll'
                      ? { backgroundColor: 'var(--btn-gold)', color: 'var(--btn-gold-text)' }
                      : undefined
                  }
                >
                  <span
                    className={`rounded-full bg-transparent flex items-center justify-center shrink-0 ${
                      expanded ? 'w-6 h-6' : 'w-7 h-7'
                    }`}
                  >
                    <MainMenuIcon id="suite-payroll" size={expanded ? 22 : 24} onDark />
                  </span>
                  {expanded && <span className="truncate">Payroll</span>}
                </button>
                <button
                  type="button"
                  onClick={() => switchSuite('kastonase')}
                  title="Modul Kas & Tonase"
                  className={`relative group flex items-center justify-center gap-1.5 rounded-xl transition-all ${
                    expanded ? 'py-1.5 px-2 text-[11px]' : 'w-9 h-9'
                  } ${
                    activeSuite === 'kastonase'
                      ? 'font-bold shadow-xs'
                      : 'text-white/75 hover:text-white hover:bg-white/10 opacity-85 hover:opacity-100'
                  }`}
                  style={
                    activeSuite === 'kastonase'
                      ? { backgroundColor: 'var(--btn-gold)', color: 'var(--btn-gold-text)' }
                      : undefined
                  }
                >
                  <span
                    className={`rounded-full bg-transparent flex items-center justify-center shrink-0 ${
                      expanded ? 'w-6 h-6' : 'w-7 h-7'
                    }`}
                  >
                    <MainMenuIcon id="suite-kastonase" size={expanded ? 22 : 24} onDark />
                  </span>
                  {expanded && <span className="truncate">Tonase</span>}
                </button>
              </div>
            </div>
          </div>

          {/* Center Navigation Items with Concave Active Cutout */}
          <nav
            className="flex flex-col gap-1 my-auto py-2 shrink-0"
            aria-label="Navigasi utama"
          >
            {navItems.map((item) => {
              const isActive = activeMenu === item.id;

              return (
                <div
                  key={item.id}
                  className={`relative group ${
                    isActive
                      ? expanded
                        ? 'ml-3 pl-1.5 pr-3 py-1.5 spd-rail-active'
                        : 'ml-2 pl-1 pr-2 py-1.5 spd-rail-active'
                      : expanded
                        ? 'px-3'
                        : 'flex justify-center'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectMenu(item.id)}
                    title={!expanded ? item.label : undefined}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center transition-all duration-150 ${
                      expanded
                        ? isActive
                          ? 'w-full gap-2.5 py-1 pr-2 text-left'
                          : 'w-full gap-2.5 px-2.5 py-2 rounded-2xl text-[13px] t-sidebar-btn text-left'
                        : isActive
                          ? 'justify-center'
                          : 'w-11 h-11 rounded-2xl justify-center hover:bg-white/10'
                    }`}
                  >
                    <span
                      className={`flex items-center justify-center shrink-0 transition-all duration-150 bg-transparent ${
                        isActive
                          ? 'w-10 h-10 rounded-full'
                          : expanded
                            ? 'w-8 h-8 rounded-full group-hover:scale-105'
                            : 'w-9 h-9 rounded-full group-hover:scale-105'
                      }`}
                    >
                      <MainMenuIcon
                        id={item.id}
                        size={isActive ? 32 : expanded ? 26 : 28}
                        onDark={isActive ? theme === 'dark' : true}
                      />
                    </span>

                    {expanded && (
                      <span
                        className={`text-[13px] truncate ${
                          isActive ? 'font-bold t-text' : 'font-medium'
                        }`}
                        style={
                          !isActive && item.highlight
                            ? { color: 'var(--accent-highlight)' }
                            : undefined
                        }
                      >
                        {item.label}
                      </span>
                    )}
                  </button>

                  {/* Hover Tooltip when Collapsed */}
                  {!expanded && (
                    <div
                      role="tooltip"
                      className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute left-full ml-3 top-1/2 -translate-y-1/2 z-40 px-2.5 py-1.5 rounded-xl t-sidebar text-xs font-semibold text-white whitespace-nowrap shadow-lg border border-white/10"
                    >
                      {item.label}
                    </div>
                  )}
                </div>
              );
            })}
            {canOpenArmada && (
              <div className={`relative group ${expanded ? 'px-3 pt-1' : 'flex justify-center pt-1'}`}>
                <a
                  href={getArmadaUrlFromPortal()}
                  title={!expanded ? 'Dashboard Armada' : undefined}
                  className={`flex items-center transition-all duration-150 ${
                    expanded
                      ? 'w-full gap-2.5 px-2.5 py-2 rounded-2xl text-[13px] t-sidebar-btn text-left border border-white/15'
                      : 'w-11 h-11 rounded-2xl justify-center hover:bg-white/10 border border-white/15'
                  }`}
                >
                  <span
                    className={`flex items-center justify-center shrink-0 ${
                      expanded ? 'w-8 h-8' : 'w-9 h-9'
                    }`}
                  >
                    <Truck className="w-5 h-5" style={{ color: 'var(--accent-highlight)' }} />
                  </span>
                  {expanded && (
                    <span
                      className="text-[13px] font-semibold truncate"
                      style={{ color: 'var(--accent-highlight)' }}
                    >
                      Dashboard Armada
                    </span>
                  )}
                </a>
                {!expanded && (
                  <div
                    role="tooltip"
                    className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute left-full ml-3 top-1/2 -translate-y-1/2 z-40 px-2.5 py-1.5 rounded-xl t-sidebar text-xs font-semibold text-white whitespace-nowrap shadow-lg border border-white/10"
                  >
                    Dashboard Armada
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Bottom Utility Stack: Sync, Theme, User Avatar, Logout */}
          <div
            className={`flex flex-col gap-2 pt-3 border-t border-white/10 shrink-0 ${
              expanded ? 'px-3.5' : 'items-center px-2'
            }`}
          >
            {expanded ? (
              <>
                <div className="flex items-center justify-between gap-2 px-1">
                  <button
                    type="button"
                    onClick={handleSyncActive}
                    disabled={isCurrentlySyncing}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-white whitespace-nowrap disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isCurrentlySyncing ? 'animate-spin' : ''}`}
                    />
                    <span>{syncLabel}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {THEME_ORDER.map((tid) => (
                      <button
                        key={tid}
                        type="button"
                        onClick={() => setTheme(tid)}
                        title={`Tema ${themeLabels[tid]}`}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{
                          backgroundColor:
                            tid === 'spd' ? '#2563EB' : tid === 'eco' ? '#1F5C4A' : '#111827',
                          border:
                            theme === tid
                              ? '2px solid var(--accent-highlight)'
                              : '1px solid rgba(255,255,255,0.35)',
                        }}
                      >
                        {theme === tid && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ring-2 ring-white/25"
                      style={{
                        backgroundColor: 'var(--btn-gold)',
                        color: 'var(--btn-gold-text)',
                      }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{userName}</div>
                      <div
                        className="text-[10px] font-semibold truncate"
                        style={{ color: 'var(--accent-highlight)' }}
                      >
                        {userRole}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={logoutUser}
                    title="Keluar"
                    aria-label="Keluar"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white/75 hover:text-white hover:bg-white/10 shrink-0"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSyncActive}
                  disabled={isCurrentlySyncing}
                  title={`Sync SPS (${syncState === 'offline' ? 'Cache' : syncLabel})`}
                  aria-label="Sync SPS"
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-60"
                >
                  <RefreshCw
                    className={`w-[17px] h-[17px] ${isCurrentlySyncing ? 'animate-spin' : ''}`}
                  />
                </button>

                <button
                  type="button"
                  onClick={handleCycleTheme}
                  title={`Ganti Tema (Aktif: ${themeLabels[theme]})`}
                  aria-label="Ganti tema warna"
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Palette className="w-[17px] h-[17px]" />
                </button>

                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  title={`${userName} · ${userRole}`}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold ring-2 ring-white/25 transition-transform hover:scale-105"
                  style={{
                    backgroundColor: 'var(--btn-gold)',
                    color: 'var(--btn-gold-text)',
                  }}
                >
                  {initials}
                </button>

                <button
                  type="button"
                  onClick={logoutUser}
                  title="Keluar"
                  aria-label="Keluar"
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <LogOut className="w-[17px] h-[17px]" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
