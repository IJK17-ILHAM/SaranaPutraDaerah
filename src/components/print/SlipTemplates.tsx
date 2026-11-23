import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Hash,
  MapPin,
} from 'lucide-react';
import type { KtTransaction } from '../../types/kasTonase';
import type { PayrollRecord } from '../../types/payroll';
import {
  formatDateFullID,
  formatDateShortID,
  formatNumberWithDots,
  formatRupiah,
  normalizeInvoiceCode,
} from '../../utils/format';
import { calculateTHP, getPeriodeDisplay, getStatusDisplay } from '../../utils/payrollCalc';
import { SpdLogoWordmark } from '../common/SpdLogo';

export function SingleEnvelopeSlip({ item }: { item: PayrollRecord }) {
  const c = calculateTHP(item);
  const periode = getPeriodeDisplay(item);
  const pokokLabel = c.isTrip
    ? `Gaji Pokok (${c.unitPokok} Trip × ${formatRupiah(c.tarifPokok)})`
    : `Gaji Pokok (${c.unitPokok} HR × ${formatRupiah(c.tarifPokok)})`;
  const unitLabel = c.isTrip
    ? `${c.unitPokok} Trip • ${c.breakdownText}`
    : `${c.unitPokok} HR • ${c.breakdownText}`;

  return (
    <div className="slip-table-container">
      <table style={{ border: 'none', marginBottom: '4px' }}>
        <tbody>
          <tr style={{ border: 'none' }}>
            <td style={{ border: 'none', width: '65%', padding: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 900, color: '#000' }}>
                PT. SARANA PUTRA DAERAH
              </div>
              <div style={{ fontSize: '8.5px', color: '#4a5568' }}>
                SLIP GAJI RESMI KARYAWAN &bull; PERIODE: <b>{periode}</b>
              </div>
            </td>
            <td style={{ border: 'none', width: '35%', textAlign: 'right', padding: 0 }}>
              <span
                style={{
                  border: '1px solid #000',
                  background: '#edf2f7',
                  fontWeight: 'bold',
                  fontSize: '8.5px',
                  padding: '2px 6px',
                  textTransform: 'uppercase',
                }}
              >
                DIVISI: {c.skema}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <table style={{ marginBottom: '5px' }}>
        <tbody>
          <tr style={{ background: '#f7fafc' }}>
            <td style={{ width: '15%', fontWeight: 'bold' }}>Nama Karyawan</td>
            <td style={{ width: '35%', fontWeight: 'bold' }}>: {item.nama}</td>
            <td style={{ width: '15%', fontWeight: 'bold' }}>Divisi</td>
            <td style={{ width: '35%' }}>: {c.skema}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold' }}>No / NIK</td>
            <td>: {item.nik}</td>
            <td style={{ fontWeight: 'bold' }}>Rincian Kerja</td>
            <td>: {unitLabel}</td>
          </tr>
        </tbody>
      </table>

      <table style={{ marginBottom: '4px' }}>
        <thead>
          <tr style={{ background: '#edf2f7', textAlign: 'center', fontWeight: 'bold' }}>
            <th style={{ width: '33%' }}>KOMPONEN PENGHASILAN</th>
            <th style={{ width: '17%' }}>JUMLAH (Rp)</th>
            <th style={{ width: '33%' }}>KOMPONEN POTONGAN</th>
            <th style={{ width: '17%' }}>JUMLAH (Rp)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{pokokLabel}</td>
            <td style={{ textAlign: 'right' }}>{formatRupiah(c.gapok)}</td>
            <td>Potongan Kasbon ({c.keterangan})</td>
            <td style={{ textAlign: 'right' }}>{formatRupiah(c.kasbon)}</td>
          </tr>
          <tr>
            <td>Lembur ({c.breakdownText})</td>
            <td style={{ textAlign: 'right' }}>{formatRupiah(c.lemburNominal)}</td>
            <td>Iuran BPJS</td>
            <td style={{ textAlign: 'right' }}>{formatRupiah(c.bpjs)}</td>
          </tr>
          <tr>
            <td>
              Rincian: Harian {formatRupiah(c.nomHari)} | Jam {formatRupiah(c.nomJam)} | Inap{' '}
              {formatRupiah(c.nomInap)}
            </td>
            <td style={{ textAlign: 'right' }}>-</td>
            <td>-</td>
            <td style={{ textAlign: 'right' }}>-</td>
          </tr>
          <tr style={{ background: '#f7fafc', fontWeight: 'bold' }}>
            <td>GAJI KOTOR</td>
            <td style={{ textAlign: 'right' }}>{formatRupiah(c.gajiKotor)}</td>
            <td>JUMLAH POTONGAN</td>
            <td style={{ textAlign: 'right' }}>{formatRupiah(c.totalPot)}</td>
          </tr>
        </tbody>
      </table>

      <table style={{ marginBottom: '6px' }}>
        <tbody>
          <tr style={{ background: '#edf2f7' }}>
            <td style={{ width: '60%', fontWeight: 900, fontSize: '11px' }}>
              GAJI BERSIH (TAKE HOME PAY)
            </td>
            <td
              style={{
                width: '25%',
                textAlign: 'right',
                fontWeight: 900,
                fontSize: '12px',
              }}
            >
              {formatRupiah(c.thp)}
            </td>
            <td
              style={{
                width: '15%',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '9px',
              }}
            >
              STATUS: {getStatusDisplay(item).toUpperCase()}
            </td>
          </tr>
        </tbody>
      </table>

      <table style={{ border: 'none' }}>
        <tbody>
          <tr style={{ border: 'none' }}>
            <td style={{ border: 'none', width: '50%', textAlign: 'center', paddingTop: '10px' }}>
              <div style={{ fontSize: '9px' }}>Diterima Oleh,</div>
              <div style={{ height: '26px' }} />
              <div style={{ fontSize: '9.5px', fontWeight: 'bold' }}>( {item.nama} )</div>
            </td>
            <td style={{ border: 'none', width: '50%', textAlign: 'center', paddingTop: '10px' }}>
              <div style={{ fontSize: '9px' }}>Disetujui Oleh, HR / Finance</div>
              <div style={{ height: '26px' }} />
              <div style={{ fontSize: '9.5px', fontWeight: 'bold' }}>
                ( PT. SARANA PUTRA DAERAH )
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function CompactSlip({ item }: { item: PayrollRecord }) {
  const c = calculateTHP(item);
  const periode = getPeriodeDisplay(item);
  const unit = c.isTrip ? `${c.unitPokok} Trip` : `${c.unitPokok} HR`;

  return (
    <div className="slip-compact-container">
      <div>
        <table style={{ border: 'none', marginBottom: '3px' }}>
          <tbody>
            <tr style={{ border: 'none' }}>
              <td style={{ border: 'none', padding: 0 }}>
                <div style={{ fontWeight: 900, fontSize: '10px' }}>PT. SARANA PUTRA DAERAH</div>
                <div style={{ fontSize: '7.5px' }}>
                  SLIP GAJI &bull; PERIODE: <b>{periode}</b>
                </div>
              </td>
              <td style={{ border: 'none', padding: 0, textAlign: 'right', verticalAlign: 'top' }}>
                <span
                  style={{
                    border: '1px solid #000',
                    padding: '1px 4px',
                    fontWeight: 'bold',
                    fontSize: '7.5px',
                  }}
                >
                  {c.skema.toUpperCase()}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <table style={{ marginBottom: '3px' }}>
          <tbody>
            <tr>
              <td style={{ width: '18%', fontWeight: 'bold' }}>Nama</td>
              <td style={{ width: '32%', fontWeight: 'bold' }}>{item.nama}</td>
              <td style={{ width: '18%', fontWeight: 'bold' }}>Divisi</td>
              <td style={{ width: '32%' }}>{c.skema}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold' }}>No/NIK</td>
              <td>{item.nik}</td>
              <td style={{ fontWeight: 'bold' }}>Kerja</td>
              <td>
                {unit} / {c.breakdownText}
              </td>
            </tr>
          </tbody>
        </table>

        <table style={{ marginBottom: '3px' }}>
          <thead>
            <tr style={{ background: '#edf2f7', fontWeight: 'bold', textAlign: 'center' }}>
              <th>PENGHASILAN</th>
              <th>NOMINAL</th>
              <th>POTONGAN</th>
              <th>NOMINAL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{c.isTrip ? `Trip (${c.unitPokok})` : `Gaji Pokok (${c.unitPokok} HR)`}</td>
              <td style={{ textAlign: 'right' }}>{formatRupiah(c.gapok)}</td>
              <td>Kasbon</td>
              <td style={{ textAlign: 'right' }}>{formatRupiah(c.kasbon)}</td>
            </tr>
            <tr>
              <td>Lembur ({c.breakdownText})</td>
              <td style={{ textAlign: 'right' }}>{formatRupiah(c.lemburNominal)}</td>
              <td>BPJS</td>
              <td style={{ textAlign: 'right' }}>{formatRupiah(c.bpjs)}</td>
            </tr>
            <tr>
              <td>Keterangan</td>
              <td style={{ textAlign: 'right' }}>{c.keterangan}</td>
              <td>-</td>
              <td style={{ textAlign: 'right' }}>-</td>
            </tr>
            <tr style={{ fontWeight: 'bold', background: '#f7fafc' }}>
              <td>Gaji Kotor</td>
              <td style={{ textAlign: 'right' }}>{formatRupiah(c.gajiKotor)}</td>
              <td>Total Pot.</td>
              <td style={{ textAlign: 'right' }}>{formatRupiah(c.totalPot)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <table style={{ marginBottom: '4px' }}>
          <tbody>
            <tr style={{ background: '#edf2f7', fontWeight: 900 }}>
              <td style={{ width: '55%' }}>GAJI BERSIH (THP)</td>
              <td style={{ width: '45%', textAlign: 'right', fontSize: '9.5px' }}>
                {formatRupiah(c.thp)}
              </td>
            </tr>
          </tbody>
        </table>

        <table style={{ border: 'none' }}>
          <tbody>
            <tr style={{ border: 'none' }}>
              <td style={{ border: 'none', width: '50%', textAlign: 'center', paddingTop: '4px' }}>
                <div>Penerima,</div>
                <div style={{ height: '18px' }} />
                <div style={{ fontWeight: 'bold' }}>({item.nama})</div>
              </td>
              <td style={{ border: 'none', width: '50%', textAlign: 'center', paddingTop: '4px' }}>
                <div>HR / Finance,</div>
                <div style={{ height: '18px' }} />
                <div style={{ fontWeight: 'bold' }}>(PT. SPD)</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function KtNotaSheet({ trx }: { trx: KtTransaction }) {
  const isJual = trx.tipe === 'Jual';
  const isLunas = (trx.sisa || 0) === 0;
  const statusText = isLunas ? 'Lunas' : 'Belum Lunas';

  return (
    <div
      className="bg-white text-[#1E293B] mx-auto overflow-hidden"
      style={{
        maxWidth: '195mm',
        width: '100%',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        border: '1px solid #E5E7EB',
      }}
    >
      <div style={{ padding: '30px 34px 28px 34px' }}>
        {/* Header Row: spd. Logo Left + INVOICE / NOTA BELI Right */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '16px',
            marginBottom: '26px',
          }}
        >
          <div>
            <SpdLogoWordmark variant="on-light" size="invoice" />
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#1E3A6E',
                marginTop: '8px',
                letterSpacing: '0.01em',
              }}
            >
              PT. SARANA PUTRA DAERAH
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '5px',
                fontSize: '10.5px',
                color: '#64748B',
                lineHeight: 1.45,
                marginTop: '4px',
              }}
            >
              <MapPin
                style={{
                  width: '12px',
                  height: '12px',
                  color: '#1E3A6E',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              />
              <span>
                Kp. Walahir, RT.08/RW.04, Nambo, Kec. Klapanunggal
                <br />
                Kabupaten Bogor, Jawa Barat 16820
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right', paddingTop: '2px' }}>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: '#1E3A6E',
                lineHeight: 1.05,
                letterSpacing: '0.04em',
              }}
            >
              {isJual ? 'INVOICE' : 'NOTA BELI'}
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11.5px',
                color: '#64748B',
                marginTop: '6px',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <Hash style={{ width: '11.5px', height: '11.5px', color: '#1E3A6E' }} />
              <span>No. {normalizeInvoiceCode(trx.nota)}</span>
            </div>
          </div>
        </div>

        {/* Clean Two-Column Info Row (matching mockup) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '24px',
            paddingBottom: '20px',
            marginBottom: '20px',
            borderBottom: '1px solid #EEF2F7',
          }}
        >
          <div style={{ maxWidth: '52%' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#1E3A6E',
              }}
            >
              <Building2 style={{ width: '12.5px', height: '12.5px' }} />
              <span>{isJual ? 'Ditagihkan kepada' : 'Pemasok'}</span>
            </div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: '#1E293B',
                marginTop: '5px',
                lineHeight: 1.3,
              }}
            >
              {trx.customer}
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>
              {isJual ? 'Transaksi Penjualan Tonase' : 'Transaksi Pembelian Tonase'}
            </div>
          </div>

          <div
            style={{
              textAlign: 'right',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '4px',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#1E3A6E',
              }}
            >
              <Calendar style={{ width: '12px', height: '12px' }} />
              <span>Hari / Tanggal</span>
            </div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#1E293B',
                whiteSpace: 'nowrap',
              }}
            >
              {formatDateFullID(trx.tanggal)}
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                marginTop: '2px',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ color: '#64748B' }}>Status:</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 700,
                  color: isLunas ? '#15803D' : '#B45309',
                }}
              >
                {isLunas ? (
                  <CheckCircle2 style={{ width: '12px', height: '12px' }} />
                ) : (
                  <Clock style={{ width: '12px', height: '12px' }} />
                )}
                <span>{statusText}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Items Table with Deep Navy Header Bar */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
          <thead>
            <tr style={{ backgroundColor: '#1E3A6E', color: '#FFFFFF' }}>
              <th
                style={{
                  padding: '10px 12px',
                  textAlign: 'left',
                  fontWeight: 700,
                  fontSize: '10.5px',
                  width: '8%',
                }}
              >
                No
              </th>
              <th
                style={{
                  padding: '10px 12px',
                  textAlign: 'left',
                  fontWeight: 700,
                  fontSize: '10.5px',
                  width: '38%',
                }}
              >
                Barang / Deskripsi
              </th>
              <th
                style={{
                  padding: '10px 12px',
                  textAlign: 'right',
                  fontWeight: 700,
                  fontSize: '10.5px',
                  width: '18%',
                }}
              >
                Berat Netto
              </th>
              <th
                style={{
                  padding: '10px 12px',
                  textAlign: 'right',
                  fontWeight: 700,
                  fontSize: '10.5px',
                  width: '18%',
                }}
              >
                Harga / Kg
              </th>
              <th
                style={{
                  padding: '10px 12px',
                  textAlign: 'right',
                  fontWeight: 700,
                  fontSize: '10.5px',
                  width: '18%',
                }}
              >
                Jumlah
              </th>
            </tr>
          </thead>
          <tbody>
            {(trx.items || []).map((it, i) => (
              <tr key={`${it.barangId}-${i}`} style={{ borderBottom: '1px solid #E5E7EB' }}>
                <td style={{ padding: '12px', color: '#64748B' }}>{i + 1}</td>
                <td style={{ padding: '12px', fontWeight: 600, color: '#1E293B' }}>{it.nama}</td>
                <td
                  style={{
                    padding: '12px',
                    textAlign: 'right',
                    color: '#334155',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatNumberWithDots(it.netto)} kg
                </td>
                <td
                  style={{
                    padding: '12px',
                    textAlign: 'right',
                    color: '#334155',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatRupiah(it.harga)}
                </td>
                <td
                  style={{
                    padding: '12px',
                    textAlign: 'right',
                    fontWeight: 700,
                    color: '#1E293B',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatRupiah(it.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Block with Signature Golden Amber Gradient Total Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <div style={{ width: '48%', minWidth: '250px', fontSize: '11.5px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 14px',
                color: '#64748B',
              }}
            >
              <span>Total Netto</span>
              <span
                style={{ color: '#1E293B', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
              >
                {formatNumberWithDots(trx.totalNetto)} kg
              </span>
            </div>

            {!isJual && (trx.potongUtang || 0) > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '4px 14px',
                  color: '#64748B',
                }}
              >
                <span>
                  Potong Utang Pemasok
                  {trx.potongUtangMode === 'persen' && trx.potongUtangInput
                    ? ` (${trx.potongUtangInput}%)`
                    : ''}
                </span>
                <span
                  style={{ color: '#1E3A6E', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                >
                  -{formatRupiah(trx.potongUtang || 0)}
                </span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 14px',
                color: '#64748B',
              }}
            >
              <span>Dibayar ({trx.metode})</span>
              <span
                style={{ color: '#1E293B', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
              >
                {formatRupiah(trx.dibayar)}
              </span>
            </div>

            {(trx.sisa || 0) > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '4px 14px',
                  color: '#64748B',
                }}
              >
                <span>Sisa Tagihan</span>
                <span
                  style={{ color: '#B45309', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatRupiah(trx.sisa)}
                </span>
              </div>
            )}

            <div
              style={{
                marginTop: '10px',
                background: 'linear-gradient(90deg, #F6D876 0%, #F5B038 100%)',
                color: '#1E3A6E',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontWeight: 800,
              }}
            >
              <span style={{ fontSize: '12.5px' }}>Total</span>
              <span style={{ fontSize: '16px', fontVariantNumeric: 'tabular-nums' }}>
                {formatRupiah(trx.totalBayar)}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Payment Info & Signature */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '24px',
            marginTop: '34px',
          }}
        >
          <div style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.65 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '10.5px',
                fontWeight: 700,
                color: '#1E3A6E',
                letterSpacing: '0.03em',
                marginBottom: '6px',
              }}
            >
              <CreditCard style={{ width: '12px', height: '12px' }} />
              <span>INFORMASI PEMBAYARAN</span>
            </div>
            <div>Metode Pembayaran: {trx.metode}</div>
            <div>
              Status Pembayaran: <b style={{ color: '#1E293B' }}>{statusText}</b>
            </div>
            <div>Atas Nama: PT. Sarana Putra Daerah</div>
            {!isJual &&
              (trx.potongUtang || 0) > 0 &&
              typeof trx.sisaUtangMitraSetelah === 'number' && (
                <div>
                  Sisa Utang Pemasok Setelah Potong:{' '}
                  <b style={{ color: '#1E293B' }}>{formatRupiah(trx.sisaUtangMitraSetelah)}</b>
                </div>
              )}
          </div>

          <div style={{ textAlign: 'center', minWidth: '170px', fontSize: '11px' }}>
            <div style={{ color: '#64748B' }}>Hormat kami,</div>
            <div style={{ height: '48px' }} />
            <div
              style={{
                borderTop: '1px solid #1E3A6E',
                paddingTop: '6px',
                fontWeight: 700,
                color: '#1E3A6E',
              }}
            >
              PT. Sarana Putra Daerah
            </div>
            <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>
              Admin / Keuangan
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Deep Navy Gradient Footer Bar (matching mockup) */}
      <div
        style={{
          background: 'linear-gradient(90deg, #18315A 0%, #2B599C 100%)',
          padding: '13px 34px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          fontSize: '10.5px',
          color: '#FFFFFF',
        }}
      >
        <span style={{ fontWeight: 600 }}>PT. Sarana Putra Daerah</span>
        <span style={{ color: 'rgba(255,255,255,0.88)' }}>
          Kp. Walahir, Klapanunggal, Kab. Bogor
        </span>
        <span style={{ color: 'rgba(255,255,255,0.88)' }}>Portal Kas &amp; Tonase</span>
      </div>
    </div>
  );
}

export function KtLaporanSheet({ transactions }: { transactions: KtTransaction[] }) {
  let totalBeli = 0;
  let totalJual = 0;
  let totalNetto = 0;

  transactions.forEach((t) => {
    if (t.tipe === 'Beli') totalBeli += t.totalBayar || 0;
    else totalJual += t.totalBayar || 0;
    totalNetto += t.totalNetto || 0;
  });

  return (
    <div className="print-report-sheet">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderBottom: '2px solid #000',
          paddingBottom: '6px',
        }}
      >
        <div>
          <div style={{ fontSize: '15px', fontWeight: 900 }}>PT. SARANA PUTRA DAERAH</div>
          <div style={{ fontSize: '11px', fontWeight: 'bold' }}>
            LAPORAN REKAPITULASI KAS &amp; TONASE
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '9px' }}>
          <div>Dicetak: {new Date().toLocaleDateString('id-ID')}</div>
          <div>
            Total Jual: <b>{formatRupiah(totalJual)}</b> | Total Beli:{' '}
            <b>{formatRupiah(totalBeli)}</b>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style={{ width: '5%' }}>No</th>
            <th style={{ width: '14%' }}>Tgl / Nota</th>
            <th style={{ width: '8%' }}>Tipe</th>
            <th style={{ width: '31%' }}>Customer &amp; Armada</th>
            <th style={{ width: '14%', textAlign: 'right' }}>Netto</th>
            <th style={{ width: '14%', textAlign: 'right' }}>Total Bayar</th>
            <th style={{ width: '14%', textAlign: 'right' }}>Sisa</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t, i) => (
            <tr key={t.id}>
              <td style={{ textAlign: 'center' }}>{i + 1}</td>
              <td>
                {formatDateShortID(t.tanggal)}
                <br />
                <span style={{ fontSize: '8px' }}>{normalizeInvoiceCode(t.nota)}</span>
              </td>
              <td style={{ textAlign: 'center' }}>{t.tipe}</td>
              <td>
                {t.customer} ({t.plat || '-'})
              </td>
              <td style={{ textAlign: 'right' }}>{formatNumberWithDots(t.totalNetto)} kg</td>
              <td style={{ textAlign: 'right' }}>{formatRupiah(t.totalBayar)}</td>
              <td style={{ textAlign: 'right' }}>{formatRupiah(t.sisa)}</td>
            </tr>
          ))}
          <tr style={{ background: '#f7fafc', fontWeight: 'bold' }}>
            <td colSpan={4} style={{ textAlign: 'right' }}>
              TOTAL TONASE
            </td>
            <td style={{ textAlign: 'right' }}>{formatNumberWithDots(totalNetto)} kg</td>
            <td colSpan={2} style={{ textAlign: 'right' }}>
              Selisih Jual - Beli: {formatRupiah(totalJual - totalBeli)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
