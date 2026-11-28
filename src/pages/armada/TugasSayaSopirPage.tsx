import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  History,
  Lock,
  MapPin,
  Package,
  PackageCheck,
  Play,
  Plus,
  Route,
  ShieldAlert,
  Trash2,
  Upload,
  Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ArmadaMenuIcon } from '../../components/armada/ArmadaMenuIcons';
import {
  ARMADA_SOPIR_LIST,
  P2H_CHECKLIST_TEMPLATE,
  computePermintaanBarangStatus,
} from '../../data/armadaSeed';
import type {
  ArmadaKendalaKategori,
  ArmadaKendalaReport,
  ArmadaLokasi,
  ArmadaMaintenanceRequest,
  ArmadaP2HRecord,
  ArmadaPelanggan,
  ArmadaPerjalanan,
  ArmadaPermintaanBarang,
  ArmadaUangJalan,
  ArmadaUnit,
  P2HChecklistItem,
  P2HCondition,
  PengeluaranKategori,
  PermintaanBarangStatus,
  UangJalanExpenseItem,
} from '../../types/armada';
import {
  evaluatePerjalananP2HGate,
  readProofFileAsDataUrl,
} from '../../utils/armadaSchedule';
import {
  cleanRupiahToNumber,
  formatCurrencyInput,
  formatDateFullID,
  formatDateShortID,
  formatRupiah,
} from '../../utils/format';

type SopirTabId = 'tugas' | 'barang' | 'kendala' | 'riwayat';

const SATUAN_BARANG_OPTIONS = [
  'Pcs',
  'Set',
  'Unit',
  'Liter',
  'Botol',
  'Roll',
  'Meter',
  'Kg',
  'Box',
];

const KENDALA_CATEGORIES: ArmadaKendalaKategori[] = [
  'Masalah Kendaraan',
  'Keterlambatan',
  'Kendala Lokasi Muat–Bongkar',
  'Lainnya',
];

const EXPENSE_KATEGORI: PengeluaranKategori[] = [
  'Tol',
  'BBM',
  'Parkir',
  'Makan / Harian',
  'Lainnya',
];

interface TugasSayaSopirPageProps {
  /** If logged in directly as role Sopir, locked to that driver's name. If Super Admin previewing, can switch active sopir. */
  lockedSopirName?: string | null;
  perjalananList: ArmadaPerjalanan[];
  units: ArmadaUnit[];
  pelangganList: ArmadaPelanggan[];
  lokasiList: ArmadaLokasi[];
  uangJalanList: ArmadaUangJalan[];
  p2hList: ArmadaP2HRecord[];
  maintenanceList: ArmadaMaintenanceRequest[];
  kendalaList: ArmadaKendalaReport[];
  permintaanBarangList: ArmadaPermintaanBarang[];
  onSubmitP2H: (params: {
    perjalananId: string;
    sopirNama: string;
    kilometer: number;
    items: P2HChecklistItem[];
    isPemeriksaanUlang?: boolean;
  }) => { ok: boolean; error?: string };
  onStartPerjalanan: (perjalanan: ArmadaPerjalanan) => void;
  onMarkSelesaiMuat: (perjalanan: ArmadaPerjalanan) => void;
  onMarkSelesaiBongkar: (params: {
    perjalananId: string;
    buktiBongkarDataUrl?: string;
    buktiBongkarNama?: string;
  }) => void;
  onSubmitKendala: (params: {
    perjalananId: string;
    sopirNama: string;
    kategori: ArmadaKendalaKategori;
    catatan: string;
    fotoDataUrl?: string;
    fotoNama?: string;
  }) => void;
  onSubmitPertanggungjawaban: (params: {
    id: string;
    rincianPengeluaran: UangJalanExpenseItem[];
    catatanPertanggungjawaban: string;
  }) => void;
  onSubmitPermintaanBarang: (params: {
    unitId: string;
    sopirNama: string;
    items: Array<{ namaBarang: string; satuan: string; jumlahDiminta: number }>;
    catatan?: string;
    fotoDataUrl?: string;
    fotoNama?: string;
  }) => void;
}

