import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { ACCOUNT_ROLES } from '../../config/constants';
import { useApp } from '../../context/AppContext';
import { usePayroll } from '../../context/PayrollContext';
import type { AccountRecord } from '../../types/auth';

export function KelolaAkunPage() {
  const { user, requestConfirm, showToast } = useApp();
  const { accounts, accountsLoading, refreshAccounts, saveAccount, removeAccount } = usePayroll();

  const [originalEmail, setOriginalEmail] = useState('');
  const [idAkun, setIdAkun] = useState('');
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>('Staff');
  const [status, setStatus] = useState<string>('Aktif');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setOriginalEmail('');
    setIdAkun('');
    setNama('');
    setEmail('');
    setPassword('');
    setRole('Staff');
    setStatus('Aktif');
  };

  const handleEdit = (acc: AccountRecord) => {
    const uname = acc.username || acc.email || '';
    setOriginalEmail(uname);
    setIdAkun(acc.id || '');
    setNama(acc.nama || '');
    setEmail(uname);
    setPassword('');
    setRole(acc.role || 'Staff');
    setStatus(acc.status || 'Aktif');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const ok = await saveAccount({
        originalEmail,
        idAkun: idAkun.trim(),
        nama: nama.trim(),
        email: email.trim(),
        password,
        role,
        status,
      });
      if (ok) resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (username: string) => {
    const currentUname = (user?.username || user?.email || '').toLowerCase();
    if (currentUname && currentUname === username.toLowerCase()) {
      showToast('Tidak bisa menghapus akun yang sedang login.', 'warning');
      return;
    }
    const ok = await requestConfirm({
      title: 'Hapus Akun Pengguna',
      message: `Apakah Anda yakin ingin menghapus akun "${username}" dari Google Sheet?`,
      confirmLabel: 'Hapus Akun',
      danger: true,
    });
    if (ok) {
      await removeAccount(username);
    }
  };

  return (
    <section className="space-y-5">
      <PageHeader
        suiteLabel="Payroll"
        pageLabel="Kelola akun"
        title="Kelola Akun Pengguna"
        subtitle="Terhubung langsung dengan tab Akun Google Sheet."
        actions={
          <button
            type="button"
            onClick={refreshAccounts}
            disabled={accountsLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${accountsLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Daftar Akun</span>
          </button>
        }
      />

      <form onSubmit={handleSubmit} className="t-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="t-section-label">
            {originalEmail ? `Edit Akun: ${originalEmail}` : 'Buat Akun Baru'}
          </h2>
          <button
            type="button"
            onClick={resetForm}
            className="text-xs t-muted hover:underline font-medium"
          >
            Reset Form
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="block t-field-label mb-1">ID Akun</label>
            <input
              type="text"
              value={idAkun}
              onChange={(e) => setIdAkun(e.target.value)}
              placeholder="USR-xxx"
              className="w-full text-xs px-3 py-2 rounded-xl t-input font-mono-num"
            />
          </div>
          <div>
            <label className="block t-field-label mb-1">Nama Lengkap</label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              required
              placeholder="Siti Rahmawati"
              className="w-full text-xs px-3 py-2 rounded-xl t-input font-semibold"
            />
          </div>
          <div>
            <label className="block t-field-label mb-1">Username / Email</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="hrd_payroll"
              className="w-full text-xs px-3 py-2 rounded-xl t-input font-semibold"
            />
          </div>
          <div>
            <label className="block t-field-label mb-1">
              {originalEmail ? 'Password Baru (Opsional)' : 'Password / PIN'}
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="SPD#2026*..."
              className="w-full text-xs px-3 py-2 rounded-xl t-input font-mono-num"
            />
          </div>
          <div>
            <label className="block t-field-label mb-1">Role Akses</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl t-input font-bold"
            >
              {ACCOUNT_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block t-field-label mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl t-input font-bold"
            >
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl t-btn-primary text-xs"
          >
            {saving ? 'Menyimpan...' : 'Simpan Akun ke Google Sheet'}
          </button>
        </div>
      </form>

      <div className="t-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="t-subtle border-b t-border">
                <th className="py-3 px-4 t-th-label">ID Akun</th>
                <th className="py-3 px-4 t-th-label">Nama Lengkap</th>
                <th className="py-3 px-4 t-th-label">Username / Email</th>
                <th className="py-3 px-4 t-th-label text-center">Role Akses</th>
                <th className="py-3 px-4 t-th-label text-center">Status</th>
                <th className="py-3 px-4 t-th-label text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y t-border">
              {accountsLoading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center t-muted">
                    Memuat daftar akun...
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center t-muted">
                    Belum ada akun terdaftar.
                  </td>
                </tr>
              ) : (
                accounts.map((acc, idx) => {
                  const isAktif = (acc.status || 'Aktif').toLowerCase() === 'aktif';
                  const uname = acc.username || acc.email || '-';
                  return (
                    <tr key={`${uname}-${idx}`} className="t-row-hover">
                      <td className="py-3 px-4 font-mono-num t-muted">{acc.id || '-'}</td>
                      <td className="py-3 px-4 font-bold t-text">{acc.nama}</td>
                      <td className="py-3 px-4 font-mono-num t-text">{uname}</td>
                      <td className="py-3 px-4 text-center font-semibold t-text">{acc.role}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className="text-[11px] font-bold"
                          style={{
                            color: isAktif ? 'var(--status-ok-text)' : 'var(--status-bad-text)',
                          }}
                        >
                          {isAktif ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleEdit(acc)}
                          className="t-link hover:underline font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(uname)}
                          className="font-semibold hover:underline"
                          style={{ color: 'var(--status-bad-text)' }}
                        >
                          Hapus
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
