import {
  AlertTriangle,
  Banknote,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock,
  CloudUpload,
  Database,
  FileSpreadsheet,
  FolderOpen,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  Palette,
  RefreshCw,
  Route,
  Search,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Truck,
  Upload,
  Users,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SPD_NAVY_GRADIENT, SpdLogoWordmark } from '../../components/common/SpdLogo';
import {
  GOOGLE_ARMADA_DRIVE_FOLDER_URL,
  STORAGE_KEYS,
  type ThemeId,
} from '../../config/constants';
import {
  computePermintaanBarangStatus,
  generateNextArmadaCode,
  loadStoredArmadaAccounts,
  loadStoredArmadaKendala,
  loadStoredArmadaLokasi,
  loadStoredArmadaMaintenance,
  loadStoredArmadaP2H,
  loadStoredArmadaPelanggan,
  loadStoredArmadaPerjalanan,
  loadStoredArmadaPermintaanBarang,
  loadStoredArmadaSewa,
  loadStoredArmadaTarif,
  loadStoredArmadaUangJalan,
  loadStoredArmadaUnits,
  saveStoredArmadaAccounts,
  saveStoredArmadaKendala,
  saveStoredArmadaLokasi,
  saveStoredArmadaMaintenance,
  saveStoredArmadaP2H,
  saveStoredArmadaPelanggan,
  saveStoredArmadaPerjalanan,
  saveStoredArmadaPermintaanBarang,
  saveStoredArmadaSewa,
  saveStoredArmadaTarif,
  saveStoredArmadaUangJalan,
  saveStoredArmadaUnits,
} from '../../data/armadaSeed';
import {
  deleteArmadaRecordFromSPS,
  ensurePengajuanBarangDriveFolderFromSPS,
  fetchArmadaAllFromSPS,
  pushAllArmadaToSPS,
  syncArmadaCollectionToSPS,
  syncArmadaRecordToSPS,
  uploadArmadaFileToDrive,
  type ArmadaCollectionKey,
  type ArmadaDriveMeta,
} from '../../services/armadaApi';
import type {
  ArmadaAccount,
  ArmadaAccountInput,
  ArmadaKendalaKategori,
  ArmadaKendalaReport,
  ArmadaLokasi,
  ArmadaLokasiInput,
  ArmadaMaintenanceRequest,
  ArmadaMenuId,
  ArmadaOperationalStatus,
  ArmadaP2HRecord,
  ArmadaPelanggan,
  ArmadaPelangganInput,
  ArmadaPerjalanan,
  ArmadaPerjalananInput,
  ArmadaPermintaanBarang,
  ArmadaSewaUnit,
  ArmadaTarif,
  ArmadaTarifInput,
  ArmadaUangJalan,
  ArmadaUnit,
  ArmadaUnitBerkas,
  ArmadaUnitInput,
  MaintenancePriority,
  P2HChecklistItem,
  PermintaanBarangItem,
  UangJalanExpenseItem,
} from '../../types/armada';
import type { UserSession } from '../../types/auth';
import {
  isSewaOverdue,
  recordArmadaKasTonaseTransaction,
} from '../../utils/armadaSchedule';
import {
  exportSpsArmadaWorkbook,
  importSpsArmadaWorkbook,
  type MasterDataTabKey,
  type SpsArmadaImportResult,
} from '../../utils/armadaSpreadsheet';
import { getTodayISO } from '../../utils/format';
import {
  canAccessArmadaSession,
  clearStoredUserSession,
  getPortalLoginUrlFromArmada,
  isActiveSopirSession,
  markArmadaSessionLocked,
  readStoredUserSession,
} from '../../utils/portalAuth';
import { ArmadaMenuIcon } from '../../components/armada/ArmadaMenuIcons';
import { AkunArmadaPage } from './AkunArmadaPage';
import { LokasiPage } from './LokasiPage';
import { HasilP2HPage, MaintenancePage, PermintaanBarangPage } from './P2HMaintenancePage';
import { PelangganPage } from './PelangganPage';
import { PerjalananPage } from './PerjalananPage';
import { SewaUnitPage } from './SewaUnitPage';
import { TarifPage } from './TarifPage';
import { TugasSayaSopirPage } from './TugasSayaSopirPage';
import { UangJalanPage } from './UangJalanPage';
import { UnitArmadaPage } from './UnitArmadaPage';

const THEME_ORDER: ThemeId[] = ['spd', 'eco', 'dark'];
const THEME_LABELS: Record<ThemeId, string> = {
  spd: 'Soft UI',
  eco: 'Hijau',
  dark: 'Gelap',
};

const MENU_TITLE_MAP: Record<ArmadaMenuId, string> = {
  'armada-dashboard': 'Dashboard Armada',
  'armada-tugas-saya': 'Tugas Saya (HP Sopir)',
  'armada-perjalanan': 'Perjalanan',
  'armada-uang-jalan': 'Uang Jalan',
  'armada-sewa-unit': 'Sewa Unit',
  'armada-hasil-p2h': 'Hasil P2H',
  'armada-maintenance': 'Pengajuan Perbaikan',
  'armada-permintaan-barang': 'Permintaan Barang',
  'armada-master-unit': 'Unit Armada',
  'armada-master-pelanggan': 'Pelanggan',
  'armada-master-lokasi': 'Lokasi Muat–Bongkar',
  'armada-master-tarif': 'Tarif',
  'armada-akun': 'Kelola Akun Armada',
};

const MENU_GROUP_MAP: Record<ArmadaMenuId, string> = {
  'armada-dashboard': 'Operasional',
  'armada-tugas-saya': 'Operasional',
  'armada-perjalanan': 'Perjalanan & Sewa',
  'armada-uang-jalan': 'Perjalanan & Sewa',
  'armada-sewa-unit': 'Perjalanan & Sewa',
  'armada-hasil-p2h': 'P2H & Maintenance',
  'armada-maintenance': 'P2H & Maintenance',
  'armada-permintaan-barang': 'P2H & Maintenance',
  'armada-master-unit': 'Master Data',
  'armada-master-pelanggan': 'Master Data',
  'armada-master-lokasi': 'Master Data',
  'armada-master-tarif': 'Master Data',
  'armada-akun': 'Pengaturan Armada',
};