function formatTimeHM(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function resolvePhotoPreviewSrc(url?: string): string | null {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  const match = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w600`;
  }
  return url;
}

function permintaanStatusColor(st: PermintaanBarangStatus): string {
  if (st === 'Terpenuhi') return 'var(--status-ok-text)';
  if (st === 'Terpenuhi Sebagian') return 'var(--status-warn-text)';
  if (st === 'Disetujui') return 'var(--status-info-text)';
  return 'var(--text-muted)';
}

export function TugasSayaSopirPage({
  lockedSopirName,
  perjalananList,
  units,
  pelangganList,
  lokasiList,
  uangJalanList,
  p2hList,
  maintenanceList,
  kendalaList,
  permintaanBarangList,
  onSubmitP2H,
  onStartPerjalanan,
  onMarkSelesaiMuat,
  onMarkSelesaiBongkar,
  onSubmitKendala,
  onSubmitPertanggungjawaban,
  onSubmitPermintaanBarang,
}: TugasSayaSopirPageProps) {
  const availableDrivers = useMemo(() => {
    const names = new Set<string>([
      ...ARMADA_SOPIR_LIST,
      ...perjalananList.map((p) => p.sopirNama).filter(Boolean),
    ]);
    return Array.from(names);
  }, [perjalananList]);

  const [selectedSopir, setSelectedSopir] = useState<string>(
    () => lockedSopirName || 'Dedi Kurniawan',
  );
  const activeSopir = lockedSopirName || selectedSopir;

  const [activeTab, setActiveTab] = useState<SopirTabId>('tugas');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [p2hMode, setP2hMode] = useState(false);

  // P2H Form state
  const [p2hKm, setP2hKm] = useState('');
  const [p2hItems, setP2hItems] = useState<P2HChecklistItem[]>([]);
  const [p2hError, setP2hError] = useState('');

  // Selesai Bongkar proof photo state
  const [bongkarPhotoOpen, setBongkarPhotoOpen] = useState(false);
  const [bongkarFotoUrl, setBongkarFotoUrl] = useState<string | undefined>(undefined);
  const [bongkarFotoNama, setBongkarFotoNama] = useState<string | undefined>(undefined);

  // Sopir Uang Jalan expense form state
  const [ujFormOpen, setUjFormOpen] = useState(false);
  const [ujRows, setUjRows] = useState<
    Array<{
      id: string;
      kategori: PengeluaranKategori;
      keterangan: string;
      nominalText: string;
      buktiDataUrl?: string;
      buktiNama?: string;
    }>
  >([{ id: 'SEXP-1', kategori: 'Tol', keterangan: 'Tol rute', nominalText: '' }]);
  const [ujNote, setUjNote] = useState('');
  const [ujError, setUjError] = useState('');

  // Lapor Kendala form state
  const [kendalaTaskId, setKendalaTaskId] = useState('');
  const [kendalaKategori, setKendalaKategori] =
    useState<ArmadaKendalaKategori>('Masalah Kendaraan');
  const [kendalaCatatan, setKendalaCatatan] = useState('');
  const [kendalaFotoUrl, setKendalaFotoUrl] = useState<string | undefined>(undefined);
  const [kendalaFotoNama, setKendalaFotoNama] = useState<string | undefined>(undefined);
  const [kendalaError, setKendalaError] = useState('');

  // Ajukan Barang form state
  const [barangUnitId, setBarangUnitId] = useState('');
  const [barangRows, setBarangRows] = useState<
    Array<{ id: string; namaBarang: string; satuan: string; jumlahText: string }>
  >([{ id: 'BRG-1', namaBarang: '', satuan: 'Pcs', jumlahText: '1' }]);
  const [barangCatatan, setBarangCatatan] = useState('');
  const [barangFotoUrl, setBarangFotoUrl] = useState<string | undefined>(undefined);
  const [barangFotoNama, setBarangFotoNama] = useState<string | undefined>(undefined);
  const [barangError, setBarangError] = useState('');
  const [barangSuccess, setBarangSuccess] = useState('');

  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const plgById = useMemo(() => new Map(pelangganList.map((p) => [p.id, p])), [pelangganList]);
  const lokById = useMemo(() => new Map(lokasiList.map((l) => [l.id, l])), [lokasiList]);

  // STRICT ASSIGNMENT LOCK: Sopir ONLY sees trips assigned to their account name
  const myTasks = useMemo(
    () =>
      perjalananList.filter(
        (p) => p.sopirNama.trim().toLowerCase() === activeSopir.trim().toLowerCase(),
      ),
    [activeSopir, perjalananList],
  );

  const myActiveTasks = useMemo(
    () => myTasks.filter((p) => p.status !== 'Selesai' && p.status !== 'Dibatalkan'),
    [myTasks],
  );
  const myCompletedTasks = useMemo(
    () => myTasks.filter((p) => p.status === 'Selesai'),
    [myTasks],
  );
  const myP2HRecords = useMemo(
    () =>
      p2hList
        .filter((p) => p.sopirNama.trim().toLowerCase() === activeSopir.trim().toLowerCase())
        .sort((a, b) => b.tanggalIsi.localeCompare(a.tanggalIsi)),
    [activeSopir, p2hList],
  );
  const myKendala = useMemo(
    () =>
      kendalaList
        .filter((k) => k.sopirNama.trim().toLowerCase() === activeSopir.trim().toLowerCase())
        .sort((a, b) => b.waktuLapor.localeCompare(a.waktuLapor)),
    [activeSopir, kendalaList],
  );
  const myPermintaanBarang = useMemo(
    () =>
      permintaanBarangList
        .filter((req) => req.dimintaOleh.trim().toLowerCase() === activeSopir.trim().toLowerCase())
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [activeSopir, permintaanBarangList],
  );

  const defaultDriverUnitId = useMemo(() => {
    if (myActiveTasks[0]?.unitId) return myActiveTasks[0].unitId;
    if (myTasks[0]?.unitId) return myTasks[0].unitId;
    const assignedUnit = units.find(
      (u) => (u.supirUtama || '').trim().toLowerCase() === activeSopir.trim().toLowerCase(),
    );
    if (assignedUnit) return assignedUnit.id;
    return units[0]?.id || '';
  }, [activeSopir, myActiveTasks, myTasks, units]);

  const activeTask = useMemo(
    () => (activeTaskId ? myTasks.find((t) => t.id === activeTaskId) || null : null),
    [activeTaskId, myTasks],
  );

  const startP2HForm = (task: ArmadaPerjalanan) => {
    // Enforce driver ownership
    if (task.sopirNama.trim().toLowerCase() !== activeSopir.trim().toLowerCase()) return;
    setP2hError('');
    setP2hKm('');
    setP2hItems(
      P2H_CHECKLIST_TEMPLATE.map((tpl) => ({
        ...tpl,
        kondisi: 'Baik',
        catatan: '',
      })),
    );
    setP2hMode(true);
  };

  const handleP2HSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask) return;
    setP2hError('');
    const km = Number(p2hKm.replace(/\D/g, ''));
    if (!km || km <= 0) {
      setP2hError('Kilometer kendaraan wajib diisi.');
      return;
    }
    const missingNote = p2hItems.find(
      (item) => item.kondisi === 'Ada Temuan' && !(item.catatan || '').trim(),
    );
    if (missingNote) {
      setP2hError(
        `Item "${missingNote.label}" dipilih Ada Temuan — catatan wajib diisi sebelum mengirim P2H.`,
      );
      return;
    }

    const alreadyHasP2H = p2hList.some((p) => p.perjalananId === activeTask.id);
    const res = onSubmitP2H({
      perjalananId: activeTask.id,
      sopirNama: activeSopir,
      kilometer: km,
      items: p2hItems,
      isPemeriksaanUlang: alreadyHasP2H,
    });
    if (!res.ok) {
      setP2hError(res.error || 'Gagal mengirim P2H.');
      return;
    }
    setP2hMode(false);
  };

  const handleKendalaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setKendalaError('');
    const targetId = kendalaTaskId || myActiveTasks[0]?.id || myTasks[0]?.id;
    if (!targetId) {
      setKendalaError('Tidak ada tugas aktif untuk dihubungkan ke laporan kendala.');
      return;
    }
    if (!kendalaCatatan.trim()) {
      setKendalaError('Catatan kendala wajib diisi.');
      return;
    }
    onSubmitKendala({
      perjalananId: targetId,
      sopirNama: activeSopir,
      kategori: kendalaKategori,
      catatan: kendalaCatatan.trim(),
      fotoDataUrl: kendalaFotoUrl,
      fotoNama: kendalaFotoNama,
    });
    setKendalaCatatan('');
    setKendalaFotoUrl(undefined);
    setKendalaFotoNama(undefined);
    setActiveTab('riwayat');
  };

  const handleBarangSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBarangError('');
    setBarangSuccess('');

    const resolvedUnitId = barangUnitId || defaultDriverUnitId;
    if (units.length > 0 && !resolvedUnitId) {
      setBarangError('Pilih unit kendaraan terlebih dahulu.');
      return;
    }

    const cleanedItems = barangRows
      .map((row) => ({
        namaBarang: row.namaBarang.trim(),
        satuan: row.satuan.trim() || 'Pcs',
        jumlahDiminta: Math.max(0, Number(row.jumlahText) || 0),
      }))
      .filter((row) => row.namaBarang.length > 0 && row.jumlahDiminta > 0);

    if (cleanedItems.length === 0) {
      setBarangError('Isi minimal 1 nama barang dan jumlah yang diminta (> 0).');
      return;
    }

    onSubmitPermintaanBarang({
      unitId: resolvedUnitId,
      sopirNama: activeSopir,
      items: cleanedItems,
      catatan: barangCatatan.trim() || undefined,
      fotoDataUrl: barangFotoUrl,
      fotoNama: barangFotoNama,
    });

    setBarangRows([
      { id: `BRG-${Date.now()}`, namaBarang: '', satuan: 'Pcs', jumlahText: '1' },
    ]);
    setBarangCatatan('');
    setBarangFotoUrl(undefined);
    setBarangFotoNama(undefined);
    setBarangSuccess(
      barangFotoUrl
        ? 'Pengajuan barang & foto terkirim ke menu Permintaan Barang Admin dan folder Drive Pengajuan Barang.'
        : 'Pengajuan barang terkirim dan otomatis masuk ke menu Permintaan Barang Admin.',
    );
  };

  return (
    <section className="max-w-2xl mx-auto space-y-4 pb-8">
      {/* Driver Header Bar */}
      <div className="t-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl t-subtle border t-border flex items-center justify-center shrink-0">
            <ArmadaMenuIcon id="armada-tugas-saya" size={30} />
          </div>
          <div>
            <div className="text-[11px] font-semibold t-link">Mode HP Sopir &middot; Sistem Armada</div>
            <h2 className="text-base sm:text-lg font-display font-bold t-text leading-snug">
              {activeSopir}
            </h2>
            <p className="text-xs t-muted">
              Hanya menampilkan tugas &amp; unit yang ditugaskan kepada akun ini.
            </p>
          </div>
        </div>

        {/* Allow Super Admin testing to switch active Sopir account */}
        {!lockedSopirName && (
          <div className="w-full sm:w-auto">
            <label htmlFor="sopir-switcher" className="block text-[10px] font-bold t-muted mb-1">
              Uji Akun Sopir
            </label>
            <select
              id="sopir-switcher"
              value={selectedSopir}
              onChange={(e) => {
                setSelectedSopir(e.target.value);
                setActiveTaskId(null);
                setP2hMode(false);
                setBarangUnitId('');
                setBarangFotoUrl(undefined);
                setBarangFotoNama(undefined);
                setBarangSuccess('');
              }}
              className="w-full sm:w-48 text-xs px-3 py-2 rounded-xl t-input font-semibold"
            >
              {availableDrivers.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 4 Mobile Tabs: Tugas Saya | Ajukan Barang | Lapor Kendala | Riwayat */}
      <div className="grid grid-cols-4 gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-2xl t-card">
        <button
          type="button"
          onClick={() => {
            setActiveTab('tugas');
            setP2hMode(false);
          }}
          className={`min-w-0 min-h-[54px] sm:min-h-0 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-1 sm:px-2.5 rounded-xl text-[11px] sm:text-xs font-bold leading-tight text-center transition-colors ${
            activeTab === 'tugas' ? 't-btn-primary' : 't-muted hover:t-text'
          }`}
        >
          <ClipboardCheck className="w-4 h-4 shrink-0" />
          <span className="truncate max-w-full">
            Tugas <span className="font-mono-num">({myActiveTasks.length})</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('barang');
            setP2hMode(false);
            setBarangError('');
            setBarangSuccess('');
            if (!barangUnitId && defaultDriverUnitId) {
              setBarangUnitId(defaultDriverUnitId);
            }
          }}
          className={`min-w-0 min-h-[54px] sm:min-h-0 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-1 sm:px-2.5 rounded-xl text-[11px] sm:text-xs font-bold leading-tight text-center transition-colors ${
            activeTab === 'barang' ? 't-btn-primary' : 't-muted hover:t-text'
          }`}
        >
          <Package className="w-4 h-4 shrink-0" />
          <span className="truncate max-w-full">
            Barang <span className="font-mono-num">({myPermintaanBarang.length})</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('kendala');
            setP2hMode(false);
            if (!kendalaTaskId && myActiveTasks[0]) {
              setKendalaTaskId(myActiveTasks[0].id);
            }
          }}
          className={`min-w-0 min-h-[54px] sm:min-h-0 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-1 sm:px-2.5 rounded-xl text-[11px] sm:text-xs font-bold leading-tight text-center transition-colors ${
            activeTab === 'kendala' ? 't-btn-primary' : 't-muted hover:t-text'
          }`}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="truncate max-w-full">Kendala</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('riwayat');
            setP2hMode(false);
          }}
          className={`min-w-0 min-h-[54px] sm:min-h-0 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-1 sm:px-2.5 rounded-xl text-[11px] sm:text-xs font-bold leading-tight text-center transition-colors ${
            activeTab === 'riwayat' ? 't-btn-primary' : 't-muted hover:t-text'
          }`}
        >
          <History className="w-4 h-4 shrink-0" />
          <span className="truncate max-w-full">Riwayat</span>
        </button>
      </div>

      {/* TAB 1: TUGAS SAYA */}
      {activeTab === 'tugas' && (
        <>
          {activeTask && p2hMode ? (
            /* P2H CHECKLIST FORM (MOBILE-FRIENDLY) */
            <form onSubmit={handleP2HSubmit} className="t-card rounded-2xl p-4 sm:p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between gap-2 pb-3 border-b t-border">
                <div>
                  <h3 className="text-base font-display t-text">Isi P2H Kendaraan</h3>
                  <p className="text-[11px] t-muted">
                    Data sopir, unit, dan penugasan otomatis terisi dari tugas Anda.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setP2hMode(false)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl t-btn-secondary font-semibold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali</span>
                </button>
              </div>

              {p2hError && (
                <div className="p-3 rounded-xl t-status-bad font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{p2hError}</span>
                </div>
              )}

              {/* Auto-filled Read-only Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 rounded-xl t-subtle border t-border">
                <div>
                  <div className="t-field-label">Nama Sopir</div>
                  <div className="font-bold t-text mt-0.5">{activeTask.sopirNama}</div>
                </div>
                <div>
                  <div className="t-field-label">Unit &amp; No. Polisi</div>
                  <div className="font-mono-num font-bold t-text mt-0.5">
                    {unitById.get(activeTask.unitId)?.kodeUnit} &middot;{' '}
                    {unitById.get(activeTask.unitId)?.nomorPolisi}
                  </div>
                </div>
                <div>
                  <div className="t-field-label">No. Penugasan</div>
                  <div className="font-mono-num font-bold t-link mt-0.5">
                    {activeTask.nomorPenugasan}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="p2h-km" className="block t-field-label mb-1">
                  Kilometer Odometer Saat Ini *
                </label>
                <input
                  id="p2h-km"
                  type="text"
                  inputMode="numeric"
                  required
                  value={p2hKm}
                  onChange={(e) => setP2hKm(e.target.value.replace(/\D/g, ''))}
                  placeholder="Contoh: 45210"
                  className="w-full px-3.5 py-2.5 rounded-xl t-input font-mono-num font-bold text-sm"
                />
              </div>

              {/* Checklist Items */}
              <div className="space-y-3">
                <div className="t-section-label">Checklist Pemeriksaan Harian</div>
                {p2hItems.map((item, idx) => {
                  const isTemuan = item.kondisi === 'Ada Temuan';
                  const choices: P2HCondition[] = item.bolehTidakBerlaku
                    ? ['Baik', 'Ada Temuan', 'Tidak Berlaku']
                    : ['Baik', 'Ada Temuan'];
                  return (
                    <div
                      key={item.kode}
                      className="p-3.5 rounded-xl t-subtle border t-border space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold t-text text-xs">
                            {idx + 1}. {item.label}
                          </div>
                          <div className="text-[10px] t-muted">
                            {item.kategori}
                            {item.kritis ? ' · Item Kritis' : ''}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`grid gap-1.5 ${
                          choices.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
                        }`}
                      >
                        {choices.map((cond) => {
                          const active = item.kondisi === cond;
                          const activeStyle =
                            cond === 'Baik'
                              ? 't-status-ok'
                              : cond === 'Ada Temuan'
                                ? 't-status-bad'
                                : 't-status-info';
                          return (
                            <button
                              key={cond}
                              type="button"
                              onClick={() =>
                                setP2hItems((prev) =>
                                  prev.map((it) =>
                                    it.kode === item.kode ? { ...it, kondisi: cond } : it,
                                  ),
                                )
                              }
                              className={`py-2 px-2 rounded-xl font-bold text-[11px] transition-colors ${
                                active ? activeStyle : 't-btn-secondary'
                              }`}
                            >
                              {cond}
                            </button>
                          );
                        })}
                      </div>

                      {isTemuan && (
                        <div className="space-y-2 pt-1">
                          <textarea
                            required
                            rows={2}
                            value={item.catatan || ''}
                            onChange={(e) =>
                              setP2hItems((prev) =>
                                prev.map((it) =>
                                  it.kode === item.kode
                                    ? { ...it, catatan: e.target.value }
                                    : it,
                                ),
                              )
                            }
                            placeholder={`Wajib jelaskan temuan pada ${item.label.toLowerCase()} (mis. ban belakang kanan gundul / bocor)...`}
                            className="w-full px-3 py-2 rounded-xl t-input resize-none"
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl t-btn-secondary font-semibold cursor-pointer">
                              <Camera className="w-3.5 h-3.5" />
                              <span>{item.fotoNama ? 'Ganti Foto' : 'Tambah Foto Temuan'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={async (e) => {
                                  const f = e.target.files?.[0];
                                  if (!f) return;
                                  const res = await readProofFileAsDataUrl(f);
                                  setP2hItems((prev) =>
                                    prev.map((it) =>
                                      it.kode === item.kode
                                        ? { ...it, fotoDataUrl: res.dataUrl, fotoNama: res.name }
                                        : it,
                                    ),
                                  );
                                }}
                              />
                            </label>
                            {item.fotoNama && (
                              <span className="text-[11px] t-muted truncate max-w-[180px]">
                                {item.fotoNama}
                              </span>
                            )}
                          </div>
                          {item.fotoDataUrl && (
                            <img
                              src={item.fotoDataUrl}
                              alt={`Foto temuan ${item.label}`}
                              className="max-h-32 rounded-xl border t-border object-contain"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl t-btn-primary text-sm font-bold"
              >
                Kirim Hasil P2H
              </button>
            </form>
          ) : activeTask ? (
            /* DETAIL TUGAS SOPIR — ONE PRIMARY BUTTON PER STAGE */
            (() => {
              const unit = unitById.get(activeTask.unitId);
              const plg = plgById.get(activeTask.pelangganId);
              const muat = lokById.get(activeTask.lokasiMuatId);
              const bongkar = lokById.get(activeTask.lokasiBongkarId);
              const p2hGate = evaluatePerjalananP2HGate(
                activeTask.id,
                p2hList,
                maintenanceList,
              );
              const taskP2Hs = p2hList
                .filter((p) => p.perjalananId === activeTask.id)
                .sort((a, b) => b.tanggalIsi.localeCompare(a.tanggalIsi));
              const latestP2H = taskP2Hs[0] || null;
              const linkedMaint = latestP2H
                ? maintenanceList.filter(
                    (m) => m.p2hId === latestP2H.id || latestP2H.maintenanceIds.includes(m.id),
                  )
                : [];
              const activeUj = uangJalanList.find(
                (u) => u.perjalananId === activeTask.id && u.status === 'Dicairkan',
              );
              const tahap = activeTask.tahapPerjalanan || (activeTask.status === 'Berjalan' ? 'Menuju Muat' : activeTask.status === 'Selesai' ? 'Selesai Bongkar' : 'Belum Mulai');

              return (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTaskId(null);
                      setBongkarPhotoOpen(false);
                      setUjFormOpen(false);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold t-link hover:underline"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Kembali ke Daftar Tugas Saya</span>
                  </button>

                  {/* Task Identity Card */}
                  <div className="t-card rounded-2xl p-5 space-y-4 text-xs">
                    <div className="flex items-start justify-between gap-2 pb-3 border-b t-border">
                      <div>
                        <div className="font-mono-num text-[11px] font-bold t-link">
                          {activeTask.nomorPenugasan} &middot;{' '}
                          {activeTask.nomorSuratJalan || 'SJ Belum Terbit'}
                        </div>
                        <h3 className="text-lg font-display t-text mt-0.5">
                          {unit?.kodeUnit || '-'} &mdash; {unit?.nomorPolisi || '-'}
                        </h3>
                        <div className="t-muted mt-0.5">
                          {plg?.namaPt || '-'} &middot; {formatDateFullID(activeTask.tanggalMulai)}{' '}
                          ({activeTask.jamMulai}–{activeTask.jamSelesai})
                        </div>
                      </div>
                      <span className="font-bold text-[11px] t-text">{activeTask.status}</span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-start gap-2.5">
                        <MapPin className="w-4 h-4 t-link shrink-0 mt-0.5" />
                        <div>
                          <div className="t-field-label">Lokasi Muat</div>
                          <div className="font-semibold t-text">{muat?.namaLokasi || '-'}</div>
                          <div className="text-[11px] t-muted">{muat?.alamatLengkap || '-'}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Route className="w-4 h-4 t-link shrink-0 mt-0.5" />
                        <div>
                          <div className="t-field-label">Lokasi Bongkar</div>
                          <div className="font-semibold t-text">{bongkar?.namaLokasi || '-'}</div>
                          <div className="text-[11px] t-muted">{bongkar?.alamatLengkap || '-'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Recorded Timestamps */}
                    {(activeTask.mulaiAktual ||
                      activeTask.selesaiMuatAktual ||
                      activeTask.selesaiBongkarAktual) && (
                      <div className="p-3 rounded-xl t-subtle border t-border grid grid-cols-3 gap-2 text-[11px]">
                        <div>
                          <div className="t-muted">Mulai</div>
                          <div className="font-mono-num font-bold t-text">
                            {formatTimeHM(activeTask.mulaiAktual)}
                          </div>
                        </div>
                        <div>
                          <div className="t-muted">Selesai Muat</div>
                          <div className="font-mono-num font-bold t-text">
                            {formatTimeHM(activeTask.selesaiMuatAktual)}
                          </div>
                        </div>
                        <div>
                          <div className="t-muted">Selesai Bongkar</div>
                          <div className="font-mono-num font-bold t-text">
                            {formatTimeHM(activeTask.selesaiBongkarAktual)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Follow-up Maintenance Notice if P2H has findings */}
                    {latestP2H && latestP2H.jumlahTemuan > 0 && (
                      <div
                        className={`p-3.5 rounded-xl space-y-1 ${
                          p2hGate.blocked ? 't-status-bad' : 't-status-ok'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5">
                          {p2hGate.blocked ? (
                            <ShieldAlert className="w-4 h-4 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                          )}
                          <span>
                            {p2hGate.blocked
                              ? 'Menunggu Tindak Lanjut (Mulai Perjalanan Ditahan)'
                              : 'Penahanan Dilepas — Siap Berangkat'}
                          </span>
                        </div>
                        <p className="text-[11px] opacity-90">
                          {latestP2H.nomorP2H}: {latestP2H.jumlahTemuan} temuan tercatat.
                          {linkedMaint.length > 0
                            ? ` Tindak lanjut perbaikan: ${linkedMaint
                                .map((m) => `${m.nomorPengajuan} (${m.status})`)
                                .join(', ')}.`
                            : ' Menunggu Admin Armada membuat pengajuan perbaikan.'}
                        </p>
                      </div>
                    )}

                    {/* ONE PRIMARY ACTION BUTTON PER STAGE */}
                    <div className="pt-2 space-y-2.5">
                      {activeTask.status === 'Selesai' ? (
                        <div className="p-3.5 rounded-xl t-status-ok text-center font-bold">
                          Perjalanan Selesai ({formatTimeHM(activeTask.selesaiBongkarAktual)})
                        </div>
                      ) : !latestP2H ? (
                        <button
                          type="button"
                          onClick={() => startP2HForm(activeTask)}
                          className="w-full py-3.5 rounded-xl t-btn-primary text-sm font-bold inline-flex items-center justify-center gap-2"
                        >
                          <ClipboardCheck className="w-4 h-4" />
                          <span>Isi P2H</span>
                        </button>
                      ) : p2hGate.blocked ? (
                        <div className="space-y-2">
                          <button
                            type="button"
                            disabled
                            className="w-full py-3.5 rounded-xl t-btn-primary text-sm font-bold inline-flex items-center justify-center gap-2 opacity-45 cursor-not-allowed"
                          >
                            <Lock className="w-4 h-4" />
                            <span>Mulai Perjalanan (Ditahan)</span>
                          </button>
                          {!p2hGate.needsMaintenance && (
                            <button
                              type="button"
                              onClick={() => startP2HForm(activeTask)}
                              className="w-full py-3 rounded-xl t-btn-secondary text-xs font-bold inline-flex items-center justify-center gap-1.5"
                            >
                              <ClipboardCheck className="w-4 h-4" />
                              <span>Isi Pemeriksaan Ulang P2H</span>
                            </button>
                          )}
                        </div>
                      ) : activeTask.status === 'Dijadwalkan' ? (
                        <button
                          type="button"
                          onClick={() => onStartPerjalanan(activeTask)}
                          className="w-full py-3.5 rounded-xl t-btn-primary text-sm font-bold inline-flex items-center justify-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          <span>Mulai Perjalanan</span>
                        </button>
                      ) : tahap === 'Menuju Muat' ? (
                        <button
                          type="button"
                          onClick={() => onMarkSelesaiMuat(activeTask)}
                          className="w-full py-3.5 rounded-xl t-btn-primary text-sm font-bold inline-flex items-center justify-center gap-2"
                        >
                          <PackageCheck className="w-4 h-4" />
                          <span>Selesai Muat</span>
                        </button>
                      ) : !bongkarPhotoOpen ? (
                        <button
                          type="button"
                          onClick={() => setBongkarPhotoOpen(true)}
                          className="w-full py-3.5 rounded-xl t-btn-primary text-sm font-bold inline-flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Selesai Bongkar</span>
                        </button>
                      ) : (
                        <div className="p-4 rounded-xl t-subtle border t-border space-y-3">
                          <div className="font-bold t-text">
                            Konfirmasi Selesai Bongkar (Unggah Bukti Opsional)
                          </div>
                          <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary font-semibold cursor-pointer">
                            <Camera className="w-3.5 h-3.5" />
                            <span>
                              {bongkarFotoNama || 'Ambil / Unggah Foto Bukti Bongkar'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={async (e) => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                const res = await readProofFileAsDataUrl(f);
                                setBongkarFotoUrl(res.dataUrl);
                                setBongkarFotoNama(res.name);
                              }}
                            />
                          </label>
                          {bongkarFotoUrl && (
                            <img
                              src={bongkarFotoUrl}
                              alt="Bukti bongkar"
                              className="max-h-36 rounded-xl border t-border object-contain"
                            />
                          )}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setBongkarPhotoOpen(false)}
                              className="flex-1 py-2.5 rounded-xl t-btn-secondary font-semibold"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onMarkSelesaiBongkar({
                                  perjalananId: activeTask.id,
                                  buktiBongkarDataUrl: bongkarFotoUrl,
                                  buktiBongkarNama: bongkarFotoNama,
                                });
                                setBongkarPhotoOpen(false);
                                setBongkarFotoUrl(undefined);
                                setBongkarFotoNama(undefined);
                              }}
                              className="flex-1 py-2.5 rounded-xl t-btn-primary font-bold"
                            >
                              Konfirmasi Selesai
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Uang Jalan Pemakaian Sopir (when Finance has disbursed) */}
                  {activeUj && (
                    <div className="t-card rounded-2xl p-4 space-y-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-bold t-text inline-flex items-center gap-1.5">
                            <Wallet className="w-4 h-4 t-link" />
                            <span>Uang Jalan Dicairkan ({activeUj.nomorUangJalan})</span>
                          </div>
                          <div className="font-mono-num font-bold text-sm t-text mt-0.5">
                            {formatRupiah(activeUj.nominalDicairkan || 0)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setUjFormOpen((p) => !p)}
                          className="px-3 py-1.5 rounded-xl t-btn-secondary font-bold"
                        >
                          {ujFormOpen ? 'Tutup' : 'Catat Pengeluaran'}
                        </button>
                      </div>

                      {ujFormOpen && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            setUjError('');
                            const valid = ujRows
                              .map((r) => ({
                                id: r.id,
                                kategori: r.kategori,
                                keterangan: r.keterangan.trim() || r.kategori,
                                nominal: cleanRupiahToNumber(r.nominalText),
                                buktiDataUrl: r.buktiDataUrl,
                                buktiNama: r.buktiNama,
                              }))
                              .filter((it) => it.nominal > 0);
                            if (valid.length === 0) {
                              setUjError('Isi minimal satu pengeluaran dengan nominal > Rp 0.');
                              return;
                            }
                            onSubmitPertanggungjawaban({
                              id: activeUj.id,
                              rincianPengeluaran: valid,
                              catatanPertanggungjawaban:
                                ujNote.trim() || `Diinput oleh sopir ${activeSopir}`,
                            });
                            setUjFormOpen(false);
                          }}
                          className="space-y-3 pt-2 border-t t-border"
                        >
                          {ujError && (
                            <div className="p-2.5 rounded-xl t-status-bad font-semibold">
                              {ujError}
                            </div>
                          )}
                          {ujRows.map((row) => (
                            <div
                              key={row.id}
                              className="p-2.5 rounded-xl t-subtle border t-border space-y-2"
                            >
                              <div className="grid grid-cols-2 gap-2">
                                <select
                                  value={row.kategori}
                                  onChange={(e) =>
                                    setUjRows((prev) =>
                                      prev.map((r) =>
                                        r.id === row.id
                                          ? {
                                              ...r,
                                              kategori: e.target.value as PengeluaranKategori,
                                            }
                                          : r,
                                      ),
                                    )
                                  }
                                  className="px-2.5 py-1.5 rounded-xl t-input font-semibold"
                                >
                                  {EXPENSE_KATEGORI.map((k) => (
                                    <option key={k} value={k}>
                                      {k}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={row.nominalText}
                                  onChange={(e) =>
                                    setUjRows((prev) =>
                                      prev.map((r) =>
                                        r.id === row.id
                                          ? {
                                              ...r,
                                              nominalText: formatCurrencyInput(e.target.value),
                                            }
                                          : r,
                                      ),
                                    )
                                  }
                                  placeholder="Nominal (Rp)"
                                  className="px-2.5 py-1.5 rounded-xl t-input font-mono-num font-bold text-right"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={row.keterangan}
                                  onChange={(e) =>
                                    setUjRows((prev) =>
                                      prev.map((r) =>
                                        r.id === row.id
                                          ? { ...r, keterangan: e.target.value }
                                          : r,
                                      ),
                                    )
                                  }
                                  placeholder="Keterangan"
                                  className="flex-1 px-2.5 py-1.5 rounded-xl t-input"
                                />
                                <label className="px-2.5 py-1.5 rounded-xl t-btn-secondary cursor-pointer font-semibold inline-flex items-center gap-1">
                                  <Upload className="w-3 h-3" />
                                  <span>{row.buktiNama ? 'OK' : 'Foto'}</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const f = e.target.files?.[0];
                                      if (!f) return;
                                      const res = await readProofFileAsDataUrl(f);
                                      setUjRows((prev) =>
                                        prev.map((r) =>
                                          r.id === row.id
                                            ? {
                                                ...r,
                                                buktiDataUrl: res.dataUrl,
                                                buktiNama: res.name,
                                              }
                                            : r,
                                        ),
                                      );
                                    }}
                                  />
                                </label>
                                {ujRows.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setUjRows((prev) => prev.filter((r) => r.id !== row.id))
                                    }
                                    className="p-1.5 rounded-xl t-btn-secondary"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setUjRows((prev) => [
                                  ...prev,
                                  {
                                    id: `SEXP-${Date.now()}`,
                                    kategori: 'Parkir',
                                    keterangan: '',
                                    nominalText: '',
                                  },
                                ])
                              }
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl t-btn-secondary font-bold"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Tambah Item</span>
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-2 rounded-xl t-btn-primary font-bold"
                            >
                              Kirim ke Finance
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            /* LIST OF ASSIGNED TASKS FOR THIS SOPIR */
            <div className="space-y-3">
              {myActiveTasks.length === 0 ? (
                <div className="t-card rounded-2xl p-8 text-center text-xs t-muted">
                  Tidak ada tugas aktif yang diberikan kepada <b>{activeSopir}</b> saat ini.
                </div>
              ) : (
                myActiveTasks.map((task) => {
                  const unit = unitById.get(task.unitId);
                  const plg = plgById.get(task.pelangganId);
                  const muat = lokById.get(task.lokasiMuatId);
                  const bongkar = lokById.get(task.lokasiBongkarId);
                  const gate = evaluatePerjalananP2HGate(task.id, p2hList, maintenanceList);
                  const hasP2H = p2hList.some((p) => p.perjalananId === task.id);
                  return (
                    <div
                      key={task.id}
                      onClick={() => setActiveTaskId(task.id)}
                      className="t-card rounded-2xl p-4 space-y-3 cursor-pointer hover:shadow-md transition-shadow text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-mono-num font-bold t-link">
                            {task.nomorPenugasan} &middot; {task.nomorSuratJalan || 'SJ'}
                          </div>
                          <div className="text-base font-display t-text mt-0.5">
                            {unit?.kodeUnit || '-'} &middot; {unit?.nomorPolisi || '-'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold t-text">{task.status}</div>
                          <div className="text-[11px] font-mono-num t-muted inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {task.jamMulai}–{task.jamSelesai}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl t-subtle border t-border space-y-1">
                        <div className="font-semibold t-text">{plg?.namaPt || '-'}</div>
                        <div className="text-[11px] t-muted">
                          Muat: <b>{muat?.namaLokasi || '-'}</b> &rarr; Bongkar:{' '}
                          <b>{bongkar?.namaLokasi || '-'}</b>
                        </div>
                        <div className="text-[11px] t-muted">
                          {formatDateFullID(task.tanggalMulai)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span
                          className="text-[11px] font-bold"
                          style={{
                            color: gate.blocked
                              ? 'var(--status-bad-text)'
                              : hasP2H
                                ? 'var(--status-ok-text)'
                                : 'var(--status-warn-text)',
                          }}
                        >
                          {gate.blocked
                            ? 'Menunggu Tindak Lanjut (P2H Kritis)'
                            : hasP2H
                              ? 'P2H Terkirim · Siap Jalan'
                              : 'Belum Isi P2H'}
                        </span>
                        <span className="px-3.5 py-2 rounded-xl t-btn-primary text-xs font-bold">
                          {!hasP2H
                            ? 'Buka & Isi P2H'
                            : gate.blocked
                              ? 'Lihat Status'
                              : 'Buka Tugas'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* TAB 2: AJUKAN BARANG */}
      {activeTab === 'barang' && (
        <div className="space-y-4 text-xs">
          <form onSubmit={handleBarangSubmit} className="t-card rounded-2xl p-4 sm:p-5 space-y-4">
            <div>
              <h3 className="text-base font-display t-text">Ajukan Permintaan Barang</h3>
              <p className="text-[11px] t-muted mt-0.5">
                Ajukan kebutuhan sparepart, oli, perlengkapan keselamatan, atau barang operasional
                armada. Pengajuan akan langsung muncul di menu <b>Permintaan Barang</b> Admin.
              </p>
            </div>

            {barangError && (
              <div className="p-3 rounded-xl t-status-bad font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{barangError}</span>
              </div>
            )}

            {barangSuccess && (
              <div className="p-3 rounded-xl t-status-ok font-semibold flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{barangSuccess}</span>
              </div>
            )}

            <div>
              <label htmlFor="brg-unit" className="block t-field-label mb-1">
                Unit Armada Terkait *
              </label>
              <select
                id="brg-unit"
                value={barangUnitId || defaultDriverUnitId}
                onChange={(e) => setBarangUnitId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl t-input font-semibold"
              >
                {units.length === 0 ? (
                  <option value="">Belum ada unit terdaftar</option>
                ) : (
                  units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.kodeUnit} ({u.nomorPolisi}) — {u.jenisKendaraan}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="t-field-label">Daftar Barang / Sparepart *</span>
                <button
                  type="button"
                  onClick={() =>
                    setBarangRows((prev) => [
                      ...prev,
                      {
                        id: `BRG-${Date.now()}-${prev.length + 1}`,
                        namaBarang: '',
                        satuan: 'Pcs',
                        jumlahText: '1',
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl t-btn-secondary text-[11px] font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Item</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {barangRows.map((row, idx) => (
                  <div
                    key={row.id}
                    className="p-3 rounded-xl t-subtle border t-border space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold t-muted">Item #{idx + 1}</span>
                      {barangRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setBarangRows((prev) => prev.filter((item) => item.id !== row.id))
                          }
                          aria-label={`Hapus item ${idx + 1}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:underline"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={row.namaBarang}
                      onChange={(e) =>
                        setBarangRows((prev) =>
                          prev.map((item) =>
                            item.id === row.id ? { ...item, namaBarang: e.target.value } : item,
                          ),
                        )
                      }
                      placeholder="Contoh: Oli Mesin 15W-40, Lampu Sein, Terpal Penutup, Sarung Tangan..."
                      className="w-full px-3 py-2 rounded-xl t-input"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold t-muted mb-1">
                          Jumlah Diminta
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={row.jumlahText}
                          onChange={(e) =>
                            setBarangRows((prev) =>
                              prev.map((item) =>
                                item.id === row.id ? { ...item, jumlahText: e.target.value } : item,
                              ),
                            )
                          }
                          className="w-full px-3 py-2 rounded-xl t-input font-mono-num"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold t-muted mb-1">
                          Satuan
                        </label>
                        <select
                          value={row.satuan}
                          onChange={(e) =>
                            setBarangRows((prev) =>
                              prev.map((item) =>
                                item.id === row.id ? { ...item, satuan: e.target.value } : item,
                              ),
                            )
                          }
                          className="w-full px-3 py-2 rounded-xl t-input font-semibold"
                        >
                          {SATUAN_BARANG_OPTIONS.map((sat) => (
                            <option key={sat} value={sat}>
                              {sat}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="brg-catatan" className="block t-field-label mb-1">
                Catatan / Alasan Kebutuhan (Opsional)
              </label>
              <textarea
                id="brg-catatan"
                rows={2}
                value={barangCatatan}
                onChange={(e) => setBarangCatatan(e.target.value)}
                placeholder="Contoh: Lampu sein belakang kanan mati saat angkut muatan, butuh segera diganti..."
                className="w-full px-3 py-2 rounded-xl t-input resize-none"
              />
            </div>

            <div>
              <span className="block t-field-label mb-1">
                Foto Barang / Kondisi Lapangan (Opsional)
              </span>
              <p className="text-[11px] t-muted mb-2">
                Foto otomatis disimpan ke folder Google Drive <b>Pengajuan Barang</b>.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary font-semibold cursor-pointer">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{barangFotoNama || 'Ambil / Unggah Foto Barang'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      try {
                        const res = await readProofFileAsDataUrl(f);
                        setBarangFotoUrl(res.dataUrl);
                        setBarangFotoNama(res.name);
                      } catch {
                        setBarangError('Gagal membaca file foto. Silakan coba lagi.');
                      }
                    }}
                  />
                </label>
                {barangFotoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setBarangFotoUrl(undefined);
                      setBarangFotoNama(undefined);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl t-btn-secondary text-[11px] font-semibold text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Foto</span>
                  </button>
                )}
              </div>
              {barangFotoUrl && (
                <img
                  src={barangFotoUrl}
                  alt="Preview foto pengajuan barang"
                  className="mt-2.5 max-h-44 rounded-xl border t-border object-contain"
                />
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl t-btn-primary text-sm font-bold inline-flex items-center justify-center gap-2"
            >
              <Package className="w-4 h-4" />
              <span>Kirim Pengajuan Barang</span>
            </button>
          </form>

          {/* Status Pengajuan Barang Sopir */}
          <div className="t-card rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="t-section-label">
                Pengajuan Barang Saya ({myPermintaanBarang.length})
              </h3>
              <span className="text-[11px] t-muted">Status tersinkron dengan Admin</span>
            </div>

            {myPermintaanBarang.length === 0 ? (
              <p className="t-muted">
                Belum ada pengajuan barang yang Anda kirim. Isi formulir di atas untuk mengajukan.
              </p>
            ) : (
              <div className="space-y-2.5">
                {myPermintaanBarang.map((req) => {
                  const computedStatus = computePermintaanBarangStatus(req.items);
                  const previewSrc = resolvePhotoPreviewSrc(req.fotoDataUrl);
                  const isExternalDriveLink = Boolean(
                    req.fotoDataUrl && req.fotoDataUrl.startsWith('http'),
                  );
                  return (
                    <div
                      key={req.id}
                      className="p-3.5 rounded-xl t-subtle border t-border space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-mono-num font-bold t-link">
                            {req.nomorPermintaan}
                          </span>{' '}
                          <span className="t-muted">&middot;</span>{' '}
                          <span className="font-mono-num font-semibold t-text">
                            {req.kodeUnit} ({req.nomorPolisi})
                          </span>
                        </div>
                        <span
                          className="font-bold text-[11px]"
                          style={{ color: permintaanStatusColor(computedStatus) }}
                        >
                          {computedStatus}
                        </span>
                      </div>

                      <div className="text-[11px] t-muted">
                        Tanggal: {formatDateShortID(req.tanggalPermintaan)}
                      </div>

                      <div className="space-y-1 pt-1 border-t t-border">
                        {req.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex flex-wrap items-center justify-between gap-2 text-[11px]"
                          >
                            <span className="font-semibold t-text">
                              {item.namaBarang}{' '}
                              <span className="font-normal t-muted">({item.satuan})</span>
                            </span>
                            <span className="font-mono-num t-muted">
                              Diminta {item.jumlahDiminta} · Disetujui {item.jumlahDisetujui} ·
                              Diterima {item.jumlahDiterima}
                            </span>
                          </div>
                        ))}
                      </div>

                      {req.catatan && (
                        <div className="text-[11px] t-muted pt-1 border-t t-border">
                          <span className="font-semibold t-text">Catatan:</span> {req.catatan}
                        </div>
                      )}

                      {req.fotoDataUrl && (
                        <div className="pt-2 border-t t-border space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-semibold t-text">
                              Lampiran Foto{req.fotoNama ? `: ${req.fotoNama}` : ''}
                            </span>
                            {isExternalDriveLink && (
                              <a
                                href={req.fotoDataUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold t-link hover:underline"
                              >
                                Buka di Drive
                              </a>
                            )}
                          </div>
                          {previewSrc && (
                            <img
                              src={previewSrc}
                              alt={req.fotoNama || 'Foto pengajuan barang'}
                              className="max-h-40 rounded-xl border t-border object-contain"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LAPOR KENDALA */}
      {activeTab === 'kendala' && (
        <form onSubmit={handleKendalaSubmit} className="t-card rounded-2xl p-5 space-y-4 text-xs">
          <div>
            <h3 className="text-base font-display t-text">Lapor Kendala Lapangan</h3>
            <p className="text-[11px] t-muted mt-0.5">
              Laporan otomatis terhubung ke tugas &amp; unit yang dipilih.
            </p>
          </div>

          {kendalaError && (
            <div className="p-3 rounded-xl t-status-bad font-semibold">{kendalaError}</div>
          )}

          <div>
            <label htmlFor="knd-task" className="block t-field-label mb-1">
              Pilih Tugas Terkait *
            </label>
            <select
              id="knd-task"
              value={kendalaTaskId || myActiveTasks[0]?.id || myTasks[0]?.id || ''}
              onChange={(e) => setKendalaTaskId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl t-input font-semibold"
            >
              {myTasks.length === 0 ? (
                <option value="">Tidak ada tugas untuk akun ini</option>
              ) : (
                myTasks.map((t) => {
                  const u = unitById.get(t.unitId);
                  return (
                    <option key={t.id} value={t.id}>
                      {t.nomorPenugasan} — {u?.kodeUnit} ({u?.nomorPolisi}) · {t.status}
                    </option>
                  );
                })
              )}
            </select>
          </div>

          <div>
            <span className="block t-field-label mb-1.5">Jenis Kendala *</span>
            <div className="grid grid-cols-2 gap-1.5">
              {KENDALA_CATEGORIES.map((kat) => (
                <button
                  key={kat}
                  type="button"
                  onClick={() => setKendalaKategori(kat)}
                  className={`py-2.5 px-2 rounded-xl font-bold text-[11px] transition-colors ${
                    kendalaKategori === kat ? 't-btn-primary' : 't-btn-secondary'
                  }`}
                >
                  {kat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="knd-catatan" className="block t-field-label mb-1">
              Catatan Kendala *
            </label>
            <textarea
              id="knd-catatan"
              required
              rows={3}
              value={kendalaCatatan}
              onChange={(e) => setKendalaCatatan(e.target.value)}
              placeholder="Jelaskan masalah kendaraan, antrean gudang, atau keterlambatan..."
              className="w-full px-3 py-2 rounded-xl t-input resize-none"
            />
          </div>

          <div>
            <span className="block t-field-label mb-1">Foto Kendala (Opsional)</span>
            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary font-semibold cursor-pointer">
              <Camera className="w-3.5 h-3.5" />
              <span>{kendalaFotoNama || 'Ambil / Unggah Foto'}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const res = await readProofFileAsDataUrl(f);
                  setKendalaFotoUrl(res.dataUrl);
                  setKendalaFotoNama(res.name);
                }}
              />
            </label>
            {kendalaFotoUrl && (
              <img
                src={kendalaFotoUrl}
                alt="Foto kendala"
                className="mt-2 max-h-36 rounded-xl border t-border object-contain"
              />
            )}
          </div>

          <button
            type="submit"
            disabled={myTasks.length === 0}
            className="w-full py-3 rounded-xl t-btn-primary text-sm font-bold disabled:opacity-50"
          >
            Kirim Laporan Kendala
          </button>
        </form>
      )}

      {/* TAB 3: RIWAYAT */}
      {activeTab === 'riwayat' && (
        <div className="space-y-4 text-xs">
          {/* Completed Trips */}
          <div className="t-card rounded-2xl p-4 space-y-3">
            <h3 className="t-section-label">
              Perjalanan Selesai ({myCompletedTasks.length})
            </h3>
            {myCompletedTasks.length === 0 ? (
              <p className="t-muted">Belum ada perjalanan yang selesai.</p>
            ) : (
              myCompletedTasks.map((t) => {
                const u = unitById.get(t.unitId);
                const muat = lokById.get(t.lokasiMuatId);
                const bongkar = lokById.get(t.lokasiBongkarId);
                return (
                  <div key={t.id} className="p-3 rounded-xl t-subtle border t-border space-y-1">
                    <div className="flex justify-between font-bold">
                      <span className="font-mono-num t-link">
                        {t.nomorPenugasan} &middot; {u?.kodeUnit}
                      </span>
                      <span style={{ color: 'var(--status-ok-text)' }}>Selesai</span>
                    </div>
                    <div className="t-text">
                      {muat?.namaLokasi} &rarr; {bongkar?.namaLokasi}
                    </div>
                    <div className="text-[11px] t-muted font-mono-num">
                      Mulai {formatTimeHM(t.mulaiAktual)} · Muat {formatTimeHM(t.selesaiMuatAktual)}{' '}
                      · Bongkar {formatTimeHM(t.selesaiBongkarAktual)}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* P2H History & Follow-up */}
          <div className="t-card rounded-2xl p-4 space-y-3">
            <h3 className="t-section-label">Riwayat P2H ({myP2HRecords.length})</h3>
            {myP2HRecords.length === 0 ? (
              <p className="t-muted">Belum ada P2H yang dikirim.</p>
            ) : (
              myP2HRecords.map((rec) => {
                const linkedMaint = maintenanceList.filter(
                  (m) => m.p2hId === rec.id || rec.maintenanceIds.includes(m.id),
                );
                return (
                  <div key={rec.id} className="p-3 rounded-xl t-subtle border t-border space-y-1">
                    <div className="flex justify-between font-bold">
                      <span className="font-mono-num t-link">
                        {rec.nomorP2H} &middot; {rec.kodeUnit}
                      </span>
                      <span className="t-text">{rec.statusTinjauan}</span>
                    </div>
                    <div className="text-[11px] t-muted font-mono-num">
                      {formatDateShortID(rec.tanggalIsi)} &middot;{' '}
                      {rec.kilometer.toLocaleString('id-ID')} km &middot; {rec.jumlahTemuan} temuan
                    </div>
                    {linkedMaint.length > 0 && (
                      <div className="text-[11px] font-semibold t-link pt-0.5">
                        Tindak lanjut perbaikan:{' '}
                        {linkedMaint
                          .map((m) => `${m.nomorPengajuan} (${m.status})`)
                          .join(', ')}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Kendala History */}
          <div className="t-card rounded-2xl p-4 space-y-3">
            <h3 className="t-section-label">Laporan Kendala ({myKendala.length})</h3>
            {myKendala.length === 0 ? (
              <p className="t-muted">Belum ada laporan kendala yang dikirim.</p>
            ) : (
              myKendala.map((knd) => (
                <div key={knd.id} className="p-3 rounded-xl t-subtle border t-border space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="font-mono-num t-link">
                      {knd.nomorLaporan} &middot; {knd.kategori}
                    </span>
                    <span className="t-text">{knd.status}</span>
                  </div>
                  <div className="t-text">{knd.catatan}</div>
                  <div className="text-[11px] t-muted">
                    {knd.nomorPenugasan} ({knd.kodeUnit}) &middot;{' '}
                    {formatDateShortID(knd.waktuLapor)}
                  </div>
                  {knd.tindakLanjutAdmin && (
                    <div className="text-[11px] font-semibold t-link inline-flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      <span>Tindak lanjut: {knd.tindakLanjutAdmin}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Permintaan Barang History */}
          <div className="t-card rounded-2xl p-4 space-y-3">
            <h3 className="t-section-label">
              Pengajuan Barang ({myPermintaanBarang.length})
            </h3>
            {myPermintaanBarang.length === 0 ? (
              <p className="t-muted">Belum ada pengajuan barang yang dikirim.</p>
            ) : (
              myPermintaanBarang.map((req) => {
                const computedStatus = computePermintaanBarangStatus(req.items);
                return (
                  <div key={req.id} className="p-3 rounded-xl t-subtle border t-border space-y-1">
                    <div className="flex justify-between font-bold">
                      <span className="font-mono-num t-link">
                        {req.nomorPermintaan} &middot; {req.kodeUnit}
                      </span>
                      <span style={{ color: permintaanStatusColor(computedStatus) }}>
                        {computedStatus}
                      </span>
                    </div>
                    <div className="t-text">
                      {req.items
                        .map((it) => `${it.namaBarang} (${it.jumlahDiminta} ${it.satuan})`)
                        .join(', ')}
                    </div>
                    <div className="text-[11px] t-muted">
                      {formatDateShortID(req.tanggalPermintaan)}
                      {req.catatan ? ` · ${req.catatan}` : ''}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </section>
  );
}
