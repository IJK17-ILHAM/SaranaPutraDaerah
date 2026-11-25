import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileText,
  Pencil,
  Plus,
  Power,
  Route,
  Search,
  Truck,
  Wrench,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { UnitArmadaFormModal } from '../../components/armada/UnitArmadaFormModal';
import type {
  ArmadaLokasi,
  ArmadaMaintenanceRequest,
  ArmadaP2HRecord,
  ArmadaPelanggan,
  ArmadaPerjalanan,
  ArmadaPermintaanBarang,
  ArmadaUnit,
  ArmadaUnitInput,
  ArmadaUnitStatus,
} from '../../types/armada';
import { formatDateShortID } from '../../utils/format';

type DetailTabId = 'berkas' | 'perjalanan' | 'p2h' | 'perbaikan';

interface UnitArmadaPageProps {
  units: ArmadaUnit[];
  perjalananList?: ArmadaPerjalanan[];
  p2hList?: ArmadaP2HRecord[];
  maintenanceList?: ArmadaMaintenanceRequest[];
  permintaanBarangList?: ArmadaPermintaanBarang[];
  pelangganList?: ArmadaPelanggan[];
  lokasiList?: ArmadaLokasi[];
  selectedUnitId: string | null;
  onSelectUnit: (id: string | null) => void;
  onSaveUnit: (input: ArmadaUnitInput) => ArmadaUnit;
  onToggleStatus: (unit: ArmadaUnit) => void;
  onOpenPerjalanan?: (perjalananId: string) => void;
  onOpenP2H?: (p2hId: string) => void;
  onOpenMaintenance?: (maintenanceId: string) => void;
}

