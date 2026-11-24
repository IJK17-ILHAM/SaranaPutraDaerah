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
  cleanRupiahToNumber,
  formatDateFullID,
  formatDateShortID,
  formatNumberWithDots,
  formatRupiah,
  normalizeInvoiceCode,
} from '../../utils/format';
import {
  calculateTHP,
  getActiveOvertimeRows,
  getPeriodeDisplay,
  getSiklusDisplay,
  getStatusDisplay,
  resolveSlipKasbonInfo,
} from '../../utils/payrollCalc';
import { SpdLogoWordmark } from '../common/SpdLogo';

export function SingleEnvelopeSlip({
  item,
  liveSaldoKasbon = 0,
}: {
  item: PayrollRecord;
  liveSaldoKasbon?: number;
}) {
  const c = calculateTHP(item);
  const periode = getPeriodeDisplay(item);
  const siklus = getSiklusDisplay(item);
  const status = getStatusDisplay(item).toUpperCase();
  const activeOvertimeRows = getActiveOvertimeRows(c);
  const kasbonInfo = resolveSlipKasbonInfo(item, c, liveSaldoKasbon);
  const tunjanganVal = cleanRupiahToNumber(item.tunjangan);

  const pokokLabel = c.isTrip
    ? `Gaji Pokok (${c.unitPokok} Trip × ${formatRupiah(c.tarifPokok)})`
    : `Gaji Pokok (${c.unitPokok} HR × ${formatRupiah(c.tarifPokok)})`;
  const unitLabel = c.isTrip
    ? `${c.unitPokok} Trip${c.lemburNominal > 0 ? ` • ${c.breakdownText}` : ''}`
    : `${c.unitPokok} HR${c.lemburNominal > 0 ? ` • ${c.breakdownText}` : ''}`;
  const kasbonLabel =
    c.keterangan && c.keterangan !== '-' ? `Potongan Kasbon (${c.keterangan})` : 'Potongan Kasbon';
  const sisaKasbonText = kasbonInfo.hasKasbonNotice
    ? kasbonInfo.sisaKasbon > 0
      ? formatRupiah(kasbonInfo.sisaKasbon)
      : 'Lunas (Rp 0)'
    : '–';

  const incomeRows: Array<{ label: string; value: string }> = [
    { label: pokokLabel, value: formatRupiah(c.gapok) },
    ...(activeOvertimeRows.length > 0
      ? activeOvertimeRows.map((row) => ({ label: row.label, value: formatRupiah(row.amount) }))
      : [{ label: 'Lembur', value: '–' }]),
  ];
  if (tunjanganVal > 0 || incomeRows.length < 3) {
    incomeRows.push({
      label: 'Tunjangan Lainnya',
      value: tunjanganVal > 0 ? formatRupiah(tunjanganVal) : '–',
    });
  }

  return (
    <div className="slip-table-container">
      {/* Top Black Header Banner */}
      <div
        style={{
          background: '#000000',
          color: '#FFFFFF',
          padding: '15px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div
          style={{
            fontSize: '28px',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            color: '#FFFFFF',
          }}
        >
          spd.
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              color: '#FFFFFF',
              lineHeight: 1.15,
            }}
          >
            SLIP GAJI
          </div>
          <div
            style={{
              fontSize: '8.5px',
              fontWeight: 500,
              letterSpacing: '0.06em',
              color: '#D4D4D8',
              marginTop: '3px',
            }}
          >
            PT. SARANA PUTRA DAERAH
          </div>
        </div>
      </div>

      {/* Main White Body */}
      <div style={{ padding: '16px 24px 14px 24px', background: '#FFFFFF' }}>
        {/* Period & Status Row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '14px',
          }}
        >
          <div style={{ fontSize: '10.5px', color: '#4B5563' }}>
            Periode: <b style={{ color: '#000000' }}>{periode}</b> ({siklus})
          </div>
          <span
            style={{
              border: '1.2px solid #000000',
              borderRadius: '9999px',
              padding: '3.5px 14px',
              fontSize: '9px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              color: '#000000',
              background: '#FFFFFF',
              whiteSpace: 'nowrap',
            }}
          >
            STATUS: {status}
          </span>
        </div>

        {/* Employee Info Grid (2x2 clean hairlines) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            columnGap: '28px',
            marginBottom: '14px',
            fontSize: '10px',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                padding: '5px 0',
                borderBottom: '1px solid #D1D5DB',
              }}
            >
              <span style={{ width: '82px', color: '#6B7280', flexShrink: 0 }}>Nama</span>
              <span style={{ fontWeight: 700, color: '#000000' }}>{item.nama || '-'}</span>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                padding: '5px 0',
                borderBottom: '1px solid #D1D5DB',
              }}
            >
              <span style={{ width: '82px', color: '#6B7280', flexShrink: 0 }}>No / NIK</span>
              <span style={{ fontWeight: 700, color: '#000000', fontVariantNumeric: 'tabular-nums' }}>
                {item.nik || '-'}
              </span>
            </div>
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                padding: '5px 0',
                borderBottom: '1px solid #D1D5DB',
              }}
            >
              <span style={{ width: '86px', color: '#6B7280', flexShrink: 0 }}>Divisi</span>
              <span style={{ fontWeight: 700, color: '#000000' }}>{c.skema}</span>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                padding: '5px 0',
                borderBottom: '1px solid #D1D5DB',
              }}
            >
              <span style={{ width: '86px', color: '#6B7280', flexShrink: 0 }}>Rincian Kerja</span>
              <span style={{ fontWeight: 700, color: '#000000', fontVariantNumeric: 'tabular-nums' }}>
                {unitLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Two Side-by-Side Rounded Cards: PENGHASILAN & POTONGAN */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '14px',
            marginBottom: '13px',
          }}
        >
          {/* Left Card: PENGHASILAN */}
          <div
            style={{
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              background: '#FFFFFF',
            }}
          >
            <div
              style={{
                background: '#F3F4F6',
                borderBottom: '1px solid #D1D5DB',
                padding: '7px 12px',
                fontSize: '9.5px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                color: '#000000',
              }}
            >
              PENGHASILAN
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {incomeRows.map((row, idx) => (
                <div
                  key={`${row.label}-${idx}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6.5px 12px',
                    borderBottom: '1px solid #E5E7EB',
                    fontSize: '10px',
                  }}
                >
                  <span style={{ color: '#374151' }}>{row.label}</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: '#000000',
                      whiteSpace: 'nowrap',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
              <div
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7.5px 12px',
                  fontSize: '10.5px',
                  fontWeight: 800,
                  color: '#000000',
                  background: '#FFFFFF',
                }}
              >
                <span>GAJI KOTOR</span>
                <span style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  {formatRupiah(c.gajiKotor)}
                </span>
              </div>
            </div>
          </div>

          {/* Right Card: POTONGAN */}
          <div
            style={{
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              background: '#FFFFFF',
            }}
          >
            <div
              style={{
                background: '#F3F4F6',
                borderBottom: '1px solid #D1D5DB',
                padding: '7px 12px',
                fontSize: '9.5px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                color: '#000000',
              }}
            >
              POTONGAN
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6.5px 12px',
                  borderBottom: '1px solid #E5E7EB',
                  fontSize: '10px',
                }}
              >
                <span style={{ color: '#374151' }}>{kasbonLabel}</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: '#000000',
                    whiteSpace: 'nowrap',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatRupiah(c.kasbon)}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6.5px 12px',
                  borderBottom: '1px solid #E5E7EB',
                  fontSize: '10px',
                }}
              >
                <span style={{ color: '#374151' }}>Iuran BPJS</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: '#000000',
                    whiteSpace: 'nowrap',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatRupiah(c.bpjs)}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6.5px 12px',
                  borderBottom: '1px solid #E5E7EB',
                  fontSize: '10px',
                }}
              >
                <span style={{ color: '#374151' }}>Sisa Hutang / Kasbon</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: '#000000',
                    whiteSpace: 'nowrap',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {sisaKasbonText}
                </span>
              </div>
              <div
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7.5px 12px',
                  fontSize: '10.5px',
                  fontWeight: 800,
                  color: '#000000',
                  background: '#FFFFFF',
                }}
              >
                <span>JUMLAH POTONGAN</span>
                <span style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  {formatRupiah(c.totalPot)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* GAJI BERSIH (Take Home Pay) Black Rounded Banner */}
        <div
          style={{
            background: '#000000',
            color: '#FFFFFF',
            borderRadius: '8px',
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            marginBottom: kasbonInfo.hasKasbonNotice ? '10px' : '16px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.03em',
                color: '#FFFFFF',
              }}
            >
              GAJI BERSIH
            </div>
            <div style={{ fontSize: '9px', color: '#D1D5DB', marginTop: '2px' }}>Take Home Pay</div>
          </div>
          <div
            style={{
              fontSize: '21px',
              fontWeight: 900,
              color: '#FFFFFF',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
            }}
          >
            {formatRupiah(c.thp)}
          </div>
        </div>

        {/* Info Kasbon Monochrome Accent Strip */}
        {kasbonInfo.hasKasbonNotice && (
          <div
            style={{
              background: '#F3F4F6',
              borderRadius: '6px',
              borderLeft: '3.5px solid #000000',
              padding: '7.5px 12px',
              fontSize: '9.5px',
              color: '#374151',
              marginBottom: '16px',
              lineHeight: 1.4,
            }}
          >
            <b style={{ color: '#000000' }}>Info Kasbon:</b>{' '}
            {kasbonInfo.saldoAwal > 0 && (
              <>Saldo awal {formatRupiah(kasbonInfo.saldoAwal)} &bull; </>
            )}
            Potongan periode ini {formatRupiah(kasbonInfo.potonganKasbon)} &bull; Sisa{' '}
            {kasbonInfo.sisaKasbon > 0 ? formatRupiah(kasbonInfo.sisaKasbon) : 'Lunas (Rp 0)'}
          </div>
        )}

        {/* Signatures */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '64px',
            padding: '6px 36px 4px 36px',
            textAlign: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '9.5px', color: '#4B5563' }}>Diterima oleh,</div>
            <div style={{ height: '30px' }} />
            <div
              style={{
                borderTop: '1px solid #000000',
                paddingTop: '5px',
                fontSize: '10px',
                fontWeight: 700,
                color: '#000000',
              }}
            >
              ( {item.nama || 'Karyawan'} )
            </div>
          </div>
          <div>
            <div style={{ fontSize: '9.5px', color: '#4B5563' }}>Disetujui oleh, HR / Finance</div>
            <div style={{ height: '30px' }} />
            <div
              style={{
                borderTop: '1px solid #000000',
                paddingTop: '5px',
                fontSize: '10px',
                fontWeight: 700,
                color: '#000000',
              }}
            >
              ( PT. Sarana Putra Daerah )
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Black Footer Bar */}
      <div
        style={{
          background: '#000000',
          color: '#D4D4D8',
          textAlign: 'center',
          padding: '7px 16px',
          fontSize: '8.5px',
          letterSpacing: '0.01em',
        }}
      >
        Dokumen ini sah dan diterbitkan oleh PT. Sarana Putra Daerah &bull; Bersifat rahasia
      </div>
    </div>
  );
}

export function CompactSlip({
  item,
  liveSaldoKasbon = 0,
}: {
  item: PayrollRecord;
  liveSaldoKasbon?: number;
}) {
  const c = calculateTHP(item);
  const periode = getPeriodeDisplay(item);
  const siklus = getSiklusDisplay(item);
  const status = getStatusDisplay(item).toUpperCase();
  const activeOvertimeRows = getActiveOvertimeRows(c);
  const kasbonInfo = resolveSlipKasbonInfo(item, c, liveSaldoKasbon);
  const tunjanganVal = cleanRupiahToNumber(item.tunjangan);
  const unit = c.isTrip ? `${c.unitPokok} Trip` : `${c.unitPokok} HR`;
  const kasbonLabel =
    c.keterangan && c.keterangan !== '-' ? `Kasbon (${c.keterangan})` : 'Potongan Kasbon';
  const sisaKasbonText = kasbonInfo.hasKasbonNotice
    ? kasbonInfo.sisaKasbon > 0
      ? formatRupiah(kasbonInfo.sisaKasbon)
      : 'Lunas (Rp 0)'
    : '–';

  const incomeRows: Array<{ label: string; value: string }> = [
    {
      label: c.isTrip ? `Gaji Pokok (${c.unitPokok} Trip)` : `Gaji Pokok (${c.unitPokok} HR)`,
      value: formatRupiah(c.gapok),
    },
    ...(activeOvertimeRows.length > 0
      ? activeOvertimeRows.map((row) => ({ label: row.label, value: formatRupiah(row.amount) }))
      : [{ label: 'Lembur', value: '–' }]),
  ];
  if (tunjanganVal > 0 || incomeRows.length < 3) {
    incomeRows.push({
      label: 'Tunjangan Lainnya',
      value: tunjanganVal > 0 ? formatRupiah(tunjanganVal) : '–',
    });
  }

  return (
    <div className="slip-compact-container">
      {/* Top Black Header */}
      <div
        style={{
          background: '#000000',
          color: '#FFFFFF',
          padding: '8px 11px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: '18px',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            color: '#FFFFFF',
          }}
        >
          spd.
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              color: '#FFFFFF',
              lineHeight: 1.15,
            }}
          >
            SLIP GAJI
          </div>
          <div
            style={{
              fontSize: '6.5px',
              letterSpacing: '0.05em',
              color: '#D4D4D8',
              marginTop: '1.5px',
            }}
          >
            PT. SARANA PUTRA DAERAH
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: '9px 11px 7px 11px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#FFFFFF',
        }}
      >
        <div>
          {/* Period + Status Pill */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '8px',
            }}
          >
            <div style={{ fontSize: '7.5px', color: '#4B5563', minWidth: 0 }}>
              Periode: <b style={{ color: '#000000' }}>{periode}</b> ({siklus})
            </div>
            <span
              style={{
                border: '1px solid #000000',
                borderRadius: '9999px',
                padding: '2px 8px',
                fontSize: '6.8px',
                fontWeight: 800,
                letterSpacing: '0.03em',
                color: '#000000',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              STATUS: {status}
            </span>
          </div>

          {/* Info Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
              columnGap: '12px',
              marginBottom: '9px',
              fontSize: '7.4px',
              lineHeight: 1.3,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  padding: '3px 0',
                  borderBottom: '1px solid #D1D5DB',
                }}
              >
                <span style={{ width: '42px', color: '#6B7280', flexShrink: 0 }}>Nama</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: '#000000',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.nama || '-'}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  padding: '3px 0',
                  borderBottom: '1px solid #D1D5DB',
                }}
              >
                <span style={{ width: '42px', color: '#6B7280', flexShrink: 0 }}>No / NIK</span>
                <span style={{ fontWeight: 700, color: '#000000', fontVariantNumeric: 'tabular-nums' }}>
                  {item.nik || '-'}
                </span>
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  padding: '3px 0',
                  borderBottom: '1px solid #D1D5DB',
                }}
              >
                <span style={{ width: '46px', color: '#6B7280', flexShrink: 0 }}>Divisi</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: '#000000',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c.skema}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  padding: '3px 0',
                  borderBottom: '1px solid #D1D5DB',
                }}
              >
                <span style={{ width: '46px', color: '#6B7280', flexShrink: 0 }}>Kerja</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: '#000000',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {unit}
                  {c.lemburNominal > 0 ? ` • ${c.breakdownText}` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Side-by-Side Rounded Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
              gap: '7px',
              marginBottom: '8px',
            }}
          >
            {/* Penghasilan */}
            <div
              style={{
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  background: '#F3F4F6',
                  borderBottom: '1px solid #D1D5DB',
                  padding: '4px 6.5px',
                  fontSize: '7px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  color: '#000000',
                }}
              >
                PENGHASILAN
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {incomeRows.map((row, idx) => (
                  <div
                    key={`${row.label}-${idx}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3.8px 6.5px',
                      borderBottom: '1px solid #E5E7EB',
                      fontSize: '7px',
                      lineHeight: 1.25,
                    }}
                  >
                    <span
                      style={{
                        color: '#374151',
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.label}
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: '#000000',
                        whiteSpace: 'nowrap',
                        fontVariantNumeric: 'tabular-nums',
                        flexShrink: 0,
                      }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
                <div
                  style={{
                    marginTop: 'auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4.5px 6.5px',
                    fontSize: '7.4px',
                    fontWeight: 800,
                    color: '#000000',
                  }}
                >
                  <span>GAJI KOTOR</span>
                  <span style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {formatRupiah(c.gajiKotor)}
                  </span>
                </div>
              </div>
            </div>

            {/* Potongan */}
            <div
              style={{
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  background: '#F3F4F6',
                  borderBottom: '1px solid #D1D5DB',
                  padding: '4px 6.5px',
                  fontSize: '7px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  color: '#000000',
                }}
              >
                POTONGAN
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3.8px 6.5px',
                    borderBottom: '1px solid #E5E7EB',
                    fontSize: '7px',
                    lineHeight: 1.25,
                  }}
                >
                  <span
                    style={{
                      color: '#374151',
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {kasbonLabel}
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: '#000000',
                      whiteSpace: 'nowrap',
                      fontVariantNumeric: 'tabular-nums',
                      flexShrink: 0,
                    }}
                  >
                    {formatRupiah(c.kasbon)}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3.8px 6.5px',
                    borderBottom: '1px solid #E5E7EB',
                    fontSize: '7px',
                    lineHeight: 1.25,
                  }}
                >
                  <span style={{ color: '#374151' }}>Iuran BPJS</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: '#000000',
                      whiteSpace: 'nowrap',
                      fontVariantNumeric: 'tabular-nums',
                      flexShrink: 0,
                    }}
                  >
                    {formatRupiah(c.bpjs)}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3.8px 6.5px',
                    borderBottom: '1px solid #E5E7EB',
                    fontSize: '7px',
                    lineHeight: 1.25,
                  }}
                >
                  <span style={{ color: '#374151' }}>Sisa Kasbon</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: '#000000',
                      whiteSpace: 'nowrap',
                      fontVariantNumeric: 'tabular-nums',
                      flexShrink: 0,
                    }}
                  >
                    {sisaKasbonText}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 'auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4.5px 6.5px',
                    fontSize: '7.4px',
                    fontWeight: 800,
                    color: '#000000',
                  }}
                >
                  <span>JUMLAH POT.</span>
                  <span style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {formatRupiah(c.totalPot)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Black Rounded THP Banner */}
          <div
            style={{
              background: '#000000',
              color: '#FFFFFF',
              borderRadius: '6px',
              padding: '8px 11px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: kasbonInfo.hasKasbonNotice ? '6px' : '0',
            }}
          >
            <div>
              <div style={{ fontSize: '8.2px', fontWeight: 800, color: '#FFFFFF' }}>GAJI BERSIH</div>
              <div style={{ fontSize: '6.6px', color: '#D1D5DB', marginTop: '1px' }}>
                Take Home Pay
              </div>
            </div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 900,
                color: '#FFFFFF',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
              }}
            >
              {formatRupiah(c.thp)}
            </div>
          </div>

          {/* Compact Info Kasbon Strip */}
          {kasbonInfo.hasKasbonNotice && (
            <div
              style={{
                background: '#F3F4F6',
                borderRadius: '4px',
                borderLeft: '2.5px solid #000000',
                padding: '4.5px 7px',
                fontSize: '6.7px',
                color: '#374151',
                lineHeight: 1.35,
              }}
            >
              <b style={{ color: '#000000' }}>Info Kasbon:</b>{' '}
              {kasbonInfo.saldoAwal > 0 && <>Saldo awal {formatRupiah(kasbonInfo.saldoAwal)} &bull; </>}
              Potongan periode ini {formatRupiah(kasbonInfo.potonganKasbon)} &bull; Sisa{' '}
              {kasbonInfo.sisaKasbon > 0 ? formatRupiah(kasbonInfo.sisaKasbon) : 'Lunas (Rp 0)'}
            </div>
          )}
        </div>

        {/* Signatures */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '22px',
            padding: '6px 14px 3px 14px',
            textAlign: 'center',
            fontSize: '7.2px',
          }}
        >
          <div>
            <div style={{ color: '#4B5563' }}>Diterima oleh,</div>
            <div style={{ height: '22px' }} />
            <div
              style={{
                borderTop: '1px solid #000000',
                paddingTop: '3px',
                fontWeight: 700,
                color: '#000000',
              }}
            >
              ( {item.nama || 'Karyawan'} )
            </div>
          </div>
          <div>
            <div style={{ color: '#4B5563' }}>Disetujui oleh, HR / Finance</div>
            <div style={{ height: '22px' }} />
            <div
              style={{
                borderTop: '1px solid #000000',
                paddingTop: '3px',
                fontWeight: 700,
                color: '#000000',
              }}
            >
              ( PT. Sarana Putra Daerah )
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Black Footer */}
      <div
        style={{
          background: '#000000',
          color: '#D4D4D8',
          textAlign: 'center',
          padding: '4.5px 8px',
          fontSize: '6.3px',
          flexShrink: 0,
        }}
      >
        Dokumen ini sah dan diterbitkan oleh PT. Sarana Putra Daerah &bull; Bersifat rahasia
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
