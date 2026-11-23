import { Check, Database, RefreshCw, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { THEME_OPTIONS } from '../../config/constants';
import { useApp } from '../../context/AppContext';
import { useKasTonase } from '../../context/KasTonaseContext';

export function KtPengaturanPage() {
  const { theme, setTheme, requestConfirm } = useApp();
  const { isSyncing, refreshTonase, seedSampleData, clearAllData } = useKasTonase();

  const handleSeed = async () => {
    const ok = await requestConfirm({
      title: 'Muat Data Contoh',
      message: 'Muat ulang data contoh Kas & Tonase ke penyimpanan lokal?',
      confirmLabel: 'Muat Data Contoh',
    });
    if (ok) seedSampleData();
  };

  const handleClear = async () => {
    const ok = await requestConfirm({
      title: 'Kosongkan Data Lokal',
      message:
        'Kosongkan seluruh data Transaksi, Hutang/Piutang, stok gudang, dan Kas Operasional?',
      confirmLabel: 'Kosongkan Semua',
      danger: true,
    });
    if (ok) clearAllData();
  };

  return (
    <section className="space-y-5">
      <PageHeader
        suiteLabel="Kas & Tonase"
        pageLabel="Pengaturan"
        title="Pengaturan Tema & Sinkronisasi"
        subtitle="Sesuaikan palet warna untuk seluruh aplikasi serta kelola sinkronisasi Google SPS Tonase."
      />

      <div className="t-card rounded-2xl p-5 space-y-4">
        <div className="t-section-label">Pilih Palet Warna Portal (Berlaku untuk Semuanya)</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {THEME_OPTIONS.map((opt) => {
            const isSelected = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTheme(opt.id)}
                className="text-left p-4 rounded-2xl border-2 transition-all t-subtle"
                style={{
                  borderColor: isSelected ? 'var(--accent-brand)' : 'var(--border-color)',
                  boxShadow: isSelected ? '0 0 0 2px var(--accent-brand)' : 'none',
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="font-bold text-sm t-text">{opt.name}</span>
                  {isSelected ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold t-link">
                      <Check className="w-3.5 h-3.5" />
                      Aktif
                    </span>
                  ) : opt.badge ? (
                    <span className="text-[11px] font-semibold t-muted">{opt.badge}</span>
                  ) : null}
                </div>
                <div className="flex gap-1.5 mb-2.5">
                  {opt.swatches.map((hex) => (
                    <span
                      key={hex}
                      className="w-8 h-6 rounded border border-black/15"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
                <div className="text-[11px] t-muted leading-relaxed">{opt.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="t-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="t-section-label">Data &amp; Sinkronisasi Tonase SPS</div>
          <div className="text-xs t-muted mt-1">
            Tarik ulang data dari Google SPS Tonase atau muat/kosongkan data lokal.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isSyncing}
            onClick={() => refreshTonase(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl t-btn-primary text-xs whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Tarik Data SPS Tonase</span>
          </button>
          <button
            type="button"
            onClick={handleSeed}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl t-btn-secondary text-xs font-semibold whitespace-nowrap"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Muat Data Contoh</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl t-status-bad text-xs font-bold whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Kosongkan Data</span>
          </button>
        </div>
      </div>
    </section>
  );
}
