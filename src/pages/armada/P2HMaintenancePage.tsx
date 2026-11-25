import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Lock,
  Package,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Unlock,
  Upload,
  Wrench,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { computePermintaanBarangStatus } from '../../data/armadaSeed';
import type {
  ArmadaMaintenanceRequest,
  ArmadaP2HRecord,
  ArmadaPermintaanBarang,
  ArmadaUnit,
  MaintenancePriority,
  MaintenanceStatus,
  P2HChecklistItem,
  PermintaanBarangItem,
  PermintaanBarangStatus,
} from '../../types/armada';
import { readProofFileAsDataUrl } from '../../utils/armadaSchedule';
import { formatDateShortID, getTodayISO } from '../../utils/format';

// ==========================================
// 1. HASIL P2H (ADMIN ARMADA)
// ==========================================

interface HasilP2HPageProps {
  p2hList: ArmadaP2HRecord[];
  maintenanceList: ArmadaMaintenanceRequest[];
  selectedP2HId: string | null;
  onSelectP2H: (id: string | null) => void;
  onCreateMaintenanceFromP2H: (params: {
    p2h: ArmadaP2HRecord;
    item: P2HChecklistItem;
  }) => ArmadaMaintenanceRequest;
  onOpenMaintenance: (maintenanceId: string) => void;
}

