import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Building2,
  Download,
  Eye,
  FileSpreadsheet,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Power,
  Search,
  Upload,
  User,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ArmadaMenuIcon } from '../../components/armada/ArmadaMenuIcons';
import { MasterDataImportModal } from '../../components/armada/MasterDataImportModal';
import { PelangganFormModal } from '../../components/armada/PelangganFormModal';
import type {
  ArmadaLokasi,
  ArmadaPelanggan,
  ArmadaPelangganInput,
  ArmadaTarif,
  ArmadaUnitStatus,
} from '../../types/armada';
import {
  downloadMasterDataTemplate,
  type MasterDataTabKey,
  type SpsArmadaImportResult,
} from '../../utils/armadaSpreadsheet';
import { formatDateShortID, formatRupiah } from '../../utils/format';

interface PelangganPageProps {
  pelangganList: ArmadaPelanggan[];
  lokasiList: ArmadaLokasi[];
  tarifList: ArmadaTarif[];
  onSavePelanggan: (input: ArmadaPelangganInput) => ArmadaPelanggan;
  onToggleStatus: (pelanggan: ArmadaPelanggan) => void;
  onOpenLokasiForPelanggan: (pelangganId: string, openCreate?: boolean) => void;
  onOpenTarifForPelanggan: (pelangganId: string, openCreate?: boolean) => void;
  onExportWorkbook: () => void;
  onImportMasterData: (
    file: File,
    preferredTab: MasterDataTabKey | 'all',
  ) => Promise<SpsArmadaImportResult | null>;
}

