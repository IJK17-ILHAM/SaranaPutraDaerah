import {
  FileSpreadsheet,
  MapPin,
  Pencil,
  Plus,
  Power,
  Search,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ArmadaMenuIcon } from '../../components/armada/ArmadaMenuIcons';
import { LokasiFormModal } from '../../components/armada/LokasiFormModal';
import type {
  ArmadaJenisLokasi,
  ArmadaLokasi,
  ArmadaLokasiInput,
  ArmadaPelanggan,
} from '../../types/armada';

interface LokasiPageProps {
  lokasiList: ArmadaLokasi[];
  pelangganList: ArmadaPelanggan[];
  initialPelangganFilter?: string;
  autoOpenCreate?: boolean;
  onConsumeAutoOpen?: () => void;
  onSaveLokasi: (input: ArmadaLokasiInput) => ArmadaLokasi;
  onToggleStatus: (lokasi: ArmadaLokasi) => void;
  onExportWorkbook: () => void;
}

const JENIS_TABS: Array<{ id: 'ALL' | ArmadaJenisLokasi; label: string }> = [
  { id: 'ALL', label: 'Semua' },
  { id: 'Muat', label: 'Muat' },
  { id: 'Bongkar', label: 'Bongkar' },
  { id: 'Keduanya', label: 'Keduanya' },
];

