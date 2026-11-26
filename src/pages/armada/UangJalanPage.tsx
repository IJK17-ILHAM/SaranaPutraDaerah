import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  Plus,
  Receipt,
  Search,
  Trash2,
  Upload,
  Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ArmadaMenuIcon } from '../../components/armada/ArmadaMenuIcons';
import type {
  ArmadaLokasi,
  ArmadaPelanggan,
  ArmadaPerjalanan,
  ArmadaUangJalan,
  ArmadaUnit,
  PengeluaranKategori,
  UangJalanExpenseItem,
  UangJalanStatus,
} from '../../types/armada';
import { readProofFileAsDataUrl } from '../../utils/armadaSchedule';
import {
  cleanRupiahToNumber,
  formatCurrencyInput,
  formatDateShortID,
  formatRupiah,
  getTodayISO,
} from '../../utils/format';

const KATEGORI_PENGELUARAN: PengeluaranKategori[] = [
  'BBM',
  'Tol',
  'Parkir',
  'Makan / Harian',
  'Lainnya',
];

const UJ_STEPS: Array<{ status: UangJalanStatus; actor: string; label: string }> = [
  { status: 'Diajukan', actor: 'Admin Armada', label: 'Diajukan' },
  { status: 'Dicairkan', actor: 'Finance', label: 'Dicairkan' },
  { status: 'Dipertanggungjawabkan', actor: 'Sopir / Admin', label: 'Dipertanggungjawabkan' },
  { status: 'Selesai', actor: 'Finance', label: 'Selesai' },
];

interface UangJalanPageProps {
  uangJalanList: ArmadaUangJalan[];
  perjalananList: ArmadaPerjalanan[];
  units: ArmadaUnit[];
  pelangganList: ArmadaPelanggan[];
  lokasiList: ArmadaLokasi[];
  selectedUangJalanId: string | null;
  onSelectUangJalan: (id: string | null) => void;
  onOpenPerjalanan: (perjalananId: string) => void;
  onDisburseUangJalan: (params: {
    id: string;
    nominalDicairkan: number;
    tanggalPencairan: string;
    metodePencairan: 'Tunai' | 'Transfer';
    buktiPencairanDataUrl?: string;
    buktiPencairanNama?: string;
  }) => void;
  onSubmitPertanggungjawaban: (params: {
    id: string;
    rincianPengeluaran: UangJalanExpenseItem[];
    catatanPertanggungjawaban: string;
  }) => void;
  onVerifyFinishUangJalan: (params: {
    id: string;
    tanggalPenyelesaian: string;
    metodePenyelesaian: 'Tunai' | 'Transfer';
    catatanVerifikasi: string;
  }) => void;
}