export function PelangganPage({
  pelangganList,
  lokasiList,
  tarifList,
  onSavePelanggan,
  onToggleStatus,
  onOpenLokasiForPelanggan,
  onOpenTarifForPelanggan,
  onExportWorkbook,
  onImportMasterData,
}: PelangganPageProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ArmadaUnitStatus>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingPelanggan, setEditingPelanggan] = useState<ArmadaPelanggan | null>(null);

  const selectedPelanggan = useMemo(
    () => (selectedId ? pelangganList.find((p) => p.id === selectedId) || null : null),
    [pelangganList, selectedId],
  );

  const lokasiCountByPlg = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of lokasiList) {
      map.set(l.pelangganId, (map.get(l.pelangganId) || 0) + 1);
    }
    return map;
  }, [lokasiList]);

  const tarifCountByPlg = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tarifList) {
      map.set(t.pelangganId, (map.get(t.pelangganId) || 0) + 1);
    }
    return map;
  }, [tarifList]);

  const lokasiById = useMemo(
    () => new Map(lokasiList.map((l) => [l.id, l])),
    [lokasiList],
  );

  const stats = useMemo(() => {
    const total = pelangganList.length;
    const aktif = pelangganList.filter((p) => p.status === 'Aktif').length;
    const totalLokasi = lokasiList.length;
    const totalTarifAktif = tarifList.filter((t) => t.status === 'Aktif').length;
    return { total, aktif, totalLokasi, totalTarifAktif };
  }, [lokasiList.length, pelangganList, tarifList]);

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pelangganList.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (q) {
        const hit =
          p.idPelanggan.toLowerCase().includes(q) ||
          p.namaPt.toLowerCase().includes(q) ||
          p.pic.toLowerCase().includes(q) ||
          p.kontak.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [pelangganList, search, statusFilter]);

  const openCreateModal = () => {
    setEditingPelanggan(null);
    setModalOpen(true);
  };

  const openEditModal = (item: ArmadaPelanggan) => {
    setEditingPelanggan(item);
    setModalOpen(true);
  };

  const handleSave = (input: ArmadaPelangganInput) => {
    const saved = onSavePelanggan(input);
    setModalOpen(false);
    setEditingPelanggan(null);
    if (selectedId) {
      setSelectedId(saved.id);
    }
  };

  // DETAIL PELANGGAN VIEW
  if (selectedPelanggan) {
    const isAktif = selectedPelanggan.status === 'Aktif';
    const customerLocations = lokasiList.filter((l) => l.pelangganId === selectedPelanggan.id);
    const customerRates = tarifList.filter((t) => t.pelangganId === selectedPelanggan.id);

    return (
      <section className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs t-muted">
              <span>Master Data</span>
              <span aria-hidden="true">/</span>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="t-link hover:underline font-medium"
              >
                Pelanggan
              </button>
              <span aria-hidden="true">/</span>
              <span className="t-text font-mono-num font-semibold">
                {selectedPelanggan.idPelanggan}
              </span>
            </div>
            <div className="flex items-start gap-3 pt-0.5">
              <div className="w-11 h-11 rounded-xl t-subtle border t-border flex items-center justify-center shrink-0">
                <ArmadaMenuIcon id="armada-master-pelanggan" size={30} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-display font-bold t-text leading-snug">
                  {selectedPelanggan.namaPt}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs t-muted mt-0.5">
                  <span className="font-mono-num font-semibold t-text">
                    {selectedPelanggan.idPelanggan}
                  </span>
                  <span aria-hidden="true">&middot;</span>
                  <span>PIC: {selectedPelanggan.pic}</span>
                  <span aria-hidden="true">&middot;</span>
                  <span className="font-mono-num">{selectedPelanggan.kontak}</span>
                  <span aria-hidden="true">&middot;</span>
                  <span
                    className="font-bold"
                    style={{
                      color: isAktif ? 'var(--status-ok-text)' : 'var(--status-bad-text)',
                    }}
                  >
                    {selectedPelanggan.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Daftar Pelanggan</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleStatus(selectedPelanggan)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
            >
              <Power className="w-3.5 h-3.5" />
              <span>{isAktif ? 'Nonaktifkan' : 'Aktifkan'}</span>
            </button>
            <button
              type="button"
              onClick={() => openEditModal(selectedPelanggan)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl t-btn-primary text-xs whitespace-nowrap"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Identitas Pelanggan */}
        <div className="t-card rounded-2xl p-5">
          <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b t-border">
            <h3 className="t-section-label">Identitas Pelanggan</h3>
            <span className="text-[11px] t-muted font-mono-num">
              Tab SPS: Pelanggan &middot; Diperbarui {formatDateShortID(selectedPelanggan.updatedAt)}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-xs">
            <div>
              <div className="t-field-label">ID Pelanggan</div>
              <div className="font-mono-num font-bold t-text text-sm mt-1">
                {selectedPelanggan.idPelanggan}
              </div>
            </div>
            <div>
              <div className="t-field-label">Nama PT</div>
              <div className="font-semibold t-text text-sm mt-1">{selectedPelanggan.namaPt}</div>
            </div>
            <div>
              <div className="t-field-label">PIC</div>
              <div className="font-semibold t-text text-sm mt-1">{selectedPelanggan.pic}</div>
            </div>
            <div>
              <div className="t-field-label">Kontak</div>
              <div className="font-mono-num font-semibold t-text text-sm mt-1">
                {selectedPelanggan.kontak}
              </div>
            </div>
            {selectedPelanggan.catatan && (
              <div className="sm:col-span-2 lg:col-span-4 pt-3 border-t t-border">
                <div className="t-field-label">Catatan</div>
                <div className="t-text mt-1">{selectedPelanggan.catatan}</div>
              </div>
            )}
          </div>
        </div>

        {/* Linked Lokasi Muat-Bongkar */}
        <div className="t-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b t-border flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="t-section-label">
                Lokasi Muat–Bongkar ({customerLocations.length})
              </h3>
              <p className="text-[11px] t-muted mt-0.5">
                Semua titik muat dan bongkar terdaftar milik {selectedPelanggan.namaPt}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenLokasiForPelanggan(selectedPelanggan.id, false)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
              >
                <span>Lihat di Menu Lokasi</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onOpenLokasiForPelanggan(selectedPelanggan.id, true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl t-btn-primary text-xs whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Lokasi</span>
              </button>
            </div>
          </div>

          {customerLocations.length === 0 ? (
            <div className="p-6 text-center text-xs t-muted space-y-2">
              <p>Belum ada lokasi muat atau bongkar untuk pelanggan ini.</p>
              <button
                type="button"
                onClick={() => onOpenLokasiForPelanggan(selectedPelanggan.id, true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-primary text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Lokasi Pertama</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="t-subtle border-b t-border">
                    <th className="py-3 px-5 t-th-label">ID Lokasi</th>
                    <th className="py-3 px-4 t-th-label">Nama Lokasi</th>
                    <th className="py-3 px-4 t-th-label">Alamat Lengkap</th>
                    <th className="py-3 px-5 t-th-label text-right">Jenis Lokasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y t-border">
                  {customerLocations.map((lok) => (
                    <tr key={lok.id} className="t-row-hover">
                      <td className="py-3 px-5 font-mono-num font-bold t-link whitespace-nowrap">
                        {lok.idLokasi}
                      </td>
                      <td className="py-3 px-4 font-semibold t-text whitespace-nowrap">
                        {lok.namaLokasi}
                      </td>
                      <td className="py-3 px-4 t-muted">{lok.alamatLengkap}</td>
                      <td className="py-3 px-5 text-right font-semibold t-text whitespace-nowrap">
                        {lok.jenisLokasi}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Linked Tarif */}
        <div className="t-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b t-border flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="t-section-label">Daftar Tarif ({customerRates.length})</h3>
              <p className="text-[11px] t-muted mt-0.5">
                Tarif rute yang siap dipilih saat admin membuat perjalanan untuk{' '}
                {selectedPelanggan.namaPt}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenTarifForPelanggan(selectedPelanggan.id, false)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
              >
                <span>Lihat di Menu Tarif</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onOpenTarifForPelanggan(selectedPelanggan.id, true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl t-btn-primary text-xs whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Tarif</span>
              </button>
            </div>
          </div>

          {customerRates.length === 0 ? (
            <div className="p-6 text-center text-xs t-muted space-y-2">
              <p>Belum ada tarif yang dicatat untuk pelanggan ini.</p>
              <button
                type="button"
                onClick={() => onOpenTarifForPelanggan(selectedPelanggan.id, true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-primary text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Tarif Pertama</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="t-subtle border-b t-border">
                    <th className="py-3 px-5 t-th-label">Rute (Muat &rarr; Bongkar)</th>
                    <th className="py-3 px-4 t-th-label">Jenis Kendaraan</th>
                    <th className="py-3 px-4 t-th-label">Dasar Tarif</th>
                    <th className="py-3 px-4 t-th-label text-right">Nominal</th>
                    <th className="py-3 px-5 t-th-label text-right">Mulai Berlaku</th>
                  </tr>
                </thead>
                <tbody className="divide-y t-border">
                  {customerRates.map((trf) => {
                    const muat = lokasiById.get(trf.lokasiMuatId);
                    const bongkar = lokasiById.get(trf.lokasiBongkarId);
                    return (
                      <tr key={trf.id} className="t-row-hover">
                        <td className="py-3 px-5 font-semibold t-text">
                          {muat?.namaLokasi || '-'} &rarr; {bongkar?.namaLokasi || '-'}
                        </td>
                        <td className="py-3 px-4 t-text whitespace-nowrap">
                          {trf.jenisKendaraan}
                        </td>
                        <td className="py-3 px-4 t-muted whitespace-nowrap">{trf.dasarTarif}</td>
                        <td className="py-3 px-4 text-right font-mono-num tabular-nums font-bold t-text whitespace-nowrap">
                          {formatRupiah(trf.nominal)}
                        </td>
                        <td className="py-3 px-5 text-right font-mono-num t-muted whitespace-nowrap">
                          {formatDateShortID(trf.tanggalMulaiBerlaku)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <PelangganFormModal
          open={modalOpen}
          editingPelanggan={editingPelanggan}
          existingPelanggan={pelangganList}
          onClose={() => {
            setModalOpen(false);
            setEditingPelanggan(null);
          }}
          onSave={handleSave}
        />
      </section>
    );
  }

  // DAFTAR PELANGGAN VIEW
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => downloadMasterDataTemplate('pelanggan')}
          className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
        >
          <Download className="w-4 h-4" />
          <span>Template</span>
        </button>
        <button
          type="button"
          onClick={() => setImportModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
        >
          <Upload className="w-4 h-4" />
          <span>Impor Excel</span>
        </button>
        <button
          type="button"
          onClick={onExportWorkbook}
          className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Ekspor SPS</span>
        </button>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl t-btn-primary text-xs whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pelanggan</span>
        </button>
      </div>

      {/* 3 Compact Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="t-card rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="t-field-label">Total Pelanggan</div>
            <div className="text-2xl font-display t-text mt-1 tabular-nums">{stats.total}</div>
            <div className="text-[11px] t-muted mt-0.5 tabular-nums">
              {stats.aktif} Aktif &middot; {stats.total - stats.aktif} Nonaktif
            </div>
          </div>
          <Building2 className="w-5 h-5 t-link shrink-0" />
        </div>

        <div className="t-card rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="t-field-label">Lokasi Muat–Bongkar</div>
            <div className="text-2xl font-display t-text mt-1 tabular-nums">
              {stats.totalLokasi}
            </div>
            <div className="text-[11px] t-muted mt-0.5">Terhubung ke pelanggan</div>
          </div>
          <MapPin className="w-5 h-5 t-link shrink-0" />
        </div>

        <div className="t-card rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="t-field-label">Tarif Aktif</div>
            <div className="text-2xl font-display t-text mt-1 tabular-nums">
              {stats.totalTarifAktif}
            </div>
            <div className="text-[11px] t-muted mt-0.5">Siap dipilih di perjalanan</div>
          </div>
          <Banknote className="w-5 h-5 t-link shrink-0" />
        </div>
      </div>

      {/* Search & Status Filter */}
      <div className="t-card rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8">
          <label htmlFor="plg-search" className="block t-field-label mb-1">
            Cari ID Pelanggan, Nama PT, PIC, atau Kontak
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 t-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="plg-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Contoh: PLG-001, PT Demo Logistik, Budi..."
              className="w-full text-xs pl-8 pr-3 py-2 rounded-xl t-input"
            />
          </div>
        </div>

        <div className="sm:col-span-4">
          <label htmlFor="plg-status-filter" className="block t-field-label mb-1">
            Status
          </label>
          <select
            id="plg-status-filter"
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

      {/* Pelanggan Data Table */}
      <div className="t-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="t-subtle border-b t-border">
                <th className="py-3.5 px-5 t-th-label">ID Pelanggan</th>
                <th className="py-3.5 px-4 t-th-label">Nama PT</th>
                <th className="py-3.5 px-4 t-th-label">PIC</th>
                <th className="py-3.5 px-4 t-th-label">Kontak</th>
                <th className="py-3.5 px-4 t-th-label text-right">Lokasi &amp; Tarif</th>
                <th className="py-3.5 px-4 t-th-label">Status</th>
                <th className="py-3.5 px-5 t-th-label text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y t-border">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center t-muted">
                    {pelangganList.length === 0
                      ? 'Belum ada data pelanggan. Klik "Tambah Pelanggan" untuk memulai.'
                      : 'Tidak ada pelanggan yang cocok dengan kata kunci pencarian.'}
                  </td>
                </tr>
              ) : (
                filteredList.map((plg) => {
                  const locCount = lokasiCountByPlg.get(plg.id) || 0;
                  const rateCount = tarifCountByPlg.get(plg.id) || 0;
                  const isAktif = plg.status === 'Aktif';
                  return (
                    <tr
                      key={plg.id}
                      onClick={() => setSelectedId(plg.id)}
                      className="t-row-hover cursor-pointer"
                    >
                      <td className="py-3.5 px-5 font-mono-num font-bold t-link whitespace-nowrap">
                        {plg.idPelanggan}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold t-text">{plg.namaPt}</div>
                        {plg.catatan && (
                          <div className="text-[11px] t-muted truncate max-w-xs">{plg.catatan}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 t-text font-medium">
                          <User className="w-3.5 h-3.5 t-muted shrink-0" />
                          <span>{plg.pic}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono-num t-text whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="w-3 h-3 t-muted shrink-0" />
                          <span>{plg.kontak}</span>
                        </span>
                      </td>
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap tabular-nums"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-2 text-[11px]">
                          <button
                            type="button"
                            onClick={() => onOpenLokasiForPelanggan(plg.id, false)}
                            className="t-link hover:underline font-semibold"
                          >
                            {locCount} Lokasi
                          </button>
                          <span className="t-muted" aria-hidden="true">
                            &middot;
                          </span>
                          <button
                            type="button"
                            onClick={() => onOpenTarifForPelanggan(plg.id, false)}
                            className="t-link hover:underline font-semibold"
                          >
                            {rateCount} Tarif
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className="font-bold text-[11px]"
                          style={{
                            color: isAktif ? 'var(--status-ok-text)' : 'var(--status-bad-text)',
                          }}
                        >
                          {plg.status}
                        </span>
                      </td>
                      <td
                        className="py-3.5 px-5 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedId(plg.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl t-btn-secondary text-[11px] font-bold"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Detail</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(plg)}
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

      <PelangganFormModal
        open={modalOpen}
        editingPelanggan={editingPelanggan}
        existingPelanggan={pelangganList}
        onClose={() => {
          setModalOpen(false);
          setEditingPelanggan(null);
        }}
        onSave={handleSave}
      />

      <MasterDataImportModal
        open={importModalOpen}
        tabKey="pelanggan"
        onClose={() => setImportModalOpen(false)}
        onImportFile={onImportMasterData}
      />
    </section>
  );
}