export function LokasiPage({
  lokasiList,
  pelangganList,
  initialPelangganFilter = 'ALL',
  autoOpenCreate = false,
  onConsumeAutoOpen,
  onSaveLokasi,
  onToggleStatus,
  onExportWorkbook,
}: LokasiPageProps) {
  const [search, setSearch] = useState('');
  const [pelangganFilter, setPelangganFilter] = useState<string>(initialPelangganFilter);
  const [jenisFilter, setJenisFilter] = useState<'ALL' | ArmadaJenisLokasi>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLokasi, setEditingLokasi] = useState<ArmadaLokasi | null>(null);

  useEffect(() => {
    setPelangganFilter(initialPelangganFilter || 'ALL');
  }, [initialPelangganFilter]);

  useEffect(() => {
    if (autoOpenCreate) {
      setEditingLokasi(null);
      setModalOpen(true);
      onConsumeAutoOpen?.();
    }
  }, [autoOpenCreate, onConsumeAutoOpen]);

  const pelangganById = useMemo(
    () => new Map(pelangganList.map((p) => [p.id, p])),
    [pelangganList],
  );

  const stats = useMemo(() => {
    const total = lokasiList.length;
    const muat = lokasiList.filter((l) => l.jenisLokasi === 'Muat').length;
    const bongkar = lokasiList.filter((l) => l.jenisLokasi === 'Bongkar').length;
    const keduanya = lokasiList.filter((l) => l.jenisLokasi === 'Keduanya').length;
    return { total, muat, bongkar, keduanya };
  }, [lokasiList]);

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lokasiList.filter((l) => {
      if (pelangganFilter !== 'ALL' && l.pelangganId !== pelangganFilter) return false;
      if (jenisFilter !== 'ALL' && l.jenisLokasi !== jenisFilter) return false;
      if (q) {
        const plg = pelangganById.get(l.pelangganId);
        const hit =
          l.idLokasi.toLowerCase().includes(q) ||
          l.namaLokasi.toLowerCase().includes(q) ||
          l.alamatLengkap.toLowerCase().includes(q) ||
          (plg?.namaPt || '').toLowerCase().includes(q) ||
          (plg?.idPelanggan || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [jenisFilter, lokasiList, pelangganById, pelangganFilter, search]);

  const openCreateModal = () => {
    setEditingLokasi(null);
    setModalOpen(true);
  };

  const openEditModal = (item: ArmadaLokasi) => {
    setEditingLokasi(item);
    setModalOpen(true);
  };

  const handleSave = (input: ArmadaLokasiInput) => {
    onSaveLokasi(input);
    setModalOpen(false);
    setEditingLokasi(null);
  };

  const getJenisColor = (jenis: ArmadaJenisLokasi): string => {
    if (jenis === 'Muat') return 'var(--status-info-text)';
    if (jenis === 'Bongkar') return 'var(--status-ok-text)';
    return 'var(--status-warn-text)';
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl t-subtle border t-border flex items-center justify-center shrink-0">
            <ArmadaMenuIcon id="armada-master-lokasi" size={30} />
          </div>
          <div>
            <div className="text-[11px] font-semibold t-link">Tab SPS: Lokasi</div>
            <h2 className="text-base sm:text-lg font-display font-bold t-text leading-snug">
              Master Lokasi Muat–Bongkar
            </h2>
            <p className="text-xs t-muted mt-0.5 max-w-2xl">
              Satu pelanggan dapat memiliki beberapa titik muat maupun bongkar. Alamat yang dicatat
              di sini langsung dapat dipilih saat membuat perjalanan dan tarif.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onExportWorkbook}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Unduh SPS Armada</span>
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl t-btn-primary text-xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Lokasi</span>
          </button>
        </div>
      </div>

      {/* 4 Compact Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="t-card rounded-2xl p-4">
          <div className="t-field-label">Total Lokasi</div>
          <div className="text-2xl font-display t-text mt-1 tabular-nums">{stats.total}</div>
        </div>
        <div className="t-card rounded-2xl p-4">
          <div className="t-field-label">Lokasi Muat</div>
          <div
            className="text-2xl font-display mt-1 tabular-nums"
            style={{ color: 'var(--status-info-text)' }}
          >
            {stats.muat}
          </div>
        </div>
        <div className="t-card rounded-2xl p-4">
          <div className="t-field-label">Lokasi Bongkar</div>
          <div
            className="text-2xl font-display mt-1 tabular-nums"
            style={{ color: 'var(--status-ok-text)' }}
          >
            {stats.bongkar}
          </div>
        </div>
        <div className="t-card rounded-2xl p-4">
          <div className="t-field-label">Muat &amp; Bongkar (Keduanya)</div>
          <div
            className="text-2xl font-display mt-1 tabular-nums"
            style={{ color: 'var(--status-warn-text)' }}
          >
            {stats.keduanya}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="t-card rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5">
            <label htmlFor="lok-search" className="block t-field-label mb-1">
              Cari ID Lokasi, Nama Lokasi, Alamat, atau PT
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 t-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="lok-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Contoh: LOK-001, Cikarang, Bekasi..."
                className="w-full text-xs pl-8 pr-3 py-2 rounded-xl t-input"
              />
            </div>
          </div>

          <div className="sm:col-span-4">
            <label htmlFor="lok-plg-filter" className="block t-field-label mb-1">
              Filter Pelanggan
            </label>
            <select
              id="lok-plg-filter"
              value={pelangganFilter}
              onChange={(e) => setPelangganFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl t-input font-semibold"
            >
              <option value="ALL">Semua Pelanggan</option>
              {pelangganList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.idPelanggan} — {p.namaPt}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <span className="block t-field-label mb-1">Jenis Lokasi</span>
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl t-subtle border t-border">
              {JENIS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setJenisFilter(tab.id)}
                  className={`py-1.5 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap ${
                    jenisFilter === tab.id ? 't-btn-primary' : 't-muted hover:t-text'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lokasi Table */}
      <div className="t-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="t-subtle border-b t-border">
                <th className="py-3.5 px-5 t-th-label">ID Lokasi</th>
                <th className="py-3.5 px-4 t-th-label">Pelanggan</th>
                <th className="py-3.5 px-4 t-th-label">Nama Lokasi</th>
                <th className="py-3.5 px-4 t-th-label">Alamat Lengkap</th>
                <th className="py-3.5 px-4 t-th-label">Jenis Lokasi</th>
                <th className="py-3.5 px-4 t-th-label">Status</th>
                <th className="py-3.5 px-5 t-th-label text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y t-border">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center t-muted">
                    {lokasiList.length === 0
                      ? 'Belum ada lokasi terdaftar. Klik "Tambah Lokasi" untuk mencatat gudang muat atau bongkar.'
                      : 'Tidak ada lokasi yang sesuai dengan filter pencarian.'}
                  </td>
                </tr>
              ) : (
                filteredList.map((lok) => {
                  const plg = pelangganById.get(lok.pelangganId);
                  const isAktif = lok.status === 'Aktif';
                  return (
                    <tr key={lok.id} className="t-row-hover">
                      <td className="py-3.5 px-5 font-mono-num font-bold t-link whitespace-nowrap">
                        {lok.idLokasi}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold t-text">{plg?.namaPt || '-'}</div>
                        <div className="text-[10px] font-mono-num t-muted">
                          {plg?.idPelanggan || ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 font-semibold t-text">
                          <MapPin className="w-3.5 h-3.5 t-link shrink-0" />
                          <span>{lok.namaLokasi}</span>
                        </div>
                        {lok.catatan && (
                          <div className="text-[11px] t-muted mt-0.5 max-w-xs truncate">
                            {lok.catatan}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 t-muted max-w-sm leading-relaxed">
                        {lok.alamatLengkap}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className="font-bold text-[11px]"
                          style={{ color: getJenisColor(lok.jenisLokasi) }}
                        >
                          {lok.jenisLokasi}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className="font-bold text-[11px]"
                          style={{
                            color: isAktif ? 'var(--status-ok-text)' : 'var(--status-bad-text)',
                          }}
                        >
                          {lok.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(lok)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl t-btn-secondary text-[11px] font-bold"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleStatus(lok)}
                            title={isAktif ? 'Nonaktifkan lokasi' : 'Aktifkan lokasi'}
                            aria-label={isAktif ? 'Nonaktifkan lokasi' : 'Aktifkan lokasi'}
                            className="inline-flex items-center justify-center p-1.5 rounded-xl t-btn-secondary"
                          >
                            <Power className="w-3.5 h-3.5" />
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

      <LokasiFormModal
        open={modalOpen}
        editingLokasi={editingLokasi}
        defaultPelangganId={pelangganFilter !== 'ALL' ? pelangganFilter : undefined}
        pelangganList={pelangganList}
        existingLokasi={lokasiList}
        onClose={() => {
          setModalOpen(false);
          setEditingLokasi(null);
        }}
        onSave={handleSave}
      />
    </section>
  );
}
