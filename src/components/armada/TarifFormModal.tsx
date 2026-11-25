import { AlertCircle, Banknote, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  COMMON_JENIS_KENDARAAN,
  DASAR_TARIF_OPTIONS,
  generateNextArmadaCode,
} from '../../data/armadaSeed';
import type {
  ArmadaDasarTarif,
  ArmadaLokasi,
  ArmadaPelanggan,
  ArmadaTarif,
  ArmadaTarifInput,
  ArmadaUnit,
  ArmadaUnitStatus,
} from '../../types/armada';
import { cleanRupiahToNumber, formatCurrencyInput, getTodayISO } from '../../utils/format';

interface TarifFormModalProps {
  open: boolean;
  editingTarif: ArmadaTarif | null;
  defaultPelangganId?: string;
  pelangganList: ArmadaPelanggan[];
  lokasiList: ArmadaLokasi[];
  units: ArmadaUnit[];
  existingTarif: ArmadaTarif[];
  onClose: () => void;
  onSave: (input: ArmadaTarifInput) => void;
}

export function TarifFormModal({
  open,
  editingTarif,
  defaultPelangganId,
  pelangganList,
  lokasiList,
  units,
  existingTarif,
  onClose,
  onSave,
}: TarifFormModalProps) {
  const [idTarif, setIdTarif] = useState('');
  const [pelangganId, setPelangganId] = useState('');
  const [lokasiMuatId, setLokasiMuatId] = useState('');
  const [lokasiBongkarId, setLokasiBongkarId] = useState('');
  const [allowCrossCustomerLoc, setAllowCrossCustomerLoc] = useState(false);
  const [jenisKendaraan, setJenisKendaraan] = useState('');
  const [dasarTarif, setDasarTarif] = useState<ArmadaDasarTarif>('Per Rit / Trip');
  const [nominalText, setNominalText] = useState('');
  const [tanggalMulaiBerlaku, setTanggalMulaiBerlaku] = useState(getTodayISO());
  const [status, setStatus] = useState<ArmadaUnitStatus>('Aktif');
  const [catatan, setCatatan] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const jenisOptions = useMemo(() => {
    const merged = new Set<string>([
      ...COMMON_JENIS_KENDARAAN,
      ...units.map((u) => u.jenisKendaraan).filter(Boolean),
    ]);
    return Array.from(merged).sort();
  }, [units]);

  const pelangganById = useMemo(
    () => new Map(pelangganList.map((p) => [p.id, p])),
    [pelangganList],
  );

  useEffect(() => {
    if (!open) return;
    setErrorMsg('');
    if (editingTarif) {
      setIdTarif(editingTarif.idTarif);
      setPelangganId(editingTarif.pelangganId);
      setLokasiMuatId(editingTarif.lokasiMuatId);
      setLokasiBongkarId(editingTarif.lokasiBongkarId);
      const muatLoc = lokasiList.find((l) => l.id === editingTarif.lokasiMuatId);
      const bongkarLoc = lokasiList.find((l) => l.id === editingTarif.lokasiBongkarId);
      setAllowCrossCustomerLoc(
        Boolean(
          (muatLoc && muatLoc.pelangganId !== editingTarif.pelangganId) ||
            (bongkarLoc && bongkarLoc.pelangganId !== editingTarif.pelangganId),
        ),
      );
      setJenisKendaraan(editingTarif.jenisKendaraan);
      setDasarTarif(editingTarif.dasarTarif);
      setNominalText(formatCurrencyInput(String(Math.round(editingTarif.nominal || 0))));
      setTanggalMulaiBerlaku(editingTarif.tanggalMulaiBerlaku || getTodayISO());
      setStatus(editingTarif.status || 'Aktif');
      setCatatan(editingTarif.catatan || '');
    } else {
      const nextCode = generateNextArmadaCode(
        'TRF',
        existingTarif.map((t) => t.idTarif),
      );
      const initialPlg =
        defaultPelangganId ||
        pelangganList.find((p) => p.status === 'Aktif')?.id ||
        pelangganList[0]?.id ||
        '';
      const initialMuat =
        lokasiList.find(
          (l) =>
            l.pelangganId === initialPlg &&
            (l.jenisLokasi === 'Muat' || l.jenisLokasi === 'Keduanya'),
        )?.id || '';
      const initialBongkar =
        lokasiList.find(
          (l) =>
            l.pelangganId === initialPlg &&
            l.id !== initialMuat &&
            (l.jenisLokasi === 'Bongkar' || l.jenisLokasi === 'Keduanya'),
        )?.id || '';

      setIdTarif(nextCode);
      setPelangganId(initialPlg);
      setLokasiMuatId(initialMuat);
      setLokasiBongkarId(initialBongkar);
      setAllowCrossCustomerLoc(false);
      setJenisKendaraan(jenisOptions[0] || 'Wingbox');
      setDasarTarif('Per Rit / Trip');
      setNominalText('');
      setTanggalMulaiBerlaku(getTodayISO());
      setStatus('Aktif');
      setCatatan('');
    }
  }, [defaultPelangganId, editingTarif, existingTarif, jenisOptions, lokasiList, open, pelangganList]);

  const muatOptions = useMemo(() => {
    return lokasiList.filter((l) => {
      const roleMatch = l.jenisLokasi === 'Muat' || l.jenisLokasi === 'Keduanya';
      if (!roleMatch) return false;
      if (allowCrossCustomerLoc) return true;
      return !pelangganId || l.pelangganId === pelangganId;
    });
  }, [allowCrossCustomerLoc, lokasiList, pelangganId]);

  const bongkarOptions = useMemo(() => {
    return lokasiList.filter((l) => {
      const roleMatch = l.jenisLokasi === 'Bongkar' || l.jenisLokasi === 'Keduanya';
      if (!roleMatch) return false;
      if (allowCrossCustomerLoc) return true;
      return !pelangganId || l.pelangganId === pelangganId;
    });
  }, [allowCrossCustomerLoc, lokasiList, pelangganId]);

  if (!open) return null;

  const isEditing = Boolean(editingTarif);

  const handlePelangganChange = (nextPlgId: string) => {
    setPelangganId(nextPlgId);
    if (!allowCrossCustomerLoc) {
      const nextMuat =
        lokasiList.find(
          (l) =>
            l.pelangganId === nextPlgId &&
            (l.jenisLokasi === 'Muat' || l.jenisLokasi === 'Keduanya'),
        )?.id || '';
      const nextBongkar =
        lokasiList.find(
          (l) =>
            l.pelangganId === nextPlgId &&
            l.id !== nextMuat &&
            (l.jenisLokasi === 'Bongkar' || l.jenisLokasi === 'Keduanya'),
        )?.id || '';
      setLokasiMuatId(nextMuat);
      setLokasiBongkarId(nextBongkar);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanId = idTarif.trim().toUpperCase();
    const cleanJenis = jenisKendaraan.trim();
    const nominal = cleanRupiahToNumber(nominalText);

    if (!pelangganId || !lokasiMuatId || !lokasiBongkarId || !cleanJenis || !tanggalMulaiBerlaku) {
      setErrorMsg(
        'Pelanggan, lokasi muat, lokasi bongkar, jenis kendaraan, dan tanggal mulai berlaku wajib diisi.',
      );
      return;
    }

    if (lokasiMuatId === lokasiBongkarId) {
      setErrorMsg('Lokasi muat dan lokasi bongkar tidak boleh sama.');
      return;
    }

    if (nominal <= 0) {
      setErrorMsg('Nominal tarif harus lebih besar dari Rp 0.');
      return;
    }

    if (cleanId) {
      const dupId = existingTarif.find(
        (t) => t.id !== editingTarif?.id && t.idTarif.trim().toUpperCase() === cleanId,
      );
      if (dupId) {
        setErrorMsg(`ID tarif "${cleanId}" sudah digunakan.`);
        return;
      }
    }

    onSave({
      id: editingTarif?.id,
      idTarif: cleanId || undefined,
      pelangganId,
      lokasiMuatId,
      lokasiBongkarId,
      jenisKendaraan: cleanJenis,
      dasarTarif,
      nominal,
      tanggalMulaiBerlaku,
      status,
      catatan: catatan.trim(),
    });
  };

  const formatLocLabel = (l: ArmadaLokasi) => {
    const owner = pelangganById.get(l.pelangganId);
    if (allowCrossCustomerLoc && owner && l.pelangganId !== pelangganId) {
      return `${l.idLokasi} — ${l.namaLokasi} (${owner.namaPt})`;
    }
    return `${l.idLokasi} — ${l.namaLokasi} [${l.jenisLokasi}]`;
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
              <Banknote className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-display t-text truncate">
                {isEditing ? `Edit Tarif — ${editingTarif?.idTarif}` : 'Tambah Master Tarif'}
              </h3>
              <p className="text-[11px] t-muted mt-0.5">
                Tersimpan pada tab <b>Tarif</b> di SPS Armada untuk dipilih otomatis saat buat
                perjalanan.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form tarif"
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
              <label htmlFor="trf-id" className="block t-field-label mb-1">
                ID Tarif
              </label>
              <input
                id="trf-id"
                type="text"
                value={idTarif}
                onChange={(e) => setIdTarif(e.target.value)}
                placeholder="TRF-001"
                className="w-full px-3 py-2 rounded-xl t-input uppercase font-mono-num font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="trf-pelanggan" className="block t-field-label mb-1">
                Pelanggan *
              </label>
              <select
                id="trf-pelanggan"
                required
                value={pelangganId}
                onChange={(e) => handlePelangganChange(e.target.value)}
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
          </div>

          <div className="p-3.5 rounded-xl t-subtle border t-border space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="t-field-label">Rute Muat &amp; Bongkar</span>
              <label className="inline-flex items-center gap-1.5 text-[11px] t-muted cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allowCrossCustomerLoc}
                  onChange={(e) => setAllowCrossCustomerLoc(e.target.checked)}
                  className="rounded"
                />
                <span>Tampilkan lokasi semua pelanggan</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="trf-muat" className="block t-field-label mb-1">
                  Lokasi Muat *
                </label>
                <select
                  id="trf-muat"
                  required
                  value={lokasiMuatId}
                  onChange={(e) => setLokasiMuatId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl t-input font-semibold"
                >
                  <option value="">-- Pilih Lokasi Muat --</option>
                  {muatOptions.map((l) => (
                    <option key={l.id} value={l.id}>
                      {formatLocLabel(l)}
                    </option>
                  ))}
                </select>
                {pelangganId && muatOptions.length === 0 && (
                  <p className="text-[10px] mt-1 font-semibold" style={{ color: 'var(--status-warn-text)' }}>
                    Pelanggan ini belum punya lokasi Muat/Keduanya. Tambahkan di menu Lokasi.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="trf-bongkar" className="block t-field-label mb-1">
                  Lokasi Bongkar *
                </label>
                <select
                  id="trf-bongkar"
                  required
                  value={lokasiBongkarId}
                  onChange={(e) => setLokasiBongkarId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl t-input font-semibold"
                >
                  <option value="">-- Pilih Lokasi Bongkar --</option>
                  {bongkarOptions.map((l) => (
                    <option key={l.id} value={l.id}>
                      {formatLocLabel(l)}
                    </option>
                  ))}
                </select>
                {pelangganId && bongkarOptions.length === 0 && (
                  <p className="text-[10px] mt-1 font-semibold" style={{ color: 'var(--status-warn-text)' }}>
                    Pelanggan ini belum punya lokasi Bongkar/Keduanya. Tambahkan di menu Lokasi.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="trf-jenis" className="block t-field-label mb-1">
                Jenis Kendaraan *
              </label>
              <input
                id="trf-jenis"
                type="text"
                required
                list="spd-tarif-jenis-kendaraan"
                value={jenisKendaraan}
                onChange={(e) => setJenisKendaraan(e.target.value)}
                placeholder="Wingbox / Truk B3 / Dump Truck"
                className="w-full px-3 py-2 rounded-xl t-input font-semibold"
              />
              <datalist id="spd-tarif-jenis-kendaraan">
                {jenisOptions.map((j) => (
                  <option key={j} value={j} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="trf-dasar" className="block t-field-label mb-1">
                Dasar Tarif *
              </label>
              <select
                id="trf-dasar"
                required
                value={dasarTarif}
                onChange={(e) => setDasarTarif(e.target.value as ArmadaDasarTarif)}
                className="w-full px-3 py-2 rounded-xl t-input font-semibold"
              >
                {DASAR_TARIF_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="trf-nominal" className="block t-field-label mb-1">
                Nominal (Rp) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold t-muted pointer-events-none">
                  Rp
                </span>
                <input
                  id="trf-nominal"
                  type="text"
                  inputMode="numeric"
                  required
                  value={nominalText}
                  onChange={(e) => setNominalText(formatCurrencyInput(e.target.value))}
                  placeholder="1.650.000"
                  className="w-full pl-9 pr-3 py-2 rounded-xl t-input font-mono-num font-bold text-right"
                />
              </div>
            </div>

            <div>
              <label htmlFor="trf-tanggal" className="block t-field-label mb-1">
                Tanggal Mulai Berlaku *
              </label>
              <input
                id="trf-tanggal"
                type="date"
                required
                value={tanggalMulaiBerlaku}
                onChange={(e) => setTanggalMulaiBerlaku(e.target.value)}
                className="w-full px-3 py-2 rounded-xl t-input font-mono-num font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="block t-field-label mb-1">Status Tarif</span>
              <div className="grid grid-cols-2 gap-1.5">
                {(['Aktif', 'Nonaktif'] as ArmadaUnitStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={`py-2 rounded-xl font-bold text-xs transition-colors ${
                      status === st
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
              <label htmlFor="trf-catatan" className="block t-field-label mb-1">
                Catatan (Opsional)
              </label>
              <input
                id="trf-catatan"
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Termasuk tol, min. tonase, syarat khusus..."
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
              {isEditing ? 'Simpan Perubahan' : 'Simpan Tarif'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
