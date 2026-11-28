import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Eye,
  Lock,
  Package,
  Pencil,
  Play,
  Plus,
  Route,
  Save,
  Search,
  Wallet,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ArmadaMenuIcon } from '../../components/armada/ArmadaMenuIcons';
import { ARMADA_SOPIR_LIST, generateNextArmadaCode } from '../../data/armadaSeed';
import type {
  ArmadaLokasi,
  ArmadaMaintenanceRequest,
  ArmadaP2HRecord,
  ArmadaPelanggan,
  ArmadaPerjalanan,
  ArmadaPerjalananInput,
  ArmadaPerjalananStatus,
  ArmadaSewaUnit,
  ArmadaTarif,
  ArmadaUangJalan,
  ArmadaUnit,
} from '../../types/armada';
import {
  checkUnitScheduleConflict,
  evaluatePerjalananP2HGate,
  toLocalDateTimeMs,
} from '../../utils/armadaSchedule';
import {
  cleanRupiahToNumber,
  formatCurrencyInput,
  formatDateFullID,
  formatDateShortID,
  formatRupiah,
  getTodayISO,
} from '../../utils/format';

interface PerjalananPageProps {
  perjalananList: ArmadaPerjalanan[];
  sewaList: ArmadaSewaUnit[];
  units: ArmadaUnit[];
  pelangganList: ArmadaPelanggan[];
  lokasiList: ArmadaLokasi[];
  tarifList: ArmadaTarif[];
  uangJalanList: ArmadaUangJalan[];
  p2hList: ArmadaP2HRecord[];
  maintenanceList: ArmadaMaintenanceRequest[];
  selectedPerjalananId: string | null;
  onSelectPerjalanan: (id: string | null) => void;
  onSavePerjalanan: (input: ArmadaPerjalananInput) => ArmadaPerjalanan;
  onUpdatePerjalananMuatanWaktu: (params: {
    id: string;
    jenisLimbah?: string;
    kodeLimbah?: string;
    kemasanLimbah?: string;
    estimasiMuatan?: string;
    nomorManifest?: string;
    waktuTibaMuat?: string;
    waktuMuatMulai?: string;
    waktuMuatSelesai?: string;
    waktuTibaBongkar?: string;
    waktuBongkarMulai?: string;
    waktuBongkarSelesai?: string;
  }) => void;
  onStartPerjalanan: (perjalanan: ArmadaPerjalanan) => void;
  onCompletePerjalanan: (perjalanan: ArmadaPerjalanan) => void;
  onCreateUangJalan: (params: {
    perjalananId: string;
    nominalDiajukan: number;
    keperluan: string;
  }) => ArmadaUangJalan;
  onOpenUangJalan: (uangJalanId: string) => void;
  onOpenP2H: (p2hId: string) => void;
}

const JENIS_LIMBAH_OPTIONS = [
  'Limbah B3 Padat',
  'Limbah B3 Cair / Sludge',
  'Limbah Medis / Infeksius',
  'Limbah Non-B3 Industri',
  'Limbah Domestik / Organik',
  'Scrap / Daur Ulang',
];

const KEMASAN_LIMBAH_OPTIONS = [
  'Drum 200L',
  'IBC Tank 1000L',
  'Jumbo Bag (FIBC)',
  'Curah / Bak Terbuka',
  'Kontainer / Roll-Off',
  'Palet / Box Tertutup',
];

function parseHHMMToMinutes(value: string): number | null {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [h, m] = value.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function formatDurationBadge(startHHMM?: string, endHHMM?: string): string | null {
  if (!startHHMM || !endHHMM) return null;
  const start = parseHHMMToMinutes(startHHMM);
  const end = parseHHMMToMinutes(endHHMM);
  if (start === null || end === null || end <= start) return null;
  const diff = end - start;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hours > 0 && mins > 0) return `${hours} jam ${mins} mnt`;
  if (hours > 0) return `${hours} jam`;
  return `${mins} mnt`;
}

