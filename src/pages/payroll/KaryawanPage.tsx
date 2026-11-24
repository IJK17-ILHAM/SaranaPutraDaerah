import {
  ArrowDownCircle,
  ArrowUpCircle,
  BadgeCheck,
  Banknote,
  Briefcase,
  Building2,
  CalendarRange,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  History,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  User,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { RingkasanSpotIcon } from '../../components/common/RingkasanSpotIcons';
import { BankAccountBadge, PaymentStatusSelect } from '../../components/payroll/PaymentStatusSelect';
import {
  DEFAULT_PAYROLL_RATES,
  DIVISIONS,
  PAYROLL_CYCLES,
  PAYROLL_STATUSES,
} from '../../config/constants';
import { useApp } from '../../context/AppContext';
import { usePayroll } from '../../context/PayrollContext';
import type { DivisionName, EmployeeProfile, PayrollCycle, PayrollRecord } from '../../types/payroll';
import { exportPayrollToExcelMultiSheet } from '../../utils/exportExcel';
import {
  cleanRupiahToNumber,
  formatCurrencyInput,
  formatNumberWithDots,
  formatRupiah,
  todayISO,
} from '../../utils/format';
import {
  calculateTHP,
  getPeriodeDisplay,
  getSiklusDisplay,
  getStatusDisplay,
} from '../../utils/payrollCalc';

type ActiveTab = 'employees' | 'rekap';

interface EmployeeFormState {
  id?: string;
  nama: string;
  nik: string;
  divisi: DivisionName;
  siklusGaji: PayrollCycle;
  satuanPokok: 'trip' | 'hari';
  upahDefault: string;
  namaBank: string;
  noRekening: string;
  atasNamaRekening: string;
  kasbonSaldo: string;
  catatan: string;
}

const COMMON_BANKS = [
  'BCA',
  'BRI',
  'Mandiri',
  'BNI',
  'BSI',
  'CIMB Niaga',
  'Danamon',
  'Permata',
  'BTN',
  'Bank BJB',
  'Bank DKI',
  'SeaBank',
  'Bank Jago',
  'OCBC',
];

const EMPTY_EMP_FORM: EmployeeFormState = {
  nama: '',
  nik: '',
  divisi: 'Karyawan limbah',
  siklusGaji: 'Mingguan',
  satuanPokok: 'hari',
  upahDefault: formatNumberWithDots(DEFAULT_PAYROLL_RATES.upahPerHari),
  namaBank: '',
  noRekening: '',
  atasNamaRekening: '',
  kasbonSaldo: '0',
  catatan: '',
};

export function KaryawanPage() {
  const { theme, setActiveMenu, openSlipModal, showToast, requestConfirm } = useApp();
  const {
    records,
    filteredRecords,
    employeeProfiles,
    periodOptions,
    divisiOptions,
    filters,
    setFilter,
    saveEmployeeProfile,
    deleteEmployeeProfile,
    adjustEmployeeKasbon,
    getEmployeeProfile,
    getEmployeeKasbonSaldo,
    setEditingPayrollRecord,
    updatePayrollStatus,
    deletePayrollRecord,
  } = usePayroll();

  const onDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<ActiveTab>('employees');

  // Filters for Tab 1 (Daftar Karyawan & Kasbon)
  const [empSearch, setEmpSearch] = useState('');
  const [empDivisi, setEmpDivisi] = useState('ALL');
  const [empSiklus, setEmpSiklus] = useState('ALL');
  const [empKasbonFilter, setEmpKasbonFilter] = useState<'ALL' | 'HAS_DEBT' | 'LUNAS'>('ALL');

  // Add/Edit Employee Modal
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [empForm, setEmpForm] = useState<EmployeeFormState>(EMPTY_EMP_FORM);

  // Kasbon Ledger Modal
  const [kasbonTargetId, setKasbonTargetId] = useState<string | null>(null);
  const [kasbonJenis, setKasbonJenis] = useState<'Pinjaman' | 'Cicilan'>('Pinjaman');
  const [kasbonNominal, setKasbonNominal] = useState('');
  const [kasbonTanggal, setKasbonTanggal] = useState(todayISO());
  const [kasbonKet, setKasbonKet] = useState('');

  const kasbonTarget: EmployeeProfile | undefined = useMemo(
    () => employeeProfiles.find((e) => e.id === kasbonTargetId),
    [employeeProfiles, kasbonTargetId],
  );

  // KPI aggregates
  const kpiStats = useMemo(() => {
    const mingguanCount = employeeProfiles.filter((e) => e.siklusGaji === 'Mingguan').length;
    const bulananCount = employeeProfiles.filter((e) => e.siklusGaji === 'Bulanan').length;
    const totalKasbon = employeeProfiles.reduce((sum, e) => sum + (Number(e.kasbonSaldo) || 0), 0);
    const karyawanBerkasbon = employeeProfiles.filter((e) => (Number(e.kasbonSaldo) || 0) > 0).length;
    const totalRekapThp = filteredRecords.reduce((sum, r) => sum + calculateTHP(r).thp, 0);
    return {
      totalKaryawan: employeeProfiles.length,
      mingguanCount,
      bulananCount,
      totalKasbon,
      karyawanBerkasbon,
      totalRekapThp,
    };
  }, [employeeProfiles, filteredRecords]);

  // Filtered employee list for Tab 1
  const filteredEmployees = useMemo(() => {
    const q = empSearch.trim().toLowerCase();
    return employeeProfiles.filter((emp) => {
      if (empDivisi !== 'ALL' && emp.divisi.toLowerCase() !== empDivisi.toLowerCase()) return false;
      if (empSiklus !== 'ALL' && emp.siklusGaji.toLowerCase() !== empSiklus.toLowerCase()) return false;
      if (empKasbonFilter === 'HAS_DEBT' && emp.kasbonSaldo <= 0) return false;
      if (empKasbonFilter === 'LUNAS' && emp.kasbonSaldo > 0) return false;
      if (
        q &&
        !emp.nama.toLowerCase().includes(q) &&
        !emp.nik.toLowerCase().includes(q) &&
        !emp.divisi.toLowerCase().includes(q) &&
        !(emp.namaBank || '').toLowerCase().includes(q) &&
        !(emp.noRekening || '').toLowerCase().includes(q) &&
        !(emp.atasNamaRekening || '').toLowerCase().includes(q) &&
        !(emp.catatan || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [employeeProfiles, empSearch, empDivisi, empSiklus, empKasbonFilter]);

  const handleExport = () => {
    const items = filteredRecords.length ? filteredRecords : records;
    if (!exportPayrollToExcelMultiSheet(items)) {
      showToast('Tidak ada data rekap gaji untuk diekspor.', 'warning');
    }
  };

  const openCreateEmployee = () => {
    setEmpForm(EMPTY_EMP_FORM);
    setEmpModalOpen(true);
  };

  const openEditEmployee = (emp: EmployeeProfile) => {
    const safeDiv: DivisionName =
      emp.divisi === 'Supir B3' || emp.divisi === 'Supir SPD' ? emp.divisi : 'Karyawan limbah';
    const isTrip = safeDiv === 'Supir B3' || (safeDiv === 'Supir SPD' && emp.satuanPokok === 'trip');
    setEmpForm({
      id: emp.id,
      nama: emp.nama,
      nik: emp.nik,
      divisi: safeDiv,
      siklusGaji: emp.siklusGaji || 'Mingguan',
      satuanPokok: isTrip ? 'trip' : 'hari',
      upahDefault: formatNumberWithDots(
        emp.upahDefault ||
          (isTrip ? DEFAULT_PAYROLL_RATES.upahPerTrip : DEFAULT_PAYROLL_RATES.upahPerHari),
      ),
      namaBank: emp.namaBank || '',
      noRekening: emp.noRekening || '',
      atasNamaRekening: emp.atasNamaRekening || '',
      kasbonSaldo: formatNumberWithDots(emp.kasbonSaldo || 0),
      catatan: emp.catatan || '',
    });
    setEmpModalOpen(true);
  };

  const handleEmployeeDivisiChange = (nextDiv: DivisionName) => {
    const isTrip = nextDiv === 'Supir B3' || nextDiv === 'Supir SPD';
    setEmpForm((prev) => ({
      ...prev,
      divisi: nextDiv,
      satuanPokok: isTrip ? 'trip' : 'hari',
      upahDefault: formatNumberWithDots(
        isTrip ? DEFAULT_PAYROLL_RATES.upahPerTrip : DEFAULT_PAYROLL_RATES.upahPerHari,
      ),
    }));
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.nama.trim() || !empForm.nik.trim()) {
      showToast('Harap lengkapi Nama dan No / NIK karyawan.', 'warning');
      return;
    }

    const isEditing = Boolean(empForm.id);
    saveEmployeeProfile({
      id: empForm.id,
      nama: empForm.nama.trim(),
      nik: empForm.nik.trim().toUpperCase(),
      divisi: empForm.divisi,
      siklusGaji: empForm.siklusGaji,
      satuanPokok:
        empForm.divisi === 'Supir B3'
          ? 'trip'
          : empForm.divisi === 'Karyawan limbah'
            ? 'hari'
            : empForm.satuanPokok,
      upahDefault: cleanRupiahToNumber(empForm.upahDefault),
      namaBank: empForm.namaBank.trim(),
      noRekening: empForm.noRekening.trim(),
      atasNamaRekening: empForm.atasNamaRekening.trim(),
      kasbonSaldo: cleanRupiahToNumber(empForm.kasbonSaldo),
      catatan: empForm.catatan,
    });

    setEmpModalOpen(false);
    showToast(
      isEditing
        ? `Data karyawan ${empForm.nama.trim()} berhasil diperbarui.`
        : `Karyawan ${empForm.nama.trim()} berhasil ditambahkan.`,
      'success',
    );
  };

  const handleDeleteEmployee = async (emp: EmployeeProfile) => {
    const ok = await requestConfirm({
      title: 'Hapus Data Karyawan',
      message: `Hapus profil karyawan ${emp.nama} (NIK ${emp.nik}) beserta catatan kasbonnya (${formatRupiah(emp.kasbonSaldo)})? Data rekap gaji lama tetap tersimpan di tab Rekap Gaji.`,
      confirmLabel: 'Hapus Karyawan',
      danger: true,
    });
    if (!ok) return;
    deleteEmployeeProfile(emp.id);
    showToast(`Data karyawan ${emp.nama} berhasil dihapus.`, 'info');
  };

  const openKasbonModal = (emp: EmployeeProfile) => {
    setKasbonTargetId(emp.id);
    setKasbonJenis('Pinjaman');
    setKasbonNominal('');
    setKasbonTanggal(todayISO());
    setKasbonKet('');
  };

  const handleSaveKasbonEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kasbonTarget) return;
    const nom = cleanRupiahToNumber(kasbonNominal);
    if (nom <= 0) {
      showToast('Masukkan nominal hutang / cicilan lebih dari Rp 0.', 'warning');
      return;
    }
    adjustEmployeeKasbon(kasbonTarget.id, {
      jenis: kasbonJenis,
      nominal: nom,
      tanggal: kasbonTanggal || todayISO(),
      keterangan: kasbonKet,
    });
    setKasbonNominal('');
    setKasbonKet('');
    showToast(
      kasbonJenis === 'Pinjaman'
        ? `Pinjaman kasbon ${formatRupiah(nom)} untuk ${kasbonTarget.nama} dicatat.`
        : `Cicilan kasbon ${formatRupiah(nom)} dari ${kasbonTarget.nama} dicatat.`,
      'success',
    );
  };

  const handleEditPayrollRow = (item: PayrollRecord) => {
    setEditingPayrollRecord(item);
    setActiveMenu('menu-input');
  };

  const handleDeletePayrollRow = async (item: PayrollRecord) => {
    const periode = getPeriodeDisplay(item);
    const ok = await requestConfirm({
      title: 'Hapus Data Rekap Gaji',
      message: `Hapus data gaji ${item.nama} (NIK ${item.nik}) periode ${periode} sebesar ${formatRupiah(calculateTHP(item).thp)}?`,
      confirmLabel: 'Hapus Data Gaji',
      danger: true,
    });
    if (!ok) return;
    await deletePayrollRecord(item);
    showToast(`Data gaji ${item.nama} (${periode}) berhasil dihapus.`, 'info');
  };

  const kasbonPreviewNextSaldo = useMemo(() => {
    if (!kasbonTarget) return 0;
    const nom = cleanRupiahToNumber(kasbonNominal);
    return kasbonJenis === 'Pinjaman'
      ? kasbonTarget.kasbonSaldo + nom
      : Math.max(0, kasbonTarget.kasbonSaldo - nom);
  }, [kasbonTarget, kasbonJenis, kasbonNominal]);

  return (
    <section className="space-y-5">
      <PageHeader
        suiteLabel="Payroll"
        pageLabel="Karyawan"
        title="Data Karyawan & Rekap Gaji"
        subtitle="Kelola profil karyawan Mingguan & Bulanan, saldo hutang/kasbon per karyawan, serta monitoring rekap gaji seluruh divisi."
        actions={
          <>
            <button
              type="button"
              onClick={openCreateEmployee}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-primary text-xs whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tambah Karyawan</span>
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingPayrollRecord(null);
                setActiveMenu('menu-input');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Input Gaji Baru</span>
            </button>
          </>
        }
      />

      {/* 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="t-card rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="t-field-label">Total Karyawan Aktif</div>
            <div className="text-2xl font-display t-text mt-1 tabular-nums">
              {kpiStats.totalKaryawan} <span className="text-xs font-sans t-muted font-semibold">Orang</span>
            </div>
            <div className="text-[11px] t-muted mt-1">
              {kpiStats.mingguanCount} Mingguan &middot; {kpiStats.bulananCount} Bulanan
            </div>
          </div>
          <RingkasanSpotIcon kind="karyawan" size={44} onDark={onDark} className="shrink-0" />
        </div>

        <div className="t-card rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="t-field-label">Total Hutang / Kasbon Aktif</div>
            <div
              className="text-2xl font-display mt-1 tabular-nums"
              style={{
                color: kpiStats.totalKasbon > 0 ? 'var(--status-warn-text)' : 'var(--status-ok-text)',
              }}
            >
              {formatRupiah(kpiStats.totalKasbon)}
            </div>
            <div className="text-[11px] t-muted mt-1">
              {kpiStats.karyawanBerkasbon} karyawan memiliki saldo kasbon
            </div>
          </div>
          <RingkasanSpotIcon kind="potongan" size={44} onDark={onDark} className="shrink-0" />
        </div>

        <div className="t-card rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="t-field-label">Total Gaji Bersih (Rekap)</div>
            <div className="text-2xl font-display t-text mt-1 tabular-nums">
              {formatRupiah(kpiStats.totalRekapThp)}
            </div>
            <div className="text-[11px] t-muted mt-1">
              {filteredRecords.length} data gaji (Mingguan &amp; Bulanan)
            </div>
          </div>
          <RingkasanSpotIcon kind="gaji" size={44} onDark={onDark} className="shrink-0" />
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b t-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('employees')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'employees' ? 't-btn-primary' : 't-btn-secondary'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Daftar Karyawan &amp; Kasbon ({employeeProfiles.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rekap')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'rekap' ? 't-btn-primary' : 't-btn-secondary'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Rekap Gaji Mingguan &amp; Bulanan ({filteredRecords.length})</span>
        </button>
      </div>

      {/* TAB 1: DAFTAR KARYAWAN & KASBON */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="t-card p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block t-field-label mb-1">Cari Karyawan</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 t-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  placeholder="Nama / NIK / No. Rekening..."
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-xl t-input"
                />
              </div>
            </div>
            <div>
              <label className="block t-field-label mb-1">Divisi Utama</label>
              <select
                value={empDivisi}
                onChange={(e) => setEmpDivisi(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl t-input"
              >
                <option value="ALL">Semua Divisi</option>
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
                value={empSiklus}
                onChange={(e) => setEmpSiklus(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl t-input"
              >
                <option value="ALL">Semua (Mingguan &amp; Bulanan)</option>
                {PAYROLL_CYCLES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block t-field-label mb-1">Status Hutang / Kasbon</label>
              <select
                value={empKasbonFilter}
                onChange={(e) => setEmpKasbonFilter(e.target.value as 'ALL' | 'HAS_DEBT' | 'LUNAS')}
                className="w-full text-xs px-3 py-2 rounded-xl t-input"
              >
                <option value="ALL">Semua Karyawan</option>
                <option value="HAS_DEBT">Ada Hutang / Kasbon</option>
                <option value="LUNAS">Lunas (Rp 0)</option>
              </select>
            </div>
          </div>

          {/* Employee Table */}
          <div className="t-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="t-subtle border-b t-border">
                    <th className="py-3.5 px-4 t-th-label">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 t-muted" />
                        <span>Karyawan &amp; NIK</span>
                      </span>
                    </th>
                    <th className="py-3.5 px-3 t-th-label">
                      <span className="inline-flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 t-muted" />
                        <span>Divisi</span>
                      </span>
                    </th>
                    <th className="py-3.5 px-3 t-th-label">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 t-muted" />
                        <span>Rekening Bank</span>
                      </span>
                    </th>
                    <th className="py-3.5 px-3 t-th-label text-center">
                      <span className="inline-flex items-center justify-center gap-1.5">
                        <CalendarRange className="w-3.5 h-3.5 t-muted" />
                        <span>Siklus Gaji</span>
                      </span>
                    </th>
                    <th className="py-3.5 px-3 t-th-label text-right">
                      <span className="inline-flex items-center justify-end gap-1.5">
                        <Banknote className="w-3.5 h-3.5 t-muted" />
                        <span>Upah Default</span>
                      </span>
                    </th>
                    <th className="py-3.5 px-3 t-th-label text-right">
                      <span className="inline-flex items-center justify-end gap-1.5">
                        <Wallet className="w-3.5 h-3.5 t-muted" />
                        <span>Hutang / Kasbon</span>
                      </span>
                    </th>
                    <th className="py-3.5 px-4 t-th-label text-center">
                      <span className="inline-flex items-center justify-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 t-muted" />
                        <span>Aksi</span>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y t-border">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center t-muted">
                        Belum ada data karyawan yang cocok. Klik <b>Tambah Karyawan</b> untuk
                        mendaftarkan karyawan Mingguan atau Bulanan.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const hasDebt = emp.kasbonSaldo > 0;
                      const historyCount = emp.kasbonHistory?.length || 0;
                      const unitLabel = emp.satuanPokok === 'trip' ? '/trip' : '/hari';
                      return (
                        <tr key={emp.id} className="t-row-hover">
                          <td className="py-3 px-4">
                            <div className="font-bold t-text">{emp.nama}</div>
                            <div className="text-[11px] t-muted font-mono-num">
                              NIK {emp.nik}
                              {emp.catatan ? ` · ${emp.catatan}` : ''}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-semibold t-text">{emp.divisi}</td>
                          <td className="py-3 px-3">
                            <BankAccountBadge
                              namaBank={emp.namaBank}
                              noRekening={emp.noRekening}
                              atasNama={emp.atasNamaRekening}
                              employeeName={emp.nama}
                              onEmptyAction={() => openEditEmployee(emp)}
                              emptyActionLabel="Isi rekening"
                            />
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                                emp.siklusGaji === 'Bulanan' ? 't-status-ok' : 't-status-info'
                              }`}
                            >
                              {emp.siklusGaji}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono-num t-text">
                            {emp.upahDefault ? (
                              <>
                                <span className="font-semibold">{formatRupiah(emp.upahDefault)}</span>
                                <span className="text-[10px] t-muted ml-0.5">{unitLabel}</span>
                              </>
                            ) : (
                              <span className="t-muted">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div
                              className="font-mono-num font-bold text-xs"
                              style={{
                                color: hasDebt
                                  ? 'var(--status-bad-text)'
                                  : 'var(--status-ok-text)',
                              }}
                            >
                              {hasDebt ? formatRupiah(emp.kasbonSaldo) : 'Lunas (Rp 0)'}
                            </div>
                            <div className="text-[10px] t-muted">
                              {historyCount > 0 ? `${historyCount} catatan mutasi` : 'Belum ada mutasi'}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="inline-flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => openKasbonModal(emp)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl t-status-warn text-[11px] font-bold hover:opacity-90"
                                title="Kelola Hutang / Kasbon"
                              >
                                <Wallet className="w-3 h-3" />
                                <span>Kasbon</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditEmployee(emp)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl t-btn-secondary text-[11px] font-bold"
                                title="Edit Profil Karyawan"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteEmployee(emp)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl t-btn-secondary text-[11px] font-bold"
                                style={{ color: 'var(--status-bad-text)' }}
                                title="Hapus Karyawan"
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
        </div>
      )}

      {/* TAB 2: REKAP GAJI (MINGGUAN & BULANAN) */}
      {activeTab === 'rekap' && (
        <div className="space-y-4">
          {/* 6 Filter Controls */}
          <div className="t-card p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
              <label className="block t-field-label mb-1">Cari Karyawan</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilter('search', e.target.value)}
                placeholder="Nama / No / NIK..."
                className="w-full text-xs px-3 py-2 rounded-xl t-input"
              />
            </div>
            <div>
              <label className="block t-field-label mb-1">Divisi Utama</label>
              <select
                value={filters.skema}
                onChange={(e) => setFilter('skema', e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl t-input"
              >
                <option value="ALL">Semua Divisi</option>
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
                value={filters.siklus}
                onChange={(e) => setFilter('siklus', e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl t-input"
              >
                <option value="ALL">Semua Siklus</option>
                {PAYROLL_CYCLES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block t-field-label mb-1">Bagian</label>
              <select
                value={filters.divisi}
                onChange={(e) => setFilter('divisi', e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl t-input"
              >
                <option value="ALL">Semua Bagian</option>
                {divisiOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block t-field-label mb-1">Periode</label>
              <select
                value={filters.periode}
                onChange={(e) => setFilter('periode', e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl t-input"
              >
                <option value="ALL">Semua Periode</option>
                {periodOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block t-field-label mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilter('status', e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl t-input"
              >
                <option value="ALL">Semua Status</option>
                {PAYROLL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rekap Gaji Data Table */}
          <div className="t-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="t-subtle border-b t-border">
                    <th className="py-3.5 px-4 t-th-label">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 t-muted" />
                        <span>Karyawan &amp; Divisi</span>
                      </span>
                    </th>
                    <th className="py-3.5 px-3 t-th-label">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarRange className="w-3.5 h-3.5 t-muted" />
                        <span>Siklus &amp; Periode</span>
                      </span>
                    </th>
                    <th className="py-3.5 px-3 t-th-label text-center">
                      <span className="inline-flex items-center justify-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 t-muted" />
                        <span>HR / Trip</span>
                      </span>
                    </th>
                    <th className="py-3.5 px-3 t-th-label text-right">
                      <span className="inline-flex items-center justify-end gap-1.5">
                        <Banknote className="w-3.5 h-3.5 t-muted" />
                        <span>Gaji Pokok</span>
                      </span>
                    </th>
                    <th className="py-3.5 px-3 t-th-label text-right">
                      <span className="inline-flex items-center justify-end gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 t-muted" />
                        <span>Lembur</span>
                      </span>
                    </th>
                    <th className="py-3.5 px-3 t-th-label text-right">
                      <span className="inline-flex items-center justify-end gap-1.5">
                        <Wallet className="w-3.5 h-3.5 t-muted" />
                        <span>Potongan &amp; Kasbon</span>
                      </span>
                    </th>
                    <th className="py-3.5 px-3 t-th-label text-right">
                      <span className="inline-flex items-center justify-end gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 t-muted" />
                        <span>Gaji Bersih</span>
                      </span>
                    </th>
                    <th className="py-3.5 px-3 t-th-label text-center">
                      <span className="inline-flex items-center justify-center gap-1.5">
                        <BadgeCheck className="w-3.5 h-3.5 t-muted" />
                        <span>Status</span>
                      </span>
                    </th>
                    <th className="py-3.5 px-4 t-th-label text-center">
                      <span className="inline-flex items-center justify-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 t-muted" />
                        <span>Aksi</span>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y t-border">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center t-muted">
                        Belum ada data rekap gaji yang cocok dengan filter saat ini.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((item, idx) => {
                      const c = calculateTHP(item);
                      const siklus = getSiklusDisplay(item);
                      const profile = getEmployeeProfile(item.nik, item.nama);
                      const sisaKasbonAktif = getEmployeeKasbonSaldo(item.nik, item.nama);
                      return (
                        <tr key={item.recordId || `${item.nik}-${idx}`} className="t-row-hover">
                          <td className="py-3 px-4">
                            <div className="font-bold t-text">{item.nama}</div>
                            <div className="text-[11px] t-muted font-mono-num">
                              {item.nik} &middot; {c.skema}
                            </div>
                            <BankAccountBadge
                              namaBank={profile?.namaBank || item.namaBank}
                              noRekening={profile?.noRekening || item.noRekening}
                              atasNama={profile?.atasNamaRekening}
                              employeeName={item.nama}
                              compact
                              onEmptyAction={() => {
                                if (profile) openEditEmployee(profile);
                                else setActiveTab('employees');
                              }}
                              emptyActionLabel="Isi rekening"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold mb-0.5 ${
                                siklus === 'Bulanan' ? 't-status-ok' : 't-status-info'
                              }`}
                            >
                              {siklus}
                            </span>
                            <div className="text-[11px] t-muted">{getPeriodeDisplay(item)}</div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono-num font-bold t-text">
                            {c.isTrip ? `${c.unitPokok} Trip` : `${c.unitPokok} HR`}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-num t-text">
                            {formatRupiah(c.gapok)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="font-bold font-mono-num t-text">
                              {formatRupiah(c.lemburNominal)}
                            </div>
                            <div className="text-[10px] t-muted">{c.breakdownText}</div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div
                              className="font-mono-num font-semibold"
                              style={{ color: 'var(--status-bad-text)' }}
                            >
                              {formatRupiah(c.totalPot)}
                            </div>
                            <div className="text-[10px] t-muted">{c.keterangan}</div>
                            {sisaKasbonAktif > 0 && (
                              <div
                                className="text-[10px] font-mono-num font-semibold mt-0.5"
                                style={{ color: 'var(--status-warn-text)' }}
                              >
                                Sisa hutang: {formatRupiah(sisaKasbonAktif)}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-bold t-text font-mono-num">
                            {formatRupiah(c.thp)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <PaymentStatusSelect
                              status={getStatusDisplay(item)}
                              employeeName={item.nama}
                              onChangeStatus={(nextStatus) => updatePayrollStatus(item, nextStatus)}
                              align="center"
                            />
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="inline-flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openSlipModal(item)}
                                className="px-2.5 py-1.5 t-btn-secondary text-[11px] font-bold rounded-xl whitespace-nowrap"
                              >
                                Slip
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditPayrollRow(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 t-btn-secondary text-[11px] font-bold rounded-xl whitespace-nowrap"
                                title="Edit Data Gaji"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePayrollRow(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 t-btn-secondary text-[11px] font-bold rounded-xl whitespace-nowrap"
                                style={{ color: 'var(--status-bad-text)' }}
                                title="Hapus Data Gaji"
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
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT KARYAWAN */}
      {empModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setEmpModalOpen(false)}
        >
          <div
            className="w-full max-w-lg t-card rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b t-border flex items-center justify-between">
              <div>
                <h3 className="text-base font-display t-text">
                  {empForm.id ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
                </h3>
                <p className="text-[11px] t-muted mt-0.5">
                  Atur divisi, siklus gaji (Mingguan/Bulanan), serta saldo hutang/kasbon aktif.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEmpModalOpen(false)}
                className="p-1.5 rounded-xl t-btn-secondary"
                aria-label="Tutup modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block t-field-label mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={empForm.nama}
                    onChange={(e) => setEmpForm((p) => ({ ...p, nama: e.target.value }))}
                    placeholder="Contoh: Ahmad Fauzi"
                    className="w-full px-3 py-2 rounded-xl t-input font-semibold"
                  />
                </div>
                <div>
                  <label className="block t-field-label mb-1">No / NIK *</label>
                  <input
                    type="text"
                    required
                    value={empForm.nik}
                    onChange={(e) => setEmpForm((p) => ({ ...p, nik: e.target.value }))}
                    placeholder="Contoh: 007"
                    className="w-full px-3 py-2 rounded-xl t-input uppercase font-mono-num font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block t-field-label mb-1">Divisi Utama</label>
                  <select
                    value={empForm.divisi}
                    onChange={(e) => handleEmployeeDivisiChange(e.target.value as DivisionName)}
                    className="w-full px-3 py-2 rounded-xl t-input font-semibold"
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
                  <div className="grid grid-cols-2 gap-1.5">
                    {PAYROLL_CYCLES.map((cycle) => (
                      <button
                        key={cycle}
                        type="button"
                        onClick={() => setEmpForm((p) => ({ ...p, siklusGaji: cycle }))}
                        className={`py-2 rounded-xl font-bold text-xs transition-colors ${
                          empForm.siklusGaji === cycle ? 't-btn-primary' : 't-btn-secondary'
                        }`}
                      >
                        {cycle}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {empForm.divisi === 'Supir SPD' && (
                <div>
                  <label className="block t-field-label mb-1">Satuan Pokok Supir SPD</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEmpForm((p) => ({
                          ...p,
                          satuanPokok: 'trip',
                          upahDefault: formatNumberWithDots(DEFAULT_PAYROLL_RATES.upahPerTrip),
                        }))
                      }
                      className={`py-2 rounded-xl font-bold text-xs ${
                        empForm.satuanPokok === 'trip' ? 't-status-info' : 't-btn-secondary'
                      }`}
                    >
                      Per Trip
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEmpForm((p) => ({
                          ...p,
                          satuanPokok: 'hari',
                          upahDefault: formatNumberWithDots(DEFAULT_PAYROLL_RATES.upahPerHari),
                        }))
                      }
                      className={`py-2 rounded-xl font-bold text-xs ${
                        empForm.satuanPokok === 'hari' ? 't-status-info' : 't-btn-secondary'
                      }`}
                    >
                      Per Hari (HR)
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block t-field-label mb-1">
                    Upah Default ({empForm.satuanPokok === 'trip' ? 'Per Trip' : 'Per Hari'})
                  </label>
                  <input
                    type="text"
                    value={empForm.upahDefault}
                    onChange={(e) =>
                      setEmpForm((p) => ({
                        ...p,
                        upahDefault: formatCurrencyInput(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl t-input font-mono-num font-bold"
                  />
                </div>
                <div>
                  <label className="block t-field-label mb-1">Nominal Hutang / Kasbon (Rp)</label>
                  <input
                    type="text"
                    value={empForm.kasbonSaldo}
                    onChange={(e) =>
                      setEmpForm((p) => ({
                        ...p,
                        kasbonSaldo: formatCurrencyInput(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl t-input font-mono-num font-bold"
                  />
                </div>
              </div>

              {/* Rekening Bank Pembayaran Gaji */}
              <div className="p-3.5 rounded-xl t-subtle border t-border space-y-2.5">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold t-text">
                  <Building2 className="w-3.5 h-3.5 t-link" />
                  <span>Identitas Rekening Bank (Otomatis tampil untuk Finance)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block t-field-label mb-1">Nama Bank</label>
                    <input
                      type="text"
                      list="spd-common-banks"
                      value={empForm.namaBank}
                      onChange={(e) => setEmpForm((p) => ({ ...p, namaBank: e.target.value }))}
                      placeholder="Contoh: BCA / BRI / Mandiri"
                      className="w-full px-3 py-2 rounded-xl t-input font-semibold"
                    />
                    <datalist id="spd-common-banks">
                      {COMMON_BANKS.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block t-field-label mb-1">Nomor Rekening</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={empForm.noRekening}
                      onChange={(e) =>
                        setEmpForm((p) => ({
                          ...p,
                          noRekening: e.target.value.replace(/[^0-9\s-]/g, ''),
                        }))
                      }
                      placeholder="Contoh: 1234567890"
                      className="w-full px-3 py-2 rounded-xl t-input font-mono-num font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block t-field-label mb-1">
                    Atas Nama Rekening (Opsional jika sama dengan nama karyawan)
                  </label>
                  <input
                    type="text"
                    value={empForm.atasNamaRekening}
                    onChange={(e) =>
                      setEmpForm((p) => ({ ...p, atasNamaRekening: e.target.value }))
                    }
                    placeholder={empForm.nama || 'Sesuai nama di buku tabungan'}
                    className="w-full px-3 py-2 rounded-xl t-input"
                  />
                </div>
              </div>

              <div>
                <label className="block t-field-label mb-1">Catatan (Opsional)</label>
                <input
                  type="text"
                  value={empForm.catatan}
                  onChange={(e) => setEmpForm((p) => ({ ...p, catatan: e.target.value }))}
                  placeholder="Contoh: Bagian sortir / Armada B3 / No. HP"
                  className="w-full px-3 py-2 rounded-xl t-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t t-border">
                <button
                  type="button"
                  onClick={() => setEmpModalOpen(false)}
                  className="px-4 py-2 rounded-xl t-btn-secondary font-semibold"
                >
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl t-btn-primary">
                  {empForm.id ? 'Simpan Perubahan' : 'Simpan Karyawan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: KELOLA HUTANG / KASBON KARYAWAN */}
      {kasbonTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setKasbonTargetId(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] flex flex-col t-card rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b t-border flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-display t-text">
                    Hutang / Kasbon — {kasbonTarget.nama}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      kasbonTarget.siklusGaji === 'Bulanan' ? 't-status-ok' : 't-status-info'
                    }`}
                  >
                    {kasbonTarget.siklusGaji}
                  </span>
                </div>
                <p className="text-[11px] t-muted mt-0.5 font-mono-num">
                  NIK {kasbonTarget.nik} &middot; {kasbonTarget.divisi}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setKasbonTargetId(null)}
                className="p-1.5 rounded-xl t-btn-secondary"
                aria-label="Tutup modal kasbon"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* Current Balance Banner */}
              <div className="p-4 rounded-2xl t-subtle border t-border flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="t-field-label">Saldo Hutang / Kasbon Saat Ini</div>
                  <div
                    className="text-2xl font-display mt-0.5 tabular-nums"
                    style={{
                      color:
                        kasbonTarget.kasbonSaldo > 0
                          ? 'var(--status-bad-text)'
                          : 'var(--status-ok-text)',
                    }}
                  >
                    {formatRupiah(kasbonTarget.kasbonSaldo)}
                  </div>
                </div>
                <div className="text-[11px] t-muted max-w-xs">
                  Saldo ini otomatis terisi sebagai <b>Saldo kasbon awal</b> saat Input Gaji dan
                  berkurang otomatis ketika potongan kasbon disimpan.
                </div>
              </div>

              {/* Add Pinjaman / Record Cicilan Form */}
              <form
                onSubmit={handleSaveKasbonEntry}
                className="p-4 rounded-2xl border t-border space-y-3"
              >
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setKasbonJenis('Pinjaman')}
                    className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-xs ${
                      kasbonJenis === 'Pinjaman' ? 't-status-bad' : 't-btn-secondary'
                    }`}
                  >
                    <ArrowUpCircle className="w-3.5 h-3.5" />
                    <span>Tambah Pinjaman (+)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setKasbonJenis('Cicilan')}
                    className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-xs ${
                      kasbonJenis === 'Cicilan' ? 't-status-ok' : 't-btn-secondary'
                    }`}
                  >
                    <ArrowDownCircle className="w-3.5 h-3.5" />
                    <span>Catat Cicilan / Bayar (-)</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block t-field-label mb-1">Tanggal</label>
                    <input
                      type="date"
                      value={kasbonTanggal}
                      onChange={(e) => setKasbonTanggal(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl t-input font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block t-field-label mb-1">Nominal (Rp)</label>
                    <input
                      type="text"
                      value={kasbonNominal}
                      onChange={(e) => setKasbonNominal(formatCurrencyInput(e.target.value))}
                      placeholder="Contoh: 500.000"
                      className="w-full px-3 py-2 rounded-xl t-input font-mono-num font-bold"
                    />
                  </div>
                  <div>
                    <label className="block t-field-label mb-1">Keterangan</label>
                    <input
                      type="text"
                      value={kasbonKet}
                      onChange={(e) => setKasbonKet(e.target.value)}
                      placeholder={
                        kasbonJenis === 'Pinjaman'
                          ? 'Kasbon keperluan...'
                          : 'Bayar tunai / transfer...'
                      }
                      className="w-full px-3 py-2 rounded-xl t-input"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <div className="text-[11px] t-muted">
                    Estimasi saldo setelah transaksi:{' '}
                    <b className="font-mono-num t-text">{formatRupiah(kasbonPreviewNextSaldo)}</b>
                  </div>
                  <button type="submit" className="px-4 py-2 rounded-xl t-btn-primary text-xs">
                    {kasbonJenis === 'Pinjaman' ? 'Catat Pinjaman' : 'Catat Cicilan'}
                  </button>
                </div>
              </form>

              {/* Riwayat Mutasi Kasbon */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 t-section-label">
                  <History className="w-3.5 h-3.5 t-link" />
                  <span>Riwayat Hutang &amp; Potongan Kasbon ({kasbonTarget.kasbonHistory.length})</span>
                </div>

                <div className="border t-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="t-subtle border-b t-border">
                          <th className="py-2.5 px-3 t-th-label">Tanggal</th>
                          <th className="py-2.5 px-3 t-th-label">Jenis</th>
                          <th className="py-2.5 px-3 t-th-label">Keterangan</th>
                          <th className="py-2.5 px-3 t-th-label text-right">Nominal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y t-border">
                        {kasbonTarget.kasbonHistory.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-4 text-center t-muted">
                              Belum ada riwayat pinjaman atau potongan kasbon untuk karyawan ini.
                            </td>
                          </tr>
                        ) : (
                          kasbonTarget.kasbonHistory.map((h) => {
                            const isAddition = h.jenis === 'Pinjaman';
                            return (
                              <tr key={h.id}>
                                <td className="py-2.5 px-3 font-mono-num t-muted whitespace-nowrap">
                                  {h.tanggal}
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                      h.jenis === 'Pinjaman'
                                        ? 't-status-bad'
                                        : h.jenis === 'Potong Gaji' || h.jenis === 'Cicilan'
                                          ? 't-status-ok'
                                          : 't-status-info'
                                    }`}
                                  >
                                    {h.jenis}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 t-text">{h.keterangan || '-'}</td>
                                <td
                                  className="py-2.5 px-3 text-right font-mono-num font-bold whitespace-nowrap"
                                  style={{
                                    color: isAddition
                                      ? 'var(--status-bad-text)'
                                      : 'var(--status-ok-text)',
                                  }}
                                >
                                  {isAddition ? '+' : '-'}
                                  {formatRupiah(h.nominal)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