export function UnitArmadaPage({
  units,
  perjalananList = [],
  p2hList = [],
  maintenanceList = [],
  permintaanBarangList = [],
  pelangganList = [],
  lokasiList = [],
  selectedUnitId,
  onSelectUnit,
  onSaveUnit,
  onToggleStatus,
  onOpenPerjalanan,
  onOpenP2H,
  onOpenMaintenance,
}: UnitArmadaPageProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ArmadaUnitStatus>('ALL');
  const [jenisFilter, setJenisFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<ArmadaUnit | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTabId>('perjalanan');

  const selectedUnit = useMemo(
    () => (selectedUnitId ? units.find((u) => u.id === selectedUnitId) || null : null),
    [selectedUnitId, units],
  );

  const plgById = useMemo(() => new Map(pelangganList.map((p) => [p.id, p])), [pelangganList]);
  const lokById = useMemo(() => new Map(lokasiList.map((l) => [l.id, l])), [lokasiList]);

  const jenisOptions = useMemo(
    () => [...new Set(units.map((u) => u.jenisKendaraan).filter(Boolean))].sort(),
    [units],
  );

  const stats = useMemo(() => {
    const aktif = units.filter((u) => u.status === 'Aktif').length;
    const nonaktif = units.length - aktif;
    return { total: units.length, aktif, nonaktif };
  }, [units]);

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qNoSpace = q.replace(/\s+/g, '');
    return units.filter((u) => {
      if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
      if (jenisFilter !== 'ALL' && u.jenisKendaraan !== jenisFilter) return false;
      if (q) {
        const matchKode = u.kodeUnit.toLowerCase().includes(q);
        const matchNopol =
          u.nomorPolisi.toLowerCase().includes(q) ||
          u.nomorPolisi.toLowerCase().replace(/\s+/g, '').includes(qNoSpace);
        const matchMeta =
          u.jenisKendaraan.toLowerCase().includes(q) ||
          u.merek.toLowerCase().includes(q) ||
          u.model.toLowerCase().includes(q);
        if (!matchKode && !matchNopol && !matchMeta) return false;
      }
      return true;
    });
  }, [jenisFilter, search, statusFilter, units]);

  const openCreateModal = () => {
    setEditingUnit(null);
    setModalOpen(true);
  };

  const openEditModal = (unit: ArmadaUnit) => {
    setEditingUnit(unit);
    setModalOpen(true);
  };

  const handleSave = (input: ArmadaUnitInput) => {
    const saved = onSaveUnit(input);
    setModalOpen(false);
    setEditingUnit(null);
    if (selectedUnitId) {
      onSelectUnit(saved.id);
    }
  };

  // DETAIL UNIT VIEW
  if (selectedUnit) {
    const merekModel = [selectedUnit.merek, selectedUnit.model].filter(Boolean).join(' ') || '-';
    const isAktif = selectedUnit.status === 'Aktif';

    const unitPerjalanan = perjalananList
      .filter((p) => p.unitId === selectedUnit.id)
      .sort((a, b) => b.tanggalMulai.localeCompare(a.tanggalMulai));
    const unitP2H = p2hList
      .filter((p) => p.unitId === selectedUnit.id)
      .sort((a, b) => b.tanggalIsi.localeCompare(a.tanggalIsi));
    const unitMaint = maintenanceList
      .filter((m) => m.unitId === selectedUnit.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const detailTabs: Array<{
      id: DetailTabId;
      label: string;
      count?: number;
      icon: typeof FileText;
    }> = [
      { id: 'berkas', label: 'Berkas (STNK & KIR)', icon: FileText },
      { id: 'perjalanan', label: 'Riwayat Perjalanan', count: unitPerjalanan.length, icon: Route },
      { id: 'p2h', label: 'P2H', count: unitP2H.length, icon: ClipboardCheck },
      { id: 'perbaikan', label: 'Perbaikan', count: unitMaint.length, icon: Wrench },
    ];

    return (
      <section className="space-y-5">
        {/* Breadcrumb & Back */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold t-muted">
              <span>Master Data</span>
              <span>/</span>
              <button
                type="button"
                onClick={() => onSelectUnit(null)}
                className="t-link hover:underline"
              >
                Unit Armada
              </button>
              <span>/</span>
              <span className="t-text font-mono-num">{selectedUnit.kodeUnit}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-display t-text">
                {selectedUnit.kodeUnit} &mdash; {selectedUnit.nomorPolisi}
              </h2>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                  isAktif ? 't-status-ok' : 't-status-bad'
                }`}
              >
                {isAktif ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <XCircle className="w-3 h-3" />
                )}
                <span>{selectedUnit.status}</span>
              </span>
            </div>
            <p className="text-xs t-muted">
              {selectedUnit.jenisKendaraan} &middot; {merekModel}
              {selectedUnit.tahun ? ` (${selectedUnit.tahun})` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectUnit(null)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Daftar Unit</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleStatus(selectedUnit)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-semibold"
            >
              <Power className="w-3.5 h-3.5" />
              <span>{isAktif ? 'Nonaktifkan' : 'Aktifkan'}</span>
            </button>
            <button
              type="button"
              onClick={() => openEditModal(selectedUnit)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl t-btn-primary text-xs"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Identitas Kendaraan Card */}
        <div className="t-card rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b t-border pb-3">
            <div className="inline-flex items-center gap-2">
              <Truck className="w-4 h-4 t-link" />
              <h3 className="t-section-label">Identitas Kendaraan</h3>
            </div>
            <span className="text-[11px] t-muted font-mono-num">
              Diperbarui: {formatDateShortID(selectedUnit.updatedAt)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-xl t-subtle border t-border">
              <div className="t-field-label">Kode Unit</div>
              <div className="font-mono-num font-bold t-text text-sm mt-1">
                {selectedUnit.kodeUnit}
              </div>
            </div>
            <div className="p-3 rounded-xl t-subtle border t-border">
              <div className="t-field-label">Nomor Polisi</div>
              <div className="font-mono-num font-bold t-text text-sm mt-1">
                {selectedUnit.nomorPolisi}
              </div>
            </div>
            <div className="p-3 rounded-xl t-subtle border t-border">
              <div className="t-field-label">Jenis Kendaraan</div>
              <div className="font-semibold t-text text-sm mt-1">
                {selectedUnit.jenisKendaraan}
              </div>
            </div>
            <div className="p-3 rounded-xl t-subtle border t-border">
              <div className="t-field-label">Status Unit</div>
              <div className="mt-1">
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                    isAktif ? 't-status-ok' : 't-status-bad'
                  }`}
                >
                  {selectedUnit.status}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl t-subtle border t-border">
              <div className="t-field-label">Merek</div>
              <div className="font-semibold t-text mt-1">
                {selectedUnit.merek || <span className="t-muted font-normal">Belum diisi</span>}
              </div>
            </div>
            <div className="p-3 rounded-xl t-subtle border t-border">
              <div className="t-field-label">Model / Tipe</div>
              <div className="font-semibold t-text mt-1">
                {selectedUnit.model || <span className="t-muted font-normal">Belum diisi</span>}
              </div>
            </div>
            <div className="p-3 rounded-xl t-subtle border t-border">
              <div className="t-field-label">Tahun Pembuatan</div>
              <div className="font-mono-num font-semibold t-text mt-1">
                {selectedUnit.tahun || (
                  <span className="t-muted font-normal font-sans">Belum diisi</span>
                )}
              </div>
            </div>
            <div className="p-3 rounded-xl t-subtle border t-border">
              <div className="t-field-label">Catatan</div>
              <div className="t-text mt-1">
                {selectedUnit.catatan || <span className="t-muted">Tidak ada catatan</span>}
              </div>
            </div>

            <div className="sm:col-span-2 p-3 rounded-xl t-subtle border t-border">
              <div className="t-field-label">Nomor Rangka (VIN)</div>
              <div className="font-mono-num font-semibold t-text mt-1 break-all">
                {selectedUnit.nomorRangka || (
                  <span className="t-muted font-normal font-sans">Belum dilengkapi</span>
                )}
              </div>
            </div>
            <div className="sm:col-span-2 p-3 rounded-xl t-subtle border t-border">
              <div className="t-field-label">Nomor Mesin</div>
              <div className="font-mono-num font-semibold t-text mt-1 break-all">
                {selectedUnit.nomorMesin || (
                  <span className="t-muted font-normal font-sans">Belum dilengkapi</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Connected Module Hub Tabs */}
        <div className="t-card rounded-2xl overflow-hidden">
          <div className="px-4 pt-3 border-b t-border flex flex-wrap items-center gap-1.5">
            {detailTabs.map((tab) => {
              const Icon = tab.icon;
              const active = detailTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDetailTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                    active
                      ? 'border-[var(--accent-brand)] t-text'
                      : 'border-transparent t-muted hover:t-text'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>
                    {tab.label}
                    {typeof tab.count === 'number' ? ` (${tab.count})` : ''}
                  </span>
                </button>
              );
            })}
          </div>

          {detailTab === 'berkas' && (
            <div className="p-6 text-center space-y-2 text-xs">
              <div className="font-bold t-text">Berkas Kendaraan — {selectedUnit.kodeUnit}</div>
              <p className="t-muted max-w-lg mx-auto">
                Pencatatan masa berlaku STNK tahunan/5 tahunan, uji KIR berkala, dan izin angkut
                unit ini terhubung dengan identitas unit {selectedUnit.nomorPolisi}.
              </p>
            </div>
          )}

          {detailTab === 'perjalanan' && (
            <div className="overflow-x-auto">
              {unitPerjalanan.length === 0 ? (
                <div className="p-6 text-center text-xs t-muted">
                  Belum ada riwayat perjalanan untuk unit {selectedUnit.kodeUnit}.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="t-subtle border-b t-border">
                      <th className="py-3 px-5 t-th-label">Penugasan</th>
                      <th className="py-3 px-4 t-th-label">Jadwal</th>
                      <th className="py-3 px-4 t-th-label">Pelanggan &amp; Rute</th>
                      <th className="py-3 px-4 t-th-label">Sopir</th>
                      <th className="py-3 px-5 t-th-label text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y t-border">
                    {unitPerjalanan.map((prj) => (
                      <tr
                        key={prj.id}
                        onClick={() => onOpenPerjalanan?.(prj.id)}
                        className="t-row-hover cursor-pointer"
                      >
                        <td className="py-3 px-5 font-mono-num font-bold t-link whitespace-nowrap">
                          {prj.nomorPenugasan}
                        </td>
                        <td className="py-3 px-4 font-mono-num t-text whitespace-nowrap">
                          {formatDateShortID(prj.tanggalMulai)} {prj.jamMulai}–{prj.jamSelesai}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold t-text">
                            {plgById.get(prj.pelangganId)?.namaPt || '-'}
                          </div>
                          <div className="text-[11px] t-muted">
                            {lokById.get(prj.lokasiMuatId)?.namaLokasi || '-'} &rarr;{' '}
                            {lokById.get(prj.lokasiBongkarId)?.namaLokasi || '-'}
                          </div>
                        </td>
                        <td className="py-3 px-4 t-text whitespace-nowrap">{prj.sopirNama}</td>
                        <td className="py-3 px-5 text-right font-bold t-text whitespace-nowrap">
                          {prj.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {detailTab === 'p2h' && (
            <div className="overflow-x-auto">
              {unitP2H.length === 0 ? (
                <div className="p-6 text-center text-xs t-muted">
                  Belum ada riwayat P2H untuk unit {selectedUnit.kodeUnit}.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="t-subtle border-b t-border">
                      <th className="py-3 px-5 t-th-label">No. P2H</th>
                      <th className="py-3 px-4 t-th-label">Tanggal &amp; KM</th>
                      <th className="py-3 px-4 t-th-label">Sopir</th>
                      <th className="py-3 px-4 t-th-label">Temuan</th>
                      <th className="py-3 px-5 t-th-label text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y t-border">
                    {unitP2H.map((rec) => (
                      <tr
                        key={rec.id}
                        onClick={() => onOpenP2H?.(rec.id)}
                        className="t-row-hover cursor-pointer"
                      >
                        <td className="py-3 px-5 font-mono-num font-bold t-link whitespace-nowrap">
                          {rec.nomorP2H}
                        </td>
                        <td className="py-3 px-4 font-mono-num t-text whitespace-nowrap">
                          {formatDateShortID(rec.tanggalIsi)} &middot;{' '}
                          {rec.kilometer.toLocaleString('id-ID')} km
                        </td>
                        <td className="py-3 px-4 t-text whitespace-nowrap">{rec.sopirNama}</td>
                        <td className="py-3 px-4 t-text">
                          {rec.jumlahTemuan === 0
                            ? 'Baik'
                            : `${rec.jumlahTemuan} temuan${rec.adaTemuanKritis ? ' (Kritis)' : ''}`}
                        </td>
                        <td className="py-3 px-5 text-right font-bold t-text whitespace-nowrap">
                          {rec.statusTinjauan}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {detailTab === 'perbaikan' && (
            <div className="divide-y t-border text-xs">
              {unitMaint.length === 0 ? (
                <div className="p-6 text-center t-muted">
                  Belum ada riwayat pengajuan perbaikan untuk unit {selectedUnit.kodeUnit}.
                </div>
              ) : (
                unitMaint.map((m) => {
                  const reqs = permintaanBarangList.filter((b) => b.maintenanceId === m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => onOpenMaintenance?.(m.id)}
                      className="p-4 t-row-hover cursor-pointer space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-bold">
                          <span className="font-mono-num t-link">{m.nomorPengajuan}</span>
                          <span className="t-muted ml-2">
                            &middot; {formatDateShortID(m.tanggalDiajukan)} &middot; KM{' '}
                            {m.kilometer.toLocaleString('id-ID')}
                            {m.nomorP2H ? ` · ${m.nomorP2H}` : ''}
                          </span>
                        </div>
                        <span className="font-bold t-text">{m.status}</span>
                      </div>
                      <div className="t-text">
                        {m.itemTemuan ? <b>{m.itemTemuan}: </b> : null}
                        {m.catatan}
                      </div>
                      {m.hasilPekerjaan && (
                        <div className="text-[11px] t-muted">
                          Hasil pekerjaan: {m.hasilPekerjaan}
                        </div>
                      )}
                      {m.hasilPemeriksaanUlang && (
                        <div
                          className="text-[11px] font-semibold"
                          style={{ color: 'var(--status-ok-text)' }}
                        >
                          Pemeriksaan ulang: {m.hasilPemeriksaanUlang}
                          {m.penahananDilepas ? ' (Penahanan dilepas)' : ''}
                        </div>
                      )}
                      {reqs.length > 0 && (
                        <div className="text-[11px] t-link font-semibold">
                          Permintaan barang:{' '}
                          {reqs
                            .map(
                              (r) =>
                                `${r.nomorPermintaan} (${r.status}: ${r.items
                                  .map(
                                    (it) =>
                                      `${it.namaBarang} ${it.jumlahDiterima}/${
                                        it.jumlahDisetujui || it.jumlahDiminta
                                      }`,
                                  )
                                  .join(', ')})`,
                            )
                            .join(' | ')}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <UnitArmadaFormModal
          open={modalOpen}
          editingUnit={editingUnit}
          existingUnits={units}
          onClose={() => {
            setModalOpen(false);
            setEditingUnit(null);
          }}
          onSave={handleSave}
        />
      </section>
    );
  }

  // DAFTAR UNIT VIEW
  return (
    <section className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider t-link">
            Master Data &rarr; Unit Armada
          </div>
          <h2 className="text-xl sm:text-2xl font-display t-text mt-0.5">Unit Armada</h2>
          <p className="text-xs t-muted mt-1 max-w-2xl">
            Daftar master kendaraan yang digunakan untuk pencatatan STNK/KIR, pembuatan perjalanan,
            pengisian P2H, dan pengajuan perbaikan.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl t-btn-primary text-xs whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Unit</span>
        </button>
      </div>

      {/* 3 Compact KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="t-card rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="t-field-label">Total Unit Terdaftar</div>
            <div className="text-2xl font-display t-text mt-1 tabular-nums">{stats.total}</div>
          </div>
          <div className="w-10 h-10 rounded-xl t-subtle border t-border flex items-center justify-center">
            <Truck className="w-5 h-5 t-link" />
          </div>
        </div>

        <div className="t-card rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="t-field-label">Unit Aktif</div>
            <div
              className="text-2xl font-display mt-1 tabular-nums"
              style={{ color: 'var(--status-ok-text)' }}
            >
              {stats.aktif}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl t-status-ok flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="t-card rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="t-field-label">Unit Nonaktif</div>
            <div
              className="text-2xl font-display mt-1 tabular-nums"
              style={{ color: 'var(--status-bad-text)' }}
            >
              {stats.nonaktif}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl t-status-bad flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="t-card rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6">
          <label htmlFor="unit-search" className="block t-field-label mb-1">
            Cari Kode Unit atau Nomor Polisi
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 t-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="unit-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Contoh: SPD-B3-01 atau B 9421 SPD..."
              className="w-full text-xs pl-8 pr-3 py-2 rounded-xl t-input"
            />
          </div>
        </div>

        <div className="sm:col-span-3">
          <label htmlFor="unit-jenis-filter" className="block t-field-label mb-1">
            Jenis Kendaraan
          </label>
          <select
            id="unit-jenis-filter"
            value={jenisFilter}
            onChange={(e) => setJenisFilter(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-xl t-input font-semibold"
          >
            <option value="ALL">Semua Jenis</option>
            {jenisOptions.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <label htmlFor="unit-status-filter" className="block t-field-label mb-1">
            Status Unit
          </label>
          <select
            id="unit-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | ArmadaUnitStatus)}
            className="w-full text-xs px-3 py-2 rounded-xl t-input font-semibold"
          >
            <option value="ALL">Semua Status</option>
            <option value="Aktif">Aktif</option>
            <option value="Nonaktif">Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Daftar Unit Table */}
      <div className="t-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="t-subtle border-b t-border">
                <th className="py-3.5 px-5 t-th-label">Kode Unit</th>
                <th className="py-3.5 px-4 t-th-label">Nomor Polisi</th>
                <th className="py-3.5 px-4 t-th-label">Jenis Kendaraan</th>
                <th className="py-3.5 px-4 t-th-label">Merek &amp; Model</th>
                <th className="py-3.5 px-4 t-th-label text-center">Status</th>
                <th className="py-3.5 px-5 t-th-label text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y t-border">
              {filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center t-muted">
                    Tidak ada unit armada yang cocok dengan pencarian Anda.
                  </td>
                </tr>
              ) : (
                filteredUnits.map((unit) => {
                  const merekModel = [unit.merek, unit.model].filter(Boolean).join(' ');
                  const isAktif = unit.status === 'Aktif';
                  return (
                    <tr
                      key={unit.id}
                      onClick={() => {
                        setDetailTab('berkas');
                        onSelectUnit(unit.id);
                      }}
                      className="t-row-hover cursor-pointer"
                    >
                      <td className="py-3.5 px-5 font-mono-num font-bold t-link whitespace-nowrap">
                        {unit.kodeUnit}
                      </td>
                      <td className="py-3.5 px-4 font-mono-num font-bold t-text whitespace-nowrap">
                        {unit.nomorPolisi}
                      </td>
                      <td className="py-3.5 px-4 font-semibold t-text whitespace-nowrap">
                        {unit.jenisKendaraan}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold t-text">
                          {merekModel || <span className="t-muted font-normal">-</span>}
                        </div>
                        {unit.tahun && (
                          <div className="text-[10px] t-muted font-mono-num">
                            Tahun {unit.tahun}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                            isAktif ? 't-status-ok' : 't-status-bad'
                          }`}
                        >
                          {unit.status}
                        </span>
                      </td>
                      <td
                        className="py-3.5 px-5 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setDetailTab('berkas');
                              onSelectUnit(unit.id);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl t-btn-secondary text-[11px] font-bold"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Detail</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(unit)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl t-btn-secondary text-[11px] font-bold"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UnitArmadaFormModal
        open={modalOpen}
        editingUnit={editingUnit}
        existingUnits={units}
        onClose={() => {
          setModalOpen(false);
          setEditingUnit(null);
        }}
        onSave={handleSave}
      />
    </section>
  );
}
