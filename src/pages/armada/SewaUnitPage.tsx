import {
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  KeyRound,
  Plus,
  RotateCcw,
  Search,
  Truck,
  Upload,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ARMADA_SOPIR_LIST, generateNextArmadaCode } from '../../data/armadaSeed';
import type {
  ArmadaPelanggan,
  ArmadaPerjalanan,
  ArmadaSewaUnit,
  ArmadaUnit,
  SewaMode,
  SewaUnitStatus,
} from '../../types/armada';
import {
  checkUnitScheduleConflict,
  isSewaOverdue,
  readProofFileAsDataUrl,
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

interface SewaUnitPageProps {
  sewaList: ArmadaSewaUnit[];
  perjalananList: ArmadaPerjalanan[];
  units: ArmadaUnit[];
  pelangganList: ArmadaPelanggan[];
  onCreateSewa: (sewa: Omit<ArmadaSewaUnit, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onHandoverSewa: (params: {
    id: string;
    serahTerimaTanggal: string;
    serahTerimaJam: string;
    kmAwal: number;
    kondisiAwal: string;
    buktiSerahTerimaDataUrl?: string;
    buktiSerahTerimaNama?: string;
  }) => void;
  onReturnSewa: (params: {
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
  }) => void;
}

function parseHHMMToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function formatDurationBadge(start?: string, end?: string): string | null {
  const s = parseHHMMToMinutes(start);
  const e = parseHHMMToMinutes(end);
  if (s === null || e === null || e < s) return null;
  const diff = e - s;
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hrs > 0 && mins > 0) return `${hrs}j ${mins}m`;
  if (hrs > 0) return `${hrs} jam`;
  return `${mins} mnt`;
}

export function SewaUnitPage({
  sewaList,
  perjalananList,
  units,
  pelangganList,
  onCreateSewa,
  onHandoverSewa,
  onReturnSewa,
}: SewaUnitPageProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SewaUnitStatus>('ALL');

  // Create Booking Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [pelangganId, setPelangganId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState(getTodayISO());
  const [jamMulai, setJamMulai] = useState('10:00');
  const [tanggalSelesai, setTanggalSelesai] = useState(getTodayISO());
  const [jamSelesai, setJamSelesai] = useState('15:00');
  const [waktuTibaMuat, setWaktuTibaMuat] = useState('10:00');
  const [waktuMuatMulai, setWaktuMuatMulai] = useState('10:15');
  const [waktuMuatSelesai, setWaktuMuatSelesai] = useState('11:00');
  const [waktuTibaBongkar, setWaktuTibaBongkar] = useState('12:30');
  const [waktuBongkarMulai, setWaktuBongkarMulai] = useState('12:45');
  const [waktuBongkarSelesai, setWaktuBongkarSelesai] = useState('13:30');
  const [modeSewa, setModeSewa] = useState<SewaMode>('Dengan Sopir');
  const [namaSopir, setNamaSopir] = useState('');
  const [tarifText, setTarifText] = useState('');
  const [catatanPemesanan, setCatatanPemesanan] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [conflictDetail, setConflictDetail] = useState<string | null>(null);

  // Handover Modal (Serahkan Unit -> Sedang Disewa)
  const [handoverTarget, setHandoverTarget] = useState<ArmadaSewaUnit | null>(null);
  const [hoTanggal, setHoTanggal] = useState(getTodayISO());
  const [hoJam, setHoJam] = useState('08:00');
  const [hoKmAwal, setHoKmAwal] = useState('');
  const [hoKondisi, setHoKondisi] = useState('');
  const [hoBuktiUrl, setHoBuktiUrl] = useState<string | undefined>(undefined);
  const [hoBuktiNama, setHoBuktiNama] = useState<string | undefined>(undefined);
  const [hoError, setHoError] = useState('');

  // Return Modal (Terima Kembali Unit -> Dikembalikan)
  const [returnTarget, setReturnTarget] = useState<ArmadaSewaUnit | null>(null);
  const [retTanggal, setRetTanggal] = useState(getTodayISO());
  const [retJam, setRetJam] = useState('17:00');
  const [retKmAkhir, setRetKmAkhir] = useState('');
  const [retKondisi, setRetKondisi] = useState('');
  const [retKerusakan, setRetKerusakan] = useState('');
  const [retBuktiUrl, setRetBuktiUrl] = useState<string | undefined>(undefined);
  const [retBuktiNama, setRetBuktiNama] = useState<string | undefined>(undefined);
  const [retWaktuTibaMuat, setRetWaktuTibaMuat] = useState('');
  const [retWaktuMuatMulai, setRetWaktuMuatMulai] = useState('');
  const [retWaktuMuatSelesai, setRetWaktuMuatSelesai] = useState('');
  const [retWaktuTibaBongkar, setRetWaktuTibaBongkar] = useState('');
  const [retWaktuBongkarMulai, setRetWaktuBongkarMulai] = useState('');
  const [retWaktuBongkarSelesai, setRetWaktuBongkarSelesai] = useState('');
  const [retError, setRetError] = useState('');

  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const plgById = useMemo(() => new Map(pelangganList.map((p) => [p.id, p])), [pelangganList]);
  const activeUnits = useMemo(() => units.filter((u) => u.status === 'Aktif'), [units]);

  const stats = useMemo(() => {
    const dipesan = sewaList.filter((s) => s.status === 'Dipesan').length;
    const sedangDisewa = sewaList.filter((s) => s.status === 'Sedang Disewa').length;
    const lewatJadwal = sewaList.filter((s) => isSewaOverdue(s)).length;
    const dikembalikan = sewaList.filter((s) => s.status === 'Dikembalikan').length;
    return { dipesan, sedangDisewa, lewatJadwal, dikembalikan };
  }, [sewaList]);

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sewaList.filter((s) => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (q) {
        const unit = unitById.get(s.unitId);
        const plg = plgById.get(s.pelangganId);
        const hit =
          s.nomorSewa.toLowerCase().includes(q) ||
          (unit?.kodeUnit || '').toLowerCase().includes(q) ||
          (unit?.nomorPolisi || '').toLowerCase().includes(q) ||
          (plg?.namaPt || '').toLowerCase().includes(q) ||
          s.modeSewa.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [plgById, search, sewaList, statusFilter, unitById]);

  const openCreateModal = () => {
    setBookingError('');
    setConflictDetail(null);
    const arm001 = activeUnits.find((u) => u.kodeUnit === 'ARM-001') || activeUnits[0];
    setPelangganId(pelangganList[0]?.id || '');
    setUnitId(arm001?.id || '');
    setTanggalMulai(getTodayISO());
    setJamMulai('10:00');
    setTanggalSelesai(getTodayISO());
    setJamSelesai('14:00');
    setWaktuTibaMuat('10:00');
    setWaktuMuatMulai('10:15');
    setWaktuMuatSelesai('11:00');
    setWaktuTibaBongkar('12:30');
    setWaktuBongkarMulai('12:45');
    setWaktuBongkarSelesai('13:30');
    setModeSewa('Dengan Sopir');
    setNamaSopir(arm001?.supirUtama && arm001.supirUtama !== '-' ? arm001.supirUtama : ARMADA_SOPIR_LIST[0]);
    setTarifText('1.500.000');
    setCatatanPemesanan('');
    setCreateOpen(true);
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError('');
    setConflictDetail(null);

    const tarif = cleanRupiahToNumber(tarifText);
    if (!pelangganId || !unitId || !tanggalMulai || !jamMulai || !tanggalSelesai || !jamSelesai) {
      setBookingError('Penyewa, unit, serta tanggal & jam mulai–selesai wajib diisi.');
      return;
    }
    if (tarif <= 0) {
      setBookingError('Tarif yang disepakati harus lebih dari Rp 0.');
      return;
    }
    const startMs = toLocalDateTimeMs(tanggalMulai, jamMulai);
    const endMs = toLocalDateTimeMs(tanggalSelesai, jamSelesai);
    if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
      setBookingError('Waktu selesai sewa harus lebih besar dari waktu mulai.');
      return;
    }
    const muatStartMin = parseHHMMToMinutes(waktuMuatMulai);
    const muatEndMin = parseHHMMToMinutes(waktuMuatSelesai);
    if (muatStartMin !== null && muatEndMin !== null && muatEndMin < muatStartMin) {
      setBookingError('Waktu selesai muat tidak boleh lebih awal dari waktu mulai muat.');
      return;
    }
    const bongkarStartMin = parseHHMMToMinutes(waktuBongkarMulai);
    const bongkarEndMin = parseHHMMToMinutes(waktuBongkarSelesai);
    if (bongkarStartMin !== null && bongkarEndMin !== null && bongkarEndMin < bongkarStartMin) {
      setBookingError('Waktu selesai bongkar tidak boleh lebih awal dari waktu mulai bongkar.');
      return;
    }

    // Strict conflict check against Perjalanan AND Sewa Unit
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
      setBookingError('Konfirmasi pemesanan ditolak karena bentrok dengan jadwal aktif.');
      setConflictDetail(conflict.reason);
      return;
    }

    onCreateSewa({
      nomorSewa: generateNextArmadaCode(
        'SEWA',
        sewaList.map((s) => s.nomorSewa),
      ),
      pelangganId,
      unitId,
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
      modeSewa,
      namaSopir: modeSewa === 'Dengan Sopir' ? namaSopir.trim() || '-' : undefined,
      tarifDisepakati: tarif,
      catatanPemesanan: catatanPemesanan.trim(),
      status: 'Dipesan',
    });
    setCreateOpen(false);
  };

  const openHandover = (sewa: ArmadaSewaUnit) => {
    setHoError('');
    const now = new Date();
    setHoTanggal(getTodayISO());
    setHoJam(
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    );
    setHoKmAwal('');
    setHoKondisi('Unit bersih, dokumen lengkap, ban & rem kondisi baik');
    setHoBuktiUrl(undefined);
    setHoBuktiNama(undefined);
    setHandoverTarget(sewa);
  };

  const handleHandoverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverTarget) return;
    setHoError('');
    const km = Number(hoKmAwal.replace(/\D/g, ''));
    if (!hoTanggal || !hoJam || !km || !hoKondisi.trim()) {
      setHoError('Tanggal & jam serah terima aktual, kilometer awal, dan kondisi unit wajib diisi.');
      return;
    }
    onHandoverSewa({
      id: handoverTarget.id,
      serahTerimaTanggal: hoTanggal,
      serahTerimaJam: hoJam,
      kmAwal: km,
      kondisiAwal: hoKondisi.trim(),
      buktiSerahTerimaDataUrl: hoBuktiUrl,
      buktiSerahTerimaNama: hoBuktiNama,
    });
    setHandoverTarget(null);
  };

  const openReturn = (sewa: ArmadaSewaUnit) => {
    setRetError('');
    const now = new Date();
    setRetTanggal(getTodayISO());
    setRetJam(
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    );
    setRetKmAkhir(sewa.kmAwal ? String(sewa.kmAwal + 120) : '');
    setRetKondisi('Unit kembali lengkap dan layak jalan');
    setRetKerusakan('');
    setRetBuktiUrl(undefined);
    setRetBuktiNama(undefined);
    setRetWaktuTibaMuat(sewa.waktuTibaMuat || '');
    setRetWaktuMuatMulai(sewa.waktuMuatMulai || '');
    setRetWaktuMuatSelesai(sewa.waktuMuatSelesai || '');
    setRetWaktuTibaBongkar(sewa.waktuTibaBongkar || '');
    setRetWaktuBongkarMulai(sewa.waktuBongkarMulai || '');
    setRetWaktuBongkarSelesai(sewa.waktuBongkarSelesai || '');
    setReturnTarget(sewa);
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnTarget) return;
    setRetError('');
    const km = Number(retKmAkhir.replace(/\D/g, ''));
    if (!retTanggal || !retJam || !km || !retKondisi.trim()) {
      setRetError('Tanggal & jam kembali aktual, kilometer akhir, dan kondisi unit wajib diisi.');
      return;
    }
    if (returnTarget.kmAwal && km < returnTarget.kmAwal) {
      setRetError(
        `Kilometer akhir (${km.toLocaleString('id-ID')}) tidak boleh lebih kecil dari kilometer awal (${returnTarget.kmAwal.toLocaleString('id-ID')}).`,
      );
      return;
    }
    onReturnSewa({
      id: returnTarget.id,
      kembaliTanggal: retTanggal,
      kembaliJam: retJam,
      kmAkhir: km,
      kondisiKembali: retKondisi.trim(),
      catatanKerusakan: retKerusakan.trim(),
      buktiKembaliDataUrl: retBuktiUrl,
      buktiKembaliNama: retBuktiNama,
      waktuTibaMuat: retWaktuTibaMuat || undefined,
      waktuMuatMulai: retWaktuMuatMulai || undefined,
      waktuMuatSelesai: retWaktuMuatSelesai || undefined,
      waktuTibaBongkar: retWaktuTibaBongkar || undefined,
      waktuBongkarMulai: retWaktuBongkarMulai || undefined,
      waktuBongkarSelesai: retWaktuBongkarSelesai || undefined,
    });
    setReturnTarget(null);
  };

  const statusColor = (status: SewaUnitStatus) => {
    if (status === 'Dikembalikan') return 'var(--status-ok-text)';
    if (status === 'Sedang Disewa') return 'var(--status-info-text)';
    return 'var(--status-warn-text)';
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl t-btn-primary text-xs whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Pemesanan Sewa</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="t-card rounded-2xl p-4">
          <div className="t-field-label">Dipesan</div>
          <div
            className="text-2xl font-display mt-1 tabular-nums"
            style={{ color: 'var(--status-warn-text)' }}
          >
            {stats.dipesan}
          </div>
          <div className="text-[11px] t-muted mt-0.5">Menunggu serah terima</div>
        </div>
        <div className="t-card rounded-2xl p-4">
          <div className="t-field-label">Sedang Disewa</div>
          <div
            className="text-2xl font-display mt-1 tabular-nums"
            style={{ color: 'var(--status-info-text)' }}
          >
            {stats.sedangDisewa}
          </div>
          <div className="text-[11px] t-muted mt-0.5">
            {stats.lewatJadwal > 0
              ? `${stats.lewatJadwal} lewat jadwal, belum kembali`
              : 'Aktif di penyewa'}
          </div>
        </div>
        <div className="t-card rounded-2xl p-4">
          <div className="t-field-label">Dikembalikan</div>
          <div
            className="text-2xl font-display mt-1 tabular-nums"
            style={{ color: 'var(--status-ok-text)' }}
          >
            {stats.dikembalikan}
          </div>
          <div className="text-[11px] t-muted mt-0.5">Unit sudah diterima kembali</div>
        </div>
        <div className="t-card rounded-2xl p-4">
          <div className="t-field-label">Total Transaksi Sewa</div>
          <div className="text-2xl font-display t-text mt-1 tabular-nums">{sewaList.length}</div>
          <div className="text-[11px] t-muted mt-0.5">Terkoneksi Master Pelanggan</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="t-card rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8">
          <label htmlFor="sewa-search" className="block t-field-label mb-1">
            Cari No. Sewa, Unit, Nomor Polisi, atau Penyewa
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 t-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="sewa-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Contoh: SEWA-001, ARM-001, PT Sinar Baja..."
              className="w-full text-xs pl-8 pr-3 py-2 rounded-xl t-input"
            />
          </div>
        </div>
        <div className="sm:col-span-4">
          <label htmlFor="sewa-status" className="block t-field-label mb-1">
            Status Sewa
          </label>
          <select
            id="sewa-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | SewaUnitStatus)}
            className="w-full text-xs px-3 py-2 rounded-xl t-input font-semibold"
          >
            <option value="ALL">Semua Status</option>
            <option value="Dipesan">Dipesan</option>
            <option value="Sedang Disewa">Sedang Disewa</option>
            <option value="Dikembalikan">Dikembalikan</option>
          </select>
        </div>
      </div>

      {/* Sewa Table */}
      <div className="t-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="t-subtle border-b t-border">
                <th className="py-3.5 px-5 t-th-label">No. Sewa &amp; Unit</th>
                <th className="py-3.5 px-4 t-th-label">Penyewa &amp; Layanan</th>
                <th className="py-3.5 px-4 t-th-label">Jadwal Sewa</th>
                <th className="py-3.5 px-4 t-th-label">Kilometer &amp; Kondisi</th>
                <th className="py-3.5 px-4 t-th-label text-right">Tarif</th>
                <th className="py-3.5 px-4 t-th-label">Status</th>
                <th className="py-3.5 px-5 t-th-label text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y t-border">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center t-muted">
                    Belum ada data sewa unit yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredList.map((sewa) => {
                  const unit = unitById.get(sewa.unitId);
                  const plg = plgById.get(sewa.pelangganId);
                  const overdue = isSewaOverdue(sewa);
                  return (
                    <tr key={sewa.id} className="t-row-hover">
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="font-mono-num font-bold t-link">{sewa.nomorSewa}</div>
                        <div className="text-[11px] font-mono-num font-semibold t-text">
                          {unit?.kodeUnit || '-'} &middot; {unit?.nomorPolisi || '-'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold t-text">{plg?.namaPt || '-'}</div>
                        <div className="text-[11px] t-muted">
                          {sewa.modeSewa}
                          {sewa.modeSewa === 'Dengan Sopir' && sewa.namaSopir
                            ? ` · ${sewa.namaSopir}`
                            : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 font-medium t-text">
                          <CalendarClock className="w-3.5 h-3.5 t-muted shrink-0" />
                          <span>
                            {formatDateShortID(sewa.tanggalMulai)} {sewa.jamMulai}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono-num t-muted">
                          s/d {formatDateShortID(sewa.tanggalSelesai)} {sewa.jamSelesai}
                        </div>
                        {(sewa.waktuTibaMuat || sewa.waktuMuatMulai || sewa.waktuMuatSelesai) && (
                          <div className="text-[10px] font-mono-num t-muted mt-1">
                            Muat: Tiba {sewa.waktuTibaMuat || '-'} · {sewa.waktuMuatMulai || '-'}–
                            {sewa.waktuMuatSelesai || '-'}
                          </div>
                        )}
                        {(sewa.waktuTibaBongkar ||
                          sewa.waktuBongkarMulai ||
                          sewa.waktuBongkarSelesai) && (
                          <div className="text-[10px] font-mono-num t-muted">
                            Bongkar: Tiba {sewa.waktuTibaBongkar || '-'} ·{' '}
                            {sewa.waktuBongkarMulai || '-'}–{sewa.waktuBongkarSelesai || '-'}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {sewa.kmAwal ? (
                          <div className="text-[11px] font-mono-num t-text">
                            KM Awal: <b>{sewa.kmAwal.toLocaleString('id-ID')}</b>
                            {sewa.kmAkhir ? (
                              <>
                                {' '}
                                &rarr; Akhir: <b>{sewa.kmAkhir.toLocaleString('id-ID')}</b>
                              </>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-[11px] t-muted">Belum serah terima</span>
                        )}
                        {sewa.catatanKerusakan && (
                          <div
                            className="text-[10px] font-semibold mt-0.5 max-w-xs truncate"
                            style={{ color: 'var(--status-bad-text)' }}
                          >
                            Kerusakan: {sewa.catatanKerusakan}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-num tabular-nums font-bold t-text whitespace-nowrap">
                        {formatRupiah(sewa.tarifDisepakati)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div
                          className="font-bold text-[11px]"
                          style={{ color: statusColor(sewa.status) }}
                        >
                          {sewa.status}
                        </div>
                        {overdue && (
                          <div
                            className="text-[10px] font-bold inline-flex items-center gap-1 mt-0.5"
                            style={{ color: 'var(--status-bad-text)' }}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span>Lewat jadwal · belum kembali</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        {sewa.status === 'Dipesan' && (
                          <button
                            type="button"
                            onClick={() => openHandover(sewa)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl t-btn-primary text-[11px]"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Serahkan Unit</span>
                          </button>
                        )}
                        {sewa.status === 'Sedang Disewa' && (
                          <button
                            type="button"
                            onClick={() => openReturn(sewa)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl t-btn-primary text-[11px]"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Terima Kembali</span>
                          </button>
                        )}
                        {sewa.status === 'Dikembalikan' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold t-muted">
                            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--status-ok-text)' }} />
                            <span>
                              Kembali {formatDateShortID(sewa.kembaliTanggal)} {sewa.kembaliJam}
                            </span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: BUAT PEMESANAN SEWA */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setCreateOpen(false)}
        >
          <div
            className="w-full max-w-xl max-h-[92vh] flex flex-col t-card rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b t-border flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5">
                <Truck className="w-5 h-5 t-link" />
                <div>
                  <h3 className="text-base font-display t-text">Buat Pemesanan Sewa Unit</h3>
                  <p className="text-[11px] t-muted">
                    Status awal: <b>Dipesan</b>. Sistem memeriksa bentrok jadwal otomatis.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                aria-label="Tutup form pemesanan sewa"
                className="p-1.5 rounded-xl t-btn-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
              {bookingError && (
                <div className="p-3.5 rounded-xl t-status-bad space-y-1">
                  <div className="font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{bookingError}</span>
                  </div>
                  {conflictDetail && <p className="text-[11px] pl-6 opacity-95">{conflictDetail}</p>}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="sewa-plg" className="block t-field-label mb-1">
                    Penyewa (Master Pelanggan) *
                  </label>
                  <select
                    id="sewa-plg"
                    required
                    value={pelangganId}
                    onChange={(e) => setPelangganId(e.target.value)}
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

                <div>
                  <label htmlFor="sewa-unit" className="block t-field-label mb-1">
                    Unit Armada *
                  </label>
                  <select
                    id="sewa-unit"
                    required
                    value={unitId}
                    onChange={(e) => setUnitId(e.target.value)}
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
              </div>

              {/* Show existing schedules for selected unit as helpful preview */}
              {unitId && (
                <div className="p-3 rounded-xl t-subtle border t-border space-y-1 text-[11px]">
                  <div className="font-bold t-text">
                    Jadwal Aktif Unit {unitById.get(unitId)?.kodeUnit}:
                  </div>
                  {perjalananList.filter(
                    (p) => p.unitId === unitId && p.status !== 'Selesai' && p.status !== 'Dibatalkan',
                  ).length === 0 &&
                  sewaList.filter((s) => s.unitId === unitId && s.status !== 'Dikembalikan')
                    .length === 0 ? (
                    <div className="t-muted">Tidak ada jadwal aktif yang menghalangi.</div>
                  ) : (
                    <ul className="space-y-0.5 t-muted">
                      {perjalananList
                        .filter(
                          (p) =>
                            p.unitId === unitId &&
                            p.status !== 'Selesai' &&
                            p.status !== 'Dibatalkan',
                        )
                        .map((p) => (
                          <li key={p.id}>
                            &bull; <b>{p.nomorPenugasan}</b> (Perjalanan):{' '}
                            {formatDateFullID(p.tanggalMulai)} {p.jamMulai}–{p.jamSelesai}
                          </li>
                        ))}
                      {sewaList
                        .filter((s) => s.unitId === unitId && s.status !== 'Dikembalikan')
                        .map((s) => (
                          <li key={s.id}>
                            &bull; <b>{s.nomorSewa}</b> ({s.status}):{' '}
                            {formatDateShortID(s.tanggalMulai)} {s.jamMulai} s/d{' '}
                            {formatDateShortID(s.tanggalSelesai)} {s.jamSelesai}
                            {isSewaOverdue(s) ? ' (Lewat jadwal — belum kembali)' : ''}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label htmlFor="sewa-tgl-m" className="block t-field-label mb-1">
                    Tgl Mulai *
                  </label>
                  <input
                    id="sewa-tgl-m"
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
                  <label htmlFor="sewa-jam-m" className="block t-field-label mb-1">
                    Jam Mulai *
                  </label>
                  <input
                    id="sewa-jam-m"
                    type="time"
                    required
                    value={jamMulai}
                    onChange={(e) => setJamMulai(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num"
                  />
                </div>
                <div>
                  <label htmlFor="sewa-tgl-s" className="block t-field-label mb-1">
                    Tgl Selesai *
                  </label>
                  <input
                    id="sewa-tgl-s"
                    type="date"
                    required
                    value={tanggalSelesai}
                    onChange={(e) => setTanggalSelesai(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num"
                  />
                </div>
                <div>
                  <label htmlFor="sewa-jam-s" className="block t-field-label mb-1">
                    Jam Selesai *
                  </label>
                  <input
                    id="sewa-jam-s"
                    type="time"
                    required
                    value={jamSelesai}
                    onChange={(e) => setJamSelesai(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num"
                  />
                </div>
              </div>

              {/* Detail Waktu Tiba, Waktu Muat & Waktu Bongkar */}
              <div className="p-3.5 rounded-2xl t-subtle border t-border space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider t-link">
                  Rincian Waktu Tiba, Muat &amp; Bongkar
                </div>

                {/* Tahap Lokasi Muat */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold t-muted">Tahap Lokasi Muat</span>
                    {formatDurationBadge(waktuMuatMulai, waktuMuatSelesai) && (
                      <span className="text-[11px] font-mono-num font-semibold t-muted">
                        Durasi Muat: {formatDurationBadge(waktuMuatMulai, waktuMuatSelesai)}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label htmlFor="sewa-tiba-muat" className="block t-field-label mb-1">
                        Waktu Tiba (Muat)
                      </label>
                      <input
                        id="sewa-tiba-muat"
                        type="time"
                        value={waktuTibaMuat}
                        onChange={(e) => setWaktuTibaMuat(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num"
                      />
                    </div>
                    <div>
                      <label htmlFor="sewa-muat-mulai" className="block t-field-label mb-1">
                        Waktu Mulai Muat
                      </label>
                      <input
                        id="sewa-muat-mulai"
                        type="time"
                        value={waktuMuatMulai}
                        onChange={(e) => setWaktuMuatMulai(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num"
                      />
                    </div>
                    <div>
                      <label htmlFor="sewa-muat-selesai" className="block t-field-label mb-1">
                        Waktu Selesai Muat
                      </label>
                      <input
                        id="sewa-muat-selesai"
                        type="time"
                        value={waktuMuatSelesai}
                        onChange={(e) => setWaktuMuatSelesai(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num"
                      />
                    </div>
                  </div>
                </div>

                {/* Tahap Lokasi Bongkar */}
                <div className="pt-2.5 border-t t-border space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold t-muted">Tahap Lokasi Bongkar</span>
                    {formatDurationBadge(waktuBongkarMulai, waktuBongkarSelesai) && (
                      <span className="text-[11px] font-mono-num font-semibold t-muted">
                        Durasi Bongkar:{' '}
                        {formatDurationBadge(waktuBongkarMulai, waktuBongkarSelesai)}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label htmlFor="sewa-tiba-bongkar" className="block t-field-label mb-1">
                        Waktu Tiba (Bongkar)
                      </label>
                      <input
                        id="sewa-tiba-bongkar"
                        type="time"
                        value={waktuTibaBongkar}
                        onChange={(e) => setWaktuTibaBongkar(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num"
                      />
                    </div>
                    <div>
                      <label htmlFor="sewa-bongkar-mulai" className="block t-field-label mb-1">
                        Waktu Mulai Bongkar
                      </label>
                      <input
                        id="sewa-bongkar-mulai"
                        type="time"
                        value={waktuBongkarMulai}
                        onChange={(e) => setWaktuBongkarMulai(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num"
                      />
                    </div>
                    <div>
                      <label htmlFor="sewa-bongkar-selesai" className="block t-field-label mb-1">
                        Waktu Selesai Bongkar
                      </label>
                      <input
                        id="sewa-bongkar-selesai"
                        type="time"
                        value={waktuBongkarSelesai}
                        onChange={(e) => setWaktuBongkarSelesai(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="block t-field-label mb-1">Layanan Sewa *</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['Dengan Sopir', 'Lepas Kunci'] as SewaMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setModeSewa(mode)}
                        className={`py-2 rounded-xl font-bold text-xs transition-colors ${
                          modeSewa === mode ? 't-btn-primary' : 't-btn-secondary'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="sewa-tarif" className="block t-field-label mb-1">
                    Tarif Disepakati (Rp) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold t-muted">
                      Rp
                    </span>
                    <input
                      id="sewa-tarif"
                      type="text"
                      inputMode="numeric"
                      required
                      value={tarifText}
                      onChange={(e) => setTarifText(formatCurrencyInput(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 rounded-xl t-input font-mono-num font-bold text-right"
                    />
                  </div>
                </div>
              </div>

              {modeSewa === 'Dengan Sopir' && (
                <div>
                  <label htmlFor="sewa-sopir" className="block t-field-label mb-1">
                    Nama Sopir
                  </label>
                  <input
                    id="sewa-sopir"
                    type="text"
                    list="sewa-sopir-list"
                    value={namaSopir}
                    onChange={(e) => setNamaSopir(e.target.value)}
                    placeholder="Nama sopir bertugas"
                    className="w-full px-3 py-2 rounded-xl t-input"
                  />
                  <datalist id="sewa-sopir-list">
                    {ARMADA_SOPIR_LIST.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
              )}

              <div>
                <label htmlFor="sewa-cat" className="block t-field-label mb-1">
                  Catatan Pemesanan (Opsional)
                </label>
                <input
                  id="sewa-cat"
                  type="text"
                  value={catatanPemesanan}
                  onChange={(e) => setCatatanPemesanan(e.target.value)}
                  placeholder="Area penggunaan, ketentuan BBM/tol, dll."
                  className="w-full px-3 py-2 rounded-xl t-input"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t t-border">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 rounded-xl t-btn-secondary font-semibold"
                >
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl t-btn-primary">
                  Konfirmasi Pemesanan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SERAHKAN UNIT -> SEDANG DISEWA */}
      {handoverTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setHandoverTarget(null)}
        >
          <div
            className="w-full max-w-lg t-card rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b t-border flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-display t-text">
                  Serahkan Unit &mdash; {handoverTarget.nomorSewa}
                </h3>
                <p className="text-[11px] t-muted">
                  Mengubah status menjadi <b>Sedang Disewa</b>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHandoverTarget(null)}
                aria-label="Tutup modal serah terima"
                className="p-1.5 rounded-xl t-btn-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleHandoverSubmit} className="p-5 space-y-4 text-xs">
              {hoError && (
                <div className="p-3 rounded-xl t-status-bad font-semibold">{hoError}</div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="ho-tgl" className="block t-field-label mb-1">
                    Tgl Aktual *
                  </label>
                  <input
                    id="ho-tgl"
                    type="date"
                    required
                    value={hoTanggal}
                    onChange={(e) => setHoTanggal(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num"
                  />
                </div>
                <div>
                  <label htmlFor="ho-jam" className="block t-field-label mb-1">
                    Jam Aktual *
                  </label>
                  <input
                    id="ho-jam"
                    type="time"
                    required
                    value={hoJam}
                    onChange={(e) => setHoJam(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num"
                  />
                </div>
                <div>
                  <label htmlFor="ho-km" className="block t-field-label mb-1">
                    Kilometer Awal *
                  </label>
                  <input
                    id="ho-km"
                    type="text"
                    inputMode="numeric"
                    required
                    value={hoKmAwal}
                    onChange={(e) => setHoKmAwal(e.target.value.replace(/\D/g, ''))}
                    placeholder="85200"
                    className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num font-bold"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="ho-kondisi" className="block t-field-label mb-1">
                  Kondisi Unit Saat Serah Terima *
                </label>
                <textarea
                  id="ho-kondisi"
                  required
                  rows={2}
                  value={hoKondisi}
                  onChange={(e) => setHoKondisi(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl t-input resize-none"
                />
              </div>
              <div>
                <span className="block t-field-label mb-1">Foto / Bukti Serah Terima</span>
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary font-semibold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{hoBuktiNama || 'Unggah Foto Bukti'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const res = await readProofFileAsDataUrl(f);
                      setHoBuktiUrl(res.dataUrl);
                      setHoBuktiNama(res.name);
                    }}
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t t-border">
                <button
                  type="button"
                  onClick={() => setHandoverTarget(null)}
                  className="px-4 py-2 rounded-xl t-btn-secondary font-semibold"
                >
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl t-btn-primary">
                  Konfirmasi Serah Terima
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: TERIMA KEMBALI UNIT -> DIKEMBALIKAN */}
      {returnTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setReturnTarget(null)}
        >
            <div
              className="w-full max-w-lg max-h-[92vh] flex flex-col t-card rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b t-border flex items-center justify-between gap-2 shrink-0">
                <div>
                  <h3 className="text-base font-display t-text">
                    Terima Kembali Unit &mdash; {returnTarget.nomorSewa}
                  </h3>
                  <p className="text-[11px] t-muted">
                    KM Awal: <b>{(returnTarget.kmAwal || 0).toLocaleString('id-ID')} km</b> &middot;
                    Status akan menjadi <b>Dikembalikan</b>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReturnTarget(null)}
                  aria-label="Tutup modal pengembalian"
                  className="p-1.5 rounded-xl t-btn-secondary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleReturnSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
                {retError && (
                  <div className="p-3 rounded-xl t-status-bad font-semibold">{retError}</div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="ret-tgl" className="block t-field-label mb-1">
                      Tgl Kembali *
                    </label>
                    <input
                      id="ret-tgl"
                      type="date"
                      required
                      value={retTanggal}
                      onChange={(e) => setRetTanggal(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num"
                    />
                  </div>
                  <div>
                    <label htmlFor="ret-jam" className="block t-field-label mb-1">
                      Jam Kembali *
                    </label>
                    <input
                      id="ret-jam"
                      type="time"
                      required
                      value={retJam}
                      onChange={(e) => setRetJam(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num"
                    />
                  </div>
                  <div>
                    <label htmlFor="ret-km" className="block t-field-label mb-1">
                      Kilometer Akhir *
                    </label>
                    <input
                      id="ret-km"
                      type="text"
                      inputMode="numeric"
                      required
                      value={retKmAkhir}
                      onChange={(e) => setRetKmAkhir(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num font-bold"
                    />
                  </div>
                </div>

                {/* Aktual Waktu Tiba, Muat & Bongkar */}
                <div className="p-3 rounded-xl t-subtle border t-border space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider t-link">
                    Aktual Waktu Tiba, Muat &amp; Bongkar
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label htmlFor="ret-tiba-muat" className="block text-[10px] font-semibold t-muted mb-1">
                        Tiba Muat
                      </label>
                      <input
                        id="ret-tiba-muat"
                        type="time"
                        value={retWaktuTibaMuat}
                        onChange={(e) => setRetWaktuTibaMuat(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg t-input font-mono-num"
                      />
                    </div>
                    <div>
                      <label htmlFor="ret-muat-mulai" className="block text-[10px] font-semibold t-muted mb-1">
                        Mulai Muat
                      </label>
                      <input
                        id="ret-muat-mulai"
                        type="time"
                        value={retWaktuMuatMulai}
                        onChange={(e) => setRetWaktuMuatMulai(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg t-input font-mono-num"
                      />
                    </div>
                    <div>
                      <label htmlFor="ret-muat-selesai" className="block text-[10px] font-semibold t-muted mb-1">
                        Selesai Muat
                      </label>
                      <input
                        id="ret-muat-selesai"
                        type="time"
                        value={retWaktuMuatSelesai}
                        onChange={(e) => setRetWaktuMuatSelesai(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg t-input font-mono-num"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t t-border">
                    <div>
                      <label htmlFor="ret-tiba-bongkar" className="block text-[10px] font-semibold t-muted mb-1">
                        Tiba Bongkar
                      </label>
                      <input
                        id="ret-tiba-bongkar"
                        type="time"
                        value={retWaktuTibaBongkar}
                        onChange={(e) => setRetWaktuTibaBongkar(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg t-input font-mono-num"
                      />
                    </div>
                    <div>
                      <label htmlFor="ret-bongkar-mulai" className="block text-[10px] font-semibold t-muted mb-1">
                        Mulai Bongkar
                      </label>
                      <input
                        id="ret-bongkar-mulai"
                        type="time"
                        value={retWaktuBongkarMulai}
                        onChange={(e) => setRetWaktuBongkarMulai(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg t-input font-mono-num"
                      />
                    </div>
                    <div>
                      <label htmlFor="ret-bongkar-selesai" className="block text-[10px] font-semibold t-muted mb-1">
                        Selesai Bongkar
                      </label>
                      <input
                        id="ret-bongkar-selesai"
                        type="time"
                        value={retWaktuBongkarSelesai}
                        onChange={(e) => setRetWaktuBongkarSelesai(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg t-input font-mono-num"
                      />
                    </div>
                  </div>
                </div>
              <div>
                <label htmlFor="ret-kondisi" className="block t-field-label mb-1">
                  Kondisi Unit Saat Kembali *
                </label>
                <textarea
                  id="ret-kondisi"
                  required
                  rows={2}
                  value={retKondisi}
                  onChange={(e) => setRetKondisi(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl t-input resize-none"
                />
              </div>
              <div>
                <label htmlFor="ret-rusak" className="block t-field-label mb-1">
                  Catatan Kerusakan (Jika Ada)
                </label>
                <input
                  id="ret-rusak"
                  type="text"
                  value={retKerusakan}
                  onChange={(e) => setRetKerusakan(e.target.value)}
                  placeholder="Kosongkan jika tidak ada kerusakan"
                  className="w-full px-3 py-2 rounded-xl t-input"
                />
              </div>
              <div>
                <span className="block t-field-label mb-1">Foto Bukti Kembali / Kerusakan</span>
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary font-semibold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{retBuktiNama || 'Unggah Foto'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const res = await readProofFileAsDataUrl(f);
                      setRetBuktiUrl(res.dataUrl);
                      setRetBuktiNama(res.name);
                    }}
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t t-border">
                <button
                  type="button"
                  onClick={() => setReturnTarget(null)}
                  className="px-4 py-2 rounded-xl t-btn-secondary font-semibold"
                >
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl t-btn-primary">
                  Konfirmasi Pengembalian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
