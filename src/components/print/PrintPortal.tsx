import { useApp } from '../../context/AppContext';
import { usePayroll } from '../../context/PayrollContext';
import {
  CompactSlip,
  KtLaporanSheet,
  KtNotaSheet,
  SingleEnvelopeSlip,
} from './SlipTemplates';

export function PrintPortal() {
  const { printJob } = useApp();
  const { getEmployeeKasbonSaldo } = usePayroll();

  if (!printJob) return null;

  return (
    <div id="print-portal-mount" className="hidden">
      {printJob.type === 'single-slip' && (
        <div style={{ padding: '5mm' }}>
          <SingleEnvelopeSlip
            item={printJob.item}
            liveSaldoKasbon={getEmployeeKasbonSaldo(printJob.item.nik, printJob.item.nama)}
          />
        </div>
      )}

      {printJob.type === 'batch-slips' &&
        Array.from({ length: Math.ceil(printJob.items.length / 4) }).map((_, pageIdx) => (
          <div key={pageIdx} className="a4-page-grid">
            {printJob.items.slice(pageIdx * 4, pageIdx * 4 + 4).map((item, i) => (
              <CompactSlip
                key={`${item.nik}-${pageIdx}-${i}`}
                item={item}
                liveSaldoKasbon={getEmployeeKasbonSaldo(item.nik, item.nama)}
              />
            ))}
          </div>
        ))}

      {printJob.type === 'kt-nota' && <KtNotaSheet trx={printJob.trx} />}

      {printJob.type === 'kt-laporan' && <KtLaporanSheet transactions={printJob.transactions} />}
    </div>
  );
}
