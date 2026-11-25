import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Info,
  LogOut,
  MapPin,
  Palette,
  Search,
  ShieldAlert,
  ShieldCheck,
  Truck,
  Wrench,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { STORAGE_KEYS, type ThemeId } from '../../config/constants';
import { SPD_NAVY_GRADIENT, SpdLogoWordmark } from '../../components/common/SpdLogo';
import type { UserSession } from '../../types/auth';
import {
  clearStoredUserSession,
  getPortalBaseUrlFromArmada,
  getPortalLoginUrlFromArmada,
  isActiveSuperAdminSession,
  readStoredUserSession,
} from '../../utils/portalAuth';

type FleetStatus = 'Beroperasi' | 'Stand-by' | 'Servis';

interface DummyArmadaUnit {
  id: string;
  nopol: string;
  namaUnit: string;
  divisi: 'Supir B3' | 'Supir SPD';
  supir: string;
  lokasiTerakhir: string;
  ruteAktif: string;
  status: FleetStatus;
  muatanTon: number;
  updateTerakhir: string;
}

const DUMMY_ARMADA_DATA: DummyArmadaUnit[] = [
  {
    id: 'ARM-01',
    nopol: 'B 9421 SPD',
    namaUnit: 'Hino Dutro B3-01',
    divisi: 'Supir B3',
    supir: 'Dedi Kurniawan',
    lokasiTerakhir: 'Kawasan Industri Cikarang',
    ruteAktif: 'Pool SPD → PT. Mitra Industri → Fasilitas B3',
    status: 'Beroperasi',
    muatanTon: 6.4,
    updateTerakhir: '10 menit lalu',
  },
  {
    id: 'ARM-02',
    nopol: 'B 9184 SPD',
    namaUnit: 'Mitsubishi Canter B3-02',
    divisi: 'Supir B3',
    supir: 'Rudi Hartono',
    lokasiTerakhir: 'Tol Cikampek KM 34',
    ruteAktif: 'Pool SPD → Kawasan MM2100 → Gudang Utama',
    status: 'Beroperasi',
    muatanTon: 5.1,
    updateTerakhir: '18 menit lalu',
  },
  {
    id: 'ARM-03',
    nopol: 'B 8712 SPD',
    namaUnit: 'Isuzu Elf Wingbox SPD-01',
    divisi: 'Supir SPD',
    supir: 'Hendra Wijaya',
    lokasiTerakhir: 'Pool Utama PT. SPD',
    ruteAktif: 'Siap muat jadwal shift siang',
    status: 'Stand-by',
    muatanTon: 0,
    updateTerakhir: '25 menit lalu',
  },
  {
    id: 'ARM-04',
    nopol: 'B 9630 SPD',
    namaUnit: 'Hino Ranger Dump SPD-02',
    divisi: 'Supir SPD',
    supir: 'Agus Salim',
    lokasiTerakhir: 'Cibitung — Timbangan Mitra',
    ruteAktif: 'Gudang Sortir → Mitra Daur Ulang',
    status: 'Beroperasi',
    muatanTon: 8.2,
    updateTerakhir: '5 menit lalu',
  },
  {
    id: 'ARM-05',
    nopol: 'B 8209 SPD',
    namaUnit: 'Mitsubishi Colt Diesel B3-03',
    divisi: 'Supir B3',
    supir: 'Slamet Riyadi',
    lokasiTerakhir: 'Bengkel Rekanan Bekasi',
    ruteAktif: 'Servis berkala rem & ganti oli',
    status: 'Servis',
    muatanTon: 0,
    updateTerakhir: '1 jam lalu',
  },
  {
    id: 'ARM-06',
    nopol: 'B 8945 SPD',
    namaUnit: 'Isuzu Giga SPD-03',
    divisi: 'Supir SPD',
    supir: 'Yusuf Maulana',
    lokasiTerakhir: 'Pool Utama PT. SPD',
    ruteAktif: 'Menunggu surat jalan pengiriman sore',
    status: 'Stand-by',
    muatanTon: 0,
    updateTerakhir: '32 menit lalu',
  },
];

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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | FleetStatus>('ALL');

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

  // Sync logout/login events across tabs
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
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const stats = useMemo(() => {
    const total = DUMMY_ARMADA_DATA.length;
    const beroperasi = DUMMY_ARMADA_DATA.filter((u) => u.status === 'Beroperasi').length;
    const standby = DUMMY_ARMADA_DATA.filter((u) => u.status === 'Stand-by').length;
    const servis = DUMMY_ARMADA_DATA.filter((u) => u.status === 'Servis').length;
    const totalMuatan = DUMMY_ARMADA_DATA.reduce((sum, u) => sum + u.muatanTon, 0);
    return { total, beroperasi, standby, servis, totalMuatan };
  }, []);

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DUMMY_ARMADA_DATA.filter((u) => {
      if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
      if (
        q &&
        !u.nopol.toLowerCase().includes(q) &&
        !u.namaUnit.toLowerCase().includes(q) &&
        !u.supir.toLowerCase().includes(q) &&
        !u.lokasiTerakhir.toLowerCase().includes(q) &&
        !u.divisi.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [search, statusFilter]);

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

  // State 3: Active Super Admin Session — Dashboard Armada
  const userName = session.nama || session.username || session.email || 'Super Admin';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b t-border t-card/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="px-3.5 py-2 rounded-xl border border-white/15 shadow-xs shrink-0"
              style={{ background: SPD_NAVY_GRADIENT }}
            >
              <SpdLogoWordmark variant="on-dark" size="sm" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider t-link">
                  Dashboard Armada
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md t-status-ok text-[10px] font-bold">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{session.role}</span>
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-display t-text truncate">
                Sistem Operasional dan Pemantauan Armada
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden sm:inline-block text-xs t-muted mr-1">
              Masuk sebagai <b className="t-text">{userName}</b>
            </span>
            <button
              type="button"
              onClick={handleCycleTheme}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl t-btn-secondary text-xs font-semibold"
              title="Ganti tema warna"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>{THEME_LABELS[theme]}</span>
            </button>
            <button
              type="button"
              onClick={handleBackToPortal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Portal SPD</span>
            </button>
            <button
              type="button"
              onClick={handleLogoutAndSwitch}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
              style={{ color: 'var(--status-bad-text)' }}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Uji Coba / Session Notice Banner */}
        <div className="p-3.5 rounded-xl t-status-info text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-start sm:items-center gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <b>Mode Uji Coba Awal (Data Dummy):</b> Akses halaman ini tersambung ke sesi login{' '}
              <b>Super Admin</b> Portal SPD. Data unit armada di bawah merupakan data simulasi untuk
              verifikasi alur masuk.
            </span>
          </div>
          <span className="font-mono-num text-[11px] font-bold shrink-0">
            {session.isDemo ? 'Sesi Preview Browser' : 'Sesi Login Portal SPS'}
          </span>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="t-card-accent p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: 'var(--card-accent-muted)' }}>
                Total Armada Terdaftar
              </span>
              <Truck className="w-5 h-5 text-white/85" />
            </div>
            <div className="text-2xl font-display text-white mt-2 tabular-nums">
              {stats.total} Unit
            </div>
            <div className="text-[11px] text-white/75 mt-2">
              Divisi Supir B3 &amp; Supir SPD
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
              <span className="t-field-label">Perawatan / Servis</span>
              <Wrench className="w-5 h-5" style={{ color: 'var(--status-warn-text)' }} />
            </div>
            <div
              className="text-2xl font-display mt-2 tabular-nums"
              style={{ color: 'var(--status-warn-text)' }}
            >
              {stats.servis} Unit
            </div>
            <div className="text-[11px] t-muted mt-2">Dalam jadwal perawatan berkala</div>
          </div>
        </div>

        {/* Fleet Monitoring Table */}
        <div className="t-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b t-border flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="t-section-label">Pemantauan Status Armada (Data Uji Coba)</h2>
              <p className="text-[11px] t-muted mt-0.5">
                Menampilkan {filteredUnits.length} dari {DUMMY_ARMADA_DATA.length} unit armada
                PT. Sarana Putra Daerah.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 t-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nopol / supir / lokasi..."
                  className="text-xs pl-8 pr-3 py-2 rounded-xl t-input w-56"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | FleetStatus)}
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
                  <th className="py-3.5 px-4 t-th-label">Divisi &amp; Supir</th>
                  <th className="py-3.5 px-4 t-th-label">Lokasi &amp; Rute Terakhir</th>
                  <th className="py-3.5 px-4 t-th-label text-right">Muatan</th>
                  <th className="py-3.5 px-4 t-th-label text-center">Status</th>
                  <th className="py-3.5 px-5 t-th-label text-right">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y t-border">
                {filteredUnits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center t-muted">
                      Tidak ada unit armada yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredUnits.map((unit) => {
                    const statusClass =
                      unit.status === 'Beroperasi'
                        ? 't-status-ok'
                        : unit.status === 'Stand-by'
                          ? 't-status-info'
                          : 't-status-warn';
                    return (
                      <tr key={unit.id} className="t-row-hover">
                        <td className="py-3.5 px-5">
                          <div className="font-bold font-mono-num t-text">{unit.nopol}</div>
                          <div className="text-[11px] t-muted">{unit.namaUnit}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold t-text">{unit.supir}</div>
                          <div className="text-[11px] t-muted">{unit.divisi}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="inline-flex items-center gap-1 font-semibold t-text">
                            <MapPin className="w-3.5 h-3.5 t-link shrink-0" />
                            <span>{unit.lokasiTerakhir}</span>
                          </div>
                          <div className="text-[11px] t-muted mt-0.5">{unit.ruteAktif}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono-num font-semibold t-text whitespace-nowrap">
                          {unit.muatanTon > 0
                            ? `${unit.muatanTon.toFixed(1).replace('.', ',')} ton`
                            : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold ${statusClass}`}>
                            {unit.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right text-[11px] t-muted whitespace-nowrap">
                          {unit.updateTerakhir}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
