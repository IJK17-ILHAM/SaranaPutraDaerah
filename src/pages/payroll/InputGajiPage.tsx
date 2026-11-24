import {
  ArrowDown,
  ArrowRight,
  Calendar,
  Check,
  CloudUpload,
  Download,
  FileSpreadsheet,
  HardDrive,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { PayrollStatusText } from '../../components/common/StatusBadge';
import { AttendanceImportModal } from '../../components/payroll/AttendanceImportModal';
import {
  DEFAULT_PAYROLL_RATES,
  DIVISIONS,
  PAYROLL_CYCLES,
  PAYROLL_STATUSES,
} from '../../config/constants';
import { useApp } from '../../context/AppContext';
import { usePayroll } from '../../context/PayrollContext';
import type {
  ActiveLemburState,
  DivisionName,
  PayrollCycle,
  PayrollRecord,
  PayrollStatus,
  SupirSpdUnit,
} from '../../types/payroll';
import type { AttendancePreviewRow } from '../../utils/attendanceImport';
import { exportPayrollToExcelMultiSheet } from '../../utils/exportExcel';
import {
  cleanRupiahToNumber,
  formatCurrencyInput,
  formatDateRangeLabel,
  formatNumberWithDots,
  formatRupiah,
} from '../../utils/format';
import {
  calculateTHP,
  getPeriodeDisplay,
  getSiklusDisplay,
  getStatusDisplay,
} from '../../utils/payrollCalc';

export function InputGajiPage() {
  const { user, showToast, requestConfirm } = useApp();
  const {
    masterEmployees,
    localDrafts,
    isSyncing,
    refreshPayroll,
    submitPayroll,
    updatePayrollRecord,
    editingPayrollRecord,
    setEditingPayrollRecord,
    getEmployeeProfile,
    getEmployeeKasbonSaldo,
    saveLocalDraft,
    deleteLocalDraft,
    promoteDraftToSPS,
  } = usePayroll();

  const [showImportModal, setShowImportModal] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [pushingDraftId, setPushingDraftId] = useState<string | null>(null);
  const [pushingAllProgress, setPushingAllProgress] = useState<string | null>(null);
  const [highlightDrafts, setHighlightDrafts] = useState(false);
  const draftSectionRef = useRef<HTMLDivElement | null>(null);

  const [selectedEmpIdx, setSelectedEmpIdx] = useState('');
  const [periodeTanggal, setPeriodeTanggal] = useState('31 Okt - 06 Nov 2026');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [rangeStart, setRangeStart] = useState('2026-10-31');
  const [rangeEnd, setRangeEnd] = useState('2026-11-06');

  const [nama, setNama] = useState('');
  const [nik, setNik] = useState('');
  const [divisi, setDivisi] = useState<DivisionName>('Karyawan limbah');
  const [siklusGaji, setSiklusGaji] = useState<PayrollCycle>('Mingguan');
  const [supirSpdUnit, setSupirSpdUnit] = useState<SupirSpdUnit>('trip');

  const [hr, setHr] = useState(String(DEFAULT_PAYROLL_RATES.hariKerja));
  const [upahHari, setUpahHari] = useState(formatNumberWithDots(DEFAULT_PAYROLL_RATES.upahPerHari));
  const [trip, setTrip] = useState('0');
  const [upahTrip, setUpahTrip] = useState(formatNumberWithDots(DEFAULT_PAYROLL_RATES.upahPerTrip));

  const [activeLembur, setActiveLembur] = useState<ActiveLemburState>({
    hari: false,
    jam: true,
    inap: false,
  });

  const [lemburHari, setLemburHari] = useState('0');
  const [upahLemburHari, setUpahLemburHari] = useState(
    formatNumberWithDots(DEFAULT_PAYROLL_RATES.upahLemburHari),
  );
  const [lemburJam, setLemburJam] = useState('6');
  const [lemburTambahan, setLemburTambahan] = useState('0');
  const [upahJam, setUpahJam] = useState(formatNumberWithDots(DEFAULT_PAYROLL_RATES.upahPerJam));
  const [inap, setInap] = useState('0');
  const [upahInap, setUpahInap] = useState(formatNumberWithDots(DEFAULT_PAYROLL_RATES.upahPerInap));

  const [kasbon, setKasbon] = useState('500.000');
  const [bpjs, setBpjs] = useState('0');
  const [keterangan, setKeterangan] = useState('Ke 1');
  const [saldoKasbon, setSaldoKasbon] = useState('0');
  const [status, setStatus] = useState<PayrollStatus>('Draft');
  const [submitting, setSubmitting] = useState(false);

  const isTripMode = divisi === 'Supir B3' || (divisi === 'Supir SPD' && supirSpdUnit === 'trip');

  const preview = useMemo(() => {
    const gapok = isTripMode
      ? (parseFloat(trip) || 0) * cleanRupiahToNumber(upahTrip)
      : (parseFloat(hr) || 0) * cleanRupiahToNumber(upahHari);

    const nomHari =
      (activeLembur.hari ? parseFloat(lemburHari) || 0 : 0) * cleanRupiahToNumber(upahLemburHari);
    const jamTotal =
      (activeLembur.jam ? parseFloat(lemburJam) || 0 : 0) +
      (activeLembur.jam ? parseFloat(lemburTambahan) || 0 : 0);
    const nomJam = jamTotal * cleanRupiahToNumber(upahJam);
    const nomInap = (activeLembur.inap ? parseFloat(inap) || 0 : 0) * cleanRupiahToNumber(upahInap);

    const totalLembur = nomHari + nomJam + nomInap;
    const kotor = gapok + totalLembur;
    const kasbonVal = cleanRupiahToNumber(kasbon);
    const bpjsVal = cleanRupiahToNumber(bpjs);
    const potongan = kasbonVal + bpjsVal;
    const thp = kotor - potongan;
    const sisaKasbon = Math.max(0, cleanRupiahToNumber(saldoKasbon) - kasbonVal);

    return {
      gapok,
      nomHari,
      nomJam,
      nomInap,
      totalLembur,
      kotor,
      kasbonVal,
      bpjsVal,
      potongan,
      thp,
      sisaKasbon,
    };
  }, [
    isTripMode,
    trip,
    upahTrip,
    hr,
    upahHari,
    activeLembur,
    lemburHari,
    upahLemburHari,
    lemburJam,
    lemburTambahan,
    upahJam,
    inap,
    upahInap,
    kasbon,
    bpjs,
    saldoKasbon,
  ]);

  const handleDivisiChange = (nextDiv: DivisionName) => {
    setDivisi(nextDiv);
    if (nextDiv === 'Supir B3' || nextDiv === 'Supir SPD') {
      setActiveLembur({ hari: false, jam: false, inap: true });
    } else {
      setActiveLembur({ hari: false, jam: true, inap: false });
    }
  };

  const toggleLembur = (key: keyof ActiveLemburState) => {
    setActiveLembur((prev) => {
      const nextVal = !prev[key];
      if (!nextVal) {
        if (key === 'hari') setLemburHari('0');
        if (key === 'jam') {
          setLemburJam('0');
          setLemburTambahan('0');
        }
        if (key === 'inap') setInap('0');
      }
      return { ...prev, [key]: nextVal };
    });
  };

  const matchedProfile = useMemo(
    () => getEmployeeProfile(nik, nama),
    [getEmployeeProfile, nik, nama],
  );

  const loadRecordIntoForm = (
    rec: PayrollRecord,
    draftId: string | null = null,
    isEditingSavedRecord = false,
  ) => {
    const c = calculateTHP(rec);
    const prof = getEmployeeProfile(rec.nik || '', rec.nama || '');
    setEditingDraftId(draftId);
    setNama(rec.nama || '');
    setNik(rec.nik || '');
    setDivisi(c.skema);
    setSiklusGaji(prof?.siklusGaji || getSiklusDisplay(rec));
    if (rec.periodeTanggal || rec.periodeBulan) {
      setPeriodeTanggal(getPeriodeDisplay(rec));
    }
    if (c.skema === 'Supir SPD') {
      setSupirSpdUnit(c.isTrip ? 'trip' : 'hari');
    }

    if (c.isTrip) {
      setTrip(String(c.unitPokok || 0));
      setUpahTrip(formatNumberWithDots(c.tarifPokok || DEFAULT_PAYROLL_RATES.upahPerTrip));
    } else {
      setHr(String(c.unitPokok || DEFAULT_PAYROLL_RATES.hariKerja));
      setUpahHari(formatNumberWithDots(c.tarifPokok || DEFAULT_PAYROLL_RATES.upahPerHari));
    }

    const hasHari = c.lemburHari > 0 || c.nomHari > 0;
    const hasJam = c.totalJam > 0 || c.nomJam > 0;
    const hasInap = c.inap > 0 || c.nomInap > 0;

    setActiveLembur({
      hari: hasHari,
      jam: hasJam || (!hasHari && !hasInap && c.skema === 'Karyawan limbah'),
      inap: hasInap || (!hasHari && !hasJam && c.skema !== 'Karyawan limbah'),
    });

    setLemburHari(String(c.lemburHari || 0));
    setUpahLemburHari(
      formatNumberWithDots(c.upahLemburHari || DEFAULT_PAYROLL_RATES.upahLemburHari),
    );
    setLemburJam(String(c.jamUtama || 0));
    setLemburTambahan(String(c.tambahanJam || 0));
    setUpahJam(formatNumberWithDots(c.upahPerJam || DEFAULT_PAYROLL_RATES.upahPerJam));
    setInap(String(c.inap || 0));
    setUpahInap(formatNumberWithDots(c.upahPerInap || DEFAULT_PAYROLL_RATES.upahPerInap));
    setKasbon(formatNumberWithDots(c.kasbon));
    setBpjs(formatNumberWithDots(c.bpjs));
    setKeterangan(rec.keterangan || '');
    const activeSaldo = getEmployeeKasbonSaldo(rec.nik || '', rec.nama || '');
    setSaldoKasbon(formatNumberWithDots(isEditingSavedRecord ? activeSaldo + c.kasbon : activeSaldo));
    const st = getStatusDisplay(rec);
    if (st === 'Draft' || st === 'Approved' || st === 'Paid') {
      setStatus(st);
    }
  };

  useEffect(() => {
    if (editingPayrollRecord) {
      loadRecordIntoForm(editingPayrollRecord, null, true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingPayrollRecord]);

  const applyMasterEmployee = (idxStr: string) => {
    setSelectedEmpIdx(idxStr);
    const idx = parseInt(idxStr, 10);
    if (isNaN(idx) || !masterEmployees[idx]) return;
    setEditingPayrollRecord(null);
    loadRecordIntoForm(masterEmployees[idx], null, false);
  };

  const applyImportedAttendanceRow = (
    row: AttendancePreviewRow,
    startISO: string,
    endISO: string,
    importedPeriodeLabel: string,
  ) => {
    setEditingDraftId(null);
    setEditingPayrollRecord(null);
    if (startISO) setRangeStart(startISO);
    if (endISO) setRangeEnd(endISO);
    if (importedPeriodeLabel) {
      setPeriodeTanggal(importedPeriodeLabel);
    } else if (startISO && endISO) {
      setPeriodeTanggal(formatDateRangeLabel(startISO, endISO));
    }
    setNama(row.nama);
    setNik(row.nik);
    setDivisi(row.divisi);
    setSiklusGaji(row.siklusGaji || 'Mingguan');
    if (row.divisi === 'Supir SPD') {
      setSupirSpdUnit(row.isTrip ? 'trip' : 'hari');
    }
    if (row.isTrip) {
      setTrip(String(row.tripInput || 0));
      setUpahTrip(formatNumberWithDots(row.upahPerTrip));
    } else {
      setHr(String(row.hariKerjaInput));
      setUpahHari(formatNumberWithDots(row.upahPerHari));
    }
    const hasHari = row.lemburHari > 0;
    const hasJam = row.jamLembur > 0;
    const hasInap = row.inap > 0;
    setActiveLembur({
      hari: hasHari,
      jam: hasJam || (!hasHari && !hasInap && !row.isTrip),
      inap: hasInap || (!hasHari && !hasJam && row.isTrip),
    });
    setLemburHari(String(row.lemburHari || 0));
    setUpahLemburHari(formatNumberWithDots(row.upahLemburHari));
    setLemburJam(String(row.jamLembur || 0));
    setLemburTambahan('0');
    setUpahJam(formatNumberWithDots(row.upahPerJam));
    setInap(String(row.inap || 0));
    setUpahInap(formatNumberWithDots(row.upahPerInap));
    setKasbon(formatNumberWithDots(row.kasbon || 0));
    setBpjs(formatNumberWithDots(row.bpjs || 0));
    setSaldoKasbon(formatNumberWithDots(getEmployeeKasbonSaldo(row.nik, row.nama)));
    setKeterangan(
      row.keterangan ||
        (row.isTrip
          ? `Import Excel: ${row.tripInput} Trip`
          : `Import Excel (${row.hariKerjaInput} HR)`),
    );
    setStatus('Draft');
    showToast(
      `Data gaji & nominal ${row.nama} dimuat ke form (${
        row.isTrip
          ? `${row.tripInput} Trip × ${formatRupiah(row.upahPerTrip)}`
          : `${row.hariKerjaInput} HR × ${formatRupiah(row.upahPerHari)}`
      }).`,
      'info',
    );
  };

  const resetForm = (keepContext = true) => {
    setSelectedEmpIdx('');
    setEditingDraftId(null);
    setEditingPayrollRecord(null);
    setNama('');
    setNik('');
    setHr(String(DEFAULT_PAYROLL_RATES.hariKerja));
    setUpahHari(formatNumberWithDots(DEFAULT_PAYROLL_RATES.upahPerHari));
    setTrip('0');
    setUpahTrip(formatNumberWithDots(DEFAULT_PAYROLL_RATES.upahPerTrip));
    setLemburHari('0');
    setUpahLemburHari(formatNumberWithDots(DEFAULT_PAYROLL_RATES.upahLemburHari));
    setLemburJam('0');
    setLemburTambahan('0');
    setUpahJam(formatNumberWithDots(DEFAULT_PAYROLL_RATES.upahPerJam));
    setInap('0');
    setUpahInap(formatNumberWithDots(DEFAULT_PAYROLL_RATES.upahPerInap));
    setKasbon('0');
    setBpjs('0');
    setKeterangan('');
    setSaldoKasbon('0');
    setStatus('Draft');
    if (!keepContext) {
      handleDivisiChange('Karyawan limbah');
    }
  };

  const buildPayload = (): PayrollRecord | null => {
    const cleanNama = nama.trim();
    const cleanNik = nik.trim().toUpperCase();
    if (!cleanNama || !cleanNik || !divisi) {
      showToast('Harap lengkapi Nama, No/NIK, dan Divisi.', 'warning');
      return null;
    }

    const hariKerjaVal = isTripMode ? 0 : parseFloat(hr) || 0;
    const upahHariVal = isTripMode ? 0 : cleanRupiahToNumber(upahHari);
    const tripVal = isTripMode ? parseFloat(trip) || 0 : 0;
    const upahTripVal = isTripMode ? cleanRupiahToNumber(upahTrip) : 0;

    const lHari = activeLembur.hari ? parseFloat(lemburHari) || 0 : 0;
    const lUpahHari = cleanRupiahToNumber(upahLemburHari);
    const lJam = activeLembur.jam ? parseFloat(lemburJam) || 0 : 0;
    const lJamTmb = activeLembur.jam ? parseFloat(lemburTambahan) || 0 : 0;
    const lUpahJam = cleanRupiahToNumber(upahJam);
    const lInap = activeLembur.inap ? parseFloat(inap) || 0 : 0;
    const lUpahInap = cleanRupiahToNumber(upahInap);

    const bp: string[] = [];
    if (lHari > 0) bp.push(`${lHari} Hari`);
    if (lJam + lJamTmb > 0) bp.push(`${lJam + lJamTmb} Jam`);
    if (lInap > 0) bp.push(`${lInap} Inap`);

    const lemburBreakdown = bp.join(' + ') || '0';
    const lemburJenis =
      bp.length > 1
        ? 'Campuran'
        : lInap > 0
          ? 'Menginap'
          : lHari > 0
            ? 'Harian'
            : 'Jam';
    const lemburVolume =
      lInap > 0 && lHari === 0 && lJam + lJamTmb === 0
        ? lInap
        : lHari > 0 && lJam + lJamTmb === 0 && lInap === 0
          ? lHari
          : lJam + lJamTmb;
    const lemburTarif =
      lemburJenis === 'Menginap'
        ? lUpahInap
        : lemburJenis === 'Harian'
          ? lUpahHari
          : lUpahJam;

    return {
      action: 'save',
      recordId: editingPayrollRecord?.recordId,
      localDraftId: editingDraftId || undefined,
      nama: cleanNama,
      nik: cleanNik,
      divisi,
      skema: divisi,
      tipe: divisi.toLowerCase(),
      siklusGaji,
      satuanPokok: isTripMode ? 'trip' : 'hari',
      periodeTanggal: periodeTanggal.trim(),
      periodeBulan: periodeTanggal.trim(),
      periodeWaktu: periodeTanggal.trim(),
      hariKerja: hariKerjaVal,
      hadir: hariKerjaVal || tripVal,
      spsHadir: hariKerjaVal || tripVal,
      spsAlpha: 0,
      upahPerHari: upahHariVal,
      trip: tripVal,
      upahPerTrip: upahTripVal,
      lemburHari: lHari,
      upahLemburHari: lUpahHari,
      nominalLemburHari: preview.nomHari,
      jamLembur: lJam,
      tambahanJamLembur: lJamTmb,
      upahPerJam: lUpahJam,
      nominalLemburJam: preview.nomJam,
      inap: lInap,
      upahPerInap: lUpahInap,
      nominalLemburInap: preview.nomInap,
      lemburJenis,
      lemburVolume,
      lemburTarif,
      lemburNominal: preview.totalLembur,
      lemburBreakdown,
      gapok: preview.gapok,
      tunjangan: 0,
      potAbsen: 0,
      pph: 0,
      gajiKotor: preview.kotor,
      kasbon: preview.kasbonVal,
      saldoKasbonAwal: cleanRupiahToNumber(saldoKasbon),
      sisaKasbonSetelah: preview.sisaKasbon,
      bpjs: preview.bpjsVal,
      keterangan: keterangan.trim(),
      totalPotongan: preview.potongan,
      thp: preview.thp,
      status,
      statusBayar: status,
      diinputOleh: user ? `${user.nama} (${user.username || user.email || 'admin'})` : 'Admin',
    };
  };

  const handleSaveLocalDraft = () => {
    const payload = buildPayload();
    if (!payload) return;
    saveLocalDraft(payload);
    showToast(
      `Draft gaji ${payload.nama} tersimpan lokal di browser (tidak dikirim ke SPS).`,
      'success',
    );
    resetForm(true);
  };

  const handleSave = async (advanceNext: boolean) => {
    const payload = buildPayload();
    if (!payload) return;

    setSubmitting(true);
    try {
      if (editingPayrollRecord) {
        const ok = await updatePayrollRecord(editingPayrollRecord, payload);
        if (ok) {
          setEditingPayrollRecord(null);
          resetForm(true);
          showToast(`Perubahan data gaji ${payload.nama} berhasil disimpan.`, 'success');
        }
        return;
      }

      const ok = await submitPayroll(payload);
      if (ok) {
        if (editingDraftId) {
          deleteLocalDraft(editingDraftId);
        }
        if (advanceNext) {
          const currentIdx = parseInt(selectedEmpIdx, 10);
          if (!isNaN(currentIdx) && currentIdx + 1 < masterEmployees.length) {
            applyMasterEmployee(String(currentIdx + 1));
          } else {
            resetForm(true);
          }
          showToast(`Data ${payload.nama} tersimpan ke SPS. Lanjut karyawan berikutnya.`, 'success');
        } else {
          resetForm(true);
          showToast(`Data gaji ${payload.nama} tersimpan ke Google SPS.`, 'success');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDraft = async (draft: PayrollRecord) => {
    if (!draft.localDraftId) return;
    const ok = await requestConfirm({
      title: 'Hapus Draft Gaji Lokal',
      message: `Hapus draft gaji lokal untuk ${draft.nama} (${draft.nik})?`,
      confirmLabel: 'Hapus Draft',
      danger: true,
    });
    if (ok) {
      deleteLocalDraft(draft.localDraftId);
      if (editingDraftId === draft.localDraftId) setEditingDraftId(null);
      showToast('Draft gaji lokal dihapus.', 'info');
    }
  };

  const handlePushDraftToSPS = async (draft: PayrollRecord) => {
    if (!draft.localDraftId || pushingDraftId || pushingAllProgress) return;
    setPushingDraftId(draft.localDraftId);
    try {
      const ok = await promoteDraftToSPS(draft.localDraftId);
      if (ok) {
        showToast(`Draft ${draft.nama} berhasil dikirim ke Google SPS.`, 'success');
      }
    } finally {
      setPushingDraftId(null);
    }
  };

  const handlePushAllDraftsToSPS = async () => {
    if (!localDrafts.length || pushingAllProgress || pushingDraftId) return;
    const ok = await requestConfirm({
      title: 'Kirim Semua Draft Lokal ke SPS',
      message: `Kirim ${localDrafts.length} karyawan dari Draft Gaji Lokal ke Google SPS sekarang? Setelah terkirim, semua nama akan muncul di Ringkasan, Karyawan, Slip Gaji, dan Laporan.`,
      confirmLabel: `Kirim ${localDrafts.length} Data ke SPS`,
    });
    if (!ok) return;

    const snapshot = [...localDrafts];
    let sent = 0;
    try {
      for (let i = 0; i < snapshot.length; i++) {
        const draft = snapshot[i];
        if (!draft.localDraftId) continue;
        setPushingAllProgress(`${i + 1}/${snapshot.length}`);
        const res = await promoteDraftToSPS(draft.localDraftId);
        if (res) sent++;
      }
      if (sent > 0) {
        showToast(
          `${sent} dari ${snapshot.length} data gaji berhasil dikirim ke Google SPS.`,
          'success',
        );
      }
    } finally {
      setPushingAllProgress(null);
    }
  };

  const scrollToDrafts = (flash = false) => {
    if (flash) {
      setHighlightDrafts(true);
      window.setTimeout(() => setHighlightDrafts(false), 2600);
    }
    window.setTimeout(() => {
      draftSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const handleExportLocalDrafts = () => {
    if (!exportPayrollToExcelMultiSheet(localDrafts)) {
      showToast('Belum ada draft gaji lokal untuk diekspor.', 'warning');
    } else {
      showToast(`Cadangan Excel (${localDrafts.length} draft lokal) berhasil diunduh.`, 'success');
    }
  };

  const totalDraftThp = useMemo(
    () => localDrafts.reduce((sum, d) => sum + calculateTHP(d).thp, 0),
    [localDrafts],
  );

  const pokokTitle =
    divisi === 'Supir B3'
      ? 'Gaji pokok (Trip)'
      : divisi === 'Supir SPD'
        ? supirSpdUnit === 'trip'
          ? 'Gaji pokok Supir SPD (Trip)'
          : 'Gaji pokok Supir SPD (Harian)'
        : 'Gaji pokok (Harian)';

  return (
    <section className="space-y-5">
      <PageHeader
        suiteLabel="Payroll"
        pageLabel="Input gaji"
        title={editingPayrollRecord ? 'Edit Data Gaji Karyawan' : 'Input Gaji Karyawan'}
        subtitle="Dukung sistem gaji Mingguan & Bulanan. Pilih karyawan untuk sinkronisasi divisi, siklus gaji, dan saldo kasbon otomatis."
        actions={
          <>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl t-card text-xs">
              <Calendar className="w-3.5 h-3.5 t-muted shrink-0" />
              <input
                type="text"
                value={periodeTanggal}
                onChange={(e) => setPeriodeTanggal(e.target.value)}
                aria-label="Periode tanggal"
                className="bg-transparent text-xs font-semibold t-text w-40 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowDatePicker((p) => !p)}
                className="text-[11px] t-link font-semibold hover:underline whitespace-nowrap"
              >
                Pilih
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 t-btn-primary rounded-xl text-xs whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Import Gaji / Absensi</span>
            </button>
            <button
              type="button"
              onClick={() => refreshPayroll(true)}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 t-btn-secondary rounded-xl text-xs font-semibold whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Tarik data SPS</span>
            </button>
          </>
        }
      />

      {showDatePicker && (
        <div className="t-card rounded-2xl p-3.5 flex flex-wrap items-center gap-3 text-xs">
          <span className="t-muted font-semibold">Atur Periode Tanggal:</span>
          <div className="flex items-center gap-2">
            <label className="t-muted">Dari:</label>
            <input
              type="date"
              value={rangeStart}
              onChange={(e) => {
                setRangeStart(e.target.value);
                setPeriodeTanggal(formatDateRangeLabel(e.target.value, rangeEnd));
              }}
              className="t-input rounded-lg px-2 py-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="t-muted">Sampai:</label>
            <input
              type="date"
              value={rangeEnd}
              onChange={(e) => {
                setRangeEnd(e.target.value);
                setPeriodeTanggal(formatDateRangeLabel(rangeStart, e.target.value));
              }}
              className="t-input rounded-lg px-2 py-1"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowDatePicker(false)}
            className="ml-auto px-3 py-1 t-btn-secondary rounded-lg font-semibold"
          >
            Tutup
          </button>
        </div>
      )}

      {editingPayrollRecord && (
        <div className="p-3.5 rounded-2xl t-status-warn flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Pencil className="w-4 h-4 shrink-0" />
            <span className="font-semibold">
              Mode Edit Data Gaji: <strong>{editingPayrollRecord.nama}</strong> (NIK{' '}
              <span className="font-mono-num">{editingPayrollRecord.nik}</span> &middot;{' '}
              {getPeriodeDisplay(editingPayrollRecord)}). Klik <b>Simpan Perubahan</b> untuk
              memperbarui data.
            </span>
          </div>
          <button
            type="button"
            onClick={() => resetForm(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl t-card text-xs font-bold t-text whitespace-nowrap"
          >
            <X className="w-3.5 h-3.5" />
            <span>Batal Edit</span>
          </button>
        </div>
      )}

      {localDrafts.length > 0 && (
        <div className="p-3.5 rounded-2xl t-status-info flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <HardDrive className="w-4 h-4 shrink-0" />
            <span className="font-semibold">
              <strong className="font-mono-num">{localDrafts.length} karyawan</strong> tersimpan di{' '}
              <strong>Draft Gaji Lokal</strong> (Total{' '}
              <span className="font-mono-num font-bold">{formatRupiah(totalDraftThp)}</span>) —
              hasil Import Absensi Excel &amp; simpan lokal tampil di tabel bawah.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => scrollToDrafts(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl t-card text-xs font-bold t-text whitespace-nowrap"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>Lihat Daftar ({localDrafts.length})</span>
            </button>
            <button
              type="button"
              disabled={Boolean(pushingAllProgress || pushingDraftId)}
              onClick={handlePushAllDraftsToSPS}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl t-btn-primary text-xs whitespace-nowrap disabled:opacity-60"
            >
              <CloudUpload className="w-3.5 h-3.5" />
              <span>
                {pushingAllProgress
                  ? `Mengirim ${pushingAllProgress}...`
                  : `Kirim Semua ke SPS (${localDrafts.length})`}
              </span>
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave(false);
        }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
      >
        {/* Left Form Column */}
        <div className="lg:col-span-8 t-card rounded-2xl p-5 sm:p-6 space-y-5">
          {/* Employee Info */}
          <div className="space-y-3">
            <div className="t-section-label">Karyawan</div>
            <select
              value={selectedEmpIdx}
              onChange={(e) => applyMasterEmployee(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl t-input font-semibold"
            >
              <option value="">-- Pilih Karyawan Terdaftar (Auto-Fill) atau Isi Manual --</option>
              {masterEmployees.map((emp, idx) => (
                <option key={`${emp.nik}-${idx}`} value={idx}>
                  {emp.nama} - {emp.nik || '-'} - {calculateTHP(emp).skema} ({getSiklusDisplay(emp)})
                </option>
              ))}
            </select>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block t-field-label mb-1">Nama Karyawan</label>
                <input
                  type="text"
                  list="employee-suggestions"
                  value={nama}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNama(val);
                    const prof = getEmployeeProfile(nik, val);
                    if (prof && !editingPayrollRecord) {
                      setSaldoKasbon(formatNumberWithDots(prof.kasbonSaldo));
                      setSiklusGaji(prof.siklusGaji);
                    }
                  }}
                  placeholder="Siti..."
                  required
                  className="w-full text-xs px-3 py-2.5 rounded-xl t-input font-semibold"
                />
                <datalist id="employee-suggestions">
                  {masterEmployees.map((emp, idx) => (
                    <option key={`${emp.nama}-${idx}`} value={emp.nama} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block t-field-label mb-1">No / NIK</label>
                <input
                  type="text"
                  value={nik}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNik(val);
                    const prof = getEmployeeProfile(val, nama);
                    if (prof && !editingPayrollRecord) {
                      setSaldoKasbon(formatNumberWithDots(prof.kasbonSaldo));
                      setSiklusGaji(prof.siklusGaji);
                    }
                  }}
                  placeholder="003"
                  required
                  className="w-full text-xs px-3 py-2.5 rounded-xl t-input uppercase font-mono-num font-bold"
                />
              </div>
              <div>
                <label className="block t-field-label mb-1">Divisi Otomatis</label>
                <select
                  value={divisi}
                  onChange={(e) => handleDivisiChange(e.target.value as DivisionName)}
                  required
                  className="w-full text-xs px-3 py-2.5 rounded-xl t-input font-bold"
                >
                  {DIVISIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block t-field-label mb-1">Siklus Gaji</label>
                <select
                  value={siklusGaji}
                  onChange={(e) => setSiklusGaji(e.target.value as PayrollCycle)}
                  required
                  className="w-full text-xs px-3 py-2.5 rounded-xl t-input font-bold"
                >
                  {PAYROLL_CYCLES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Gaji Pokok */}
          <div className="space-y-3 border-t t-border pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="t-section-label">{pokokTitle}</span>
              {divisi === 'Supir SPD' && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="t-muted">Hitungan Supir SPD:</span>
                  <button
                    type="button"
                    onClick={() => setSupirSpdUnit('trip')}
                    className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap ${
                      supirSpdUnit === 'trip' ? 't-status-info' : 't-btn-secondary'
                    }`}
                  >
                    Per Trip
                  </button>
                  <button
                    type="button"
                    onClick={() => setSupirSpdUnit('hari')}
                    className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap ${
                      supirSpdUnit === 'hari' ? 't-status-info' : 't-btn-secondary'
                    }`}
                  >
                    Per Hari (HR)
                  </button>
                </div>
              )}
            </div>

            {!isTripMode ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="px-3.5 py-2.5 rounded-xl t-input">
                  <label className="block t-field-label mb-1">Hari kerja (HR)</label>
                  <input
                    type="number"
                    value={hr}
                    onChange={(e) => setHr(e.target.value)}
                    min={0}
                    step={0.5}
                    className="w-full bg-transparent text-sm font-bold t-text font-mono-num focus:outline-none"
                  />
                </div>
                <div className="px-3.5 py-2.5 rounded-xl t-input">
                  <label className="block t-field-label mb-1">Upah per hari</label>
                  <input
                    type="text"
                    value={upahHari}
                    onChange={(e) => setUpahHari(formatCurrencyInput(e.target.value))}
                    className="w-full bg-transparent text-sm font-bold t-text font-mono-num focus:outline-none"
                  />
                </div>
                <div className="px-3.5 py-2.5 rounded-xl t-subtle border t-border-strong">
                  <label className="block t-field-label mb-1">Jumlah</label>
                  <div className="text-sm font-bold t-text font-mono-num">
                    {formatNumberWithDots(preview.gapok)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="px-3.5 py-2.5 rounded-xl t-input">
                  <label className="block t-field-label mb-1">Trip</label>
                  <input
                    type="number"
                    value={trip}
                    onChange={(e) => setTrip(e.target.value)}
                    min={0}
                    step={1}
                    className="w-full bg-transparent text-sm font-bold t-text font-mono-num focus:outline-none"
                  />
                </div>
                <div className="px-3.5 py-2.5 rounded-xl t-input">
                  <label className="block t-field-label mb-1">Upah per trip</label>
                  <input
                    type="text"
                    value={upahTrip}
                    onChange={(e) => setUpahTrip(formatCurrencyInput(e.target.value))}
                    className="w-full bg-transparent text-sm font-bold t-text font-mono-num focus:outline-none"
                  />
                </div>
                <div className="px-3.5 py-2.5 rounded-xl t-subtle border t-border-strong">
                  <label className="block t-field-label mb-1">Jumlah</label>
                  <div className="text-sm font-bold t-text font-mono-num">
                    {formatNumberWithDots(preview.gapok)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Lembur */}
          <div className="space-y-3 border-t t-border pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="t-section-label">Lembur</div>
                <div className="text-[11px] t-muted">Aktifkan Hari, Jam, atau Inap.</div>
              </div>
              <div className="text-xs font-bold font-mono-num t-link">
                {formatRupiah(preview.totalLembur)}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: 'hari', label: 'Lembur Harian (Hari)' },
                  { key: 'jam', label: 'Lembur Per Jam (Jam)' },
                  { key: 'inap', label: 'Lembur Menginap (Inap)' },
                ] as const
              ).map((opt) => {
                const on = activeLembur[opt.key];
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => toggleLembur(opt.key)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap ${
                      on ? 'font-bold t-status-info' : 'font-semibold t-btn-secondary'
                    }`}
                  >
                    {on ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {activeLembur.hari && (
              <div className="p-3.5 rounded-xl t-subtle border t-border-strong space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold t-text">Breakdown Lembur Harian</span>
                  <button
                    type="button"
                    onClick={() => toggleLembur('hari')}
                    className="t-muted hover:underline"
                  >
                    Tutup
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="px-3 py-2 rounded-xl t-input">
                    <label className="block t-field-label mb-1">Jumlah (Hari)</label>
                    <input
                      type="number"
                      value={lemburHari}
                      onChange={(e) => setLemburHari(e.target.value)}
                      min={0}
                      step={0.5}
                      className="w-full bg-transparent text-sm font-bold t-text font-mono-num focus:outline-none"
                    />
                  </div>
                  <div className="px-3 py-2 rounded-xl t-input">
                    <label className="block t-field-label mb-1">Upah/hari (Rp)</label>
                    <input
                      type="text"
                      value={upahLemburHari}
                      onChange={(e) => setUpahLemburHari(formatCurrencyInput(e.target.value))}
                      className="w-full bg-transparent text-sm font-bold t-text font-mono-num focus:outline-none"
                    />
                  </div>
                  <div className="px-3 py-2 rounded-xl t-card">
                    <label className="block t-field-label mb-1">Subtotal</label>
                    <div
                      className="text-sm font-bold font-mono-num"
                      style={{ color: 'var(--status-ok-text)' }}
                    >
                      {formatNumberWithDots(preview.nomHari)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeLembur.jam && (
              <div className="p-3.5 rounded-xl t-subtle border t-border-strong space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold t-text">Breakdown Lembur Per Jam</span>
                  <button
                    type="button"
                    onClick={() => toggleLembur('jam')}
                    className="t-muted hover:underline"
                  >
                    Tutup
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="px-3 py-2 rounded-xl t-input">
                    <label className="block t-field-label mb-1">Jam</label>
                    <input
                      type="number"
                      value={lemburJam}
                      onChange={(e) => setLemburJam(e.target.value)}
                      min={0}
                      step={0.5}
                      className="w-full bg-transparent text-sm font-bold t-text font-mono-num focus:outline-none"
                    />
                  </div>
                  <div className="px-3 py-2 rounded-xl t-input">
                    <label className="block t-field-label mb-1">Tambahan</label>
                    <input
                      type="number"
                      value={lemburTambahan}
                      onChange={(e) => setLemburTambahan(e.target.value)}
                      min={0}
                      step={0.5}
                      className="w-full bg-transparent text-sm font-bold t-link font-mono-num focus:outline-none"
                    />
                  </div>
                  <div className="px-3 py-2 rounded-xl t-input">
                    <label className="block t-field-label mb-1">Upah/jam</label>
                    <input
                      type="text"
                      value={upahJam}
                      onChange={(e) => setUpahJam(formatCurrencyInput(e.target.value))}
                      className="w-full bg-transparent text-sm font-bold t-text font-mono-num focus:outline-none"
                    />
                  </div>
                  <div className="px-3 py-2 rounded-xl t-card">
                    <label className="block t-field-label mb-1">Subtotal</label>
                    <div
                      className="text-sm font-bold font-mono-num"
                      style={{ color: 'var(--status-ok-text)' }}
                    >
                      {formatNumberWithDots(preview.nomJam)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeLembur.inap && (
              <div className="p-3.5 rounded-xl t-subtle border t-border-strong space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold t-text">Breakdown Lembur Menginap</span>
                  <button
                    type="button"
                    onClick={() => toggleLembur('inap')}
                    className="t-muted hover:underline"
                  >
                    Tutup
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="px-3 py-2 rounded-xl t-input">
                    <label className="block t-field-label mb-1">Jumlah Inap</label>
                    <input
                      type="number"
                      value={inap}
                      onChange={(e) => setInap(e.target.value)}
                      min={0}
                      step={1}
                      className="w-full bg-transparent text-sm font-bold t-text font-mono-num focus:outline-none"
                    />
                  </div>
                  <div className="px-3 py-2 rounded-xl t-input">
                    <label className="block t-field-label mb-1">Upah/inap</label>
                    <input
                      type="text"
                      value={upahInap}
                      onChange={(e) => setUpahInap(formatCurrencyInput(e.target.value))}
                      className="w-full bg-transparent text-sm font-bold t-text font-mono-num focus:outline-none"
                    />
                  </div>
                  <div className="px-3 py-2 rounded-xl t-card">
                    <label className="block t-field-label mb-1">Subtotal</label>
                    <div
                      className="text-sm font-bold font-mono-num"
                      style={{ color: 'var(--status-ok-text)' }}
                    >
                      {formatNumberWithDots(preview.nomInap)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Potongan */}
          <div className="space-y-3 border-t t-border pt-4">
            <div className="t-section-label">Potongan</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="px-3.5 py-2.5 rounded-xl t-input">
                <label className="block t-field-label mb-1">Kasbon</label>
                <input
                  type="text"
                  value={kasbon}
                  onChange={(e) => setKasbon(formatCurrencyInput(e.target.value))}
                  className="w-full bg-transparent text-sm font-bold t-text font-mono-num focus:outline-none"
                />
              </div>
              <div className="px-3.5 py-2.5 rounded-xl t-input">
                <label className="block t-field-label mb-1">BPJS</label>
                <input
                  type="text"
                  value={bpjs}
                  onChange={(e) => setBpjs(formatCurrencyInput(e.target.value))}
                  className="w-full bg-transparent text-sm font-bold t-text font-mono-num focus:outline-none"
                />
              </div>
              <div className="px-3.5 py-2.5 rounded-xl t-input">
                <label className="block t-field-label mb-1">Keterangan</label>
                <input
                  type="text"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  className="w-full bg-transparent text-sm font-bold t-text focus:outline-none"
                />
              </div>
            </div>

            <div className="px-3.5 py-2.5 rounded-xl t-status-warn flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="font-semibold flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Sisa kasbon setelah potongan ini:{' '}
                  <b className="font-mono-num">{formatRupiah(preview.sisaKasbon)}</b>
                  {matchedProfile && (
                    <span className="ml-1.5 text-[10px] opacity-80">
                      (tersinkron dari Data Karyawan)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="opacity-85">Saldo kasbon awal:</span>
                <input
                  type="text"
                  value={saldoKasbon}
                  onChange={(e) => setSaldoKasbon(formatCurrencyInput(e.target.value))}
                  className="w-24 px-2 py-0.5 rounded-lg t-input text-right font-mono-num"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t t-border">
            <div className="flex items-center gap-2">
              <label className="t-field-label">Status Bayar:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PayrollStatus)}
                className="text-xs px-3 py-1.5 rounded-xl t-input font-bold"
              >
                {PAYROLL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => resetForm(true)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold t-btn-secondary rounded-xl"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Formulir</span>
            </button>
          </div>
        </div>

        {/* Right Live Preview Summary */}
        <div className="lg:col-span-4 t-card rounded-2xl p-5 space-y-4 sticky top-6">
          <div className="flex items-center justify-between border-b t-border pb-3">
            <span className="t-section-label">Ringkasan</span>
            <PayrollStatusText status={status} />
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="t-muted">Siklus gaji</span>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  siklusGaji === 'Bulanan' ? 't-status-ok' : 't-status-info'
                }`}
              >
                {siklusGaji}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="t-muted">
                {isTripMode ? 'Gaji pokok (Trip)' : 'Gaji pokok (Harian)'}
              </span>
              <span className="font-mono-num t-text font-semibold">
                {formatNumberWithDots(preview.gapok)}
              </span>
            </div>

            {activeLembur.hari && (
              <div className="flex justify-between">
                <span className="t-muted">Lembur Harian</span>
                <span
                  className="font-mono-num font-semibold"
                  style={{ color: 'var(--status-ok-text)' }}
                >
                  {formatNumberWithDots(preview.nomHari)}
                </span>
              </div>
            )}

            {activeLembur.jam && (
              <div className="flex justify-between">
                <span className="t-muted">Lembur Jam</span>
                <span
                  className="font-mono-num font-semibold"
                  style={{ color: 'var(--status-ok-text)' }}
                >
                  {formatNumberWithDots(preview.nomJam)}
                </span>
              </div>
            )}

            {activeLembur.inap && (
              <div className="flex justify-between">
                <span className="t-muted">Menginap (Inap)</span>
                <span
                  className="font-mono-num font-semibold"
                  style={{ color: 'var(--status-ok-text)' }}
                >
                  {formatNumberWithDots(preview.nomInap)}
                </span>
              </div>
            )}

            <div className="flex justify-between border-t t-border pt-2">
              <span className="t-text font-semibold">Gaji kotor</span>
              <span className="font-mono-num t-text font-bold">
                {formatNumberWithDots(preview.kotor)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="t-muted">Potongan</span>
              <span
                className="font-mono-num font-semibold"
                style={{ color: 'var(--status-bad-text)' }}
              >
                -{formatNumberWithDots(preview.potongan)}
              </span>
            </div>
          </div>

          <div className="border-t t-border pt-3">
            <div className="t-field-label">Gaji bersih</div>
            <div className="text-2xl font-display t-text mt-1 tabular-nums">
              {formatRupiah(preview.thp)}
            </div>
          </div>

          <div className="space-y-2 pt-2">
            {editingPayrollRecord ? (
              <>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl t-btn-primary text-xs inline-flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Menyimpan...' : 'Simpan Perubahan Gaji'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => resetForm(true)}
                  className="w-full py-2.5 rounded-xl t-btn-secondary font-semibold text-xs inline-flex items-center justify-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Batal Edit</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSaveLocalDraft}
                  className="w-full py-2.5 rounded-xl t-btn-primary text-xs inline-flex items-center justify-center gap-1.5"
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>{editingDraftId ? 'Update Draft Lokal' : 'Simpan Draft Lokal'}</span>
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl t-btn-secondary font-semibold text-xs inline-flex items-center justify-center gap-1.5"
                >
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Mengirim ke SPS...' : 'Simpan ke SPS'}</span>
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSave(true)}
                  className="w-full py-2.5 rounded-xl t-btn-secondary font-semibold text-xs inline-flex items-center justify-center gap-1.5"
                >
                  <span>Simpan ke SPS &amp; Berikutnya</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </form>

      {/* Local Drafts Section (Saved in Browser, Exportable as Excel Backup) */}
      <div
        ref={draftSectionRef}
        className={`t-card rounded-2xl overflow-hidden transition-all duration-300 ${
          highlightDrafts ? 'ring-2 ring-[var(--accent-brand)] shadow-lg' : ''
        }`}
      >
        <div className="p-4 border-b t-border flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 t-section-label">
              <HardDrive className="w-4 h-4 t-link" />
              <span>Draft Gaji Lokal ({localDrafts.length} Karyawan)</span>
            </div>
            <p className="text-[11px] t-muted mt-0.5">
              Semua nama hasil <b>Import Absensi Excel</b> (multi-karyawan) dan simpan draft muncul
              di sini. Klik <b>Edit</b> untuk melengkapi Trip/Inap/Kasbon, atau{' '}
              <b>Kirim Semua ke SPS</b> agar tampil di Slip Gaji &amp; Laporan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {localDrafts.length > 0 && (
              <span className="text-xs font-mono-num font-bold t-text">
                Total: {formatRupiah(totalDraftThp)}
              </span>
            )}
            <button
              type="button"
              disabled={localDrafts.length === 0 || Boolean(pushingAllProgress || pushingDraftId)}
              onClick={handlePushAllDraftsToSPS}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-primary text-xs whitespace-nowrap disabled:opacity-50"
            >
              <CloudUpload className="w-3.5 h-3.5" />
              <span>
                {pushingAllProgress
                  ? `Mengirim ${pushingAllProgress}...`
                  : 'Kirim Semua ke SPS'}
              </span>
            </button>
            <button
              type="button"
              disabled={localDrafts.length === 0}
              onClick={handleExportLocalDrafts}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Cadangan Excel</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="t-subtle border-b t-border">
                <th className="py-3 px-4 t-th-label">Karyawan &amp; NIK</th>
                <th className="py-3 px-3 t-th-label">Divisi &amp; Periode</th>
                <th className="py-3 px-3 t-th-label text-right">HR / Trip</th>
                <th className="py-3 px-3 t-th-label text-right">Lembur</th>
                <th className="py-3 px-3 t-th-label text-right">Potongan</th>
                <th className="py-3 px-3 t-th-label text-right">Gaji Bersih</th>
                <th className="py-3 px-4 t-th-label text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y t-border">
              {localDrafts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center t-muted">
                    Belum ada draft gaji lokal. Gunakan <b>Import Absensi Excel</b> atau klik{' '}
                    <b>Simpan Draft Lokal</b> pada formulir di atas.
                  </td>
                </tr>
              ) : (
                localDrafts.map((d, idx) => {
                  const c = calculateTHP(d);
                  const isEditingThis = Boolean(editingDraftId && editingDraftId === d.localDraftId);
                  const isPushing = Boolean(pushingDraftId && pushingDraftId === d.localDraftId);
                  return (
                    <tr
                      key={d.localDraftId || `${d.nik}-${idx}`}
                      className={isEditingThis ? 't-subtle' : 't-row-hover'}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold t-text">{d.nama}</div>
                        <div className="text-[10px] t-muted font-mono-num">NIK {d.nik}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold t-text">{c.skema}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              getSiklusDisplay(d) === 'Bulanan' ? 't-status-ok' : 't-status-info'
                            }`}
                          >
                            {getSiklusDisplay(d)}
                          </span>
                        </div>
                        <div className="text-[10px] t-muted">{getPeriodeDisplay(d)}</div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num font-semibold t-text">
                        {c.isTrip ? `${c.unitPokok} Trip` : `${c.unitPokok} HR`}
                      </td>
                      <td
                        className="py-3 px-3 text-right font-mono-num font-semibold"
                        style={{ color: 'var(--status-ok-text)' }}
                      >
                        {formatRupiah(c.lemburNominal)}
                      </td>
                      <td
                        className="py-3 px-3 text-right font-mono-num"
                        style={{ color: 'var(--status-bad-text)' }}
                      >
                        {c.totalPot > 0 ? `-${formatRupiah(c.totalPot)}` : 'Rp 0'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num font-bold t-text">
                        {formatRupiah(c.thp)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              loadRecordIntoForm(d, d.localDraftId || null);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="inline-flex items-center gap-1 t-link font-semibold hover:underline"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            disabled={isPushing}
                            onClick={() => handlePushDraftToSPS(d)}
                            className="inline-flex items-center gap-1 font-semibold hover:underline disabled:opacity-50"
                            style={{ color: 'var(--status-ok-text)' }}
                          >
                            <CloudUpload className="w-3 h-3" />
                            <span>{isPushing ? 'Mengirim...' : 'Kirim SPS'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDraft(d)}
                            className="inline-flex items-center gap-1 font-semibold hover:underline"
                            style={{ color: 'var(--status-bad-text)' }}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
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

      {/* Modal Import Gaji & Absensi Excel */}
      <AttendanceImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        initialStartISO={rangeStart}
        initialEndISO={rangeEnd}
        initialPeriodeLabel={periodeTanggal}
        onApplyToForm={applyImportedAttendanceRow}
        onSavedBatchDrafts={(count, sISO, eISO, pLabel) => {
          if (sISO) setRangeStart(sISO);
          if (eISO) setRangeEnd(eISO);
          if (pLabel) setPeriodeTanggal(pLabel);
          else if (sISO && eISO) setPeriodeTanggal(formatDateRangeLabel(sISO, eISO));
          showToast(
            `${count} karyawan berhasil masuk ke Draft Gaji Lokal & tarif masing-masing karyawan telah diperbarui.`,
            'success',
          );
          scrollToDrafts(true);
        }}
        onImportedDirect={(summary, sISO, eISO, pLabel) => {
          if (sISO) setRangeStart(sISO);
          if (eISO) setRangeEnd(eISO);
          if (pLabel) setPeriodeTanggal(pLabel);
          else if (sISO && eISO) setPeriodeTanggal(formatDateRangeLabel(sISO, eISO));
          const parts: string[] = [];
          if (summary.updated > 0) parts.push(`${summary.updated} data diperbarui`);
          if (summary.created > 0) parts.push(`${summary.created} data baru disimpan`);
          if (summary.failed > 0) parts.push(`${summary.failed} gagal`);
          showToast(
            `Import gaji selesai (${parts.join(', ')}). Nominal upah & lembur tiap karyawan sudah ter-update otomatis.`,
            summary.failed > 0 ? 'warning' : 'success',
          );
        }}
      />
    </section>
  );
}
