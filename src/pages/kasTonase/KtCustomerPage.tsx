import { Edit3, History, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { MitraDetailModal } from '../../components/kasTonase/MitraDetailModal';
import { NotaDetailModal } from '../../components/kasTonase/NotaDetailModal';
import { useApp } from '../../context/AppContext';
import { useKasTonase } from '../../context/KasTonaseContext';
import type { KtCustomer, KtTransaction } from '../../types/kasTonase';
import { formatRupiah } from '../../utils/format';

export function KtCustomerPage() {
  const { requestConfirm, setActiveMenu } = useApp();
  const {
    customers,
    saveCustomer,
    deleteCustomer,
    getCustomerOutstanding,
    setEditingTransaction,
  } = useKasTonase();

  const [editId, setEditId] = useState('');
  const [nama, setNama] = useState('');
  const [tipe, setTipe] = useState('Supplier & Buyer');
  const [plat, setPlat] = useState('');
  const [telp, setTelp] = useState('');

  const [search, setSearch] = useState('');
  const [filterTipe, setFilterTipe] = useState('ALL');
  const [detailCustomer, setDetailCustomer] = useState<KtCustomer | null>(null);
  const [detailNota, setDetailNota] = useState<KtTransaction | null>(null);

  const resetForm = () => {
    setEditId('');
    setNama('');
    setTipe('Supplier & Buyer');
    setPlat('');
    setTelp('');
  };

  const handleEdit = (c: KtCustomer) => {
    setEditId(c.id);
    setNama(c.nama);
    setTipe(c.tipe);
    setPlat(c.plat || '');
    setTelp(c.telp || '');
  };

  const handleDelete = async (c: KtCustomer) => {
    const ok = await requestConfirm({
      title: 'Hapus Data Customer',
      message: `Hapus mitra "${c.nama}" dari daftar customer & supplier?`,
      confirmLabel: 'Hapus Mitra',
      danger: true,
    });
    if (ok) deleteCustomer(c.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveCustomer(
      {
        nama: nama.trim(),
        tipe,
        plat: plat.trim().toUpperCase(),
        telp: telp.trim(),
      },
      editId || undefined,
    );
    resetForm();
  };

  const customerRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers
      .map((c) => ({
        customer: c,
        outstanding: getCustomerOutstanding(c.nama),
      }))
      .filter(({ customer }) => {
        if (filterTipe !== 'ALL' && customer.tipe !== filterTipe) return false;
        if (!q) return true;
        return (
          (customer.nama || '').toLowerCase().includes(q) ||
          (customer.plat || '').toLowerCase().includes(q) ||
          (customer.telp || '').toLowerCase().includes(q)
        );
      });
  }, [customers, filterTipe, getCustomerOutstanding, search]);

  const totals = useMemo(() => {
    return customerRows.reduce(
      (acc, row) => ({
        piutang: acc.piutang + row.outstanding.piutang,
        hutang: acc.hutang + row.outstanding.hutang,
      }),
      { piutang: 0, hutang: 0 },
    );
  }, [customerRows]);

  const handleEditNota = (trx: KtTransaction) => {
    setEditingTransaction(trx);
    setDetailNota(null);
    setDetailCustomer(null);
    setActiveMenu('menu-kt-transaksi');
  };

  return (
    <section className="space-y-5">
      <PageHeader
        suiteLabel="Kas & Tonase"
        pageLabel="Customer"
        title="Customer & Supplier"
        subtitle="Data mitra, riwayat nota & cicilan, serta pemisahan saldo Utang Mitra ke Kita dan Utang Kita ke Mitra."
      />

      {/* Summary Cards: Two Explicitly Separated Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="t-card rounded-2xl p-4 flex items-center justify-between gap-3">
          <div>
            <div className="t-kpi-label">Total Utang Mitra ke Kita (Piutang)</div>
            <div
              className="text-xl font-extrabold font-mono-num mt-1"
              style={{ color: 'var(--status-info-text)' }}
            >
              {formatRupiah(totals.piutang)}
            </div>
            <div className="text-[11px] t-muted mt-0.5">
              Gabungan sisa Nota Jual + Piutang / Pinjaman Mitra
            </div>
          </div>
        </div>
        <div className="t-card rounded-2xl p-4 flex items-center justify-between gap-3">
          <div>
            <div className="t-kpi-label">Total Utang Kita ke Mitra (Hutang Beli)</div>
            <div
              className="text-xl font-extrabold font-mono-num mt-1"
              style={{ color: 'var(--status-warn-text)' }}
            >
              {formatRupiah(totals.hutang)}
            </div>
            <div className="text-[11px] t-muted mt-0.5">
              Sisa tagihan Nota Beli yang belum dilunasi ke pemasok
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="t-card rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center border-b t-border pb-2.5">
          <span className="t-section-label">
            {editId ? `Edit: ${nama}` : 'Tambah / Edit Customer'}
          </span>
          <button
            type="button"
            onClick={resetForm}
            className="text-xs t-link font-semibold hover:underline"
          >
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block t-field-label mb-1">Nama Customer / PT / CV</label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              required
              placeholder="CV Maju Jaya"
              className="w-full text-xs px-3 py-2.5 rounded-xl t-input font-semibold"
            />
          </div>
          <div>
            <label className="block t-field-label mb-1">Tipe Mitra</label>
            <select
              value={tipe}
              onChange={(e) => setTipe(e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-xl t-input font-semibold"
            >
              <option value="Supplier & Buyer">Supplier &amp; Buyer</option>
              <option value="Supplier">Supplier (Kita Beli)</option>
              <option value="Buyer">Buyer (Kita Jual)</option>
            </select>
          </div>
          <div>
            <label className="block t-field-label mb-1">Plat Armada Default</label>
            <input
              type="text"
              value={plat}
              onChange={(e) => setPlat(e.target.value)}
              placeholder="B 1234 XY"
              className="w-full text-xs px-3 py-2.5 rounded-xl t-input font-mono-num uppercase"
            />
          </div>
          <div>
            <label className="block t-field-label mb-1">No. Telepon / WA</label>
            <input
              type="text"
              value={telp}
              onChange={(e) => setTelp(e.target.value)}
              placeholder="0812..."
              className="w-full text-xs px-3 py-2.5 rounded-xl t-input font-mono-num"
            />
          </div>
          <button type="submit" className="py-2.5 px-4 rounded-xl t-btn-primary text-xs">
            Simpan Customer
          </button>
        </div>
      </form>

      <div className="t-card rounded-2xl overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b t-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 t-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama mitra, plat, atau telepon..."
              className="w-full text-xs pl-8 pr-3 py-2 rounded-xl t-input"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterTipe}
              onChange={(e) => setFilterTipe(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl t-input font-semibold"
            >
              <option value="ALL">Semua Tipe ({customers.length})</option>
              <option value="Supplier & Buyer">Supplier &amp; Buyer</option>
              <option value="Supplier">Supplier</option>
              <option value="Buyer">Buyer</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="t-subtle border-b t-border">
                <th className="py-3.5 px-4 t-th-label">Nama Mitra</th>
                <th className="py-3.5 px-3 t-th-label">Tipe</th>
                <th className="py-3.5 px-3 t-th-label">Plat / Telepon</th>
                <th className="py-3.5 px-3 t-th-label text-right">Utang Mitra ke Kita</th>
                <th className="py-3.5 px-3 t-th-label text-right">Utang Kita ke Mitra</th>
                <th className="py-3.5 px-4 t-th-label text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y t-border">
              {customerRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center t-muted">
                    Tidak ada data mitra yang sesuai filter.
                  </td>
                </tr>
              ) : (
                customerRows.map(({ customer: c, outstanding }) => {
                  const initChar = (c.nama || '?').trim().charAt(0).toUpperCase();
                  return (
                    <tr key={c.id} className="t-row-hover">
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setDetailCustomer(c)}
                          className="flex items-center gap-2.5 text-left group"
                        >
                          <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold t-subtle t-text shrink-0">
                            {initChar}
                          </span>
                          <span className="font-bold t-text group-hover:underline">{c.nama}</span>
                        </button>
                      </td>
                      <td className="py-3 px-3 t-muted whitespace-nowrap">{c.tipe}</td>
                      <td className="py-3 px-3 font-mono-num">
                        <div className="t-text">{c.plat || '-'}</div>
                        <div className="text-[11px] t-muted">{c.telp || '-'}</div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num whitespace-nowrap">
                        {outstanding.piutang > 0 ? (
                          <div>
                            <div
                              className="font-bold"
                              style={{ color: 'var(--status-info-text)' }}
                            >
                              {formatRupiah(outstanding.piutang)}
                            </div>
                            {outstanding.piutangNota > 0 && outstanding.piutangMitra > 0 && (
                              <div className="text-[10px] t-muted">
                                Nota {formatRupiah(outstanding.piutangNota)} + PM{' '}
                                {formatRupiah(outstanding.piutangMitra)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span
                            className="text-[11px] font-semibold"
                            style={{ color: 'var(--status-ok-text)' }}
                          >
                            Lunas
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num whitespace-nowrap">
                        {outstanding.hutang > 0 ? (
                          <span
                            className="font-bold"
                            style={{ color: 'var(--status-warn-text)' }}
                          >
                            {formatRupiah(outstanding.hutang)}
                          </span>
                        ) : (
                          <span
                            className="text-[11px] font-semibold"
                            style={{ color: 'var(--status-ok-text)' }}
                          >
                            Lunas
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailCustomer(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg t-btn-secondary text-[11px] font-semibold whitespace-nowrap"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>Riwayat</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(c)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg t-link text-[11px] font-semibold hover:underline whitespace-nowrap"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold hover:underline whitespace-nowrap"
                            style={{ color: 'var(--status-bad-text)' }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      <MitraDetailModal
        customer={detailCustomer}
        onClose={() => setDetailCustomer(null)}
        onOpenNota={(trx) => setDetailNota(trx)}
      />

      <NotaDetailModal
        transaction={detailNota}
        onClose={() => setDetailNota(null)}
        onEdit={handleEditNota}
      />
    </section>
  );
}
