import { AlertCircle, MapPin, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { generateNextArmadaCode } from '../../data/armadaSeed';
import type {
  ArmadaJenisLokasi,
  ArmadaLokasi,
  ArmadaLokasiInput,
  ArmadaPelanggan,
  ArmadaUnitStatus,
} from '../../types/armada';

interface LokasiFormModalProps {
  open: boolean;
  editingLokasi: ArmadaLokasi | null;
  defaultPelangganId?: string;
  pelangganList: ArmadaPelanggan[];
  existingLokasi: ArmadaLokasi[];
  onClose: () => void;
  onSave: (input: ArmadaLokasiInput) => void;
}

const JENIS_LOKASI_OPTIONS: Array<{ value: ArmadaJenisLokasi; label: string; hint: string }> = [
  { value: 'Muat', label: 'Muat', hint: 'Titik ambil / gudang asal' },
  { value: 'Bongkar', label: 'Bongkar', hint: 'Titik tujuan / penerima' },
  { value: 'Keduanya', label: 'Keduanya', hint: 'Bisa muat & bongkar' },
];

export function LokasiFormModal({
  open,
  editingLokasi,
  defaultPelangganId,
  pelangganList,
  existingLokasi,
  onClose,
  onSave,
}: LokasiFormModalProps) {
  const [form, setForm] = useState<ArmadaLokasiInput>({
    idLokasi: '',
    pelangganId: '',
    namaLokasi: '',
    alamatLengkap: '',
    jenisLokasi: 'Muat',
    status: 'Aktif',
    catatan: '',
  });
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!open) return;
    setErrorMsg('');
    if (editingLokasi) {
      setForm({
        id: editingLokasi.id,
        idLokasi: editingLokasi.idLokasi,
        pelangganId: editingLokasi.pelangganId,
        namaLokasi: editingLokasi.namaLokasi,
        alamatLengkap: editingLokasi.alamatLengkap,
        jenisLokasi: editingLokasi.jenisLokasi,
        status: editingLokasi.status || 'Aktif',
        catatan: editingLokasi.catatan || '',
      });
    } else {
      const nextCode = generateNextArmadaCode(
        'LOK',
        existingLokasi.map((l) => l.idLokasi),
      );
      const firstActivePlg =
        defaultPelangganId ||
        pelangganList.find((p) => p.status === 'Aktif')?.id ||
        pelangganList[0]?.id ||
        '';
      setForm({
        idLokasi: nextCode,
        pelangganId: firstActivePlg,
        namaLokasi: '',
        alamatLengkap: '',
        jenisLokasi: 'Muat',
        status: 'Aktif',
        catatan: '',
      });
    }
  }, [defaultPelangganId, editingLokasi, existingLokasi, open, pelangganList]);

  if (!open) return null;

  const isEditing = Boolean(editingLokasi);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanId = form.idLokasi.trim().toUpperCase();
    const cleanNama = form.namaLokasi.trim();
    const cleanAlamat = form.alamatLengkap.trim();

    if (!cleanId || !form.pelangganId || !cleanNama || !cleanAlamat) {
      setErrorMsg('ID lokasi, pelanggan, nama lokasi, dan alamat lengkap wajib diisi.');
      return;
    }

    const dupId = existingLokasi.find(
      (l) => l.id !== editingLokasi?.id && l.idLokasi.trim().toUpperCase() === cleanId,
    );
    if (dupId) {
      setErrorMsg(`ID lokasi "${cleanId}" sudah digunakan oleh ${dupId.namaLokasi}.`);
      return;
    }

    const dupSameCustomer = existingLokasi.find(
      (l) =>
        l.id !== editingLokasi?.id &&
        l.pelangganId === form.pelangganId &&
        l.namaLokasi.trim().toLowerCase() === cleanNama.toLowerCase(),
    );
    if (dupSameCustomer) {
      setErrorMsg(
        `Lokasi "${cleanNama}" sudah terdaftar untuk pelanggan tersebut (${dupSameCustomer.idLokasi}).`,
      );
      return;
    }

    onSave({
      id: editingLokasi?.id,
      idLokasi: cleanId,
      pelangganId: form.pelangganId,
      namaLokasi: cleanNama,
      alamatLengkap: cleanAlamat,
      jenisLokasi: form.jenisLokasi,
      status: form.status,
      catatan: (form.catatan || '').trim(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[92vh] flex flex-col t-card rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b t-border flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'var(--status-info-bg)',
                color: 'var(--status-info-text)',
              }}
            >
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-display t-text truncate">
                {isEditing
                  ? `Edit Lokasi — ${editingLokasi?.idLokasi}`
                  : 'Tambah Lokasi Muat–Bongkar'}
              </h3>
              <p className="text-[11px] t-muted mt-0.5">
                Tersimpan pada tab <b>Lokasi</b> di SPS Armada. Satu pelanggan bisa memiliki
                beberapa lokasi.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form lokasi"
            className="p-1.5 rounded-xl t-btn-secondary shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl t-status-bad font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {pelangganList.length === 0 && (
            <div className="p-3 rounded-xl t-status-warn font-semibold">
              Belum ada data pelanggan. Tambahkan pelanggan terlebih dahulu di menu Master Data
              &rarr; Pelanggan.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="lok-id" className="block t-field-label mb-1">
                ID Lokasi *
              </label>
              <input
                id="lok-id"
                type="text"
                required
                value={form.idLokasi}
                onChange={(e) => setForm((p) => ({ ...p, idLokasi: e.target.value }))}
                placeholder="LOK-001"
                className="w-full px-3 py-2 rounded-xl t-input uppercase font-mono-num font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="lok-pelanggan" className="block t-field-label mb-1">
                Pelanggan *
              </label>
              <select
                id="lok-pelanggan"
                required
                value={form.pelangganId}
                onChange={(e) => setForm((p) => ({ ...p, pelangganId: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl t-input font-semibold"
              >
                <option value="">-- Pilih Pelanggan --</option>
                {pelangganList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.idPelanggan} — {p.namaPt}
                    {p.status === 'Nonaktif' ? ' (Nonaktif)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="lok-nama" className="block t-field-label mb-1">
              Nama Lokasi *
            </label>
            <input
              id="lok-nama"
              type="text"
              required
              value={form.namaLokasi}
              onChange={(e) => setForm((p) => ({ ...p, namaLokasi: e.target.value }))}
              placeholder="Contoh: Gudang Muat Cikarang atau Lokasi Bongkar Bekasi"
              className="w-full px-3 py-2 rounded-xl t-input font-semibold"
            />
          </div>

          <div>
            <label htmlFor="lok-alamat" className="block t-field-label mb-1">
              Alamat Lengkap *
            </label>
            <textarea
              id="lok-alamat"
              required
              rows={3}
              value={form.alamatLengkap}
              onChange={(e) => setForm((p) => ({ ...p, alamatLengkap: e.target.value }))}
              placeholder="Nama kawasan industri, jalan, blok, kecamatan, kota/kabupaten"
              className="w-full px-3 py-2 rounded-xl t-input resize-none"
            />
          </div>

          <div>
            <span className="block t-field-label mb-1.5">Jenis Lokasi *</span>
            <div className="grid grid-cols-3 gap-2">
              {JENIS_LOKASI_OPTIONS.map((opt) => {
                const active = form.jenisLokasi === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, jenisLokasi: opt.value }))}
                    className={`p-2.5 rounded-xl text-left border transition-colors ${
                      active
                        ? 't-status-info border-current/30'
                        : 't-subtle t-border hover:t-text'
                    }`}
                  >
                    <div className="font-bold text-xs">{opt.label}</div>
                    <div className="text-[10px] opacity-80 mt-0.5 leading-snug">{opt.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="block t-field-label mb-1">Status Lokasi</span>
              <div className="grid grid-cols-2 gap-1.5">
                {(['Aktif', 'Nonaktif'] as ArmadaUnitStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, status: st }))}
                    className={`py-2 rounded-xl font-bold text-xs transition-colors ${
                      form.status === st
                        ? st === 'Aktif'
                          ? 't-status-ok'
                          : 't-status-bad'
                        : 't-btn-secondary'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="lok-catatan" className="block t-field-label mb-1">
                Catatan Lapangan (Opsional)
              </label>
              <input
                id="lok-catatan"
                type="text"
                value={form.catatan || ''}
                onChange={(e) => setForm((p) => ({ ...p, catatan: e.target.value }))}
                placeholder="Jam buka gerbang, jembatan timbang, APD..."
                className="w-full px-3 py-2 rounded-xl t-input"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t t-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl t-btn-secondary font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={pelangganList.length === 0}
              className="px-4 py-2 rounded-xl t-btn-primary disabled:opacity-50"
            >
              {isEditing ? 'Simpan Perubahan' : 'Simpan Lokasi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
