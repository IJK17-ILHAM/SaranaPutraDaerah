import { jsPDF } from 'jspdf';
import type { KtTransaction } from '../types/kasTonase';
import type { PayrollRecord } from '../types/payroll';
import {
  cleanRupiahToNumber,
  formatDateFullID,
  formatNumberWithDots,
  formatRupiah,
  normalizeInvoiceCode,
} from './format';
import {
  calculateTHP,
  getActiveOvertimeRows,
  getPeriodeDisplay,
  getSiklusDisplay,
  getStatusDisplay,
  resolveSlipKasbonInfo,
} from './payrollCalc';

export function downloadSingleSlipPDF(item: PayrollRecord, liveSaldoKasbon = 0): void {
  const c = calculateTHP(item);
  const periode = getPeriodeDisplay(item);
  const siklus = getSiklusDisplay(item);
  const status = getStatusDisplay(item).toUpperCase();
  const activeOvertimeRows = getActiveOvertimeRows(c);
  const kasbonInfo = resolveSlipKasbonInfo(item, c, liveSaldoKasbon);
  const tunjanganVal = cleanRupiahToNumber(item.tunjangan);

  // Preserve exact 220 x 110 mm envelope landscape dimensions
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [220, 110],
  });

  const pageW = 220;
  const pageH = 110;
  const marginX = 9;
  const contentW = pageW - marginX * 2;

  const BLACK: [number, number, number] = [0, 0, 0];
  const WHITE: [number, number, number] = [255, 255, 255];
  const GRAY_HEADER: [number, number, number] = [243, 244, 246];
  const GRAY_BORDER: [number, number, number] = [209, 213, 219];
  const GRAY_DIVIDER: [number, number, number] = [229, 231, 235];
  const TEXT_MUTED: [number, number, number] = [107, 114, 128];
  const TEXT_SUB: [number, number, number] = [55, 65, 81];

  // 1. Full-width Black Header Banner
  doc.setFillColor(...BLACK);
  doc.rect(0, 0, pageW, 12.5, 'F');

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('spd.', marginX, 8.6);

  doc.setFontSize(11);
  doc.text('SLIP GAJI', pageW - marginX, 6.2, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(212, 212, 216);
  doc.text('PT. SARANA PUTRA DAERAH', pageW - marginX, 9.8, { align: 'right' });

  // 2. Meta Row: Period + Status Pill
  let y = 17.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(...TEXT_SUB);
  doc.text('Periode: ', marginX, y);
  const perPrefixW = doc.getTextWidth('Periode: ');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK);
  doc.text(periode, marginX + perPrefixW, y);
  const perValW = doc.getTextWidth(periode);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_SUB);
  doc.text(` (${siklus})`, marginX + perPrefixW + perValW, y);

  // Status Pill Badge
  const statusText = `STATUS: ${status}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  const pillW = Math.max(28, doc.getTextWidth(statusText) + 9);
  const pillX = pageW - marginX - pillW;
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.35);
  doc.roundedRect(pillX, y - 4.1, pillW, 5.8, 2.9, 2.9, 'S');
  doc.setTextColor(...BLACK);
  doc.text(statusText, pillX + pillW / 2, y - 0.3, { align: 'center' });

  // 3. Employee Info Grid (2x2 clean bottom hairlines)
  y = 24.5;
  const colGap = 10;
  const halfW = (contentW - colGap) / 2;
  const rightColX = marginX + halfW + colGap;

  const unitLabel = c.isTrip
    ? `${c.unitPokok} Trip${c.lemburNominal > 0 ? ` • ${c.breakdownText}` : ''}`
    : `${c.unitPokok} HR${c.lemburNominal > 0 ? ` • ${c.breakdownText}` : ''}`;

  const drawInfoLine = (x: number, ly: number, label: string, val: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(label, x, ly);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLACK);
    doc.text(val, x + 26, ly, { maxWidth: halfW - 26 });
    doc.setDrawColor(...GRAY_BORDER);
    doc.setLineWidth(0.25);
    doc.line(x, ly + 1.6, x + halfW, ly + 1.6);
  };

  drawInfoLine(marginX, y, 'Nama', item.nama || '-');
  drawInfoLine(rightColX, y, 'Divisi', c.skema);
  drawInfoLine(marginX, y + 5.2, 'No / NIK', item.nik || '-');
  drawInfoLine(rightColX, y + 5.2, 'Rincian Kerja', unitLabel);

  // 4. Two Side-by-Side Rounded Cards: PENGHASILAN & POTONGAN
  y = 34;
  const cardGap = 6;
  const cardW = (contentW - cardGap) / 2;
  const rightCardX = marginX + cardW + cardGap;

  const pokokLabel = c.isTrip
    ? `Gaji Pokok (${c.unitPokok} Trip x ${formatRupiah(c.tarifPokok)})`
    : `Gaji Pokok (${c.unitPokok} HR x ${formatRupiah(c.tarifPokok)})`;
  const kasbonLabel =
    c.keterangan && c.keterangan !== '-' ? `Potongan Kasbon (${c.keterangan})` : 'Potongan Kasbon';
  const sisaKasbonText = kasbonInfo.hasKasbonNotice
    ? kasbonInfo.sisaKasbon > 0
      ? formatRupiah(kasbonInfo.sisaKasbon)
      : 'Lunas (Rp 0)'
    : '-';

  const incomeRows: Array<{ label: string; value: string }> = [
    { label: pokokLabel, value: formatRupiah(c.gapok) },
    ...(activeOvertimeRows.length > 0
      ? activeOvertimeRows.map((row) => ({ label: row.label, value: formatRupiah(row.amount) }))
      : [{ label: 'Lembur', value: '-' }]),
  ];
  if (tunjanganVal > 0 || incomeRows.length < 3) {
    incomeRows.push({
      label: 'Tunjangan Lainnya',
      value: tunjanganVal > 0 ? formatRupiah(tunjanganVal) : '-',
    });
  }

  const deductionRows: Array<{ label: string; value: string }> = [
    { label: kasbonLabel, value: formatRupiah(c.kasbon) },
    { label: 'Iuran BPJS', value: formatRupiah(c.bpjs) },
    { label: 'Sisa Hutang / Kasbon', value: sisaKasbonText },
  ];

  const maxDataRows = Math.max(incomeRows.length, deductionRows.length);
  const headerH = 5.4;
  const rowH = maxDataRows > 3 ? 4.4 : 5.0;
  const footerH = 5.6;
  const cardH = headerH + maxDataRows * rowH + footerH;

  const drawCard = (
    x: number,
    title: string,
    rows: Array<{ label: string; value: string }>,
    totalLabel: string,
    totalVal: string,
  ) => {
    // Gray header fill inside top of card
    doc.setFillColor(...GRAY_HEADER);
    doc.roundedRect(x, y, cardW, headerH + 1.5, 2, 2, 'F');
    doc.setFillColor(...WHITE);
    doc.rect(x, y + headerH, cardW, cardH - headerH, 'F');

    // Outer rounded border
    doc.setDrawColor(...GRAY_BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'S');
    doc.line(x, y + headerH, x + cardW, y + headerH);

    // Header text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    doc.setTextColor(...BLACK);
    doc.text(title, x + 3.2, y + 3.8);

    // Data rows
    let ry = y + headerH;
    rows.forEach((r) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.4);
      doc.setTextColor(...TEXT_SUB);
      doc.text(r.label, x + 3.2, ry + rowH - 1.5, { maxWidth: cardW - 28 });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLACK);
      doc.text(r.value, x + cardW - 3.2, ry + rowH - 1.5, { align: 'right' });

      ry += rowH;
      doc.setDrawColor(...GRAY_DIVIDER);
      doc.setLineWidth(0.2);
      doc.line(x, ry, x + cardW, ry);
    });

    // Footer total row pinned at bottom of card
    const footY = y + cardH - footerH;
    doc.setDrawColor(...GRAY_DIVIDER);
    doc.line(x, footY, x + cardW, footY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(...BLACK);
    doc.text(totalLabel, x + 3.2, footY + 3.9);
    doc.text(totalVal, x + cardW - 3.2, footY + 3.9, { align: 'right' });
  };

  drawCard(marginX, 'PENGHASILAN', incomeRows, 'GAJI KOTOR', formatRupiah(c.gajiKotor));
  drawCard(rightCardX, 'POTONGAN', deductionRows, 'JUMLAH POTONGAN', formatRupiah(c.totalPot));

  // 5. GAJI BERSIH Black Rounded Banner
  y += cardH + 2.6;
  const thpH = 11.2;
  doc.setFillColor(...BLACK);
  doc.roundedRect(marginX, y, contentW, thpH, 2.2, 2.2, 'F');

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.text('GAJI BERSIH', marginX + 4.5, y + 5.1);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(209, 213, 219);
  doc.text('Take Home Pay', marginX + 4.5, y + 8.7);

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.text(formatRupiah(c.thp), marginX + contentW - 4.5, y + 7.4, { align: 'right' });

  y += thpH + 2.2;

  // 6. Monochrome Info Kasbon Strip (when employee has kasbon/debt)
  if (kasbonInfo.hasKasbonNotice) {
    const infoH = 6.2;
    doc.setFillColor(...GRAY_HEADER);
    doc.roundedRect(marginX, y, contentW, infoH, 1.5, 1.5, 'F');
    doc.setFillColor(...BLACK);
    doc.rect(marginX, y, 1.2, infoH, 'F');

    const sisaLabel =
      kasbonInfo.sisaKasbon > 0 ? formatRupiah(kasbonInfo.sisaKasbon) : 'Lunas (Rp 0)';
    const awalPart =
      kasbonInfo.saldoAwal > 0 ? `Saldo awal ${formatRupiah(kasbonInfo.saldoAwal)}  •  ` : '';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(...BLACK);
    doc.text('Info Kasbon:', marginX + 3.5, y + 4.1);
    const lblW = doc.getTextWidth('Info Kasbon: ');
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_SUB);
    doc.text(
      `${awalPart}Potongan periode ini ${formatRupiah(kasbonInfo.potonganKasbon)}  •  Sisa ${sisaLabel}`,
      marginX + 3.5 + lblW,
      y + 4.1,
      { maxWidth: contentW - 8 - lblW },
    );
    y += infoH + 3.2;
  } else {
    y += 3.5;
  }

  // 7. Signatures (pinned cleanly above black footer)
  const sigTopY = Math.min(y + 1, 86.5);
  const sigLineY = 96.8;
  const sigNameY = 100.6;
  const leftSigX = marginX + contentW * 0.24;
  const rightSigX = marginX + contentW * 0.76;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(...TEXT_SUB);
  doc.text('Diterima oleh,', leftSigX, sigTopY, { align: 'center' });
  doc.text('Disetujui oleh, HR / Finance', rightSigX, sigTopY, { align: 'center' });

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.3);
  doc.line(leftSigX - 24, sigLineY, leftSigX + 24, sigLineY);
  doc.line(rightSigX - 24, sigLineY, rightSigX + 24, sigLineY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BLACK);
  doc.text(`( ${item.nama || 'Karyawan'} )`, leftSigX, sigNameY, { align: 'center' });
  doc.text('( PT. Sarana Putra Daerah )', rightSigX, sigNameY, { align: 'center' });

  // 8. Full-width Black Footer Bar
  doc.setFillColor(...BLACK);
  doc.rect(0, pageH - 6.2, pageW, 6.2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.6);
  doc.setTextColor(212, 212, 216);
  doc.text(
    'Dokumen ini sah dan diterbitkan oleh PT. Sarana Putra Daerah  •  Bersifat rahasia',
    pageW / 2,
    pageH - 2.3,
    { align: 'center' },
  );

  const safeName = (item.nama || 'Karyawan').replace(/[^a-zA-Z0-9]/g, '_');
  const safePeriode = periode.replace(/[^a-zA-Z0-9-]/g, '_');
  doc.save(`Slip_Gaji_${safeName}_${safePeriode}.pdf`);
}

export function downloadBatchSlipsA4PDF(
  items: PayrollRecord[],
  getLiveKasbon?: (nik: string, nama?: string) => number,
): boolean {
  if (!items.length) return false;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageW = 210;
  const pageH = 297;
  const marginX = 5;
  const marginY = 5;
  const gapX = 4;
  const gapY = 4;
  const cellW = (pageW - marginX * 2 - gapX) / 2; // 98mm
  const cellH = (pageH - marginY * 2 - gapY) / 2; // 141.5mm

  const BLACK: [number, number, number] = [0, 0, 0];
  const WHITE: [number, number, number] = [255, 255, 255];
  const GRAY_HEADER: [number, number, number] = [243, 244, 246];
  const GRAY_BORDER: [number, number, number] = [209, 213, 219];
  const GRAY_DIVIDER: [number, number, number] = [229, 231, 235];
  const TEXT_MUTED: [number, number, number] = [107, 114, 128];
  const TEXT_SUB: [number, number, number] = [55, 65, 81];

  const drawQuarterSlip = (item: PayrollRecord, ox: number, oy: number) => {
    const c = calculateTHP(item);
    const periode = getPeriodeDisplay(item);
    const siklus = getSiklusDisplay(item);
    const status = getStatusDisplay(item).toUpperCase();
    const activeOvertimeRows = getActiveOvertimeRows(c);
    const liveKasbon = getLiveKasbon ? getLiveKasbon(item.nik, item.nama) : 0;
    const kasbonInfo = resolveSlipKasbonInfo(item, c, liveKasbon);
    const tunjanganVal = cleanRupiahToNumber(item.tunjangan);

    const padX = 4.2;
    const innerW = cellW - padX * 2;
    const ix = ox + padX;

    // Outer slip border
    doc.setFillColor(...WHITE);
    doc.setDrawColor(...GRAY_BORDER);
    doc.setLineWidth(0.28);
    doc.rect(ox, oy, cellW, cellH, 'FD');

    // 1. Top Black Header Banner
    const topH = 11.2;
    doc.setFillColor(...BLACK);
    doc.rect(ox, oy, cellW, topH, 'F');

    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14.5);
    doc.text('spd.', ix, oy + 7.5);

    doc.setFontSize(8.2);
    doc.text('SLIP GAJI', ox + cellW - padX, oy + 5.2, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.4);
    doc.setTextColor(212, 212, 216);
    doc.text('PT. SARANA PUTRA DAERAH', ox + cellW - padX, oy + 8.6, { align: 'right' });

    // 2. Period + Status Pill
    let y = oy + topH + 5.6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(...TEXT_SUB);
    doc.text('Periode: ', ix, y);
    const perPrefixW = doc.getTextWidth('Periode: ');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLACK);
    doc.text(periode, ix + perPrefixW, y);
    const perValW = doc.getTextWidth(periode);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_SUB);
    doc.text(` (${siklus})`, ix + perPrefixW + perValW, y, {
      maxWidth: innerW - perPrefixW - perValW - 22,
    });

    const statusText = `STATUS: ${status}`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.6);
    const pillW = Math.max(21, doc.getTextWidth(statusText) + 5.5);
    const pillX = ox + cellW - padX - pillW;
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.28);
    doc.roundedRect(pillX, y - 3.3, pillW, 4.7, 2.3, 2.3, 'S');
    doc.setTextColor(...BLACK);
    doc.text(statusText, pillX + pillW / 2, y - 0.25, { align: 'center' });

    // 3. Employee Info Grid (2x2 clean bottom hairlines)
    y += 5.4;
    const infoGap = 4.5;
    const halfW = (innerW - infoGap) / 2;
    const rightColX = ix + halfW + infoGap;
    const unitLabel = c.isTrip
      ? `${c.unitPokok} Trip${c.lemburNominal > 0 ? ` • ${c.breakdownText}` : ''}`
      : `${c.unitPokok} HR${c.lemburNominal > 0 ? ` • ${c.breakdownText}` : ''}`;

    const drawInfoLine = (lx: number, ly: number, label: string, val: string) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.1);
      doc.setTextColor(...TEXT_MUTED);
      doc.text(label, lx, ly);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLACK);
      const valMaxW = halfW - 14.5;
      const truncated = doc.splitTextToSize(val || '-', valMaxW)[0] || '-';
      doc.text(truncated, lx + 14.5, ly);
      doc.setDrawColor(...GRAY_BORDER);
      doc.setLineWidth(0.2);
      doc.line(lx, ly + 1.4, lx + halfW, ly + 1.4);
    };

    drawInfoLine(ix, y, 'Nama', item.nama || '-');
    drawInfoLine(rightColX, y, 'Divisi', c.skema);
    drawInfoLine(ix, y + 4.8, 'No / NIK', item.nik || '-');
    drawInfoLine(rightColX, y + 4.8, 'Kerja', unitLabel);

    // 4. Two Side-by-Side Rounded Cards: PENGHASILAN & POTONGAN
    y += 9.4;
    const cardGap = 2.8;
    const cardW = (innerW - cardGap) / 2;
    const rightCardX = ix + cardW + cardGap;

    const pokokLabel = c.isTrip ? `Gaji Pokok (${c.unitPokok} Trip)` : `Gaji Pokok (${c.unitPokok} HR)`;
    const kasbonLabel =
      c.keterangan && c.keterangan !== '-' ? `Kasbon (${c.keterangan})` : 'Potongan Kasbon';
    const sisaKasbonText = kasbonInfo.hasKasbonNotice
      ? kasbonInfo.sisaKasbon > 0
        ? formatRupiah(kasbonInfo.sisaKasbon)
        : 'Lunas (Rp 0)'
      : '-';

    const incomeRows: Array<{ label: string; value: string }> = [
      { label: pokokLabel, value: formatRupiah(c.gapok) },
      ...(activeOvertimeRows.length > 0
        ? activeOvertimeRows.map((row) => ({ label: row.label, value: formatRupiah(row.amount) }))
        : [{ label: 'Lembur', value: '-' }]),
    ];
    if (tunjanganVal > 0 || incomeRows.length < 3) {
      incomeRows.push({
        label: 'Tunjangan Lainnya',
        value: tunjanganVal > 0 ? formatRupiah(tunjanganVal) : '-',
      });
    }

    const deductionRows: Array<{ label: string; value: string }> = [
      { label: kasbonLabel, value: formatRupiah(c.kasbon) },
      { label: 'Iuran BPJS', value: formatRupiah(c.bpjs) },
      { label: 'Sisa Kasbon', value: sisaKasbonText },
    ];

    const maxDataRows = Math.max(incomeRows.length, deductionRows.length);
    const headerH = 5.0;
    const rowH = maxDataRows > 3 ? 4.4 : 5.2;
    const footerH = 5.6;
    const cardH = headerH + maxDataRows * rowH + footerH;

    const drawCard = (
      cx: number,
      title: string,
      rows: Array<{ label: string; value: string }>,
      totalLabel: string,
      totalVal: string,
    ) => {
      doc.setFillColor(...GRAY_HEADER);
      doc.roundedRect(cx, y, cardW, headerH + 1.4, 1.5, 1.5, 'F');
      doc.setFillColor(...WHITE);
      doc.rect(cx, y + headerH, cardW, cardH - headerH, 'F');

      doc.setDrawColor(...GRAY_BORDER);
      doc.setLineWidth(0.24);
      doc.roundedRect(cx, y, cardW, cardH, 1.5, 1.5, 'S');
      doc.line(cx, y + headerH, cx + cardW, y + headerH);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.9);
      doc.setTextColor(...BLACK);
      doc.text(title, cx + 2.2, y + 3.5);

      let ry = y + headerH;
      rows.forEach((r) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.8);
        const valW = doc.getTextWidth(r.value);
        const maxLabelW = Math.max(12, cardW - valW - 5.2);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TEXT_SUB);
        const lbl = doc.splitTextToSize(r.label, maxLabelW)[0] || r.label;
        doc.text(lbl, cx + 2.2, ry + rowH - 1.6);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLACK);
        doc.text(r.value, cx + cardW - 2.2, ry + rowH - 1.6, { align: 'right' });

        ry += rowH;
        doc.setDrawColor(...GRAY_DIVIDER);
        doc.setLineWidth(0.18);
        doc.line(cx, ry, cx + cardW, ry);
      });

      const footY = y + cardH - footerH;
      doc.setDrawColor(...GRAY_DIVIDER);
      doc.line(cx, footY, cx + cardW, footY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.1);
      doc.setTextColor(...BLACK);
      doc.text(totalLabel, cx + 2.2, footY + 3.8);
      doc.text(totalVal, cx + cardW - 2.2, footY + 3.8, { align: 'right' });
    };

    drawCard(ix, 'PENGHASILAN', incomeRows, 'GAJI KOTOR', formatRupiah(c.gajiKotor));
    drawCard(rightCardX, 'POTONGAN', deductionRows, 'JUMLAH POT.', formatRupiah(c.totalPot));

    // 5. GAJI BERSIH Black Rounded Banner
    y += cardH + 3.4;
    const thpH = 11.4;
    doc.setFillColor(...BLACK);
    doc.roundedRect(ix, y, innerW, thpH, 1.8, 1.8, 'F');

    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text('GAJI BERSIH', ix + 3.6, y + 5.1);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.6);
    doc.setTextColor(209, 213, 219);
    doc.text('Take Home Pay', ix + 3.6, y + 8.7);

    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.8);
    doc.text(formatRupiah(c.thp), ix + innerW - 3.6, y + 7.4, { align: 'right' });

    y += thpH + 2.4;

    // 6. Info Kasbon Strip
    if (kasbonInfo.hasKasbonNotice) {
      const infoH = 6.2;
      doc.setFillColor(...GRAY_HEADER);
      doc.roundedRect(ix, y, innerW, infoH, 1.2, 1.2, 'F');
      doc.setFillColor(...BLACK);
      doc.rect(ix, y, 1.0, infoH, 'F');

      const sisaLabel =
        kasbonInfo.sisaKasbon > 0 ? formatRupiah(kasbonInfo.sisaKasbon) : 'Lunas (Rp 0)';
      const awalPart =
        kasbonInfo.saldoAwal > 0 ? `Awal ${formatRupiah(kasbonInfo.saldoAwal)} • ` : '';

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(...BLACK);
      doc.text('Info Kasbon:', ix + 2.6, y + 4.0);
      const lblW = doc.getTextWidth('Info Kasbon: ');
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TEXT_SUB);
      const infoText = `${awalPart}Potong ${formatRupiah(kasbonInfo.potonganKasbon)} • Sisa ${sisaLabel}`;
      const infoLine = doc.splitTextToSize(infoText, innerW - 4.5 - lblW)[0] || infoText;
      doc.text(infoLine, ix + 2.6 + lblW, y + 4.0);
    }

    // 7. Signatures (pinned neatly above black footer)
    const footerBarH = 5.4;
    const sigNameY = oy + cellH - footerBarH - 4.2;
    const sigLineY = sigNameY - 3.4;
    const sigTopY = sigLineY - 12.2;
    const leftSigX = ix + innerW * 0.25;
    const rightSigX = ix + innerW * 0.75;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.1);
    doc.setTextColor(...TEXT_SUB);
    doc.text('Diterima oleh,', leftSigX, sigTopY, { align: 'center' });
    doc.text('Disetujui oleh, HR / Finance', rightSigX, sigTopY, { align: 'center' });

    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.25);
    doc.line(leftSigX - 15, sigLineY, leftSigX + 15, sigLineY);
    doc.line(rightSigX - 15, sigLineY, rightSigX + 15, sigLineY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.3);
    doc.setTextColor(...BLACK);
    doc.text(`( ${item.nama || 'Karyawan'} )`, leftSigX, sigNameY, { align: 'center' });
    doc.text('( PT. Sarana Putra Daerah )', rightSigX, sigNameY, { align: 'center' });

    // 8. Bottom Black Footer Bar
    doc.setFillColor(...BLACK);
    doc.rect(ox, oy + cellH - footerBarH, cellW, footerBarH, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.1);
    doc.setTextColor(212, 212, 216);
    doc.text(
      'Dokumen ini sah dan diterbitkan oleh PT. Sarana Putra Daerah  •  Bersifat rahasia',
      ox + cellW / 2,
      oy + cellH - 1.9,
      { align: 'center' },
    );
  };

  const totalPages = Math.ceil(items.length / 4);
  for (let p = 0; p < totalPages; p++) {
    if (p > 0) doc.addPage();
    const chunk = items.slice(p * 4, p * 4 + 4);
    chunk.forEach((item, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const ox = marginX + col * (cellW + gapX);
      const oy = marginY + row * (cellH + gapY);
      drawQuarterSlip(item, ox, oy);
    });
  }

  const firstPeriode = getPeriodeDisplay(items[0]).replace(/[^a-zA-Z0-9-]/g, '_');
  doc.save(`Slip_Gaji_A4_4PerHalaman_${items.length}Karyawan_${firstPeriode}.pdf`);
  return true;
}

export function getNotaPdfFilename(trx: KtTransaction): string {
  const invCode = normalizeInvoiceCode(trx.nota || trx.id || '001');
  const safeNota = invCode.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const prefix = trx.tipe === 'Jual' ? 'Invoice' : 'Nota_Beli';
  return `${prefix}_${safeNota}.pdf`;
}

function drawHorizontalGradientRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  fromRgb: [number, number, number],
  toRgb: [number, number, number],
  steps = 36,
): void {
  const sliceW = w / steps;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const r = Math.round(fromRgb[0] + (toRgb[0] - fromRgb[0]) * t);
    const g = Math.round(fromRgb[1] + (toRgb[1] - fromRgb[1]) * t);
    const b = Math.round(fromRgb[2] + (toRgb[2] - fromRgb[2]) * t);
    doc.setFillColor(r, g, b);
    // Slight overlap (+0.15mm) prevents anti-aliasing hairline seams
    doc.rect(x + i * sliceW, y, sliceW + 0.2, h, 'F');
  }
}

export function buildNotaPdf(trx: KtTransaction): {
  doc: jsPDF;
  blob: Blob;
  file: File;
  filename: string;
} {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageW = 210;
  const pageH = 297;
  const marginX = 18;
  const contentW = pageW - marginX * 2;
  const isJual = trx.tipe === 'Jual';
  const isLunas = (trx.sisa || 0) === 0;
  const statusText = isLunas ? 'Lunas' : 'Belum Lunas';
  const formattedDate = formatDateFullID(trx.tanggal);

  // Brand Invoice Palette matching uploaded spd. logo & Mockup Invoice
  const NAVY: [number, number, number] = [30, 58, 110]; // #1E3A6E
  const NAVY_DARK: [number, number, number] = [24, 49, 90]; // #18315A
  const NAVY_LIGHT: [number, number, number] = [43, 89, 156]; // #2B599C
  const AMBER_DOT: [number, number, number] = [245, 179, 36]; // #F5B324
  const GOLD_START: [number, number, number] = [246, 216, 118]; // #F6D876
  const GOLD_END: [number, number, number] = [245, 176, 56]; // #F5B038
  const CHARCOAL: [number, number, number] = [30, 41, 59]; // #1E293B
  const MUTED: [number, number, number] = [100, 116, 139]; // #64748B
  const DIVIDER: [number, number, number] = [226, 232, 240]; // #E2E8F0
  const STATUS_OK: [number, number, number] = [21, 128, 61];
  const STATUS_WARN: [number, number, number] = [180, 83, 9];

  // Header Left: lowercase bold "spd" (deep navy) + golden amber dot "."
  let y = 22;
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.text('spd', marginX, y + 6);
  const spdWidth = doc.getTextWidth('spd');
  doc.setFillColor(...AMBER_DOT);
  doc.circle(marginX + spdWidth + 2.3, y + 4.9, 1.55, 'F');

  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.2);
  doc.text('PT. SARANA PUTRA DAERAH', marginX, y + 13.5);

  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.text('Kp. Walahir, RT.08/RW.04, Nambo, Kec. Klapanunggal', marginX, y + 18.2);
  doc.text('Kabupaten Bogor, Jawa Barat 16820', marginX, y + 22.3);

  // Header Right: INVOICE / NOTA BELI + No. Nota
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(23);
  doc.text(isJual ? 'INVOICE' : 'NOTA BELI', pageW - marginX, y + 6, { align: 'right' });

  const invCode = normalizeInvoiceCode(trx.nota) || '-';
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`No. ${invCode}`, pageW - marginX, y + 12.8, { align: 'right' });

  y += 32;

  // Clean Two-Column Info Row (matching mockup)
  const leftInfoW = contentW * 0.52;
  const custLines = doc.splitTextToSize(trx.customer || '-', leftInfoW);

  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(isJual ? 'Ditagihkan kepada' : 'Pemasok', marginX, y);

  doc.setTextColor(...CHARCOAL);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text(custLines, marginX, y + 6);

  const subInfoY = y + 6 + custLines.length * 5;
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    isJual ? 'Transaksi Penjualan Tonase' : 'Transaksi Pembelian Tonase',
    marginX,
    subInfoY,
  );

  // Right Info Column: Hari / Tanggal + Status (right-aligned, zero overlap)
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Hari / Tanggal', pageW - marginX, y, { align: 'right' });

  doc.setTextColor(...CHARCOAL);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(formattedDate, pageW - marginX, y + 5.6, { align: 'right' });

  doc.setTextColor(...(isLunas ? STATUS_OK : STATUS_WARN));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.text(`Status: ${statusText}`, pageW - marginX, y + 11.4, { align: 'right' });

  y = Math.max(subInfoY + 6, y + 18);
  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageW - marginX, y);

  y += 8;

  // Table Header Bar (Full-width Deep Navy)
  const colNo = marginX + 4.5;
  const colBarang = marginX + 15.5;
  const colNetto = marginX + contentW * 0.57;
  const colHarga = marginX + contentW * 0.77;
  const colJumlah = pageW - marginX - 4.5;
  const barangMaxW = colNetto - colBarang - 22;

  doc.setFillColor(...NAVY);
  doc.rect(marginX, y, contentW, 10, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('No', colNo, y + 6.4);
  doc.text('Barang / Deskripsi', colBarang, y + 6.4);
  doc.text('Berat Netto', colNetto, y + 6.4, { align: 'right' });
  doc.text('Harga / Kg', colHarga, y + 6.4, { align: 'right' });
  doc.text('Jumlah', colJumlah, y + 6.4, { align: 'right' });

  y += 10;

  // Table Item Rows (multi-line safe)
  const items = trx.items || [];
  items.forEach((it, idx) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.3);
    const nameLines = doc.splitTextToSize(it.nama || '-', barangMaxW);
    const rowH = Math.max(12.2, nameLines.length * 4.6 + 7.2);

    if (y + rowH > pageH - 82) {
      doc.addPage();
      y = 20;
    }

    const textY = y + 7.4;

    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(String(idx + 1), colNo, textY);

    doc.setTextColor(...CHARCOAL);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.3);
    doc.text(nameLines, colBarang, textY);

    doc.setTextColor(...CHARCOAL);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${formatNumberWithDots(it.netto || 0)} kg`, colNetto, textY, { align: 'right' });
    doc.text(formatRupiah(it.harga || 0), colHarga, textY, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text(formatRupiah(it.subtotal || 0), colJumlah, textY, { align: 'right' });

    y += rowH;
    doc.setDrawColor(...DIVIDER);
    doc.setLineWidth(0.3);
    doc.line(marginX, y, pageW - marginX, y);
  });

  y += 8;

  // Totals Block (Right-aligned + Signature Golden Amber Gradient Total Bar)
  const summaryX = marginX + contentW * 0.51;
  const summaryW = contentW * 0.49;
  const sumLabelX = summaryX + 5;
  const sumValX = pageW - marginX - 5;

  const summaryLines: Array<{
    label: string;
    value: string;
    color?: [number, number, number];
    bold?: boolean;
  }> = [{ label: 'Total Netto', value: `${formatNumberWithDots(trx.totalNetto || 0)} kg` }];

  if (!isJual && (trx.potongUtang || 0) > 0) {
    summaryLines.push({
      label: 'Potong Utang Pemasok',
      value: `-${formatRupiah(trx.potongUtang || 0)}`,
      color: NAVY,
      bold: true,
    });
  }

  summaryLines.push({
    label: `Dibayar (${trx.metode})`,
    value: formatRupiah(trx.dibayar || 0),
  });

  if ((trx.sisa || 0) > 0) {
    summaryLines.push({
      label: 'Sisa Tagihan',
      value: formatRupiah(trx.sisa || 0),
      color: STATUS_WARN,
      bold: true,
    });
  }

  summaryLines.forEach((line) => {
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(line.label, sumLabelX, y + 4);

    doc.setTextColor(...(line.color || CHARCOAL));
    doc.setFont('helvetica', line.bold ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.text(line.value, sumValX, y + 4, { align: 'right' });
    y += 6.8;
  });

  y += 3;

  // Golden Amber Gradient TOTAL Banner (matching mockup)
  drawHorizontalGradientRect(doc, summaryX, y, summaryW, 13.5, GOLD_START, GOLD_END);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Total', sumLabelX, y + 8.6);
  doc.setFontSize(13.5);
  doc.text(formatRupiah(trx.totalBayar || 0), sumValX, y + 8.8, { align: 'right' });

  y += 26;

  // Bottom Payment Info (Left) & Signature (Right)
  const sigY = Math.min(Math.max(y, 198), pageH - 60);

  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.4);
  doc.text('INFORMASI PEMBAYARAN', marginX, sigY);

  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.7);
  doc.text(`Metode Pembayaran: ${trx.metode}`, marginX, sigY + 6.4);
  doc.text(`Status Pembayaran: ${statusText}`, marginX, sigY + 11.7);
  doc.text('Atas Nama: PT. Sarana Putra Daerah', marginX, sigY + 17);

  if (!isJual && (trx.potongUtang || 0) > 0 && typeof trx.sisaUtangMitraSetelah === 'number') {
    doc.text(
      `Sisa Utang Pemasok: ${formatRupiah(trx.sisaUtangMitraSetelah)}`,
      marginX,
      sigY + 22.3,
    );
  }

  // Signature block on right
  const sigCenterX = pageW - marginX - 31;
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Hormat kami,', sigCenterX, sigY + 0.5, { align: 'center' });

  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.45);
  doc.line(sigCenterX - 28, sigY + 22, sigCenterX + 28, sigY + 22);

  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.2);
  doc.text('PT. Sarana Putra Daerah', sigCenterX, sigY + 27.5, { align: 'center' });

  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.4);
  doc.text('Admin / Keuangan', sigCenterX, sigY + 32.3, { align: 'center' });

  // Bottom Full-Width Deep Navy Gradient Footer Bar (matching mockup)
  drawHorizontalGradientRect(doc, 0, pageH - 16, pageW, 16, NAVY_DARK, NAVY_LIGHT, 48);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.3);
  doc.text('PT. Sarana Putra Daerah', marginX, pageH - 6.8);

  doc.setFont('helvetica', 'normal');
  doc.text('Kp. Walahir, Klapanunggal, Kab. Bogor', pageW / 2, pageH - 6.8, {
    align: 'center',
  });
  doc.text('Portal Kas & Tonase', pageW - marginX, pageH - 6.8, { align: 'right' });

  const filename = getNotaPdfFilename(trx);
  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });

  return { doc, blob, file, filename };
}

export function canSharePdfFile(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
    return false;
  }
  try {
    const testFile = new File(['%PDF-1.4'], 'nota.pdf', { type: 'application/pdf' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}

export function downloadNotaPdf(trx: KtTransaction): string {
  const { doc, filename } = buildNotaPdf(trx);
  doc.save(filename);
  return filename;
}

export async function shareNotaPdf(
  trx: KtTransaction,
): Promise<'shared' | 'cancelled' | 'unsupported'> {
  if (!canSharePdfFile()) return 'unsupported';
  const { file } = buildNotaPdf(trx);

  try {
    if (!navigator.canShare({ files: [file] })) {
      return 'unsupported';
    }
    const invCode = normalizeInvoiceCode(trx.nota || trx.id);
    await navigator.share({
      title: `${trx.tipe === 'Jual' ? 'Invoice' : 'Nota Beli'} ${invCode} - ${trx.customer}`,
      text: `${trx.tipe === 'Jual' ? 'Invoice' : 'Nota Beli'} ${invCode} (${trx.customer}) — Total ${formatRupiah(trx.totalBayar)}`,
      files: [file],
    });
    return 'shared';
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return 'cancelled';
    }
    throw err;
  }
}
