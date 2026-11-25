import { AlertCircle, Truck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { COMMON_JENIS_KENDARAAN, COMMON_MEREK_KENDARAAN } from '../../data/armadaSeed';
import type { ArmadaUnit, ArmadaUnitInput, ArmadaUnitStatus } from '../../types/armada';

interface UnitArmadaFormModalProps {
  open: boolean;
  editingUnit: ArmadaUnit | null;
  existingUnits: ArmadaUnit[];
  onClose: () => void;
  onSave: (input: ArmadaUnitInput) => void;
}

const EMPTY_FORM: ArmadaUnitInput = {
  kodeUnit: '',
  nomorPolisi: '',
  jenisKendaraan: '',
  merek: '',
  model: '',
  tahun: '',
  nomorRangka: '',
  nomorMesin: '',
  status: 'Aktif',
  catatan: '',
};

export function UnitArmadaFormModal({
  open,
  editingUnit,
  existingUnits,
  onClose,
  onSave,
}: UnitArmadaFormModalProps) {
  const [form, setForm] = useState<ArmadaUnitInput>(EMPTY_FORM);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!open) return;
    setErrorMsg('');
    if (editingUnit) {
      setForm({
        id: editingUnit.id,
        kodeUnit: editingUnit.kodeUnit,
        nomorPolisi: editingUnit.nomorPolisi,
        jenisKendaraan: editingUnit.jenisKendaraan,
        merek: editingUnit.merek || '',
        model: editingUnit.model || '',
        tahun: editingUnit.tahun || '',
        nomorRangka: editingUnit.nomorRangka || '',
        nomorMesin: editingUnit.nomorMesin || '',
        status: editingUnit.status || 'Aktif',
        catatan: editingUnit.catatan || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editingUnit, open]);

  if (!open) return null;

  const isEditing = Boolean(editingUnit);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanKode = form.kodeUnit.trim().toUpperCase();
    const cleanNopol = form.nomorPolisi.trim().toUpperCase().replace(/\s+/g, ' ');
    const cleanJenis = form.jenisKendaraan.trim();

    if (!cleanKode || !cleanNopol || !cleanJenis) {
      setErrorMsg('Kode unit, nomor polisi, dan jenis kendaraan wajib diisi.');
      return;
    }

    const dupKode = existingUnits.find(
      (u) => u.id !== editingUnit?.id && u.kodeUnit.trim().toUpperCase() === cleanKode,
    );
    if (dupKode) {
      setErrorMsg(`Kode unit "${cleanKode}" sudah digunakan oleh kendaraan ${dupKode.nomorPolisi}.`);
      return;
    }

    const normalizedNopolCompare = cleanNopol.replace(/\s+/g, '');
    const dupNopol = existingUnits.find(
      (u) =>
        u.id !== editingUnit?.id &&
        u.nomorPolisi.trim().toUpperCase().replace(/\s+/g, '') === normalizedNopolCompare,
    );
    if (dupNopol) {
      setErrorMsg(`Nomor polisi "${cleanNopol}" sudah terdaftar pada kode unit ${dupNopol.kodeUnit}.`);
      return;
    }

    const cleanTahun = form.tahun.trim();
    if (cleanTahun && !/^\d{4}$/.test(cleanTahun)) {
      setErrorMsg('Tahun kendaraan harus terdiri dari 4 digit angka (contoh: 2022).');
      return;
    }

    onSave({
      id: editingUnit?.id,
      kodeUnit: cleanKode,
      nomorPolisi: cleanNopol,
      jenisKendaraan: cleanJenis,
      merek: form.merek.trim(),
      model: form.model.trim(),
      tahun: cleanTahun,
      nomorRangka: form.nomorRangka.trim().toUpperCase(),
      nomorMesin: form.nomorMesin.trim().toUpperCase(),
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
        {/* Header */}
        <div className="px-5 py-4 border-b t-border flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'var(--status-info-bg)',
                color: 'var(--status-info-text)',
              }}
            >
              <Truck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-display t-text truncate">
                {isEditing ? `Edit Unit — ${editingUnit?.kodeUnit}` : 'Tambah Unit Armada'}
              </h3>
              <p className="text-[11px] t-muted mt-0.5">
                Wajib isi kode unit, nomor polisi, dan jenis kendaraan. Data teknis lain bisa
                dilengkapi menyusul.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form unit armada"
            className="p-1.5 rounded-xl t-btn-secondary shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl t-status-bad font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Mandatory Identity Section */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider t-link">
              Identitas Utama (Wajib)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="armada-kode-unit" className="block t-field-label mb-1">
                  Kode Unit *
                </label>
                <input
                  id="armada-kode-unit"
                  type="text"
                  required
                  value={form.kodeUnit}
                  onChange={(e) => setForm((p) => ({ ...p, kodeUnit: e.target.value }))}
                  placeholder="Contoh: SPD-B3-04"
                  className="w-full px-3 py-2 rounded-xl t-input uppercase font-mono-num font-bold"
                />
              </div>
              <div>
                <label htmlFor="armada-nopol" className="block t-field-label mb-1">
                  Nomor Polisi *
                </label>
                <input
                  id="armada-nopol"
                  type="text"
                  required
                  value={form.nomorPolisi}
                  onChange={(e) => setForm((p) => ({ ...p, nomorPolisi: e.target.value }))}
                  placeholder="Contoh: B 9123 SPD"
                  className="w-full px-3 py-2 rounded-xl t-input uppercase font-mono-num font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="armada-jenis" className="block t-field-label mb-1">
                  Jenis Kendaraan *
                </label>
                <input
                  id="armada-jenis"
                  type="text"
                  required
                  list="spd-jenis-kendaraan"
                  value={form.jenisKendaraan}
                  onChange={(e) => setForm((p) => ({ ...p, jenisKendaraan: e.target.value }))}
                  placeholder="Pilih atau ketik jenis kendaraan"
                  className="w-full px-3 py-2 rounded-xl t-input font-semibold"
                />
                <datalist id="spd-jenis-kendaraan">
                  {COMMON_JENIS_KENDARAAN.map((j) => (
                    <option key={j} value={j} />
                  ))}
                </datalist>
              </div>
              <div>
                <span className="block t-field-label mb-1">Status Unit</span>
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
            </div>
          </div>

          {/* Optional Technical Specifications */}
          <div className="p-3.5 rounded-xl t-subtle border t-border space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider t-muted">
              Spesifikasi &amp; Nomor Identitas (Opsional)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="armada-merek" className="block t-field-label mb-1">
                  Merek
                </label>
                <input
                  id="armada-merek"
                  type="text"
                  list="spd-merek-kendaraan"
                  value={form.merek}
                  onChange={(e) => setForm((p) => ({ ...p, merek: e.target.value }))}
                  placeholder="Hino / Mitsubishi"
                  className="w-full px-3 py-2 rounded-xl t-input font-semibold"
                />
                <datalist id="spd-merek-kendaraan">
                  {COMMON_MEREK_KENDARAAN.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>
              <div>
                <label htmlFor="armada-model" className="block t-field-label mb-1">
                  Model / Tipe
                </label>
                <input
                  id="armada-model"
                  type="text"
                  value={form.model}
                  onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
                  placeholder="Contoh: Dutro 130 HD"
                  className="w-full px-3 py-2 rounded-xl t-input"
                />
              </div>
              <div>
                <label htmlFor="armada-tahun" className="block t-field-label mb-1">
                  Tahun
                </label>
                <input
                  id="armada-tahun"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={form.tahun}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, tahun: e.target.value.replace(/\D/g, '').slice(0, 4) }))
                  }
                  placeholder="Contoh: 2022"
                  className="w-full px-3 py-2 rounded-xl t-input font-mono-num"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="armada-rangka" className="block t-field-label mb-1">
                  Nomor Rangka
                </label>
                <input
                  id="armada-rangka"
                  type="text"
                  value={form.nomorRangka}
                  onChange={(e) => setForm((p) => ({ ...p, nomorRangka: e.target.value }))}
                  placeholder="Nomor rangka / VIN"
                  className="w-full px-3 py-2 rounded-xl t-input uppercase font-mono-num"
                />
              </div>
              <div>
                <label htmlFor="armada-mesin" className="block t-field-label mb-1">
                  Nomor Mesin
                </label>
                <input
                  id="armada-mesin"
                  type="text"
                  value={form.nomorMesin}
                  onChange={(e) => setForm((p) => ({ ...p, nomorMesin: e.target.value }))}
                  placeholder="Nomor mesin kendaraan"
                  className="w-full px-3 py-2 rounded-xl t-input uppercase font-mono-num"
                />
              </div>
            </div>

            <div>
              <label htmlFor="armada-catatan" className="block t-field-label mb-1">
                Catatan (Opsional)
              </label>
              <input
                id="armada-catatan"
                type="text"
                value={form.catatan || ''}
                onChange={(e) => setForm((p) => ({ ...p, catatan: e.target.value }))}
                placeholder="Contoh: Box tertutup B3 / GPS aktif / spesifikasi bak"
                className="w-full px-3 py-2 rounded-xl t-input"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t t-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl t-btn-secondary font-semibold"
            >
              Batal
            </button>
            <button type="submit" className="px-4 py-2 rounded-xl t-btn-primary">
              {isEditing ? 'Simpan Perubahan' : 'Simpan Unit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
