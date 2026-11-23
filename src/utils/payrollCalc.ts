import type {
  DivisionName,
  DivisionSummaryRow,
  PayrollCalculation,
  PayrollCycle,
  PayrollRecord,
} from '../types/payroll';
import { cleanRupiahToNumber, formatRupiah } from './format';

export function getSkemaDisplay(item: PayrollRecord): DivisionName {
  const raw = (item.skema || item.tipe || item.divisi || '').toString().toLowerCase();
  if (raw.includes('spd')) return 'Supir SPD';
  if (raw.includes('supir') || raw.includes('b3')) return 'Supir B3';
  return 'Karyawan limbah';
}

export function getPeriodeDisplay(item: PayrollRecord): string {
  return (item.periodeTanggal || item.periodeBulan || item.periodeWaktu || '-')
    .toString()
    .trim();
}

export function getStatusDisplay(item: PayrollRecord): string {
  return (item.status || item.statusBayar || 'Draft').toString();
}

export function getSiklusDisplay(item: PayrollRecord): PayrollCycle {
  const raw = (item.siklusGaji || '').toString().trim().toLowerCase();
  if (raw.includes('bulan')) return 'Bulanan';
  if (raw.includes('minggu')) return 'Mingguan';
  return 'Mingguan';
}

export function calculateTHP(item: PayrollRecord): PayrollCalculation {
  const skema = getSkemaDisplay(item);
  const tripVal = cleanRupiahToNumber(item.trip);
  const upahTripVal = cleanRupiahToNumber(item.upahPerTrip);
  const hrVal = cleanRupiahToNumber(item.hariKerja || item.hadir || item.spsHadir);
  const upahHariVal = cleanRupiahToNumber(item.upahPerHari);

  const isTrip =
    skema === 'Supir B3' ||
    (skema === 'Supir SPD' && (tripVal > 0 || item.satuanPokok === 'trip'));

  const unitPokok = isTrip ? tripVal : hrVal;
  const tarifPokok = isTrip ? upahTripVal : upahHariVal;
  const gapok =
    unitPokok > 0 && tarifPokok > 0
      ? unitPokok * tarifPokok
      : cleanRupiahToNumber(item.gapok);

  const lemburHari = cleanRupiahToNumber(item.lemburHari);
  const upahLemburHari = cleanRupiahToNumber(item.upahLemburHari);
  let nomHari = cleanRupiahToNumber(item.nominalLemburHari) || lemburHari * upahLemburHari;

  const jamUtama = cleanRupiahToNumber(item.jamLembur);
  const tambahanJam = cleanRupiahToNumber(item.tambahanJamLembur);
  const totalJam = jamUtama + tambahanJam;
  const upahPerJam = cleanRupiahToNumber(item.upahPerJam);
  let nomJam = cleanRupiahToNumber(item.nominalLemburJam) || totalJam * upahPerJam;

  const inap = cleanRupiahToNumber(item.inap);
  const upahPerInap = cleanRupiahToNumber(item.upahPerInap);
  let nomInap = cleanRupiahToNumber(item.nominalLemburInap) || inap * upahPerInap;

  let lemburNominal = nomHari + nomJam + nomInap;
  if (lemburNominal === 0) {
    const lNom = cleanRupiahToNumber(item.lemburNominal);
    const lVol = cleanRupiahToNumber(item.lemburVolume);
    const lTar = cleanRupiahToNumber(item.lemburTarif);
    const lJns = (item.lemburJenis || '').toString().toLowerCase();
    lemburNominal = lNom || lVol * lTar;
    if (lemburNominal > 0 || lVol > 0) {
      if (lJns.includes('inap')) nomInap = lemburNominal;
      else if (lJns.includes('hari')) nomHari = lemburNominal;
      else nomJam = lemburNominal;
    }
  }

  const parts: string[] = [];
  if (lemburHari > 0 || nomHari > 0) {
    parts.push(`${lemburHari || cleanRupiahToNumber(item.lemburVolume)} Hari`);
  }
  if (totalJam > 0 || nomJam > 0) {
    parts.push(`${totalJam || cleanRupiahToNumber(item.lemburVolume)} Jam`);
  }
  if (inap > 0 || nomInap > 0) {
    parts.push(`${inap || cleanRupiahToNumber(item.lemburVolume)} Inap`);
  }

  const breakdownText =
    item.lemburBreakdown ||
    (parts.length > 0
      ? parts.join(' + ')
      : lemburNominal > 0
        ? item.lemburJenis || 'Lembur'
        : '0');

  const gajiKotor = cleanRupiahToNumber(item.gajiKotor) || gapok + lemburNominal;
  const kasbon = cleanRupiahToNumber(item.kasbon);
  const bpjs = cleanRupiahToNumber(item.bpjs);
  let totalPot = cleanRupiahToNumber(item.totalPotongan);
  if (totalPot === 0) totalPot = kasbon + bpjs;

  let thp = cleanRupiahToNumber(item.thp);
  if (thp === 0 && (gajiKotor > 0 || totalPot > 0)) {
    thp = gajiKotor - totalPot;
  }

  return {
    skema,
    isTrip,
    unitPokok,
    tarifPokok,
    gapok,
    lemburHari,
    upahLemburHari,
    nomHari,
    jamUtama,
    tambahanJam,
    totalJam,
    upahPerJam,
    nomJam,
    inap,
    upahPerInap,
    nomInap,
    lemburNominal,
    breakdownText,
    gajiKotor,
    kasbon,
    bpjs,
    totalPot,
    thp,
    keterangan: item.keterangan || '-',
  };
}