export function ArmadaDashboardPage() {
  const [theme, setTheme] = useState<ThemeId>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return saved === 'eco' || saved === 'dark' || saved === 'spd' ? saved : 'spd';
  });

  const [session, setSession] = useState<UserSession | null>(() => readStoredUserSession());
  const [activeMenu, setActiveMenu] = useState<ArmadaMenuId>('armada-dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Core persisted Armada state
  const [units, setUnits] = useState<ArmadaUnit[]>(() => loadStoredArmadaUnits());
  const [pelanggan, setPelanggan] = useState<ArmadaPelanggan[]>(() => loadStoredArmadaPelanggan());
  const [lokasi, setLokasi] = useState<ArmadaLokasi[]>(() => loadStoredArmadaLokasi());
  const [tarif, setTarif] = useState<ArmadaTarif[]>(() => loadStoredArmadaTarif());
  const [perjalanan, setPerjalanan] = useState<ArmadaPerjalanan[]>(() =>
    loadStoredArmadaPerjalanan(),
  );
  const [uangJalan, setUangJalan] = useState<ArmadaUangJalan[]>(() =>
    loadStoredArmadaUangJalan(),
  );
  const [sewaList, setSewaList] = useState<ArmadaSewaUnit[]>(() => loadStoredArmadaSewa());
  const [p2hList, setP2hList] = useState<ArmadaP2HRecord[]>(() => loadStoredArmadaP2H());
  const [maintenanceList, setMaintenanceList] = useState<ArmadaMaintenanceRequest[]>(() =>
    loadStoredArmadaMaintenance(),
  );
  const [permintaanBarang, setPermintaanBarang] = useState<ArmadaPermintaanBarang[]>(() =>
    loadStoredArmadaPermintaanBarang(),
  );
  const [kendalaList, setKendalaList] = useState<ArmadaKendalaReport[]>(() =>
    loadStoredArmadaKendala(),
  );
  const [accounts, setAccounts] = useState<ArmadaAccount[]>(() => loadStoredArmadaAccounts());
  const [isSyncingSps, setIsSyncingSps] = useState(false);
  const [pengajuanBarangDriveUrl, setPengajuanBarangDriveUrl] = useState<string>(() => {
    const saved = localStorage.getItem('spd_armada_pb_drive_url');
    if (saved) return saved;
    const existing = loadStoredArmadaPermintaanBarang().find((r) => r.driveFolderUrl);
    return existing?.driveFolderUrl || '';
  });
  const [isEnsuringPbDrive, setIsEnsuringPbDrive] = useState(false);

  // Cross-navigation selection states
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedPerjalananId, setSelectedPerjalananId] = useState<string | null>(null);
  const [selectedUangJalanId, setSelectedUangJalanId] = useState<string | null>(null);
  const [selectedP2HId, setSelectedP2HId] = useState<string | null>(null);
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState<string | null>(null);
  const [lokasiFilterPlgId, setLokasiFilterPlgId] = useState<string>('ALL');
  const [lokasiAutoOpen, setLokasiAutoOpen] = useState(false);
  const [tarifFilterPlgId, setTarifFilterPlgId] = useState<string>('ALL');
  const [tarifAutoOpen, setTarifAutoOpen] = useState(false);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const spsInputRef = useRef<HTMLInputElement | null>(null);
  const skipNextSpsSyncRef = useRef(false);
  const prevSpsSnapRef = useRef<Record<ArmadaCollectionKey, Array<{ id: string }>> | null>(null);

  // Dashboard filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ArmadaOperationalStatus>('ALL');

  const notify = useCallback((message: string) => {
    setToastMsg(message);
    window.setTimeout(() => {
      setToastMsg((curr) => (curr === message ? null : curr));
    }, 4000);
  }, []);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  useEffect(() => {
    if (!session) {
      window.location.replace(getPortalLoginUrlFromArmada());
      return;
    }
    if (canAccessArmadaSession(session)) {
      markArmadaSessionLocked();
    }
  }, [session]);

  const refreshArmadaFromSPS = useCallback(
    async (showNotice = false) => {
      setIsSyncingSps(true);
      try {
        const parsed = await fetchArmadaAllFromSPS();
        if (parsed.updated) {
          skipNextSpsSyncRef.current = true;
          if (parsed.units) {
            setUnits(parsed.units);
            saveStoredArmadaUnits(parsed.units);
          }
          if (parsed.pelanggan) {
            setPelanggan(parsed.pelanggan);
            saveStoredArmadaPelanggan(parsed.pelanggan);
          }
          if (parsed.lokasi) {
            setLokasi(parsed.lokasi);
            saveStoredArmadaLokasi(parsed.lokasi);
          }
          if (parsed.tarif) {
            setTarif(parsed.tarif);
            saveStoredArmadaTarif(parsed.tarif);
          }
          if (parsed.perjalanan) {
            setPerjalanan(parsed.perjalanan);
            saveStoredArmadaPerjalanan(parsed.perjalanan);
          }
          if (parsed.uangJalan) {
            setUangJalan(parsed.uangJalan);
            saveStoredArmadaUangJalan(parsed.uangJalan);
          }
          if (parsed.sewa) {
            setSewaList(parsed.sewa);
            saveStoredArmadaSewa(parsed.sewa);
          }
          if (parsed.p2h) {
            setP2hList(parsed.p2h);
            saveStoredArmadaP2H(parsed.p2h);
          }
          if (parsed.maintenance) {
            setMaintenanceList(parsed.maintenance);
            saveStoredArmadaMaintenance(parsed.maintenance);
          }
          if (parsed.permintaanBarang) {
            setPermintaanBarang(parsed.permintaanBarang);
            saveStoredArmadaPermintaanBarang(parsed.permintaanBarang);
            const folderFromRow = parsed.permintaanBarang.find((r) => r.driveFolderUrl)?.driveFolderUrl;
            if (folderFromRow) {
              setPengajuanBarangDriveUrl(folderFromRow);
              localStorage.setItem('spd_armada_pb_drive_url', folderFromRow);
            }
          }
          if (parsed.pengajuanBarangDriveUrl) {
            setPengajuanBarangDriveUrl(parsed.pengajuanBarangDriveUrl);
            localStorage.setItem('spd_armada_pb_drive_url', parsed.pengajuanBarangDriveUrl);
          }
          if (parsed.kendala) {
            setKendalaList(parsed.kendala);
            saveStoredArmadaKendala(parsed.kendala);
          }
          if (parsed.accounts) {
            setAccounts(parsed.accounts);
            saveStoredArmadaAccounts(parsed.accounts);
          }
          if (showNotice) {
            notify('Data Armada berhasil disinkronkan dari SPS Armada.');
          }
        } else if (showNotice) {
          notify('SPS Armada terhubung, namun tab masih kosong. Gunakan "Kirim ke SPS" untuk mengisi awal.');
        }
      } catch {
        if (showNotice) {
          notify('Belum dapat terhubung ke SPS Armada. Pastikan script doGet/doPost sudah diterapkan.');
        }
      } finally {
        setIsSyncingSps(false);
      }
    },
    [notify],
  );

  // Pull latest Armada data from SPS Armada on initial load
  useEffect(() => {
    if (!session || !canAccessArmadaSession(session)) return;
    void refreshArmadaFromSPS(false);
  }, [refreshArmadaFromSPS, session]);

  // Automatic background diff-sync to SPS Armada whenever any Armada collection changes locally
  useEffect(() => {
    const currentSnap: Record<ArmadaCollectionKey, Array<{ id: string }>> = {
      units,
      pelanggan,
      lokasi,
      tarif,
      perjalanan,
      uangJalan,
      sewa: sewaList,
      p2h: p2hList,
      maintenance: maintenanceList,
      permintaanBarang,
      kendala: kendalaList,
      accounts,
    };

    if (!prevSpsSnapRef.current) {
      prevSpsSnapRef.current = currentSnap;
      return;
    }

    if (skipNextSpsSyncRef.current) {
      skipNextSpsSyncRef.current = false;
      prevSpsSnapRef.current = currentSnap;
      return;
    }

    const prevSnap = prevSpsSnapRef.current;
    prevSpsSnapRef.current = currentSnap;

    (Object.keys(currentSnap) as ArmadaCollectionKey[]).forEach((key) => {
      const prevArr = prevSnap[key];
      const nextArr = currentSnap[key];
      if (prevArr === nextArr) return;

      const prevMap = new Map(prevArr.map((item) => [item.id, item]));
      const nextMap = new Map(nextArr.map((item) => [item.id, item]));

      const changed: Array<{ id: string }> = [];
      nextArr.forEach((item) => {
        if (prevMap.get(item.id) !== item) {
          changed.push(item);
        }
      });

      const deletedIds: string[] = [];
      prevArr.forEach((item) => {
        if (!nextMap.has(item.id)) {
          deletedIds.push(item.id);
        }
      });

      if (changed.length === 0 && deletedIds.length === 0) return;

      if (changed.length > 3) {
        void syncArmadaCollectionToSPS(key, nextArr).catch(() => undefined);
      } else {
        const unitById = new Map(units.map((u) => [u.id, u]));
        const prjById = new Map(perjalanan.map((p) => [p.id, p]));
        const resolveDriveMeta = (record: Record<string, unknown>): ArmadaDriveMeta => {
          let nomorPolisi = typeof record.nomorPolisi === 'string' ? record.nomorPolisi : '';
          let kodeUnit = typeof record.kodeUnit === 'string' ? record.kodeUnit : '';
          let unitId = typeof record.unitId === 'string' ? record.unitId : '';
          if (!unitId && typeof record.perjalananId === 'string') {
            unitId = prjById.get(record.perjalananId)?.unitId || '';
          }
          if ((!nomorPolisi || !kodeUnit) && unitId) {
            const matchedUnit = unitById.get(unitId);
            if (matchedUnit) {
              nomorPolisi = nomorPolisi || matchedUnit.nomorPolisi;
              kodeUnit = kodeUnit || matchedUnit.kodeUnit;
            }
          }
          const refNumber = String(
            record.nomorPermintaan ||
              record.nomorP2H ||
              record.nomorPengajuan ||
              record.nomorSewa ||
              record.nomorUangJalan ||
              record.nomorPenugasan ||
              record.nomorLaporan ||
              kodeUnit ||
              record.id ||
              '',
          );
          return { nomorPolisi, kodeUnit, refNumber };
        };

        changed.forEach((item) => {
          const meta = resolveDriveMeta(item as unknown as Record<string, unknown>);
          void syncArmadaRecordToSPS(key, item, meta).catch(() => undefined);
        });
        deletedIds.forEach((id) => {
          void deleteArmadaRecordFromSPS(key, id).catch(() => undefined);
        });
      }
    });
  }, [
    accounts,
    kendalaList,
    lokasi,
    maintenanceList,
    p2hList,
    pelanggan,
    perjalanan,
    permintaanBarang,
    sewaList,
    tarif,
    uangJalan,
    units,
  ]);

  // Cross-tab storage sync
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.USER) setSession(readStoredUserSession());
      if (e.key === STORAGE_KEYS.THEME) {
        const next = localStorage.getItem(STORAGE_KEYS.THEME);
        if (next === 'eco' || next === 'dark' || next === 'spd') setTheme(next);
      }
      if (e.key === STORAGE_KEYS.ARMADA_UNITS) {
        skipNextSpsSyncRef.current = true;
        setUnits(loadStoredArmadaUnits());
      }
      if (e.key === STORAGE_KEYS.ARMADA_PELANGGAN) {
        skipNextSpsSyncRef.current = true;
        setPelanggan(loadStoredArmadaPelanggan());
      }
      if (e.key === STORAGE_KEYS.ARMADA_LOKASI) {
        skipNextSpsSyncRef.current = true;
        setLokasi(loadStoredArmadaLokasi());
      }
      if (e.key === STORAGE_KEYS.ARMADA_TARIF) {
        skipNextSpsSyncRef.current = true;
        setTarif(loadStoredArmadaTarif());
      }
      if (e.key === STORAGE_KEYS.ARMADA_PERJALANAN) {
        skipNextSpsSyncRef.current = true;
        setPerjalanan(loadStoredArmadaPerjalanan());
      }
      if (e.key === STORAGE_KEYS.ARMADA_UANG_JALAN) {
        skipNextSpsSyncRef.current = true;
        setUangJalan(loadStoredArmadaUangJalan());
      }
      if (e.key === STORAGE_KEYS.ARMADA_SEWA) {
        skipNextSpsSyncRef.current = true;
        setSewaList(loadStoredArmadaSewa());
      }
      if (e.key === STORAGE_KEYS.ARMADA_P2H) {
        skipNextSpsSyncRef.current = true;
        setP2hList(loadStoredArmadaP2H());
      }
      if (e.key === STORAGE_KEYS.ARMADA_MAINTENANCE) {
        skipNextSpsSyncRef.current = true;
        setMaintenanceList(loadStoredArmadaMaintenance());
      }
      if (e.key === STORAGE_KEYS.ARMADA_PERMINTAAN_BARANG) {
        skipNextSpsSyncRef.current = true;
        setPermintaanBarang(loadStoredArmadaPermintaanBarang());
      }
      if (e.key === STORAGE_KEYS.ARMADA_KENDALA) {
        skipNextSpsSyncRef.current = true;
        setKendalaList(loadStoredArmadaKendala());
      }
      if (e.key === STORAGE_KEYS.ARMADA_ACCOUNTS) {
        skipNextSpsSyncRef.current = true;
        setAccounts(loadStoredArmadaAccounts());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const actorName = session?.nama || session?.username || session?.email || 'Admin Armada';

  // ==========================================
  // MASTER DATA HANDLERS
  // ==========================================
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
        ? `Perubahan unit ${input.kodeUnit} disimpan.`
        : `Unit baru ${input.kodeUnit} ditambahkan.`,
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

  const handleToggleUnitStatus = (unit: ArmadaUnit) => {
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

  const handleSavePelanggan = (input: ArmadaPelangganInput): ArmadaPelanggan => {
    const now = new Date().toISOString();
    let saved: ArmadaPelanggan | null = null;
    setPelanggan((prev) => {
      let next: ArmadaPelanggan[];
      if (input.id) {
        next = prev.map((p) => {
          if (p.id !== input.id) return p;
          const updated: ArmadaPelanggan = {
            ...p,
            idPelanggan: input.idPelanggan,
            namaPt: input.namaPt,
            pic: input.pic,
            kontak: input.kontak,
            status: input.status,
            catatan: input.catatan || '',
            updatedAt: now,
          };
          saved = updated;
          return updated;
        });
      } else {
        const created: ArmadaPelanggan = {
          id: `PLG-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
          idPelanggan: input.idPelanggan,
          namaPt: input.namaPt,
          pic: input.pic,
          kontak: input.kontak,
          status: input.status,
          catatan: input.catatan || '',
          createdAt: now,
          updatedAt: now,
        };
        saved = created;
        next = [created, ...prev];
      }
      saveStoredArmadaPelanggan(next);
      return next;
    });
    notify(`Data pelanggan ${input.namaPt} disimpan.`);
    return (
      saved || {
        id: input.id || `PLG-${Date.now()}`,
        idPelanggan: input.idPelanggan,
        namaPt: input.namaPt,
        pic: input.pic,
        kontak: input.kontak,
        status: input.status,
        createdAt: now,
        updatedAt: now,
      }
    );
  };

  const handleTogglePelangganStatus = (item: ArmadaPelanggan) => {
    const nextStatus = item.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    const now = new Date().toISOString();
    setPelanggan((prev) => {
      const next = prev.map((p) =>
        p.id === item.id ? { ...p, status: nextStatus as 'Aktif' | 'Nonaktif', updatedAt: now } : p,
      );
      saveStoredArmadaPelanggan(next);
      return next;
    });
    notify(`Status pelanggan ${item.namaPt} diubah menjadi ${nextStatus}.`);
  };

  const handleSaveLokasi = (input: ArmadaLokasiInput): ArmadaLokasi => {
    const now = new Date().toISOString();
    let saved: ArmadaLokasi | null = null;
    setLokasi((prev) => {
      let next: ArmadaLokasi[];
      if (input.id) {
        next = prev.map((l) => {
          if (l.id !== input.id) return l;
          const updated: ArmadaLokasi = {
            ...l,
            idLokasi: input.idLokasi,
            pelangganId: input.pelangganId,
            namaLokasi: input.namaLokasi,
            alamatLengkap: input.alamatLengkap,
            jenisLokasi: input.jenisLokasi,
            status: input.status,
            catatan: input.catatan || '',
            updatedAt: now,
          };
          saved = updated;
          return updated;
        });
      } else {
        const created: ArmadaLokasi = {
          id: `LOK-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
          idLokasi: input.idLokasi,
          pelangganId: input.pelangganId,
          namaLokasi: input.namaLokasi,
          alamatLengkap: input.alamatLengkap,
          jenisLokasi: input.jenisLokasi,
          status: input.status,
          catatan: input.catatan || '',
          createdAt: now,
          updatedAt: now,
        };
        saved = created;
        next = [created, ...prev];
      }
      saveStoredArmadaLokasi(next);
      return next;
    });
    notify(`Lokasi ${input.namaLokasi} (${input.jenisLokasi}) disimpan.`);
    return (
      saved || {
        id: input.id || `LOK-${Date.now()}`,
        idLokasi: input.idLokasi,
        pelangganId: input.pelangganId,
        namaLokasi: input.namaLokasi,
        alamatLengkap: input.alamatLengkap,
        jenisLokasi: input.jenisLokasi,
        status: input.status,
        createdAt: now,
        updatedAt: now,
      }
    );
  };

  const handleToggleLokasiStatus = (item: ArmadaLokasi) => {
    const nextStatus = item.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    const now = new Date().toISOString();
    setLokasi((prev) => {
      const next = prev.map((l) =>
        l.id === item.id ? { ...l, status: nextStatus as 'Aktif' | 'Nonaktif', updatedAt: now } : l,
      );
      saveStoredArmadaLokasi(next);
      return next;
    });
    notify(`Status lokasi ${item.namaLokasi} diubah menjadi ${nextStatus}.`);
  };

  const handleSaveTarif = (input: ArmadaTarifInput): ArmadaTarif => {
    const now = new Date().toISOString();
    let saved: ArmadaTarif | null = null;
    setTarif((prev) => {
      let next: ArmadaTarif[];
      if (input.id) {
        next = prev.map((t) => {
          if (t.id !== input.id) return t;
          const updated: ArmadaTarif = {
            ...t,
            idTarif: input.idTarif || t.idTarif,
            pelangganId: input.pelangganId,
            lokasiMuatId: input.lokasiMuatId,
            lokasiBongkarId: input.lokasiBongkarId,
            jenisKendaraan: input.jenisKendaraan,
            dasarTarif: input.dasarTarif,
            nominal: input.nominal,
            tanggalMulaiBerlaku: input.tanggalMulaiBerlaku,
            status: input.status,
            catatan: input.catatan || '',
            updatedAt: now,
          };
          saved = updated;
          return updated;
        });
      } else {
        const code =
          input.idTarif ||
          generateNextArmadaCode(
            'TRF',
            prev.map((t) => t.idTarif),
          );
        const created: ArmadaTarif = {
          id: `TRF-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
          idTarif: code,
          pelangganId: input.pelangganId,
          lokasiMuatId: input.lokasiMuatId,
          lokasiBongkarId: input.lokasiBongkarId,
          jenisKendaraan: input.jenisKendaraan,
          dasarTarif: input.dasarTarif,
          nominal: input.nominal,
          tanggalMulaiBerlaku: input.tanggalMulaiBerlaku,
          status: input.status,
          catatan: input.catatan || '',
          createdAt: now,
          updatedAt: now,
        };
        saved = created;
        next = [created, ...prev];
      }
      saveStoredArmadaTarif(next);
      return next;
    });
    notify(`Tarif ${input.jenisKendaraan} (${input.dasarTarif}) disimpan.`);
    return (
      saved || {
        id: input.id || `TRF-${Date.now()}`,
        idTarif: input.idTarif || 'TRF',
        pelangganId: input.pelangganId,
        lokasiMuatId: input.lokasiMuatId,
        lokasiBongkarId: input.lokasiBongkarId,
        jenisKendaraan: input.jenisKendaraan,
        dasarTarif: input.dasarTarif,
        nominal: input.nominal,
        tanggalMulaiBerlaku: input.tanggalMulaiBerlaku,
        status: input.status,
        createdAt: now,
        updatedAt: now,
      }
    );
  };

  const handleToggleTarifStatus = (item: ArmadaTarif) => {
    const nextStatus = item.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    const now = new Date().toISOString();
    setTarif((prev) => {
      const next = prev.map((t) =>
        t.id === item.id ? { ...t, status: nextStatus as 'Aktif' | 'Nonaktif', updatedAt: now } : t,
      );
      saveStoredArmadaTarif(next);
      return next;
    });
    notify(`Status tarif ${item.idTarif} diubah menjadi ${nextStatus}.`);
  };

  // ==========================================
  // PERJALANAN & UANG JALAN HANDLERS
  // ==========================================
  const handleSavePerjalanan = (input: ArmadaPerjalananInput): ArmadaPerjalanan => {
    const now = new Date().toISOString();
    const num =
      input.nomorPenugasan ||
      generateNextArmadaCode(
        'PRJ',
        perjalanan.map((p) => p.nomorPenugasan),
      );
    const seqNum = num.replace(/\D/g, '') || '001';
    const created: ArmadaPerjalanan = {
      id: `PRJ-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      nomorPenugasan: num,
      nomorSuratJalan: input.nomorSuratJalan?.trim() || `SJ/SPD/${new Date().getFullYear()}/${seqNum}`,
      nomorManifest: input.nomorManifest?.trim() || undefined,
      jenisLimbah: input.jenisLimbah?.trim() || undefined,
      kodeLimbah: input.kodeLimbah?.trim() || undefined,
      kemasanLimbah: input.kemasanLimbah?.trim() || undefined,
      estimasiMuatan: input.estimasiMuatan?.trim() || undefined,
      unitId: input.unitId,
      sopirNama: input.sopirNama,
      pelangganId: input.pelangganId,
      lokasiMuatId: input.lokasiMuatId,
      lokasiBongkarId: input.lokasiBongkarId,
      tarifId: input.tarifId,
      dasarTarif: input.dasarTarif,
      nominalTarif: input.nominalTarif,
      tanggalMulai: input.tanggalMulai,
      jamMulai: input.jamMulai,
      tanggalSelesai: input.tanggalSelesai,
      jamSelesai: input.jamSelesai,
      waktuTibaMuat: input.waktuTibaMuat?.trim() || undefined,
      waktuMuatMulai: input.waktuMuatMulai?.trim() || undefined,
      waktuMuatSelesai: input.waktuMuatSelesai?.trim() || undefined,
      waktuTibaBongkar: input.waktuTibaBongkar?.trim() || undefined,
      waktuBongkarMulai: input.waktuBongkarMulai?.trim() || undefined,
      waktuBongkarSelesai: input.waktuBongkarSelesai?.trim() || undefined,
      status: 'Dijadwalkan',
      tahapPerjalanan: 'Belum Mulai',
      catatan: input.catatan || '',
      createdAt: now,
      updatedAt: now,
    };
    setPerjalanan((prev) => {
      const next = [created, ...prev];
      saveStoredArmadaPerjalanan(next);
      return next;
    });
    notify(`Perjalanan ${created.nomorPenugasan} berhasil dijadwalkan.`);
    return created;
  };

  const handleStartPerjalanan = (prj: ArmadaPerjalanan) => {
    const now = new Date().toISOString();
    setPerjalanan((prev) => {
      const next = prev.map((p) =>
        p.id === prj.id
          ? {
              ...p,
              status: 'Berjalan' as const,
              tahapPerjalanan: 'Menuju Muat' as const,
              mulaiAktual: now,
              updatedAt: now,
            }
          : p,
      );
      saveStoredArmadaPerjalanan(next);
      return next;
    });
    notify(`Perjalanan ${prj.nomorPenugasan} dimulai.`);
  };

  const handleMarkSelesaiMuat = (prj: ArmadaPerjalanan) => {
    const now = new Date().toISOString();
    setPerjalanan((prev) => {
      const next = prev.map((p) =>
        p.id === prj.id
          ? {
              ...p,
              status: 'Berjalan' as const,
              tahapPerjalanan: 'Selesai Muat' as const,
              selesaiMuatAktual: now,
              updatedAt: now,
            }
          : p,
      );
      saveStoredArmadaPerjalanan(next);
      return next;
    });
    notify(`Tahap Selesai Muat dicatat untuk ${prj.nomorPenugasan}.`);
  };

  const handleMarkSelesaiBongkar = (params: {
    perjalananId: string;
    buktiBongkarDataUrl?: string;
    buktiBongkarNama?: string;
  }) => {
    const now = new Date().toISOString();
    setPerjalanan((prev) => {
      const next = prev.map((p) =>
        p.id === params.perjalananId
          ? {
              ...p,
              status: 'Selesai' as const,
              tahapPerjalanan: 'Selesai Bongkar' as const,
              selesaiBongkarAktual: now,
              selesaiAktual: now,
              buktiBongkarDataUrl: params.buktiBongkarDataUrl || p.buktiBongkarDataUrl,
              buktiBongkarNama: params.buktiBongkarNama || p.buktiBongkarNama,
              updatedAt: now,
            }
          : p,
      );
      saveStoredArmadaPerjalanan(next);
      return next;
    });
    notify('Selesai Bongkar tercatat. Perjalanan selesai.');
  };

  const handleCompletePerjalanan = (prj: ArmadaPerjalanan) => {
    handleMarkSelesaiBongkar({ perjalananId: prj.id });
  };

  const handleCreateUangJalan = (params: {
    perjalananId: string;
    nominalDiajukan: number;
    keperluan: string;
  }): ArmadaUangJalan => {
    const now = new Date().toISOString();
    const nomor = generateNextArmadaCode(
      'UJ',
      uangJalan.map((u) => u.nomorUangJalan),
    );
    const created: ArmadaUangJalan = {
      id: `UJ-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      nomorUangJalan: nomor,
      perjalananId: params.perjalananId,
      status: 'Diajukan',
      nominalDiajukan: params.nominalDiajukan,
      keperluan: params.keperluan,
      diajukanOleh: actorName,
      tanggalDiajukan: getTodayISO(),
      rincianPengeluaran: [],
      totalPengeluaran: 0,
      createdAt: now,
      updatedAt: now,
    };
    setUangJalan((prev) => {
      const next = [created, ...prev];
      saveStoredArmadaUangJalan(next);
      return next;
    });
    notify(`Pengajuan Uang Jalan ${created.nomorUangJalan} dibuat.`);
    return created;
  };

  const handleDisburseUangJalan = (params: {
    id: string;
    nominalDicairkan: number;
    tanggalPencairan: string;
    metodePencairan: 'Tunai' | 'Transfer';
    buktiPencairanDataUrl?: string;
    buktiPencairanNama?: string;
  }) => {
    const now = new Date().toISOString();
    const target = uangJalan.find((u) => u.id === params.id);
    const prj = target ? perjalanan.find((p) => p.id === target.perjalananId) : undefined;
    const unit = prj ? units.find((u) => u.id === prj.unitId) : undefined;

    // Record real cash outflow in Kas & Tonase!
    const kasEntry = recordArmadaKasTonaseTransaction({
      tanggal: params.tanggalPencairan,
      jenis: 'Keluar',
      ket: `Pencairan Uang Jalan ${target?.nomorUangJalan || ''} (${
        prj?.nomorPenugasan || '-'
      } · ${unit?.kodeUnit || '-'})`,
      nominal: params.nominalDicairkan,
      metode: params.metodePencairan,
      mitra: prj?.sopirNama || 'Sopir Armada',
      diinputOleh: actorName,
    });

    setUangJalan((prev) => {
      const next = prev.map((u) =>
        u.id === params.id
          ? {
              ...u,
              status: 'Dicairkan' as const,
              nominalDicairkan: params.nominalDicairkan,
              tanggalPencairan: params.tanggalPencairan,
              metodePencairan: params.metodePencairan,
              buktiPencairanDataUrl: params.buktiPencairanDataUrl,
              buktiPencairanNama: params.buktiPencairanNama,
              dicairkanOleh: actorName,
              kasOpsPencairanId: kasEntry.id,
              updatedAt: now,
            }
          : u,
      );
      saveStoredArmadaUangJalan(next);
      return next;
    });
    notify(
      `Uang Jalan ${target?.nomorUangJalan || ''} dicairkan & otomatis dicatat di Kas & Tonase.`,
    );
  };

  const handleSubmitPertanggungjawaban = (params: {
    id: string;
    rincianPengeluaran: UangJalanExpenseItem[];
    catatanPertanggungjawaban: string;
  }) => {
    const now = new Date().toISOString();
    const total = params.rincianPengeluaran.reduce((s, it) => s + (it.nominal || 0), 0);
    setUangJalan((prev) => {
      const next = prev.map((u) =>
        u.id === params.id
          ? {
              ...u,
              status: 'Dipertanggungjawabkan' as const,
              rincianPengeluaran: params.rincianPengeluaran,
              totalPengeluaran: total,
              tanggalPertanggungjawaban: getTodayISO(),
              dipertanggungjawabkanOleh: actorName,
              catatanPertanggungjawaban: params.catatanPertanggungjawaban,
              updatedAt: now,
            }
          : u,
      );
      saveStoredArmadaUangJalan(next);
      return next;
    });
    notify('Pertanggungjawaban pengeluaran uang jalan berhasil disimpan.');
  };

  const handleVerifyFinishUangJalan = (params: {
    id: string;
    tanggalPenyelesaian: string;
    metodePenyelesaian: 'Tunai' | 'Transfer';
    catatanVerifikasi: string;
  }) => {
    const now = new Date().toISOString();
    const target = uangJalan.find((u) => u.id === params.id);
    if (!target) return;
    const prj = perjalanan.find((p) => p.id === target.perjalananId);
    const selisih = (target.nominalDicairkan || 0) - target.totalPengeluaran;

    let kasSettleId: string | undefined;
    let statusPenyelesaian: 'Pas' | 'Sisa Dikembalikan' | 'Kekurangan Dibayarkan' = 'Pas';

    if (selisih > 0) {
      statusPenyelesaian = 'Sisa Dikembalikan';
      const kasEntry = recordArmadaKasTonaseTransaction({
        tanggal: params.tanggalPenyelesaian,
        jenis: 'Masuk',
        ket: `Pengembalian sisa Uang Jalan ${target.nomorUangJalan} (${
          prj?.nomorPenugasan || '-'
        })`,
        nominal: selisih,
        metode: params.metodePenyelesaian,
        mitra: prj?.sopirNama || 'Sopir Armada',
        diinputOleh: actorName,
      });
      kasSettleId = kasEntry.id;
    } else if (selisih < 0) {
      statusPenyelesaian = 'Kekurangan Dibayarkan';
      const kasEntry = recordArmadaKasTonaseTransaction({
        tanggal: params.tanggalPenyelesaian,
        jenis: 'Keluar',
        ket: `Pembayaran kekurangan Uang Jalan ${target.nomorUangJalan} (${
          prj?.nomorPenugasan || '-'
        })`,
        nominal: Math.abs(selisih),
        metode: params.metodePenyelesaian,
        mitra: prj?.sopirNama || 'Sopir Armada',
        diinputOleh: actorName,
      });
      kasSettleId = kasEntry.id;
    }

    setUangJalan((prev) => {
      const next = prev.map((u) =>
        u.id === params.id
          ? {
              ...u,
              status: 'Selesai' as const,
              selisih,
              statusPenyelesaian,
              tanggalPenyelesaian: params.tanggalPenyelesaian,
              metodePenyelesaian: params.metodePenyelesaian,
              catatanVerifikasi: params.catatanVerifikasi,
              diverifikasiOleh: actorName,
              kasOpsPenyelesaianId: kasSettleId,
              updatedAt: now,
            }
          : u,
      );
      saveStoredArmadaUangJalan(next);
      return next;
    });
    notify(
      kasSettleId
        ? `Uang Jalan ${target.nomorUangJalan} selesai (${statusPenyelesaian}) & dicatat di Kas & Tonase.`
        : `Uang Jalan ${target.nomorUangJalan} diverifikasi & selesai.`,
    );
  };

  // ==========================================
  // SEWA UNIT HANDLERS
  // ==========================================
  const handleCreateSewa = (input: Omit<ArmadaSewaUnit, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const created: ArmadaSewaUnit = {
      ...input,
      id: `SEWA-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      createdAt: now,
      updatedAt: now,
    };
    setSewaList((prev) => {
      const next = [created, ...prev];
      saveStoredArmadaSewa(next);
      return next;
    });
    notify(`Pemesanan sewa ${created.nomorSewa} dikonfirmasi (Status: Dipesan).`);
  };

  const handleHandoverSewa = (params: {
    id: string;
    serahTerimaTanggal: string;
    serahTerimaJam: string;
    kmAwal: number;
    kondisiAwal: string;
    buktiSerahTerimaDataUrl?: string;
    buktiSerahTerimaNama?: string;
  }) => {
    const now = new Date().toISOString();
    setSewaList((prev) => {
      const next = prev.map((s) =>
        s.id === params.id
          ? {
              ...s,
              status: 'Sedang Disewa' as const,
              serahTerimaTanggal: params.serahTerimaTanggal,
              serahTerimaJam: params.serahTerimaJam,
              kmAwal: params.kmAwal,
              kondisiAwal: params.kondisiAwal,
              buktiSerahTerimaDataUrl: params.buktiSerahTerimaDataUrl,
              buktiSerahTerimaNama: params.buktiSerahTerimaNama,
              updatedAt: now,
            }
          : s,
      );
      saveStoredArmadaSewa(next);
      return next;
    });
    notify('Serah terima unit tercatat (Status: Sedang Disewa).');
  };

  const handleReturnSewa = (params: {
    id: string;
    kembaliTanggal: string;
    kembaliJam: string;
    kmAkhir: number;
    kondisiKembali: string;
    catatanKerusakan?: string;
    buktiKembaliDataUrl?: string;
    buktiKembaliNama?: string;
    waktuTibaMuat?: string;
    waktuMuatMulai?: string;
    waktuMuatSelesai?: string;
    waktuTibaBongkar?: string;
    waktuBongkarMulai?: string;
    waktuBongkarSelesai?: string;
  }) => {
    const now = new Date().toISOString();
    setSewaList((prev) => {
      const next = prev.map((s) =>
        s.id === params.id
          ? {
              ...s,
              status: 'Dikembalikan' as const,
              kembaliTanggal: params.kembaliTanggal,
              kembaliJam: params.kembaliJam,
              kmAkhir: params.kmAkhir,
              kondisiKembali: params.kondisiKembali,
              catatanKerusakan: params.catatanKerusakan,
              buktiKembaliDataUrl: params.buktiKembaliDataUrl,
              buktiKembaliNama: params.buktiKembaliNama,
              waktuTibaMuat: params.waktuTibaMuat || s.waktuTibaMuat,
              waktuMuatMulai: params.waktuMuatMulai || s.waktuMuatMulai,
              waktuMuatSelesai: params.waktuMuatSelesai || s.waktuMuatSelesai,
              waktuTibaBongkar: params.waktuTibaBongkar || s.waktuTibaBongkar,
              waktuBongkarMulai: params.waktuBongkarMulai || s.waktuBongkarMulai,
              waktuBongkarSelesai: params.waktuBongkarSelesai || s.waktuBongkarSelesai,
              updatedAt: now,
            }
          : s,
      );
      saveStoredArmadaSewa(next);
      return next;
    });
    notify('Unit diterima kembali (Status: Dikembalikan).');
  };

  // ==========================================
  // P2H, MAINTENANCE, PERMINTAAN BARANG & KENDALA HANDLERS
  // ==========================================
  const handleSubmitP2H = (params: {
    perjalananId: string;
    sopirNama: string;
    kilometer: number;
    items: P2HChecklistItem[];
    isPemeriksaanUlang?: boolean;
  }): { ok: boolean; error?: string } => {
    const prj = perjalanan.find((p) => p.id === params.perjalananId);
    if (!prj) return { ok: false, error: 'Penugasan tidak ditemukan.' };
    // Strict driver ownership check
    if (prj.sopirNama.trim().toLowerCase() !== params.sopirNama.trim().toLowerCase()) {
      return {
        ok: false,
        error: `Akses ditolak: Akun sopir "${params.sopirNama}" hanya boleh mengisi P2H untuk unit yang ditugaskan kepadanya.`,
      };
    }
    const unit = units.find((u) => u.id === prj.unitId);
    if (!unit) return { ok: false, error: 'Unit kendaraan tidak ditemukan.' };

    const now = new Date().toISOString();
    const temuan = params.items.filter((it) => it.kondisi === 'Ada Temuan');
    const adaKritis = temuan.some((it) => it.kritis);
    const nomorP2H = generateNextArmadaCode(
      'P2H',
      p2hList.map((p) => p.nomorP2H),
    );
    const created: ArmadaP2HRecord = {
      id: `P2H-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      nomorP2H,
      perjalananId: prj.id,
      nomorPenugasan: prj.nomorPenugasan,
      unitId: unit.id,
      kodeUnit: unit.kodeUnit,
      nomorPolisi: unit.nomorPolisi,
      sopirNama: prj.sopirNama,
      kilometer: params.kilometer,
      tanggalIsi: now,
      isPemeriksaanUlang: params.isPemeriksaanUlang,
      items: params.items,
      jumlahTemuan: temuan.length,
      adaTemuanKritis: adaKritis,
      statusTinjauan:
        temuan.length === 0
          ? params.isPemeriksaanUlang
            ? 'Selesai / Lulus Ulang'
            : 'Lolos'
          : adaKritis
            ? 'Ditahan (Temuan Kritis)'
            : 'Menunggu Tinjauan',
      maintenanceIds: [],
      createdAt: now,
      updatedAt: now,
    };

    setP2hList((prev) => {
      const next = [created, ...prev];
      saveStoredArmadaP2H(next);
      return next;
    });
    notify(
      adaKritis
        ? `${nomorP2H} terkirim dengan temuan kritis. Mulai Perjalanan ditahan sampai perbaikan & pemeriksaan ulang.`
        : `${nomorP2H} berhasil dikirim ke Admin Armada.`,
    );
    return { ok: true };
  };

  const handleCreateMaintenanceFromP2H = (params: {
    p2h: ArmadaP2HRecord;
    item: P2HChecklistItem;
  }): ArmadaMaintenanceRequest => {
    const now = new Date().toISOString();
    const nomor = generateNextArmadaCode(
      'MNT',
      maintenanceList.map((m) => m.nomorPengajuan),
    );
    const created: ArmadaMaintenanceRequest = {
      id: `MNT-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      nomorPengajuan: nomor,
      sumber: 'Temuan P2H',
      unitId: params.p2h.unitId,
      kodeUnit: params.p2h.kodeUnit,
      nomorPolisi: params.p2h.nomorPolisi,
      perjalananId: params.p2h.perjalananId,
      p2hId: params.p2h.id,
      nomorP2H: params.p2h.nomorP2H,
      itemTemuan: params.item.label,
      kritis: params.item.kritis,
      kilometer: params.p2h.kilometer,
      catatan: params.item.catatan || `Temuan P2H pada ${params.item.label}`,
      fotoDataUrl: params.item.fotoDataUrl,
      fotoNama: params.item.fotoNama,
      status: 'Diajukan',
      diajukanOleh: actorName,
      tanggalDiajukan: getTodayISO(),
      createdAt: now,
      updatedAt: now,
    };

    setMaintenanceList((prev) => {
      const next = [created, ...prev];
      saveStoredArmadaMaintenance(next);
      return next;
    });
    setP2hList((prev) => {
      const next = prev.map((rec) =>
        rec.id === params.p2h.id
          ? {
              ...rec,
              statusTinjauan: 'Dalam Perbaikan' as const,
              maintenanceIds: [...new Set([...rec.maintenanceIds, created.id])],
              updatedAt: now,
            }
          : rec,
      );
      saveStoredArmadaP2H(next);
      return next;
    });
    notify(`Pengajuan Perbaikan ${nomor} dibuat dari ${params.p2h.nomorP2H}.`);
    return created;
  };

  const handleCreateManualMaintenance = (params: {
    unitId: string;
    kilometer: number;
    catatan: string;
    kritis: boolean;
    fotoDataUrl?: string;
    fotoNama?: string;
  }): ArmadaMaintenanceRequest => {
    const now = new Date().toISOString();
    const unit = units.find((u) => u.id === params.unitId);
    const nomor = generateNextArmadaCode(
      'MNT',
      maintenanceList.map((m) => m.nomorPengajuan),
    );
    const created: ArmadaMaintenanceRequest = {
      id: `MNT-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      nomorPengajuan: nomor,
      sumber: 'Laporan Manual',
      unitId: params.unitId,
      kodeUnit: unit?.kodeUnit || '-',
      nomorPolisi: unit?.nomorPolisi || '-',
      kritis: params.kritis,
      kilometer: params.kilometer,
      catatan: params.catatan,
      fotoDataUrl: params.fotoDataUrl,
      fotoNama: params.fotoNama,
      status: 'Diajukan',
      diajukanOleh: actorName,
      tanggalDiajukan: getTodayISO(),
      createdAt: now,
      updatedAt: now,
    };
    setMaintenanceList((prev) => {
      const next = [created, ...prev];
      saveStoredArmadaMaintenance(next);
      return next;
    });
    notify(`Pengajuan Perbaikan manual ${nomor} berhasil dibuat.`);
    return created;
  };

  const handleReviewMaintenance = (params: {
    id: string;
    prioritas: MaintenancePriority;
    mekanikAtauBengkel: string;
    catatanTinjauan?: string;
  }) => {
    const now = new Date().toISOString();
    setMaintenanceList((prev) => {
      const next = prev.map((m) =>
        m.id === params.id
          ? {
              ...m,
              status: 'Ditinjau' as const,
              prioritas: params.prioritas,
              mekanikAtauBengkel: params.mekanikAtauBengkel,
              catatanTinjauan: params.catatanTinjauan,
              ditinjauOleh: actorName,
              tanggalDitinjau: getTodayISO(),
              updatedAt: now,
            }
          : m,
      );
      saveStoredArmadaMaintenance(next);
      return next;
    });
    notify('Pengajuan perbaikan disetujui & ditugaskan ke mekanik.');
  };

  const handleUpdateWorkProgress = (params: {
    id: string;
    status: 'Dikerjakan' | 'Menunggu Barang';
    tindakanPerbaikan: string;
  }) => {
    const now = new Date().toISOString();
    setMaintenanceList((prev) => {
      const next = prev.map((m) =>
        m.id === params.id
          ? {
              ...m,
              status: params.status,
              tindakanPerbaikan: params.tindakanPerbaikan,
              updatedAt: now,
            }
          : m,
      );
      saveStoredArmadaMaintenance(next);
      return next;
    });
    notify(`Status perbaikan diperbarui menjadi ${params.status}.`);
  };

  const handleCompleteRepairWork = (params: { id: string; hasilPekerjaan: string }) => {
    const now = new Date().toISOString();
    setMaintenanceList((prev) => {
      const next = prev.map((m) =>
        m.id === params.id
          ? {
              ...m,
              status: 'Selesai' as const,
              hasilPekerjaan: params.hasilPekerjaan,
              tanggalSelesai: getTodayISO(),
              updatedAt: now,
            }
          : m,
      );
      saveStoredArmadaMaintenance(next);
      return next;
    });
    notify('Hasil pekerjaan mekanik disimpan. Siap pemeriksaan ulang Kepala Armada.');
  };

  const handleReleaseUnitHold = (params: { id: string; hasilPemeriksaanUlang: string }) => {
    const now = new Date().toISOString();
    const target = maintenanceList.find((m) => m.id === params.id);
    setMaintenanceList((prev) => {
      const next = prev.map((m) =>
        m.id === params.id
          ? {
              ...m,
              hasilPemeriksaanUlang: params.hasilPemeriksaanUlang,
              pemeriksaanUlangOleh: actorName,
              tanggalPemeriksaanUlang: getTodayISO(),
              penahananDilepas: true,
              tanggalPenahananDilepas: now,
              updatedAt: now,
            }
          : m,
      );
      saveStoredArmadaMaintenance(next);
      return next;
    });
    if (target?.p2hId) {
      setP2hList((prev) => {
        const next = prev.map((p) =>
          p.id === target.p2hId
            ? {
                ...p,
                statusTinjauan: 'Selesai / Lulus Ulang' as const,
                catatanAdmin: params.hasilPemeriksaanUlang,
                updatedAt: now,
              }
            : p,
        );
        saveStoredArmadaP2H(next);
        return next;
      });
    }
    notify(`Pemeriksaan ulang dicatat & penahanan unit ${target?.kodeUnit || ''} dilepas.`);
  };

  const handleEnsurePengajuanBarangDriveFolder = async () => {
    setIsEnsuringPbDrive(true);
    try {
      const folderUrl = await ensurePengajuanBarangDriveFolderFromSPS();
      if (folderUrl) {
        setPengajuanBarangDriveUrl(folderUrl);
        localStorage.setItem('spd_armada_pb_drive_url', folderUrl);
        notify('Folder Google Drive khusus "Pengajuan Barang" siap & tersambung.');
      } else {
        notify(
          'Permintaan pembuatan folder "Pengajuan Barang" dikirim ke Drive Armada. Pastikan Apps Script terbaru sudah diterapkan.',
        );
      }
    } finally {
      setIsEnsuringPbDrive(false);
    }
  };

  const handleCreatePermintaanBarang = (params: {
    maintenanceId: string;
    dimintaOleh: string;
    items: Array<{ namaBarang: string; satuan: string; jumlahDiminta: number }>;
    catatan?: string;
    fotoDataUrl?: string;
    fotoNama?: string;
  }) => {
    const maint = maintenanceList.find((m) => m.id === params.maintenanceId);
    if (!maint) return;
    const now = new Date().toISOString();
    const nomor = generateNextArmadaCode(
      'PB',
      permintaanBarang.map((b) => b.nomorPermintaan),
    );
    const createdItems: PermintaanBarangItem[] = params.items.map((it, idx) => ({
      id: `PBI-${Date.now()}-${idx + 1}`,
      namaBarang: it.namaBarang,
      satuan: it.satuan,
      jumlahDiminta: it.jumlahDiminta,
      jumlahDisetujui: it.jumlahDiminta,
      jumlahDiterima: 0,
    }));
    const created: ArmadaPermintaanBarang = {
      id: `PB-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      nomorPermintaan: nomor,
      maintenanceId: maint.id,
      nomorPengajuanPerbaikan: maint.nomorPengajuan,
      unitId: maint.unitId,
      kodeUnit: maint.kodeUnit,
      nomorPolisi: maint.nomorPolisi,
      tanggalPermintaan: getTodayISO(),
      dimintaOleh: params.dimintaOleh,
      items: createdItems,
      status: computePermintaanBarangStatus(createdItems),
      catatan: params.catatan,
      fotoDataUrl: params.fotoDataUrl,
      fotoNama: params.fotoNama,
      driveFolderUrl: pengajuanBarangDriveUrl || GOOGLE_ARMADA_DRIVE_FOLDER_URL,
      createdAt: now,
      updatedAt: now,
    };
    setPermintaanBarang((prev) => {
      const next = [created, ...prev];
      saveStoredArmadaPermintaanBarang(next);
      return next;
    });
    // Move maintenance to Menunggu Barang automatically if currently Ditinjau/Dikerjakan
    if (maint.status === 'Ditinjau' || maint.status === 'Dikerjakan') {
      setMaintenanceList((prev) => {
        const next = prev.map((m) =>
          m.id === maint.id ? { ...m, status: 'Menunggu Barang' as const, updatedAt: now } : m,
        );
        saveStoredArmadaMaintenance(next);
        return next;
      });
    }
    notify(
      params.fotoDataUrl
        ? `Permintaan Barang ${nomor} dibuat & foto dikirim ke folder Drive Pengajuan Barang.`
        : `Permintaan Barang ${nomor} dibuat untuk ${maint.nomorPengajuan}.`,
    );
  };

  const handleCreatePermintaanBarangFromSopir = (params: {
    unitId: string;
    sopirNama: string;
    items: Array<{ namaBarang: string; satuan: string; jumlahDiminta: number }>;
    catatan?: string;
    fotoDataUrl?: string;
    fotoNama?: string;
  }) => {
    const unit = units.find((u) => u.id === params.unitId);
    const now = new Date().toISOString();
    const nomor = generateNextArmadaCode(
      'PB',
      permintaanBarang.map((b) => b.nomorPermintaan),
    );
    const createdItems: PermintaanBarangItem[] = params.items.map((it, idx) => ({
      id: `PBI-${Date.now()}-${idx + 1}`,
      namaBarang: it.namaBarang,
      satuan: it.satuan,
      jumlahDiminta: it.jumlahDiminta,
      jumlahDisetujui: 0,
      jumlahDiterima: 0,
    }));
    const created: ArmadaPermintaanBarang = {
      id: `PB-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      nomorPermintaan: nomor,
      maintenanceId: '',
      nomorPengajuanPerbaikan: 'Pengajuan Sopir',
      unitId: unit?.id || '',
      kodeUnit: unit?.kodeUnit || '-',
      nomorPolisi: unit?.nomorPolisi || '-',
      tanggalPermintaan: getTodayISO(),
      dimintaOleh: params.sopirNama,
      items: createdItems,
      status: computePermintaanBarangStatus(createdItems),
      catatan: params.catatan,
      fotoDataUrl: params.fotoDataUrl,
      fotoNama: params.fotoNama,
      driveFolderUrl: pengajuanBarangDriveUrl || GOOGLE_ARMADA_DRIVE_FOLDER_URL,
      createdAt: now,
      updatedAt: now,
    };
    setPermintaanBarang((prev) => {
      const next = [created, ...prev];
      saveStoredArmadaPermintaanBarang(next);
      return next;
    });
    notify(
      params.fotoDataUrl
        ? `Pengajuan Barang ${nomor} dari ${params.sopirNama} tercatat & foto disimpan ke folder Drive Pengajuan Barang.`
        : `Pengajuan Barang ${nomor} dari ${params.sopirNama} tercatat di menu Permintaan Barang.`,
    );
  };

  const handleUpdatePermintaanBarangItems = (params: {
    id: string;
    items: PermintaanBarangItem[];
  }) => {
    const now = new Date().toISOString();
    const nextStatus = computePermintaanBarangStatus(params.items);
    setPermintaanBarang((prev) => {
      const next = prev.map((req) =>
        req.id === params.id
          ? { ...req, items: params.items, status: nextStatus, updatedAt: now }
          : req,
      );
      saveStoredArmadaPermintaanBarang(next);
      return next;
    });
  };

  const handleSubmitKendala = (params: {
    perjalananId: string;
    sopirNama: string;
    kategori: ArmadaKendalaKategori;
    catatan: string;
    fotoDataUrl?: string;
    fotoNama?: string;
  }) => {
    const prj = perjalanan.find((p) => p.id === params.perjalananId);
    const unit = prj ? units.find((u) => u.id === prj.unitId) : undefined;
    const now = new Date().toISOString();
    const nomor = generateNextArmadaCode(
      'KND',
      kendalaList.map((k) => k.nomorLaporan),
    );
    const created: ArmadaKendalaReport = {
      id: `KND-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      nomorLaporan: nomor,
      perjalananId: params.perjalananId,
      nomorPenugasan: prj?.nomorPenugasan || '-',
      unitId: unit?.id || '',
      kodeUnit: unit?.kodeUnit || '-',
      nomorPolisi: unit?.nomorPolisi || '-',
      sopirNama: params.sopirNama,
      kategori: params.kategori,
      catatan: params.catatan,
      fotoDataUrl: params.fotoDataUrl,
      fotoNama: params.fotoNama,
      status: 'Dilaporkan',
      waktuLapor: now,
      updatedAt: now,
    };
    setKendalaList((prev) => {
      const next = [created, ...prev];
      saveStoredArmadaKendala(next);
      return next;
    });
    notify(`Laporan kendala ${nomor} terkirim ke Admin Armada.`);
  };

  // ==========================================
  // UNIFIED SPS ARMADA WORKBOOK EXPORT / IMPORT
  // ==========================================
  const handleExportSpsWorkbook = () => {
    exportSpsArmadaWorkbook({ units, pelanggan, lokasi, tarif });
    notify('File SPS Armada (.xlsx) dengan tab Unit Armada, Pelanggan, Lokasi & Tarif diunduh.');
  };

  const handleImportMasterDataFile = async (
    file: File,
    preferredTab: MasterDataTabKey | 'all' = 'all',
  ): Promise<SpsArmadaImportResult | null> => {
    try {
      const result = await importSpsArmadaWorkbook(
        file,
        { units, pelanggan, lokasi, tarif },
        preferredTab,
      );
      if (result.tabsFound.length === 0) {
        notify('Tidak ditemukan tab Unit Armada / Pelanggan / Lokasi / Tarif pada file tersebut.');
        return result;
      }
      setUnits(result.dataset.units);
      setPelanggan(result.dataset.pelanggan);
      setLokasi(result.dataset.lokasi);
      setTarif(result.dataset.tarif);
      saveStoredArmadaUnits(result.dataset.units);
      saveStoredArmadaPelanggan(result.dataset.pelanggan);
      saveStoredArmadaLokasi(result.dataset.lokasi);
      saveStoredArmadaTarif(result.dataset.tarif);
      notify(
        `Impor Master Data selesai (${result.counts.units} unit, ${result.counts.pelanggan} pelanggan, ${result.counts.lokasi} lokasi, ${result.counts.tarif} tarif).`,
      );
      return result;
    } catch {
      notify('Gagal membaca file impor. Pastikan format .xlsx, .xls, atau .csv valid.');
      return null;
    }
  };

  const handleImportSpsWorkbook = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await handleImportMasterDataFile(file, 'all');
  };

  // ==========================================
  // KELOLA AKUN KHUSUS ARMADA (SPS ARMADA)
  // ==========================================
  const handleSaveArmadaAccount = (input: ArmadaAccountInput) => {
    const now = new Date().toISOString();
    setAccounts((prev) => {
      let next: ArmadaAccount[];
      if (input.id) {
        next = prev.map((a) => {
          if (a.id !== input.id) return a;
          return {
            ...a,
            idAkun: input.idAkun || a.idAkun || a.id,
            namaLengkap: input.namaLengkap,
            username: input.username,
            passwordPin: input.passwordPin ? input.passwordPin : a.passwordPin,
            roleAkses: input.roleAkses,
            status: input.status,
            unitUtamaKode: input.unitUtamaKode,
            catatan: input.catatan || '',
            updatedAt: now,
          };
        });
        notify(`Akun Armada "${input.username}" diperbarui dan dikirim ke SPS Armada.`);
      } else {
        const nextCode =
          input.idAkun ||
          generateNextArmadaCode(
            'ARM-USR',
            prev.map((a) => a.idAkun || a.id),
          );
        const created: ArmadaAccount = {
          id: nextCode,
          idAkun: nextCode,
          namaLengkap: input.namaLengkap,
          username: input.username,
          passwordPin: input.passwordPin || 'SPD123',
          roleAkses: input.roleAkses,
          status: input.status,
          unitUtamaKode: input.unitUtamaKode,
          catatan: input.catatan || '',
          createdAt: now,
          updatedAt: now,
        };
        next = [created, ...prev];
        notify(`Akun Armada "${created.username}" disimpan ke tab Akun Armada (SPS Armada).`);
      }
      saveStoredArmadaAccounts(next);
      return next;
    });
  };

  const handleDeleteArmadaAccount = (account: ArmadaAccount) => {
    setAccounts((prev) => {
      const next = prev.filter((a) => a.id !== account.id);
      saveStoredArmadaAccounts(next);
      return next;
    });
    notify(`Akun Armada "${account.username}" dihapus dari SPS Armada.`);
  };

  const handlePushAllToSps = async () => {
    setIsSyncingSps(true);
    try {
      await pushAllArmadaToSPS({
        units,
        pelanggan,
        lokasi,
        tarif,
        perjalanan,
        uangJalan,
        sewa: sewaList,
        p2h: p2hList,
        maintenance: maintenanceList,
        permintaanBarang,
        kendala: kendalaList,
        accounts,
      });
      notify('Seluruh tab data & Akun Armada dikirim ke SPS Armada.');
    } catch {
      notify('Gagal mengirim data ke SPS Armada. Periksa koneksi atau deployment Apps Script.');
    } finally {
      setIsSyncingSps(false);
    }
  };

  const handleUploadUnitBerkas = async (
    unit: ArmadaUnit,
    payload: {
      jenis: ArmadaUnitBerkas['jenis'];
      berlakuSampai?: string;
      catatan?: string;
      fileName: string;
      dataUrl: string;
    },
  ) => {
    const now = new Date().toISOString();
    const newBerkas: ArmadaUnitBerkas = {
      id: `BRK_${Date.now()}_${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      jenis: payload.jenis,
      namaFile: payload.fileName,
      berlakuSampai: payload.berlakuSampai,
      catatan: payload.catatan,
      driveUrl: unit.driveFolderUrl || GOOGLE_ARMADA_DRIVE_FOLDER_URL,
      uploadedAt: now,
      uploadedBy: actorName,
    };

    try {
      await uploadArmadaFileToDrive({
        nomorPolisi: unit.nomorPolisi,
        kodeUnit: unit.kodeUnit,
        kategori: 'Berkas Kendaraan',
        refNumber: `${payload.jenis}_${unit.kodeUnit}`,
        fileName: payload.fileName,
        dataUrl: payload.dataUrl,
        catatan: payload.catatan,
      });
    } catch {
      // Tetap simpan metadata lokal jika offline
    }

    setUnits((prev) => {
      const next = prev.map((u) =>
        u.id === unit.id
          ? {
              ...u,
              berkasList: [newBerkas, ...(u.berkasList || [])],
              updatedAt: now,
            }
          : u,
      );
      saveStoredArmadaUnits(next);
      return next;
    });

    notify(
      `Dokumen ${payload.jenis} (${payload.fileName}) dikirim ke folder Google Drive ${unit.nomorPolisi}.`,
    );
  };

  // ==========================================
  // DASHBOARD METRICS & FILTERING
  // ==========================================
  const stats = useMemo(() => {
    const total = units.length;
    const aktif = units.filter((u) => u.status === 'Aktif').length;
    const beroperasi = units.filter(
      (u) => u.status === 'Aktif' && u.statusOperasional === 'Beroperasi',
    ).length;
    const perjalananAktif = perjalanan.filter(
      (p) => p.status === 'Dijadwalkan' || p.status === 'Berjalan',
    ).length;
    const sewaAktif = sewaList.filter((s) => s.status === 'Sedang Disewa').length;
    const sewaOverdue = sewaList.filter((s) => isSewaOverdue(s)).length;
    const p2hKritis = p2hList.filter(
      (p) => p.adaTemuanKritis && p.statusTinjauan !== 'Selesai / Lulus Ulang',
    ).length;
    const maintAktif = maintenanceList.filter((m) => m.status !== 'Selesai').length;
    return {
      total,
      aktif,
      beroperasi,
      perjalananAktif,
      sewaAktif,
      sewaOverdue,
      p2hKritis,
      maintAktif,
    };
  }, [maintenanceList, p2hList, perjalanan, sewaList, units]);

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
        !(u.supirUtama || '').toLowerCase().includes(q)
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

  const openMenu = (menu: ArmadaMenuId) => {
    setActiveMenu(menu);
    const parentGroup = MENU_GROUP_MAP[menu];
    if (parentGroup) {
      setExpandedGroups((prev) => (prev[parentGroup] ? prev : { ...prev, [parentGroup]: true }));
    }
    setMobileMenuOpen(false);
  };

  const toggleNavGroup = (groupTitle: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupTitle]: !prev[groupTitle] }));
  };

  // ==========================================
  // AUTH GATES
  // ==========================================
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
            Sesi login belum aktif. Mengarahkan ke halaman masuk...
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

  if (!canAccessArmadaSession(session)) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="t-card rounded-2xl p-7 max-w-lg w-full space-y-5 shadow-xl">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl t-status-warn flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-display t-text">
                Akses Terbatas — Khusus Super Admin &amp; Sopir
              </h1>
              <p className="text-xs t-muted mt-1 leading-relaxed">
                Halaman <b>Sistem Operasional dan Pemantauan Armada</b> hanya dapat diakses oleh
                akun dengan role <b>Super Admin</b> atau <b>Sopir</b>.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl t-subtle border t-border text-xs space-y-1">
            <div className="flex justify-between">
              <span className="t-muted">Akun aktif:</span>
              <span className="font-bold t-text">{actorName}</span>
            </div>
            <div className="flex justify-between">
              <span className="t-muted">Role:</span>
              <span className="font-bold t-text">{session.role || '-'}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t t-border">
            <button
              type="button"
              onClick={handleLogoutAndSwitch}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl t-btn-primary text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Ganti Akun</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  // DEDICATED MOBILE-FIRST VIEW WHEN LOGGED IN DIRECTLY AS SOPIR
  if (isActiveSopirSession(session)) {
    const lockedDriver = session.nama || session.username || 'Dedi Kurniawan';
    return (
      <div className="min-h-screen flex flex-col">
        <header className="m-3 mb-0 t-sidebar rounded-2xl px-4 py-3 flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="px-2.5 py-1.5 rounded-xl border border-white/15 shrink-0"
              style={{ background: SPD_NAVY_GRADIENT }}
            >
              <SpdLogoWordmark variant="on-dark" size="xs" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">Armada · Tugas Saya</div>
              <div className="text-[10px] truncate" style={{ color: 'var(--text-sidebar-muted)' }}>
                {lockedDriver} (Sopir)
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void refreshArmadaFromSPS(true)}
              disabled={isSyncingSps}
              aria-label="Sinkronkan SPS Armada"
              className="p-2 rounded-xl bg-white/10 text-white"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingSps ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleCycleTheme}
              aria-label="Ganti tema"
              className="p-2 rounded-xl bg-white/10 text-white"
            >
              <Palette className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleLogoutAndSwitch}
              aria-label="Keluar"
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white/10 text-xs font-semibold text-white"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-5">
          <TugasSayaSopirPage
            lockedSopirName={lockedDriver}
            perjalananList={perjalanan}
            units={units}
            pelangganList={pelanggan}
            lokasiList={lokasi}
            uangJalanList={uangJalan}
            p2hList={p2hList}
            maintenanceList={maintenanceList}
            kendalaList={kendalaList}
            permintaanBarangList={permintaanBarang}
            onSubmitP2H={handleSubmitP2H}
            onStartPerjalanan={handleStartPerjalanan}
            onMarkSelesaiMuat={handleMarkSelesaiMuat}
            onMarkSelesaiBongkar={handleMarkSelesaiBongkar}
            onSubmitKendala={handleSubmitKendala}
            onSubmitPertanggungjawaban={handleSubmitPertanggungjawaban}
            onSubmitPermintaanBarang={handleCreatePermintaanBarangFromSopir}
          />
        </main>

        {toastMsg && (
          <div
            role="status"
            className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 px-4 py-3 rounded-xl t-status-ok shadow-xl text-xs font-bold flex items-center gap-2 border border-current/15"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}
      </div>
    );
  }

  // SUPER ADMIN / ADMIN ARMADA FULL APPLICATION SHELL
  const navGroups: Array<{
    title: string;
    icon: typeof Database;
    collapsible?: boolean;
    items: Array<{
      id: ArmadaMenuId;
      label: string;
      icon: typeof Truck;
      count?: number;
    }>;
  }> = [
    {
      title: 'Operasional',
      icon: LayoutDashboard,
      items: [
        { id: 'armada-dashboard', label: 'Dashboard Armada', icon: LayoutDashboard },
        { id: 'armada-tugas-saya', label: 'Tugas Saya (HP Sopir)', icon: Smartphone },
      ],
    },
    {
      title: 'Perjalanan & Sewa',
      icon: Route,
      collapsible: true,
      items: [
        { id: 'armada-perjalanan', label: 'Perjalanan', icon: Route, count: perjalanan.length },
        { id: 'armada-uang-jalan', label: 'Uang Jalan', icon: Wallet, count: uangJalan.length },
        { id: 'armada-sewa-unit', label: 'Sewa Unit', icon: KeyRound, count: sewaList.length },
      ],
    },
    {
      title: 'P2H & Maintenance',
      icon: Wrench,
      collapsible: true,
      items: [
        { id: 'armada-hasil-p2h', label: 'Hasil P2H', icon: ClipboardCheck, count: p2hList.length },
        {
          id: 'armada-maintenance',
          label: 'Pengajuan Perbaikan',
          icon: Wrench,
          count: maintenanceList.length,
        },
        {
          id: 'armada-permintaan-barang',
          label: 'Permintaan Barang',
          icon: Package,
          count: permintaanBarang.length,
        },
      ],
    },
    {
      title: 'Master Data',
      icon: Database,
      collapsible: true,
      items: [
        { id: 'armada-master-unit', label: 'Unit Armada', icon: Truck, count: units.length },
        {
          id: 'armada-master-pelanggan',
          label: 'Pelanggan',
          icon: Building2,
          count: pelanggan.length,
        },
        {
          id: 'armada-master-lokasi',
          label: 'Lokasi Muat–Bongkar',
          icon: MapPin,
          count: lokasi.length,
        },
        { id: 'armada-master-tarif', label: 'Tarif', icon: Banknote, count: tarif.length },
      ],
    },
    {
      title: 'Pengaturan Armada',
      icon: Users,
      items: [
        {
          id: 'armada-akun',
          label: 'Kelola Akun Armada',
          icon: Users,
          count: accounts.length,
        },
      ],
    },
  ];

  const renderSidebarNav = () => (
    <nav className="space-y-2.5" aria-label="Navigasi Armada">
      {navGroups.map((group) => {
        const GroupIcon = group.icon;
        const hasActiveChild = group.items.some((item) => item.id === activeMenu);
        const isOpen = group.collapsible ? Boolean(expandedGroups[group.title]) : true;

        return (
          <div key={group.title} className="space-y-1">
            {group.collapsible ? (
              <button
                type="button"
                onClick={() => toggleNavGroup(group.title)}
                aria-expanded={isOpen}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-[12px] font-bold tracking-wide transition-colors cursor-pointer ${
                  isOpen || hasActiveChild
                    ? 'bg-white/12 text-white'
                    : 'bg-white/5 hover:bg-white/10 text-white/85'
                }`}
              >
                <span className="inline-flex items-center gap-2 min-w-0">
                  <GroupIcon className="w-4 h-4 shrink-0" />
                  <span className="truncate uppercase">{group.title}</span>
                </span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            ) : (
              <div
                className="px-2.5 pt-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--text-sidebar-muted)' }}
              >
                <GroupIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{group.title}</span>
              </div>
            )}

            {isOpen && (
              <div
                className={
                  group.collapsible
                    ? 'pl-2.5 ml-2.5 border-l border-white/15 space-y-1 pt-0.5'
                    : 'space-y-1'
                }
              >
                {group.items.map((item) => {
                  const active = activeMenu === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openMenu(item.id)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[13px] leading-snug font-semibold transition-colors ${
                        active ? 'font-bold shadow-xs' : 't-sidebar-btn'
                      }`}
                      style={
                        active
                          ? { backgroundColor: 'var(--btn-gold)', color: 'var(--btn-gold-text)' }
                          : undefined
                      }
                    >
                      <span className="inline-flex items-center gap-2.5 min-w-0">
                        <ArmadaMenuIcon id={item.id} size={22} onDark={!active} />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {typeof item.count === 'number' && (
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[11px] font-mono-num font-bold shrink-0 ${
                            active ? 'bg-black/15' : 'bg-white/10 text-white/85'
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Hidden input for SPS Armada Excel import */}
      <input
        ref={spsInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleImportSpsWorkbook}
      />

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:sticky lg:top-0 lg:h-screen shrink-0 p-4 pr-0">
        <div className="t-sidebar rounded-3xl flex-1 flex flex-col justify-between p-4 shadow-xl overflow-y-auto gap-4">
          <div className="space-y-4">
            <div
              className="p-3.5 rounded-2xl border border-white/15 flex items-center justify-between gap-2"
              style={{ background: SPD_NAVY_GRADIENT }}
            >
              <SpdLogoWordmark variant="on-dark" size="md" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/85">
                Armada
              </span>
            </div>

            {renderSidebarNav()}
          </div>

          <div className="pt-3 border-t border-white/10 space-y-2">
            {/* Live Google Sheet SPS Armada Sync */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => void refreshArmadaFromSPS(true)}
                disabled={isSyncingSps}
                title="Tarik data terbaru dari Google Sheet SPS Armada"
                className="inline-flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-white"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSps ? 'animate-spin' : ''}`} />
                <span>Tarik SPS</span>
              </button>
              <button
                type="button"
                onClick={() => void handlePushAllToSps()}
                disabled={isSyncingSps}
                title="Kirim seluruh tab Armada & Akun Armada ke Google Sheet SPS Armada"
                className="inline-flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-white"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span>Kirim SPS</span>
              </button>
            </div>

            {/* Unified SPS Armada Excel Export & Import */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={handleExportSpsWorkbook}
                title="Unduh file SPS Armada (.xlsx) berisi tab Unit Armada, Pelanggan, Lokasi, dan Tarif"
                className="inline-flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-white"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>SPS .xlsx</span>
              </button>
              <button
                type="button"
                onClick={() => spsInputRef.current?.click()}
                title="Impor perubahan dari file SPS Armada (.xlsx)"
                className="inline-flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-white"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Impor SPS</span>
              </button>
            </div>

            <a
              href={GOOGLE_ARMADA_DRIVE_FOLDER_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Buka Google Drive Armada (folder otomatis per nomor polisi)"
              className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-white"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Folder Drive Armada</span>
            </a>

            <div className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <div className="text-xs font-bold text-white truncate">{actorName}</div>
              <div
                className="inline-flex items-center gap-1 text-[10px] font-semibold mt-0.5"
                style={{ color: 'var(--accent-highlight)' }}
              >
                <ShieldCheck className="w-3 h-3" />
                <span>{session.role}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={handleCycleTheme}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white"
              >
                <Palette className="w-4 h-4 shrink-0" />
                <span>{THEME_LABELS[theme]}</span>
              </button>
              <button
                type="button"
                onClick={handleLogoutAndSwitch}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white/90"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Keluar</span>
              </button>
            </div>
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
              {MENU_TITLE_MAP[activeMenu]}
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
        <div className="lg:hidden mx-3 mt-2 t-sidebar rounded-2xl p-3 space-y-3 shadow-lg">
          {renderSidebarNav()}
          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => void refreshArmadaFromSPS(true)}
                disabled={isSyncingSps}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 text-xs text-white font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSps ? 'animate-spin' : ''}`} />
                <span>Tarik SPS</span>
              </button>
              <button
                type="button"
                onClick={() => void handlePushAllToSps()}
                disabled={isSyncingSps}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 text-xs text-white font-semibold"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span>Kirim SPS</span>
              </button>
              <button
                type="button"
                onClick={handleExportSpsWorkbook}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 text-xs text-white font-semibold"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>SPS .xlsx</span>
              </button>
              <button
                type="button"
                onClick={handleCycleTheme}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 text-xs text-white font-semibold"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>{THEME_LABELS[theme]}</span>
              </button>
            </div>
            <button
              type="button"
              onClick={handleLogoutAndSwitch}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 text-xs text-white/85 font-semibold"
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
          {/* Main Module Header Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b t-border">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl t-subtle border t-border flex items-center justify-center shrink-0">
                <ArmadaMenuIcon id={activeMenu} size={46} onDark={theme === 'dark'} />
              </div>
              <div className="min-w-0">
                <div className="text-xs t-muted flex items-center gap-1.5 mb-0.5">
                  <span>Sistem Armada</span>
                  <span aria-hidden="true">/</span>
                  <span className="t-text font-medium">{MENU_GROUP_MAP[activeMenu]}</span>
                </div>
                <h1 className="text-xl sm:text-2xl leading-tight font-display font-bold tracking-[-0.02em] t-text truncate">
                  {MENU_TITLE_MAP[activeMenu]}
                </h1>
                <p className="text-xs t-muted mt-0.5 truncate">
                  Sistem Operasional dan Pemantauan Armada &middot; PT. Sarana Putra Daerah
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => openMenu('armada-tugas-saya')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap ${
                  activeMenu === 'armada-tugas-saya' ? 't-btn-primary' : 't-btn-secondary'
                }`}
              >
                <Smartphone className="w-4 h-4 shrink-0" />
                <span>Mode HP Sopir</span>
              </button>
            </div>
          </div>

          {/* ROUTE VIEWS */}
          {activeMenu === 'armada-master-unit' && (
            <UnitArmadaPage
              units={units}
              perjalananList={perjalanan}
              p2hList={p2hList}
              maintenanceList={maintenanceList}
              permintaanBarangList={permintaanBarang}
              pelangganList={pelanggan}
              lokasiList={lokasi}
              selectedUnitId={selectedUnitId}
              onSelectUnit={setSelectedUnitId}
              onSaveUnit={handleSaveUnit}
              onToggleStatus={handleToggleUnitStatus}
              onOpenPerjalanan={(id) => {
                setSelectedPerjalananId(id);
                openMenu('armada-perjalanan');
              }}
              onOpenP2H={(id) => {
                setSelectedP2HId(id);
                openMenu('armada-hasil-p2h');
              }}
              onOpenMaintenance={(id) => {
                setSelectedMaintenanceId(id);
                openMenu('armada-maintenance');
              }}
              onUploadUnitBerkas={handleUploadUnitBerkas}
              onExportWorkbook={handleExportSpsWorkbook}
              onImportMasterData={handleImportMasterDataFile}
            />
          )}

          {activeMenu === 'armada-master-pelanggan' && (
            <PelangganPage
              pelangganList={pelanggan}
              lokasiList={lokasi}
              tarifList={tarif}
              onSavePelanggan={handleSavePelanggan}
              onToggleStatus={handleTogglePelangganStatus}
              onOpenLokasiForPelanggan={(plgId, openCreate) => {
                setLokasiFilterPlgId(plgId);
                setLokasiAutoOpen(Boolean(openCreate));
                openMenu('armada-master-lokasi');
              }}
              onOpenTarifForPelanggan={(plgId, openCreate) => {
                setTarifFilterPlgId(plgId);
                setTarifAutoOpen(Boolean(openCreate));
                openMenu('armada-master-tarif');
              }}
              onExportWorkbook={handleExportSpsWorkbook}
              onImportMasterData={handleImportMasterDataFile}
            />
          )}

          {activeMenu === 'armada-master-lokasi' && (
            <LokasiPage
              lokasiList={lokasi}
              pelangganList={pelanggan}
              initialPelangganFilter={lokasiFilterPlgId}
              autoOpenCreate={lokasiAutoOpen}
              onConsumeAutoOpen={() => setLokasiAutoOpen(false)}
              onSaveLokasi={handleSaveLokasi}
              onToggleStatus={handleToggleLokasiStatus}
              onExportWorkbook={handleExportSpsWorkbook}
              onImportMasterData={handleImportMasterDataFile}
            />
          )}

          {activeMenu === 'armada-master-tarif' && (
            <TarifPage
              tarifList={tarif}
              pelangganList={pelanggan}
              lokasiList={lokasi}
              units={units}
              initialPelangganFilter={tarifFilterPlgId}
              autoOpenCreate={tarifAutoOpen}
              onConsumeAutoOpen={() => setTarifAutoOpen(false)}
              onSaveTarif={handleSaveTarif}
              onToggleStatus={handleToggleTarifStatus}
              onExportWorkbook={handleExportSpsWorkbook}
              onImportMasterData={handleImportMasterDataFile}
            />
          )}

          {activeMenu === 'armada-akun' && (
            <AkunArmadaPage
              accounts={accounts}
              units={units}
              currentUsername={session.username || session.email || ''}
              isSyncing={isSyncingSps}
              onRefreshSps={() => void refreshArmadaFromSPS(true)}
              onSaveAccount={handleSaveArmadaAccount}
              onDeleteAccount={handleDeleteArmadaAccount}
            />
          )}

          {activeMenu === 'armada-perjalanan' && (
            <PerjalananPage
              perjalananList={perjalanan}
              sewaList={sewaList}
              units={units}
              pelangganList={pelanggan}
              lokasiList={lokasi}
              tarifList={tarif}
              uangJalanList={uangJalan}
              p2hList={p2hList}
              maintenanceList={maintenanceList}
              selectedPerjalananId={selectedPerjalananId}
              onSelectPerjalanan={setSelectedPerjalananId}
              onSavePerjalanan={handleSavePerjalanan}
              onStartPerjalanan={handleStartPerjalanan}
              onCompletePerjalanan={handleCompletePerjalanan}
              onCreateUangJalan={handleCreateUangJalan}
              onOpenUangJalan={(ujId) => {
                setSelectedUangJalanId(ujId);
                openMenu('armada-uang-jalan');
              }}
              onOpenP2H={(p2hId) => {
                setSelectedP2HId(p2hId);
                openMenu('armada-hasil-p2h');
              }}
            />
          )}

          {activeMenu === 'armada-uang-jalan' && (
            <UangJalanPage
              uangJalanList={uangJalan}
              perjalananList={perjalanan}
              units={units}
              pelangganList={pelanggan}
              lokasiList={lokasi}
              selectedUangJalanId={selectedUangJalanId}
              onSelectUangJalan={setSelectedUangJalanId}
              onOpenPerjalanan={(prjId) => {
                setSelectedPerjalananId(prjId);
                openMenu('armada-perjalanan');
              }}
              onDisburseUangJalan={handleDisburseUangJalan}
              onSubmitPertanggungjawaban={handleSubmitPertanggungjawaban}
              onVerifyFinishUangJalan={handleVerifyFinishUangJalan}
            />
          )}

          {activeMenu === 'armada-sewa-unit' && (
            <SewaUnitPage
              sewaList={sewaList}
              perjalananList={perjalanan}
              units={units}
              pelangganList={pelanggan}
              onCreateSewa={handleCreateSewa}
              onHandoverSewa={handleHandoverSewa}
              onReturnSewa={handleReturnSewa}
            />
          )}

          {activeMenu === 'armada-tugas-saya' && (
            <TugasSayaSopirPage
              perjalananList={perjalanan}
              units={units}
              pelangganList={pelanggan}
              lokasiList={lokasi}
              uangJalanList={uangJalan}
              p2hList={p2hList}
              maintenanceList={maintenanceList}
              kendalaList={kendalaList}
              permintaanBarangList={permintaanBarang}
              onSubmitP2H={handleSubmitP2H}
              onStartPerjalanan={handleStartPerjalanan}
              onMarkSelesaiMuat={handleMarkSelesaiMuat}
              onMarkSelesaiBongkar={handleMarkSelesaiBongkar}
              onSubmitKendala={handleSubmitKendala}
              onSubmitPertanggungjawaban={handleSubmitPertanggungjawaban}
              onSubmitPermintaanBarang={handleCreatePermintaanBarangFromSopir}
            />
          )}

          {activeMenu === 'armada-hasil-p2h' && (
            <HasilP2HPage
              p2hList={p2hList}
              maintenanceList={maintenanceList}
              selectedP2HId={selectedP2HId}
              onSelectP2H={setSelectedP2HId}
              onCreateMaintenanceFromP2H={handleCreateMaintenanceFromP2H}
              onOpenMaintenance={(maintId) => {
                setSelectedMaintenanceId(maintId);
                openMenu('armada-maintenance');
              }}
            />
          )}

          {activeMenu === 'armada-maintenance' && (
            <MaintenancePage
              maintenanceList={maintenanceList}
              permintaanBarangList={permintaanBarang}
              units={units}
              selectedMaintenanceId={selectedMaintenanceId}
              onSelectMaintenance={setSelectedMaintenanceId}
              onCreateManualMaintenance={handleCreateManualMaintenance}
              onReviewMaintenance={handleReviewMaintenance}
              onUpdateWorkProgress={handleUpdateWorkProgress}
              onCompleteRepairWork={handleCompleteRepairWork}
              onReleaseUnitHold={handleReleaseUnitHold}
              onCreatePermintaanBarang={handleCreatePermintaanBarang}
              onUpdatePermintaanBarangItems={handleUpdatePermintaanBarangItems}
              onOpenP2H={(p2hId) => {
                setSelectedP2HId(p2hId);
                openMenu('armada-hasil-p2h');
              }}
              onOpenUnitDetail={(uId) => {
                setSelectedUnitId(uId);
                openMenu('armada-master-unit');
              }}
            />
          )}

          {activeMenu === 'armada-permintaan-barang' && (
            <PermintaanBarangPage
              permintaanBarangList={permintaanBarang}
              driveFolderUrl={pengajuanBarangDriveUrl || GOOGLE_ARMADA_DRIVE_FOLDER_URL}
              hasDirectDriveFolder={Boolean(pengajuanBarangDriveUrl)}
              isEnsuringDriveFolder={isEnsuringPbDrive}
              onEnsureDriveFolder={handleEnsurePengajuanBarangDriveFolder}
              onUpdateItems={handleUpdatePermintaanBarangItems}
              onOpenMaintenance={(maintId) => {
                setSelectedMaintenanceId(maintId);
                openMenu('armada-maintenance');
              }}
            />
          )}

          {activeMenu === 'armada-dashboard' && (
            <section className="space-y-5">
              {/* 4 Operational KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="t-card-accent p-5 rounded-2xl flex flex-col justify-between gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: 'var(--card-accent-muted)' }}
                      >
                        Unit Armada
                      </span>
                      <div className="text-2xl sm:text-[26px] font-display font-bold text-white mt-1.5 tabular-nums leading-tight">
                        {stats.total} Unit
                      </div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/15 flex items-center justify-center shrink-0">
                      <ArmadaMenuIcon id="armada-master-unit" size={30} onDark={true} />
                    </div>
                  </div>
                  <div className="text-xs text-white/80">
                    {stats.aktif} Aktif &middot; {pelanggan.length} Pelanggan &middot;{' '}
                    {lokasi.length} Lokasi
                  </div>
                </div>

                <div
                  onClick={() => openMenu('armada-perjalanan')}
                  className="t-card p-5 rounded-2xl flex flex-col justify-between gap-2 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="t-field-label">Perjalanan Aktif</span>
                      <div className="text-2xl sm:text-[26px] font-display font-bold t-text mt-1.5 tabular-nums leading-tight">
                        {stats.perjalananAktif} Trip
                      </div>
                    </div>
                    <div className="w-11 h-11 rounded-xl t-subtle border t-border flex items-center justify-center shrink-0">
                      <ArmadaMenuIcon id="armada-perjalanan" size={30} onDark={theme === 'dark'} />
                    </div>
                  </div>
                  <div className="text-xs t-muted">
                    {uangJalan.length} pengajuan uang jalan tercatat
                  </div>
                </div>

                <div
                  onClick={() => openMenu('armada-sewa-unit')}
                  className="t-card p-5 rounded-2xl flex flex-col justify-between gap-2 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="t-field-label">Unit Sedang Disewa</span>
                      <div className="text-2xl sm:text-[26px] font-display font-bold t-text mt-1.5 tabular-nums leading-tight">
                        {stats.sewaAktif} Unit
                      </div>
                    </div>
                    <div className="w-11 h-11 rounded-xl t-subtle border t-border flex items-center justify-center shrink-0">
                      <ArmadaMenuIcon id="armada-sewa-unit" size={30} onDark={theme === 'dark'} />
                    </div>
                  </div>
                  <div className="text-xs t-muted">
                    {stats.sewaOverdue > 0
                      ? `${stats.sewaOverdue} lewat jadwal, belum kembali`
                      : 'Semua sesuai jadwal sewa'}
                  </div>
                </div>

                <div
                  onClick={() => openMenu('armada-hasil-p2h')}
                  className="t-card p-5 rounded-2xl flex flex-col justify-between gap-2 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="t-field-label">P2H Kritis &amp; Perbaikan</span>
                      <div
                        className="text-2xl sm:text-[26px] font-display font-bold mt-1.5 tabular-nums leading-tight"
                        style={{
                          color:
                            stats.p2hKritis > 0
                              ? 'var(--status-bad-text)'
                              : 'var(--status-ok-text)',
                        }}
                      >
                        {stats.p2hKritis} Kritis
                      </div>
                    </div>
                    <div className="w-11 h-11 rounded-xl t-subtle border t-border flex items-center justify-center shrink-0">
                      <ArmadaMenuIcon id="armada-maintenance" size={30} onDark={theme === 'dark'} />
                    </div>
                  </div>
                  <div className="text-xs t-muted">
                    {stats.maintAktif} perbaikan aktif &middot; {kendalaList.length} laporan kendala
                  </div>
                </div>
              </div>

              {/* Latest Laporan Kendala from Sopir (if any) */}
              {kendalaList.length > 0 && (
                <div className="t-card rounded-2xl p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="font-bold t-text inline-flex items-center gap-1.5">
                      <AlertTriangle
                        className="w-4 h-4"
                        style={{ color: 'var(--status-warn-text)' }}
                      />
                      <span>Laporan Kendala Terbaru dari Sopir ({kendalaList.length})</span>
                    </div>
                  </div>
                  <div className="divide-y t-border">
                    {kendalaList.slice(0, 3).map((knd) => (
                      <div
                        key={knd.id}
                        className="py-2 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-mono-num font-bold t-link">
                            {knd.nomorLaporan}
                          </span>{' '}
                          <span className="font-semibold t-text">
                            ({knd.kodeUnit} · {knd.sopirNama}) — {knd.kategori}:
                          </span>{' '}
                          <span className="t-muted">{knd.catatan}</span>
                        </div>
                        <span className="font-bold t-text">{knd.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fleet Monitoring Table */}
              <div className="t-card rounded-2xl overflow-hidden">
                <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b t-border flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl t-subtle border t-border flex items-center justify-center shrink-0">
                      <ArmadaMenuIcon id="armada-master-unit" size={26} onDark={theme === 'dark'} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm sm:text-base font-display font-bold t-text leading-snug">
                        Pemantauan Unit Armada
                      </h2>
                      <p className="text-[11px] sm:text-xs t-muted mt-0.5 leading-relaxed">
                        Ketuk unit kendaraan untuk membuka <b>Detail Unit</b> beserta seluruh
                        riwayat Perjalanan, P2H, dan Perbaikan.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                      <Search className="w-3.5 h-3.5 t-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari ARM-001 / nopol / supir..."
                        className="text-xs pl-8 pr-3 py-2.5 sm:py-2 rounded-xl t-input w-full sm:w-56"
                      />
                    </div>

                    <select
                      value={statusFilter}
                      onChange={(e) =>
                        setStatusFilter(e.target.value as 'ALL' | ArmadaOperationalStatus)
                      }
                      aria-label="Filter status armada"
                      className="text-xs px-3 py-2.5 sm:py-2 rounded-xl t-input font-semibold w-full sm:w-auto"
                    >
                      <option value="ALL">Semua Status</option>
                      <option value="Beroperasi">Beroperasi</option>
                      <option value="Stand-by">Stand-by</option>
                      <option value="Servis">Servis</option>
                    </select>
                  </div>
                </div>

                {/* Mobile Card List */}
                <div className="md:hidden divide-y t-border">
                  {filteredDashboardUnits.length === 0 ? (
                    <div className="p-5 text-center text-xs t-muted">
                      Tidak ada unit armada yang cocok dengan filter pencarian.
                    </div>
                  ) : (
                    filteredDashboardUnits.map((unit) => {
                      const opStatus: ArmadaOperationalStatus =
                        unit.status === 'Nonaktif'
                          ? 'Servis'
                          : unit.statusOperasional || 'Stand-by';
                      const statusColor =
                        unit.status === 'Nonaktif' || opStatus === 'Servis'
                          ? 'var(--status-warn-text)'
                          : opStatus === 'Beroperasi'
                            ? 'var(--status-ok-text)'
                            : 'var(--status-info-text)';
                      return (
                        <button
                          key={unit.id}
                          type="button"
                          onClick={() => {
                            setSelectedUnitId(unit.id);
                            openMenu('armada-master-unit');
                          }}
                          className="w-full text-left p-4 space-y-2 t-row-hover active:opacity-80 transition-opacity"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold font-mono-num t-link">
                                  {unit.kodeUnit}
                                </span>
                                <span className="text-xs font-mono-num font-semibold t-text">
                                  {unit.nomorPolisi}
                                </span>
                              </div>
                              <div className="text-xs font-semibold t-text mt-0.5">
                                {unit.jenisKendaraan}
                                <span className="font-normal t-muted">
                                  {' '}
                                  &middot; {[unit.merek, unit.model].filter(Boolean).join(' ') || '-'}
                                  {unit.supirUtama && unit.supirUtama !== '-'
                                    ? ` · ${unit.supirUtama}`
                                    : ''}
                                </span>
                              </div>
                            </div>
                            <span
                              className="text-[11px] font-bold shrink-0 px-2 py-0.5 rounded-lg t-subtle border t-border"
                              style={{ color: statusColor }}
                            >
                              {unit.status === 'Nonaktif' ? 'Nonaktif' : opStatus}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
                            <div className="min-w-0 flex items-center gap-1 t-text font-medium truncate">
                              <MapPin className="w-3.5 h-3.5 t-link shrink-0" />
                              <span className="truncate">
                                {unit.lokasiTerakhir || 'Pool Utama PT. SPD'}
                                {unit.ruteAktif && unit.ruteAktif !== '-'
                                  ? ` · ${unit.ruteAktif}`
                                  : ''}
                              </span>
                            </div>
                            <span className="inline-flex items-center gap-1 t-muted shrink-0">
                              <Clock className="w-3 h-3" />
                              <span>{unit.updateTerakhir || '-'}</span>
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="t-subtle border-b t-border">
                        <th className="py-3.5 px-5 t-th-label">Unit &amp; No. Polisi</th>
                        <th className="py-3.5 px-4 t-th-label">Jenis &amp; Supir</th>
                        <th className="py-3.5 px-4 t-th-label">Lokasi &amp; Aktivitas</th>
                        <th className="py-3.5 px-4 t-th-label">Status</th>
                        <th className="py-3.5 px-5 t-th-label text-right">Update</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y t-border">
                      {filteredDashboardUnits.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center t-muted">
                            Tidak ada unit armada yang cocok dengan filter pencarian.
                          </td>
                        </tr>
                      ) : (
                        filteredDashboardUnits.map((unit) => {
                          const opStatus: ArmadaOperationalStatus =
                            unit.status === 'Nonaktif'
                              ? 'Servis'
                              : unit.statusOperasional || 'Stand-by';
                          return (
                            <tr
                              key={unit.id}
                              onClick={() => {
                                setSelectedUnitId(unit.id);
                                openMenu('armada-master-unit');
                              }}
                              className="t-row-hover cursor-pointer"
                            >
                              <td className="py-3.5 px-5 whitespace-nowrap">
                                <div className="font-bold font-mono-num t-link">
                                  {unit.kodeUnit}
                                </div>
                                <div className="text-[11px] font-mono-num font-semibold t-text">
                                  {unit.nomorPolisi}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="font-semibold t-text">{unit.jenisKendaraan}</div>
                                <div className="text-[11px] t-muted">
                                  {[unit.merek, unit.model].filter(Boolean).join(' ') || '-'}
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
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span
                                  className="font-bold text-[11px]"
                                  style={{
                                    color:
                                      unit.status === 'Nonaktif' || opStatus === 'Servis'
                                        ? 'var(--status-warn-text)'
                                        : opStatus === 'Beroperasi'
                                          ? 'var(--status-ok-text)'
                                          : 'var(--status-info-text)',
                                  }}
                                >
                                  {unit.status === 'Nonaktif' ? 'Nonaktif' : opStatus}
                                </span>
                              </td>
                              <td className="py-3.5 px-5 text-right text-[11px] t-muted whitespace-nowrap">
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{unit.updateTerakhir || '-'}</span>
                                </span>
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