export function HasilP2HPage({
  p2hList,
  maintenanceList,
  selectedP2HId,
  onSelectP2H,
  onCreateMaintenanceFromP2H,
  onOpenMaintenance,
}: HasilP2HPageProps) {
  const [search, setSearch] = useState('');
  const [filterTemuan, setFilterTemuan] = useState<'ALL' | 'TEMUAN' | 'KRITIS'>('ALL');

  const selectedP2H = useMemo(
    () => (selectedP2HId ? p2hList.find((p) => p.id === selectedP2HId) || null : null),
    [p2hList, selectedP2HId],
  );

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return p2hList
      .filter((p) => {
        if (filterTemuan === 'TEMUAN' && p.jumlahTemuan === 0) return false;
        if (filterTemuan === 'KRITIS' && !p.adaTemuanKritis) return false;
        if (q) {
          const hit =
            p.nomorP2H.toLowerCase().includes(q) ||
            p.nomorPenugasan.toLowerCase().includes(q) ||
            p.kodeUnit.toLowerCase().includes(q) ||
            p.nomorPolisi.toLowerCase().includes(q) ||
            p.sopirNama.toLowerCase().includes(q);
          if (!hit) return false;
        }
        return true;
      })
      .sort((a, b) => b.tanggalIsi.localeCompare(a.tanggalIsi));
  }, [filterTemuan, p2hList, search]);

  if (selectedP2H) {
    const linkedMaint = maintenanceList.filter(
      (m) => m.p2hId === selectedP2H.id || selectedP2H.maintenanceIds.includes(m.id),
    );
    const temuanItems = selectedP2H.items.filter((it) => it.kondisi === 'Ada Temuan');

    return (
      <section className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs t-muted">
              <span>P2H Kendaraan</span>
              <span aria-hidden="true">/</span>
              <button
                type="button"
                onClick={() => onSelectP2H(null)}
                className="t-link hover:underline font-medium"
              >
                Hasil P2H
              </button>
              <span aria-hidden="true">/</span>
              <span className="t-text font-mono-num font-semibold">{selectedP2H.nomorP2H}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-display t-text">
              {selectedP2H.nomorP2H} &mdash; {selectedP2H.kodeUnit} ({selectedP2H.nomorPolisi})
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs t-muted">
              <span>Penugasan: {selectedP2H.nomorPenugasan}</span>
              <span aria-hidden="true">&middot;</span>
              <span>Sopir: {selectedP2H.sopirNama}</span>
              <span aria-hidden="true">&middot;</span>
              <span className="font-mono-num">
                KM {selectedP2H.kilometer.toLocaleString('id-ID')}
              </span>
              <span aria-hidden="true">&middot;</span>
              <span className="font-bold t-text">{selectedP2H.statusTinjauan}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectP2H(null)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Daftar Hasil P2H</span>
          </button>
        </div>

        {/* Linked Maintenance Tickets */}
        {linkedMaint.length > 0 && (
          <div className="t-card rounded-2xl p-4 space-y-2 text-xs">
            <div className="t-section-label">Pengajuan Perbaikan Terkait</div>
            <div className="flex flex-wrap gap-2">
              {linkedMaint.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onOpenMaintenance(m.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary font-bold"
                >
                  <Wrench className="w-3.5 h-3.5 t-link" />
                  <span className="font-mono-num">{m.nomorPengajuan}</span>
                  <span className="t-muted">&middot; {m.status}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Findings Spotlight with Buat Pengajuan Perbaikan CTA */}
        {temuanItems.length > 0 && (
          <div className="t-card rounded-2xl p-5 space-y-3 text-xs">
            <div className="border-b t-border pb-3">
              <h3 className="t-section-label">
                Temuan P2H ({temuanItems.length}) &mdash; Tindak Lanjut Admin Armada
              </h3>
              <p className="text-[11px] t-muted mt-0.5">
                Klik <b>Buat Pengajuan Perbaikan</b> untuk membawa unit, kilometer, catatan, dan
                foto langsung ke modul Maintenance.
              </p>
            </div>
            <div className="space-y-3">
              {temuanItems.map((item) => {
                const existingTicket = linkedMaint.find(
                  (m) => m.itemTemuan === item.label,
                );
                return (
                  <div
                    key={item.kode}
                    className="p-4 rounded-xl t-subtle border t-border flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold t-text text-sm">{item.label}</span>
                        {item.kritis && (
                          <span
                            className="text-[11px] font-bold inline-flex items-center gap-1"
                            style={{ color: 'var(--status-bad-text)' }}
                          >
                            <Lock className="w-3 h-3" />
                            <span>Kritis (Menahan Mulai Perjalanan)</span>
                          </span>
                        )}
                      </div>
                      <p className="t-text">{item.catatan || 'Tidak ada catatan tambahan.'}</p>
                      {item.fotoDataUrl && (
                        <img
                          src={item.fotoDataUrl}
                          alt={`Foto temuan ${item.label}`}
                          className="max-h-40 rounded-xl border t-border object-contain mt-1"
                        />
                      )}
                    </div>

                    <div className="shrink-0">
                      {existingTicket ? (
                        <button
                          type="button"
                          onClick={() => onOpenMaintenance(existingTicket.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary font-bold whitespace-nowrap"
                        >
                          <Wrench className="w-3.5 h-3.5 t-link" />
                          <span>
                            {existingTicket.nomorPengajuan} ({existingTicket.status})
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const created = onCreateMaintenanceFromP2H({
                              p2h: selectedP2H,
                              item,
                            });
                            onOpenMaintenance(created.id);
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl t-btn-primary font-bold whitespace-nowrap"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Buat Pengajuan Perbaikan</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Full Checklist Table */}
        <div className="t-card rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b t-border">
            <h3 className="t-section-label">Seluruh Item Checklist P2H</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="t-subtle border-b t-border">
                  <th className="py-3 px-5 t-th-label">Item Pemeriksaan</th>
                  <th className="py-3 px-4 t-th-label">Prioritas</th>
                  <th className="py-3 px-4 t-th-label">Kondisi</th>
                  <th className="py-3 px-5 t-th-label">Catatan Sopir</th>
                </tr>
              </thead>
              <tbody className="divide-y t-border">
                {selectedP2H.items.map((item) => (
                  <tr key={item.kode}>
                    <td className="py-3 px-5 font-semibold t-text">{item.label}</td>
                    <td className="py-3 px-4 t-muted">{item.kritis ? 'Kritis' : 'Standar'}</td>
                    <td
                      className="py-3 px-4 font-bold whitespace-nowrap"
                      style={{
                        color:
                          item.kondisi === 'Baik'
                            ? 'var(--status-ok-text)'
                            : item.kondisi === 'Ada Temuan'
                              ? 'var(--status-bad-text)'
                              : 'var(--text-muted)',
                      }}
                    >
                      {item.kondisi}
                    </td>
                    <td className="py-3 px-5 t-muted">{item.catatan || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <div className="text-xs font-medium t-muted">
          P2H &amp; Maintenance <span aria-hidden="true">/</span>{' '}
          <span className="t-link font-semibold">Hasil P2H</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-display t-text mt-1">Hasil P2H Kendaraan</h2>
        <p className="text-xs t-muted mt-1 max-w-2xl">
          Tinjau checklist pemeriksaan harian yang dikirim sopir dari HP. Temuan kritis otomatis
          menahan tombol <b>Mulai Perjalanan</b> sampai perbaikan &amp; pemeriksaan ulang selesai.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="t-card rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8">
          <label htmlFor="p2h-search" className="block t-field-label mb-1">
            Cari No. P2H, Unit, Nomor Polisi, Penugasan, atau Sopir
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 t-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="p2h-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Contoh: P2H-001, ARM-001, Dedi..."
              className="w-full text-xs pl-8 pr-3 py-2 rounded-xl t-input"
            />
          </div>
        </div>
        <div className="sm:col-span-4">
          <label htmlFor="p2h-filter" className="block t-field-label mb-1">
            Filter Temuan
          </label>
          <select
            id="p2h-filter"
            value={filterTemuan}
            onChange={(e) => setFilterTemuan(e.target.value as 'ALL' | 'TEMUAN' | 'KRITIS')}
            className="w-full text-xs px-3 py-2 rounded-xl t-input font-semibold"
          >
            <option value="ALL">Semua Hasil P2H</option>
            <option value="TEMUAN">Ada Temuan</option>
            <option value="KRITIS">Temuan Kritis</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="t-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="t-subtle border-b t-border">
                <th className="py-3.5 px-5 t-th-label">No. P2H &amp; Tanggal</th>
                <th className="py-3.5 px-4 t-th-label">Unit &amp; Penugasan</th>
                <th className="py-3.5 px-4 t-th-label">Sopir</th>
                <th className="py-3.5 px-4 t-th-label text-right">Kilometer</th>
                <th className="py-3.5 px-4 t-th-label">Temuan &amp; No. Perbaikan</th>
                <th className="py-3.5 px-4 t-th-label">Status</th>
                <th className="py-3.5 px-5 t-th-label text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y t-border">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center t-muted">
                    Belum ada hasil P2H yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredList.map((rec) => {
                  const linkedMaint = maintenanceList.filter(
                    (m) => m.p2hId === rec.id || rec.maintenanceIds.includes(m.id),
                  );
                  return (
                    <tr
                      key={rec.id}
                      onClick={() => onSelectP2H(rec.id)}
                      className="t-row-hover cursor-pointer"
                    >
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="font-mono-num font-bold t-link">
                          {rec.nomorP2H}
                          {rec.isPemeriksaanUlang ? ' (Ulang)' : ''}
                        </div>
                        <div className="text-[11px] font-mono-num t-muted">
                          {formatDateShortID(rec.tanggalIsi)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono-num font-bold t-text">
                          {rec.kodeUnit} &middot; {rec.nomorPolisi}
                        </div>
                        <div className="text-[11px] t-muted">{rec.nomorPenugasan}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium t-text whitespace-nowrap">
                        {rec.sopirNama}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-num tabular-nums t-text whitespace-nowrap">
                        {rec.kilometer.toLocaleString('id-ID')} km
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold t-text">
                          {rec.jumlahTemuan === 0
                            ? 'Semua item baik'
                            : `${rec.jumlahTemuan} temuan${rec.adaTemuanKritis ? ' (Kritis)' : ''}`}
                        </div>
                        {linkedMaint.length > 0 && (
                          <div className="text-[11px] font-mono-num font-bold t-link">
                            {linkedMaint
                              .map((m) => `${m.nomorPengajuan} · ${m.status}`)
                              .join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className="font-bold text-[11px]"
                          style={{
                            color:
                              rec.statusTinjauan === 'Lolos' ||
                              rec.statusTinjauan === 'Selesai / Lulus Ulang'
                                ? 'var(--status-ok-text)'
                                : rec.adaTemuanKritis
                                  ? 'var(--status-bad-text)'
                                  : 'var(--status-warn-text)',
                          }}
                        >
                          {rec.statusTinjauan}
                        </span>
                      </td>
                      <td
                        className="py-3.5 px-5 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectP2H(rec.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl t-btn-secondary text-[11px] font-bold"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Tinjau</span>
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
    </section>
  );
}

// ==========================================
// 2. PENGAJUAN PERBAIKAN (MAINTENANCE)
// ==========================================

interface MaintenancePageProps {
  maintenanceList: ArmadaMaintenanceRequest[];
  permintaanBarangList: ArmadaPermintaanBarang[];
  units: ArmadaUnit[];
  selectedMaintenanceId: string | null;
  onSelectMaintenance: (id: string | null) => void;
  onCreateManualMaintenance: (params: {
    unitId: string;
    kilometer: number;
    catatan: string;
    kritis: boolean;
    fotoDataUrl?: string;
    fotoNama?: string;
  }) => ArmadaMaintenanceRequest;
  onReviewMaintenance: (params: {
    id: string;
    prioritas: MaintenancePriority;
    mekanikAtauBengkel: string;
    catatanTinjauan?: string;
  }) => void;
  onUpdateWorkProgress: (params: {
    id: string;
    status: 'Dikerjakan' | 'Menunggu Barang';
    tindakanPerbaikan: string;
  }) => void;
  onCompleteRepairWork: (params: {
    id: string;
    hasilPekerjaan: string;
  }) => void;
  onReleaseUnitHold: (params: {
    id: string;
    hasilPemeriksaanUlang: string;
  }) => void;
  onCreatePermintaanBarang: (params: {
    maintenanceId: string;
    dimintaOleh: string;
    items: Array<{ namaBarang: string; satuan: string; jumlahDiminta: number }>;
    catatan?: string;
  }) => void;
  onUpdatePermintaanBarangItems: (params: {
    id: string;
    items: PermintaanBarangItem[];
  }) => void;
  onOpenP2H: (p2hId: string) => void;
  onOpenUnitDetail: (unitId: string) => void;
}

const MAINT_STEPS: MaintenanceStatus[] = [
  'Diajukan',
  'Ditinjau',
  'Dikerjakan',
  'Menunggu Barang',
  'Selesai',
];

export function MaintenancePage({
  maintenanceList,
  permintaanBarangList,
  units,
  selectedMaintenanceId,
  onSelectMaintenance,
  onCreateManualMaintenance,
  onReviewMaintenance,
  onUpdateWorkProgress,
  onCompleteRepairWork,
  onReleaseUnitHold,
  onCreatePermintaanBarang,
  onUpdatePermintaanBarangItems,
  onOpenP2H,
  onOpenUnitDetail,
}: MaintenancePageProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | MaintenanceStatus>('ALL');

  // Create Manual Maintenance Modal
  const [manualOpen, setManualOpen] = useState(false);
  const [manUnitId, setManUnitId] = useState('');
  const [manKm, setManKm] = useState('');
  const [manKeluhan, setManKeluhan] = useState('');
  const [manKritis, setManKritis] = useState(false);
  const [manFotoUrl, setManFotoUrl] = useState<string | undefined>(undefined);
  const [manFotoNama, setManFotoNama] = useState<string | undefined>(undefined);

  // Stage 2: Kepala Armada Tinjau
  const [prioritas, setPrioritas] = useState<MaintenancePriority>('Tinggi');
  const [mekanik, setMekanik] = useState('Mekanik Internal — Hendro');
  const [catatanTinjau, setCatatanTinjau] = useState('');

  // Stage 3: Mekanik Dikerjakan
  const [tindakan, setTindakan] = useState('');

  // Stage 4: Selesai & Pemeriksaan Ulang
  const [hasilPekerjaan, setHasilPekerjaan] = useState('');
  const [hasilUlang, setHasilUlang] = useState('');

  // Ajukan Barang Modal
  const [barangModalOpen, setBarangModalOpen] = useState(false);
  const [barangRows, setBarangRows] = useState<
    Array<{ id: string; namaBarang: string; satuan: string; jumlahDiminta: string }>
  >([
    { id: 'BRG-1', namaBarang: 'Ban Luar', satuan: 'Pcs', jumlahDiminta: '1' },
    { id: 'BRG-2', namaBarang: 'Pentil Ban', satuan: 'Pcs', jumlahDiminta: '1' },
  ]);
  const [barangCatatan, setBarangCatatan] = useState('');
  const [barangError, setBarangError] = useState('');

  const selectedMaint = useMemo(
    () =>
      selectedMaintenanceId
        ? maintenanceList.find((m) => m.id === selectedMaintenanceId) || null
        : null,
    [maintenanceList, selectedMaintenanceId],
  );

  const openDetail = (m: ArmadaMaintenanceRequest) => {
    setPrioritas(m.prioritas || (m.kritis ? 'Kritis' : 'Tinggi'));
    setMekanik(m.mekanikAtauBengkel || 'Mekanik Internal — Hendro');
    setCatatanTinjau(m.catatanTinjauan || '');
    setTindakan(m.tindakanPerbaikan || '');
    setHasilPekerjaan(m.hasilPekerjaan || '');
    setHasilUlang(m.hasilPemeriksaanUlang || '');
    onSelectMaintenance(m.id);
  };

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return maintenanceList
      .filter((m) => {
        if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;
        if (q) {
          const hit =
            m.nomorPengajuan.toLowerCase().includes(q) ||
            m.kodeUnit.toLowerCase().includes(q) ||
            m.nomorPolisi.toLowerCase().includes(q) ||
            m.catatan.toLowerCase().includes(q) ||
            (m.nomorP2H || '').toLowerCase().includes(q);
          if (!hit) return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [maintenanceList, search, statusFilter]);

  const statusColor = (st: MaintenanceStatus) => {
    if (st === 'Selesai') return 'var(--status-ok-text)';
    if (st === 'Menunggu Barang') return 'var(--status-bad-text)';
    if (st === 'Dikerjakan' || st === 'Ditinjau') return 'var(--status-info-text)';
    return 'var(--status-warn-text)';
  };

  const barangStatusColor = (st: PermintaanBarangStatus) => {
    if (st === 'Terpenuhi') return 'var(--status-ok-text)';
    if (st === 'Terpenuhi Sebagian') return 'var(--status-warn-text)';
    if (st === 'Disetujui') return 'var(--status-info-text)';
    return 'var(--text-muted)';
  };

  // DETAIL PENGAJUAN PERBAIKAN
  if (selectedMaint) {
    const linkedBarang = permintaanBarangList.filter((b) => b.maintenanceId === selectedMaint.id);
    const needsHoldRelease = selectedMaint.kritis && !selectedMaint.penahananDilepas;

    return (
      <section className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs t-muted">
              <span>Maintenance Kendaraan</span>
              <span aria-hidden="true">/</span>
              <button
                type="button"
                onClick={() => onSelectMaintenance(null)}
                className="t-link hover:underline font-medium"
              >
                Pengajuan Perbaikan
              </button>
              <span aria-hidden="true">/</span>
              <span className="t-text font-mono-num font-semibold">
                {selectedMaint.nomorPengajuan}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-display t-text">
              {selectedMaint.nomorPengajuan} &mdash; {selectedMaint.kodeUnit} (
              {selectedMaint.nomorPolisi})
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs t-muted">
              <span>Sumber: {selectedMaint.sumber}</span>
              <span aria-hidden="true">&middot;</span>
              <span className="font-mono-num">
                KM {selectedMaint.kilometer.toLocaleString('id-ID')}
              </span>
              <span aria-hidden="true">&middot;</span>
              <span className="font-bold" style={{ color: statusColor(selectedMaint.status) }}>
                {selectedMaint.status}
              </span>
              {selectedMaint.prioritas && (
                <>
                  <span aria-hidden="true">&middot;</span>
                  <span>Prioritas: {selectedMaint.prioritas}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedMaint.p2hId && (
              <button
                type="button"
                onClick={() => onOpenP2H(selectedMaint.p2hId!)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-bold whitespace-nowrap"
              >
                <ClipboardCheck className="w-3.5 h-3.5 t-link" />
                <span>Buka Hasil {selectedMaint.nomorP2H || 'P2H'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenUnitDetail(selectedMaint.unitId)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
            >
              <span>Detail Unit {selectedMaint.kodeUnit}</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectMaintenance(null)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Daftar Perbaikan</span>
            </button>
          </div>
        </div>

        {/* Repair Identity Card */}
        <div className="t-card rounded-2xl p-5 space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b t-border">
            <h3 className="t-section-label">Detail Keluhan &amp; Penugasan Bengkel</h3>
            {selectedMaint.kritis && (
              <span
                className="font-bold inline-flex items-center gap-1"
                style={{
                  color: selectedMaint.penahananDilepas
                    ? 'var(--status-ok-text)'
                    : 'var(--status-bad-text)',
                }}
              >
                {selectedMaint.penahananDilepas ? (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Penahanan Unit Sudah Dilepas</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Temuan Kritis — Unit Ditahan</span>
                  </>
                )}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="t-field-label">Item / Keluhan Utama</div>
              <div className="font-semibold t-text mt-1">
                {selectedMaint.itemTemuan || 'Laporan Kerusakan'}
              </div>
            </div>
            <div>
              <div className="t-field-label">Mekanik / Bengkel</div>
              <div className="font-semibold t-text mt-1">
                {selectedMaint.mekanikAtauBengkel || 'Belum ditunjuk'}
              </div>
            </div>
            <div>
              <div className="t-field-label">Diajukan Oleh</div>
              <div className="t-text mt-1">
                {selectedMaint.diajukanOleh} &middot;{' '}
                {formatDateShortID(selectedMaint.tanggalDiajukan)}
              </div>
            </div>
            <div>
              <div className="t-field-label">Prioritas</div>
              <div className="font-bold t-text mt-1">{selectedMaint.prioritas || '-'}</div>
            </div>
            <div className="sm:col-span-2 lg:col-span-4 pt-3 border-t t-border space-y-2">
              <div className="t-field-label">Catatan Keluhan</div>
              <p className="t-text">{selectedMaint.catatan}</p>
              {selectedMaint.fotoDataUrl && (
                <img
                  src={selectedMaint.fotoDataUrl}
                  alt="Foto kerusakan"
                  className="max-h-44 rounded-xl border t-border object-contain"
                />
              )}
            </div>
          </div>
        </div>

        {/* STAGE 2: DITINJAU (KEPALA ARMADA) */}
        {selectedMaint.status === 'Diajukan' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!mekanik.trim()) return;
              onReviewMaintenance({
                id: selectedMaint.id,
                prioritas,
                mekanikAtauBengkel: mekanik.trim(),
                catatanTinjauan: catatanTinjau.trim(),
              });
            }}
            className="t-card rounded-2xl p-5 space-y-4 text-xs"
          >
            <div className="border-b t-border pb-3">
              <h3 className="t-section-label">Tahap 2: Tinjauan &amp; Persetujuan (Kepala Armada)</h3>
              <p className="text-[11px] t-muted mt-0.5">
                Tentukan prioritas, setujui pekerjaan perbaikan, dan tunjuk mekanik atau bengkel.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="mnt-prio" className="block t-field-label mb-1">
                  Prioritas *
                </label>
                <select
                  id="mnt-prio"
                  value={prioritas}
                  onChange={(e) => setPrioritas(e.target.value as MaintenancePriority)}
                  className="w-full px-3 py-2 rounded-xl t-input font-semibold"
                >
                  <option value="Rendah">Rendah</option>
                  <option value="Sedang">Sedang</option>
                  <option value="Tinggi">Tinggi</option>
                  <option value="Kritis">Kritis</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="mnt-mekanik" className="block t-field-label mb-1">
                  Mekanik atau Bengkel Ditunjuk *
                </label>
                <input
                  id="mnt-mekanik"
                  type="text"
                  required
                  value={mekanik}
                  onChange={(e) => setMekanik(e.target.value)}
                  placeholder="Contoh: Mekanik Internal — Hendro / Bengkel Jaya Ban"
                  className="w-full px-3 py-2 rounded-xl t-input font-semibold"
                />
              </div>
            </div>
            <div>
              <label htmlFor="mnt-cat-tinjau" className="block t-field-label mb-1">
                Instruksi Kepala Armada (Opsional)
              </label>
              <input
                id="mnt-cat-tinjau"
                type="text"
                value={catatanTinjau}
                onChange={(e) => setCatatanTinjau(e.target.value)}
                placeholder="Prioritaskan hari ini sebelum keberangkatan Senin"
                className="w-full px-3 py-2 rounded-xl t-input"
              />
            </div>
            <div className="flex justify-end">
              <button type="submit" className="px-4 py-2.5 rounded-xl t-btn-primary">
                Setujui Pekerjaan &amp; Tugaskan Mekanik
              </button>
            </div>
          </form>
        )}

        {/* STAGE 3: DIKERJAKAN / MENUNGGU BARANG (MEKANIK) */}
        {(selectedMaint.status === 'Ditinjau' ||
          selectedMaint.status === 'Dikerjakan' ||
          selectedMaint.status === 'Menunggu Barang') && (
          <div className="t-card rounded-2xl p-5 space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b t-border pb-3">
              <div>
                <h3 className="t-section-label">Tahap 3: Pengerjaan Perbaikan (Mekanik)</h3>
                <p className="text-[11px] t-muted mt-0.5">
                  Catat tindakan perbaikan. Jika suku cadang belum tersedia, klik{' '}
                  <b>Ajukan Barang</b> dan ubah status ke <b>Menunggu Barang</b>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBarangError('');
                  setBarangModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-primary whitespace-nowrap"
              >
                <Package className="w-3.5 h-3.5" />
                <span>Ajukan Barang</span>
              </button>
            </div>

            <div>
              <label htmlFor="mnt-tindakan" className="block t-field-label mb-1">
                Catatan Tindakan Perbaikan
              </label>
              <textarea
                id="mnt-tindakan"
                rows={2}
                value={tindakan}
                onChange={(e) => setTindakan(e.target.value)}
                placeholder="Contoh: Lepas ban belakang kanan, ganti ban baru + pasang pentil baru & cek tekanan"
                className="w-full px-3 py-2 rounded-xl t-input resize-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  onUpdateWorkProgress({
                    id: selectedMaint.id,
                    status: 'Menunggu Barang',
                    tindakanPerbaikan: tindakan.trim() || 'Menunggu kedatangan barang pengganti',
                  })
                }
                className="px-3.5 py-2 rounded-xl t-btn-secondary font-bold"
              >
                Ubah ke Menunggu Barang
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateWorkProgress({
                    id: selectedMaint.id,
                    status: 'Dikerjakan',
                    tindakanPerbaikan: tindakan.trim() || 'Sedang dikerjakan mekanik',
                  })
                }
                className="px-3.5 py-2 rounded-xl t-btn-secondary font-bold"
              >
                Simpan Status Dikerjakan
              </button>
            </div>

            {/* Complete Repair Work Sub-section */}
            <div className="pt-4 border-t t-border space-y-3">
              <div className="t-section-label">Selesaikan Pekerjaan (Mekanik)</div>
              <div>
                <label htmlFor="mnt-hasil" className="block t-field-label mb-1">
                  Hasil Pekerjaan Perbaikan *
                </label>
                <input
                  id="mnt-hasil"
                  type="text"
                  value={hasilPekerjaan}
                  onChange={(e) => setHasilPekerjaan(e.target.value)}
                  placeholder="Contoh: Ban pengganti & pentil terpasang, tekanan 95 PSI, uji jalan aman"
                  className="w-full px-3 py-2 rounded-xl t-input"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!hasilPekerjaan.trim()) return;
                    onCompleteRepairWork({
                      id: selectedMaint.id,
                      hasilPekerjaan: hasilPekerjaan.trim(),
                    });
                  }}
                  disabled={!hasilPekerjaan.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl t-btn-primary disabled:opacity-45"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Tandai Perbaikan Selesai</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 4: PEMERIKSAAN ULANG & LEPAS PENAHANAN UNIT (KEPALA ARMADA) */}
        {selectedMaint.status === 'Selesai' && (
          <div className="t-card rounded-2xl p-5 space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b t-border">
              <div>
                <h3 className="t-section-label">
                  Tahap 4: Hasil Pekerjaan &amp; Pemeriksaan Ulang (Kepala Armada)
                </h3>
                <p className="text-[11px] t-muted mt-0.5">
                  Hasil mekanik: <b>{selectedMaint.hasilPekerjaan || '-'}</b>
                </p>
              </div>
              <span
                className="font-bold"
                style={{ color: 'var(--status-ok-text)' }}
              >
                Selesai {formatDateShortID(selectedMaint.tanggalSelesai)}
              </span>
            </div>

            {needsHoldRelease ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!hasilUlang.trim()) return;
                  onReleaseUnitHold({
                    id: selectedMaint.id,
                    hasilPemeriksaanUlang: hasilUlang.trim(),
                  });
                }}
                className="space-y-3"
              >
                <div className="p-3 rounded-xl t-status-warn font-semibold">
                  Unit <b>{selectedMaint.kodeUnit}</b> masih ditahan karena temuan kritis. Catat
                  hasil pemeriksaan ulang untuk melepas penahanan unit agar perjalanan dapat dimulai.
                </div>
                <div>
                  <label htmlFor="mnt-ulang" className="block t-field-label mb-1">
                    Hasil Pemeriksaan Ulang (Kepala Armada) *
                  </label>
                  <textarea
                    id="mnt-ulang"
                    required
                    rows={2}
                    value={hasilUlang}
                    onChange={(e) => setHasilUlang(e.target.value)}
                    placeholder="Contoh: Ban baru & pentil dicek fisik dan tekanan angin sesuai standar, unit layak jalan"
                    className="w-full px-3 py-2 rounded-xl t-input resize-none"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl t-btn-primary"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Catat Pemeriksaan Ulang &amp; Lepas Penahanan Unit</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3.5 rounded-xl t-status-ok space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {selectedMaint.kritis
                      ? 'Pemeriksaan Ulang Tercatat & Penahanan Unit Dilepas'
                      : 'Pekerjaan Perbaikan Selesai'}
                  </span>
                </div>
                {selectedMaint.hasilPemeriksaanUlang && (
                  <p className="text-[11px] opacity-90">
                    Hasil pemeriksaan ulang: {selectedMaint.hasilPemeriksaanUlang}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* LINKED PERMINTAAN BARANG SECTION */}
        <div className="t-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b t-border flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="t-section-label">
                Permintaan Barang untuk Perbaikan Ini ({linkedBarang.length})
              </h3>
              <p className="text-[11px] t-muted mt-0.5">
                Satu pengajuan perbaikan bisa memiliki beberapa permintaan barang. Perbarui jumlah
                disetujui &amp; diterima langsung di sini.
              </p>
            </div>
            {selectedMaint.status !== 'Selesai' && (
              <button
                type="button"
                onClick={() => {
                  setBarangError('');
                  setBarangModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl t-btn-secondary text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajukan Barang</span>
              </button>
            )}
          </div>

          {linkedBarang.length === 0 ? (
            <div className="p-6 text-center text-xs t-muted">
              Belum ada permintaan barang untuk perbaikan ini. Klik <b>Ajukan Barang</b> jika
              mekanik membutuhkan suku cadang.
            </div>
          ) : (
            <div className="divide-y t-border">
              {linkedBarang.map((req) => (
                <div key={req.id} className="p-4 space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-mono-num font-bold t-link">{req.nomorPermintaan}</span>
                      <span className="t-muted ml-2">
                        &middot; {formatDateShortID(req.tanggalPermintaan)} &middot;{' '}
                        {req.dimintaOleh}
                      </span>
                    </div>
                    <span
                      className="font-bold text-xs"
                      style={{ color: barangStatusColor(req.status) }}
                    >
                      {req.status}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="t-subtle border-b t-border">
                          <th className="py-2 px-3 t-th-label">Nama Barang</th>
                          <th className="py-2 px-3 t-th-label text-right">Diminta</th>
                          <th className="py-2 px-3 t-th-label text-right">Disetujui</th>
                          <th className="py-2 px-3 t-th-label text-right">Diterima</th>
                          <th className="py-2 px-3 t-th-label text-right">Sisa Kurang</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y t-border">
                        {req.items.map((item) => {
                          const target =
                            item.jumlahDisetujui > 0 ? item.jumlahDisetujui : item.jumlahDiminta;
                          const kurang = Math.max(0, target - item.jumlahDiterima);
                          return (
                            <tr key={item.id}>
                              <td className="py-2 px-3 font-semibold t-text">
                                {item.namaBarang}{' '}
                                <span className="t-muted font-normal">({item.satuan})</span>
                              </td>
                              <td className="py-2 px-3 text-right font-mono-num tabular-nums t-text">
                                {item.jumlahDiminta}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <input
                                  type="number"
                                  min={0}
                                  max={999}
                                  aria-label={`Jumlah disetujui ${item.namaBarang}`}
                                  value={item.jumlahDisetujui}
                                  onChange={(e) => {
                                    const val = Math.max(0, Number(e.target.value) || 0);
                                    const nextItems = req.items.map((it) =>
                                      it.id === item.id ? { ...it, jumlahDisetujui: val } : it,
                                    );
                                    onUpdatePermintaanBarangItems({ id: req.id, items: nextItems });
                                  }}
                                  className="w-16 px-2 py-1 rounded-lg t-input font-mono-num text-right"
                                />
                              </td>
                              <td className="py-2 px-3 text-right">
                                <input
                                  type="number"
                                  min={0}
                                  max={999}
                                  aria-label={`Jumlah diterima ${item.namaBarang}`}
                                  value={item.jumlahDiterima}
                                  onChange={(e) => {
                                    const val = Math.max(0, Number(e.target.value) || 0);
                                    const nextItems = req.items.map((it) =>
                                      it.id === item.id ? { ...it, jumlahDiterima: val } : it,
                                    );
                                    onUpdatePermintaanBarangItems({ id: req.id, items: nextItems });
                                  }}
                                  className="w-16 px-2 py-1 rounded-lg t-input font-mono-num font-bold text-right"
                                />
                              </td>
                              <td
                                className="py-2 px-3 text-right font-mono-num tabular-nums font-bold"
                                style={{
                                  color:
                                    kurang === 0
                                      ? 'var(--status-ok-text)'
                                      : 'var(--status-warn-text)',
                                }}
                              >
                                {kurang === 0 ? 'Lengkap' : `Kurang ${kurang}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MODAL: AJUKAN BARANG (MULTI-ITEM) */}
        {barangModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setBarangModalOpen(false)}
          >
            <div
              className="w-full max-w-xl max-h-[92vh] flex flex-col t-card rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b t-border flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-display t-text">
                    Ajukan Barang &mdash; {selectedMaint.nomorPengajuan}
                  </h3>
                  <p className="text-[11px] t-muted">
                    Masukkan beberapa barang sekaligus (mis. 1 Ban dan 1 Pentil).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBarangModalOpen(false)}
                  aria-label="Tutup modal permintaan barang"
                  className="p-1.5 rounded-xl t-btn-secondary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setBarangError('');
                  const valid = barangRows
                    .map((r) => ({
                      namaBarang: r.namaBarang.trim(),
                      satuan: r.satuan.trim() || 'Pcs',
                      jumlahDiminta: Math.max(0, Number(r.jumlahDiminta) || 0),
                    }))
                    .filter((r) => r.namaBarang && r.jumlahDiminta > 0);
                  if (valid.length === 0) {
                    setBarangError('Masukkan minimal satu barang dengan jumlah diminta > 0.');
                    return;
                  }
                  onCreatePermintaanBarang({
                    maintenanceId: selectedMaint.id,
                    dimintaOleh: selectedMaint.mekanikAtauBengkel || 'Mekanik',
                    items: valid,
                    catatan: barangCatatan.trim(),
                  });
                  setBarangModalOpen(false);
                }}
                className="p-5 overflow-y-auto space-y-4 text-xs"
              >
                {barangError && (
                  <div className="p-3 rounded-xl t-status-bad font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{barangError}</span>
                  </div>
                )}

                <div className="space-y-2">
                  {barangRows.map((row) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl t-subtle border t-border"
                    >
                      <div className="col-span-6">
                        <input
                          type="text"
                          required
                          value={row.namaBarang}
                          onChange={(e) =>
                            setBarangRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id ? { ...r, namaBarang: e.target.value } : r,
                              ),
                            )
                          }
                          placeholder="Nama barang (mis. Ban, Pentil)"
                          className="w-full px-2.5 py-1.5 rounded-xl t-input font-semibold"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={row.satuan}
                          onChange={(e) =>
                            setBarangRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id ? { ...r, satuan: e.target.value } : r,
                              ),
                            )
                          }
                          placeholder="Satuan"
                          className="w-full px-2.5 py-1.5 rounded-xl t-input"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min={1}
                          required
                          value={row.jumlahDiminta}
                          onChange={(e) =>
                            setBarangRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id ? { ...r, jumlahDiminta: e.target.value } : r,
                              ),
                            )
                          }
                          className="w-full px-2 py-1.5 rounded-xl t-input font-mono-num font-bold text-right"
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {barangRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setBarangRows((prev) => prev.filter((r) => r.id !== row.id))
                            }
                            aria-label="Hapus baris barang"
                            className="p-1.5 rounded-lg t-btn-secondary"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      setBarangRows((prev) => [
                        ...prev,
                        {
                          id: `BRG-${Date.now()}`,
                          namaBarang: '',
                          satuan: 'Pcs',
                          jumlahDiminta: '1',
                        },
                      ])
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl t-btn-secondary font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Baris Barang</span>
                  </button>
                </div>

                <div>
                  <label htmlFor="brg-cat" className="block t-field-label mb-1">
                    Catatan Permintaan (Opsional)
                  </label>
                  <input
                    id="brg-cat"
                    type="text"
                    value={barangCatatan}
                    onChange={(e) => setBarangCatatan(e.target.value)}
                    placeholder="Ukuran ban 7.50-16, urgent"
                    className="w-full px-3 py-2 rounded-xl t-input"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t t-border">
                  <button
                    type="button"
                    onClick={() => setBarangModalOpen(false)}
                    className="px-4 py-2 rounded-xl t-btn-secondary font-semibold"
                  >
                    Batal
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-xl t-btn-primary">
                    Simpan Permintaan Barang
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
    );
  }

  // DAFTAR PENGAJUAN PERBAIKAN
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium t-muted">
            Maintenance Kendaraan <span aria-hidden="true">/</span>{' '}
            <span className="t-link font-semibold">Pengajuan Perbaikan</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display t-text mt-1">Pengajuan Perbaikan</h2>
          <p className="text-xs t-muted mt-1 max-w-2xl">
            Kelola perbaikan dari temuan P2H maupun laporan manual: <b>Diajukan</b> &rarr;{' '}
            <b>Ditinjau</b> &rarr; <b>Dikerjakan / Menunggu Barang</b> &rarr; <b>Selesai</b> &amp;
            pelepasan penahanan unit.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setManUnitId(units[0]?.id || '');
            setManKm('');
            setManKeluhan('');
            setManKritis(false);
            setManFotoUrl(undefined);
            setManFotoNama(undefined);
            setManualOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl t-btn-primary text-xs whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Pengajuan Manual</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="t-card rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8">
          <label htmlFor="mnt-search" className="block t-field-label mb-1">
            Cari No. Pengajuan, Unit, No. P2H, atau Keluhan
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 t-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="mnt-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Contoh: MNT-001, ARM-001, ban..."
              className="w-full text-xs pl-8 pr-3 py-2 rounded-xl t-input"
            />
          </div>
        </div>
        <div className="sm:col-span-4">
          <label htmlFor="mnt-status" className="block t-field-label mb-1">
            Status Perbaikan
          </label>
          <select
            id="mnt-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | MaintenanceStatus)}
            className="w-full text-xs px-3 py-2 rounded-xl t-input font-semibold"
          >
            <option value="ALL">Semua Status</option>
            {MAINT_STEPS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="t-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="t-subtle border-b t-border">
                <th className="py-3.5 px-5 t-th-label">No. Pengajuan</th>
                <th className="py-3.5 px-4 t-th-label">Unit &amp; KM</th>
                <th className="py-3.5 px-4 t-th-label">Keluhan &amp; Sumber</th>
                <th className="py-3.5 px-4 t-th-label">Mekanik / Prioritas</th>
                <th className="py-3.5 px-4 t-th-label">Status</th>
                <th className="py-3.5 px-5 t-th-label text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y t-border">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center t-muted">
                    Belum ada pengajuan perbaikan. Buat dari temuan di <b>Hasil P2H</b> atau klik{' '}
                    <b>Buat Pengajuan Manual</b>.
                  </td>
                </tr>
              ) : (
                filteredList.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => openDetail(m)}
                    className="t-row-hover cursor-pointer"
                  >
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <div className="font-mono-num font-bold t-link">{m.nomorPengajuan}</div>
                      <div className="text-[11px] font-mono-num t-muted">
                        {formatDateShortID(m.tanggalDiajukan)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-mono-num font-bold t-text">
                        {m.kodeUnit} &middot; {m.nomorPolisi}
                      </div>
                      <div className="text-[11px] font-mono-num t-muted">
                        {m.kilometer.toLocaleString('id-ID')} km
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold t-text">
                        {m.itemTemuan ? `${m.itemTemuan}: ` : ''}
                        {m.catatan}
                      </div>
                      <div className="text-[11px] t-muted">
                        {m.sumber}
                        {m.nomorP2H ? ` · ${m.nomorP2H}` : ''}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="t-text font-medium">{m.mekanikAtauBengkel || '-'}</div>
                      <div className="text-[11px] t-muted">
                        {m.prioritas || (m.kritis ? 'Kritis' : 'Belum ditentukan')}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-[11px]" style={{ color: statusColor(m.status) }}>
                        {m.status}
                      </div>
                      {m.kritis && !m.penahananDilepas && (
                        <div
                          className="text-[10px] font-bold"
                          style={{ color: 'var(--status-bad-text)' }}
                        >
                          Unit Ditahan
                        </div>
                      )}
                    </td>
                    <td
                      className="py-3.5 px-5 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => openDetail(m)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl t-btn-secondary text-[11px] font-bold"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: MANUAL MAINTENANCE */}
      {manualOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setManualOpen(false)}
        >
          <div
            className="w-full max-w-lg t-card rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b t-border flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-display t-text">Buat Pengajuan Perbaikan Manual</h3>
                <p className="text-[11px] t-muted">
                  Untuk laporan kerusakan di luar hasil P2H.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManualOpen(false)}
                aria-label="Tutup modal pengajuan manual"
                className="p-1.5 rounded-xl t-btn-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!manUnitId || !manKeluhan.trim()) return;
                const created = onCreateManualMaintenance({
                  unitId: manUnitId,
                  kilometer: Number(manKm.replace(/\D/g, '')) || 0,
                  catatan: manKeluhan.trim(),
                  kritis: manKritis,
                  fotoDataUrl: manFotoUrl,
                  fotoNama: manFotoNama,
                });
                setManualOpen(false);
                openDetail(created);
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="man-unit" className="block t-field-label mb-1">
                    Unit Armada *
                  </label>
                  <select
                    id="man-unit"
                    required
                    value={manUnitId}
                    onChange={(e) => setManUnitId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl t-input font-semibold"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.kodeUnit} — {u.nomorPolisi}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="man-km" className="block t-field-label mb-1">
                    Kilometer *
                  </label>
                  <input
                    id="man-km"
                    type="text"
                    inputMode="numeric"
                    required
                    value={manKm}
                    onChange={(e) => setManKm(e.target.value.replace(/\D/g, ''))}
                    placeholder="45200"
                    className="w-full px-3 py-2 rounded-xl t-input font-mono-num font-bold"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="man-keluhan" className="block t-field-label mb-1">
                  Keluhan / Kerusakan *
                </label>
                <textarea
                  id="man-keluhan"
                  required
                  rows={3}
                  value={manKeluhan}
                  onChange={(e) => setManKeluhan(e.target.value)}
                  placeholder="Jelaskan keluhan kendaraan..."
                  className="w-full px-3 py-2 rounded-xl t-input resize-none"
                />
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={manKritis}
                  onChange={(e) => setManKritis(e.target.checked)}
                />
                <span className="font-semibold t-text">
                  Tandai sebagai kerusakan kritis (memerlukan pemeriksaan ulang Kepala Armada)
                </span>
              </label>
              <div>
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary font-semibold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{manFotoNama || 'Unggah Foto Kerusakan (Opsional)'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const res = await readProofFileAsDataUrl(f);
                      setManFotoUrl(res.dataUrl);
                      setManFotoNama(res.name);
                    }}
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t t-border">
                <button
                  type="button"
                  onClick={() => setManualOpen(false)}
                  className="px-4 py-2 rounded-xl t-btn-secondary font-semibold"
                >
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl t-btn-primary">
                  Kirim Pengajuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

// ==========================================
// 3. PERMINTAAN BARANG (MAINTENANCE SUBMENU)
// ==========================================

interface PermintaanBarangPageProps {
  permintaanBarangList: ArmadaPermintaanBarang[];
  onUpdateItems: (params: { id: string; items: PermintaanBarangItem[] }) => void;
  onOpenMaintenance: (maintenanceId: string) => void;
}

export function PermintaanBarangPage({
  permintaanBarangList,
  onUpdateItems,
  onOpenMaintenance,
}: PermintaanBarangPageProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PermintaanBarangStatus>('ALL');

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return permintaanBarangList
      .filter((req) => {
        if (statusFilter !== 'ALL' && req.status !== statusFilter) return false;
        if (q) {
          const hit =
            req.nomorPermintaan.toLowerCase().includes(q) ||
            req.nomorPengajuanPerbaikan.toLowerCase().includes(q) ||
            req.kodeUnit.toLowerCase().includes(q) ||
            req.items.some((it) => it.namaBarang.toLowerCase().includes(q));
          if (!hit) return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [permintaanBarangList, search, statusFilter]);

  const statusColor = (st: PermintaanBarangStatus) => {
    if (st === 'Terpenuhi') return 'var(--status-ok-text)';
    if (st === 'Terpenuhi Sebagian') return 'var(--status-warn-text)';
    if (st === 'Disetujui') return 'var(--status-info-text)';
    return 'var(--text-muted)';
  };

  return (
    <section className="space-y-5">
      <div>
        <div className="text-xs font-medium t-muted">
          Maintenance Kendaraan <span aria-hidden="true">/</span>{' '}
          <span className="t-link font-semibold">Permintaan Barang</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-display t-text mt-1">
          Permintaan Barang Perbaikan
        </h2>
        <p className="text-xs t-muted mt-1 max-w-2xl">
          Pantau jumlah diminta, disetujui, dan diterima untuk tiap barang. Jika baru sebagian
          barang datang, status otomatis tampil <b>Terpenuhi Sebagian</b> beserta kekurangannya.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="t-card rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8">
          <label htmlFor="pb-search" className="block t-field-label mb-1">
            Cari No. Permintaan, No. Perbaikan, Unit, atau Nama Barang
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 t-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="pb-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Contoh: PB-001, MNT-001, ARM-001, Ban, Pentil..."
              className="w-full text-xs pl-8 pr-3 py-2 rounded-xl t-input"
            />
          </div>
        </div>
        <div className="sm:col-span-4">
          <label htmlFor="pb-status" className="block t-field-label mb-1">
            Status Pemenuhan
          </label>
          <select
            id="pb-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | PermintaanBarangStatus)}
            className="w-full text-xs px-3 py-2 rounded-xl t-input font-semibold"
          >
            <option value="ALL">Semua Status</option>
            <option value="Diajukan">Diajukan</option>
            <option value="Disetujui">Disetujui</option>
            <option value="Terpenuhi Sebagian">Terpenuhi Sebagian</option>
            <option value="Terpenuhi">Terpenuhi</option>
          </select>
        </div>
      </div>

      {filteredList.length === 0 ? (
        <div className="t-card rounded-2xl p-8 text-center text-xs t-muted">
          Belum ada permintaan barang. Buka detail <b>Pengajuan Perbaikan</b> lalu tekan{' '}
          <b>Ajukan Barang</b>.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredList.map((req) => {
            const computed = computePermintaanBarangStatus(req.items);
            return (
              <div key={req.id} className="t-card rounded-2xl overflow-hidden text-xs">
                <div className="px-5 py-3.5 border-b t-border flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono-num font-bold t-link">{req.nomorPermintaan}</span>
                    <span className="t-muted">&middot;</span>
                    <button
                      type="button"
                      onClick={() => onOpenMaintenance(req.maintenanceId)}
                      className="font-mono-num font-bold t-link hover:underline"
                    >
                      {req.nomorPengajuanPerbaikan}
                    </button>
                    <span className="t-muted">&middot;</span>
                    <span className="font-mono-num font-semibold t-text">
                      {req.kodeUnit} ({req.nomorPolisi})
                    </span>
                    <span className="t-muted">
                      &middot; {formatDateShortID(req.tanggalPermintaan || getTodayISO())}
                    </span>
                  </div>
                  <span className="font-bold" style={{ color: statusColor(computed) }}>
                    {computed}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="t-subtle border-b t-border">
                        <th className="py-2.5 px-5 t-th-label">Nama Barang</th>
                        <th className="py-2.5 px-4 t-th-label text-right">Diminta</th>
                        <th className="py-2.5 px-4 t-th-label text-right">Disetujui</th>
                        <th className="py-2.5 px-4 t-th-label text-right">Diterima</th>
                        <th className="py-2.5 px-5 t-th-label text-right">Kekurangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y t-border">
                      {req.items.map((item) => {
                        const target =
                          item.jumlahDisetujui > 0 ? item.jumlahDisetujui : item.jumlahDiminta;
                        const kurang = Math.max(0, target - item.jumlahDiterima);
                        return (
                          <tr key={item.id}>
                            <td className="py-2.5 px-5 font-semibold t-text">
                              {item.namaBarang}{' '}
                              <span className="t-muted font-normal">({item.satuan})</span>
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono-num tabular-nums t-text">
                              {item.jumlahDiminta}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <input
                                type="number"
                                min={0}
                                max={999}
                                value={item.jumlahDisetujui}
                                onChange={(e) => {
                                  const val = Math.max(0, Number(e.target.value) || 0);
                                  onUpdateItems({
                                    id: req.id,
                                    items: req.items.map((it) =>
                                      it.id === item.id ? { ...it, jumlahDisetujui: val } : it,
                                    ),
                                  });
                                }}
                                className="w-16 px-2 py-1 rounded-lg t-input font-mono-num text-right"
                              />
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <input
                                type="number"
                                min={0}
                                max={999}
                                value={item.jumlahDiterima}
                                onChange={(e) => {
                                  const val = Math.max(0, Number(e.target.value) || 0);
                                  onUpdateItems({
                                    id: req.id,
                                    items: req.items.map((it) =>
                                      it.id === item.id ? { ...it, jumlahDiterima: val } : it,
                                    ),
                                  });
                                }}
                                className="w-16 px-2 py-1 rounded-lg t-input font-mono-num font-bold text-right"
                              />
                            </td>
                            <td
                              className="py-2.5 px-5 text-right font-mono-num tabular-nums font-bold"
                              style={{
                                color:
                                  kurang === 0
                                    ? 'var(--status-ok-text)'
                                    : 'var(--status-warn-text)',
                              }}
                            >
                              {kurang === 0 ? 'Lengkap' : `Kurang ${kurang}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