export function UangJalanPage({
  uangJalanList,
  perjalananList,
  units,
  pelangganList,
  lokasiList,
  selectedUangJalanId,
  onSelectUangJalan,
  onOpenPerjalanan,
  onDisburseUangJalan,
  onSubmitPertanggungjawaban,
  onVerifyFinishUangJalan,
}: UangJalanPageProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | UangJalanStatus>('ALL');

  // Stage 2: Dicairkan (Finance) state
  const [cairNominalText, setCairNominalText] = useState('');
  const [cairTanggal, setCairTanggal] = useState(getTodayISO());
  const [cairMetode, setCairMetode] = useState<'Tunai' | 'Transfer'>('Transfer');
  const [cairBuktiUrl, setCairBuktiUrl] = useState<string | undefined>(undefined);
  const [cairBuktiNama, setCairBuktiNama] = useState<string | undefined>(undefined);
  const [stageError, setStageError] = useState('');

  // Stage 3: Dipertanggungjawabkan (Sopir / Admin) state
  const [expenseRows, setExpenseRows] = useState<
    Array<{
      id: string;
      kategori: PengeluaranKategori;
      keterangan: string;
      nominalText: string;
      buktiDataUrl?: string;
      buktiNama?: string;
    }>
  >([
    { id: 'EXP-1', kategori: 'BBM', keterangan: 'Solar SPBU', nominalText: '' },
    { id: 'EXP-2', kategori: 'Tol', keterangan: 'Tol perjalanan', nominalText: '' },
  ]);
  const [pertanggungCatatan, setPertanggungCatatan] = useState('');

  // Stage 4: Selesai (Finance) state
  const [selesaiTanggal, setSelesaiTanggal] = useState(getTodayISO());
  const [selesaiMetode, setSelesaiMetode] = useState<'Tunai' | 'Transfer'>('Tunai');
  const [selesaiCatatan, setSelesaiCatatan] = useState('');

  const prjById = useMemo(() => new Map(perjalananList.map((p) => [p.id, p])), [perjalananList]);
  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const plgById = useMemo(() => new Map(pelangganList.map((p) => [p.id, p])), [pelangganList]);
  const lokById = useMemo(() => new Map(lokasiList.map((l) => [l.id, l])), [lokasiList]);

  const selectedUj = useMemo(
    () => (selectedUangJalanId ? uangJalanList.find((u) => u.id === selectedUangJalanId) || null : null),
    [selectedUangJalanId, uangJalanList],
  );

  const openDetail = (uj: ArmadaUangJalan) => {
    setStageError('');
    setCairNominalText(formatCurrencyInput(String(Math.round(uj.nominalDiajukan))));
    setCairTanggal(getTodayISO());
    setCairMetode('Transfer');
    setCairBuktiUrl(undefined);
    setCairBuktiNama(undefined);
    if (uj.rincianPengeluaran.length > 0) {
      setExpenseRows(
        uj.rincianPengeluaran.map((item) => ({
          id: item.id,
          kategori: item.kategori,
          keterangan: item.keterangan,
          nominalText: formatCurrencyInput(String(Math.round(item.nominal))),
          buktiDataUrl: item.buktiDataUrl,
          buktiNama: item.buktiNama,
        })),
      );
    } else {
      setExpenseRows([
        { id: `EXP-${Date.now()}-1`, kategori: 'BBM', keterangan: 'BBM Solar', nominalText: '' },
        { id: `EXP-${Date.now()}-2`, kategori: 'Tol', keterangan: 'Tol rute', nominalText: '' },
        { id: `EXP-${Date.now()}-3`, kategori: 'Parkir', keterangan: 'Parkir / retribusi', nominalText: '' },
      ]);
    }
    setPertanggungCatatan(uj.catatanPertanggungjawaban || '');
    setSelesaiTanggal(getTodayISO());
    setSelesaiMetode('Tunai');
    setSelesaiCatatan('');
    onSelectUangJalan(uj.id);
  };

  const stats = useMemo(() => {
    return {
      diajukan: uangJalanList.filter((u) => u.status === 'Diajukan').length,
      dicairkan: uangJalanList.filter((u) => u.status === 'Dicairkan').length,
      dipertanggungjawabkan: uangJalanList.filter((u) => u.status === 'Dipertanggungjawabkan')
        .length,
      selesai: uangJalanList.filter((u) => u.status === 'Selesai').length,
    };
  }, [uangJalanList]);

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return uangJalanList.filter((u) => {
      if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
      if (q) {
        const prj = prjById.get(u.perjalananId);
        const unit = prj ? unitById.get(prj.unitId) : undefined;
        const hit =
          u.nomorUangJalan.toLowerCase().includes(q) ||
          u.keperluan.toLowerCase().includes(q) ||
          (prj?.nomorPenugasan || '').toLowerCase().includes(q) ||
          (prj?.sopirNama || '').toLowerCase().includes(q) ||
          (unit?.kodeUnit || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [prjById, search, statusFilter, uangJalanList, unitById]);

  const statusColor = (st: UangJalanStatus) => {
    if (st === 'Selesai') return 'var(--status-ok-text)';
    if (st === 'Dicairkan') return 'var(--status-info-text)';
    return 'var(--status-warn-text)';
  };

  // DETAIL WORKFLOW VIEW
  if (selectedUj) {
    const prj = prjById.get(selectedUj.perjalananId);
    const unit = prj ? unitById.get(prj.unitId) : undefined;
    const plg = prj ? plgById.get(prj.pelangganId) : undefined;
    const muat = prj ? lokById.get(prj.lokasiMuatId) : undefined;
    const bongkar = prj ? lokById.get(prj.lokasiBongkarId) : undefined;

    const currentStepIdx = UJ_STEPS.findIndex((s) => s.status === selectedUj.status);

    const draftExpenseTotal = expenseRows.reduce(
      (sum, row) => sum + cleanRupiahToNumber(row.nominalText),
      0,
    );
    const dicairkanVal = selectedUj.nominalDicairkan || 0;
    const realisasiVal =
      selectedUj.status === 'Dicairkan' ? draftExpenseTotal : selectedUj.totalPengeluaran;
    const selisihVal = dicairkanVal - realisasiVal; // >0 sisa, <0 kurang

    const handleDisburseSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setStageError('');
      const nom = cleanRupiahToNumber(cairNominalText);
      if (nom <= 0) {
        setStageError('Nominal yang dibayarkan harus lebih besar dari Rp 0.');
        return;
      }
      if (!cairTanggal) {
        setStageError('Tanggal pencairan wajib diisi.');
        return;
      }
      onDisburseUangJalan({
        id: selectedUj.id,
        nominalDicairkan: nom,
        tanggalPencairan: cairTanggal,
        metodePencairan: cairMetode,
        buktiPencairanDataUrl: cairBuktiUrl,
        buktiPencairanNama: cairBuktiNama,
      });
    };

    const handlePertanggungSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setStageError('');
      const validItems: UangJalanExpenseItem[] = expenseRows
        .map((r) => ({
          id: r.id,
          kategori: r.kategori,
          keterangan: r.keterangan.trim() || r.kategori,
          nominal: cleanRupiahToNumber(r.nominalText),
          buktiDataUrl: r.buktiDataUrl,
          buktiNama: r.buktiNama,
        }))
        .filter((item) => item.nominal > 0);

      if (validItems.length === 0) {
        setStageError('Masukkan minimal satu rincian pengeluaran dengan nominal > Rp 0.');
        return;
      }

      onSubmitPertanggungjawaban({
        id: selectedUj.id,
        rincianPengeluaran: validItems,
        catatanPertanggungjawaban: pertanggungCatatan.trim(),
      });
    };

    const handleVerifySubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setStageError('');
      onVerifyFinishUangJalan({
        id: selectedUj.id,
        tanggalPenyelesaian: selesaiTanggal || getTodayISO(),
        metodePenyelesaian: selesaiMetode,
        catatanVerifikasi: selesaiCatatan.trim(),
      });
    };

    return (
      <section className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs t-muted">
              <span>Perjalanan &amp; Sewa</span>
              <span aria-hidden="true">/</span>
              <button
                type="button"
                onClick={() => onSelectUangJalan(null)}
                className="t-link hover:underline font-medium"
              >
                Uang Jalan
              </button>
              <span aria-hidden="true">/</span>
              <span className="t-text font-mono-num font-semibold">
                {selectedUj.nomorUangJalan}
              </span>
            </div>
            <div className="flex items-start gap-3 pt-0.5">
              <div className="w-11 h-11 rounded-xl t-subtle border t-border flex items-center justify-center shrink-0">
                <ArmadaMenuIcon id="armada-uang-jalan" size={30} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-display font-bold t-text leading-snug">
                  {selectedUj.nomorUangJalan} &mdash; {prj?.nomorPenugasan || '-'}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs t-muted mt-0.5">
                  <span className="font-mono-num font-semibold t-text">
                    {unit?.kodeUnit || '-'} ({unit?.nomorPolisi || '-'})
                  </span>
                  <span aria-hidden="true">&middot;</span>
                  <span>Sopir: {prj?.sopirNama || '-'}</span>
                  <span aria-hidden="true">&middot;</span>
                  <span>
                    {muat?.namaLokasi || '-'} &rarr; {bongkar?.namaLokasi || '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {prj && (
              <button
                type="button"
                onClick={() => onOpenPerjalanan(prj.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
              >
                <span>Buka Perjalanan</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onSelectUangJalan(null)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Daftar Uang Jalan</span>
            </button>
          </div>
        </div>

        {/* 4-Stage Progress Bar */}
        <div className="t-card rounded-2xl p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {UJ_STEPS.map((step, idx) => {
            const done = idx < currentStepIdx || selectedUj.status === 'Selesai';
            const active = idx === currentStepIdx && selectedUj.status !== 'Selesai';
            return (
              <div
                key={step.status}
                className={`p-3 rounded-xl border text-xs ${
                  active
                    ? 't-status-info border-current/30'
                    : done
                      ? 't-status-ok border-current/25'
                      : 't-subtle t-border opacity-70'
                }`}
              >
                <div className="font-bold">
                  {idx + 1}. {step.label}
                </div>
                <div className="text-[11px] opacity-85 mt-0.5">{step.actor}</div>
              </div>
            );
          })}
        </div>

        {/* Summary Snapshot */}
        <div className="t-card rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-xs">
          <div>
            <div className="t-field-label">Nominal Diajukan</div>
            <div className="font-mono-num tabular-nums font-bold text-base t-text mt-1">
              {formatRupiah(selectedUj.nominalDiajukan)}
            </div>
            <div className="text-[11px] t-muted mt-0.5">
              {selectedUj.diajukanOleh} &middot; {formatDateShortID(selectedUj.tanggalDiajukan)}
            </div>
          </div>
          <div>
            <div className="t-field-label">Nominal Dicairkan (Finance)</div>
            <div className="font-mono-num tabular-nums font-bold text-base t-text mt-1">
              {selectedUj.nominalDicairkan ? formatRupiah(selectedUj.nominalDicairkan) : '-'}
            </div>
            <div className="text-[11px] t-muted mt-0.5">
              {selectedUj.tanggalPencairan
                ? `${formatDateShortID(selectedUj.tanggalPencairan)} · ${
                    selectedUj.metodePencairan || 'Transfer'
                  }`
                : 'Menunggu pencairan Finance'}
            </div>
          </div>
          <div>
            <div className="t-field-label">Total Pengeluaran Aktual</div>
            <div className="font-mono-num tabular-nums font-bold text-base t-text mt-1">
              {selectedUj.rincianPengeluaran.length > 0
                ? formatRupiah(selectedUj.totalPengeluaran)
                : '-'}
            </div>
            <div className="text-[11px] t-muted mt-0.5">
              {selectedUj.rincianPengeluaran.length} item pengeluaran
            </div>
          </div>
          <div>
            <div className="t-field-label">Selisih &amp; Status Kas</div>
            <div className="font-mono-num tabular-nums font-bold text-base t-text mt-1">
              {selectedUj.nominalDicairkan && selectedUj.rincianPengeluaran.length > 0
                ? selisihVal === 0
                  ? 'Pas (Rp 0)'
                  : selisihVal > 0
                    ? `Sisa ${formatRupiah(selisihVal)}`
                    : `Kurang ${formatRupiah(Math.abs(selisihVal))}`
                : '-'}
            </div>
            <div className="text-[11px] t-muted mt-0.5">
              {selectedUj.kasOpsPencairanId
                ? 'Tercatat di Kas & Tonase'
                : plg?.namaPt || '-'}
            </div>
          </div>
          <div className="sm:col-span-2 lg:col-span-4 pt-3 border-t t-border">
            <div className="t-field-label">Keperluan Pengajuan</div>
            <div className="t-text mt-1">{selectedUj.keperluan}</div>
          </div>
        </div>

        {stageError && (
          <div className="p-3 rounded-xl t-status-bad text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{stageError}</span>
          </div>
        )}

        {/* STAGE 2 FORM: FINANCE DISBURSEMENT */}
        {selectedUj.status === 'Diajukan' && (
          <form onSubmit={handleDisburseSubmit} className="t-card rounded-2xl p-5 space-y-4 text-xs">
            <div className="border-b t-border pb-3">
              <h3 className="t-section-label">Tahap 2: Pencairan oleh Finance</h3>
              <p className="text-[11px] t-muted mt-0.5">
                Catat nominal yang benar-benar dibayar, tanggal pencairan, dan bukti transfer/kas.
                Sistem otomatis mencatat transaksi pengeluaran di <b>Kas &amp; Tonase</b>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="cair-nom" className="block t-field-label mb-1">
                  Nominal Dibayar (Rp) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold t-muted">
                    Rp
                  </span>
                  <input
                    id="cair-nom"
                    type="text"
                    inputMode="numeric"
                    required
                    value={cairNominalText}
                    onChange={(e) => setCairNominalText(formatCurrencyInput(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 rounded-xl t-input font-mono-num font-bold text-right"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="cair-tgl" className="block t-field-label mb-1">
                  Tanggal Pencairan *
                </label>
                <input
                  id="cair-tgl"
                  type="date"
                  required
                  value={cairTanggal}
                  onChange={(e) => setCairTanggal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl t-input font-mono-num"
                />
              </div>
              <div>
                <label htmlFor="cair-metode" className="block t-field-label mb-1">
                  Metode Pembayaran *
                </label>
                <select
                  id="cair-metode"
                  value={cairMetode}
                  onChange={(e) => setCairMetode(e.target.value as 'Tunai' | 'Transfer')}
                  className="w-full px-3 py-2 rounded-xl t-input font-semibold"
                >
                  <option value="Transfer">Transfer</option>
                  <option value="Tunai">Tunai</option>
                </select>
              </div>
            </div>

            <div>
              <span className="block t-field-label mb-1">Bukti Pembayaran (Foto / Struk)</span>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary font-semibold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{cairBuktiNama ? 'Ganti Bukti' : 'Unggah Bukti Pembayaran'}</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const res = await readProofFileAsDataUrl(file);
                      setCairBuktiUrl(res.dataUrl);
                      setCairBuktiNama(res.name);
                    }}
                  />
                </label>
                {cairBuktiNama && <span className="t-text font-medium">{cairBuktiNama}</span>}
              </div>
              {cairBuktiUrl && cairBuktiUrl.startsWith('data:image/') && (
                <img
                  src={cairBuktiUrl}
                  alt="Pratinjau bukti pencairan"
                  className="mt-2 max-h-40 rounded-xl border t-border object-contain"
                />
              )}
            </div>

            <div className="flex justify-end pt-3 border-t t-border">
              <button type="submit" className="px-4 py-2.5 rounded-xl t-btn-primary">
                Konfirmasi Pencairan &amp; Catat di Kas &amp; Tonase
              </button>
            </div>
          </form>
        )}

        {/* STAGE 3 FORM: PERTANGGUNGJAWABAN (SOPIR / ADMIN ARMADA) */}
        {selectedUj.status === 'Dicairkan' && (
          <form
            onSubmit={handlePertanggungSubmit}
            className="t-card rounded-2xl p-5 space-y-4 text-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b t-border pb-3">
              <div>
                <h3 className="t-section-label">
                  Tahap 3: Pertanggungjawaban Pengeluaran (Sopir / Admin Armada)
                </h3>
                <p className="text-[11px] t-muted mt-0.5">
                  Catat rincian pengeluaran tol, BBM, parkir, dan lainnya beserta bukti struk jika
                  ada.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setExpenseRows((prev) => [
                    ...prev,
                    {
                      id: `EXP-${Date.now()}-${prev.length + 1}`,
                      kategori: 'Lainnya',
                      keterangan: '',
                      nominalText: '',
                    },
                  ])
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl t-btn-secondary font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Item</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {expenseRows.map((row, idx) => (
                <div
                  key={row.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-3 rounded-xl t-subtle border t-border"
                >
                  <div className="sm:col-span-3">
                    <select
                      aria-label={`Kategori pengeluaran ${idx + 1}`}
                      value={row.kategori}
                      onChange={(e) =>
                        setExpenseRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id
                              ? { ...r, kategori: e.target.value as PengeluaranKategori }
                              : r,
                          ),
                        )
                      }
                      className="w-full px-2.5 py-2 rounded-xl t-input font-semibold"
                    >
                      {KATEGORI_PENGELUARAN.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      value={row.keterangan}
                      onChange={(e) =>
                        setExpenseRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? { ...r, keterangan: e.target.value } : r,
                          ),
                        )
                      }
                      placeholder="Keterangan (mis. Tol Cibitung, Solar 30L)"
                      className="w-full px-2.5 py-2 rounded-xl t-input"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={row.nominalText}
                      onChange={(e) =>
                        setExpenseRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id
                              ? { ...r, nominalText: formatCurrencyInput(e.target.value) }
                              : r,
                          ),
                        )
                      }
                      placeholder="Nominal (Rp)"
                      className="w-full px-2.5 py-2 rounded-xl t-input font-mono-num font-bold text-right"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-end gap-1.5">
                    <label
                      title="Unggah foto struk"
                      className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl t-btn-secondary cursor-pointer font-semibold"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{row.buktiNama ? 'OK' : 'Bukti'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const res = await readProofFileAsDataUrl(file);
                          setExpenseRows((prev) =>
                            prev.map((r) =>
                              r.id === row.id
                                ? { ...r, buktiDataUrl: res.dataUrl, buktiNama: res.name }
                                : r,
                            ),
                          );
                        }}
                      />
                    </label>
                    {expenseRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpenseRows((prev) => prev.filter((r) => r.id !== row.id))
                        }
                        aria-label="Hapus baris pengeluaran"
                        className="p-2 rounded-xl t-btn-secondary"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl t-subtle border t-border">
              <div>
                <span className="t-muted">Total Pengeluaran: </span>
                <span className="font-mono-num font-bold t-text">
                  {formatRupiah(draftExpenseTotal)}
                </span>
              </div>
              <div className="font-mono-num font-bold">
                {selisihVal === 0 ? (
                  <span style={{ color: 'var(--status-ok-text)' }}>Pas (Rp 0)</span>
                ) : selisihVal > 0 ? (
                  <span style={{ color: 'var(--status-info-text)' }}>
                    Sisa dikembalikan: {formatRupiah(selisihVal)}
                  </span>
                ) : (
                  <span style={{ color: 'var(--status-warn-text)' }}>
                    Kekurangan dibayarkan: {formatRupiah(Math.abs(selisihVal))}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="uj-pj-cat" className="block t-field-label mb-1">
                Catatan Pertanggungjawaban (Opsional)
              </label>
              <input
                id="uj-pj-cat"
                type="text"
                value={pertanggungCatatan}
                onChange={(e) => setPertanggungCatatan(e.target.value)}
                placeholder="Catatan tambahan dari sopir / admin armada"
                className="w-full px-3 py-2 rounded-xl t-input"
              />
            </div>

            <div className="flex justify-end pt-3 border-t t-border">
              <button type="submit" className="px-4 py-2.5 rounded-xl t-btn-primary">
                Simpan Pertanggungjawaban
              </button>
            </div>
          </form>
        )}

        {/* STAGE 4 FORM: VERIFIKASI & SELESAI (FINANCE) */}
        {(selectedUj.status === 'Dipertanggungjawabkan' || selectedUj.status === 'Selesai') && (
          <div className="t-card rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b t-border">
              <h3 className="t-section-label">Rincian Pengeluaran Dipertanggungjawabkan</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="t-subtle border-b t-border">
                    <th className="py-3 px-5 t-th-label">Kategori</th>
                    <th className="py-3 px-4 t-th-label">Keterangan</th>
                    <th className="py-3 px-4 t-th-label">Bukti</th>
                    <th className="py-3 px-5 t-th-label text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y t-border">
                  {selectedUj.rincianPengeluaran.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 px-5 font-semibold t-text whitespace-nowrap">
                        {item.kategori}
                      </td>
                      <td className="py-3 px-4 t-text">{item.keterangan}</td>
                      <td className="py-3 px-4 t-muted">
                        {item.buktiDataUrl && item.buktiDataUrl.startsWith('data:image/') ? (
                          <img
                            src={item.buktiDataUrl}
                            alt={item.buktiNama || 'Bukti struk'}
                            className="h-10 rounded-lg border t-border object-cover"
                          />
                        ) : (
                          item.buktiNama || '-'
                        )}
                      </td>
                      <td className="py-3 px-5 text-right font-mono-num tabular-nums font-bold t-text whitespace-nowrap">
                        {formatRupiah(item.nominal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedUj.status === 'Dipertanggungjawabkan' ? (
              <form onSubmit={handleVerifySubmit} className="p-5 border-t t-border space-y-4 text-xs">
                <div>
                  <h4 className="t-section-label">Tahap 4: Verifikasi &amp; Penyelesaian (Finance)</h4>
                  <p className="text-[11px] t-muted mt-0.5">
                    {selisihVal > 0
                      ? `Terdapat sisa ${formatRupiah(
                          selisihVal,
                        )}. Catat pengembalian sisa untuk otomatis dicatat sebagai Kas Masuk di Kas & Tonase.`
                      : selisihVal < 0
                        ? `Terdapat kekurangan ${formatRupiah(
                            Math.abs(selisihVal),
                          )}. Catat pembayaran tambahan untuk otomatis dicatat sebagai Kas Keluar di Kas & Tonase.`
                        : 'Pengeluaran pas dengan nominal pencairan. Verifikasi untuk menyelesaikan uang jalan.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="sel-tgl" className="block t-field-label mb-1">
                      Tanggal Verifikasi / Penyelesaian
                    </label>
                    <input
                      id="sel-tgl"
                      type="date"
                      required
                      value={selesaiTanggal}
                      onChange={(e) => setSelesaiTanggal(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl t-input font-mono-num"
                    />
                  </div>
                  <div>
                    <label htmlFor="sel-metode" className="block t-field-label mb-1">
                      Metode Penyelesaian Selisih
                    </label>
                    <select
                      id="sel-metode"
                      value={selesaiMetode}
                      onChange={(e) => setSelesaiMetode(e.target.value as 'Tunai' | 'Transfer')}
                      className="w-full px-3 py-2 rounded-xl t-input font-semibold"
                    >
                      <option value="Tunai">Tunai</option>
                      <option value="Transfer">Transfer</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="sel-cat" className="block t-field-label mb-1">
                      Catatan Verifikasi Finance
                    </label>
                    <input
                      id="sel-cat"
                      type="text"
                      value={selesaiCatatan}
                      onChange={(e) => setSelesaiCatatan(e.target.value)}
                      placeholder="Struk lengkap & sesuai"
                      className="w-full px-3 py-2 rounded-xl t-input"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl t-btn-primary">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {selisihVal > 0
                        ? `Terima Sisa ${formatRupiah(selisihVal)} & Selesaikan`
                        : selisihVal < 0
                          ? `Bayar Kekurangan ${formatRupiah(Math.abs(selisihVal))} & Selesaikan`
                          : 'Verifikasi & Selesaikan'}
                    </span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-5 border-t t-border t-status-ok text-xs flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Uang Jalan Selesai ({selectedUj.statusPenyelesaian || 'Pas'}) &middot; Diverifikasi{' '}
                    {formatDateShortID(selectedUj.tanggalPenyelesaian)}
                  </span>
                </div>
                {selectedUj.kasOpsPenyelesaianId && (
                  <span className="font-mono-num text-[11px]">
                    Tercatat di Kas &amp; Tonase
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    );
  }

  // DAFTAR UANG JALAN VIEW
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl t-subtle border t-border flex items-center justify-center shrink-0">
            <ArmadaMenuIcon id="armada-uang-jalan" size={30} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-display font-bold t-text leading-snug">
              Uang Jalan Perjalanan
            </h2>
            <p className="text-xs t-muted mt-0.5 max-w-2xl">
              Kelola alur uang jalan mulai dari <b>Diajukan</b> (Admin Armada), <b>Dicairkan</b>{' '}
              (Finance &rarr; tercatat otomatis di Kas &amp; Tonase), <b>Dipertanggungjawabkan</b>,
              hingga <b>Selesai</b>. Pengajuan baru dimulai dari tombol <b>Ajukan Uang Jalan</b> pada
              Detail Perjalanan.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Stage KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="t-card rounded-2xl p-4">
          <div className="t-field-label">1. Diajukan</div>
          <div className="text-2xl font-display t-text mt-1 tabular-nums">{stats.diajukan}</div>
          <div className="text-[11px] t-muted mt-0.5">Menunggu pencairan Finance</div>
        </div>
        <div className="t-card rounded-2xl p-4">
          <div className="t-field-label">2. Dicairkan</div>
          <div
            className="text-2xl font-display mt-1 tabular-nums"
            style={{ color: 'var(--status-info-text)' }}
          >
            {stats.dicairkan}
          </div>
          <div className="text-[11px] t-muted mt-0.5">Menunggu pertanggungjawaban</div>
        </div>
        <div className="t-card rounded-2xl p-4">
          <div className="t-field-label">3. Dipertanggungjawabkan</div>
          <div
            className="text-2xl font-display mt-1 tabular-nums"
            style={{ color: 'var(--status-warn-text)' }}
          >
            {stats.dipertanggungjawabkan}
          </div>
          <div className="text-[11px] t-muted mt-0.5">Menunggu verifikasi Finance</div>
        </div>
        <div className="t-card rounded-2xl p-4">
          <div className="t-field-label">4. Selesai</div>
          <div
            className="text-2xl font-display mt-1 tabular-nums"
            style={{ color: 'var(--status-ok-text)' }}
          >
            {stats.selesai}
          </div>
          <div className="text-[11px] t-muted mt-0.5">Terverifikasi &amp; sinkron kas</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="t-card rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8">
          <label htmlFor="uj-search" className="block t-field-label mb-1">
            Cari No. Uang Jalan, Perjalanan, Unit, Sopir, atau Keperluan
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 t-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="uj-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Contoh: UJ-001, PRJ-001, ARM-001..."
              className="w-full text-xs pl-8 pr-3 py-2 rounded-xl t-input"
            />
          </div>
        </div>
        <div className="sm:col-span-4">
          <label htmlFor="uj-status" className="block t-field-label mb-1">
            Tahap
          </label>
          <select
            id="uj-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | UangJalanStatus)}
            className="w-full text-xs px-3 py-2 rounded-xl t-input font-semibold"
          >
            <option value="ALL">Semua Tahap</option>
            <option value="Diajukan">Diajukan</option>
            <option value="Dicairkan">Dicairkan</option>
            <option value="Dipertanggungjawabkan">Dipertanggungjawabkan</option>
            <option value="Selesai">Selesai</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="t-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="t-subtle border-b t-border">
                <th className="py-3.5 px-5 t-th-label">No. Uang Jalan</th>
                <th className="py-3.5 px-4 t-th-label">Perjalanan &amp; Unit</th>
                <th className="py-3.5 px-4 t-th-label">Keperluan</th>
                <th className="py-3.5 px-4 t-th-label text-right">Diajukan</th>
                <th className="py-3.5 px-4 t-th-label text-right">Dicairkan</th>
                <th className="py-3.5 px-4 t-th-label text-right">Realisasi</th>
                <th className="py-3.5 px-4 t-th-label">Tahap</th>
                <th className="py-3.5 px-5 t-th-label text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y t-border">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center t-muted">
                    Belum ada pengajuan uang jalan yang cocok. Buka Detail Perjalanan lalu klik{' '}
                    <b>Ajukan Uang Jalan</b>.
                  </td>
                </tr>
              ) : (
                filteredList.map((uj) => {
                  const prj = prjById.get(uj.perjalananId);
                  const unit = prj ? unitById.get(prj.unitId) : undefined;
                  return (
                    <tr
                      key={uj.id}
                      onClick={() => openDetail(uj)}
                      className="t-row-hover cursor-pointer"
                    >
                      <td className="py-3.5 px-5 font-mono-num font-bold t-link whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Wallet className="w-3.5 h-3.5 shrink-0" />
                          <span>{uj.nomorUangJalan}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold t-text">
                          {prj?.nomorPenugasan || '-'} &middot; {unit?.kodeUnit || '-'}
                        </div>
                        <div className="text-[11px] t-muted">{prj?.sopirNama || '-'}</div>
                      </td>
                      <td className="py-3.5 px-4 t-muted max-w-xs truncate">{uj.keperluan}</td>
                      <td className="py-3.5 px-4 text-right font-mono-num tabular-nums t-text whitespace-nowrap">
                        {formatRupiah(uj.nominalDiajukan)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-num tabular-nums font-semibold t-text whitespace-nowrap">
                        {uj.nominalDicairkan ? formatRupiah(uj.nominalDicairkan) : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-num tabular-nums t-text whitespace-nowrap">
                        {uj.rincianPengeluaran.length > 0 ? formatRupiah(uj.totalPengeluaran) : '-'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className="font-bold text-[11px]"
                          style={{ color: statusColor(uj.status) }}
                        >
                          {uj.status}
                        </span>
                      </td>
                      <td
                        className="py-3.5 px-5 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => openDetail(uj)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl t-btn-secondary text-[11px] font-bold"
                        >
                          {uj.status === 'Selesai' ? (
                            <Eye className="w-3 h-3" />
                          ) : (
                            <Receipt className="w-3 h-3" />
                          )}
                          <span>{uj.status === 'Selesai' ? 'Detail' : 'Proses'}</span>
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
