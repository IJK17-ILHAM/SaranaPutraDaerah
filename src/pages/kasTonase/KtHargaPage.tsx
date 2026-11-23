import { Package, Pencil, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { useApp } from '../../context/AppContext';
import { useKasTonase } from '../../context/KasTonaseContext';
import type { KtBarang } from '../../types/kasTonase';
import { formatNumberWithDots } from '../../utils/format';

export function KtHargaPage() {
  const { requestConfirm } = useApp();
  const { barangList, saveBarang, deleteBarang } = useKasTonase();

  const [editId, setEditId] = useState('');
  const [nama, setNama] = useState('');
  const [potDefault, setPotDefault] = useState('0');
  const [minKg, setMinKg] = useState('0');

  const resetForm = () => {
    setEditId('');
    setNama('');
    setPotDefault('0');
    setMinKg('0');
  };

  const handleEdit = (b: KtBarang) => {
    setEditId(b.id);
    setNama(b.nama);
    setPotDefault(String(b.potDefault || 0));
    setMinKg(String(b.minKg || 0));
  };

  const handleDelete = async (b: KtBarang) => {
    const ok = await requestConfirm({
      title: 'Hapus Master Barang',
      message: `Hapus barang "${b.nama}" dari daftar Master Barang?`,
      confirmLabel: 'Hapus Barang',
      danger: true,
    });
    if (ok) deleteBarang(b.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nama.trim();
    if (!cleanName) return;

    const existing = editId ? barangList.find((b) => b.id === editId) : undefined;
    saveBarang(
      {
        nama: cleanName,
        hargaBeli: existing?.hargaBeli ?? 0,
        hargaJual: existing?.hargaJual ?? 0,
        potDefault: parseFloat(potDefault) || 0,
        minKg: parseFloat(minKg) || 0,
      },
      editId || undefined,
    );
    resetForm();
  };

  return (
    <section className="space-y-5">
      <PageHeader
        suiteLabel="Kas & Tonase"
        pageLabel="Master barang"
        title="Master Barang"
        subtitle="Kelola daftar jenis barang gudang. Cukup isi Nama Barang; harga/kg diisi langsung di setiap nota transaksi Beli atau Jual."
      />

      <form onSubmit={handleSubmit} className="t-card rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center border-b t-border pb-2.5">
          <span className="inline-flex items-center gap-1.5 t-section-label">
            <Package className="w-4 h-4 t-link" />
            <span>{editId ? `Edit Barang: ${nama}` : 'Tambah Barang Baru'}</span>
          </span>
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center gap-1 text-xs t-link font-semibold hover:underline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-2 lg:col-span-6">
            <label className="block t-field-label mb-1">Nama Barang *</label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              required
              placeholder="cth: Kardus OCC"
              className="w-full text-xs px-3 py-2.5 rounded-xl t-input font-semibold"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block t-field-label mb-1">Pot. Default (%)</label>
            <input
              type="number"
              value={potDefault}
              onChange={(e) => setPotDefault(e.target.value)}
              min={0}
              max={50}
              step={0.5}
              className="w-full text-xs px-3 py-2.5 rounded-xl t-input font-mono-num"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block t-field-label mb-1">Stok Min (Kg)</label>
            <input
              type="number"
              value={minKg}
              onChange={(e) => setMinKg(e.target.value)}
              min={0}
              step={50}
              className="w-full text-xs px-3 py-2.5 rounded-xl t-input font-mono-num"
            />
          </div>
          <div className="lg:col-span-2">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl t-btn-primary text-xs whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{editId ? 'Update Barang' : 'Simpan Barang'}</span>
            </button>
          </div>
        </div>
      </form>

      <div className="t-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="t-subtle border-b t-border">
                <th className="py-3.5 px-4 t-th-label">Nama Barang</th>
                <th className="py-3.5 px-3 t-th-label text-right">Stok Gudang</th>
                <th className="py-3.5 px-3 t-th-label text-center">Pot. Default</th>
                <th className="py-3.5 px-3 t-th-label text-right">Batas Min</th>
                <th className="py-3.5 px-4 t-th-label text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y t-border">
              {barangList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center t-muted">
                    Belum ada data barang. Tambahkan Nama Barang di atas (misalnya Kardus OCC).
                  </td>
                </tr>
              ) : (
                barangList.map((b) => (
                  <tr key={b.id} className="t-row-hover">
                    <td className="py-3 px-4 font-bold t-text">{b.nama}</td>
                    <td className="py-3 px-3 text-right font-mono-num font-semibold t-text">
                      {formatNumberWithDots(b.stokKg || 0)} kg
                    </td>
                    <td className="py-3 px-3 text-center font-mono-num">{b.potDefault || 0}%</td>
                    <td className="py-3 px-3 text-right font-mono-num t-muted">
                      {formatNumberWithDots(b.minKg || 0)} kg
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleEdit(b)}
                          className="inline-flex items-center gap-1 t-link font-semibold hover:underline"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(b)}
                          className="inline-flex items-center gap-1 font-semibold hover:underline"
                          style={{ color: 'var(--status-bad-text)' }}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
