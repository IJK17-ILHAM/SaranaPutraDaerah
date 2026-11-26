import {
  ArrowRight,
  Banknote,
  FileSpreadsheet,
  Pencil,
  Plus,
  Power,
  Search,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ArmadaMenuIcon } from '../../components/armada/ArmadaMenuIcons';
import { TarifFormModal } from '../../components/armada/TarifFormModal';
import { DASAR_TARIF_OPTIONS } from '../../data/armadaSeed';
import type {
  ArmadaDasarTarif,
  ArmadaLokasi,
  ArmadaPelanggan,
  ArmadaTarif,
  ArmadaTarifInput,
  ArmadaUnit,
} from '../../types/armada';
import { formatDateShortID, formatRupiah } from '../../utils/format';

interface TarifPageProps {
  tarifList: ArmadaTarif[];
  pelangganList: ArmadaPelanggan[];
  lokasiList: ArmadaLokasi[];
  units: ArmadaUnit[];
  initialPelangganFilter?: string;
  autoOpenCreate?: boolean;
  onConsumeAutoOpen?: () => void;
  onSaveTarif: (input: ArmadaTarifInput) => ArmadaTarif;
  onToggleStatus: (tarif: ArmadaTarif) => void;
  onExportWorkbook: () => void;
}

export function TarifPage({
  tarifList,
  pelangganList,
  lokasiList,
  units,
  initialPelangganFilter = 'ALL',
  autoOpenCreate = false,
  onConsumeAutoOpen,
  onSaveTarif,
  onToggleStatus,
  onExportWorkbook,
}: TarifPageProps) {
  const [search, setSearch] = useState('');
  const [pelangganFilter, setPelangganFilter] = useState<string>(initialPelangganFilter);
  const [jenisFilter, setJenisFilter] = useState('ALL');
  const [dasarFilter, setDasarFilter] = useState<'ALL' | ArmadaDasarTarif>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTarif, setEditingTarif] = useState<ArmadaTarif | null>(null);

  useEffect(() => {
    setPelangganFilter(initialPelangganFilter || 'ALL');
  }, [initialPelangganFilter]);

  useEffect(() => {
    if (autoOpenCreate) {
      setEditingTarif(null);
      setModalOpen(true);
      onConsumeAutoOpen?.();
    }
  }, [autoOpenCreate, onConsumeAutoOpen]);

  const pelangganById = useMemo(
    () => new Map(pelangganList.map((p) => [p.id, p])),
    [pelangganList],
  );
  const lokasiById = useMemo(
    () => new Map(lokasiList.map((l) => [l.id, l])),
    [lokasiList],
  );

  const jenisOptions = useMemo(
    () => [...new Set(tarifList.map((t) => t.jenisKendaraan).filter(Boolean))].sort(),
    [tarifList],
  );

  const stats = useMemo(() => {
    const total = tarifList.length;
    const aktif = tarifList.filter((t) => t.status === 'Aktif').length;
    const pelangganBertarif = new Set(tarifList.map((t) => t.pelangganId)).size;
    return { total, aktif, pelangganBertarif };
  }, [tarifList]);

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tarifList.filter((t) => {
      if (pelangganFilter !== 'ALL' && t.pelangganId !== pelangganFilter) return false;
      if (jenisFilter !== 'ALL' && t.jenisKendaraan !== jenisFilter) return false;
      if (dasarFilter !== 'ALL' && t.dasarTarif !== dasarFilter) return false;
      if (q) {
        const plg = pelangganById.get(t.pelangganId);
        const muat = lokasiById.get(t.lokasiMuatId);
        const bongkar = lokasiById.get(t.lokasiBongkarId);
        const hit =
          t.idTarif.toLowerCase().includes(q) ||
          (plg?.namaPt || '').toLowerCase().includes(q) ||
          (muat?.namaLokasi || '').toLowerCase().includes(q) ||
          (bongkar?.namaLokasi || '').toLowerCase().includes(q) ||
          t.jenisKendaraan.toLowerCase().includes(q) ||
          t.dasarTarif.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [dasarFilter, jenisFilter, lokasiById, pelangganById, pelangganFilter, search, tarifList]);

  const openCreateModal = () => {
    setEditingTarif(null);
    setModalOpen(true);
  };

  const openEditModal = (item: ArmadaTarif) => {
    setEditingTarif(item);
    setModalOpen(true);
  };

  const handleSave = (input: ArmadaTarifInput) => {
    onSaveTarif(input);
    setModalOpen(false);
    setEditingTarif(null);
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl t-subtle border t-border flex items-center justify-center shrink-0">
            <ArmadaMenuIcon id="armada-master-tarif" size={30} />
          </div>
          <div>
            <div className="text-[11px] font-semibold t-link">Tab SPS: Tarif</div>
            <h2 className="text-base sm:text-lg font-display font-bold t-text leading-snug">
              Master Tarif Angkutan
            </h2>
            <p className="text-xs t-muted mt-0.5 max-w-2xl">
              Atur nominal tarif per pelanggan, rute muat–bongkar, jenis kendaraan, dasar perhitungan,
              dan tanggal mulai berlaku agar siap pakai saat membuat perjalanan.
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
            <span>Tambah Tarif</span>
          </button>
        </div>
      </div>

      {/* 3 Compact Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="t-card rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="t-field-label">Total Tarif Terdaftar</div>
            <div className="text-2xl font-display t-text mt-1 tabular-nums">{stats.total}</div>
          </div>
          <Banknote className="w-5 h-5 t-link shrink-0" />
        </div>

        <div className="t-card rounded-2xl p-4">
          <div className="t-field-label">Tarif Aktif</div>
          <div
            className="text-2xl font-display mt-1 tabular-nums"
            style={{ color: 'var(--status-ok-text)' }}
          >
            {stats.aktif}
          </div>
        </div>

        <div className="t-card rounded-2xl p-4">
          <div className="t-field-label">Pelanggan Memiliki Tarif</div>
          <div className="text-2xl font-display t-text mt-1 tabular-nums">
            {stats.pelangganBertarif}{' '}
            <span className="text-xs font-normal t-muted">/ {pelangganList.length} PT</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="t-card rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-4">
          <label htmlFor="trf-search" className="block t-field-label mb-1">
            Cari Rute, Pelanggan, atau Kendaraan
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 t-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="trf-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Contoh: Cikarang, Bekasi, Wingbox..."
              className="w-full text-xs pl-8 pr-3 py-2 rounded-xl t-input"
            />
          </div>
        </div>

        <div className="sm:col-span-3">
          <label htmlFor="trf-plg-filter" className="block t-field-label mb-1">
            Pelanggan
          </label>
          <select
            id="trf-plg-filter"
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
          <label htmlFor="trf-jenis-filter" className="block t-field-label mb-1">
            Jenis Kendaraan
          </label>
          <select
            id="trf-jenis-filter"
            value={jenisFilter}
            onChange={(e) => setJenisFilter(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-xl t-input font-semibold"
          >
            <option value="ALL">Semua Kendaraan</option>
            {jenisOptions.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="trf-dasar-filter" className="block t-field-label mb-1">
            Dasar Tarif
          </label>
          <select
            id="trf-dasar-filter"
            value={dasarFilter}
            onChange={(e) => setDasarFilter(e.target.value as 'ALL' | ArmadaDasarTarif)}
            className="w-full text-xs px-3 py-2 rounded-xl t-input font-semibold"
          >
            <option value="ALL">Semua Dasar</option>
            {DASAR_TARIF_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tarif Data Table */}
      <div className="t-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="t-subtle border-b t-border">
                <th className="py-3.5 px-5 t-th-label">Pelanggan</th>
                <th className="py-3.5 px-4 t-th-label">Lokasi Muat &rarr; Bongkar</th>
                <th className="py-3.5 px-4 t-th-label">Jenis Kendaraan</th>
                <th className="py-3.5 px-4 t-th-label">Dasar Tarif</th>
                <th className="py-3.5 px-4 t-th-label text-right">Nominal</th>
                <th className="py-3.5 px-4 t-th-label text-right">Mulai Berlaku</th>
                <th className="py-3.5 px-4 t-th-label">Status</th>
                <th className="py-3.5 px-5 t-th-label text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y t-border">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center t-muted">
                    {tarifList.length === 0
                      ? 'Belum ada tarif terdaftar. Klik "Tambah Tarif" untuk menetapkan tarif rute.'
                      : 'Tidak ada tarif yang cocok dengan filter pencarian.'}
                  </td>
                </tr>
              ) : (
                filteredList.map((trf) => {
                  const plg = pelangganById.get(trf.pelangganId);
                  const muat = lokasiById.get(trf.lokasiMuatId);
                  const bongkar = lokasiById.get(trf.lokasiBongkarId);
                  const isAktif = trf.status === 'Aktif';
                  return (
                    <tr key={trf.id} className="t-row-hover">
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="font-semibold t-text">{plg?.namaPt || '-'}</div>
                        <div className="text-[10px] font-mono-num t-muted">
                          {trf.idTarif} &middot; {plg?.idPelanggan || ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="inline-flex flex-wrap items-center gap-1.5 font-semibold t-text">
                          <span>{muat?.namaLokasi || '-'}</span>
                          <ArrowRight className="w-3 h-3 t-muted shrink-0" />
                          <span>{bongkar?.namaLokasi || '-'}</span>
                        </div>
                        {trf.catatan && (
                          <div className="text-[11px] t-muted mt-0.5 max-w-xs truncate">
                            {trf.catatan}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold t-text whitespace-nowrap">
                        {trf.jenisKendaraan}
                      </td>
                      <td className="py-3.5 px-4 t-muted whitespace-nowrap">{trf.dasarTarif}</td>
                      <td className="py-3.5 px-4 text-right font-mono-num tabular-nums font-bold t-text whitespace-nowrap">
                        {formatRupiah(trf.nominal)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-num tabular-nums t-muted whitespace-nowrap">
                        {formatDateShortID(trf.tanggalMulaiBerlaku)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className="font-bold text-[11px]"
                          style={{
                            color: isAktif ? 'var(--status-ok-text)' : 'var(--status-bad-text)',
                          }}
                        >
                          {trf.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(trf)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl t-btn-secondary text-[11px] font-bold"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleStatus(trf)}
                            title={isAktif ? 'Nonaktifkan tarif' : 'Aktifkan tarif'}
                            aria-label={isAktif ? 'Nonaktifkan tarif' : 'Aktifkan tarif'}
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

      <TarifFormModal
        open={modalOpen}
        editingTarif={editingTarif}
        defaultPelangganId={pelangganFilter !== 'ALL' ? pelangganFilter : undefined}
        pelangganList={pelangganList}
        lokasiList={lokasiList}
        units={units}
        existingTarif={tarifList}
        onClose={() => {
          setModalOpen(false);
          setEditingTarif(null);
        }}
        onSave={handleSave}
      />
    </section>
  );
}
