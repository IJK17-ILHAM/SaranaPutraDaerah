import { RefreshCw, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { ARMADA_ACCOUNT_ROLES } from '../../config/constants';
import type {
  ArmadaAccount,
  ArmadaAccountInput,
  ArmadaAccountRole,
  ArmadaUnit,
  ArmadaUnitStatus,
} from '../../types/armada';

interface AkunArmadaPageProps {
  accounts: ArmadaAccount[];
  units: ArmadaUnit[];
  currentUsername: string;
  isSyncing: boolean;
  onRefreshSps: () => void;
  onSaveAccount: (input: ArmadaAccountInput) => void;
  onDeleteAccount: (account: ArmadaAccount) => void;
}

export function AkunArmadaPage({
  accounts,
  units,
  currentUsername,
  isSyncing,
  onRefreshSps,
  onSaveAccount,
  onDeleteAccount,
}: AkunArmadaPageProps) {
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [idAkun, setIdAkun] = useState('');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [username, setUsername] = useState('');
  const [passwordPin, setPasswordPin] = useState('');
  const [roleAkses, setRoleAkses] = useState<ArmadaAccountRole>('Sopir');
  const [unitUtamaKode, setUnitUtamaKode] = useState('');
  const [status, setStatus] = useState<ArmadaUnitStatus>('Aktif');
  const [catatan, setCatatan] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const resetForm = () => {
    setEditingId(undefined);
    setIdAkun('');
    setNamaLengkap('');
    setUsername('');
    setPasswordPin('');
    setRoleAkses('Sopir');
    setUnitUtamaKode('');
    setStatus('Aktif');
    setCatatan('');
    setFormError('');
  };

  const handleEdit = (acc: ArmadaAccount) => {
    setEditingId(acc.id);
    setIdAkun(acc.idAkun || acc.id);
    setNamaLengkap(acc.namaLengkap);
    setUsername(acc.username);
    setPasswordPin('');
    setRoleAkses(acc.roleAkses);
    setUnitUtamaKode(acc.unitUtamaKode || '');
    setStatus(acc.status);
    setCatatan(acc.catatan || '');
    setFormError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = namaLengkap.trim();
    const cleanUsername = username.trim();
    const cleanPass = passwordPin.trim();

    if (!cleanName || !cleanUsername) {
      setFormError('Nama lengkap dan username wajib diisi.');
      return;
    }

    if (!editingId && !cleanPass) {
      setFormError('Password / PIN wajib diisi untuk akun Armada baru.');
      return;
    }

    const duplicate = accounts.find(
      (a) =>
        a.id !== editingId && a.username.trim().toLowerCase() === cleanUsername.toLowerCase(),
    );
    if (duplicate) {
      setFormError(`Username "${cleanUsername}" sudah digunakan oleh ${duplicate.namaLengkap}.`);
      return;
    }

    onSaveAccount({
      id: editingId,
      idAkun: idAkun.trim() || undefined,
      namaLengkap: cleanName,
      username: cleanUsername,
      passwordPin: cleanPass || undefined,
      roleAkses,
      status,
      unitUtamaKode: unitUtamaKode || undefined,
      catatan: catatan.trim(),
    });
    resetForm();
  };

  const activeCount = accounts.filter((a) => a.status === 'Aktif').length;
  const sopirCount = accounts.filter((a) => a.roleAkses === 'Sopir').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onRefreshSps}
          disabled={isSyncing}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl t-btn-secondary text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Menyinkronkan...' : 'Muat Ulang dari SPS Armada'}</span>
        </button>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="t-card rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider t-muted">
              Total Akun Armada
            </div>
            <div className="text-2xl font-display t-text font-mono-num mt-0.5">
              {accounts.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl t-subtle flex items-center justify-center">
            <Users className="w-5 h-5 t-link" />
          </div>
        </div>
        <div className="t-card rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider t-muted">Akun Aktif</div>
            <div className="text-2xl font-display t-text font-mono-num mt-0.5">{activeCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl t-status-ok flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="t-card rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider t-muted">Akun Sopir</div>
            <div className="text-2xl font-display t-text font-mono-num mt-0.5">{sopirCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl t-subtle flex items-center justify-center">
            <UserPlus className="w-5 h-5 t-link" />
          </div>
        </div>
      </div>

      {/* Form Tambah / Edit Akun Armada */}
      <form onSubmit={handleSubmit} className="t-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="t-section-label">
            {editingId ? `Edit Akun Armada (${username})` : 'Tambah Akun Armada Baru'}
          </h2>
          <button
            type="button"
            onClick={resetForm}
            className="text-xs t-muted hover:underline font-medium"
          >
            Reset Form
          </button>
        </div>

        {formError && (
          <div className="p-3 rounded-xl t-status-bad text-xs font-semibold">{formError}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block t-field-label mb-1">ID Akun (Opsional)</label>
            <input
              type="text"
              value={idAkun}
              onChange={(e) => setIdAkun(e.target.value)}
              placeholder="Otomatis ARM-USR-xxx"
              className="w-full text-xs px-3 py-2 rounded-xl t-input font-mono-num"
            />
          </div>
          <div>
            <label className="block t-field-label mb-1">Nama Lengkap *</label>
            <input
              type="text"
              value={namaLengkap}
              onChange={(e) => setNamaLengkap(e.target.value)}
              required
              placeholder="Contoh: Dedi Kurniawan"
              className="w-full text-xs px-3 py-2 rounded-xl t-input font-semibold"
            />
          </div>
          <div>
            <label className="block t-field-label mb-1">Username Login *</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="contoh: dedi.sopir"
              className="w-full text-xs px-3 py-2 rounded-xl t-input font-mono-num"
            />
          </div>
          <div>
            <label className="block t-field-label mb-1">
              {editingId ? 'Password / PIN Baru (Opsional)' : 'Password / PIN *'}
            </label>
            <input
              type="text"
              value={passwordPin}
              onChange={(e) => setPasswordPin(e.target.value)}
              placeholder={editingId ? 'Kosongkan jika tetap' : 'SPD123'}
              className="w-full text-xs px-3 py-2 rounded-xl t-input font-mono-num"
            />
          </div>

          <div>
            <label className="block t-field-label mb-1">Role Akses Armada</label>
            <select
              value={roleAkses}
              onChange={(e) => setRoleAkses(e.target.value as ArmadaAccountRole)}
              className="w-full text-xs px-3 py-2 rounded-xl t-input font-bold"
            >
              {ARMADA_ACCOUNT_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block t-field-label mb-1">Unit Utama (Khusus Sopir)</label>
            <select
              value={unitUtamaKode}
              onChange={(e) => setUnitUtamaKode(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl t-input"
            >
              <option value="">— Semua / Tidak ditentukan —</option>
              {units.map((u) => (
                <option key={u.id} value={u.kodeUnit}>
                  {u.kodeUnit} · {u.nomorPolisi} ({u.jenisKendaraan})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block t-field-label mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ArmadaUnitStatus)}
              className="w-full text-xs px-3 py-2 rounded-xl t-input font-bold"
            >
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
          </div>

          <div>
            <label className="block t-field-label mb-1">Catatan</label>
            <input
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Area operasional / keterangan"
              className="w-full text-xs px-3 py-2 rounded-xl t-input"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="px-5 py-2 rounded-xl t-btn-primary text-xs">
            {editingId ? 'Perbarui Akun di SPS Armada' : 'Simpan Akun ke SPS Armada'}
          </button>
        </div>
      </form>

      {/* Daftar Akun Armada */}
      <div className="t-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="t-subtle border-b t-border">
                <th className="py-3 px-4 t-th-label">ID Akun</th>
                <th className="py-3 px-4 t-th-label">Nama Lengkap</th>
                <th className="py-3 px-4 t-th-label">Username</th>
                <th className="py-3 px-4 t-th-label">Role Akses</th>
                <th className="py-3 px-4 t-th-label">Unit Utama</th>
                <th className="py-3 px-4 t-th-label text-center">Status</th>
                <th className="py-3 px-4 t-th-label text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y t-border">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center t-muted">
                    Belum ada akun Armada terdaftar.
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => {
                  const isSelf =
                    currentUsername &&
                    currentUsername.toLowerCase() === acc.username.trim().toLowerCase();
                  const isConfirming = confirmDeleteId === acc.id;
                  return (
                    <tr key={acc.id} className="t-row-hover">
                      <td className="py-3 px-4 font-mono-num t-muted">{acc.idAkun || acc.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold t-text">{acc.namaLengkap}</div>
                        {acc.catatan && (
                          <div className="text-[11px] t-muted truncate max-w-[240px]">
                            {acc.catatan}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono-num t-text">{acc.username}</td>
                      <td className="py-3 px-4 font-semibold t-text">{acc.roleAkses}</td>
                      <td className="py-3 px-4 font-mono-num t-muted">
                        {acc.unitUtamaKode || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className="text-[11px] font-bold"
                          style={{
                            color:
                              acc.status === 'Aktif'
                                ? 'var(--status-ok-text)'
                                : 'var(--status-bad-text)',
                          }}
                        >
                          {acc.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isConfirming ? (
                          <span className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteAccount(acc);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2.5 py-1 rounded-lg t-status-bad text-[11px] font-bold"
                            >
                              Ya, Hapus
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-[11px] t-muted hover:underline"
                            >
                              Batal
                            </button>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleEdit(acc)}
                              className="t-link hover:underline font-semibold"
                            >
                              Edit
                            </button>
                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(acc.id)}
                                className="inline-flex items-center gap-1 font-semibold hover:underline"
                                style={{ color: 'var(--status-bad-text)' }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus</span>
                              </button>
                            )}
                          </span>
                        )}
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
  );
}