export function PerjalananPage({
  perjalananList,
  sewaList,
  units,
  pelangganList,
  lokasiList,
  tarifList,
  uangJalanList,
  p2hList,
  maintenanceList,
  selectedPerjalananId,
  onSelectPerjalanan,
  onSavePerjalanan,
  onUpdatePerjalananMuatanWaktu,
  onStartPerjalanan,
  onCompletePerjalanan,
  onCreateUangJalan,
  onOpenUangJalan,
  onOpenP2H,
}: PerjalananPageProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ArmadaPerjalananStatus>('ALL');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Create Perjalanan Form State
  const [unitId, setUnitId] = useState('');
  const [sopirNama, setSopirNama] = useState('');
  const [pelangganId, setPelangganId] = useState('');
  const [lokasiMuatId, setLokasiMuatId] = useState('');
  const [lokasiBongkarId, setLokasiBongkarId] = useState('');
  const [jenisLimbah, setJenisLimbah] = useState(JENIS_LIMBAH_OPTIONS[0]);
  const [kodeLimbah, setKodeLimbah] = useState('');
  const [kemasanLimbah, setKemasanLimbah] = useState(KEMASAN_LIMBAH_OPTIONS[0]);
  const [estimasiMuatan, setEstimasiMuatan] = useState('');
  const [nomorManifest, setNomorManifest] = useState('');
  const [nomorSuratJalan, setNomorSuratJalan] = useState('');
  const [nominalTarifText, setNominalTarifText] = useState('');
  const [matchedTarifId, setMatchedTarifId] = useState<string | undefined>(undefined);
  const [tanggalMulai, setTanggalMulai] = useState(getTodayISO());
  const [jamMulai, setJamMulai] = useState('08:00');
  const [tanggalSelesai, setTanggalSelesai] = useState(getTodayISO());
  const [jamSelesai, setJamSelesai] = useState('14:00');
  const [waktuTibaMuat, setWaktuTibaMuat] = useState('08:30');
  const [waktuMuatMulai, setWaktuMuatMulai] = useState('08:45');
  const [waktuMuatSelesai, setWaktuMuatSelesai] = useState('09:45');
  const [waktuTibaBongkar, setWaktuTibaBongkar] = useState('11:30');
  const [waktuBongkarMulai, setWaktuBongkarMulai] = useState('11:45');
  const [waktuBongkarSelesai, setWaktuBongkarSelesai] = useState('12:45');
  const [catatan, setCatatan] = useState('');
  const [formError, setFormError] = useState('');

  // Inline Edit State for Ringkasan Penugasan & Rute (Muatan Limbah & Waktu Tiba/Muat/Bongkar)
  const [editingDetailId, setEditingDetailId] = useState<string | null>(null);
  const [editJenisLimbah, setEditJenisLimbah] = useState('');
  const [editKodeLimbah, setEditKodeLimbah] = useState('');
  const [editKemasanLimbah, setEditKemasanLimbah] = useState('');
  const [editEstimasiMuatan, setEditEstimasiMuatan] = useState('');
  const [editNomorManifest, setEditNomorManifest] = useState('');
  const [editWaktuTibaMuat, setEditWaktuTibaMuat] = useState('');
  const [editWaktuMuatMulai, setEditWaktuMuatMulai] = useState('');
  const [editWaktuMuatSelesai, setEditWaktuMuatSelesai] = useState('');
  const [editWaktuTibaBongkar, setEditWaktuTibaBongkar] = useState('');
  const [editWaktuBongkarMulai, setEditWaktuBongkarMulai] = useState('');
  const [editWaktuBongkarSelesai, setEditWaktuBongkarSelesai] = useState('');
  const [editDetailError, setEditDetailError] = useState('');

  // Ajukan Uang Jalan Modal State
  const [ujModalOpen, setUjModalOpen] = useState(false);
  const [ujNominalText, setUjNominalText] = useState('');
  const [ujKeperluan, setUjKeperluan] = useState('');
  const [ujError, setUjError] = useState('');

  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const plgById = useMemo(() => new Map(pelangganList.map((p) => [p.id, p])), [pelangganList]);
  const lokById = useMemo(() => new Map(lokasiList.map((l) => [l.id, l])), [lokasiList]);

  const selectedPerjalanan = useMemo(
    () =>
      selectedPerjalananId
        ? perjalananList.find((p) => p.id === selectedPerjalananId) || null
        : null,
    [perjalananList, selectedPerjalananId],
  );

  const activeUnits = useMemo(() => units.filter((u) => u.status === 'Aktif'), [units]);

  const muatOptions = useMemo(
    () =>
      lokasiList.filter(
        (l) =>
          (!pelangganId || l.pelangganId === pelangganId) &&
          (l.jenisLokasi === 'Muat' || l.jenisLokasi === 'Keduanya'),
      ),
    [lokasiList, pelangganId],
  );

  const bongkarOptions = useMemo(
    () =>
      lokasiList.filter(
        (l) =>
          (!pelangganId || l.pelangganId === pelangganId) &&
          (l.jenisLokasi === 'Bongkar' || l.jenisLokasi === 'Keduanya'),
      ),
    [lokasiList, pelangganId],
  );

  const autoMatchTarif = (
    nextUnitId: string,
    nextPlgId: string,
    nextMuatId: string,
    nextBongkarId: string,
  ) => {
    const unit = unitById.get(nextUnitId);
    if (!unit || !nextPlgId || !nextMuatId || !nextBongkarId) return;
    const matched = tarifList
      .filter(
        (t) =>
          t.status === 'Aktif' &&
          t.pelangganId === nextPlgId &&
          t.lokasiMuatId === nextMuatId &&
          t.lokasiBongkarId === nextBongkarId &&
          t.jenisKendaraan.toLowerCase() === unit.jenisKendaraan.toLowerCase(),
      )
      .sort((a, b) => b.tanggalMulaiBerlaku.localeCompare(a.tanggalMulaiBerlaku))[0];
    if (matched) {
      setMatchedTarifId(matched.id);
      setNominalTarifText(formatCurrencyInput(String(Math.round(matched.nominal))));
    } else {
      setMatchedTarifId(undefined);
    }
  };

  const openCreatePerjalanan = () => {
    setFormError('');
    const firstUnit = activeUnits[0];
    const firstPlg = pelangganList[0];
    const firstMuat = lokasiList.find(
      (l) =>
        l.pelangganId === firstPlg?.id &&
        (l.jenisLokasi === 'Muat' || l.jenisLokasi === 'Keduanya'),
    );
    const firstBongkar = lokasiList.find(
      (l) =>
        l.pelangganId === firstPlg?.id &&
        l.id !== firstMuat?.id &&
        (l.jenisLokasi === 'Bongkar' || l.jenisLokasi === 'Keduanya'),
    );
    setUnitId(firstUnit?.id || '');
    setSopirNama(firstUnit?.supirUtama && firstUnit.supirUtama !== '-' ? firstUnit.supirUtama : ARMADA_SOPIR_LIST[0]);
    setPelangganId(firstPlg?.id || '');
    setLokasiMuatId(firstMuat?.id || '');
    setLokasiBongkarId(firstBongkar?.id || '');
    setJenisLimbah(JENIS_LIMBAH_OPTIONS[0]);
    setKodeLimbah('');
    setKemasanLimbah(KEMASAN_LIMBAH_OPTIONS[0]);
    setEstimasiMuatan('');
    setNomorManifest('');
    setNomorSuratJalan('');
    setTanggalMulai(getTodayISO());
    setJamMulai('08:00');
    setTanggalSelesai(getTodayISO());
    setJamSelesai('14:00');
    setWaktuTibaMuat('08:30');
    setWaktuMuatMulai('08:45');
    setWaktuMuatSelesai('09:45');
    setWaktuTibaBongkar('11:30');
    setWaktuBongkarMulai('11:45');
    setWaktuBongkarSelesai('12:45');
    setCatatan('');
    setNominalTarifText('');
    setMatchedTarifId(undefined);
    if (firstUnit && firstPlg && firstMuat && firstBongkar) {
      autoMatchTarif(firstUnit.id, firstPlg.id, firstMuat.id, firstBongkar.id);
    }
    setCreateModalOpen(true);
  };

  const handleSubmitPerjalanan = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!unitId || !sopirNama.trim() || !pelangganId || !lokasiMuatId || !lokasiBongkarId) {
      setFormError('Unit, sopir, pelanggan, lokasi muat, dan lokasi bongkar wajib diisi.');
      return;
    }
    if (lokasiMuatId === lokasiBongkarId) {
      setFormError('Lokasi muat dan lokasi bongkar tidak boleh sama.');
      return;
    }

    const startMs = toLocalDateTimeMs(tanggalMulai, jamMulai);
    const endMs = toLocalDateTimeMs(tanggalSelesai, jamSelesai);
    if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
      setFormError('Tanggal & jam selesai harus lebih besar dari tanggal & jam mulai.');
      return;
    }

    const muatStartMin = parseHHMMToMinutes(waktuMuatMulai);
    const muatEndMin = parseHHMMToMinutes(waktuMuatSelesai);
    if (muatStartMin !== null && muatEndMin !== null && muatEndMin < muatStartMin) {
      setFormError('Waktu selesai muat tidak boleh lebih awal dari waktu mulai muat.');
      return;
    }

    const bongkarStartMin = parseHHMMToMinutes(waktuBongkarMulai);
    const bongkarEndMin = parseHHMMToMinutes(waktuBongkarSelesai);
    if (bongkarStartMin !== null && bongkarEndMin !== null && bongkarEndMin < bongkarStartMin) {
      setFormError('Waktu selesai bongkar tidak boleh lebih awal dari waktu mulai bongkar.');
      return;
    }

    const conflict = checkUnitScheduleConflict({
      unitId,
      tanggalMulai,
      jamMulai,
      tanggalSelesai,
      jamSelesai,
      perjalananList,
      sewaList,
      units,
      pelangganList,
    });
    if (conflict) {
      setFormError(`Jadwal bentrok! ${conflict.reason}`);
      return;
    }

    const matchedTarif = matchedTarifId
      ? tarifList.find((t) => t.id === matchedTarifId)
      : undefined;

    const saved = onSavePerjalanan({
      nomorPenugasan: generateNextArmadaCode(
        'PRJ',
        perjalananList.map((p) => p.nomorPenugasan),
      ),
      nomorSuratJalan: nomorSuratJalan.trim() || undefined,
      nomorManifest: nomorManifest.trim() || undefined,
      jenisLimbah: jenisLimbah.trim() || undefined,
      kodeLimbah: kodeLimbah.trim() || undefined,
      kemasanLimbah: kemasanLimbah.trim() || undefined,
      estimasiMuatan: estimasiMuatan.trim() || undefined,
      unitId,
      sopirNama: sopirNama.trim(),
      pelangganId,
      lokasiMuatId,
      lokasiBongkarId,
      tarifId: matchedTarif?.id,
      dasarTarif: matchedTarif?.dasarTarif || 'Per Rit / Trip',
      nominalTarif: cleanRupiahToNumber(nominalTarifText),
      tanggalMulai,
      jamMulai,
      tanggalSelesai,
      jamSelesai,
      waktuTibaMuat: waktuTibaMuat || undefined,
      waktuMuatMulai: waktuMuatMulai || undefined,
      waktuMuatSelesai: waktuMuatSelesai || undefined,
      waktuTibaBongkar: waktuTibaBongkar || undefined,
      waktuBongkarMulai: waktuBongkarMulai || undefined,
      waktuBongkarSelesai: waktuBongkarSelesai || undefined,
      catatan: catatan.trim(),
    });
    setCreateModalOpen(false);
    onSelectPerjalanan(saved.id);
  };

  const handleSubmitUangJalan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerjalanan) return;
    setUjError('');
    const nom = cleanRupiahToNumber(ujNominalText);
    if (nom <= 0) {
      setUjError('Nominal uang jalan yang diminta harus lebih dari Rp 0.');
      return;
    }
    if (!ujKeperluan.trim()) {
      setUjError('Keperluan uang jalan wajib diisi.');
      return;
    }
    const created = onCreateUangJalan({
      perjalananId: selectedPerjalanan.id,
      nominalDiajukan: nom,
      keperluan: ujKeperluan.trim(),
    });
    setUjModalOpen(false);
    setUjNominalText('');
    setUjKeperluan('');
    onOpenUangJalan(created.id);
  };

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return perjalananList.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (q) {
        const unit = unitById.get(p.unitId);
        const plg = plgById.get(p.pelangganId);
        const muat = lokById.get(p.lokasiMuatId);
        const bongkar = lokById.get(p.lokasiBongkarId);
        const hit =
          p.nomorPenugasan.toLowerCase().includes(q) ||
          p.sopirNama.toLowerCase().includes(q) ||
          (unit?.kodeUnit || '').toLowerCase().includes(q) ||
          (unit?.nomorPolisi || '').toLowerCase().includes(q) ||
          (plg?.namaPt || '').toLowerCase().includes(q) ||
          (muat?.namaLokasi || '').toLowerCase().includes(q) ||
          (bongkar?.namaLokasi || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [lokById, perjalananList, plgById, search, statusFilter, unitById]);

  const statusTone = (status: ArmadaPerjalananStatus) => {
    if (status === 'Berjalan') return 'var(--status-info-text)';
    if (status === 'Selesai') return 'var(--status-ok-text)';
    if (status === 'Dibatalkan') return 'var(--status-bad-text)';
    return 'var(--status-warn-text)';
  };

  // DETAIL PERJALANAN VIEW
  if (selectedPerjalanan) {
    const unit = unitById.get(selectedPerjalanan.unitId);
    const plg = plgById.get(selectedPerjalanan.pelangganId);
    const muat = lokById.get(selectedPerjalanan.lokasiMuatId);
    const bongkar = lokById.get(selectedPerjalanan.lokasiBongkarId);
    const relatedUangJalan = uangJalanList.filter(
      (u) => u.perjalananId === selectedPerjalanan.id,
    );
    const relatedP2H = p2hList
      .filter((p) => p.perjalananId === selectedPerjalanan.id)
      .sort((a, b) => b.tanggalIsi.localeCompare(a.tanggalIsi));
    const p2hGate = evaluatePerjalananP2HGate(
      selectedPerjalanan.id,
      p2hList,
      maintenanceList,
    );

    return (
      <section className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs t-muted">
              <span>Perjalanan &amp; Sewa</span>
              <span aria-hidden="true">/</span>
              <button
                type="button"
                onClick={() => onSelectPerjalanan(null)}
                className="t-link hover:underline font-medium"
              >
                Perjalanan
              </button>
              <span aria-hidden="true">/</span>
              <span className="t-text font-mono-num font-semibold">
                {selectedPerjalanan.nomorPenugasan}
              </span>
            </div>
            <div className="flex items-start gap-3 pt-0.5">
              <div className="w-11 h-11 rounded-xl t-subtle border t-border flex items-center justify-center shrink-0">
                <ArmadaMenuIcon id="armada-perjalanan" size={30} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-display font-bold t-text leading-snug">
                  {selectedPerjalanan.nomorPenugasan} &mdash; {unit?.kodeUnit || '-'}{' '}
                  <span className="text-sm font-mono-num t-muted">
                    ({unit?.nomorPolisi || '-'})
                  </span>
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs t-muted mt-0.5">
                  <span className="font-semibold t-text">{plg?.namaPt || '-'}</span>
                  <span aria-hidden="true">&middot;</span>
                  <span>Sopir: {selectedPerjalanan.sopirNama}</span>
                  <span aria-hidden="true">&middot;</span>
                  <span
                    className="font-bold"
                    style={{ color: statusTone(selectedPerjalanan.status) }}
                  >
                    {selectedPerjalanan.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectPerjalanan(null)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Daftar Perjalanan</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setUjError('');
                setUjNominalText('500.000');
                setUjKeperluan(
                  `BBM, tol, dan parkir rute ${muat?.namaLokasi || '-'} → ${
                    bongkar?.namaLokasi || '-'
                  }`,
                );
                setUjModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-bold whitespace-nowrap"
            >
              <Wallet className="w-3.5 h-3.5 t-link" />
              <span>Ajukan Uang Jalan</span>
            </button>

            {selectedPerjalanan.status === 'Dijadwalkan' && (
              <button
                type="button"
                disabled={p2hGate.blocked}
                onClick={() => onStartPerjalanan(selectedPerjalanan)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl t-btn-primary text-xs whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {p2hGate.blocked ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>Mulai Perjalanan</span>
              </button>
            )}

            {selectedPerjalanan.status === 'Berjalan' && (
              <button
                type="button"
                onClick={() => onCompletePerjalanan(selectedPerjalanan)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl t-btn-primary text-xs whitespace-nowrap"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Selesaikan Perjalanan</span>
              </button>
            )}
          </div>
        </div>

        {/* Critical P2H Hold Warning */}
        {p2hGate.blocked && (
          <div className="p-4 rounded-2xl t-status-bad text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Tombol Mulai Perjalanan Ditahan (Temuan Kritis P2H)</div>
                <p className="mt-0.5 opacity-90">{p2hGate.reason}</p>
              </div>
            </div>
            {p2hGate.latestP2H && (
              <button
                type="button"
                onClick={() => onOpenP2H(p2hGate.latestP2H!.id)}
                className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 font-bold whitespace-nowrap"
              >
                Tinjau {p2hGate.latestP2H.nomorP2H}
              </button>
            )}
          </div>
        )}

        {/* Detail Perjalanan Info Card */}
        <div className="t-card rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b t-border pb-3">
            <h3 className="t-section-label">Ringkasan Penugasan &amp; Rute</h3>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[11px] font-mono-num t-muted">
                {formatDateFullID(selectedPerjalanan.tanggalMulai)} &middot;{' '}
                {selectedPerjalanan.jamMulai}–{selectedPerjalanan.jamSelesai}
              </span>
              {selectedPerjalanan.status !== 'Dibatalkan' &&
                editingDetailId !== selectedPerjalanan.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditDetailError('');
                      setEditJenisLimbah(selectedPerjalanan.jenisLimbah || JENIS_LIMBAH_OPTIONS[0]);
                      setEditKodeLimbah(selectedPerjalanan.kodeLimbah || '');
                      setEditKemasanLimbah(
                        selectedPerjalanan.kemasanLimbah || KEMASAN_LIMBAH_OPTIONS[0],
                      );
                      setEditEstimasiMuatan(selectedPerjalanan.estimasiMuatan || '');
                      setEditNomorManifest(selectedPerjalanan.nomorManifest || '');
                      setEditWaktuTibaMuat(selectedPerjalanan.waktuTibaMuat || '');
                      setEditWaktuMuatMulai(selectedPerjalanan.waktuMuatMulai || '');
                      setEditWaktuMuatSelesai(selectedPerjalanan.waktuMuatSelesai || '');
                      setEditWaktuTibaBongkar(selectedPerjalanan.waktuTibaBongkar || '');
                      setEditWaktuBongkarMulai(selectedPerjalanan.waktuBongkarMulai || '');
                      setEditWaktuBongkarSelesai(selectedPerjalanan.waktuBongkarSelesai || '');
                      setEditingDetailId(selectedPerjalanan.id);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl t-btn-secondary text-[11px] font-bold"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Limbah &amp; Waktu</span>
                  </button>
                )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-xs">
            <div>
              <div className="t-field-label">Unit &amp; Nomor Polisi</div>
              <div className="font-mono-num font-bold t-text text-sm mt-1">
                {unit?.kodeUnit || '-'} &middot; {unit?.nomorPolisi || '-'}
              </div>
              <div className="text-[11px] t-muted">{unit?.jenisKendaraan || '-'}</div>
            </div>
            <div>
              <div className="t-field-label">Sopir Bertugas</div>
              <div className="font-semibold t-text text-sm mt-1">
                {selectedPerjalanan.sopirNama}
              </div>
            </div>
            <div>
              <div className="t-field-label">Pelanggan</div>
              <div className="font-semibold t-text text-sm mt-1">{plg?.namaPt || '-'}</div>
              <div className="text-[11px] t-muted">PIC: {plg?.pic || '-'}</div>
            </div>
            <div>
              <div className="t-field-label">Tarif Disepakati</div>
              <div className="font-mono-num tabular-nums font-bold t-text text-sm mt-1">
                {selectedPerjalanan.nominalTarif > 0
                  ? formatRupiah(selectedPerjalanan.nominalTarif)
                  : '-'}
              </div>
              <div className="text-[11px] t-muted">{selectedPerjalanan.dasarTarif || 'Per Rit / Trip'}</div>
            </div>

            <div className="sm:col-span-2 pt-3 border-t t-border">
              <div className="t-field-label">Lokasi Muat (Penghasil Limbah)</div>
              <div className="font-semibold t-text mt-1">{muat?.namaLokasi || '-'}</div>
              <div className="text-[11px] t-muted mt-0.5">{muat?.alamatLengkap || '-'}</div>
            </div>
            <div className="sm:col-span-2 pt-3 border-t t-border">
              <div className="t-field-label">Lokasi Bongkar (Pengolah / Pemanfaat)</div>
              <div className="font-semibold t-text mt-1">{bongkar?.namaLokasi || '-'}</div>
              <div className="text-[11px] t-muted mt-0.5">{bongkar?.alamatLengkap || '-'}</div>
            </div>

            {editingDetailId === selectedPerjalanan.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setEditDetailError('');
                  const muatStart = parseHHMMToMinutes(editWaktuMuatMulai);
                  const muatEnd = parseHHMMToMinutes(editWaktuMuatSelesai);
                  if (muatStart !== null && muatEnd !== null && muatEnd < muatStart) {
                    setEditDetailError(
                      'Waktu selesai muat tidak boleh lebih awal dari waktu mulai muat.',
                    );
                    return;
                  }
                  const bongkarStart = parseHHMMToMinutes(editWaktuBongkarMulai);
                  const bongkarEnd = parseHHMMToMinutes(editWaktuBongkarSelesai);
                  if (bongkarStart !== null && bongkarEnd !== null && bongkarEnd < bongkarStart) {
                    setEditDetailError(
                      'Waktu selesai bongkar tidak boleh lebih awal dari waktu mulai bongkar.',
                    );
                    return;
                  }
                  onUpdatePerjalananMuatanWaktu({
                    id: selectedPerjalanan.id,
                    jenisLimbah: editJenisLimbah,
                    kodeLimbah: editKodeLimbah,
                    kemasanLimbah: editKemasanLimbah,
                    estimasiMuatan: editEstimasiMuatan,
                    nomorManifest: editNomorManifest,
                    waktuTibaMuat: editWaktuTibaMuat,
                    waktuMuatMulai: editWaktuMuatMulai,
                    waktuMuatSelesai: editWaktuMuatSelesai,
                    waktuTibaBongkar: editWaktuTibaBongkar,
                    waktuBongkarMulai: editWaktuBongkarMulai,
                    waktuBongkarSelesai: editWaktuBongkarSelesai,
                  });
                  setEditingDetailId(null);
                }}
                className="sm:col-span-2 lg:col-span-4 pt-3 border-t t-border space-y-4"
              >
                {editDetailError && (
                  <div className="p-3 rounded-xl t-status-bad font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{editDetailError}</span>
                  </div>
                )}

                {/* Baris 1: Detail Muatan Limbah */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="edit-jenis-limbah" className="block t-field-label">
                      Jenis &amp; Kode Limbah
                    </label>
                    <select
                      id="edit-jenis-limbah"
                      value={editJenisLimbah}
                      onChange={(e) => setEditJenisLimbah(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl t-input font-semibold"
                    >
                      {!JENIS_LIMBAH_OPTIONS.includes(editJenisLimbah) && editJenisLimbah && (
                        <option value={editJenisLimbah}>{editJenisLimbah}</option>
                      )}
                      {JENIS_LIMBAH_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={editKodeLimbah}
                      onChange={(e) => setEditKodeLimbah(e.target.value)}
                      placeholder="Kode B3 (mis. A102d, B105d)"
                      className="w-full px-2.5 py-1.5 rounded-xl t-input font-mono-num"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-kemasan" className="block t-field-label mb-1.5">
                      Kemasan / Wadah
                    </label>
                    <select
                      id="edit-kemasan"
                      value={editKemasanLimbah}
                      onChange={(e) => setEditKemasanLimbah(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl t-input font-semibold"
                    >
                      {!KEMASAN_LIMBAH_OPTIONS.includes(editKemasanLimbah) && editKemasanLimbah && (
                        <option value={editKemasanLimbah}>{editKemasanLimbah}</option>
                      )}
                      {KEMASAN_LIMBAH_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="edit-estimasi" className="block t-field-label mb-1.5">
                      Estimasi Berat / Volume
                    </label>
                    <input
                      id="edit-estimasi"
                      type="text"
                      value={editEstimasiMuatan}
                      onChange={(e) => setEditEstimasiMuatan(e.target.value)}
                      placeholder="Contoh: 4,5 Ton / 24 Drum"
                      className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-manifest" className="block t-field-label mb-1.5">
                      No. Manifest / Festronik
                    </label>
                    <input
                      id="edit-manifest"
                      type="text"
                      value={editNomorManifest}
                      onChange={(e) => setEditNomorManifest(e.target.value)}
                      placeholder="Contoh: MAN-2026-0012"
                      className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num"
                    />
                  </div>
                </div>

                {/* Baris 2: Waktu Tiba, Muat & Bongkar */}
                <div className="pt-3 border-t t-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label htmlFor="edit-tiba-muat" className="block t-field-label mb-1.5">
                      Waktu Tiba (Muat)
                    </label>
                    <input
                      id="edit-tiba-muat"
                      type="time"
                      value={editWaktuTibaMuat}
                      onChange={(e) => setEditWaktuTibaMuat(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="t-field-label">Waktu Muat</span>
                      {formatDurationBadge(editWaktuMuatMulai, editWaktuMuatSelesai) && (
                        <span className="text-[10px] font-mono-num t-muted">
                          {formatDurationBadge(editWaktuMuatMulai, editWaktuMuatSelesai)}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="time"
                        aria-label="Waktu Mulai Muat"
                        value={editWaktuMuatMulai}
                        onChange={(e) => setEditWaktuMuatMulai(e.target.value)}
                        className="w-full px-2 py-2 rounded-xl t-input font-mono-num"
                      />
                      <input
                        type="time"
                        aria-label="Waktu Selesai Muat"
                        value={editWaktuMuatSelesai}
                        onChange={(e) => setEditWaktuMuatSelesai(e.target.value)}
                        className="w-full px-2 py-2 rounded-xl t-input font-mono-num"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="edit-tiba-bongkar" className="block t-field-label mb-1.5">
                      Waktu Tiba (Bongkar)
                    </label>
                    <input
                      id="edit-tiba-bongkar"
                      type="time"
                      value={editWaktuTibaBongkar}
                      onChange={(e) => setEditWaktuTibaBongkar(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="t-field-label">Waktu Bongkar</span>
                      {formatDurationBadge(editWaktuBongkarMulai, editWaktuBongkarSelesai) && (
                        <span className="text-[10px] font-mono-num t-muted">
                          {formatDurationBadge(editWaktuBongkarMulai, editWaktuBongkarSelesai)}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="time"
                        aria-label="Waktu Mulai Bongkar"
                        value={editWaktuBongkarMulai}
                        onChange={(e) => setEditWaktuBongkarMulai(e.target.value)}
                        className="w-full px-2 py-2 rounded-xl t-input font-mono-num"
                      />
                      <input
                        type="time"
                        aria-label="Waktu Selesai Bongkar"
                        value={editWaktuBongkarSelesai}
                        onChange={(e) => setEditWaktuBongkarSelesai(e.target.value)}
                        className="w-full px-2 py-2 rounded-xl t-input font-mono-num"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDetailId(null);
                      setEditDetailError('');
                    }}
                    className="px-3.5 py-2 rounded-xl t-btn-secondary font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl t-btn-primary font-bold"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="sm:col-span-2 lg:col-span-4 pt-3 border-t t-border grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <div className="t-field-label">Jenis &amp; Kode Limbah</div>
                    <div className="font-semibold t-text mt-1">
                      {selectedPerjalanan.jenisLimbah || '-'}
                    </div>
                    {selectedPerjalanan.kodeLimbah && (
                      <div className="text-[11px] font-mono-num t-muted">
                        Kode: {selectedPerjalanan.kodeLimbah}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="t-field-label">Kemasan / Wadah</div>
                    <div className="font-semibold t-text mt-1">
                      {selectedPerjalanan.kemasanLimbah || '-'}
                    </div>
                  </div>
                  <div>
                    <div className="t-field-label">Estimasi Berat / Volume</div>
                    <div className="font-mono-num font-semibold t-text mt-1">
                      {selectedPerjalanan.estimasiMuatan || '-'}
                    </div>
                  </div>
                  <div>
                    <div className="t-field-label">No. Manifest / Festronik</div>
                    <div className="font-mono-num font-semibold t-text mt-1">
                      {selectedPerjalanan.nomorManifest || '-'}
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2 lg:col-span-4 pt-3 border-t t-border grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <div className="t-field-label">Waktu Tiba (Muat)</div>
                    <div className="font-mono-num font-bold t-text mt-1">
                      {selectedPerjalanan.waktuTibaMuat || '-'}
                    </div>
                  </div>
                  <div>
                    <div className="t-field-label">Waktu Muat</div>
                    <div className="font-mono-num font-bold t-text mt-1">
                      {selectedPerjalanan.waktuMuatMulai || '-'}
                      {selectedPerjalanan.waktuMuatSelesai
                        ? ` – ${selectedPerjalanan.waktuMuatSelesai}`
                        : ''}
                    </div>
                    {formatDurationBadge(
                      selectedPerjalanan.waktuMuatMulai,
                      selectedPerjalanan.waktuMuatSelesai,
                    ) && (
                      <div className="text-[11px] t-muted">
                        Durasi:{' '}
                        {formatDurationBadge(
                          selectedPerjalanan.waktuMuatMulai,
                          selectedPerjalanan.waktuMuatSelesai,
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="t-field-label">Waktu Tiba (Bongkar)</div>
                    <div className="font-mono-num font-bold t-text mt-1">
                      {selectedPerjalanan.waktuTibaBongkar || '-'}
                    </div>
                  </div>
                  <div>
                    <div className="t-field-label">Waktu Bongkar</div>
                    <div className="font-mono-num font-bold t-text mt-1">
                      {selectedPerjalanan.waktuBongkarMulai || '-'}
                      {selectedPerjalanan.waktuBongkarSelesai
                        ? ` – ${selectedPerjalanan.waktuBongkarSelesai}`
                        : ''}
                    </div>
                    {formatDurationBadge(
                      selectedPerjalanan.waktuBongkarMulai,
                      selectedPerjalanan.waktuBongkarSelesai,
                    ) && (
                      <div className="text-[11px] t-muted">
                        Durasi:{' '}
                        {formatDurationBadge(
                          selectedPerjalanan.waktuBongkarMulai,
                          selectedPerjalanan.waktuBongkarSelesai,
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {selectedPerjalanan.catatan && (
              <div className="sm:col-span-2 lg:col-span-4 pt-3 border-t t-border">
                <div className="t-field-label">Catatan Operasional &amp; Safety</div>
                <div className="t-text mt-1">{selectedPerjalanan.catatan}</div>
              </div>
            )}
          </div>
        </div>

        {/* Linked Uang Jalan Section */}
        <div className="t-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b t-border flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="t-section-label">Uang Jalan Terkait ({relatedUangJalan.length})</h3>
              <p className="text-[11px] t-muted mt-0.5">
                Pengajuan uang jalan yang langsung terhubung ke unit, sopir, dan rute perjalanan ini.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setUjError('');
                setUjNominalText('500.000');
                setUjKeperluan(
                  `BBM, tol, dan parkir rute ${muat?.namaLokasi || '-'} → ${
                    bongkar?.namaLokasi || '-'
                  }`,
                );
                setUjModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl t-btn-primary text-xs whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajukan Uang Jalan</span>
            </button>
          </div>

          {relatedUangJalan.length === 0 ? (
            <div className="p-6 text-center text-xs t-muted">
              Belum ada pengajuan uang jalan untuk perjalanan ini. Klik <b>Ajukan Uang Jalan</b>{' '}
              untuk membuat pengajuan dengan data unit, sopir, dan rute otomatis.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="t-subtle border-b t-border">
                    <th className="py-3 px-5 t-th-label">No. Uang Jalan</th>
                    <th className="py-3 px-4 t-th-label">Keperluan</th>
                    <th className="py-3 px-4 t-th-label text-right">Diajukan</th>
                    <th className="py-3 px-4 t-th-label text-right">Dicairkan</th>
                    <th className="py-3 px-4 t-th-label">Tahap</th>
                    <th className="py-3 px-5 t-th-label text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y t-border">
                  {relatedUangJalan.map((uj) => (
                    <tr key={uj.id} className="t-row-hover">
                      <td className="py-3 px-5 font-mono-num font-bold t-link whitespace-nowrap">
                        {uj.nomorUangJalan}
                      </td>
                      <td className="py-3 px-4 t-text">{uj.keperluan}</td>
                      <td className="py-3 px-4 text-right font-mono-num tabular-nums t-text whitespace-nowrap">
                        {formatRupiah(uj.nominalDiajukan)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num tabular-nums font-bold t-text whitespace-nowrap">
                        {uj.nominalDicairkan ? formatRupiah(uj.nominalDicairkan) : '-'}
                      </td>
                      <td className="py-3 px-4 font-bold whitespace-nowrap">{uj.status}</td>
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onOpenUangJalan(uj.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl t-btn-secondary text-[11px] font-bold"
                        >
                          <span>Kelola</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Linked P2H Section */}
        <div className="t-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b t-border flex items-center justify-between gap-2">
            <div>
              <h3 className="t-section-label">Riwayat P2H Perjalanan ({relatedP2H.length})</h3>
              <p className="text-[11px] t-muted mt-0.5">
                Pemeriksaan harian kendaraan oleh sopir sebelum berangkat.
              </p>
            </div>
          </div>
          {relatedP2H.length === 0 ? (
            <div className="p-6 text-center text-xs t-muted">
              Belum ada P2H yang dikirim oleh sopir <b>{selectedPerjalanan.sopirNama}</b> untuk
              penugasan ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="t-subtle border-b t-border">
                    <th className="py-3 px-5 t-th-label">No. P2H</th>
                    <th className="py-3 px-4 t-th-label">Waktu Isi</th>
                    <th className="py-3 px-4 t-th-label text-right">Kilometer</th>
                    <th className="py-3 px-4 t-th-label">Temuan</th>
                    <th className="py-3 px-4 t-th-label">Status</th>
                    <th className="py-3 px-5 t-th-label text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y t-border">
                  {relatedP2H.map((rec) => (
                    <tr key={rec.id} className="t-row-hover">
                      <td className="py-3 px-5 font-mono-num font-bold t-link whitespace-nowrap">
                        {rec.nomorP2H}
                        {rec.isPemeriksaanUlang ? ' (Ulang)' : ''}
                      </td>
                      <td className="py-3 px-4 font-mono-num t-muted whitespace-nowrap">
                        {formatDateShortID(rec.tanggalIsi)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num tabular-nums t-text whitespace-nowrap">
                        {rec.kilometer.toLocaleString('id-ID')} km
                      </td>
                      <td className="py-3 px-4 t-text whitespace-nowrap">
                        {rec.jumlahTemuan === 0
                          ? 'Tidak ada temuan'
                          : `${rec.jumlahTemuan} temuan${rec.adaTemuanKritis ? ' (Kritis)' : ''}`}
                      </td>
                      <td className="py-3 px-4 font-bold whitespace-nowrap">{rec.statusTinjauan}</td>
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onOpenP2H(rec.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl t-btn-secondary text-[11px] font-bold"
                        >
                          <ClipboardCheck className="w-3 h-3" />
                          <span>Lihat P2H</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Ajukan Uang Jalan Modal */}
        {ujModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setUjModalOpen(false)}
          >
            <div
              className="w-full max-w-lg t-card rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b t-border flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-display t-text">Ajukan Uang Jalan</h3>
                  <p className="text-[11px] t-muted mt-0.5">
                    Tahap 1 (Diajukan oleh Admin Armada) &middot; Otomatis mengambil data perjalanan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUjModalOpen(false)}
                  aria-label="Tutup modal uang jalan"
                  className="p-1.5 rounded-xl t-btn-secondary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSubmitUangJalan} className="p-5 space-y-4 text-xs">
                {ujError && (
                  <div className="p-3 rounded-xl t-status-bad font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{ujError}</span>
                  </div>
                )}

                <div className="p-3.5 rounded-xl t-subtle border t-border space-y-1.5">
                  <div className="flex justify-between">
                    <span className="t-muted">Perjalanan:</span>
                    <span className="font-mono-num font-bold t-text">
                      {selectedPerjalanan.nomorPenugasan}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="t-muted">Unit &amp; Sopir:</span>
                    <span className="font-semibold t-text">
                      {unit?.kodeUnit} ({unit?.nomorPolisi}) &middot; {selectedPerjalanan.sopirNama}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="t-muted shrink-0">Rute:</span>
                    <span className="font-semibold t-text text-right">
                      {muat?.namaLokasi || '-'} &rarr; {bongkar?.namaLokasi || '-'}
                    </span>
                  </div>
                </div>

                <div>
                  <label htmlFor="uj-nominal" className="block t-field-label mb-1">
                    Nominal Diminta (Rp) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold t-muted">
                      Rp
                    </span>
                    <input
                      id="uj-nominal"
                      type="text"
                      inputMode="numeric"
                      required
                      value={ujNominalText}
                      onChange={(e) => setUjNominalText(formatCurrencyInput(e.target.value))}
                      placeholder="500.000"
                      className="w-full pl-9 pr-3 py-2 rounded-xl t-input font-mono-num font-bold text-right"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="uj-keperluan" className="block t-field-label mb-1">
                    Keperluan *
                  </label>
                  <textarea
                    id="uj-keperluan"
                    required
                    rows={3}
                    value={ujKeperluan}
                    onChange={(e) => setUjKeperluan(e.target.value)}
                    placeholder="Contoh: BBM solar, tol Cikarang–Bekasi, parkir gudang"
                    className="w-full px-3 py-2 rounded-xl t-input resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t t-border">
                  <button
                    type="button"
                    onClick={() => setUjModalOpen(false)}
                    className="px-4 py-2 rounded-xl t-btn-secondary font-semibold"
                  >
                    Batal
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-xl t-btn-primary">
                    Kirim Pengajuan Uang Jalan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
    );
  }

  // DAFTAR PERJALANAN VIEW
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={openCreatePerjalanan}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl t-btn-primary text-xs whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Perjalanan</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="t-card rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8">
          <label htmlFor="prj-search" className="block t-field-label mb-1">
            Cari No. Penugasan, Unit, Sopir, Pelanggan, atau Rute
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 t-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="prj-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Contoh: PRJ-001, ARM-001, PT Demo Logistik..."
              className="w-full text-xs pl-8 pr-3 py-2 rounded-xl t-input"
            />
          </div>
        </div>
        <div className="sm:col-span-4">
          <label htmlFor="prj-status" className="block t-field-label mb-1">
            Status Perjalanan
          </label>
          <select
            id="prj-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | ArmadaPerjalananStatus)}
            className="w-full text-xs px-3 py-2 rounded-xl t-input font-semibold"
          >
            <option value="ALL">Semua Status</option>
            <option value="Dijadwalkan">Dijadwalkan</option>
            <option value="Berjalan">Berjalan</option>
            <option value="Selesai">Selesai</option>
            <option value="Dibatalkan">Dibatalkan</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="t-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="t-subtle border-b t-border">
                <th className="py-3.5 px-5 t-th-label">Penugasan &amp; Unit</th>
                <th className="py-3.5 px-4 t-th-label">Sopir</th>
                <th className="py-3.5 px-4 t-th-label">Pelanggan &amp; Rute</th>
                <th className="py-3.5 px-4 t-th-label">Jadwal</th>
                <th className="py-3.5 px-4 t-th-label text-right">Tarif</th>
                <th className="py-3.5 px-4 t-th-label">Status</th>
                <th className="py-3.5 px-5 t-th-label text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y t-border">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center t-muted">
                    Tidak ada perjalanan yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredList.map((prj) => {
                  const unit = unitById.get(prj.unitId);
                  const plg = plgById.get(prj.pelangganId);
                  const muat = lokById.get(prj.lokasiMuatId);
                  const bongkar = lokById.get(prj.lokasiBongkarId);
                  const gate = evaluatePerjalananP2HGate(prj.id, p2hList, maintenanceList);
                  return (
                    <tr
                      key={prj.id}
                      onClick={() => onSelectPerjalanan(prj.id)}
                      className="t-row-hover cursor-pointer"
                    >
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="font-mono-num font-bold t-link">{prj.nomorPenugasan}</div>
                        <div className="text-[11px] font-mono-num t-text font-semibold">
                          {unit?.kodeUnit || '-'} &middot; {unit?.nomorPolisi || '-'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium t-text whitespace-nowrap">
                        {prj.sopirNama}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold t-text">{plg?.namaPt || '-'}</div>
                        <div className="text-[11px] t-muted inline-flex items-center gap-1 mt-0.5">
                          <Route className="w-3 h-3 shrink-0" />
                          <span>
                            {muat?.namaLokasi || '-'} &rarr; {bongkar?.namaLokasi || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 font-medium t-text">
                          <CalendarClock className="w-3.5 h-3.5 t-muted shrink-0" />
                          <span>{formatDateFullID(prj.tanggalMulai)}</span>
                        </div>
                        <div className="text-[11px] font-mono-num t-muted">
                          {prj.jamMulai}–{prj.jamSelesai}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-num tabular-nums font-bold t-text whitespace-nowrap">
                        {prj.nominalTarif > 0 ? formatRupiah(prj.nominalTarif) : '-'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div
                          className="font-bold text-[11px]"
                          style={{ color: statusTone(prj.status) }}
                        >
                          {prj.status}
                        </div>
                        {gate.blocked && (
                          <div
                            className="text-[10px] font-bold inline-flex items-center gap-1 mt-0.5"
                            style={{ color: 'var(--status-bad-text)' }}
                          >
                            <Lock className="w-3 h-3" />
                            <span>Ditahan P2H</span>
                          </div>
                        )}
                      </td>
                      <td
                        className="py-3.5 px-5 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectPerjalanan(prj.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl t-btn-secondary text-[11px] font-bold"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Perjalanan Modal */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setCreateModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[92vh] flex flex-col t-card rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b t-border flex items-center justify-between gap-2 shrink-0">
              <div>
                <h3 className="text-base font-display t-text">
                  Buat Perjalanan Angkutan Limbah
                </h3>
                <p className="text-[11px] t-muted mt-0.5">
                  Lengkapi rute, detail muatan limbah, serta jadwal waktu tiba, muat, dan bongkar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                aria-label="Tutup modal perjalanan"
                className="p-1.5 rounded-xl t-btn-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPerjalanan} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl t-status-bad font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Bagian 1: Penugasan Unit, Sopir & Rute */}
              <div className="rounded-xl border t-border p-3.5 space-y-3">
                <div className="flex items-center gap-2 border-b t-border pb-2">
                  <Route className="w-3.5 h-3.5 t-muted" />
                  <h4 className="t-section-label">1. Unit, Sopir &amp; Rute Pengangkutan</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="cprj-unit" className="block t-field-label mb-1">
                      Unit Armada *
                    </label>
                    <select
                      id="cprj-unit"
                      required
                      value={unitId}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        setUnitId(nextId);
                        const u = unitById.get(nextId);
                        if (u?.supirUtama && u.supirUtama !== '-') setSopirNama(u.supirUtama);
                        autoMatchTarif(nextId, pelangganId, lokasiMuatId, lokasiBongkarId);
                      }}
                      className="w-full px-3 py-2 rounded-xl t-input font-semibold"
                    >
                      <option value="">-- Pilih Unit --</option>
                      {activeUnits.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.kodeUnit} — {u.nomorPolisi} ({u.jenisKendaraan})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="cprj-sopir" className="block t-field-label mb-1">
                      Sopir Bertugas *
                    </label>
                    <input
                      id="cprj-sopir"
                      type="text"
                      required
                      list="spd-sopir-list"
                      value={sopirNama}
                      onChange={(e) => setSopirNama(e.target.value)}
                      placeholder="Nama sopir bertugas"
                      className="w-full px-3 py-2 rounded-xl t-input font-semibold"
                    />
                    <datalist id="spd-sopir-list">
                      {ARMADA_SOPIR_LIST.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label htmlFor="cprj-plg" className="block t-field-label mb-1">
                    Pelanggan / Penghasil Limbah *
                  </label>
                  <select
                    id="cprj-plg"
                    required
                    value={pelangganId}
                    onChange={(e) => {
                      const nextPlg = e.target.value;
                      setPelangganId(nextPlg);
                      const nextMuat =
                        lokasiList.find(
                          (l) =>
                            l.pelangganId === nextPlg &&
                            (l.jenisLokasi === 'Muat' || l.jenisLokasi === 'Keduanya'),
                        )?.id || '';
                      const nextBongkar =
                        lokasiList.find(
                          (l) =>
                            l.pelangganId === nextPlg &&
                            l.id !== nextMuat &&
                            (l.jenisLokasi === 'Bongkar' || l.jenisLokasi === 'Keduanya'),
                        )?.id || '';
                      setLokasiMuatId(nextMuat);
                      setLokasiBongkarId(nextBongkar);
                      autoMatchTarif(unitId, nextPlg, nextMuat, nextBongkar);
                    }}
                    className="w-full px-3 py-2 rounded-xl t-input font-semibold"
                  >
                    <option value="">-- Pilih Pelanggan --</option>
                    {pelangganList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.idPelanggan} — {p.namaPt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="cprj-muat" className="block t-field-label mb-1">
                      Lokasi Muat (Sumber Limbah) *
                    </label>
                    <select
                      id="cprj-muat"
                      required
                      value={lokasiMuatId}
                      onChange={(e) => {
                        setLokasiMuatId(e.target.value);
                        autoMatchTarif(unitId, pelangganId, e.target.value, lokasiBongkarId);
                      }}
                      className="w-full px-3 py-2 rounded-xl t-input font-semibold"
                    >
                      <option value="">-- Pilih Lokasi Muat --</option>
                      {muatOptions.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.idLokasi} — {l.namaLokasi}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="cprj-bongkar" className="block t-field-label mb-1">
                      Lokasi Bongkar (Pengolah / Pemanfaat) *
                    </label>
                    <select
                      id="cprj-bongkar"
                      required
                      value={lokasiBongkarId}
                      onChange={(e) => {
                        setLokasiBongkarId(e.target.value);
                        autoMatchTarif(unitId, pelangganId, lokasiMuatId, e.target.value);
                      }}
                      className="w-full px-3 py-2 rounded-xl t-input font-semibold"
                    >
                      <option value="">-- Pilih Lokasi Bongkar --</option>
                      {bongkarOptions.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.idLokasi} — {l.namaLokasi}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Bagian 2: Detail Muatan Limbah & Dokumen */}
              <div className="rounded-xl border t-border p-3.5 space-y-3">
                <div className="flex items-center gap-2 border-b t-border pb-2">
                  <Package className="w-3.5 h-3.5 t-muted" />
                  <h4 className="t-section-label">2. Detail Muatan Limbah &amp; Manifest</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label htmlFor="cprj-jenis-limbah" className="block t-field-label mb-1">
                      Jenis Limbah
                    </label>
                    <input
                      id="cprj-jenis-limbah"
                      type="text"
                      list="spd-jenis-limbah-list"
                      value={jenisLimbah}
                      onChange={(e) => setJenisLimbah(e.target.value)}
                      placeholder="Pilih atau ketik jenis limbah"
                      className="w-full px-3 py-2 rounded-xl t-input font-semibold"
                    />
                    <datalist id="spd-jenis-limbah-list">
                      {JENIS_LIMBAH_OPTIONS.map((opt) => (
                        <option key={opt} value={opt} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label htmlFor="cprj-kode-limbah" className="block t-field-label mb-1">
                      Kode Limbah (B3)
                    </label>
                    <input
                      id="cprj-kode-limbah"
                      type="text"
                      value={kodeLimbah}
                      onChange={(e) => setKodeLimbah(e.target.value)}
                      placeholder="Mis. B105d / A102d"
                      className="w-full px-3 py-2 rounded-xl t-input font-mono-num"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="cprj-kemasan" className="block t-field-label mb-1">
                      Kemasan / Wadah Angkut
                    </label>
                    <input
                      id="cprj-kemasan"
                      type="text"
                      list="spd-kemasan-limbah-list"
                      value={kemasanLimbah}
                      onChange={(e) => setKemasanLimbah(e.target.value)}
                      placeholder="Mis. Drum 200L, Jumbo Bag, Curah"
                      className="w-full px-3 py-2 rounded-xl t-input"
                    />
                    <datalist id="spd-kemasan-limbah-list">
                      {KEMASAN_LIMBAH_OPTIONS.map((opt) => (
                        <option key={opt} value={opt} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label htmlFor="cprj-muatan" className="block t-field-label mb-1">
                      Estimasi Berat / Volume
                    </label>
                    <input
                      id="cprj-muatan"
                      type="text"
                      value={estimasiMuatan}
                      onChange={(e) => setEstimasiMuatan(e.target.value)}
                      placeholder="Mis. 6,5 Ton / 24 Drum"
                      className="w-full px-3 py-2 rounded-xl t-input font-mono-num"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="cprj-manifest" className="block t-field-label mb-1">
                      No. Manifest / Festronik
                    </label>
                    <input
                      id="cprj-manifest"
                      type="text"
                      value={nomorManifest}
                      onChange={(e) => setNomorManifest(e.target.value)}
                      placeholder="Mis. FST-2026-00124"
                      className="w-full px-3 py-2 rounded-xl t-input font-mono-num"
                    />
                  </div>

                  <div>
                    <label htmlFor="cprj-sj" className="block t-field-label mb-1">
                      No. Surat Jalan / DO (Opsional)
                    </label>
                    <input
                      id="cprj-sj"
                      type="text"
                      value={nomorSuratJalan}
                      onChange={(e) => setNomorSuratJalan(e.target.value)}
                      placeholder="Otomatis jika dikosongkan"
                      className="w-full px-3 py-2 rounded-xl t-input font-mono-num"
                    />
                  </div>
                </div>
              </div>

              {/* Bagian 3: Jadwal & Waktu Operasional (Tiba, Muat, Bongkar) */}
              <div className="rounded-xl border t-border p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2 border-b t-border pb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 t-muted" />
                    <h4 className="t-section-label">
                      3. Jadwal &amp; Waktu Operasional (Tiba, Muat &amp; Bongkar)
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label htmlFor="cprj-tgl-mulai" className="block t-field-label mb-1">
                      Tgl Berangkat *
                    </label>
                    <input
                      id="cprj-tgl-mulai"
                      type="date"
                      required
                      value={tanggalMulai}
                      onChange={(e) => {
                        setTanggalMulai(e.target.value);
                        if (e.target.value > tanggalSelesai) setTanggalSelesai(e.target.value);
                      }}
                      className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num"
                    />
                  </div>
                  <div>
                    <label htmlFor="cprj-jam-mulai" className="block t-field-label mb-1">
                      Jam Berangkat *
                    </label>
                    <input
                      id="cprj-jam-mulai"
                      type="time"
                      required
                      value={jamMulai}
                      onChange={(e) => setJamMulai(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num"
                    />
                  </div>
                  <div>
                    <label htmlFor="cprj-tgl-selesai" className="block t-field-label mb-1">
                      Tgl Selesai *
                    </label>
                    <input
                      id="cprj-tgl-selesai"
                      type="date"
                      required
                      value={tanggalSelesai}
                      onChange={(e) => setTanggalSelesai(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num"
                    />
                  </div>
                  <div>
                    <label htmlFor="cprj-jam-selesai" className="block t-field-label mb-1">
                      Jam Selesai *
                    </label>
                    <input
                      id="cprj-jam-selesai"
                      type="time"
                      required
                      value={jamSelesai}
                      onChange={(e) => setJamSelesai(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num"
                    />
                  </div>
                </div>

                {/* Tahap Lokasi Muat */}
                <div className="pt-2 border-t t-border space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider t-muted">
                      Tahap Lokasi Muat (Penghasil Limbah)
                    </span>
                    {formatDurationBadge(waktuMuatMulai, waktuMuatSelesai) && (
                      <span className="text-[11px] font-mono-num font-semibold t-muted">
                        Durasi Muat: {formatDurationBadge(waktuMuatMulai, waktuMuatSelesai)}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="cprj-tiba-muat" className="block t-field-label mb-1">
                        Waktu Tiba (Lokasi Muat)
                      </label>
                      <input
                        id="cprj-tiba-muat"
                        type="time"
                        value={waktuTibaMuat}
                        onChange={(e) => setWaktuTibaMuat(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num"
                      />
                    </div>
                    <div>
                      <label htmlFor="cprj-muat-mulai" className="block t-field-label mb-1">
                        Waktu Mulai Muat
                      </label>
                      <input
                        id="cprj-muat-mulai"
                        type="time"
                        value={waktuMuatMulai}
                        onChange={(e) => setWaktuMuatMulai(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num"
                      />
                    </div>
                    <div>
                      <label htmlFor="cprj-muat-selesai" className="block t-field-label mb-1">
                        Waktu Selesai Muat
                      </label>
                      <input
                        id="cprj-muat-selesai"
                        type="time"
                        value={waktuMuatSelesai}
                        onChange={(e) => setWaktuMuatSelesai(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num"
                      />
                    </div>
                  </div>
                </div>

                {/* Tahap Lokasi Bongkar */}
                <div className="pt-2 border-t t-border space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider t-muted">
                      Tahap Lokasi Bongkar (Pengolah / TPA)
                    </span>
                    {formatDurationBadge(waktuBongkarMulai, waktuBongkarSelesai) && (
                      <span className="text-[11px] font-mono-num font-semibold t-muted">
                        Durasi Bongkar: {formatDurationBadge(waktuBongkarMulai, waktuBongkarSelesai)}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="cprj-tiba-bongkar" className="block t-field-label mb-1">
                        Waktu Tiba (Lokasi Bongkar)
                      </label>
                      <input
                        id="cprj-tiba-bongkar"
                        type="time"
                        value={waktuTibaBongkar}
                        onChange={(e) => setWaktuTibaBongkar(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num"
                      />
                    </div>
                    <div>
                      <label htmlFor="cprj-bongkar-mulai" className="block t-field-label mb-1">
                        Waktu Mulai Bongkar
                      </label>
                      <input
                        id="cprj-bongkar-mulai"
                        type="time"
                        value={waktuBongkarMulai}
                        onChange={(e) => setWaktuBongkarMulai(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num"
                      />
                    </div>
                    <div>
                      <label htmlFor="cprj-bongkar-selesai" className="block t-field-label mb-1">
                        Waktu Selesai Bongkar
                      </label>
                      <input
                        id="cprj-bongkar-selesai"
                        type="time"
                        value={waktuBongkarSelesai}
                        onChange={(e) => setWaktuBongkarSelesai(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bagian 4: Tarif & Catatan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="cprj-tarif" className="block t-field-label mb-1">
                    Tarif Angkutan (Rp) {matchedTarifId ? '· Cocok Master Tarif' : ''}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold t-muted">
                      Rp
                    </span>
                    <input
                      id="cprj-tarif"
                      type="text"
                      inputMode="numeric"
                      value={nominalTarifText}
                      onChange={(e) => setNominalTarifText(formatCurrencyInput(e.target.value))}
                      placeholder="1.650.000"
                      className="w-full pl-9 pr-3 py-2 rounded-xl t-input font-mono-num font-bold text-right"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="cprj-catatan" className="block t-field-label mb-1">
                    Catatan Khusus / Safety APD (Opsional)
                  </label>
                  <input
                    id="cprj-catatan"
                    type="text"
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Wajib APD lengkap, segel terpal, tiket timbang"
                    className="w-full px-3 py-2 rounded-xl t-input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t t-border">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl t-btn-secondary font-semibold"
                >
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl t-btn-primary">
                  Simpan Perjalanan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