export function buildDivisionSummary(items: PayrollRecord[]): DivisionSummaryRow[] {
  const map: Record<string, DivisionSummaryRow> = {};
  items.forEach((item) => {
    const divisi = getSkemaDisplay(item);
    const calc = calculateTHP(item);
    if (!map[divisi]) {
      map[divisi] = { divisi, count: 0, gapok: 0, lembur: 0, pot: 0, thp: 0 };
    }
    map[divisi].count += 1;
    map[divisi].gapok += calc.gapok;
    map[divisi].lembur += calc.lemburNominal;
    map[divisi].pot += calc.totalPot;
    map[divisi].thp += calc.thp;
  });
  return Object.values(map).sort((a, b) => b.thp - a.thp);
}

export interface OvertimeRowItem {
  label: string;
  amount: number;
}

/**
 * Returns structured overtime rows only for overtime types the employee actually has (> 0).
 */
export function getActiveOvertimeRows(c: PayrollCalculation): OvertimeRowItem[] {
  const rows: OvertimeRowItem[] = [];
  if (c.nomHari > 0 || c.lemburHari > 0) {
    rows.push({
      label: c.lemburHari > 0 ? `Lembur Harian (${c.lemburHari} HR)` : 'Lembur Harian',
      amount: c.nomHari,
    });
  }
  if (c.nomJam > 0 || c.totalJam > 0) {
    rows.push({
      label: c.totalJam > 0 ? `Lembur (${c.totalJam} Jam)` : 'Lembur Jam',
      amount: c.nomJam,
    });
  }
  if (c.nomInap > 0 || c.inap > 0) {
    rows.push({
      label: c.inap > 0 ? `Lembur Inap (${c.inap} Inap)` : 'Lembur Inap',
      amount: c.nomInap,
    });
  }
  return rows;
}

/**
 * Returns only the overtime breakdown entries that the employee actually has (> 0),
 * avoiding noisy "Rp 0" items on pay slips.
 */
export function getActiveOvertimeDetails(c: PayrollCalculation): string[] {
  const details: string[] = [];
  if (c.nomHari > 0 || c.lemburHari > 0) {
    const qty = c.lemburHari > 0 ? ` (${c.lemburHari} HR)` : '';
    details.push(`Harian${qty}: ${formatRupiah(c.nomHari)}`);
  }
  if (c.nomJam > 0 || c.totalJam > 0) {
    const qty = c.totalJam > 0 ? ` (${c.totalJam} Jam)` : '';
    details.push(`Jam${qty}: ${formatRupiah(c.nomJam)}`);
  }
  if (c.nomInap > 0 || c.inap > 0) {
    const qty = c.inap > 0 ? ` (${c.inap} Inap)` : '';
    details.push(`Inap${qty}: ${formatRupiah(c.nomInap)}`);
  }
  return details;
}

export function getOvertimeDetailSummary(c: PayrollCalculation): string {
  const active = getActiveOvertimeDetails(c);
  if (active.length === 0) return 'Tidak ada lembur';
  return `Rincian: ${active.join(' | ')}`;
}

export interface SlipKasbonInfo {
  hasKasbonNotice: boolean;
  saldoAwal: number;
  potonganKasbon: number;
  sisaKasbon: number;
}

/**
 * Resolves kasbon deduction and remaining debt balance for a pay slip,
 * combining snapshot values stored on the payroll record with the employee's live kasbon balance.
 */
export function resolveSlipKasbonInfo(
  item: PayrollRecord,
  c: PayrollCalculation,
  liveSaldoKasbon = 0,
): SlipKasbonInfo {
  const potonganKasbon = Math.max(0, c.kasbon || 0);
  const hasRecordedSisa =
    item.sisaKasbonSetelah !== undefined &&
    item.sisaKasbonSetelah !== null &&
    item.sisaKasbonSetelah !== '';
  const hasRecordedAwal =
    item.saldoKasbonAwal !== undefined &&
    item.saldoKasbonAwal !== null &&
    item.saldoKasbonAwal !== '';

  const sisaKasbon = hasRecordedSisa
    ? Math.max(0, cleanRupiahToNumber(item.sisaKasbonSetelah))
    : Math.max(0, liveSaldoKasbon || 0);

  const saldoAwal = hasRecordedAwal
    ? Math.max(0, cleanRupiahToNumber(item.saldoKasbonAwal))
    : sisaKasbon + potonganKasbon;

  return {
    hasKasbonNotice: potonganKasbon > 0 || sisaKasbon > 0,
    saldoAwal,
    potonganKasbon,
    sisaKasbon,
  };
}

