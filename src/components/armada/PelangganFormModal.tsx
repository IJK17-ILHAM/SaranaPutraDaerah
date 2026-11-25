import { AlertCircle, Building2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { generateNextArmadaCode } from '../../data/armadaSeed';
import type {
  ArmadaPelanggan,
  ArmadaPelangganInput,
  ArmadaUnitStatus,
} from '../../types/armada';

interface PelangganFormModalProps {
  open: boolean;
  editingPelanggan: ArmadaPelanggan | null;
  existingPelanggan: ArmadaPelanggan[];
  onClose: () => void;
  onSave: (input: ArmadaPelangganInput) => void;
}

const EMPTY_FORM: ArmadaPelangganInput = {
  idPelanggan: '',
  namaPt: '',
  pic: '',
  kontak: '',
  status: 'Aktif',
  catatan: '',
};

export function PelangganFormModal({
  open,
  editingPelanggan,
  existingPelanggan,
  onClose,
  onSave,
}: PelangganFormModalProps) {
  const [form, setForm] = useState<ArmadaPelangganInput>(EMPTY_FORM);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!open) return;
    setErrorMsg('');
    if (editingPelanggan) {
      setForm({
        id: editingPelanggan.id,
        idPelanggan: editingPelanggan.idPelanggan,
        namaPt: editingPelanggan.namaPt,
        pic: editingPelanggan.pic,
        kontak: editingPelanggan.kontak,
        status: editingPelanggan.status || 'Aktif',
        catatan: editingPelanggan.catatan || '',
      });
    } else {
      const nextCode = generateNextArmadaCode(
        'PLG',
        existingPelanggan.map((p) => p.idPelanggan),
      );
      setForm({
        ...EMPTY_FORM,
        idPelanggan: nextCode,
      });
    }
  }, [editingPelanggan, existingPelanggan, open]);

  if (!open) return null;

  const isEditing = Boolean(editingPelanggan);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanId = form.idPelanggan.trim().toUpperCase();
    const cleanNama = form.namaPt.trim();
    const cleanPic = form.pic.trim();
    const cleanKontak = form.kontak.trim();

    if (!cleanId || !cleanNama || !cleanPic || !cleanKontak) {
      setErrorMsg('ID pelanggan, nama PT, PIC, dan kontak wajib diisi.');
      return;
    }

    const dupId = existingPelanggan.find(
      (p) =>
        p.id !== editingPelanggan?.id &&
        p.idPelanggan.trim().toUpperCase() === cleanId,
    );
    if (dupId) {
      setErrorMsg(`ID pelanggan "${cleanId}" sudah dipakai oleh ${dupId.namaPt}.`);
      return;
    }

    const dupNama = existingPelanggan.find(
      (p) =>
        p.id !== editingPelanggan?.id &&
        p.namaPt.trim().toLowerCase() === cleanNama.toLowerCase(),
    );
    if (dupNama) {
      setErrorMsg(`Nama perusahaan "${cleanNama}" sudah terdaftar (${dupNama.idPelanggan}).`);
      return;
    }

    onSave({
      id: editingPelanggan?.id,
      idPelanggan: cleanId,
      namaPt: cleanNama,
      pic: cleanPic,
      kontak: cleanKontak,
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
        className="w-full max-w-lg max-h-[92vh] flex flex-col t-card rounded-2xl shadow-2xl overflow-hidden"
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
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-display t-text truncate">
                {isEditing
                  ? `Edit Pelanggan — ${editingPelanggan?.idPelanggan}`
                  : 'Tambah Pelanggan'}
              </h3>
              <p className="text-[11px] t-muted mt-0.5">
                Tersimpan pada tab <b>Pelanggan</b> di SPS Armada.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form pelanggan"
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="plg-id" className="block t-field-label mb-1">
                ID Pelanggan *
              </label>
              <input
                id="plg-id"
                type="text"
                required
                value={form.idPelanggan}
                onChange={(e) => setForm((p) => ({ ...p, idPelanggan: e.target.value }))}
                placeholder="PLG-001"
                className="w-full px-3 py-2 rounded-xl t-input uppercase font-mono-num font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="plg-nama" className="block t-field-label mb-1">
                Nama PT / Perusahaan *
              </label>
              <input
                id="plg-nama"
                type="text"
                required
                value={form.namaPt}
                onChange={(e) => setForm((p) => ({ ...p, namaPt: e.target.value }))}
                placeholder="Contoh: PT Demo Logistik"
                className="w-full px-3 py-2 rounded-xl t-input font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="plg-pic" className="block t-field-label mb-1">
                PIC (Penanggung Jawab) *
              </label>
              <input
                id="plg-pic"
                type="text"
                required
                value={form.pic}
                onChange={(e) => setForm((p) => ({ ...p, pic: e.target.value }))}
                placeholder="Contoh: Budi Santoso"
                className="w-full px-3 py-2 rounded-xl t-input"
              />
            </div>

            <div>
              <label htmlFor="plg-kontak" className="block t-field-label mb-1">
                Kontak (HP / WA / Telp) *
              </label>
              <input
                id="plg-kontak"
                type="text"
                required
                value={form.kontak}
                onChange={(e) => setForm((p) => ({ ...p, kontak: e.target.value }))}
                placeholder="Contoh: 0812-8841-2201"
                className="w-full px-3 py-2 rounded-xl t-input font-mono-num"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="block t-field-label mb-1">Status Pelanggan</span>
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
              <label htmlFor="plg-catatan" className="block t-field-label mb-1">
                Catatan (Opsional)
              </label>
              <input
                id="plg-catatan"
                type="text"
                value={form.catatan || ''}
                onChange={(e) => setForm((p) => ({ ...p, catatan: e.target.value }))}
                placeholder="Jadwal muat, syarat dokumen, dll."
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
            <button type="submit" className="px-4 py-2 rounded-xl t-btn-primary">
              {isEditing ? 'Simpan Perubahan' : 'Simpan Pelanggan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
